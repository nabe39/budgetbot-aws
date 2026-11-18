"""Inspect and replace the 25 leaked rows in eval_nlp.csv."""
import csv, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.nlp.preprocessor import preprocess

ROOT = Path(__file__).resolve().parents[1]

# 1. Load train cleaned set
train_cleaned = set()
with open(ROOT / "sample_data" / "vietnamese_transactions_1000.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        train_cleaned.add(preprocess(row["description"].strip()).lower())

# 2. Load eval_nlp.csv
eval_rows = []
with open(ROOT / "sample_data" / "eval_nlp.csv", encoding="utf-8-sig") as f:
    eval_rows = list(csv.DictReader(f))

# Define mapping from old description to new description
replacements_map = {
    "Shopee VN thanh toan don hang 123456": "Tiki Trading mua gia sach go cong nghiep",
    "Lazada order 654321": "The Gioi Di Dong mua cu sac nhanh Anker",
    "Phi quan ly chung cu thang 06": "VNPT Ha Noi thanh toan cuoc vien thong tap trung",
    "TT TIEN DIEN EVN THANG 04": "Cap nuoc Cho Lon thu tien nuoc sinh hoat ky moi",
    "Goi tap gym California Fitness thang 08": "Billiards Club giai tri cuoi tuan voi ban be",
    "Tour du lich Da Lat 3N2D": "Ve tham quan bao tang chung tich chien tranh",
    "Benh vien Bach Mai phi kham benh": "Nha khoa Kim cay ghep implant rang cua",
    "Benh vien Cho Ray xet nghiem mau": "Phong kham da khoa Medlatec lay mau xet nghiem tai nha",
    "Google One 100GB cuoc hang thang": "iCloud Plus dung luong 2TB gia han dinh ky",
    "Luong thang 01 tu Cong ty CP Cong nghe FPT": "Cong ty Co phan VNG chi tra thu lao cong tac vien",
    "Thuong KPI quy 4 nam 2025": "Tien lai tien gui tiet kiem ky han 6 thang",
    "Techcombank chuyen khoan tra luong thang 02": "Thu nhap ban khoa hoc truc tuyen tren Udemy",
    "Hoan tien don hang Shopee VN 234567": "Khach hang chuyen khoan tien thue nha thang nay",
    "Nhan thanh toan hop dong freelancer": "Lixi dau nam moi tu sep phong kinh doanh",
    "Co tuc bang tien mat nam 2026": "Tien thuong cuoc thi sang tao ky thuat so",
    "Chuyen tien vao tai khoan Tiet kiem online": "Gui tien tieu vat cho em gai hoc dai hoc xa nha",
    "Chuyen tien den STK 091238491823": "Chia tien bua lau toi qua gui lai Truong",
    "Chuyen tien noi bo sang tai khoan thanh toan phu": "Chuyen khoan tra no tien mua ho do hom truoc",
    "Chuyen tien thanh toan tien vay tieu dung": "Chuyen tien dat coc thue can ho studio",
    "Giao dich FT2601029484910": "Nop phat vi pham hanh chinh vi pham giao thong duong bo",
    "GD ma TRX260148291038 qua he thong Napas": "Le phi cong chung chung thuc hop dong mua ban",
    "Phi chuyen tien quoc te ngoai te": "Phi thuong nien the ghi no noi dia Napas",
    "Dieu chinh chenh lech so du he thong": "Ung ho dong bao bi thiet hai do bao lu mien Trung",
    "Quyen gop quy tu thien vi nguoi ngheo": "Phi cap lai phoi the ATM bi mat tai quay",
    "Phi giao dich the tin dung quoc te POS": "Tien gui xe qua dem tai ben xe Mien Dong",
}

replaced_count = 0
for r in eval_rows:
    desc = r["description"].strip()
    if desc in replacements_map:
        r["description"] = replacements_map[desc]
        replaced_count += 1

print(f"Replaced {replaced_count} descriptions in eval_nlp.csv")
assert replaced_count == 25, f"Expected 25 replacements, got {replaced_count}"

# Write back to sample_data/eval_nlp.csv
fieldnames = list(eval_rows[0].keys())
with open(ROOT / "sample_data" / "eval_nlp.csv", mode="w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(eval_rows)

print("Saved updated sample_data/eval_nlp.csv")

# Now verify leaks again
eval_cleaned = set()
overlaps = []
for r in eval_rows:
    c = preprocess(r["description"]).lower()
    if c in train_cleaned:
        overlaps.append((r["description"], c))

print(f"Remaining overlaps after fix: {len(overlaps)}")
if overlaps:
    for o in overlaps:
        print("  Still overlapping:", o)
else:
    print("🎉 100% CLEAN! Zero leaks between train and eval sets!")

