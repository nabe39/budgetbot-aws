"""Transaction Categorization Predictor module for BudgetBot.

Implements the contract specified in docs/local/01_checklist_thong_nhat_nlp_rag.md:
    def predict_transaction(description: str, amount: float = None) -> dict
    Returns: {"category": str, "confidence": float, "confidence_level": str}
"""
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Union

import numpy as np

from src.nlp.preprocessor import preprocess
from src.nlp.vectorizer import load_vectorizer, DEFAULT_MODEL_PATH
from src.nlp.classifier import load_classifier, DEFAULT_CLASSIFIER_PATH

logger = logging.getLogger(__name__)

# Module-level singletons for cached model loading
_CACHED_VECTORIZER = None
_CACHED_CLASSIFIER = None

CONFIDENCE_HIGH_THRESHOLD = 0.70
CONFIDENCE_MEDIUM_THRESHOLD = 0.45


# Fallback keywords for out-of-vocabulary terms
FALLBACK_KEYWORDS = {
    "Income": [
        "salary", "deposit credit", "payroll", "incoming transfer", "bonus",
        "lương", "luong", "thu nhập", "thu nhap", "tiền thưởng", "tien thuong",
        "nhận tiền", "nhan tien", "tra luong", "chuyển khoản đến", "lì xì", "li xi"
    ],
    "Transfer": [
        "transfer to", "transfer from", "moved to savings",
        "chuyển khoản", "chuyen khoan", "chuyển tiền", "chuyen tien", "chuyển sang"
    ],
    "Subscriptions": [
        "subscription", "netflix", "spotify", "openai", "chatgpt", "anthropic",
        "claude", "github", "icloud", "google one", "cursor", "youtube premium",
        "microsoft 365", "thuê bao", "thue bao", "gia hạn"
    ],
    "Food": [
        "restaurant", "cafe", "coffee", "starbucks", "highlands", "phở", "pho", "food",
        "grab food", "shopee food", "lunch", "dinner", "bakery", "cà phê", "ca phe",
        "cơm", "com", "bún", "bun", "ăn uống", "an uong", "quán ăn", "quan an",
        "nhà hàng", "nha hang", "trà sữa", "tra sua", "phúc long", "phuc long",
        "kfc", "lotteria", "mcdonald"
    ],
    "Transport": [
        "grab", "uber", " be ", "xanh sm", "taxi", "metro", "bus", "petrol", "shell",
        "vinfast", "fuel", "xăng", "xang", "gửi xe", "gui xe", "vé xe", "ve xe",
        "mai linh", "gojek"
    ],
    "Shopping": [
        "shopee", "lazada", "tiki", "amazon", "store", "mall", "vincom", "shop",
        "siêu thị", "sieu thi", "mua sắm", "mua sam", "bách hóa", "winmart",
        "coopmart", "lotte mart", "aeon", "big c", "topmarket"
    ],
    "Utilities": [
        "electric", "evn", "water", "internet", "viettel", "vnpt", "fpt", "utility",
        "tiền điện", "tien dien", "tiền nước", "tien nuoc", "tiền mạng", "tien mang",
        "sawaco", "mobifone", "vinaphone"
    ],
    "Entertainment": [
        "cinema", "cgv", "lotte cinema", "concert", "game", "steam", "nintendo",
        "rạp phim", "rap phim", "vé xem phim", "ve xem phim", "karaoke", "du lịch"
    ],
    "Health": [
        "pharmacy", "hospital", "clinic", "guardian", "long chau", "medlatec",
        "thuốc", "thuoc", "khám bệnh", "kham benh", "bệnh viện", "benh vien",
        "nhà thuốc", "nha thuoc", "pharmacity", "an khang"
    ],
}


def get_models(
    vectorizer_path: Union[str, Path] = DEFAULT_MODEL_PATH,
    classifier_path: Union[str, Path] = DEFAULT_CLASSIFIER_PATH,
) -> tuple:
    """Retrieve or lazily initialize the cached Vectorizer and Classifier models."""
    global _CACHED_VECTORIZER, _CACHED_CLASSIFIER

    if _CACHED_VECTORIZER is None:
        _CACHED_VECTORIZER = load_vectorizer(vectorizer_path)
    if _CACHED_CLASSIFIER is None:
        _CACHED_CLASSIFIER = load_classifier(classifier_path)

    return _CACHED_VECTORIZER, _CACHED_CLASSIFIER


def predict_transaction(
    description: str,
    amount: Optional[Union[float, int, str]] = None,
    vectorizer: Optional[Any] = None,
    classifier: Optional[Any] = None,
) -> Dict[str, Any]:
    """Predict transaction category with calibrated confidence score.

    Args:
        description: Raw transaction description text.
        amount: Optional transaction amount (VND). Positive indicates income, negative indicates expense.
        vectorizer: Optional pre-loaded TF-IDF vectorizer (if None, uses cached singleton).
        classifier: Optional pre-loaded classifier model (if None, uses cached singleton).

    Returns:
        Dictionary with:
            - "category": Predicted 10 PascalCase category string.
            - "confidence": Float probability in range [0.0, 1.0].
            - "confidence_level": "high" | "medium" | "low".
            - "engine": Identifier of the inference engine ("logistic_regression", "linear_svc", or "fallback").
    """
    if not description or not str(description).strip():
        return {
            "category": "Other",
            "confidence": 0.0,
            "confidence_level": "low",
            "engine": "fallback",
        }

    raw_desc = str(description).strip()
    lower_desc = raw_desc.lower()

    # Safely convert amount to float if provided
    amount_num: Optional[float] = None
    if amount is not None:
        try:
            amount_num = float(amount)
        except (ValueError, TypeError):
            amount_num = None

    # Preprocess text
    cleaned_desc = preprocess(raw_desc)

    # If text is empty after removing noise/codes (e.g. pure "FT2601029484910"), fallback to Other with low confidence
    if not cleaned_desc or not cleaned_desc.strip():
        return {
            "category": "Other",
            "confidence": 0.20,
            "confidence_level": "low",
            "engine": "fallback",
        }

    # Load cached models
    if vectorizer is None or classifier is None:
        v, c = get_models()
        vectorizer = vectorizer or v
        classifier = classifier or c

    # Vectorize
    X_vec = vectorizer.transform([cleaned_desc])

    # Check if vocabulary match exists
    if X_vec.nnz == 0:
        # Check rule heuristics / fallback keywords before returning generic Other
        if amount_num is not None and amount_num > 0:
            for kw in FALLBACK_KEYWORDS["Income"]:
                if kw in lower_desc:
                    return {
                        "category": "Income",
                        "confidence": 0.95,
                        "confidence_level": "high",
                        "engine": "rule_heuristic",
                    }

        for cat, kws in FALLBACK_KEYWORDS.items():
            for kw in kws:
                if kw in lower_desc:
                    return {
                        "category": cat,
                        "confidence": 0.85,
                        "confidence_level": "high",
                        "engine": "fallback_keyword",
                    }

        return {
            "category": "Other",
            "confidence": 0.25,
            "confidence_level": "low",
            "engine": "fallback",
        }

    # Predict probabilities via ML Classifier
    if hasattr(classifier, "predict_proba"):
        probs = classifier.predict_proba(X_vec)[0]
        classes = classifier.classes_
        top_idx = int(np.argmax(probs))
        predicted_category = str(classes[top_idx])
        confidence_val = float(probs[top_idx])
    else:
        predicted_category = str(classifier.predict(X_vec)[0])
        confidence_val = 0.80

    # Business heuristic: Amount sign check
    # If amount is strictly positive and description mentions income keywords
    if amount_num is not None and amount_num > 0:
        if any(kw in lower_desc for kw in FALLBACK_KEYWORDS["Income"]):
            predicted_category = "Income"
            confidence_val = max(confidence_val, 0.95)

    # Determine confidence level string
    if confidence_val >= CONFIDENCE_HIGH_THRESHOLD:
        confidence_level = "high"
    elif confidence_val >= CONFIDENCE_MEDIUM_THRESHOLD:
        confidence_level = "medium"
    else:
        confidence_level = "low"

    engine_name = (
        "logistic_regression"
        if "Logistic" in type(classifier).__name__
        else ("linear_svc" if "SVC" in type(classifier).__name__ or "Calibrated" in type(classifier).__name__ else "nlp_classifier")
    )

    return {
        "category": predicted_category,
        "confidence": round(confidence_val, 4),
        "confidence_level": confidence_level,
        "engine": engine_name,
    }

