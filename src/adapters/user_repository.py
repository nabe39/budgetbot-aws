"""User repository for authentication and account management.
Supports PostgreSQL (Local/Production), SQLite (Testing), and DynamoDB (Legacy AWS).
"""
import sqlite3
from pathlib import Path
from typing import Optional

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
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    return conn


def _get_dynamo_table():
    import boto3
    if not config.users_table:
        raise ValueError("USERS_TABLE env var not set")
    return boto3.resource("dynamodb", region_name=config.aws_region).Table(config.users_table)


def get_user_by_username(username: str) -> Optional[dict]:
    """Find user record by username."""
    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, username, full_name, password_hash, created_at FROM users WHERE username = %s;",
                    (username,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return {
                    "id": row[0],
                    "user_id": row[0],
                    "PK": row[0],
                    "username": row[1],
                    "full_name": row[2],
                    "password_hash": row[3],
                    "created_at": str(row[4]),
                }
        finally:
            conn.close()

    if _use_dynamodb():
        from boto3.dynamodb.conditions import Key
        table = _get_dynamo_table()
        resp = table.query(
            IndexName="username-index",
            KeyConditionExpression=Key("username").eq(username),
        )
        items = resp.get("Items", [])
        if not items:
            return None
        item = items[0]
        item["id"] = item.get("PK")
        item["user_id"] = item.get("PK")
        return item

    # SQLite fallback
    conn = _get_sqlite_conn()
    cur = conn.execute(
        "SELECT id, username, full_name, password_hash, created_at FROM users WHERE username = ?",
        (username,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[0],
        "PK": row[0],
        "username": row[1],
        "full_name": row[2],
        "password_hash": row[3],
        "created_at": str(row[4]),
    }


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Find user record by primary key id."""
    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, username, full_name, password_hash, created_at FROM users WHERE id = %s;",
                    (user_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return {
                    "id": row[0],
                    "user_id": row[0],
                    "PK": row[0],
                    "username": row[1],
                    "full_name": row[2],
                    "password_hash": row[3],
                    "created_at": str(row[4]),
                }
        finally:
            conn.close()

    if _use_dynamodb():
        table = _get_dynamo_table()
        resp = table.get_item(Key={"PK": user_id})
        item = resp.get("Item")
        if item:
            item["id"] = item.get("PK")
            item["user_id"] = item.get("PK")
        return item

    # SQLite fallback
    conn = _get_sqlite_conn()
    cur = conn.execute(
        "SELECT id, username, full_name, password_hash, created_at FROM users WHERE id = ?",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[0],
        "PK": row[0],
        "username": row[1],
        "full_name": row[2],
        "password_hash": row[3],
        "created_at": str(row[4]),
    }


def create_user(user_id: str, username: str, full_name: str, password_hash: str) -> dict:
    """Insert a new user record. Raises ValueError if username already exists."""
    if get_user_by_username(username):
        raise ValueError("Username already taken")

    if _use_postgres():
        conn = _get_postgres_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (id, username, full_name, password_hash) VALUES (%s, %s, %s, %s);",
                    (user_id, username, full_name, password_hash),
                )
        finally:
            conn.close()
    elif _use_dynamodb():
        table = _get_dynamo_table()
        table.put_item(
            Item={
                "PK": user_id,
                "username": username,
                "full_name": full_name,
                "password_hash": password_hash,
            }
        )
    else:
        conn = _get_sqlite_conn()
        conn.execute(
            "INSERT INTO users (id, username, full_name, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, username, full_name, password_hash),
        )
        conn.commit()

    return {"user_id": user_id, "username": username, "full_name": full_name}

