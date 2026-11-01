"""Vietnamese bank statement preprocessing and normalization module."""
import csv
import io
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import dateutil.parser


def decode_text(data: bytes) -> str:
    """Safely decode raw bytes into string with multiple encoding fallbacks."""
    for enc in ["utf-8-sig", "utf-8", "cp1258", "latin1"]:
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def normalize_date(val: Any) -> Optional[str]:
    """
    Normalize various date formats to ISO YYYY-MM-DD.
    Supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, Excel serial dates,
    and timestamps with time components. Uses dayfirst=True for Vietnamese bank conventions.
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    if hasattr(val, "strftime"):
        return val.strftime("%Y-%m-%d")

    s = str(val).strip()
    if not s:
        return None

    # Strip day of week prefixes like 'Thứ 2, ', 'T2 ', 'Mon, '
    s = re.sub(
        r"^(?:thứ\s*\d+|thứ\s*hai|thứ\s*ba|thứ\s*tư|thứ\s*năm|thứ\s*sáu|thứ\s*bảy|chủ\s*nhật|cn|t\d+|mon|tue|wed|thu|fri|sat|sun)[,\s/-]*",
        "",
        s,
        flags=re.IGNORECASE,
    ).strip()

    # Excel date serial number check (typically between 30000 and 60000)
    try:
        num = float(s)
        if 30000 <= num <= 60000:
            dt = datetime(1899, 12, 30) + timedelta(days=num)
            return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Regex matches: ISO YYYY-MM-DD or YYYY/MM/DD
    m_iso = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if m_iso:
        y, m, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # Regex matches: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m_dmy = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", s)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # Fallback to dateutil parser
    try:
        parsed_dt = dateutil.parser.parse(s, dayfirst=True)
        if 1990 <= parsed_dt.year <= 2100:
            return parsed_dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    return None


def parse_vietnamese_amount(val: Any) -> Optional[float]:
    """
    Parse monetary amount in Vietnamese format (VND).
    Handles:
      - Thousands separator ('.' or ',')
      - Accounting negatives: '(150.000)' -> -150000
      - Explicit signs: '-150.000', '+28.000.000', '150.000-'
      - DR / CR suffixes: '150.000 DR' -> -150000, '200.000 CR' -> 200000
      - Currency symbols: 'đ', 'VND', 'VNĐ', 'vmd', '$'
    Returns float (negative for debit/expense, positive for credit/income), or None if invalid.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s:
        return None

    is_negative = False
    # Accounting parentheses (e.g. (150,000) or (150.000))
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1].strip()
    elif s.startswith("-"):
        is_negative = True
        s = s[1:].strip()
    elif s.endswith("-"):
        is_negative = True
        s = s[:-1].strip()

    # Check DR / CR suffix
    if s.upper().endswith("DR"):
        is_negative = True
        s = s[:-2].strip()
    elif s.upper().endswith("CR"):
        s = s[:-2].strip()

    # Keep only digits, dots, commas, plus
    s = re.sub(r"[^\d.,+]", "", s)
    if not s:
        return None
    if s.startswith("+"):
        s = s[1:].strip()

    # Separators resolution
    if "." in s and "," in s:
        last_dot = s.rfind(".")
        last_comma = s.rfind(",")
        if last_dot > last_comma:
            # 1,234,567.89 -> Comma is thousands, dot is decimal
            s = s.replace(",", "")
        else:
            # 1.234.567,89 -> Dot is thousands, comma is decimal
            s = s.replace(".", "").replace(",", ".")
    elif "." in s:
        parts = s.split(".")
        if len(parts) > 2:
            # Multiple dots e.g. 1.500.000 -> thousands separator
            s = s.replace(".", "")
        elif len(parts) == 2:
            # Single dot: if length of fraction is 3 (e.g. 150.000) -> thousands separator in VND
            if len(parts[1]) == 3:
                s = s.replace(".", "")
            else:
                pass
    elif "," in s:
        parts = s.split(",")
        if len(parts) > 2:
            # Multiple commas e.g. 1,500,000 -> thousands separator
            s = s.replace(",", "")
        elif len(parts) == 2:
            if len(parts[1]) == 3:
                s = s.replace(",", "")
            else:
                s = s.replace(",", ".")

    try:
        amt = float(s)
        return -amt if is_negative else amt
    except ValueError:
        return None


def clean_description(val: Any) -> str:
    """Clean transaction description by removing newlines, extra spaces, and redundant characters."""
    if val is None:
        return ""
    s = str(val).strip()
    # Replace newlines and tabs with a single space
    s = re.sub(r"[\r\n\t]+", " ", s)
    # Collapse multiple whitespaces
    s = re.sub(r"\s+", " ", s)
    # Strip leading/trailing quotes and punctuation
    s = s.strip("\"' ")
    return s


# Keyword dictionaries for column header detection (ordered from most specific to general)
DATE_KEYWORDS = [
    "ngày giao dịch", "ngay giao dich", "ngày gd", "ngay gd", "ngày hạch toán",
    "ngay hach toan", "ngày ht", "ngay ht", "transaction date", "trans date",
    "posting date", "value date", "ngày", "ngay", "date"
]

DESC_KEYWORDS = [
    "nội dung chi tiết", "noi dung chi tiet", "nội dung giao dịch", "noi dung giao dich",
    "nội dung thanh toán", "noi dung thanh toan", "thông tin giao dịch", "thong tin giao dich",
    "nội dung", "noi dung", "diễn giải", "dien giai", "chi tiết", "chi tiet",
    "description", "details", "remark", "memo", "lý do", "ly do"
]

DEBIT_KEYWORDS = [
    "số tiền ghi nợ", "so tien ghi no", "phát sinh nợ", "phat sinh no",
    "tiền ghi nợ", "tien ghi no", "ghi nợ", "ghi no", "tiền ra", "tien ra",
    "rút ra", "rut ra", "chi tiêu", "chi tieu", "debit", "nợ", "no"
]

CREDIT_KEYWORDS = [
    "số tiền ghi có", "so tien ghi co", "phát sinh có", "phat sinh co",
    "tiền ghi có", "tien ghi co", "ghi có", "ghi co", "tiền vào", "tien vao",
    "nạp vào", "nap vao", "thu nhập", "thu nhap", "credit", "có", "co"
]

AMOUNT_KEYWORDS = [
    "số tiền giao dịch", "so tien giao dich", "số tiền gd", "so tien gd",
    "số tiền", "so tien", "phát sinh", "phat sinh", "amount", "giá trị", "gia tri"
]

FOOTER_KEYWORDS = [
    "tổng cộng", "tong cong", "cộng phát sinh", "cong phat sinh",
    "tổng phát sinh", "tong phat sinh", "cộng chuyển", "cong chuyen",
    "tổng số giao dịch", "tong so giao dich", "số dư cuối", "so du cuoi",
    "closing balance", "người lập", "nguoi lap", "kế toán", "ke toan",
    "giám đốc", "giam doc", "chữ ký", "chu ky"
]


def _match_column(header_cell: str, keywords: List[str]) -> bool:
    norm = re.sub(r"[^\w\s]", " ", header_cell.lower()).strip()
    norm = re.sub(r"\s+", " ", norm)
    for kw in keywords:
        pattern = r"(?:\b|_)" + re.escape(kw) + r"(?:\b|_)"
        if re.search(pattern, norm):
            return True
    return False


def detect_header_and_extract_rows(table_rows: List[List[str]]) -> List[Dict[str, Any]]:
    """
    Identify table header row skipping bank metadata,
    extract valid transaction rows, normalize date & amount,
    clean description, and stop/skip footer summaries.
    """
    if not table_rows:
        return []

    header_idx = -1
    col_date = -1
    col_desc = -1
    col_debit = -1
    col_credit = -1
    col_amount = -1

    # Scan up to first 40 rows to find header row
    scan_limit = min(40, len(table_rows))
    for r_idx in range(scan_limit):
        row = table_rows[r_idx]
        if not any(cell.strip() for cell in row):
            continue

        d_idx, desc_idx, deb_idx, cred_idx, amt_idx = -1, -1, -1, -1, -1

        for c_idx, cell in enumerate(row):
            c_text = cell.strip()
            if not c_text:
                continue

            if d_idx == -1 and _match_column(c_text, DATE_KEYWORDS):
                d_idx = c_idx
            elif desc_idx == -1 and _match_column(c_text, DESC_KEYWORDS):
                desc_idx = c_idx
            elif deb_idx == -1 and _match_column(c_text, DEBIT_KEYWORDS):
                deb_idx = c_idx
            elif cred_idx == -1 and _match_column(c_text, CREDIT_KEYWORDS):
                cred_idx = c_idx
            elif amt_idx == -1 and _match_column(c_text, AMOUNT_KEYWORDS):
                amt_idx = c_idx

        # Check if this row is a valid header
        has_date = d_idx != -1
        has_desc = desc_idx != -1
        has_money = (deb_idx != -1 and cred_idx != -1) or (amt_idx != -1) or (deb_idx != -1)

        if has_date and has_desc and has_money:
            header_idx = r_idx
            col_date = d_idx
            col_desc = desc_idx
            col_debit = deb_idx
            col_credit = cred_idx
            col_amount = amt_idx
            break

    # Fallback for simple 3-column CSV without explicit header or where rows[0] is data
    if header_idx == -1:
        first_row = [c.strip() for c in table_rows[0]]
        first_header = [c.lower() for c in first_row]
        if "date" in first_header and "amount" in first_header:
            header_idx = 0
            col_date = first_header.index("date")
            col_amount = first_header.index("amount")
            col_desc = first_header.index("description") if "description" in first_header else 1
        elif len(first_row) >= 3 and normalize_date(first_row[0]) is not None:
            # Headerless CSV starting directly with data
            header_idx = -1
            col_date = 0
            col_desc = 1
            col_amount = 2
        else:
            # Default assumption
            header_idx = 0
            col_date = 0
            col_desc = 1
            col_amount = 2

    data_rows = table_rows[header_idx + 1 :] if header_idx >= 0 else table_rows

    parsed_transactions = []
    for row in data_rows:
        if not row or not any(c.strip() for c in row):
            continue

        # Check for footer indicator in row
        row_str = " ".join(c.lower() for c in row)
        if any(fk in row_str for fk in FOOTER_KEYWORDS):
            # End of statement data or summary footer line
            continue

        # Extract Date
        if col_date >= len(row):
            continue
        raw_date = row[col_date].strip()
        norm_date = normalize_date(raw_date)
        if not norm_date:
            # Not a valid transaction line
            continue

        # Extract Description
        raw_desc = row[col_desc] if col_desc < len(row) else ""
        cleaned_desc = clean_description(raw_desc)
        if not cleaned_desc:
            cleaned_desc = "Giao dịch không tên"

        # Extract Amount
        amount = None
        if col_debit != -1 and col_credit != -1:
            raw_deb = row[col_debit] if col_debit < len(row) else ""
            raw_cred = row[col_credit] if col_credit < len(row) else ""
            val_deb = parse_vietnamese_amount(raw_deb)
            val_cred = parse_vietnamese_amount(raw_cred)

            if val_deb and abs(val_deb) > 0:
                amount = -abs(val_deb)
            elif val_cred and abs(val_cred) > 0:
                amount = abs(val_cred)
            elif val_deb is not None and val_deb != 0:
                amount = -abs(val_deb)
            elif val_cred is not None:
                amount = abs(val_cred)
        elif col_amount != -1 and col_amount < len(row):
            raw_amt = row[col_amount]
            amount = parse_vietnamese_amount(raw_amt)
        elif col_debit != -1 and col_debit < len(row):
            raw_deb = row[col_debit]
            val_deb = parse_vietnamese_amount(raw_deb)
            if val_deb:
                amount = -abs(val_deb)

        if amount is None:
            continue

        parsed_transactions.append({
            "date": norm_date,
            "description": cleaned_desc,
            "amount": amount
        })

    return parsed_transactions


def parse_csv_raw(data: bytes) -> List[List[str]]:
    """Parse CSV raw bytes into 2D list of strings with autodetection of delimiters."""
    text = decode_text(data)
    sample = text[:2048]
    delimiter = ","
    try:
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=",\t;|")
        delimiter = dialect.delimiter
    except Exception:
        c_count = sample.count(",")
        s_count = sample.count(";")
        t_count = sample.count("\t")
        if s_count > c_count and s_count > t_count:
            delimiter = ";"
        elif t_count > c_count and t_count > s_count:
            delimiter = "\t"

    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    matrix = []
    for row in reader:
        matrix.append([str(c).strip() if c is not None else "" for c in row])
    return matrix


def parse_excel_raw(data: bytes) -> List[List[str]]:
    """Parse Excel (.xlsx, .xls) raw bytes into 2D list of strings using openpyxl."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    sheet = wb.active
    matrix = []
    for row in sheet.iter_rows(values_only=True):
        row_vals = []
        for cell in row:
            if cell is None:
                row_vals.append("")
            elif isinstance(cell, (datetime, )):
                row_vals.append(cell.strftime("%Y-%m-%d %H:%M:%S"))
            elif hasattr(cell, "strftime"):
                row_vals.append(cell.strftime("%Y-%m-%d"))
            else:
                row_vals.append(str(cell).strip())
        matrix.append(row_vals)
    return matrix


def parse_statement(data: bytes, filename: str = "statement.csv") -> List[Dict[str, Any]]:
    """
    Main entry point for bank statement parsing and preprocessing.
    Accepts CSV, TXT, XLSX, XLS.
    Returns list of dicts: [{'date': 'YYYY-MM-DD', 'description': '...', 'amount': float}]
    """
    fn_lower = filename.lower()
    if fn_lower.endswith((".xlsx", ".xls")):
        matrix = parse_excel_raw(data)
    else:
        matrix = parse_csv_raw(data)

    return detect_header_and_extract_rows(matrix)
