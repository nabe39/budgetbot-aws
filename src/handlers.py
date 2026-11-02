"""Endpoint business logic for BudgetBot."""
import csv
import io
from typing import Optional
from src.config import config
from src.adapters.statement_parser import parse_statement

_local_jobs = {}


def _parse_csv(data: bytes) -> list:
    """Parse CSV or tabular statement data with full Vietnamese bank support."""
    return parse_statement(data, "statement.csv")


def handle_upload(
    user_id: str,
    filename: str,
    data: bytes,
    ai_client,
    storage,
    userstore,
    auto_commit: bool = True,
) -> dict:
    import uuid
    from datetime import datetime, timezone

    key = f"{user_id}/{filename}"
    
    # Create a unique job ID
    job_id = f"JOB#{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    # In production mode (async), we MUST create the DynamoDB job record BEFORE uploading to S3
    # Otherwise, the S3 event triggers the processor Lambda instantly, and it might not find the job record.
    if config.storage_backend != "local" and config.userstore_backend != "sqlite":
        _create_job_record(userstore, user_id, job_id, filename, key, now)

    location = storage.put(key, data)

    # In local mode, process the file synchronously to support local test suites and run/smoke curls
    if config.storage_backend == "local" or config.userstore_backend == "sqlite":
        inserted = 0
        samples = []
        needs_review = []
        all_transactions = []
        parsed_count = 0

        if filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
            import pypdf
            import boto3

            text = ""
            try:
                reader = pypdf.PdfReader(io.BytesIO(data))
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            except Exception:
                pass

            # Fallback to Textract if scanned PDF
            if len(text.strip()) < 50:
                try:
                    textract = boto3.client("textract", region_name=config.aws_region)
                    resp = textract.detect_document_text(Document={"Bytes": data})
                    text = ""
                    for block in resp.get("Blocks", []):
                        if block["BlockType"] == "LINE":
                            text += block["Text"] + "\n"
                except Exception as e:
                    return {
                        "filename": filename,
                        "stored_at": location,
                        "error": f"Textract failed: {e}"
                    }

            txns = ai_client.extract_transactions_from_text(text)
            parsed_count = len(txns)
            for txn in txns:
                if txn.get("category", "").lower() == "income":
                    txn["amount"] = abs(txn["amount"])
                else:
                    txn["amount"] = -abs(txn["amount"])

                all_transactions.append(txn)

                if auto_commit:
                    if txn.get("confidence") == "high":
                        userstore.add_transaction(user_id, txn)
                        inserted += 1
                        if len(samples) < 5:
                            samples.append(txn)
                    else:
                        needs_review.append(txn)
                else:
                    if txn.get("confidence") != "high":
                        needs_review.append(txn)
                    if len(samples) < 5:
                        samples.append(txn)
        else:
            rows = parse_statement(data, filename)
            parsed_count = len(rows)
            for row in rows:
                cat_result = ai_client.categorize(
                    description=row["description"], amount=row["amount"], date=row["date"]
                )
                txn = {
                    "date": row["date"],
                    "description": row["description"],
                    "amount": row["amount"],
                    "category": cat_result["category"],
                    "confidence": cat_result["confidence"],
                    "engine": cat_result.get("engine", "unknown")
                }
                cat_lower = txn["category"].lower()
                if cat_lower == "income":
                    txn["amount"] = abs(txn["amount"])
                elif cat_lower in {"food", "transport", "shopping", "utilities", "entertainment", "health", "subscriptions"}:
                    txn["amount"] = -abs(txn["amount"])
                else:
                    if row["amount"] < 0:
                        txn["amount"] = -abs(txn["amount"])
                    else:
                        txn["amount"] = abs(txn["amount"])

                all_transactions.append(txn)

                if auto_commit:
                    if txn.get("confidence") == "high":
                        userstore.add_transaction(user_id, txn)
                        inserted += 1
                        if len(samples) < 5:
                            samples.append(txn)
                    else:
                        needs_review.append(txn)
                else:
                    if txn.get("confidence") != "high":
                        needs_review.append(txn)
                    if len(samples) < 5:
                        samples.append(txn)

        # Store completed job status locally
        _local_jobs[job_id] = {
            "job_id": job_id,
            "status": "COMPLETED",
            "filename": filename,
            "created_at": now,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "rows_parsed": parsed_count,
            "rows_inserted": inserted,
            "needs_review": needs_review,
            "all_transactions": all_transactions,
            "sample_categorized": samples,
        }

        return {
            "job_id": job_id,
            "filename": filename,
            "stored_at": location,
            "status": "COMPLETED",
            "message": "File processed successfully.",
            "rows_parsed": parsed_count,
            "rows_inserted": inserted,
            "needs_review": needs_review,
            "all_transactions": all_transactions,
            "sample_categorized": samples,
        }

    else:
        # Production mode: create DynamoDB Job tracking and process asynchronously
        # (JOB record is already created above BEFORE S3 upload to avoid race conditions)
        return {
            "job_id": job_id,
            "filename": filename,
            "stored_at": location,
            "status": "PENDING",
            "message": "File uploaded successfully. Processing in background...",
        }


def _create_job_record(userstore, user_id, job_id, filename, s3_key, created_at):
    """Create a JOB tracking record in DynamoDB."""
    if hasattr(userstore, 'table'):
        # DynamoDB backend - write directly
        userstore.table.put_item(Item={
            "PK": user_id,
            "SK": job_id,
            "status": "PENDING",
            "filename": filename,
            "s3_key": s3_key,
            "created_at": created_at,
        })
    else:
        _local_jobs[job_id] = {
            "job_id": job_id,
            "status": "PENDING",
            "filename": filename,
            "created_at": created_at,
        }


def handle_upload_status(user_id: str, job_id: str, userstore) -> dict:
    """Check the status of an async upload job."""
    if hasattr(userstore, 'table'):
        resp = userstore.table.get_item(Key={"PK": user_id, "SK": job_id})
        item = resp.get("Item")
        if not item:
            return {"status": "NOT_FOUND", "job_id": job_id}

        # Convert Decimal to float for JSON serialization
        from decimal import Decimal
        def decimal_to_native(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            if isinstance(obj, dict):
                return {k: decimal_to_native(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [decimal_to_native(i) for i in obj]
            return obj

        result = decimal_to_native(item)
        return {
            "job_id": job_id,
            "status": result.get("status", "UNKNOWN"),
            "filename": result.get("filename"),
            "created_at": result.get("created_at"),
            "completed_at": result.get("completed_at"),
            "rows_parsed": result.get("rows_parsed", 0),
            "rows_inserted": result.get("rows_inserted", 0),
            "needs_review": result.get("needs_review", []),
            "all_transactions": result.get("all_transactions", []),
            "sample_categorized": result.get("sample_categorized", []),
            "error_message": result.get("error_message"),
        }
    else:
        job = _local_jobs.get(job_id)
        if not job:
            return {"status": "NOT_FOUND", "job_id": job_id}
        return job


STANDARD_CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Health",
    "Subscriptions",
    "Income",
    "Transfer",
    "Other",
]

CATEGORY_CANONICAL = {c.lower(): c for c in STANDARD_CATEGORIES}


def handle_summary(user_id: str, month: Optional[str], userstore) -> dict:
    raw_summary = userstore.summary(user_id, month=month)

    # Initialize aggregations for all 10 standard categories
    agg = {cat: {"total": 0.0, "count": 0} for cat in STANDARD_CATEGORIES}

    for cat_raw, v in raw_summary.items():
        canonical = CATEGORY_CANONICAL.get(str(cat_raw).strip().lower(), "Other")
        agg[canonical]["total"] += float(v.get("total", 0.0))
        agg[canonical]["count"] += int(v.get("count", 0))

    # Calculate Total Income:
    total_income = 0.0
    for cat, data in agg.items():
        if cat == "Income":
            total_income += abs(data["total"])
        elif data["total"] > 0:
            total_income += data["total"]

    # Calculate Total Expense:
    total_expense = 0.0
    for cat, data in agg.items():
        if cat == "Income":
            continue
        if data["total"] < 0:
            total_expense += abs(data["total"])
        elif data["total"] > 0:
            total_expense += data["total"]

    total_income = round(total_income, 2)
    total_expense = round(total_expense, 2)

    # Net savings / balance
    net_savings = round(total_income - total_expense, 2)

    # Savings rate (%)
    if total_income > 0:
        savings_rate = round((net_savings / total_income) * 100, 2)
    else:
        savings_rate = 0.0

    # Spending allocation breakdown for all 10 standard PascalCase categories
    spending_allocation = []
    for cat in STANDARD_CATEGORIES:
        if cat == "Income":
            cat_amount = total_income
            cat_percentage = 0.0
        else:
            cat_amount = abs(agg[cat]["total"])
            cat_percentage = round((cat_amount / total_expense) * 100, 2) if total_expense > 0 else 0.0

        spending_allocation.append({
            "category": cat,
            "amount": cat_amount,
            "percentage": cat_percentage,
            "count": agg[cat]["count"],
        })

    # by_category preserving signed amounts for backward compatibility with frontend
    by_category = {
        cat: {"total": round(agg[cat]["total"], 2), "count": agg[cat]["count"]}
        for cat in STANDARD_CATEGORIES
        if agg[cat]["count"] > 0
    }

    # Top 3 expense drivers
    expense_drivers = [
        {"category": item["category"], "total": item["amount"], "count": item["count"]}
        for item in spending_allocation
        if item["category"] != "Income" and item["amount"] > 0
    ]
    expense_drivers.sort(key=lambda x: -x["total"])
    top_3_drivers = expense_drivers[:3]

    # Calculate multi-month income & expense comparison trends
    monthly_trends = []
    try:
        all_user_txns = userstore.list_transactions(user_id=user_id)
        monthly_map = {}
        for t in all_user_txns:
            d = str(t.get("date", "")).strip()
            if len(d) >= 7 and d[4] == "-":
                m = d[:7]
            else:
                continue
            amt = float(t.get("amount", 0.0))
            cat = str(t.get("category", "")).strip().lower()
            if m not in monthly_map:
                monthly_map[m] = {"income": 0.0, "expense": 0.0}
            if cat == "income" or amt > 0:
                monthly_map[m]["income"] += abs(amt)
            else:
                monthly_map[m]["expense"] += abs(amt)

        for m in sorted(monthly_map.keys())[-12:]:
            inc = round(monthly_map[m]["income"], 2)
            exp = round(monthly_map[m]["expense"], 2)
            monthly_trends.append({
                "month": m,
                "income": inc,
                "expense": exp,
                "net": round(inc - exp, 2),
            })
    except Exception:
        monthly_trends = []

    return {
        "user_id": user_id,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": net_savings,
        "savings_rate": savings_rate,
        "spending_allocation": spending_allocation,
        "by_category": by_category,
        "top_3_drivers": top_3_drivers,
        "total_spend": -total_expense,
        "monthly_trends": monthly_trends,
    }


def handle_list_transactions(
    user_id: str,
    month: Optional[str] = None,
    category: Optional[str] = None,
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    userstore = None,
) -> dict:
    eff_limit = limit if limit is not None else page_size
    eff_offset = offset

    if page is not None:
        eff_limit = eff_limit or 20
        eff_offset = (page - 1) * eff_limit
    elif eff_limit is not None and eff_offset is None:
        eff_offset = 0

    if hasattr(userstore, "count_transactions"):
        total = userstore.count_transactions(user_id=user_id, month=month, category=category)
    else:
        all_txns = userstore.list_transactions(user_id=user_id, month=month, category=category)
        total = len(all_txns)

    txns = userstore.list_transactions(
        user_id=user_id,
        month=month,
        category=category,
        limit=eff_limit,
        offset=eff_offset,
    )

    if eff_limit is not None and eff_limit > 0:
        total_pages = (total + eff_limit - 1) // eff_limit if total > 0 else 1
        current_page = page if page is not None else ((eff_offset // eff_limit) + 1 if eff_offset is not None else 1)
        returned_page_size = eff_limit
    else:
        total_pages = 1
        current_page = 1
        returned_page_size = total

    return {
        "user_id": user_id,
        "month": month,
        "category": category,
        "total": total,
        "page": current_page,
        "page_size": returned_page_size,
        "total_pages": total_pages,
        "transactions": txns,
    }


def handle_chat(user_id: str, message: str, ai_client, userstore, history: list[dict] = None) -> dict:
    # Pass userstore to the AI client so it can autonomously call tools to fetch data
    reply = ai_client.chat(user_id, message, userstore, history=history)
    
    return {
        "reply": reply
    }

def _parse_chat_txn(message: str) -> dict:
    """
    Very lightweight natural‑language parser for a transaction sentence.
    Returns a dict with keys: date (YYYY‑MM‑DD), description, amount (float).
    If parsing fails, returns an empty dict.
    """
    import re
    import datetime
    from dateutil import parser as date_parser

    # Extract amount – supports $ / USD / plain number
    amount_match = re.search(r"(?i)(?:\$|usd)?\s*([\d,]+(?:\.\d{1,2})?)", message)
    amount = float(amount_match.group(1).replace(",", "")) if amount_match else None

    # Extract a date – try to find a date string, otherwise use today
    try:
        date_match = re.search(r"\b(on\s+)?(\d{4}[-/]\d{2}[-/]\d{2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})\b", message, re.I)
        if date_match:
            date_str = date_match.group(2)
            date_obj = date_parser.parse(date_str, fuzzy=True)
            date_iso = date_obj.date().isoformat()
        else:
            date_iso = datetime.date.today().isoformat()
    except Exception:
        date_iso = datetime.date.today().isoformat()

    # Description – remove amount and date substrings
    cleaned = re.sub(r"(?i)(?:\$|usd)?\s*[\d,]+(?:\.\d{1,2})?", "", message)
    cleaned = re.sub(r"\b(on\s+)?(\d{4}[-/]\d{2}[-/]\d{2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})\b", "", cleaned, flags=re.I)
    description = cleaned.strip().strip(".")

    if amount is None or date_iso is None or not description:
        return {}
    return {"date": date_iso, "description": description, "amount": amount}

def handle_chat_transaction(user_id: str, message: str, ai_client, userstore) -> dict:
    """
    Parse a free‑form spend message, categorize via AI, persist to DynamoDB,
    and return a friendly confirmation.
    """
    txn = _parse_chat_txn(message)
    if not txn:
        return {
            "status": "error",
            "detail": "Could not parse transaction. Please provide amount, description and date (e.g. 'I spent $12 on coffee yesterday')."
        }

    # Ask AI to categorize (force Bedrock bypassing Local fallback)
    ai_engine = getattr(ai_client, "primary", ai_client)
    cat_result = ai_engine.categorize(
        description=txn["description"],
        amount=txn["amount"],
        date=txn["date"],
    )
    txn["category"] = cat_result.get("category", "uncategorized")
    txn["confidence"] = cat_result.get("confidence", 0.0)
    txn["engine"] = cat_result.get("engine", "unknown")

    # Convert spending amount to negative (outflow), except for Income
    if txn["category"].lower() == "income":
        txn["amount"] = abs(txn["amount"])
        sign = "+"
    else:
        txn["amount"] = -abs(txn["amount"])
        sign = "-"

    # Persist
    userstore.add_transaction(user_id, txn)

    formatted_amount = f"{abs(txn['amount']):,.0f}".replace(",", ".")
    return {
        "status": "saved",
        "transaction": txn,
        "message": f"Saved {sign}{formatted_amount}đ on {txn['date']} as {txn['category']} (confidence {txn['confidence']})."
    }


def handle_coach(user_id: str, ai_client, userstore) -> dict:
    """Generate budget insights based on the user's spending data."""
    from datetime import datetime, timezone
    import json
    
    now = datetime.now(timezone.utc)
    current_month_str = now.strftime("%Y-%m")
    if now.month == 1:
        prev_month_str = f"{now.year - 1}-12"
    else:
        prev_month_str = f"{now.year}-{now.month - 1:02d}"
        
    current_txns = userstore.list_transactions(user_id, month=current_month_str)
    prev_txns = userstore.list_transactions(user_id, month=prev_month_str)
    
    # Calculate category spending distribution in Python for chartData
    curr_totals = {}
    prev_totals = {}
    
    for txn in current_txns:
        amt = float(txn.get("amount", 0))
        if amt < 0:
            cat = txn.get("category", "Other")
            curr_totals[cat] = curr_totals.get(cat, 0) + abs(amt)
            
    for txn in prev_txns:
        amt = float(txn.get("amount", 0))
        if amt < 0:
            cat = txn.get("category", "Other")
            prev_totals[cat] = prev_totals.get(cat, 0) + abs(amt)
            
    chartData = [{"name": k, "value": v} for k, v in curr_totals.items()]
    chartData = sorted(chartData, key=lambda x: x["value"], reverse=True)
    
    summary_text = f"Previous Month ({prev_month_str}) Spending: {prev_totals}. Current Month ({current_month_str}) Spending: {curr_totals}."
    
    prompt = f"""Analyze the user's financial data and provide financial insights and budget cap suggestions. 
Data Summary: {summary_text}

Format the output STRICTLY as a JSON object. Do not include markdown code block wrappers (like ```json), just the raw JSON.
The JSON object must have:
- "insights": An array of 3-5 insight objects. Each insight has: "title" (string), "description" (string), "type" ("positive", "warning", or "neutral"), and "actionable_steps" (array of strings).
- "suggested_caps": An array of budget cap suggestions. Each suggestion has: "category" (string), "suggested_cap" (number, positive integer), and "reason" (string). Only suggest caps for categories where the user is overspending or spending significantly.

Example:
{{
  "insights": [
    {{
      "title": "High Food Spending",
      "description": "You spent heavily on Food this month.",
      "type": "warning",
      "actionable_steps": ["Cook at home 3 times this week"]
    }}
  ],
  "suggested_caps": [
    {{
      "category": "Food",
      "suggested_cap": 2000000,
      "reason": "Based on last month's spending of 2.5M, a 2M cap will help you save."
    }}
  ]
}}
"""
    
    reply = ai_client.chat(user_id, prompt, userstore)
    
    try:
        # Some LLMs wrap JSON in markdown blocks
        if "```json" in reply:
            reply = reply.split("```json")[1].split("```")[0].strip()
        elif "```" in reply:
            reply = reply.split("```")[1].split("```")[0].strip()
            
        start_idx = reply.find('{')
        end_idx = reply.rfind('}')
        if start_idx != -1 and end_idx != -1:
            reply = reply[start_idx:end_idx+1]
            
        result = json.loads(reply)
        insights = result.get("insights", [])
        suggested_caps = result.get("suggested_caps", [])
    except Exception as e:
        # Fallback if parsing fails
        insights = [
            {
                "title": "AI Insight Error", 
                "description": f"Failed to parse AI output. Raw text: {reply}. Error: {str(e)}", 
                "type": "neutral",
                "actionable_steps": ["Check the backend logs."]
            }
        ]
        suggested_caps = []
        
    return {
        "insights": insights,
        "suggested_caps": suggested_caps,
        "chartData": chartData
    }

