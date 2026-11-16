"""Unit tests for TF-IDF Vectorizer module (KAN-15)."""
from pathlib import Path
import pytest
from scipy.sparse import spmatrix
from sklearn.feature_extraction.text import TfidfVectorizer

from src.nlp.vectorizer import (
    build_vectorizer,
    fit_vectorizer_on_dataset,
    load_vectorizer,
    transform_texts,
    DEFAULT_MODEL_PATH,
    DEFAULT_DATASET_PATH,
)


class TestTFIDFVectorizerConfiguration:
    def test_build_vectorizer_hyperparameters(self):
        """Verify vectorizer hyperparameters match KAN-15 requirements."""
        vec = build_vectorizer()
        assert isinstance(vec, TfidfVectorizer)
        assert vec.ngram_range == (1, 2)
        assert vec.max_features == 3000

    def test_saved_model_file_exists(self):
        """Verify tfidf_vectorizer.joblib exists at the expected path."""
        assert DEFAULT_MODEL_PATH.exists()
        assert DEFAULT_MODEL_PATH.stat().st_size > 1024  # Greater than 1 KB


class TestTFIDFVectorizerLoadingAndInference:
    def test_load_vectorizer(self):
        """Verify load_vectorizer returns a fitted TfidfVectorizer."""
        vec = load_vectorizer(DEFAULT_MODEL_PATH)
        assert isinstance(vec, TfidfVectorizer)
        assert hasattr(vec, "vocabulary_")
        assert len(vec.vocabulary_) > 1000
        assert len(vec.vocabulary_) <= 3000

    def test_transform_raw_banking_descriptions(self):
        """Verify transforming raw banking descriptions into feature vectors."""
        vec = load_vectorizer(DEFAULT_MODEL_PATH)
        sample_queries = [
            "Thanh toán tiền điện EVN tháng 05",
            "Highlands Coffee Nguyen Trai mua ca phe",
            "Chuyen khoan tien phong tro",
            "GD ma TRX12345 qua Napas",
        ]
        X = transform_texts(sample_queries, vectorizer=vec, preprocess_input=True)
        assert isinstance(X, spmatrix)
        assert X.shape[0] == len(sample_queries)
        assert X.shape[1] == len(vec.vocabulary_)
        # Non-zero entries exist for recognizable banking terms
        assert X.nnz > 0

    def test_transform_unseen_words_graceful_handling(self):
        """Verify completely out-of-vocabulary words don't crash."""
        vec = load_vectorizer(DEFAULT_MODEL_PATH)
        X = transform_texts(["xyzqwerty randomwordunknown"], vectorizer=vec)
        assert X.shape[0] == 1
        assert X.shape[1] == len(vec.vocabulary_)
        # Out-of-vocabulary produces all-zero vector
        assert X.nnz == 0

    def test_transform_empty_string(self):
        vec = load_vectorizer(DEFAULT_MODEL_PATH)
        X = transform_texts(["", "   "], vectorizer=vec)
        assert X.shape[0] == 2
        assert X.nnz == 0


class TestDatasetFittingAndOutput:
    def test_fit_on_actual_dataset(self, tmp_path):
        """Verify fitting on the actual 1,000-sample dataset produces expected matrix."""
        test_model_path = tmp_path / "test_tfidf.joblib"
        vec, X = fit_vectorizer_on_dataset(
            dataset_path=DEFAULT_DATASET_PATH,
            output_path=test_model_path,
            ngram_range=(1, 2),
            max_features=3000,
        )
        assert X.shape[0] == 1000
        assert X.shape[1] <= 3000
        assert test_model_path.exists()

