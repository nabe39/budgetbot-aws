"""Tests for Financial Analytics & Summary API (GET /summary) — KAN-11."""
import uuid
from fastapi.testclient import TestClient

from src.app import app

client = TestClient(app)

STANDARD_CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Health",
    "Subscriptions",
    "Income",
    "Transfer",
    "Other",
]


def _get_auth_headers(username: str):
    client.post(
        "/register",
        json={
            "full_name": "Summary Test User",
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


def test_summary_financial_metrics_and_10_categories_allocation():
    username = f"user_sum_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    # 1. Add transactions for month 2026-05
    # Income: 20,000,000
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-01", "description": "Monthly Salary", "amount": 20000000.0, "category": "Income"},
    )
    # Food: -3,000,000 (entered with lowercase 'food' to test normalization)
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-05", "description": "Grocery & Dining", "amount": -3000000.0, "category": "food"},
    )
    # Transport: -1,000,000
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-10", "description": "Grab Taxi & Petrol", "amount": -1000000.0, "category": "Transport"},
    )
    # Utilities: -1,000,000
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-15", "description": "Electricity & Water", "amount": -1000000.0, "category": "Utilities"},
    )

    # 2. Call GET /summary?month=2026-05
    res = client.get("/summary?month=2026-05", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    # 3. Verify Financial Metrics
    assert data["month"] == "2026-05"
    assert data["total_income"] == 20000000.0
    assert data["total_expense"] == 5000000.0
    assert data["net_savings"] == 15000000.0  # 20M - 5M = 15M
    assert data["savings_rate"] == 75.0       # (15M / 20M) * 100 = 75.0%

    # 4. Verify 10 Standard PascalCase Categories in spending_allocation
    allocations = data["spending_allocation"]
    assert len(allocations) == 10

    categories_in_alloc = [item["category"] for item in allocations]
    assert categories_in_alloc == STANDARD_CATEGORIES

    alloc_map = {item["category"]: item for item in allocations}

    # Food: 3M out of 5M = 60.0%
    assert alloc_map["Food"]["amount"] == 3000000.0
    assert alloc_map["Food"]["percentage"] == 60.0
    assert alloc_map["Food"]["count"] == 1

    # Transport: 1M out of 5M = 20.0%
    assert alloc_map["Transport"]["amount"] == 1000000.0
    assert alloc_map["Transport"]["percentage"] == 20.0
    assert alloc_map["Transport"]["count"] == 1

    # Utilities: 1M out of 5M = 20.0%
    assert alloc_map["Utilities"]["amount"] == 1000000.0
    assert alloc_map["Utilities"]["percentage"] == 20.0
    assert alloc_map["Utilities"]["count"] == 1

    # Income category should have amount = 20M and percentage = 0.0 (not an expense)
    assert alloc_map["Income"]["amount"] == 20000000.0
    assert alloc_map["Income"]["percentage"] == 0.0

    # Remaining expense categories should have amount 0 and percentage 0.0
    for cat in ["Shopping", "Entertainment", "Health", "Subscriptions", "Transfer", "Other"]:
        assert alloc_map[cat]["amount"] == 0.0
        assert alloc_map[cat]["percentage"] == 0.0
        assert alloc_map[cat]["count"] == 0

    # Sum of expense percentages should equal 100.0%
    expense_pct_sum = sum(item["percentage"] for item in allocations if item["category"] != "Income")
    assert round(expense_pct_sum, 1) == 100.0

    # 5. Backward compatibility checks
    assert "by_category" in data
    assert "top_3_drivers" in data
    assert len(data["top_3_drivers"]) == 3
    assert data["top_3_drivers"][0]["category"] == "Food"


def test_summary_month_filter_isolation():
    username = f"user_filter_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    # May 2026
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-01", "description": "May Salary", "amount": 10000000.0, "category": "Income"},
    )
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-10", "description": "May Food", "amount": -2000000.0, "category": "Food"},
    )

    # June 2026
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-06-01", "description": "June Salary", "amount": 15000000.0, "category": "Income"},
    )
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-06-05", "description": "June Shopping", "amount": -3000000.0, "category": "Shopping"},
    )

    # May Query
    res_may = client.get("/summary?month=2026-05", headers=headers)
    data_may = res_may.json()
    assert data_may["total_income"] == 10000000.0
    assert data_may["total_expense"] == 2000000.0
    assert data_may["net_savings"] == 8000000.0
    assert data_may["savings_rate"] == 80.0

    # June Query
    res_jun = client.get("/summary?month=2026-06", headers=headers)
    data_jun = res_jun.json()
    assert data_jun["total_income"] == 15000000.0
    assert data_jun["total_expense"] == 3000000.0
    assert data_jun["net_savings"] == 12000000.0
    assert data_jun["savings_rate"] == 80.0

    # All-time Query
    res_all = client.get("/summary", headers=headers)
    data_all = res_all.json()
    assert data_all["total_income"] == 25000000.0
    assert data_all["total_expense"] == 5000000.0
    assert data_all["net_savings"] == 20000000.0
    assert data_all["savings_rate"] == 80.0


def test_summary_edge_cases_empty_and_no_income():
    # Empty user
    username = f"user_empty_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    res = client.get("/summary?month=2026-05", headers=headers)
    assert res.status_code == 200
    d = res.json()
    assert d["total_income"] == 0.0
    assert d["total_expense"] == 0.0
    assert d["net_savings"] == 0.0
    assert d["savings_rate"] == 0.0
    assert len(d["spending_allocation"]) == 10

    # User with only expenses (no income)
    client.post(
        "/transactions",
        headers=headers,
        json={"date": "2026-05-02", "description": "Coffee", "amount": -50000.0, "category": "Food"},
    )
    res_exp_only = client.get("/summary?month=2026-05", headers=headers)
    d_exp = res_exp_only.json()
    assert d_exp["total_income"] == 0.0
    assert d_exp["total_expense"] == 50000.0
    assert d_exp["net_savings"] == -50000.0
    assert d_exp["savings_rate"] == 0.0  # Cannot divide by zero income



def test_summary_monthly_trends_comparison():
    """Verify GET /summary returns multi-month income, expense and net trends for bar chart."""
    username = f"user_trend_{uuid.uuid4().hex[:8]}"
    headers, user_id = _get_auth_headers(username=username)

    # March: Income 20M, Food -3M
    client.post("/transactions", headers=headers, json={"date": "2026-03-05", "description": "Salary Mar", "amount": 20000000.0, "category": "Income"})
    client.post("/transactions", headers=headers, json={"date": "2026-03-10", "description": "Food Mar", "amount": -3000000.0, "category": "Food"})

    # April: Income 25M, Shopping -5M
    client.post("/transactions", headers=headers, json={"date": "2026-04-05", "description": "Salary Apr", "amount": 25000000.0, "category": "Income"})
    client.post("/transactions", headers=headers, json={"date": "2026-04-12", "description": "Shopping Apr", "amount": -5000000.0, "category": "Shopping"})

    # May: Income 30M, Transport -2M
    client.post("/transactions", headers=headers, json={"date": "2026-05-05", "description": "Salary May", "amount": 30000000.0, "category": "Income"})
    client.post("/transactions", headers=headers, json={"date": "2026-05-15", "description": "Transport May", "amount": -2000000.0, "category": "Transport"})

    res = client.get("/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "monthly_trends" in data
    trends = data["monthly_trends"]
    assert len(trends) == 3

    # Check March
    m_mar = next(t for t in trends if t["month"] == "2026-03")
    assert m_mar["income"] == 20000000.0
    assert m_mar["expense"] == 3000000.0
    assert m_mar["net"] == 17000000.0

    # Check April
    m_apr = next(t for t in trends if t["month"] == "2026-04")
    assert m_apr["income"] == 25000000.0
    assert m_apr["expense"] == 5000000.0
    assert m_apr["net"] == 20000000.0

    # Check May
    m_may = next(t for t in trends if t["month"] == "2026-05")
    assert m_may["income"] == 30000000.0
    assert m_may["expense"] == 2000000.0
    assert m_may["net"] == 28000000.0
