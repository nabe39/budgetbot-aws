"""Comprehensive tests for Transaction CRUD and PostgresUserStore."""
import uuid
import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.config import config
from src.adapters.userstore import PostgresUserStore, SQLiteUserStore


client = TestClient(app)


def _get_auth_headers(username: str = "crud_user"):
    client.post(
        "/register",
        json={
            "full_name": "CRUD Test User",
            "username": username,
            "password": "Password123!",
        },
    )
    login_resp = client.post(
        "/login",
        json={
            "username": username,
            "password": "Password123!",
        },
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    user_id = login_resp.json()["user_id"]
    return {"Authorization": f"Bearer {token}"}, user_id


# =============================================================================
# 1. Direct Unit Tests for PostgresUserStore (Local PostgreSQL 15)
# =============================================================================

def test_postgres_userstore_crud_and_filters():
    """Directly tests PostgresUserStore methods including pagination and filtering."""
    if not config.userstore_postgres_url:
        pytest.skip("USERSTORE_POSTGRES_URL not configured")

    try:
        store = PostgresUserStore(config.userstore_postgres_url)
    except Exception as e:
        pytest.skip(f"Could not connect to PostgreSQL: {e}")

    test_uid = f"test-pg-{uuid.uuid4().hex[:8]}"

    try:
        # 1. Add transactions across different months and categories
        t1 = store.add_transaction(
            test_uid,
            {
                "date": "2026-05-01",
                "description": "Starbucks Coffee",
                "amount": -75000.0,
                "category": "Food",
                "confidence": "high",
                "engine": "nlp_linear_svc",
            },
        )
        assert t1["id"] is not None
        assert t1["category"] == "Food"
        assert t1["amount"] == -75000.0
        t1_id = t1["id"]

        t2 = store.add_transaction(
            test_uid,
            {
                "date": "2026-05-15",
                "description": "Grab Bike to office",
                "amount": -35000.0,
                "category": "Transport",
                "confidence": "high",
            },
        )
        t2_id = t2["id"]

        t3 = store.add_transaction(
            test_uid,
            {
                "date": "2026-05-20",
                "description": "Pho Bo Lunch",
                "amount": -55000.0,
                "category": "Food",
                "confidence": "high",
            },
        )
        t3_id = t3["id"]

        t4 = store.add_transaction(
            test_uid,
            {
                "date": "2026-06-05",
                "description": "Freelance Salary",
                "amount": 5000000.0,
                "category": "Income",
                "confidence": "high",
            },
        )
        t4_id = t4["id"]

        # 2. Get single transaction
        fetched_t1 = store.get_transaction(test_uid, t1_id)
        assert fetched_t1 is not None
        assert fetched_t1["description"] == "Starbucks Coffee"
        assert fetched_t1["amount"] == -75000.0

        # Non-existent or other user
        assert store.get_transaction("other_user", t1_id) is None
        assert store.get_transaction(test_uid, 999999999) is None

        # 3. Count transactions
        assert store.count_transactions(test_uid) == 4
        assert store.count_transactions(test_uid, month="2026-05") == 3
        assert store.count_transactions(test_uid, month="2026-06") == 1
        assert store.count_transactions(test_uid, category="Food") == 2
        assert store.count_transactions(test_uid, month="2026-05", category="Food") == 2
        assert store.count_transactions(test_uid, month="2026-06", category="Food") == 0

        # 4. List transactions with filtering
        all_txns = store.list_transactions(test_uid)
        assert len(all_txns) == 4
        # Default ordering is date DESC, id DESC
        assert all_txns[0]["id"] == t4_id

        may_txns = store.list_transactions(test_uid, month="2026-05")
        assert len(may_txns) == 3

        food_txns = store.list_transactions(test_uid, category="food")  # Case-insensitive
        assert len(food_txns) == 2

        # 5. Pagination (limit & offset)
        page1 = store.list_transactions(test_uid, limit=2, offset=0)
        assert len(page1) == 2
        assert page1[0]["id"] == t4_id

        page2 = store.list_transactions(test_uid, limit=2, offset=2)
        assert len(page2) == 2
        assert page2[0]["id"] != page1[0]["id"]

        # 6. Summary aggregation
        summary_may = store.summary(test_uid, month="2026-05")
        assert "Food" in summary_may
        assert summary_may["Food"]["count"] == 2
        assert summary_may["Food"]["total"] == -130000.0
        assert "Transport" in summary_may
        assert summary_may["Transport"]["count"] == 1

        # 7. Update transaction
        updated = store.update_transaction(
            test_uid,
            t1_id,
            {"amount": -80000.0, "description": "Starbucks Coffee Grande"},
        )
        assert updated["amount"] == -80000.0
        assert updated["description"] == "Starbucks Coffee Grande"
        assert updated["category"] == "Food"  # Preserved

        # Check update reflected in get_transaction
        re_fetched = store.get_transaction(test_uid, t1_id)
        assert re_fetched["amount"] == -80000.0

        # Update non-existent returns {}
        assert store.update_transaction(test_uid, 999999999, {"amount": 100}) == {}

        # 8. Delete transaction
        deleted = store.delete_transaction(test_uid, t1_id)
        assert deleted is True

        # Deleting again returns False
        assert store.delete_transaction(test_uid, t1_id) is False

        # Verify no longer exists
        assert store.get_transaction(test_uid, t1_id) is None
        assert store.count_transactions(test_uid) == 3

    finally:
        # Cleanup test transactions
        for tid in [t1_id, t2_id, t3_id, t4_id]:
            store.delete_transaction(test_uid, tid)


# =============================================================================
# 2. REST API Integration Tests (/transactions CRUD, Pagination, Filters)
# =============================================================================

def test_rest_api_transactions_crud_and_filters():
    username = f"user_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    # 1. POST /transactions — with auto-categorization
    r1 = client.post(
        "/transactions",
        headers=headers,
        json={
            "date": "2026-05-02",
            "description": "Highlands Coffee Culi",
            "amount": -65000.0,
        },
    )
    assert r1.status_code == 201, r1.text
    d1 = r1.json()["transaction"]
    assert d1["category"] == "Food"
    t1_id = d1["id"]

    # POST /transactions — with explicit category
    r2 = client.post(
        "/transactions",
        headers=headers,
        json={
            "date": "2026-05-10",
            "description": "Electricity Bill",
            "amount": -450000.0,
            "category": "Utilities",
        },
    )
    assert r2.status_code == 201, r2.text
    d2 = r2.json()["transaction"]
    assert d2["category"] == "Utilities"
    t2_id = d2["id"]

    r3 = client.post(
        "/transactions",
        headers=headers,
        json={
            "date": "2026-06-01",
            "description": "Company Salary Bonus",
            "amount": 15000000.0,
            "category": "Income",
        },
    )
    assert r3.status_code == 201
    t3_id = r3.json()["transaction"]["id"]

    # 2. GET /transactions (All transactions for user)
    get_all = client.get("/transactions", headers=headers)
    assert get_all.status_code == 200
    res_data = get_all.json()
    assert res_data["total"] >= 3
    assert len(res_data["transactions"]) >= 3

    # 3. GET /transactions (Filter by month)
    get_may = client.get("/transactions?month=2026-05", headers=headers)
    assert get_may.status_code == 200
    may_data = get_may.json()
    assert may_data["month"] == "2026-05"
    assert may_data["total"] == 2
    assert all("2026-05" in t["date"] for t in may_data["transactions"])

    # 4. GET /transactions (Filter by category)
    get_util = client.get("/transactions?category=utilities", headers=headers)
    assert get_util.status_code == 200
    util_data = get_util.json()
    assert util_data["total"] == 1
    assert util_data["transactions"][0]["category"] == "Utilities"

    # 5. GET /transactions (Pagination: page & page_size)
    get_page1 = client.get("/transactions?page=1&page_size=2", headers=headers)
    assert get_page1.status_code == 200
    p1_data = get_page1.json()
    assert p1_data["page"] == 1
    assert p1_data["page_size"] == 2
    assert len(p1_data["transactions"]) == 2
    assert p1_data["total_pages"] >= 2

    get_page2 = client.get("/transactions?page=2&page_size=2", headers=headers)
    assert get_page2.status_code == 200
    p2_data = get_page2.json()
    assert p2_data["page"] == 2
    assert len(p2_data["transactions"]) >= 1
    assert p2_data["transactions"][0]["id"] != p1_data["transactions"][0]["id"]

    # 6. GET /transactions/{id}
    get_single = client.get(f"/transactions/{t1_id}", headers=headers)
    assert get_single.status_code == 200
    assert get_single.json()["transaction"]["description"] == "Highlands Coffee Culi"

    # GET /transactions/{id} with non-existent ID
    get_404 = client.get("/transactions/999999999", headers=headers)
    assert get_404.status_code == 404

    # 7. PUT /transactions/{id}
    put_res = client.put(
        f"/transactions/{t1_id}",
        headers=headers,
        json={"description": "Highlands Coffee Premium", "amount": -70000.0},
    )
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "updated"
    assert put_res.json()["transaction"]["description"] == "Highlands Coffee Premium"
    assert put_res.json()["transaction"]["amount"] == -70000.0

    # PUT /transactions/{id} with empty body should return 400
    put_empty = client.put(f"/transactions/{t1_id}", headers=headers, json={})
    assert put_empty.status_code == 400

    # PUT /transactions/{id} for non-existent ID should return 404
    put_404 = client.put(
        "/transactions/999999999",
        headers=headers,
        json={"description": "Ghost"},
    )
    assert put_404.status_code == 404

    # 8. User Isolation Check
    user_b_headers, user_b_id = _get_auth_headers(username=f"user_b_{uuid.uuid4().hex[:8]}")
    # User B cannot get User A's transaction
    b_get_a = client.get(f"/transactions/{t1_id}", headers=user_b_headers)
    assert b_get_a.status_code == 404

    # User B cannot update User A's transaction
    b_put_a = client.put(
        f"/transactions/{t1_id}",
        headers=user_b_headers,
        json={"description": "Hacked"},
    )
    assert b_put_a.status_code == 404

    # User B cannot delete User A's transaction
    b_del_a = client.delete(f"/transactions/{t1_id}", headers=user_b_headers)
    assert b_del_a.status_code == 404

    # 9. DELETE /transactions/{id}
    del_res = client.delete(f"/transactions/{t1_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Verifying it's gone
    assert client.get(f"/transactions/{t1_id}", headers=headers).status_code == 404
    assert client.delete(f"/transactions/{t1_id}", headers=headers).status_code == 404

    # Clean up remaining
    client.delete(f"/transactions/{t2_id}", headers=headers)
    client.delete(f"/transactions/{t3_id}", headers=headers)


def test_rest_api_batch_and_edge_cases():
    username = f"user_edge_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    # 1. Batch insertion
    batch_resp = client.post(
        "/transactions/batch",
        headers=headers,
        json={
            "transactions": [
                {"date": "2026-05-10", "description": "Item 1", "amount": -10000.0, "category": "Food"},
                {"date": "2026-05-11", "description": "Item 2", "amount": -20000.0, "category": "Shopping"},
                {"date": "2026-05-12", "description": "Item 3", "amount": -30000.0, "category": "Food"},
            ]
        },
    )
    assert batch_resp.status_code == 200
    assert batch_resp.json()["count"] == 3

    # 2. Non-integer ID strings should return 404 cleanly
    assert client.get("/transactions/invalid_id", headers=headers).status_code == 404
    assert client.put("/transactions/invalid_id", headers=headers, json={"description": "x"}).status_code == 404
    assert client.delete("/transactions/invalid_id", headers=headers).status_code == 404

    # 3. Pagination out of bounds returns empty list, not crash
    p_out = client.get("/transactions?page=999&page_size=10", headers=headers)
    assert p_out.status_code == 200
    assert p_out.json()["transactions"] == []
    assert p_out.json()["page"] == 999
    assert p_out.json()["total"] == 3

    # 4. Limit and offset aliases
    p_offset = client.get("/transactions?limit=2&offset=1", headers=headers)
    assert p_offset.status_code == 200
    assert len(p_offset.json()["transactions"]) == 2


def test_sqlite_userstore_crud_and_filters(tmp_path):
    """Directly tests SQLiteUserStore for local and CI testing fallback."""
    db_file = str(tmp_path / "sqlite_test.db")
    store = SQLiteUserStore(db_file)
    test_uid = "sqlite_user_1"

    t1 = store.add_transaction(test_uid, {
        "date": "2026-05-01",
        "description": "Lunch",
        "amount": -50000.0,
        "category": "Food",
    })
    t2 = store.add_transaction(test_uid, {
        "date": "2026-05-05",
        "description": "Taxi",
        "amount": -100000.0,
        "category": "Transport",
    })

    assert store.count_transactions(test_uid) == 2
    assert store.count_transactions(test_uid, category="Food") == 1
    assert len(store.list_transactions(test_uid, category="food")) == 1
    assert len(store.list_transactions(test_uid, limit=1, offset=0)) == 1

    # Update
    up = store.update_transaction(test_uid, t1["id"], {"amount": -60000.0})
    assert up["amount"] == -60000.0

    # Delete
    assert store.delete_transaction(test_uid, t1["id"]) is True
    assert store.delete_transaction(test_uid, t1["id"]) is False
    assert store.count_transactions(test_uid) == 1
