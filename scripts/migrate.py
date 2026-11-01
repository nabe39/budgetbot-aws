"""Database migration runner for BudgetBot PostgreSQL."""
import os
import sys
from pathlib import Path

# Add project root to path
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
        print("[i] Bạn có thể chạy bằng môi trường ảo .venv: .venv\\Scripts\\python.exe scripts/migrate.py")
        sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

POSTGRES_URL = os.getenv("USERSTORE_POSTGRES_URL", "postgresql://postgres:postgres@localhost:5432/budgetbot")
MIGRATIONS_DIR = PROJECT_ROOT / "database" / "migrations"


def get_connection():
    return psycopg2.connect(POSTGRES_URL)


def init_migrations_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
    conn.commit()


def get_applied_migrations(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations ORDER BY version ASC;")
        return {row[0] for row in cur.fetchall()}


def run_migrations():
    print(f"[*] Ket noi toi PostgreSQL: {POSTGRES_URL}")
    try:
        conn = get_connection()
    except Exception as e:
        print(f"[!] Khong the ket noi toi PostgreSQL: {e}")
        print("[i] Vui long dam bao container Docker dang chay: docker compose up -d")
        sys.exit(1)

    init_migrations_table(conn)
    applied = get_applied_migrations(conn)

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print("[-] Khong tim thay file migration nao trong database/migrations/")
        return

    print(f"[*] Tim thay {len(sql_files)} file migration.")
    new_applied = 0
    for sql_file in sql_files:
        version = sql_file.name
        if version in applied:
            print(f"  [v] Da ap dung truoc do: {version}")
            continue

        print(f"  [>] Dang thuc thi migration: {version} ...")
        content = sql_file.read_text(encoding="utf-8")
        try:
            with conn.cursor() as cur:
                cur.execute(content)
                cur.execute("INSERT INTO schema_migrations (version) VALUES (%s);", (version,))
            conn.commit()
            print(f"  [+] Thanh cong: {version}")
            new_applied += 1
        except Exception as e:
            conn.rollback()
            print(f"  [!] That bai tai {version}: {e}")
            sys.exit(1)

    print(f"\n[OK] Hoan tat migration. So migration moi ap dung: {new_applied}.")
    conn.close()


if __name__ == "__main__":
    run_migrations()
