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
                conf = cat_result.get("confidence_level", cat_result.get("confidence", "high"))
                txn = {
                    "date": row["date"],
                    "description": row["description"],
                    "amount": row["amount"],
                    "category": cat_result["category"],
                    "confidence": conf,
                    "engine": cat_result.get("engine", "unknown"),
                }
                if "confidence_score" in cat_result:
                    txn["confidence_score"] = cat_result["confidence_score"]
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
    search: Optional[str] = None,
) -> dict:
    eff_limit = limit if limit is not None else page_size
    eff_offset = offset

    if page is not None:
        eff_limit = eff_limit or 20
        eff_offset = (page - 1) * eff_limit
    elif eff_limit is not None and eff_offset is None:
        eff_offset = 0

    clean_search = search.strip() if search and search.strip() else None

    import inspect
    list_sig = inspect.signature(userstore.list_transactions)
    supports_search = "search" in list_sig.parameters

    if clean_search and not supports_search:
        all_txns = userstore.list_transactions(user_id=user_id, month=month, category=category)
        q = clean_search.lower()
        filtered = [
            t for t in all_txns
            if q in str(t.get("description", "")).lower() or q in str(t.get("category", "")).lower()
        ]
        total = len(filtered)
        if eff_offset is not None:
            filtered = filtered[eff_offset:]
        if eff_limit is not None:
            filtered = filtered[:eff_limit]
        txns = filtered
    else:
        if hasattr(userstore, "count_transactions"):
            count_kwargs = {"user_id": user_id, "month": month, "category": category}
            if clean_search and "search" in inspect.signature(userstore.count_transactions).parameters:
                count_kwargs["search"] = clean_search
            total = userstore.count_transactions(**count_kwargs)
        else:
            all_txns = userstore.list_transactions(user_id=user_id, month=month, category=category)
            total = len(all_txns)

        list_kwargs = {
            "user_id": user_id,
            "month": month,
            "category": category,
            "limit": eff_limit,
            "offset": eff_offset,
        }
        if clean_search and supports_search:
            list_kwargs["search"] = clean_search
        txns = userstore.list_transactions(**list_kwargs)

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

def _norm_vi_text(text: str) -> str:
    """Lowercase and strip Vietnamese diacritics for flexible matching."""
    import unicodedata
    s = str(text or "").strip().lower().replace("đ", "d")
    nfd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _extract_txn_parts(message: str, default_today: bool = True) -> dict:
    """Extract optional date (YYYY-MM-DD), amount (float), and cleaned description."""
    import re
    import datetime
    from dateutil import parser as date_parser

    msg = message.strip()
    if not msg:
        return {"date": None, "description": "", "amount": None}

    today = datetime.date.today()
    date_iso = today.isoformat() if default_today else None

    # 1. Date extraction
    if re.search(r"\b(hôm qua|hom qua|yesterday)\b", msg, re.I):
        date_iso = (today - datetime.timedelta(days=1)).isoformat()
        msg = re.sub(r"\b(hôm qua|hom qua|yesterday)\b", " ", msg, flags=re.I)
    elif re.search(r"\b(hôm nay|hom nay|today)\b", msg, re.I):
        date_iso = today.isoformat()
        msg = re.sub(r"\b(hôm nay|hom nay|today)\b", " ", msg, flags=re.I)
    else:
        date_match = re.search(
            r"\b(?:on\s+|ngày\s+|ngay\s+)?(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?)\b",
            msg,
            re.I,
        )
        if date_match:
            try:
                d_str = date_match.group(1)
                parsed_d = date_parser.parse(d_str, dayfirst=True, default=datetime.datetime(today.year, today.month, today.day))
                date_iso = parsed_d.date().isoformat()
                msg = msg[:date_match.start()] + " " + msg[date_match.end():]
            except Exception:
                pass

    # 2. Amount extraction with Vietnamese slang & currency multipliers
    unit_multipliers = {
        "k": 1000, "nghìn": 1000, "nghin": 1000, "ngàn": 1000, "ngan": 1000,
        "lit": 100000, "lít": 100000, "loet": 100000, "loét": 100000,
        "củ": 1000000, "cu": 1000000, "triệu": 1000000, "trieu": 1000000,
        "tr": 1000000, "chai": 1000000, "m": 1000000,
    }

    amount = None
    amount_span = None

    pattern_unit = re.search(
        r"(?i)(?:\$|usd)?\s*(\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|ngàn|ngan|lít|lit|loét|loet|củ|cu|triệu|trieu|tr|chai)\b",
        msg,
    )
    if pattern_unit:
        raw_num = pattern_unit.group(1).replace(",", ".")
        unit_str = pattern_unit.group(2).lower()
        try:
            val = float(raw_num)
            mult = unit_multipliers.get(unit_str, 1)
            amount = val * mult
            amount_span = pattern_unit.span()
        except ValueError:
            pass
    else:
        pattern_plain = re.search(
            r"(?i)(?:\$|usd)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:đ|vnd|đồng)?\b",
            msg,
        )
        if pattern_plain:
            raw_s = pattern_plain.group(1).replace(".", "").replace(",", "")
            try:
                amount = float(raw_s)
                amount_span = pattern_plain.span()
            except ValueError:
                pass

    if amount is not None and amount_span is not None:
        msg = msg[:amount_span[0]] + " " + msg[amount_span[1]:]

    # 3. Clean filler words from description
    cleaned_desc = re.sub(
        r"(?i)\b(on|ngày|ngay|hôm nay|hom nay|hôm qua|hom qua|yesterday|today|tầm|khoảng|khoang|giao dịch|giao dich|khoản|khoan)\b",
        " ",
        msg,
    )
    cleaned_desc = re.sub(r"\s+", " ", cleaned_desc).strip(" .,-\"'")

    return {"date": date_iso, "description": cleaned_desc, "amount": amount}


def _parse_chat_txn(message: str) -> dict:
    """Natural‑language parser for Vietnamese & English transaction sentences."""
    parts = _extract_txn_parts(message, default_today=True)
    if not parts["description"] or parts["amount"] is None:
        return {}
    return parts


_CATEGORY_ALIAS_MAP = {
    "food": "Food", "an uong": "Food", "tien an": "Food",
    "transport": "Transport", "di chuyen": "Transport", "di lai": "Transport",
    "shopping": "Shopping", "mua sam": "Shopping",
    "utilities": "Utilities", "hoa don": "Utilities", "tien ich": "Utilities",
    "entertainment": "Entertainment", "giai tri": "Entertainment",
    "health": "Health", "y te": "Health", "suc khoe": "Health",
    "subscriptions": "Subscriptions", "subscription": "Subscriptions", "dich vu dinh ky": "Subscriptions",
    "income": "Income", "thu nhap": "Income",
    "transfer": "Transfer", "chuyen khoan": "Transfer", "chuyen tien": "Transfer",
    "other": "Other", "khac": "Other",
}


def _detect_explicit_category(text: str) -> Optional[str]:
    norm = _norm_vi_text(text)
    norm = norm.strip(" .,-\"'")
    if norm in _CATEGORY_ALIAS_MAP:
        return _CATEGORY_ALIAS_MAP[norm]
    return None


def _find_matching_txns(userstore, user_id: str, query_desc: str, query_date: Optional[str], query_amount: Optional[float]) -> list[dict]:
    txns = userstore.list_transactions(user_id, month=query_date) if query_date else userstore.list_transactions(user_id)
    q_norm = _norm_vi_text(query_desc)
    q_tokens = [tok for tok in q_norm.split() if tok]

    matched = []
    for t in txns:
        if query_amount is not None:
            if abs(abs(float(t.get("amount", 0))) - query_amount) >= 1.0:
                continue
        if q_norm:
            d_norm = _norm_vi_text(t.get("description", ""))
            if q_norm not in d_norm and not all(tok in d_norm for tok in q_tokens):
                continue
        matched.append(t)

    matched.sort(key=lambda x: (str(x.get("date", "")), str(x.get("id", ""))), reverse=True)
    return matched


def _are_distinct_txns(txns: list[dict]) -> bool:
    if len(txns) <= 1:
        return False
    sigs = {(str(t.get("date", "")), _norm_vi_text(t.get("description", "")), round(float(t.get("amount", 0)), 2)) for t in txns}
    return len(sigs) > 1


def handle_chat_transaction(user_id: str, message: str, ai_client, userstore) -> dict:
    """
    Parse natural-language Add, Edit, or Delete transaction commands,
    execute against userstore, and return a structured status card payload.
    """
    import re
    raw_msg = (message or "").strip()
    if not raw_msg:
        return {"status": "error", "detail": "Vui lòng nhập nội dung giao dịch."}

    ai_engine = getattr(ai_client, "primary", ai_client)

    # 1. Check DELETE intent
    del_match = re.match(
        r"^(?:hãy\s+|hay\s+|làm ơn\s+|lam on\s+|giúp tôi\s+|giup toi\s+|mình muốn\s+|minh muon\s+)?(?:xóa|xoá|xoa|huỷ|hủy|huy|bỏ|bo|delete|remove)\b(?:\s+(?:giao dịch|giao dich|khoản|khoan|mục|muc))?\s*(.*)$",
        raw_msg,
        re.I,
    )
    if del_match:
        target_str = del_match.group(1).strip()
        parts = _extract_txn_parts(target_str, default_today=False)
        if not parts["description"] and parts["amount"] is None and not parts["date"]:
            return {
                "status": "error",
                "detail": "Vui lòng nêu rõ giao dịch cần xóa (ví dụ: 'xóa giao dịch ăn xôi 50k ngày 27-11-2026')."
            }

        matches = _find_matching_txns(userstore, user_id, parts["description"], parts["date"], parts["amount"])
        if not matches:
            return {
                "status": "error",
                "detail": "Không tìm thấy giao dịch nào khớp để xóa. Bạn hãy kiểm tra lại tên, số tiền hoặc ngày."
            }
        if _are_distinct_txns(matches):
            return {
                "status": "ambiguous",
                "action": "delete",
                "candidates": matches[:5],
                "detail": f"Tìm thấy {len(matches)} giao dịch phù hợp. Hãy chọn đúng giao dịch cần xóa:"
            }

        target = matches[0]
        userstore.delete_transaction(user_id, target["id"])
        formatted_amount = f"{abs(float(target.get('amount', 0))):,.0f}".replace(",", ".")
        sign = "+" if float(target.get("amount", 0)) >= 0 else "-"
        return {
            "status": "deleted",
            "transaction": target,
            "message": f"Đã xóa giao dịch {sign}{formatted_amount}đ ({target.get('description')}) ngày {target.get('date')}."
        }

    # 2. Check EDIT / UPDATE intent ("sửa/đổi giao dịch A thành/sang B")
    edit_match = re.match(
        r"^(?:hãy\s+|hay\s+|làm ơn\s+|lam on\s+|giúp tôi\s+|giup toi\s+|mình muốn\s+|minh muon\s+)?(?:sửa|sua|đổi|doi|chỉnh sửa|chinh sua|chỉnh|chinh|cập nhật|cap nhat|update|edit|change)\s+(.+?)\s+(?:thành|thanh|sang|->|=>|to)\s+(.+)$",
        raw_msg,
        re.I,
    )
    if edit_match:
        target_raw = edit_match.group(1).strip()
        new_raw = edit_match.group(2).strip()
        is_cat_command = bool(re.search(r"\b(danh mục|danh muc|category|loại|loai)\b", target_raw, re.I))
        target_clean = re.sub(r"(?i)\b(danh mục|danh muc|category|loại|loai|của|cua)\b", " ", target_raw).strip()

        q_parts = _extract_txn_parts(target_clean, default_today=False)
        if not q_parts["description"] and q_parts["amount"] is None and not q_parts["date"]:
            return {
                "status": "error",
                "detail": "Không xác định được giao dịch cần sửa. Ví dụ: 'đổi giao dịch ăn xôi 50k thành ăn phở 60k'."
            }

        matches = _find_matching_txns(userstore, user_id, q_parts["description"], q_parts["date"], q_parts["amount"])
        if not matches:
            return {
                "status": "error",
                "detail": "Không tìm thấy giao dịch nào khớp để sửa. Bạn hãy kiểm tra lại tên hoặc ngày giao dịch."
            }

        # Build update payload from new_raw
        explicit_cat = _detect_explicit_category(new_raw)
        updates: dict = {}

        if explicit_cat and (is_cat_command or _detect_explicit_category(new_raw) is not None):
            updates["category"] = explicit_cat
            updates["confidence"] = "high"
            updates["engine"] = "user_confirmed"
        else:
            new_parts = _extract_txn_parts(new_raw, default_today=False)
            if new_parts["date"]:
                updates["date"] = new_parts["date"]
            if new_parts["description"]:
                updates["description"] = new_parts["description"]
            if new_parts["amount"] is not None:
                updates["amount"] = new_parts["amount"]

            if not updates:
                return {
                    "status": "error",
                    "detail": "Không đọc được thông tin mới cần cập nhật (tên mới, số tiền mới, ngày mới hoặc danh mục mới)."
                }

        # Preview/apply against target (or return ambiguous list)
        def _finalize_updates(base_txn: dict, raw_updates: dict) -> dict:
            final_u = dict(raw_updates)
            eff_desc = final_u.get("description", base_txn.get("description", ""))
            eff_date = final_u.get("date", base_txn.get("date", ""))
            eff_abs_amt = abs(float(final_u.get("amount", base_txn.get("amount", 0))))

            if "category" not in final_u and "description" in final_u:
                cat_res = ai_engine.categorize(description=eff_desc, amount=eff_abs_amt, date=eff_date)
                final_u["category"] = cat_res.get("category", base_txn.get("category", "Other"))
                final_u["confidence"] = cat_res.get("confidence_level", cat_res.get("confidence", "high"))
                final_u["engine"] = cat_res.get("engine", "nlp_ml")

            eff_cat = final_u.get("category", base_txn.get("category", "Other"))
            if "amount" in final_u or "category" in final_u:
                final_u["amount"] = eff_abs_amt if str(eff_cat).lower() == "income" else -eff_abs_amt
            return final_u

        if _are_distinct_txns(matches):
            sample_updates = _finalize_updates(matches[0], updates)
            return {
                "status": "ambiguous",
                "action": "edit",
                "candidates": matches[:5],
                "updates": sample_updates,
                "detail": f"Tìm thấy {len(matches)} giao dịch phù hợp. Hãy chọn đúng giao dịch muốn cập nhật:"
            }

        target = matches[0]
        final_updates = _finalize_updates(target, updates)
        updated_txn = userstore.update_transaction(user_id, target["id"], final_updates)
        return {
            "status": "updated",
            "transaction": updated_txn or {**target, **final_updates},
            "previous": target,
            "message": f"Đã cập nhật giao dịch thành công."
        }

    # 3. Default ADD intent
    txn = _parse_chat_txn(raw_msg)
    if not txn:
        return {
            "status": "error",
            "detail": "Không thể trích xuất giao dịch. Ví dụ: 'Ăn xôi 50k', 'Sửa giao dịch ăn xôi thành ăn phở 60k', hoặc 'Xóa giao dịch ăn xôi 50k hôm nay'."
        }

    cat_result = ai_engine.categorize(
        description=txn["description"],
        amount=txn["amount"],
        date=txn["date"],
    )
    txn["category"] = cat_result.get("category", "uncategorized")
    txn["confidence"] = cat_result.get("confidence_level", cat_result.get("confidence", "high"))
    txn["engine"] = cat_result.get("engine", "unknown")
    if "confidence_score" in cat_result:
        txn["confidence_score"] = cat_result["confidence_score"]

    if txn["category"].lower() == "income":
        txn["amount"] = abs(txn["amount"])
        sign = "+"
    else:
        txn["amount"] = -abs(txn["amount"])
        sign = "-"

    created = userstore.add_transaction(user_id, txn)
    saved_txn = created or txn

    formatted_amount = f"{abs(saved_txn['amount']):,.0f}".replace(",", ".")
    return {
        "status": "saved",
        "transaction": saved_txn,
        "message": f"Saved {sign}{formatted_amount}đ on {saved_txn['date']} as {saved_txn['category']} (confidence {saved_txn['confidence']})."
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

