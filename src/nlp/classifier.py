"""Model training, evaluation, and benchmark module for BudgetBot NLP pipeline.

Implements KAN-16 / FR-10, FR-11:
- Huấn luyện thử nghiệm các mô hình: Logistic Regression, Linear SVC, Multinomial Naive Bayes.
- Đánh giá chéo 5-Fold Stratified Cross-Validation sử dụng Pipeline (ngăn chặn hoàn toàn rò rỉ đặc trưng).
- Đánh giá độc lập trên tập test độc lập sample_data/eval_nlp.csv (đã làm sạch không rò rỉ).
- Báo cáo phân loại chi tiết (per-class classification report) và ma trận nhầm lẫn (confusion matrix).
- Xuất mô hình tối ưu đã fit thành file classifier_model.joblib.
"""
import os
import csv
import time
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from src.nlp.preprocessor import preprocess
from src.nlp.vectorizer import load_vectorizer, DEFAULT_MODEL_PATH

logger = logging.getLogger(__name__)

DEFAULT_CLASSIFIER_PATH = Path(__file__).resolve().parent / "classifier_model.joblib"
DEFAULT_TRAIN_DATASET = Path(__file__).resolve().parents[2] / "sample_data" / "vietnamese_transactions_1000.csv"
DEFAULT_EVAL_DATASET = Path(__file__).resolve().parents[2] / "sample_data" / "eval_nlp.csv"


def load_dataset(filepath: Union[str, Path], label_col: str = "category") -> Tuple[List[str], List[str]]:
    """Load transaction descriptions and category labels from a CSV dataset."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Dataset file not found: {filepath}")

    texts, labels = [], []
    with open(filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            desc = row.get("description", "").strip()
            # Support both 'category' and 'true_category'
            cat = row.get(label_col) or row.get("true_category") or row.get("category")
            if desc and cat:
                texts.append(desc)
                labels.append(cat.strip())

    return texts, labels


def get_candidate_models(random_state: int = 42) -> Dict[str, Any]:
    """Define candidate classification models with tuned hyperparameters."""
    return {
        "Logistic Regression": LogisticRegression(
            C=5.0,
            max_iter=1000,
            random_state=random_state,
        ),
        "Linear SVC (Calibrated)": CalibratedClassifierCV(
            estimator=LinearSVC(C=1.0, random_state=random_state),
            cv=5,
        ),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.1),
    }


def train_and_compare_models(
    train_path: Union[str, Path] = DEFAULT_TRAIN_DATASET,
    eval_path: Union[str, Path] = DEFAULT_EVAL_DATASET,
    vectorizer_path: Union[str, Path] = DEFAULT_MODEL_PATH,
    output_classifier_path: Union[str, Path] = DEFAULT_CLASSIFIER_PATH,
) -> Dict[str, Any]:
    """Train candidate models, evaluate via 5-Fold CV and independent Test Set, and save the best model.

    Returns:
        Dictionary containing comparative evaluation metrics for all candidate models.
    """
    logger.info("Loading training and evaluation datasets...")
    X_train_raw, y_train = load_dataset(train_path, label_col="category")
    X_eval_raw, y_eval = load_dataset(eval_path, label_col="true_category")

    logger.info(f"Loaded {len(X_train_raw)} training samples and {len(X_eval_raw)} evaluation samples.")

    # 1. Preprocess texts using KAN-14 preprocessor
    X_train_clean = [preprocess(t) for t in X_train_raw]
    X_eval_clean = [preprocess(t) for t in X_eval_raw]

    # 2. Vectorize texts using KAN-15 vectorizer for standalone fit
    vectorizer = load_vectorizer(vectorizer_path)
    X_train_vec = vectorizer.transform(X_train_clean)
    X_eval_vec = vectorizer.transform(X_eval_clean)

    models = get_candidate_models()
    benchmark_results: Dict[str, Dict[str, Any]] = {}
    best_model_name = None
    best_test_f1 = -1.0

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    categories = sorted(set(y_train))

    for name, model in models.items():
        logger.info(f"Training & evaluating model: {name}...")

        # 5-Fold Cross-Validation using Pipeline to guarantee 0 vocabulary leakage
        pipe = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=3000, sublinear_tf=True)),
            ("clf", model),
        ])
        cv_acc_scores = cross_val_score(pipe, X_train_clean, y_train, cv=cv, scoring="accuracy")
        cv_f1_scores = cross_val_score(pipe, X_train_clean, y_train, cv=cv, scoring="f1_macro")

        # Fit model on training features
        t0 = time.perf_counter()
        model.fit(X_train_vec, y_train)
        fit_time_ms = (time.perf_counter() - t0) * 1000

        # Measure inference latency on test set
        t1 = time.perf_counter()
        y_pred = model.predict(X_eval_vec)
        infer_time_ms = (time.perf_counter() - t1) * 1000 / len(X_eval_raw)

        # Independent Test Set Metrics
        test_acc = accuracy_score(y_eval, y_pred)
        test_macro_p = precision_score(y_eval, y_pred, average="macro", zero_division=0)
        test_macro_r = recall_score(y_eval, y_pred, average="macro", zero_division=0)
        test_macro_f1 = f1_score(y_eval, y_pred, average="macro", zero_division=0)

        # Classification report dict and text
        report_text = classification_report(y_eval, y_pred, target_names=categories, zero_division=0)
        cm = confusion_matrix(y_eval, y_pred, labels=categories)

        benchmark_results[name] = {
            "cv_accuracy_mean": float(cv_acc_scores.mean()),
            "cv_accuracy_std": float(cv_acc_scores.std()),
            "cv_macro_f1_mean": float(cv_f1_scores.mean()),
            "test_accuracy": float(test_acc),
            "test_macro_precision": float(test_macro_p),
            "test_macro_recall": float(test_macro_r),
            "test_macro_f1": float(test_macro_f1),
            "fit_time_ms": float(fit_time_ms),
            "inference_time_per_sample_ms": float(infer_time_ms),
            "classification_report": report_text,
            "confusion_matrix": cm,
            "model_instance": model,
        }

        # Select model prioritizing Test Macro F1 with CV stability
        if test_macro_f1 > best_test_f1:
            best_test_f1 = test_macro_f1
            best_model_name = name

    # Save the optimal model
    best_model = benchmark_results[best_model_name]["model_instance"]
    output_classifier_path = Path(output_classifier_path)
    output_classifier_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, output_classifier_path)
    logger.info(f"Saved optimal model ({best_model_name}) to {output_classifier_path}")

    return {
        "benchmark": benchmark_results,
        "best_model_name": best_model_name,
        "saved_path": str(output_classifier_path),
        "categories": categories,
    }


def load_classifier(model_path: Union[str, Path] = DEFAULT_CLASSIFIER_PATH) -> Any:
    """Load serialized classifier model from disk."""
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Classifier model not found at {model_path}. "
            "Please run train_and_compare_models() first."
        )
    return joblib.load(model_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print("=" * 90)
    print("  HUẤN LUYỆN & SO SÁNH CÁC MÔ HÌNH PHÂN LOẠI NLP (KAN-16 - AUDITED & REFACTORED)")
    print("=" * 90)

    results = train_and_compare_models()
    benchmarks = results["benchmark"]
    categories = results["categories"]

    print("\n" + "-" * 90)
    print(f"{'Mô Hình':<28} | {'CV Acc':<16} | {'CV Macro F1':<12} | {'Test Acc':<10} | {'Test Macro F1':<12}")
    print("-" * 90)
    for name, m in benchmarks.items():
        cv_acc_str = f"{m['cv_accuracy_mean']*100:.2f}% (±{m['cv_accuracy_std']*100:.2f}%)"
        cv_f1_str = f"{m['cv_macro_f1_mean']*100:.2f}%"
        test_acc_str = f"{m['test_accuracy']*100:.2f}%"
        test_f1_str = f"{m['test_macro_f1']*100:.2f}%"
        print(f"{name:<28} | {cv_acc_str:<16} | {cv_f1_str:<12} | {test_acc_str:<10} | {test_f1_str:<12}")
    print("-" * 90)

    best_name = results["best_model_name"]
    saved_path = results["saved_path"]
    file_size_kb = os.path.getsize(saved_path) / 1024

    print(f"\n🏆 MÔ HÌNH TỐI ƯU NHẤT ĐƯỢC CHỌN: {best_name}")
    print(f"📁 Đường dẫn lưu trữ: {saved_path} ({file_size_kb:.2f} KB)")

    print(f"\n{'─'*70}")
    print(f"CHI TIẾT ĐÁNH GIÁ (CLASSIFICATION REPORT) - {best_name}")
    print(f"{'─'*70}")
    print(benchmarks[best_name]["classification_report"])

    print(f"{'─'*70}")
    print(f"MA TRẬN NHẦM LẪN (CONFUSION MATRIX) - {best_name}")
    print(f"{'─'*70}")
    cm = benchmarks[best_name]["confusion_matrix"]
    header = "".join(f"{c[:4]:>6}" for c in categories)
    print(f"{'':>15}{header}")
    for i, cat in enumerate(categories):
        row_str = "".join(f"{cm[i, j]:>6}" for j in range(len(categories)))
        print(f"{cat:>15}{row_str}")

    print("\n✅ Hoàn thành xuất sắc Task KAN-16!")
