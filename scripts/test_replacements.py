"""Test proposed replacements to ensure 0 overlap post-preprocessing."""
import csv, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.nlp.preprocessor import preprocess

ROOT = Path(__file__).resolve().parents[1]

# Load train cleaned
train_cleaned = set()
with open(ROOT / "sample_data" / "vietnamese_transactions_1000.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        train_cleaned.add(preprocess(row["description"].strip()).lower())

replacements = [
    # Shopping (2)
    ("Tiki Trading mua gia sach go cong nghiep", "Shopping"),
    ("The Gioi Di Dong mua cu sac nhanh Anker", "Shopping"),
    # Utilities (2)
    ("VNPT Ha Noi thanh toan cuoc vien thong tap trung", "Utilities"),
    ("Cap nuoc Cho Lon thu tien nuoc sinh hoat ky moi", "Utilities"),
    # Entertainment (2)
    ("Billiards Club giai tri cuoi tuan voi ban be", "Entertainment"),
    ("Ve tham quan bao tang chung tich chien tranh", "Entertainment"),
    # Health (2)
    ("Nha khoa Kim cay ghep implant rang cua", "Health"),
    ("Phong kham da khoa Medlatec lay mau xet nghiem tai nha", "Health"),
    # Subscriptions (1)
    ("iCloud Plus dung luong 2TB gia han dinh ky", "Subscriptions"),
    # Income (6)
    ("Cong ty Co phan VNG chi tra thu lao cong tac vien", "Income"),
    ("Tien lai tien gui tiet kiem ky han 6 thang", "Income"),
    ("Thu nhap ban khoa hoc truc tuyen tren Udemy", "Income"),
    ("Khach hang chuyen khoan tien thue nha thang nay", "Income"),
    ("Lixi dau nam moi tu sep phong kinh doanh", "Income"),
    ("Tien thuong cuoc thi sang tao ky thuat so", "Income"),
    # Transfer (4)
    ("Gui tien tieu vat cho em gai hoc dai hoc xa nha", "Transfer"),
    ("Chia tien bua lau toi qua gui lai Truong", "Transfer"),
    ("Chuyen khoan tra no tien mua ho do hom truoc", "Transfer"),
    ("Chuyen tien dat coc thue can ho studio", "Transfer"),
    # Other (6)
    ("Nop phat vi pham hanh chinh vi pham giao thong duong bo", "Other"),
    ("Le phi cong chung chung thuc hop dong mua ban", "Other"),
    ("Phi thuong nien the ghi no noi dia Napas", "Other"),
    ("Ung ho dong bao bi thiet hai do bao lu mien Trung", "Other"),
    ("Phi cap lai phoi the ATM bi mat tai quay", "Other"),
    ("Tien gui xe qua dem tai ben xe Mien Dong", "Other"),
]

print(f"Testing {len(replacements)} candidate replacements...")
overlap_count = 0
for raw, cat in replacements:
    c = preprocess(raw).lower()
    if c in train_cleaned:
        print(f"⚠️ STILL OVERLAPS: {raw} -> {c}")
        overlap_count += 1
    else:
        print(f"✅ CLEAN: {raw} -> '{c}' [{cat}]")

print(f"\nTotal overlaps with train set: {overlap_count}")

