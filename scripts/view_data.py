"""Script hiển thị nhanh dữ liệu các bảng trong PostgreSQL budgetbot."""
import os
import sys
from pathlib import Path

# Đảm bảo terminal Windows hỗ trợ UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Tự động chuyển tiếp sang .venv nếu interpreter hiện tại chưa cài psycopg2
try:
    import psycopg2
except ModuleNotFoundError:
    venv_python = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists() and Path(sys.executable).resolve() != venv_python.resolve():
        import subprocess
        result = subprocess.run([str(venv_python), str(Path(__file__).resolve())] + sys.argv[1:])
        sys.exit(result.returncode)
    else:
        print("[!] Thư viện psycopg2 chưa được cài đặt trong môi trường Python này.")
        print("[i] Bạn có thể chạy bằng môi trường ảo .venv:")
        print("    .venv\\Scripts\\python.exe scripts/view_data.py")
        print("    hoặc cài đặt: pip install psycopg2-binary")
        sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

POSTGRES_URL = os.getenv("USERSTORE_POSTGRES_URL", "postgresql://postgres:postgres@localhost:5432/budgetbot")


def print_table(title, headers, rows):
    print(f"\n{'=' * 20} {title} ({len(rows)} bản ghi) {'=' * 20}")
    if not rows:
        print("  (Chưa có dữ liệu)")
        return
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            str_val = str(val if val is not None else "")
            if len(str_val) > 40:
                str_val = str_val[:37] + "..."
            col_widths[i] = max(col_widths[i], len(str_val))

    header_str = " | ".join(f"{h:<{col_widths[i]}}" for i, h in enumerate(headers))
    separator = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    print(header_str)
    print(separator)

    for row in rows:
        row_str = " | ".join(
            f"{str(val if val is not None else ''):<{col_widths[i]}}"
            for i, val in enumerate(row)
        )
        print(row_str)


def view_data():
    try:
        conn = psycopg2.connect(POSTGRES_URL)
    except Exception as e:
        print(f"[!] Không thể kết nối tới PostgreSQL: {e}")
        print("[i] Vui lòng đảm bảo Docker Desktop và container đang chạy: docker compose up -d")
        sys.exit(1)

    with conn.cursor() as cur:
        # 1. Bảng users
        cur.execute("SELECT id, username, full_name, substring(password_hash from 1 for 15) || '...' as password_hash, created_at FROM users;")
        print_table("BẢNG USERS", ["ID", "Username", "Full Name", "Password Hash (bcrypt)", "Created At"], cur.fetchall())

        # 2. Bảng budget_caps
        cur.execute("SELECT id, user_id, category, amount, month, created_at FROM budget_caps ORDER BY id ASC;")
        print_table("BẢNG BUDGET_CAPS", ["ID", "User ID", "Category", "Amount (VND)", "Month", "Created At"], cur.fetchall())

        # 3. Bảng transactions
        cur.execute("SELECT id, user_id, txn_date, description, amount, category, confidence, engine FROM transactions ORDER BY txn_date DESC LIMIT 10;")
        print_table("BẢNG TRANSACTIONS (10 giao dịch gần nhất)", ["ID", "User ID", "Date", "Description", "Amount (VND)", "Category", "Confidence", "Engine"], cur.fetchall())

    conn.close()


if __name__ == "__main__":
    view_data()
