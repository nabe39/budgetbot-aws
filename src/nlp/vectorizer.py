"""TF-IDF Vectorizer module for BudgetBot NLP pipeline.

Implements KAN-15:
- Cấu hình TfidfVectorizer(ngram_range=(1, 2), max_features=3000) để biểu diễn văn bản mô tả giao dịch.
- Lưu vectorizer đã fit thành file tfidf_vectorizer.joblib.
"""
import os
import csv
import logging
from pathlib import Path
from typing import Any, Iterable, List, Optional, Tuple, Union

import joblib
from scipy.sparse import spmatrix
from sklearn.feature_extraction.text import TfidfVectorizer

from src.nlp.preprocessor import preprocess

logger = logging.getLogger(__name__)

# Default path for the serialized vectorizer model
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "tfidf_vectorizer.joblib"
DEFAULT_DATASET_PATH = Path(__file__).resolve().parents[2] / "sample_data" / "vietnamese_transactions_1000.csv"


def build_vectorizer(
    ngram_range: Tuple[int, int] = (1, 2),
    max_features: int = 3000,
    sublinear_tf: bool = True,
    min_df: int = 1,
    **kwargs: Any,
) -> TfidfVectorizer:
    """Build and configure a TfidfVectorizer instance according to KAN-15 specifications.

    Args:
        ngram_range: Lower and upper boundary of the n-values for n-grams (default: (1, 2)).
        max_features: Build a vocabulary that only considers the top max_features (default: 3000).
        sublinear_tf: Apply sublinear tf scaling, replacing tf with 1 + log(tf) (default: True).
        min_df: Ignore terms that have a document frequency strictly lower than given threshold (default: 1).
        **kwargs: Additional parameters passed to TfidfVectorizer.

    Returns:
        Configured TfidfVectorizer instance.
    """
    return TfidfVectorizer(
        ngram_range=ngram_range,
        max_features=max_features,
        sublinear_tf=sublinear_tf,
        min_df=min_df,
        **kwargs,
    )


def fit_vectorizer_on_dataset(
    dataset_path: Union[str, Path] = DEFAULT_DATASET_PATH,
    output_path: Union[str, Path] = DEFAULT_MODEL_PATH,
    ngram_range: Tuple[int, int] = (1, 2),
    max_features: int = 3000,
) -> Tuple[TfidfVectorizer, spmatrix]:
    """Load transaction descriptions from dataset CSV, preprocess, fit TF-IDF vectorizer, and save to disk.

    Args:
        dataset_path: Path to vietnamese_transactions_1000.csv.
        output_path: Path where tfidf_vectorizer.joblib will be saved.
        ngram_range: n-gram range (default: (1, 2)).
        max_features: Maximum features limit (default: 3000).

    Returns:
        Tuple of (fitted_vectorizer, transformed_matrix).
    """
    dataset_path = Path(dataset_path)
    output_path = Path(output_path)

    if not dataset_path.exists():
        raise FileNotFoundError(f"Training dataset not found: {dataset_path}")

    # Read transaction descriptions from CSV
    raw_texts = []
    with open(dataset_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            desc = row.get("description", "").strip()
            if desc:
                raw_texts.append(desc)

    logger.info(f"Loaded {len(raw_texts)} raw transaction descriptions from {dataset_path}")

    # Preprocess all texts with the KAN-14 preprocessor
    cleaned_texts = [preprocess(t) for t in raw_texts]

    # Initialize and fit vectorizer
    vectorizer = build_vectorizer(ngram_range=ngram_range, max_features=max_features)
    X = vectorizer.fit_transform(cleaned_texts)

    # Save fitted model to disk
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, output_path)
    logger.info(f"Saved fitted TF-IDF vectorizer to {output_path} (vocab size: {len(vectorizer.vocabulary_)})")

    return vectorizer, X


def load_vectorizer(model_path: Union[str, Path] = DEFAULT_MODEL_PATH) -> TfidfVectorizer:
    """Load a previously fitted and saved TfidfVectorizer from disk.

    Args:
        model_path: Path to tfidf_vectorizer.joblib.

    Returns:
        Fitted TfidfVectorizer instance.
    """
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Fitted TF-IDF vectorizer not found at {model_path}. "
            "Please run fit_vectorizer_on_dataset() first."
        )
    return joblib.load(model_path)


def transform_texts(
    texts: Iterable[str],
    vectorizer: Optional[TfidfVectorizer] = None,
    preprocess_input: bool = True,
) -> spmatrix:
    """Transform raw or preprocessed texts into TF-IDF sparse matrix using fitted vectorizer.

    Args:
        texts: Iterable of transaction strings.
        vectorizer: Fitted TfidfVectorizer instance (if None, loads from DEFAULT_MODEL_PATH).
        preprocess_input: Whether to apply preprocess() before vectorizing (default: True).

    Returns:
        Scipy sparse matrix of TF-IDF feature vectors.
    """
    if vectorizer is None:
        vectorizer = load_vectorizer()

    if preprocess_input:
        processed = [preprocess(t) for t in texts]
    else:
        processed = list(texts)

    return vectorizer.transform(processed)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print("=" * 60)
    print("  HUẤN LUYỆN & XUẤT TF-IDF VECTORIZER (KAN-15)")
    print("=" * 60)

    vec, mat = fit_vectorizer_on_dataset()

    vocab_size = len(vec.vocabulary_)
    features = vec.get_feature_names_out()
    file_size_kb = os.path.getsize(DEFAULT_MODEL_PATH) / 1024

    print(f"\n1. Tập dữ liệu đầu vào : {DEFAULT_DATASET_PATH.name}")
    print(f"2. Kích thước ma trận  : {mat.shape[0]} mẫu x {mat.shape[1]} đặc trưng")
    print(f"3. Kích thước từ vựng  : {vocab_size} từ/cụm từ (n-gram 1, 2; max_features=3000)")
    print(f"4. File model xuất ra  : {DEFAULT_MODEL_PATH} ({file_size_kb:.2f} KB)")
    print(f"5. Mẫu 20 đặc trưng đầu:")
    for i, feat in enumerate(features[:20], 1):
        print(f"   [{i:02d}] {feat}")
    print("\n✅ Hoàn thành xuất sắc Task KAN-15!")

