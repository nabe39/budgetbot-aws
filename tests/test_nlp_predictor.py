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

