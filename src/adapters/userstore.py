"""Transaction store adapters.

Interface:
    add_transaction(user_id, txn) -> None       # txn = {date, description, amount, category, confidence}
    list_transactions(user_id, month=None) -> list[dict]
    summary(user_id, month=None) -> {category: {"total": float, "count": int}}
"""
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DynamoDBUserStore:
    """PK=user_id, SK=TXN#<date>#<id>. Aggregations require Scan or GSI — accept the trade-off."""

    def __init__(self, table_name: str, region: str):
        import boto3
        if not table_name:
            raise ValueError("USERSTORE_TABLE must be set for DynamoDB backend")
        self.table = boto3.resource("dynamodb", region_name=region).Table(table_name)

    def add_transaction(self, user_id: str, txn: dict) -> None:
        import uuid
        from decimal import Decimal
        sk = f"TXN#{txn['date']}#{uuid.uuid4().hex[:8]}"
        # DynamoDB doesn't accept floats; use Decimal
        item = {**txn, "amount": Decimal(str(txn["amount"]))} if "amount" in txn else txn
        self.table.put_item(Item={"PK": user_id, "SK": sk, "created_at": _now(), **item})

    def count_transactions(self, user_id: str, month: str | None = None, category: str | None = None) -> int:
        return len(self.list_transactions(user_id, month=month, category=category))

    def get_transaction(self, user_id: str, transaction_id: str) -> dict | None:
        resp = self.table.get_item(Key={"PK": user_id, "SK": transaction_id})
        item = resp.get("Item")
        if not item:
            return None
        d = _decimal_to_float(item)
        d["id"] = d.get("SK")
        return d

    def list_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list:
        kwargs = {
            "KeyConditionExpression": "PK = :u AND begins_with(SK, :p)",
            "ExpressionAttributeValues": {":u": user_id, ":p": f"TXN#{month}" if month else "TXN#"},
        }
        resp = self.table.query(**kwargs)
        items = []
        for item in resp.get("Items", []):
            d = _decimal_to_float(item)
            d["id"] = d.get("SK")
            if category and str(d.get("category", "")).lower() != category.lower():
                continue
            items.append(d)
        if offset is not None:
            items = items[offset:]
        if limit is not None:
            items = items[:limit]
        return items

    def summary(self, user_id: str, month: str | None = None) -> dict:
        return _aggregate(self.list_transactions(user_id, month))

    def update_transaction(self, user_id: str, transaction_id: str, updates: dict) -> dict:
        """Update fields of an existing transaction. transaction_id is the SK value."""
        from decimal import Decimal
        expr_parts = []
        attr_names = {}
        attr_values = {}
        for i, (key, val) in enumerate(updates.items()):
            placeholder = f"#k{i}"
            value_ph = f":v{i}"
            expr_parts.append(f"{placeholder} = {value_ph}")
            attr_names[placeholder] = key
            attr_values[value_ph] = Decimal(str(val)) if isinstance(val, float) else val
        update_expr = "SET " + ", ".join(expr_parts)
        resp = self.table.update_item(
            Key={"PK": user_id, "SK": transaction_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
            ReturnValues="ALL_NEW",
        )
        return _decimal_to_float(resp.get("Attributes", {}))

    def delete_transaction(self, user_id: str, transaction_id: str) -> bool:
        """Delete a transaction by its SK."""
        resp = self.table.delete_item(Key={"PK": user_id, "SK": transaction_id}, ReturnValues="ALL_OLD")
        return bool(resp.get("Attributes"))


def _decimal_to_float(item: dict) -> dict:
    from decimal import Decimal
    return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in item.items()}


class PostgresUserStore:
    def __init__(self, url: str):
        try:
            import psycopg2
        except ImportError:
            raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")
        if not url:
            raise ValueError("USERSTORE_POSTGRES_URL must be set for Postgres backend")
        self.url = url
        self.conn = psycopg2.connect(url)
        self.conn.autocommit = True
        self._init_schema()

    def _get_conn(self):
        try:
            if self.conn is None or self.conn.closed != 0:
                import psycopg2
                self.conn = psycopg2.connect(self.url)
                self.conn.autocommit = True
        except Exception:
            import psycopg2
            self.conn = psycopg2.connect(self.url)
            self.conn.autocommit = True
        return self.conn

    def _init_schema(self):
        with self._get_conn().cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

                CREATE TABLE IF NOT EXISTS transactions (
                    id BIGSERIAL PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    txn_date DATE NOT NULL,
                    description TEXT NOT NULL,
                    amount NUMERIC(14,2) NOT NULL,
                    category VARCHAR(50) NOT NULL DEFAULT 'Other',
                    confidence VARCHAR(20) DEFAULT 'high',
                    engine VARCHAR(50) DEFAULT 'nlp_linear_svc',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date);
                CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);

                CREATE TABLE IF NOT EXISTS budget_caps (
                    id BIGSERIAL PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
                    month VARCHAR(7),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT uq_budget_caps_user_category UNIQUE (user_id, category)
                );
                CREATE INDEX IF NOT EXISTS idx_budget_caps_user ON budget_caps(user_id);
            """)

    def add_transaction(self, user_id: str, txn: dict) -> dict:
        date_val = txn.get("date") or txn.get("txn_date")
        if not date_val:
            date_val = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        description = txn.get("description", "")
        amount = float(txn.get("amount", 0.0))
        category = txn.get("category") or "Other"
        confidence = txn.get("confidence") or "high"
        engine = txn.get("engine") or "nlp_linear_svc"

        sql = """
            INSERT INTO transactions (user_id, txn_date, description, amount, category, confidence, engine)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, txn_date, description, amount, category, confidence, engine, created_at, updated_at
        """
        with self._get_conn().cursor() as cur:
            cur.execute(sql, (user_id, date_val, description, amount, category, confidence, engine))
            r = cur.fetchone()
            item = {
                "id": r[0],
                "date": str(r[1]),
                "description": r[2],
                "amount": float(r[3]),
                "category": r[4],
                "confidence": r[5],
                "engine": r[6],
                "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                "updated_at": r[8].isoformat() if hasattr(r[8], "isoformat") else str(r[8]),
            }
            txn["id"] = item["id"]
            return item

    def get_transaction(self, user_id: str, transaction_id: str | int) -> dict | None:
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return None
        sql = """
            SELECT id, txn_date, description, amount, category, confidence, engine, created_at, updated_at
            FROM transactions
            WHERE user_id = %s AND id = %s
        """
        with self._get_conn().cursor() as cur:
            cur.execute(sql, (user_id, tid))
            r = cur.fetchone()
            if not r:
                return None
            return {
                "id": r[0],
                "date": str(r[1]),
                "description": r[2],
                "amount": float(r[3]),
                "category": r[4],
                "confidence": r[5],
                "engine": r[6],
                "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                "updated_at": r[8].isoformat() if hasattr(r[8], "isoformat") else str(r[8]),
            }

    def count_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
    ) -> int:
        sql = "SELECT COUNT(*) FROM transactions WHERE user_id = %s"
        params: list = [user_id]
        if month:
            sql += " AND to_char(txn_date, 'YYYY-MM') = %s"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(%s)"
            params.append(category)
        with self._get_conn().cursor() as cur:
            cur.execute(sql, params)
            r = cur.fetchone()
            return int(r[0]) if r else 0

    def list_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict]:
        sql = """
            SELECT id, txn_date, description, amount, category, confidence, engine, created_at, updated_at
            FROM transactions
            WHERE user_id = %s
        """
        params: list = [user_id]
        if month:
            sql += " AND to_char(txn_date, 'YYYY-MM') = %s"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(%s)"
            params.append(category)
        sql += " ORDER BY txn_date DESC, id DESC"
        if limit is not None:
            sql += " LIMIT %s"
            params.append(limit)
        if offset is not None:
            sql += " OFFSET %s"
            params.append(offset)

        with self._get_conn().cursor() as cur:
            cur.execute(sql, params)
            return [
                {
                    "id": r[0],
                    "date": str(r[1]),
                    "description": r[2],
                    "amount": float(r[3]),
                    "category": r[4],
                    "confidence": r[5],
                    "engine": r[6],
                    "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                    "updated_at": r[8].isoformat() if hasattr(r[8], "isoformat") else str(r[8]),
                }
                for r in cur.fetchall()
            ]

    def summary(self, user_id: str, month: str | None = None) -> dict:
        sql = "SELECT category, SUM(amount), COUNT(*) FROM transactions WHERE user_id = %s"
        params: list = [user_id]
        if month:
            sql += " AND to_char(txn_date, 'YYYY-MM') = %s"
            params.append(month)
        sql += " GROUP BY category"
        with self._get_conn().cursor() as cur:
            cur.execute(sql, params)
            return {r[0]: {"total": float(r[1]), "count": int(r[2])} for r in cur.fetchall()}

    def update_transaction(self, user_id: str, transaction_id: str | int, updates: dict) -> dict:
        if not updates:
            return {}
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return {}

        field_map = {
            "date": "txn_date",
            "txn_date": "txn_date",
            "description": "description",
            "amount": "amount",
            "category": "category",
            "confidence": "confidence",
            "engine": "engine",
        }

        expr_parts = []
        params = []
        for key, val in updates.items():
            if key in field_map:
                col = field_map[key]
                expr_parts.append(f"{col} = %s")
                if key in ("amount",) and val is not None:
                    params.append(float(val))
                else:
                    params.append(val)

        if not expr_parts:
            return {}

        params.extend([user_id, tid])
        sql = f"""
            UPDATE transactions
            SET {', '.join(expr_parts)}, updated_at = NOW()
            WHERE user_id = %s AND id = %s
            RETURNING id, txn_date, description, amount, category, confidence, engine, created_at, updated_at
        """
        with self._get_conn().cursor() as cur:
            cur.execute(sql, params)
            r = cur.fetchone()
            if r:
                return {
                    "id": r[0],
                    "date": str(r[1]),
                    "description": r[2],
                    "amount": float(r[3]),
                    "category": r[4],
                    "confidence": r[5],
                    "engine": r[6],
                    "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                    "updated_at": r[8].isoformat() if hasattr(r[8], "isoformat") else str(r[8]),
                }
        return {}

    def delete_transaction(self, user_id: str, transaction_id: str | int) -> bool:
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return False
        with self._get_conn().cursor() as cur:
            cur.execute("DELETE FROM transactions WHERE user_id = %s AND id = %s", (user_id, tid))
            return cur.rowcount > 0


class SQLiteUserStore:
    def __init__(self, db_path: str):
        import sqlite3
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                txn_date TEXT NOT NULL,
                description TEXT,
                amount REAL,
                category TEXT,
                confidence TEXT,
                engine TEXT DEFAULT 'nlp_linear_svc',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS txn_user_date_idx ON transactions(user_id, txn_date);
            CREATE INDEX IF NOT EXISTS txn_user_cat_idx ON transactions(user_id, category);
        """)
        self.conn.commit()

    def add_transaction(self, user_id: str, txn: dict) -> dict:
        date_val = txn.get("date") or txn.get("txn_date")
        if not date_val:
            date_val = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        description = txn.get("description", "")
        amount = float(txn.get("amount", 0.0))
        category = txn.get("category") or "Other"
        confidence = txn.get("confidence") or "high"
        engine = txn.get("engine") or "nlp_linear_svc"

        cur = self.conn.execute(
            "INSERT INTO transactions (user_id, txn_date, description, amount, category, confidence, engine) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, date_val, description, amount, category, confidence, engine),
        )
        self.conn.commit()
        inserted_id = cur.lastrowid
        txn["id"] = inserted_id
        return {
            "id": inserted_id,
            "date": date_val,
            "description": description,
            "amount": amount,
            "category": category,
            "confidence": confidence,
            "engine": engine,
        }

    def get_transaction(self, user_id: str, transaction_id: str | int) -> dict | None:
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return None
        cur = self.conn.execute(
            "SELECT id, txn_date, description, amount, category, confidence, engine, created_at, updated_at "
            "FROM transactions WHERE user_id = ? AND id = ?",
            (user_id, tid),
        )
        r = cur.fetchone()
        if not r:
            return None
        return {
            "id": r[0],
            "date": str(r[1]),
            "description": r[2],
            "amount": float(r[3]),
            "category": r[4],
            "confidence": r[5],
            "engine": r[6],
            "created_at": str(r[7]),
            "updated_at": str(r[8]),
        }

    def count_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
    ) -> int:
        sql = "SELECT COUNT(*) FROM transactions WHERE user_id = ?"
        params: list = [user_id]
        if month:
            sql += " AND substr(txn_date, 1, 7) = ?"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(?)"
            params.append(category)
        cur = self.conn.execute(sql, params)
        r = cur.fetchone()
        return int(r[0]) if r else 0

    def list_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict]:
        sql = (
            "SELECT id, txn_date, description, amount, category, confidence, engine, created_at, updated_at "
            "FROM transactions WHERE user_id = ?"
        )
        params: list = [user_id]
        if month:
            sql += " AND substr(txn_date, 1, 7) = ?"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(?)"
            params.append(category)
        sql += " ORDER BY txn_date DESC, id DESC"
        if limit is not None:
            sql += " LIMIT ?"
            params.append(limit)
        if offset is not None:
            sql += " OFFSET ?"
            params.append(offset)
        cur = self.conn.execute(sql, params)
        return [
            {
                "id": r[0],
                "date": str(r[1]),
                "description": r[2],
                "amount": float(r[3]),
                "category": r[4],
                "confidence": r[5],
                "engine": r[6],
                "created_at": str(r[7]),
                "updated_at": str(r[8]),
            }
            for r in cur.fetchall()
        ]

    def summary(self, user_id: str, month: str | None = None) -> dict:
        return _aggregate(self.list_transactions(user_id, month))

    def update_transaction(self, user_id: str, transaction_id: str | int, updates: dict) -> dict:
        if not updates:
            return {}
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return {}
        field_map = {
            "date": "txn_date",
            "txn_date": "txn_date",
            "description": "description",
            "amount": "amount",
            "category": "category",
            "confidence": "confidence",
            "engine": "engine",
        }
        expr_parts = []
        params = []
        for key, val in updates.items():
            if key in field_map:
                expr_parts.append(f"{field_map[key]} = ?")
                if key in ("amount",) and val is not None:
                    params.append(float(val))
                else:
                    params.append(val)
        if not expr_parts:
            return {}
        expr_parts.append("updated_at = CURRENT_TIMESTAMP")
        sql = f"UPDATE transactions SET {', '.join(expr_parts)} WHERE user_id = ? AND id = ?"
        params.extend([user_id, tid])
        cur = self.conn.execute(sql, params)
        self.conn.commit()
        if cur.rowcount == 0:
            return {}
        return self.get_transaction(user_id, tid) or {}

    def delete_transaction(self, user_id: str, transaction_id: str | int) -> bool:
        try:
            tid = int(transaction_id)
        except (ValueError, TypeError):
            return False
        cur = self.conn.execute("DELETE FROM transactions WHERE user_id = ? AND id = ?", (user_id, tid))
        self.conn.commit()
        return cur.rowcount > 0


def _aggregate(rows: list) -> dict:
    agg: dict = defaultdict(lambda: {"total": 0.0, "count": 0})
    for r in rows:
        cat = r.get("category", "Other")
        agg[cat]["total"] += float(r.get("amount", 0))
        agg[cat]["count"] += 1
    return {k: v for k, v in agg.items()}


class DocumentDBUserStore:
    """MongoDB-compatible transactions store. AWS DocumentDB / MongoDB Atlas."""

    def __init__(self, url: str, db_name: str = "budgetbot", tls_ca_file: str = ""):
        try:
            from pymongo import MongoClient
        except ImportError:
            raise ImportError("pymongo not installed. Run: pip install -r requirements-optional.txt")
        if not url:
            raise ValueError("USERSTORE_MONGO_URL must be set")
        kwargs: dict = {}
        if "documentdb" in url.lower() or tls_ca_file:
            kwargs["tls"] = True
        if tls_ca_file:
            kwargs["tlsCAFile"] = tls_ca_file
        self.client = MongoClient(url, **kwargs)
        self.col = self.client[db_name]["transactions"]
        self.col.create_index([("user_id", 1), ("txn_date", -1)])
        self.col.create_index([("user_id", 1), ("category", 1)])

    def add_transaction(self, user_id: str, txn: dict) -> None:
        self.col.insert_one({
            "user_id": user_id,
            "txn_date": txn["date"],
            "description": txn["description"],
            "amount": float(txn["amount"]),
            "category": txn["category"],
            "confidence": txn.get("confidence", ""),
            "created_at": _now(),
        })

    def count_transactions(self, user_id: str, month: str | None = None, category: str | None = None) -> int:
        return len(self.list_transactions(user_id, month=month, category=category))

    def list_transactions(
        self,
        user_id: str,
        month: str | None = None,
        category: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list:
        q: dict = {"user_id": user_id}
        if month:
            q["txn_date"] = {"$regex": f"^{month}"}
        if category:
            q["category"] = {"$regex": f"^{category}$", "$options": "i"}
        cursor = self.col.find(q).sort("txn_date", -1)
        if offset is not None:
            cursor = cursor.skip(offset)
        if limit is not None:
            cursor = cursor.limit(limit)
        return [
            {"id": str(d["_id"]), "date": d["txn_date"], "description": d["description"], "amount": d["amount"],
             "category": d["category"], "confidence": d.get("confidence", "")}
            for d in cursor
        ]

    def summary(self, user_id: str, month: str | None = None) -> dict:
        return _aggregate(self.list_transactions(user_id, month))


class MySQLUserStore:
    """RDS MySQL / Aurora MySQL adapter. Schema mirrors PostgresUserStore."""

    def __init__(self, url: str):
        try:
            import pymysql
            from urllib.parse import urlparse
        except ImportError:
            raise ImportError("pymysql not installed. Run: pip install -r requirements-optional.txt")
        if not url:
            raise ValueError("USERSTORE_MYSQL_URL must be set")
        p = urlparse(url)
        self.conn = pymysql.connect(
            host=p.hostname, port=p.port or 3306,
            user=p.username, password=p.password,
            database=p.path.lstrip("/"),
            charset="utf8mb4", autocommit=True,
        )
        self._init_schema()

    def _init_schema(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    txn_date DATE NOT NULL,
                    description TEXT,
                    amount DECIMAL(14,2),
                    category VARCHAR(64),
                    confidence VARCHAR(16),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_date (user_id, txn_date),
                    INDEX idx_user_cat (user_id, category)
                ) CHARACTER SET utf8mb4
            """)

    def add_transaction(self, user_id: str, txn: dict) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO transactions (user_id, txn_date, description, amount, category, confidence) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, txn["date"], txn["description"], float(txn["amount"]),
                 txn["category"], txn.get("confidence", "")),
            )

    def count_transactions(self, user_id: str, month: str | None = None, category: str | None = None) -> int:
        sql = "SELECT COUNT(*) FROM transactions WHERE user_id = %s"
        params: list = [user_id]
        if month:
            sql += " AND DATE_FORMAT(txn_date, '%%Y-%%m') = %s"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(%s)"
            params.append(category)
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            r = cur.fetchone()
            return int(r[0]) if r else 0

    def list_transactions(
        self,
        user_id,
        month=None,
        category=None,
        limit=None,
        offset=None,
    ):
        sql = "SELECT id, txn_date, description, amount, category, confidence FROM transactions WHERE user_id = %s"
        params: list = [user_id]
        if month:
            sql += " AND DATE_FORMAT(txn_date, '%%Y-%%m') = %s"
            params.append(month)
        if category:
            sql += " AND LOWER(category) = LOWER(%s)"
            params.append(category)
        sql += " ORDER BY txn_date DESC, id DESC"
        if limit is not None:
            sql += " LIMIT %s"
            params.append(limit)
        if offset is not None:
            sql += " OFFSET %s"
            params.append(offset)
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return [
                {"id": r[0], "date": str(r[1]), "description": r[2], "amount": float(r[3]),
                 "category": r[4], "confidence": r[5]}
                for r in cur.fetchall()
            ]

    def summary(self, user_id, month=None):
        sql = "SELECT category, SUM(amount), COUNT(*) FROM transactions WHERE user_id = %s"
        params: list = [user_id]
        if month:
            sql += " AND DATE_FORMAT(txn_date, '%%Y-%%m') = %s"
            params.append(month)
        sql += " GROUP BY category"
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return {r[0]: {"total": float(r[1]), "count": int(r[2])} for r in cur.fetchall()}
