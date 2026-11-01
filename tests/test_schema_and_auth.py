"""Tests for database schema, bcrypt password hashing, and user/caps functionality."""
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from src.auth import hash_password, verify_password, decode_token
from src.app import app

PROJECT_ROOT = Path(__file__).resolve().parent.parent
client = TestClient(app)


def test_bcrypt_password_hashing():
    raw = "MySecurePassword123!"
    hashed = hash_password(raw)

    # Bcrypt format: $2b$12$... with length 60
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert len(hashed) == 60
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


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


def test_register_and_login_jwt_flow():
    # 1. Register a new user
    reg_resp = client.post(
        "/register",
        json={
            "full_name": "Nguyen Van A",
            "username": "nguyenvana",
            "password": "securepassword123",
        },
    )
    assert reg_resp.status_code == 200, reg_resp.text
    reg_data = reg_resp.json()
    assert reg_data["username"] == "nguyenvana"
    assert "user_id" in reg_data
    user_id = reg_data["user_id"]

    # 2. Duplicate username registration should return 409
    dup_resp = client.post(
        "/register",
        json={
            "full_name": "Nguyen Van A Duplicate",
            "username": "nguyenvana",
            "password": "anotherpassword",
        },
    )
    assert dup_resp.status_code == 409

    # 3. Login with wrong password should fail with 401
    fail_login = client.post(
        "/login",
        json={
            "username": "nguyenvana",
            "password": "wrongpassword",
        },
    )
    assert fail_login.status_code == 401

    # 4. Login with correct password returns standard JWT token
    login_resp = client.post(
        "/login",
        json={
            "username": "nguyenvana",
            "password": "securepassword123",
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["token_type"] == "bearer"
    assert login_data["username"] == "nguyenvana"
    assert login_data["user_id"] == user_id
    assert "access_token" in login_data
    assert login_data["expires_in"] > 0

    token = login_data["access_token"]

    # 5. Validate JWT token claims
    claims = decode_token(token)
    assert claims["sub"] == user_id
    assert claims["username"] == "nguyenvana"
    assert "exp" in claims
    assert "iat" in claims

    # 6. Access protected /profile using Bearer token
    profile_resp = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()
    assert profile_data["user_id"] == user_id
    assert profile_data["username"] == "nguyenvana"
    assert profile_data["full_name"] == "Nguyen Van A"

    # 7. Set and get budget caps using Bearer token
    cap_set_resp = client.post(
        "/caps",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": "Food", "amount": 2500000.0},
    )
    assert cap_set_resp.status_code == 200
    assert cap_set_resp.json()["caps"]["Food"] == 2500000.0

    cap_get_resp = client.get(
        "/caps",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cap_get_resp.status_code == 200
    assert cap_get_resp.json()["caps"]["Food"] == 2500000.0
