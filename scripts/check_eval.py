"""Check eval_nlp.csv stats and overlap with training data."""
import csv
from collections import Counter

# Check eval_nlp.csv
eval_rows = []
with open("sample_data/eval_nlp.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        eval_rows.append(dict(row))

print("=== eval_nlp.csv ===")
print(f"Total rows: {len(eval_rows)}")
print(f"Columns: {list(eval_rows[0].keys())}")

key = "true_category" if "true_category" in eval_rows[0] else "category"
cats = Counter(r.get(key, "").strip() for r in eval_rows)
print(f"Category col: '{key}'")
print("Category distribution:")
for c, n in sorted(cats.items()):
    print(f"  {c}: {n}")

# Check overlap with train
train_descs = set()
with open("sample_data/vietnamese_transactions_1000.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        train_descs.add(row["description"].strip().lower())

eval_descs = [r["description"].strip().lower() for r in eval_rows]
overlap = [d for d in eval_descs if d in train_descs]
print(f"\nTrain/Eval overlap: {len(overlap)} rows")
if overlap:
    for o in overlap[:5]:
        print(f"  LEAK: {o}")

