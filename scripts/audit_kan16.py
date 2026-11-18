"""
KAN-16 — Full model audit: classification_report + confusion matrix.
Checks for data leakage and pipeline correctness.
"""
import csv
import sys
import warnings
import numpy as np
from collections import Counter
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from src.nlp.preprocessor import preprocess

# ── Load datasets ──────────────────────────────────────────────────────────────
def load_csv(path, text_col="description", label_col="true_category"):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            lbl = r.get(label_col) or r.get("category", "")
            txt = r.get(text_col, "")
            if txt.strip() and lbl.strip():
                rows.append((txt.strip(), lbl.strip()))
    return zip(*rows)

ROOT = Path(__file__).resolve().parents[1]
X_train_raw, y_train = load_csv(ROOT / "sample_data" / "vietnamese_transactions_1000.csv", label_col="category")
X_eval_raw, y_eval   = load_csv(ROOT / "sample_data" / "eval_nlp.csv", label_col="true_category")
X_train_raw, y_train = list(X_train_raw), list(y_train)
X_eval_raw, y_eval   = list(X_eval_raw), list(y_eval)

# Preprocess
X_train = [preprocess(t) for t in X_train_raw]
X_eval  = [preprocess(t) for t in X_eval_raw]

print(f"Train: {len(X_train)} samples | Eval: {len(X_eval)} samples")
print(f"Categories: {sorted(set(y_train))}\n")

# ── Check leak ─────────────────────────────────────────────────────────────────
train_set = set(x.lower() for x in X_train)
eval_set  = set(x.lower() for x in X_eval)
leaks = train_set & eval_set
print(f"[LEAK CHECK] Overlap between train & eval (preprocessed): {len(leaks)} → {'⚠️ LEAKAGE!' if leaks else '✅ CLEAN'}\n")

# ── Pipeline-based CV (correct: vectorizer refit per fold) ─────────────────────
CATEGORIES = sorted(set(y_train))

def make_pipelines():
    tfidf_params = dict(ngram_range=(1, 2), max_features=3000, sublinear_tf=True)
    return {
        "Linear SVC (Calibrated)": Pipeline([
            ("tfidf", TfidfVectorizer(**tfidf_params)),
            ("clf",  CalibratedClassifierCV(LinearSVC(C=1.0, random_state=42), cv=5)),
        ]),
        "Multinomial Naive Bayes": Pipeline([
            ("tfidf", TfidfVectorizer(**tfidf_params)),
            ("clf",  MultinomialNB(alpha=0.1)),
        ]),
        "Logistic Regression": Pipeline([
            ("tfidf", TfidfVectorizer(**tfidf_params)),
            ("clf",  LogisticRegression(C=5.0, max_iter=1000, random_state=42)),
        ]),
    }

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

print("=" * 90)
print(f"{'Model':<28} | {'CV Acc':^18} | {'CV F1 (macro)':^14} | {'Test Acc':^9} | {'Test F1':^9}")
print("=" * 90)

results = {}
for name, pipe in make_pipelines().items():
    cv_acc = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="accuracy")
    cv_f1  = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="f1_macro")

    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_eval)

    test_acc = accuracy_score(y_eval, y_pred)
    test_f1  = f1_score(y_eval, y_pred, average="macro", zero_division=0)

    results[name] = {
        "pipe": pipe,
        "y_pred": y_pred,
        "cv_acc_mean": cv_acc.mean(),
        "cv_acc_std":  cv_acc.std(),
        "cv_f1_mean":  cv_f1.mean(),
        "test_acc": test_acc,
        "test_f1":  test_f1,
    }
    print(
        f"{name:<28} | {cv_acc.mean()*100:6.2f}% (±{cv_acc.std()*100:.2f}%) | "
        f"{cv_f1.mean()*100:>6.2f}%        | {test_acc*100:>6.2f}%  | {test_f1*100:>6.2f}%"
    )

print("=" * 90)

# ── Per-class report for each model ───────────────────────────────────────────
for name, r in results.items():
    print(f"\n{'─'*60}")
    print(f"[{name}] — Classification Report (Test Set)")
    print(f"{'─'*60}")
    print(classification_report(y_eval, r["y_pred"], target_names=CATEGORIES, zero_division=0))

# ── Confusion matrix for best model (by test F1) ──────────────────────────────
best = max(results, key=lambda k: results[k]["test_f1"])
y_pred_best = results[best]["y_pred"]
cm = confusion_matrix(y_eval, y_pred_best, labels=CATEGORIES)

print(f"\n{'='*60}")
print(f"Confusion Matrix — {best}")
print(f"{'='*60}")
header = "".join(f"{c[:4]:>6}" for c in CATEGORIES)
print(f"{'':>14}{header}")
for i, row_lbl in enumerate(CATEGORIES):
    row_str = "".join(f"{cm[i,j]:>6}" for j in range(len(CATEGORIES)))
    print(f"{row_lbl:>14}{row_str}")

print(f"\n✅ Best model on test set: {best} (F1={results[best]['test_f1']*100:.2f}%)")

