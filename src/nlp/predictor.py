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
    amount: Optional[float] = None,
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
            - "engine": Identifier of the inference engine ("linear_svc" or "fallback").
    """
    if not description or not str(description).strip():
        return {
            "category": "Other",
            "confidence": 0.0,
            "confidence_level": "low",
            "engine": "fallback",
        }

    raw_desc = str(description).strip()

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
        return {
            "category": "Other",
            "confidence": 0.25,
            "confidence_level": "low",
            "engine": "fallback",
        }

    # Predict probabilities via Calibrated Linear SVC
    if hasattr(classifier, "predict_proba"):
        probs = classifier.predict_proba(X_vec)[0]
        classes = classifier.classes_
        top_idx = int(np.argmax(probs))
        predicted_category = str(classes[top_idx])
        confidence_val = float(probs[top_idx])
    else:
        # Fallback for uncalibrated models
        predicted_category = str(classifier.predict(X_vec)[0])
        confidence_val = 0.80

    # Business heuristic: Amount sign check
    # If amount is strictly positive and large, and description mentions typical income terms
    if amount is not None and amount > 0:
        lower_desc = raw_desc.lower()
        if any(kw in lower_desc for kw in ["lương", "luong", "thuong", "thưởng", "hoàn tiền", "hoan tien", "lì xì", "li xi"]):
            predicted_category = "Income"
            confidence_val = max(confidence_val, 0.90)

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

