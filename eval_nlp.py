"""Root entry point for NLP Model Evaluation Script (KAN-18).

Usage:
    python eval_nlp.py
    python eval_nlp.py --dataset sample_data/eval_nlp.csv --output docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md
"""
import sys
from pathlib import Path

# Forward to scripts/eval_nlp.py
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.eval_nlp import main

if __name__ == "__main__":
    main()
