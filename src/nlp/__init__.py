"""NLP module for BudgetBot.

Includes preprocessing, tokenization, model inference, and classification pipelines.
"""
from src.nlp.preprocessor import (
    VietnamesePreprocessor,
    preprocess,
    normalize_unicode,
    remove_vietnamese_accents,
    tokenize_vietnamese,
    clean_bank_description,
)
from src.nlp.vectorizer import (
    build_vectorizer,
    fit_vectorizer_on_dataset,
    load_vectorizer,
    transform_texts,
    DEFAULT_MODEL_PATH,
)
from src.nlp.classifier import (
    train_and_compare_models,
    load_classifier,
    DEFAULT_CLASSIFIER_PATH,
)
from src.nlp.predictor import (
    predict_transaction,
    get_models,
)

__all__ = [
    "VietnamesePreprocessor",
    "preprocess",
    "normalize_unicode",
    "remove_vietnamese_accents",
    "tokenize_vietnamese",
    "clean_bank_description",
    "build_vectorizer",
    "fit_vectorizer_on_dataset",
    "load_vectorizer",
    "transform_texts",
    "DEFAULT_MODEL_PATH",
    "train_and_compare_models",
    "load_classifier",
    "DEFAULT_CLASSIFIER_PATH",
    "predict_transaction",
    "get_models",
]

