"""Tests for database schema, bcrypt password hashing, and user/caps functionality."""
import re
from pathlib import Path
import pytest
from src.adapters.userstore_dynamo_user import _hash_password, _check_password

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_bcrypt_password_hashing():
    raw = "MySecurePassword123!"
    hashed = _hash_password(raw)

    # Bcrypt format: $2b$12$... with length 60
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert len(hashed) == 60
    assert _check_password(raw, hashed) is True
    assert _check_password("WrongPassword", hashed) is False


def test_sql_migration_file_exists_and_contains_required_tables_and_indexes():
    migration_file = PROJECT_ROOT / "database" / "migrations" / "001_init_schema.sql"
    assert migration_file.exists(), "001_init_schema.sql must exist"

    sql = migration_file.read_text(encoding="utf-8")

    # Verify table users
    assert "CREATE TABLE IF NOT EXISTS users" in sql
    assert "password_hash VARCHAR(255)" in sql or "password_hash TEXT" in sql
    assert "username VARCHAR(100) UNIQUE NOT NULL" in sql

    # Verify table transactions
    assert "CREATE TABLE IF NOT EXISTS transactions" in sql
    assert "idx_transactions_user_date" in sql
    assert "idx_transactions_user_category" in sql

    # Verify table budget_caps
    assert "CREATE TABLE IF NOT EXISTS budget_caps" in sql
    assert "uq_budget_caps_user_category UNIQUE (user_id, category)" in sql
    assert "idx_budget_caps_user" in sql

