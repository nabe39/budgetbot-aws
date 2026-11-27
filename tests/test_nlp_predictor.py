"""Unit tests for NLP Transaction Predictor interface (KAN-16 / FR-10)."""
import pytest
from src.nlp.predictor import predict_transaction, get_models


class TestPredictTransactionInterface:
    def test_predict_standard_categories(self):
        """Verify standard Vietnamese banking queries are classified into expected categories."""
        samples = [
            ("Thanh toan tien dien EVN thang 05", "Utilities"),
            ("GrabBike di lam tu nha den cty", "Transport"),
            ("Highlands Coffee Nguyen Trai mua ca phe", "Food"),
            ("Shopee VN don hang ao khoac", "Shopping"),
            ("Tiem thuoc Long Chau mua thuoc cam", "Health"),
            ("Ve xem phim CGV Cinemas", "Entertainment"),
            ("Netflix monthly subscription Standard", "Subscriptions"),
            ("Nhan luong thang 05 cong ty FPT", "Income"),
            ("Chuyen tien tra phong tro thang 05", "Transfer"),
        ]

        for desc, expected_cat in samples:
            res = predict_transaction(desc)
            assert "category" in res
            assert "confidence" in res
            assert "confidence_level" in res
            assert "engine" in res
            assert res["confidence_level"] in ("high", "medium", "low")
            assert 0.0 <= res["confidence"] <= 1.0
            assert res["category"] == expected_cat

    def test_predict_empty_or_whitespace_input(self):
        """Verify empty string returns Other with low confidence."""
        res = predict_transaction("")
        assert res["category"] == "Other"
        assert res["confidence_level"] == "low"

        res_spaces = predict_transaction("     ")
        assert res_spaces["category"] == "Other"
        assert res_spaces["confidence_level"] == "low"

    def test_predict_opaque_code_fallback(self):
        """Verify opaque bank codes return Other."""
        res = predict_transaction("FT2601029484910")
        assert res["category"] == "Other"

    def test_predict_income_amount_heuristic(self):
        """Verify positive amount with salary keywords ensures Income category."""
        res = predict_transaction("Chuyen khoan luong thang 05", amount=15000000)
        assert res["category"] == "Income"
        assert res["confidence"] >= 0.85


class TestFastAPIPredictIntegration:
    @pytest.fixture
    def test_client(self):
        from fastapi.testclient import TestClient
        from src.app import app
        return TestClient(app)

    def test_fastapi_predict_endpoint(self, test_client):
        """Verify POST /predict returns correct schema and predictions."""
        response = test_client.post(
            "/predict",
            json={"description": "Highlands Coffee Landmark 81", "amount": -65000},
        )
        assert response.status_code == 200
        data = response.json()
        assert "category" in data
        assert "confidence" in data
        assert "confidence_level" in data
        assert data["category"] == "Food"
        assert data["confidence_level"] in ("high", "medium", "low")

    def test_fastapi_predict_batch_endpoint(self, test_client):
        """Verify POST /predict/batch handles multiple transaction descriptions."""
        payload = {
            "items": [
                {"description": "Tien dien EVN thang 5", "amount": -450000},
                {"description": "Nhan luong thang 5", "amount": 20000000},
                {"description": "GrabBike ve nha", "amount": -32000},
            ]
        }
        response = test_client.post("/predict/batch", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 3
        cats = [p["category"] for p in data["predictions"]]
        assert cats == ["Utilities", "Income", "Transport"]

    def test_nlp_ai_adapter(self):
        """Verify NLPAI adapter satisfies the AI interface."""
        from src.adapters.ai import NLPAI
        adapter = NLPAI()
        result = adapter.categorize("Cơm tấm sườn bì chả", amount=-45000)
        assert result["category"] == "Food"
        assert result["confidence"] in ("high", "medium", "low")
        assert "confidence_score" in result
        assert result["engine"] in ("logistic_regression", "linear_svc", "nlp_ml", "fallback_keyword", "food_intent_heuristic")

    def test_accent_insensitive_and_street_food_predictions(self):
        """Verify accented Vietnamese inputs and street food slang are correctly categorized."""
        samples = [
            ("ăn trưa", -50000, "Food"),
            ("an trua", 50000, "Food"),
            ("mua xoi het 20k", 20000, "Food"),
            ("ck 5k tien xoi", 5000, "Food"),
            ("ck tien tra sua", -35000, "Food"),
            ("chuyển khoản ăn xôi", -20000, "Food"),
            ("chuyển khoản 50k tiền nhậu cho Tùng", -50000, "Food"),
            ("chuyển khoản mua đồ", -150000, "Shopping"),
            ("chuyển khoản trả nợ bạn", -500000, "Transfer"),
            ("mua banh mi 15k", None, "Food"),
            ("tiền điện EVN", -450000, "Utilities"),
        ]
        for desc, amt, exp_cat in samples:
            res = predict_transaction(desc, amount=amt)
            assert res["category"] == exp_cat
            assert res["confidence_level"] in ("high", "medium")

    def test_local_ai_transfer_vs_consumption_priority(self):
        """Verify LocalAI prioritizes consumption purpose over generic 'chuyển khoản' keyword."""
        from src.adapters.ai import LocalAI
        local = LocalAI()
        assert local.categorize("chuyển khoản ăn xôi", -20000, "2026-11-27")["category"] == "Food"
        assert local.categorize("chuyển khoản mua đồ", -150000, "2026-11-27")["category"] == "Shopping"
        assert local.categorize("chuyển khoản 50k tiền nhậu cho Tùng", -50000, "2026-11-27")["category"] == "Food"
        assert local.categorize("chuyển khoản trả nợ bạn", -500000, "2026-11-27")["category"] == "Transfer"
        assert local.categorize("chuyển khoản đến Nguyễn Văn A", -500000, "2026-11-27")["category"] == "Transfer"
        assert local.categorize("Chuyen tien tra phong tro thang 05", -4500000, "2026-11-27")["category"] == "Transfer"

    def test_chat_transaction_slang_parsing(self, test_client):
        """Verify _parse_chat_txn via POST /chat/transaction handles Vietnamese slang amounts and categories."""
        from src.auth import create_access_token
        token = create_access_token({"sub": "test-user-001"})
        headers = {"Authorization": f"Bearer {token}"}

        cases = [
            ("ăn trưa 50k", -50000.0, "Food"),
            ("mua áo Zara 5 củ", -5000000.0, "Shopping"),
            ("tiền điện 1.2 triệu", -1200000.0, "Utilities"),
        ]
        for msg, exp_amt, exp_cat in cases:
            resp = test_client.post("/chat/transaction", json={"message": msg}, headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "saved"
            txn = data["transaction"]
            assert txn["amount"] == exp_amt
            assert txn["category"] == exp_cat


