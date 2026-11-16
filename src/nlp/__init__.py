"""NLP module for BudgetBot.

Includes preprocessing, tokenization, model inference, and classification pipelines.
"""
from src.nlp.preprocessor import (
    VietnamesePreprocessor,
    preprocess,
    normalize_unicode,
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

__all__ = [
    "VietnamesePreprocessor",
    "preprocess",
    "normalize_unicode",
    "tokenize_vietnamese",
    "clean_bank_description",
    "build_vectorizer",
    "fit_vectorizer_on_dataset",
    "load_vectorizer",
    "transform_texts",
    "DEFAULT_MODEL_PATH",
]

