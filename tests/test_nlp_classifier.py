"""Unit tests for NLP Classifier module (KAN-16)."""
from pathlib import Path
import pytest

from src.nlp.classifier import (
    load_dataset,
    get_candidate_models,
    train_and_compare_models,
    load_classifier,
    DEFAULT_CLASSIFIER_PATH,
    DEFAULT_TRAIN_DATASET,
    DEFAULT_EVAL_DATASET,
)


class TestClassifierModelTraining:
    def test_candidate_models_definitions(self):
        """Verify candidate models include Linear SVC, Naive Bayes, and Logistic Regression."""
        models = get_candidate_models()
        assert "Linear SVC (Calibrated)" in models
        assert "Multinomial Naive Bayes" in models
        assert "Logistic Regression" in models

    def test_dataset_loading(self):
        """Verify train and eval datasets are loaded with non-empty samples and labels."""
        X_train, y_train = load_dataset(DEFAULT_TRAIN_DATASET, label_col="category")
        assert len(X_train) == 1000
        assert len(y_train) == 1000
        assert len(set(y_train)) == 10  # 10 categories

        X_eval, y_eval = load_dataset(DEFAULT_EVAL_DATASET, label_col="true_category")
        assert len(X_eval) > 100
        assert len(set(y_eval)) == 10

    def test_trained_model_file_exists(self):
        """Verify classifier_model.joblib exists and is loadable."""
        assert DEFAULT_CLASSIFIER_PATH.exists()
        model = load_classifier(DEFAULT_CLASSIFIER_PATH)
        assert hasattr(model, "predict")
        assert hasattr(model, "predict_proba")
        assert len(model.classes_) == 10


class TestBenchmarkExecution:
    def test_benchmark_returns_metrics(self, tmp_path):
        """Verify train_and_compare_models computes all required metrics."""
        test_out_path = tmp_path / "test_classifier.joblib"
        results = train_and_compare_models(output_classifier_path=test_out_path)
        assert "benchmark" in results
        assert "best_model_name" in results
        assert test_out_path.exists()

        benchmarks = results["benchmark"]
        for model_name, metrics in benchmarks.items():
            assert "cv_accuracy_mean" in metrics
            assert "cv_macro_f1_mean" in metrics
            assert "test_accuracy" in metrics
            assert "test_macro_f1" in metrics
            assert metrics["cv_macro_f1_mean"] > 0.85
            assert metrics["test_macro_f1"] > 0.80

