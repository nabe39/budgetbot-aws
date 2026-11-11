"""Test suite for Vietnamese bank statement preprocessing and normalization."""
import io
import os
import tempfile
from pathlib import Path
import pytest
import openpyxl

os.environ.setdefault("AI_BACKEND", "local")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("USERSTORE_BACKEND", "sqlite")
_tmp = tempfile.mkdtemp(prefix="budgetbot-statement-test-")
os.environ["STORAGE_LOCAL_DIR"] = str(Path(_tmp) / "uploads")
os.environ["USERSTORE_SQLITE_PATH"] = str(Path(_tmp) / "transactions.db")

from fastapi.testclient import TestClient
from src.app import app
from src.adapters.statement_parser import (
    normalize_date,
    parse_vietnamese_amount,
    clean_description,
    parse_statement,
)

client = TestClient(app)


def test_normalize_date_formats():
    """Verify various date formats are normalized to ISO YYYY-MM-DD with dayfirst=True."""
    # DD/MM/YYYY
    assert normalize_date("25/03/2026") == "2026-03-25"
    assert normalize_date("01/05/2026") == "2026-05-01"
    # DD-MM-YYYY
    assert normalize_date("15-08-2026") == "2026-08-15"
    # DD.MM.YYYY
    assert normalize_date("02.11.2025") == "2025-11-02"
    # ISO YYYY-MM-DD
    assert normalize_date("2026-05-02") == "2026-05-02"
    # With timestamps
    assert normalize_date("15/08/2026 14:30:00") == "2026-08-15"
    assert normalize_date("2026-04-10T09:15:00") == "2026-04-10"
    # Day-of-week prefix
    assert normalize_date("Thứ 2, 02/03/2026") == "2026-03-02"
    assert normalize_date("T2, 10/04/2026") == "2026-04-10"
    # Invalid dates
    assert normalize_date("") is None
    assert normalize_date("invalid_date") is None
    assert normalize_date("32/13/2026") is None


def test_parse_vietnamese_amount():
    """Verify amounts in various Vietnamese bank formats are parsed accurately."""
    # Dot thousands separator (typical VN)
    assert parse_vietnamese_amount("150.000") == 150000.0
    assert parse_vietnamese_amount("1.500.000") == 1500000.0
    # With VND / đ symbols
    assert parse_vietnamese_amount("150.000 đ") == 150000.0
    assert parse_vietnamese_amount("25.000.000 VND") == 25000000.0
    assert parse_vietnamese_amount("2.500.000 VNĐ") == 2500000.0
    # Comma thousands separator
    assert parse_vietnamese_amount("1,500,000") == 1500000.0
    # Signed amounts
    assert parse_vietnamese_amount("-250.000") == -250000.0
    assert parse_vietnamese_amount("+28.000.000") == 28000000.0
    # Accounting parentheses (negative)
    assert parse_vietnamese_amount("(50.000)") == -50000.0
    # Banking DR / CR notation
    assert parse_vietnamese_amount("150.000 DR") == -150000.0
    assert parse_vietnamese_amount("200.000 CR") == 200000.0
    # Invalid
    assert parse_vietnamese_amount("") is None
    assert parse_vietnamese_amount("Chua thanh toan") is None


def test_clean_description():
    """Verify description cleaning strips redundant whitespace, newlines, tabs, and quotes."""
    raw = '  "Highlands   Coffee\n  Chi nhanh 1"\t '
    cleaned = clean_description(raw)
    assert cleaned == "Highlands Coffee Chi nhanh 1"


def test_parse_vietnamese_bank_csv_with_metadata_and_footers():
    """Verify parser strips metadata headers and footer summaries, handling split Debit/Credit."""
    vcb_csv = """NGAN HANG TMCP NGOAI THUONG VIET NAM (VIETCOMBANK)
CHI NHANH: HO CHI MINH
CHU TAI KHOAN: NGUYEN VAN A
SO TAI KHOAN: 0071000123456
KY SAO KE: 01/03/2026 - 31/03/2026

Ngay GD,So GD,Dien giai,So tien ghi no,So tien ghi co,So du
02/03/2026,FT01,Highlands Coffee Crescent Mall,65.000,,10.000.000
05/03/2026,FT02,Cong ty ABC tra luong T3,,25.000.000,34.935.000
10/03/2026,FT03,Shopee Food order 9928,120.000,,34.815.000
15/03/2026,FT04,Tien dien EVN HCMC,1.250.000,,33.565.000

Tong cong phat sinh,,1.435.000,25.000.000,
Nguoi lap bieu: Tran Thi B
Kế toán trưởng: Pham Van C
""".encode("utf-8")

    rows = parse_statement(vcb_csv, "vcb_statement.csv")
    assert len(rows) == 4

    # Row 1: Expense (Debit)
    assert rows[0]["date"] == "2026-03-02"
    assert rows[0]["description"] == "Highlands Coffee Crescent Mall"
    assert rows[0]["amount"] == -65000.0

    # Row 2: Income (Credit)
    assert rows[1]["date"] == "2026-03-05"
    assert rows[1]["description"] == "Cong ty ABC tra luong T3"
    assert rows[1]["amount"] == 25000000.0

    # Row 3: Expense (Debit)
    assert rows[2]["date"] == "2026-03-10"
    assert rows[2]["description"] == "Shopee Food order 9928"
    assert rows[2]["amount"] == -120000.0

    # Row 4: Expense (Debit)
    assert rows[3]["date"] == "2026-03-15"
    assert rows[3]["description"] == "Tien dien EVN HCMC"
    assert rows[3]["amount"] == -1250000.0


def test_parse_excel_statement():
    """Verify parsing Excel (.xlsx) statement with metadata, blank rows, and footers."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Techcombank"

    # Header metadata
    ws.append(["NGAN HANG TMCP KY THUONG VIET NAM (TECHCOMBANK)"])
    ws.append(["Chu tai khoan: TRAN VAN B"])
    ws.append([])  # blank row

    # Table header
    ws.append(["Ngày GD", "Mã GD", "Nội dung giao dịch", "Số tiền", "Số dư"])

    # Transactions
    ws.append(["12/04/2026", "TXN101", "Highlands Coffee Hanoi", "-55.000 đ", "5.000.000"])
    ws.append(["14/04/2026", "TXN102", "Salary deposit payroll", "20.000.000 VND", "24.945.000"])
    ws.append(["18/04/2026", "TXN103", "Netflix monthly subscription", "-260.000", "24.685.000"])

    # Footer
    ws.append([])
    ws.append(["Tổng cộng", "", "", "19.685.000", ""])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    rows = parse_statement(excel_bytes, "techcombank.xlsx")
    assert len(rows) == 3

    assert rows[0]["date"] == "2026-04-12"
    assert rows[0]["description"] == "Highlands Coffee Hanoi"
    assert rows[0]["amount"] == -55000.0

    assert rows[1]["date"] == "2026-04-14"
    assert rows[1]["description"] == "Salary deposit payroll"
    assert rows[1]["amount"] == 20000000.0

    assert rows[2]["date"] == "2026-04-18"
    assert rows[2]["description"] == "Netflix monthly subscription"
    assert rows[2]["amount"] == -260000.0


def test_api_upload_vietnamese_csv_end_to_end():
    """Test POST /upload with Vietnamese bank CSV, verifying end-to-end NLP categorization and storage."""
    vcb_csv = """NGAN HANG TMCP NGOAI THUONG VIET NAM
CHU TAI KHOAN: NGUYEN VAN TEST
SO TAI KHOAN: 1234567890

Ngay giao dich,Noi dung chi tiet,Ghi no,Ghi co
01/05/2026,Highlands Coffee Ben Thanh,65.000,
02/05/2026,Salary deposit payroll,,28.000.000
03/05/2026,Netflix subscription,260.000,
04/05/2026,Xanh SM taxi,120.000,

Tong cong,,445.000,28.000.000
""".encode("utf-8")

    r = client.post(
        "/upload",
        files={"file": ("vcb_statement.csv", vcb_csv, "text/csv")},
        headers={"X-User-Id": "vn-user-1"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rows_parsed"] == 4
    assert body["rows_inserted"] == 4

    # Verify transactions in userstore
    r_txns = client.get("/transactions", headers={"X-User-Id": "vn-user-1"})
    assert r_txns.status_code == 200
    txns = r_txns.json()["transactions"]
    assert len(txns) == 4

    cats = {t["description"]: (t["category"], t["amount"]) for t in txns}
    assert cats["Highlands Coffee Ben Thanh"][0] == "Food"
    assert cats["Highlands Coffee Ben Thanh"][1] == -65000.0

    assert cats["Salary deposit payroll"][0] == "Income"
    assert cats["Salary deposit payroll"][1] == 28000000.0

    assert cats["Netflix subscription"][0] == "Subscriptions"
    assert cats["Netflix subscription"][1] == -260000.0

    assert cats["Xanh SM taxi"][0] == "Transport"
    assert cats["Xanh SM taxi"][1] == -120000.0


def test_api_upload_excel_end_to_end():
    """Test POST /upload with Excel (.xlsx) bank statement file."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Statement"

    ws.append(["NGAN HANG MB BANK"])
    ws.append(["Kỳ sao kê: Tháng 05/2026"])
    ws.append([])

    ws.append(["Ngày", "Diễn giải", "Số tiền"])
    ws.append(["05/05/2026", "Shopee mall order", "-350.000 đ"])
    ws.append(["08/05/2026", "Tien dien EVN", "-750.000"])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    r = client.post(
        "/upload",
        files={"file": ("mbbank.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={"X-User-Id": "vn-excel-user"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rows_parsed"] == 2
    assert body["rows_inserted"] == 2

    r_txns = client.get("/transactions", headers={"X-User-Id": "vn-excel-user"})
    txns = r_txns.json()["transactions"]
    assert len(txns) == 2
    cats = {t["description"]: (t["category"], t["amount"]) for t in txns}
    assert cats["Shopee mall order"][0] == "Shopping"
    assert cats["Shopee mall order"][1] == -350000.0
    assert cats["Tien dien EVN"][0] == "Utilities"
    assert cats["Tien dien EVN"][1] == -750000.0


def test_semicolon_delimited_and_utf8_bom():
    """Verify CSV with UTF-8 BOM and semicolon delimiters is parsed properly."""
    content = "\ufeffNgày GD;Nội dung;Số tiền\n12/06/2026;Highlands Coffee;-45.000\n15/06/2026;Lương tháng 6;30.000.000\n".encode("utf-8-sig")
    rows = parse_statement(content, "statement_semicolon.csv")
    assert len(rows) == 2
    assert rows[0]["date"] == "2026-06-12"
    assert rows[0]["description"] == "Highlands Coffee"
    assert rows[0]["amount"] == -45000.0
    assert rows[1]["date"] == "2026-06-15"
    assert rows[1]["amount"] == 30000000.0



def test_upload_with_low_confidence_and_hitl_batch_review():
    """
    Verify end-to-end Human-In-The-Loop review flow (KAN-27):
    1. Upload statement containing a low-confidence opaque transaction code.
    2. Low-confidence transaction is segregated into needs_review and NOT auto-inserted into DB.
    3. User reviews and updates category via POST /transactions/batch.
    4. Transaction is persisted to DB with verified category and user_confirmed engine.
    """
    csv_data = (
        "Ngày GD,Nội dung,Số tiền\n"
        "10/06/2026,Highlands Coffee,-55.000\n"
        "11/06/2026,FT261390492819 Unknown Opaque Wire Transfer,-250.000\n"
    ).encode("utf-8")

    user_headers = {"X-User-Id": "hitl-test-user"}

    # 1. Upload statement
    resp = client.post(
        "/upload",
        files={"file": ("statement.csv", csv_data, "text/csv")},
        headers=user_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["rows_parsed"] == 2
    assert body["rows_inserted"] == 1
    assert len(body["needs_review"]) == 1

    suspect_txn = body["needs_review"][0]
    assert suspect_txn["description"] == "FT261390492819 Unknown Opaque Wire Transfer"
    assert suspect_txn["confidence"] == "low"

    # 2. Verify only 1 high-confidence transaction is currently in DB
    txns_resp = client.get("/transactions", headers=user_headers)
    assert txns_resp.status_code == 200
    db_txns = txns_resp.json()["transactions"]
    assert len(db_txns) == 1
    assert db_txns[0]["description"] == "Highlands Coffee"

    # 3. Simulate Human-In-The-Loop review: user selects 'Shopping' category
    batch_payload = {
        "transactions": [
            {
                "date": suspect_txn["date"],
                "description": suspect_txn["description"],
                "amount": -abs(suspect_txn["amount"]),
                "category": "Shopping",
                "confidence": "high",
                "engine": "user_confirmed",
            }
        ]
    }
    batch_resp = client.post("/transactions/batch", json=batch_payload, headers=user_headers)
    assert batch_resp.status_code == 200
    assert batch_resp.json()["count"] == 1

    # 4. Verify DB now contains both transactions
    final_txns_resp = client.get("/transactions", headers=user_headers)
    final_txns = final_txns_resp.json()["transactions"]
    assert len(final_txns) == 2

    reviewed = next(t for t in final_txns if t["description"] == suspect_txn["description"])
    assert reviewed["category"] == "Shopping"
    assert reviewed["confidence"] == "high"
    assert reviewed["amount"] == -250000.0


def test_upload_staging_review_with_auto_commit_false():
    """
    Verify full staging review flow (auto_commit=false):
    1. Upload statement with auto_commit=false.
    2. Zero rows are auto-inserted into DB, all transactions returned in all_transactions.
    3. User reviews and confirms entire statement via POST /transactions/batch.
    4. All transactions now exist in DB.
    """
    csv_data = (
        "Ngày GD,Nội dung,Số tiền\n"
        "01/05/2026,Highlands Coffee,-65.000\n"
        "02/05/2026,Salary deposit payroll,28.000.000\n"
        "03/05/2026,Unknown Opaque Core Banking Wire,-150.000\n"
    ).encode("utf-8")

    user_headers = {"X-User-Id": "staging-review-user"}

    # 1. Upload statement with auto_commit=false
    resp = client.post(
        "/upload?auto_commit=false",
        files={"file": ("staging_statement.csv", csv_data, "text/csv")},
        headers=user_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["rows_parsed"] == 3
    assert body["rows_inserted"] == 0
    assert len(body["all_transactions"]) == 3

    # 2. Verify database is currently empty
    txns_resp = client.get("/transactions", headers=user_headers)
    assert txns_resp.status_code == 200
    assert len(txns_resp.json()["transactions"]) == 0

    # 3. Simulate user review: update category of the unknown transaction and confirm all
    staged_txns = body["all_transactions"]
    for t in staged_txns:
        if "Unknown" in t["description"]:
            t["category"] = "Shopping"
            t["confidence"] = "high"
            t["engine"] = "user_confirmed"

    batch_resp = client.post(
        "/transactions/batch",
        json={"transactions": staged_txns},
        headers=user_headers,
    )
    assert batch_resp.status_code == 200
    assert batch_resp.json()["count"] == 3

    # 4. Verify all transactions now persisted in DB
    final_txns_resp = client.get("/transactions", headers=user_headers)
    assert final_txns_resp.status_code == 200
    assert len(final_txns_resp.json()["transactions"]) == 3
