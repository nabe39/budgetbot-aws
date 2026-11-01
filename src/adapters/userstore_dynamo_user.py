"""User store adapter for auth users & caps — DynamoDB in AWS, Postgres or SQLite for local dev."""
import json
import uuid
import bcrypt
from src.config import config


def _use_dynamodb() -> bool:
    return config.userstore_backend == "dynamodb"


def _use_postgres() -> bool:
    return config.userstore_backend == "postgres"


def _get_table():
    """Return the DynamoDB Table resource for the users table."""
    import boto3
    if not config.users_table:
        raise ValueError("USERS_TABLE env var not set")
    return boto3.resource("dynamodb", region_name=config.aws_region).Table(config.users_table)


def _get_postgres_conn():
    """Return a psycopg2 connection for users and budget_caps."""
    import psycopg2
    if not config.userstore_postgres_url:
        raise ValueError("USERSTORE_POSTGRES_URL must be set for Postgres backend")
    conn = psycopg2.connect(config.userstore_postgres_url)
    conn.autocommit = True
    return conn


def _get_sqlite_conn():
    import sqlite3
    from pathlib import Path

    db_path = config.userstore_sqlite_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            PK TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            caps TEXT DEFAULT '{}'
        )
        """
    )
    conn.commit()
    return conn


def _hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def get_user_by_username(username: str) -> dict | None:
    """Look up a user by username. Returns the item dict or None."""
    if _use_dynamodb():
        from boto3.dynamodb.conditions import Key
        table = _get_table()
        resp = table.query(
            IndexName="username-index",
            KeyConditionExpression=Key("username").eq(username),
        )
        items = resp.get("Items", [])
        return items[0] if items else None

    if _use_postgres():
        conn = _get_postgres_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, full_name, password_hash FROM users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "PK": row[0],
            "id": row[0],
            "username": row[1],
            "full_name": row[2],
            "password_hash": row[3],
        }

    conn = _get_sqlite_conn()
    cur = conn.execute(
        "SELECT PK, username, full_name, password_hash, caps FROM users WHERE username = ?",
        (username,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "PK": row[0],
        "id": row[0],
        "username": row[1],
        "full_name": row[2],
        "password_hash": row[3],
        "caps": row[4],
    }


def get_user_by_id(user_id: str) -> dict | None:
    """Look up a user by PK (user_id). Returns the item dict or None."""
    if _use_dynamodb():
        table = _get_table()
        resp = table.get_item(Key={"PK": user_id})
        return resp.get("Item")

    if _use_postgres():
        conn = _get_postgres_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, full_name, password_hash FROM users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "PK": row[0],
            "id": row[0],
            "username": row[1],
            "full_name": row[2],
            "password_hash": row[3],
        }

    conn = _get_sqlite_conn()
    cur = conn.execute(
        "SELECT PK, username, full_name, password_hash, caps FROM users WHERE PK = ?",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "PK": row[0],
        "id": row[0],
        "username": row[1],
        "full_name": row[2],
        "password_hash": row[3],
        "caps": row[4],
    }


def create_user(full_name: str, username: str, password: str) -> dict:
    """Register a new user. Raises ValueError if username is taken."""
    if get_user_by_username(username):
        raise ValueError("Username already taken")
    user_id = str(uuid.uuid4())
    pw_hash = _hash_password(password)

    if _use_dynamodb():
        table = _get_table()
        item = {
            "PK": user_id,
            "username": username,
            "full_name": full_name,
            "password_hash": pw_hash,
        }
        table.put_item(Item=item)
    elif _use_postgres():
        conn = _get_postgres_conn()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, username, full_name, password_hash) VALUES (%s, %s, %s, %s)",
                (user_id, username, full_name, pw_hash),
            )
        conn.close()
    else:
        conn = _get_sqlite_conn()
        conn.execute(
            "INSERT INTO users (PK, username, full_name, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, username, full_name, pw_hash),
        )
        conn.commit()

    return {"user_id": user_id, "username": username, "full_name": full_name}


def verify_password(username: str, password: str) -> dict | None:
    """Authenticate user by username + password. Returns the user dict or None."""
    user = get_user_by_username(username)
    if not user:
        return None
    if _check_password(password, user.get("password_hash", "")):
        return user
    return None


def get_caps(user_id: str) -> dict:
    """Get the active budget caps for the user."""
    if _use_postgres():
        conn = _get_postgres_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT category, amount FROM budget_caps WHERE user_id = %s", (user_id,))
            rows = cur.fetchall()
        conn.close()
        return {r[0]: float(r[1]) for r in rows}

    user = get_user_by_id(user_id)
    if not user:
        return {}
    caps = user.get("caps", {})
    if isinstance(caps, str):
        try:
            caps = json.loads(caps)
        except Exception:
            caps = {}
    return {k: float(v) for k, v in caps.items()}


def set_cap(user_id: str, category: str, amount: float) -> dict:
    """Set or update a budget cap for a specific category."""
    if _use_postgres():
        conn = _get_postgres_conn()
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
        conn.close()
        return get_caps(user_id)

    user = get_user_by_id(user_id)
    if user is None:
        raise ValueError("User not found")
        
    caps = user.get("caps", {})
    if isinstance(caps, str):
        try:
            caps = json.loads(caps)
        except Exception:
            caps = {}

    if _use_dynamodb():
        table = _get_table()
        from decimal import Decimal
        caps[category] = Decimal(str(amount))
        resp = table.update_item(
            Key={"PK": user_id},
            UpdateExpression="SET caps = :c",
            ExpressionAttributeValues={":c": caps},
            ReturnValues="ALL_NEW"
        )
        new_caps = resp.get("Attributes", {}).get("caps", {})
        return {k: float(v) for k, v in new_caps.items()}
    else:
        caps[category] = float(amount)
        conn = _get_sqlite_conn()
        conn.execute("UPDATE users SET caps = ? WHERE PK = ?", (json.dumps(caps), user_id))
        conn.commit()
        return caps


def delete_cap(user_id: str, category: str) -> dict:
    """Delete a budget cap for a specific category."""
    if _use_postgres():
        conn = _get_postgres_conn()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM budget_caps WHERE user_id = %s AND category = %s", (user_id, category))
        conn.close()
        return get_caps(user_id)

    user = get_user_by_id(user_id)
    if user is None:
        raise ValueError("User not found")
        
    caps = user.get("caps", {})
    if isinstance(caps, str):
        try:
            caps = json.loads(caps)
        except Exception:
            caps = {}
    if category in caps:
        del caps[category]
        
    if _use_dynamodb():
        table = _get_table()
        from decimal import Decimal
        dynamo_caps = {k: Decimal(str(v)) for k, v in caps.items()}
        resp = table.update_item(
            Key={"PK": user_id},
            UpdateExpression="SET caps = :c",
            ExpressionAttributeValues={":c": dynamo_caps},
            ReturnValues="ALL_NEW"
        )
        new_caps = resp.get("Attributes", {}).get("caps", {})
        return {k: float(v) for k, v in new_caps.items()}
    else:
        conn = _get_sqlite_conn()
        conn.execute("UPDATE users SET caps = ? WHERE PK = ?", (json.dumps(caps), user_id))
        conn.commit()
        return {k: float(v) for k, v in caps.items()}
