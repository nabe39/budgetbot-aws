"""Transaction Categorization Predictor module for BudgetBot.

Implements the contract specified in docs/local/01_checklist_thong_nhat_nlp_rag.md:
    def predict_transaction(description: str, amount: float = None) -> dict
    Returns: {"category": str, "confidence": float, "confidence_level": str}
"""
import logging
import re
from pathlib import Path
from typing import Any, Dict, Optional, Union

import numpy as np

from src.nlp.preprocessor import preprocess, remove_vietnamese_accents
from src.nlp.vectorizer import load_vectorizer, DEFAULT_MODEL_PATH
from src.nlp.classifier import load_classifier, DEFAULT_CLASSIFIER_PATH

logger = logging.getLogger(__name__)

# Module-level singletons for cached model loading
_CACHED_VECTORIZER = None
_CACHED_CLASSIFIER = None

CONFIDENCE_HIGH_THRESHOLD = 0.70
CONFIDENCE_MEDIUM_THRESHOLD = 0.45

# Food intent pattern to disambiguate street food / snacks / meals (e.g. mua xôi, ck 5k tiền xôi, tiền nhậu, bữa lẩu)
FOOD_INTENT_PATTERN = re.compile(
    r"\b(xôi|xoi|bánh mì|banh mi|bún chả|bun cha|cơm tấm|com tam|phở|pho\s+bo|pho\s+ga|quan\s+pho|an\s+pho|hủ tiếu|hu tieu|bánh cuốn|banh cuon|trà sữa|tra sua|trà đá|tra da|ăn sáng|an sang|ăn trưa|an trua|ăn tối|an toi|tiền ăn|tien an|bún bò|bun bo|cơm trưa|com trua|bữa lẩu|bua lau|tiền lẩu|tien lau|đi nhậu|di nhau|tiền nhậu|tien nhau|bữa nhậu|bua nhau|nhậu|ăn vặt|an vat)\b",
    re.I,
)


# Transfer intent pattern for internal transfers, e-wallet top-ups/withdrawals, savings, debt, rent
TRANSFER_INTENT_PATTERN = re.compile(
    r"\b(trả nợ|tra no|cho vay|tạm ứng|tam ung|tiết kiệm|tiet kiem|nạp ví|nap vi|rút ví|rut vi|phòng trọ|phong tro|tiền phòng|tien phong|thuê nhà|thue nha|chuyển khoản nội bộ|chuyen khoan noi bo)\b",
    re.I,
)


# Fallback keywords for out-of-vocabulary terms (Transfer placed after consumption categories)
FALLBACK_KEYWORDS = {
    "Income": [
        "salary", "deposit credit", "payroll", "incoming transfer", "bonus",
        "lương", "luong", "thu nhập", "thu nhap", "tiền thưởng", "tien thuong",
        "nhận tiền", "nhan tien", "tra luong", "nhận chuyển khoản", "nhan chuyen khoan",
        "hoàn tiền", "hoan tien", "lì xì", "li xi"
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
        "kfc", "lotteria", "mcdonald", "xôi", "xoi", "bánh mì", "banh mi",
        "nhậu", "tiền nhậu", "tien nhau", "bữa lẩu", "bua lau"
    ],
    "Transport": [
        "grab", "uber", " be ", "xanh sm", "taxi", "metro", "bus", "petrol", "shell",
        "vinfast", "fuel", "xăng", "xang", "gửi xe", "gui xe", "vé xe", "ve xe",
        "mai linh", "gojek"
    ],
    "Shopping": [
        "shopee", "lazada", "tiki", "amazon", "store", "mall", "vincom", "shop",
        "siêu thị", "sieu thi", "mua sắm", "mua sam", "bách hóa", "winmart",
        "coopmart", "lotte mart", "aeon", "big c", "topmarket",
        "mua đồ", "mua do", "mua áo", "mua ao", "mua quần", "mua quan", "mua sách", "mua sach"
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
    "Transfer": [
        "transfer to", "transfer from", "moved to savings",
        "chuyển khoản", "chuyen khoan", "chuyển tiền", "chuyen tien", "chuyển sang",
        "nạp ví", "nap vi", "rút ví", "rut vi", "tiết kiệm", "tiet kiem",
        "trả nợ", "tra no", "cho vay", "phòng trọ", "phong tro", "thuê nhà", "thue nha"
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
    cleaned_unaccented = remove_vietnamese_accents(cleaned_desc)

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

    # Vectorize with accent-insensitivity fallback
    X_vec = vectorizer.transform([cleaned_desc])
    X_vec_unacc = vectorizer.transform([cleaned_unaccented])
    if X_vec_unacc.nnz > X_vec.nnz:
        X_vec = X_vec_unacc

    is_income_keyword = any(kw in lower_desc for kw in FALLBACK_KEYWORDS["Income"])

    # Check if vocabulary match exists
    if X_vec.nnz == 0:
        # Check food intent pattern first (e.g. "ăn trưa", "bún chả", "mua xôi")
        if not is_income_keyword and (
            FOOD_INTENT_PATTERN.search(raw_desc) or FOOD_INTENT_PATTERN.search(cleaned_unaccented)
        ):
            return {
                "category": "Food",
                "confidence": 0.90,
                "confidence_level": "high",
                "engine": "food_intent_heuristic",
            }

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

    engine_name = (
        "logistic_regression"
        if "Logistic" in type(classifier).__name__
        else ("linear_svc" if "SVC" in type(classifier).__name__ or "Calibrated" in type(classifier).__name__ else "nlp_classifier")
    )

    # Disambiguation: Food intent takes precedence over Shopping / Transfer for street food & meals
    if not is_income_keyword and (
        FOOD_INTENT_PATTERN.search(raw_desc) or FOOD_INTENT_PATTERN.search(cleaned_unaccented)
    ):
        predicted_category = "Food"
        confidence_val = max(confidence_val, 0.90)
        engine_name = "food_intent_heuristic"
    elif not is_income_keyword and (amount_num is None or amount_num <= 0) and (
        TRANSFER_INTENT_PATTERN.search(raw_desc) or TRANSFER_INTENT_PATTERN.search(cleaned_unaccented)
    ):
        predicted_category = "Transfer"
        confidence_val = max(confidence_val, 0.88)
        engine_name = "transfer_intent_heuristic"

    # Business heuristic: Amount sign check
    # If amount is strictly positive and description mentions income keywords
    if amount_num is not None and amount_num > 0:
        if any(kw in lower_desc for kw in FALLBACK_KEYWORDS["Income"]):
            predicted_category = "Income"
            confidence_val = max(confidence_val, 0.95)
            engine_name = "income_heuristic"

    # Determine confidence level string
    if confidence_val >= CONFIDENCE_HIGH_THRESHOLD:
        confidence_level = "high"
    elif confidence_val >= CONFIDENCE_MEDIUM_THRESHOLD:
        confidence_level = "medium"
    else:
        confidence_level = "low"

    return {
        "category": predicted_category,
        "confidence": round(confidence_val, 4),
        "confidence_level": confidence_level,
        "engine": engine_name,
    }

