"""Budget caps store adapter — PostgreSQL for production, SQLite/DynamoDB for fallback."""
import json
import sqlite3
from pathlib import Path

from src.config import config


def _use_postgres() -> bool:
    return config.userstore_backend == "postgres"


def _use_dynamodb() -> bool:
    return config.userstore_backend == "dynamodb"


def _get_postgres_conn():
    import psycopg2
    if not config.userstore_postgres_url:
        raise ValueError("USERSTORE_POSTGRES_URL must be set for Postgres backend")
    conn = psycopg2.connect(config.userstore_postgres_url)
    conn.autocommit = True
    return conn


def _get_sqlite_conn():
    db_path = config.userstore_sqlite_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS budget_caps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category)
        )
        """
    )
    conn.commit()
    return conn


def get_caps(user_id: str) -> dict:
    """Get active budget caps for a user."""
    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT category, amount FROM budget_caps WHERE user_id = %s;", (user_id,))
                rows = cur.fetchall()
            return {r[0]: float(r[1]) for r in rows}
        finally:
            conn.close()

    # SQLite
    conn = _get_sqlite_conn()
    cur = conn.execute("SELECT category, amount FROM budget_caps WHERE user_id = ?", (user_id,))
    return {r[0]: float(r[1]) for r in cur.fetchall()}


def set_cap(user_id: str, category: str, amount: float) -> dict:
    """Set or update a budget cap for a category."""
    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO budget_caps (user_id, category, amount, updated_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (user_id, category)
                    DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW();
                    """,
                    (user_id, category, float(amount)),
                )
            return get_caps(user_id)
        finally:
            conn.close()

    conn = _get_sqlite_conn()
    conn.execute(
        """
        INSERT INTO budget_caps (user_id, category, amount, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, category)
        DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP;
        """,
        (user_id, category, float(amount)),
    )
    conn.commit()
    return get_caps(user_id)


def delete_cap(user_id: str, category: str) -> dict:
    """Delete a budget cap for a category."""
    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM budget_caps WHERE user_id = %s AND category = %s;", (user_id, category))
            return get_caps(user_id)
        finally:
            conn.close()

    conn = _get_sqlite_conn()
    conn.execute("DELETE FROM budget_caps WHERE user_id = ? AND category = ?", (user_id, category))
    conn.commit()
    return get_caps(user_id)

