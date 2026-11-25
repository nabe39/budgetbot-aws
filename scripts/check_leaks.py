"""Find and display the 25 leaked samples between train and eval (after preprocessing)."""
import csv, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.nlp.preprocessor import preprocess

ROOT = Path(__file__).resolve().parents[1]

train_map = {}
with open(ROOT / "sample_data" / "vietnamese_transactions_1000.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        clean = preprocess(row["description"].strip())
        train_map[clean.lower()] = (row["description"].strip(), row["category"].strip())

eval_rows = []
with open(ROOT / "sample_data" / "eval_nlp.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        clean = preprocess(row["description"].strip())
        eval_rows.append({
            "raw": row["description"].strip(),
            "clean": clean.lower(),
            "cat": row.get("true_category", row.get("category", "")).strip()
        })

leaks = [(r, train_map[r["clean"]]) for r in eval_rows if r["clean"] in train_map]
print(f"Total leaks: {len(leaks)}\n")
for i, (e, (t_raw, t_cat)) in enumerate(leaks, 1):
    same_cat = "✅" if e["cat"] == t_cat else "⚠️ DIFF CAT"
    print(f"{i:2}. [{same_cat}] EVAL: {e['raw']!r} ({e['cat']})")
    print(f"     TRAIN: {t_raw!r} ({t_cat})")

