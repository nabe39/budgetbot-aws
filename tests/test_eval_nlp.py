"""Tests for NLP evaluation script (KAN-18 / FR-22)."""
import pytest
from pathlib import Path
from scripts.eval_nlp import run_evaluation, DEFAULT_DATASET


def test_eval_nlp_execution(tmp_path):
    """Verify run_evaluation executes completely and computes valid metrics."""
    output_report = tmp_path / "test_report.md"
    results = run_evaluation(
        dataset_path=DEFAULT_DATASET,
        output_report_path=output_report,
    )

    assert results["total_samples"] == 174
    assert 0.80 <= results["accuracy"] <= 1.0
    assert 0.80 <= results["macro_f1"] <= 1.0
    assert 0.80 <= results["macro_precision"] <= 1.0
    assert 0.80 <= results["macro_recall"] <= 1.0

    # Verify all 10 categories are in results
    assert len(results["categories"]) == 10

    # Verify confidence stratified analysis
    assert "high" in results["confidence_analysis"]
    assert "medium" in results["confidence_analysis"]
    assert "low" in results["confidence_analysis"]
    assert results["confidence_analysis"]["high"]["accuracy"] > 0.90

    # Verify markdown report was generated
    assert output_report.exists()
    content = output_report.read_text(encoding="utf-8")
    assert "Macro F1-Score" in content
    assert "Confusion Matrix" in content
