"""Script to create sample_data/eval_nlp.csv with 120-200 rows of diverse Vietnamese banking transactions."""
import csv
import os

# Schema: date,description,amount,true_category
rows = [
    # =========================================================
    # FOOD (15 samples)
    # =========================================================
    ("2026-01-05", "Highlands Coffee Nguyen Trai", -55000, "Food"),
    ("2026-01-08", "GrabFood don hang Com tam Ba Ghien", -89000, "Food"),
    ("2026-02-10", "Thanh toan Phuc Long Tea & Coffee", -65000, "Food"),
    ("2026-02-15", "Pho Bat Dan an sang", -55000, "Food"),
    ("2026-03-01", "KFC Vincom mua ga ran", -129000, "Food"),
    ("2026-03-18", "Starbucks Reserve Nguyen Hue", -135000, "Food"),
    ("2026-04-07", "ShopeeFood tra sua Gong Cha", -72000, "Food"),
    ("2026-04-22", "Lotteria burger + nuoc", -89000, "Food"),
    ("2026-05-10", "TIEN AN TRUA COM VAN PHONG", -45000, "Food"),
    ("2026-06-02", "Haidilao Hotpot Vincom Landmark", -950000, "Food"),
    ("2026-07-15", "McDonald's Bitexco", -149000, "Food"),
    ("2026-08-20", "AN SANG BANH CUON NONG", -35000, "Food"),
    ("2026-09-05", "The Coffee House Le Loi thanh toan", -65000, "Food"),
    ("2026-10-12", "Baemin don hang bun bo Hue", -78000, "Food"),
    ("2026-11-03", "An toi nha hang hai san Phu Quoc", -680000, "Food"),

    # =========================================================
    # TRANSPORT (15 samples)
    # =========================================================
    ("2026-01-10", "GrabBike di lam SG-DL", -35000, "Transport"),
    ("2026-01-20", "Nap tien tai khoan VETC thu phi duong bo", -500000, "Transport"),
    ("2026-02-05", "Cay xang Petrolimex Le Van Sy", -150000, "Transport"),
    ("2026-02-25", "beCar di gap khach hang", -85000, "Transport"),
    ("2026-03-15", "Xanh SM Taxi Nguyen Hue", -120000, "Transport"),
    ("2026-04-10", "Ve xe khach Phuong Trang SG-DL", -350000, "Transport"),
    ("2026-05-01", "GRAB BIKE CHUYEN DI", -28000, "Transport"),
    ("2026-05-20", "Vietjet Air ve may bay HAN-SGN", -1250000, "Transport"),
    ("2026-06-15", "Tiem sua xe Honda thay nhot", -250000, "Transport"),
    ("2026-07-08", "Gui xe may toa nha Keangnam", -15000, "Transport"),
    ("2026-08-14", "Vietnam Airlines SGN-HAN", -2500000, "Transport"),
    ("2026-09-12", "Rua xe oto bot tuyet Nguyen Trai", -120000, "Transport"),
    ("2026-10-05", "Uber di chuyen noi thanh", -95000, "Transport"),
    ("2026-10-20", "PHI DUONG BO CAO TOC LONG THANH", -45000, "Transport"),
    ("2026-11-08", "Be Taxi san bay TSN", -180000, "Transport"),

    # =========================================================
    # SHOPPING (15 samples)
    # =========================================================
    ("2026-01-15", "Shopee VN thanh toan don hang 123456", -350000, "Shopping"),
    ("2026-02-08", "Lazada order 654321", -189000, "Shopping"),
    ("2026-03-01", "Tiki mua sach va do gia dung", -120000, "Shopping"),
    ("2026-03-25", "WinMart+ Pham Ngoc Thach mua thuc pham", -280000, "Shopping"),
    ("2026-04-15", "Uniqlo Vincom Center mua ao khoac", -899000, "Shopping"),
    ("2026-05-10", "The Gioi Di Dong phu kien dien thoai", -350000, "Shopping"),
    ("2026-05-28", "Co.opmart Ha Noi sieu thi cuoi tuan", -450000, "Shopping"),
    ("2026-06-12", "TikTok Shop mua quan ao thoi trang", -290000, "Shopping"),
    ("2026-07-01", "MUA SAM SIEU THI COOPMART", -380000, "Shopping"),
    ("2026-07-20", "Hasaki Beauty my pham cham soc da", -320000, "Shopping"),
    ("2026-08-05", "Decathlon mua do the thao", -599000, "Shopping"),
    ("2026-09-10", "CellphoneS mua tai nghe bluetooth", -850000, "Shopping"),
    ("2026-10-03", "THANH TOAN LAZADA DON HANG 789012", -219000, "Shopping"),
    ("2026-10-18", "IKEA Viet Nam mua ke sach", -1200000, "Shopping"),
    ("2026-11-15", "Vincom mua sam quan ao H&M", -750000, "Shopping"),

    # =========================================================
    # UTILITIES (15 samples)
    # =========================================================
    ("2026-01-05", "EVN HCMC thanh toan tien dien thang 01", -650000, "Utilities"),
    ("2026-02-05", "Internet FPT Telecom cuoc thang 02", -220000, "Utilities"),
    ("2026-03-05", "Cong ty cap nuoc Sawaco tien nuoc", -95000, "Utilities"),
    ("2026-04-05", "Nap tien dien thoai Mobifone", -100000, "Utilities"),
    ("2026-05-05", "VNPT Fiber cuoc internet gia dinh", -187000, "Utilities"),
    ("2026-06-05", "Phi quan ly chung cu thang 06", -800000, "Utilities"),
    ("2026-07-05", "TIEN DIEN EVN THANG 07", -720000, "Utilities"),
    ("2026-08-01", "Viettel Telecom cuoc truyen hinh cap", -150000, "Utilities"),
    ("2026-09-05", "Vinaphone tra sau cuoc thue bao", -180000, "Utilities"),
    ("2026-10-01", "ViettelPay nap the cao Viettel", -200000, "Utilities"),
    ("2026-11-01", "Tien gas Petrovietnam 12kg", -420000, "Utilities"),
    ("2026-11-05", "Phi ve sinh moi truong to dan pho", -50000, "Utilities"),
    ("2026-04-18", "TT TIEN DIEN EVN THANG 04", -580000, "Utilities"),
    ("2026-08-20", "PHI INTERNET FPT THANG 08", -220000, "Utilities"),
    ("2026-10-15", "Nap tien Viettel tra sau cuoc thang 10", -350000, "Utilities"),

    # =========================================================
    # ENTERTAINMENT (15 samples)
    # =========================================================
    ("2026-01-15", "CGV Cinemas Aeon Mall ve xem phim", -220000, "Entertainment"),
    ("2026-02-01", "Steam Game Purchase Black Myth Wukong", -750000, "Entertainment"),
    ("2026-03-01", "Nap the Garena Lien Quan Mobile", -100000, "Entertainment"),
    ("2026-04-10", "BHD Star Cineplex ve xem phim", -180000, "Entertainment"),
    ("2026-05-01", "Ve xem concert Anh Trai Say Hi", -1500000, "Entertainment"),
    ("2026-06-15", "Karaoke ICOOL phong hat", -650000, "Entertainment"),
    ("2026-07-01", "Lotte Cinema Nguyen Trai", -130000, "Entertainment"),
    ("2026-08-01", "Goi tap gym California Fitness thang 08", -650000, "Entertainment"),
    ("2026-08-20", "Nintendo eShop mua game digital", -450000, "Entertainment"),
    ("2026-09-01", "Tour du lich Da Lat 3N2D", -2800000, "Entertainment"),
    ("2026-09-15", "Bowling Vincom Landmark 81", -180000, "Entertainment"),
    ("2026-10-01", "VE XEM PHIM CGV", -200000, "Entertainment"),
    ("2026-11-01", "Nap kim cuong Mobile Legends MLBB", -120000, "Entertainment"),
    ("2026-07-25", "Ve xem kich kich nghe thuat Ha Noi", -350000, "Entertainment"),
    ("2026-10-20", "Goi tap yoga studio thang 10", -800000, "Entertainment"),

    # =========================================================
    # HEALTH (15 samples)
    # =========================================================
    ("2026-01-20", "Nha thuoc FPT Long Chau mua thuoc", -125000, "Health"),
    ("2026-02-10", "Pharmacity Pham Ngoc Thach thuoc cam", -85000, "Health"),
    ("2026-03-05", "Benh vien Bach Mai phi kham benh", -350000, "Health"),
    ("2026-04-01", "Kham rang Nha khoa Kim tram rang", -500000, "Health"),
    ("2026-05-15", "Tiem ngua vac xin VNVC", -850000, "Health"),
    ("2026-06-10", "Phong kham Da khoa Medlatec", -450000, "Health"),
    ("2026-07-01", "Nha thuoc An Khang thuc pham chuc nang", -250000, "Health"),
    ("2026-07-20", "Mua que test Covid va khau trang", -65000, "Health"),
    ("2026-08-15", "Phi bao hiem suc khoe Bao Viet", -2500000, "Health"),
    ("2026-09-01", "THUOC CAM VA VITAMIN", -120000, "Health"),
    ("2026-10-01", "Benh vien Cho Ray xet nghiem mau", -650000, "Health"),
    ("2026-11-01", "Mat kinh Sai Gon do mat va cat kinh", -950000, "Health"),
    ("2026-05-28", "Mua vitamin D3 va Omega 3 Pharmacity", -189000, "Health"),
    ("2026-08-30", "BHYT nop phi bao hiem y te nam 2026", -900000, "Health"),
    ("2026-10-15", "Kham phu khoa phong kham An Phu", -400000, "Health"),

    # =========================================================
    # SUBSCRIPTIONS (14 samples)
    # =========================================================
    ("2026-01-01", "Netflix monthly subscription Standard", -180000, "Subscriptions"),
    ("2026-01-01", "Spotify Premium Individual", -59000, "Subscriptions"),
    ("2026-01-15", "OpenAI ChatGPT Plus monthly", -500000, "Subscriptions"),
    ("2026-02-01", "Apple iCloud 200GB storage", -59000, "Subscriptions"),
    ("2026-02-15", "Cursor Pro AI assistant", -499000, "Subscriptions"),
    ("2026-03-01", "YouTube Premium Family", -149000, "Subscriptions"),
    ("2026-03-15", "GitHub Copilot Individual", -259000, "Subscriptions"),
    ("2026-04-01", "Microsoft 365 Personal", -149000, "Subscriptions"),
    ("2026-04-15", "Claude Pro Anthropic subscription", -500000, "Subscriptions"),
    ("2026-05-01", "Google One 100GB cuoc hang thang", -45000, "Subscriptions"),
    ("2026-05-15", "Duolingo Super annual subscription", -690000, "Subscriptions"),
    ("2026-06-01", "Canva Pro subscription", -199000, "Subscriptions"),
    ("2026-07-01", "Notion Plus workspace monthly", -129000, "Subscriptions"),
    ("2026-08-01", "Adobe Creative Cloud Photography", -349000, "Subscriptions"),

    # =========================================================
    # INCOME (14 samples)
    # =========================================================
    ("2026-01-05", "Luong thang 01 tu Cong ty CP Cong nghe FPT", 25000000, "Income"),
    ("2026-01-15", "Thuong KPI quy 4 nam 2025", 8000000, "Income"),
    ("2026-02-05", "Techcombank chuyen khoan tra luong thang 02", 22000000, "Income"),
    ("2026-02-20", "Hoan tien don hang Shopee VN 234567", 350000, "Income"),
    ("2026-03-05", "LUONG THANG 03", 24000000, "Income"),
    ("2026-03-20", "Li xi dau nam moi Binh Ngo", 1000000, "Income"),
    ("2026-04-05", "Nhan thanh toan hop dong freelancer", 5000000, "Income"),
    ("2026-05-05", "Luong thang 05 FPT Software", 25500000, "Income"),
    ("2026-06-01", "Tien lai tiet kiem ky han thang 06", 850000, "Income"),
    ("2026-07-15", "Nhan tien hoan thue thu nhap ca nhan", 2500000, "Income"),
    ("2026-08-05", "Thuong du an chuyen doi so Q2", 10000000, "Income"),
    ("2026-09-10", "Co tuc bang tien mat nam 2026", 3500000, "Income"),
    ("2026-10-05", "NHAN TIEN CONG TAC PHI THANG 10", 1500000, "Income"),
    ("2026-11-05", "Luong thang 11 Vingroup JSC", 28000000, "Income"),

    # =========================================================
    # TRANSFER (14 samples)
    # =========================================================
    ("2026-01-25", "Chuyen khoan den Nguyen Van A qua VietQR", -500000, "Transfer"),
    ("2026-02-01", "Chuyen tien tra tien phong tro thang 02", -4500000, "Transfer"),
    ("2026-02-20", "Nap tien vao vi MoMo tu VCB", -1000000, "Transfer"),
    ("2026-03-10", "MBBank chuyen tien mien phi Napas 247 cho Tran Thi B", -200000, "Transfer"),
    ("2026-04-01", "Chuyen tien vao tai khoan Tiet kiem online", -5000000, "Transfer"),
    ("2026-04-15", "Rut tien tu vi MoMo ve tai khoan ngan hang", -500000, "Transfer"),
    ("2026-05-01", "CHUYEN KHOAN TIEN PHONG", -4800000, "Transfer"),
    ("2026-05-20", "Chuyen khoan gop tien sinh nhat Le Van Cuong", -200000, "Transfer"),
    ("2026-06-10", "Chuyen tien den STK 091238491823", -300000, "Transfer"),
    ("2026-07-01", "Chuyen tien noi bo sang tai khoan thanh toan phu", -2000000, "Transfer"),
    ("2026-08-15", "Chuyen tien thanh toan tien vay tieu dung", -1500000, "Transfer"),
    ("2026-09-01", "Chuyen tien tra no ban be Pham Minh Duc", -800000, "Transfer"),
    ("2026-10-05", "Nap ZaloPay tu tai khoan Techcombank", -500000, "Transfer"),
    ("2026-11-10", "CK cho Nguyen Thi Hoa tien sinh nhat", -300000, "Transfer"),

    # =========================================================
    # OTHER (14 samples)
    # =========================================================
    ("2026-01-01", "Phi duy tri tai khoan VCB Digibank thang 01", -11000, "Other"),
    ("2026-02-01", "Giao dich FT2601029484910", -500000, "Other"),
    ("2026-03-01", "GD ma TRX260148291038 qua he thong Napas", -200000, "Other"),
    ("2026-04-01", "Rut tien mat tai cay ATM ngoai he thong", -1000000, "Other"),
    ("2026-05-01", "Phi tin nhan SMS Banking bien dong so du", -33000, "Other"),
    ("2026-06-01", "POS00129381 THANH TOAN THE", -350000, "Other"),
    ("2026-07-01", "BDS001298319", -150000, "Other"),
    ("2026-08-01", "Rut tien mat tai ATM cung ngan hang", -2000000, "Other"),
    ("2026-09-01", "Phi chuyen tien quoc te ngoai te", -220000, "Other"),
    ("2026-10-01", "Dieu chinh chenh lech so du he thong", -15000, "Other"),
    ("2026-11-01", "Quyen gop quy tu thien vi nguoi ngheo", -200000, "Other"),
    ("2026-11-10", "Phi giao dich the tin dung quoc te POS", -85000, "Other"),
    ("2026-06-20", "THANH TOAN 350000 VND", -350000, "Other"),
    ("2026-09-25", "Phi ATM ngoai he thong rut tien", -6600, "Other"),

    # =========================================================
    # CHALLENGE / AMBIGUOUS CASES (28 samples)
    # =========================================================
    # Mã mờ đục (Other)
    ("2026-01-11", "FT26121840021039", -200000, "Other"),
    ("2026-02-14", "MB IB 20260214123456 THANH TOAN", -400000, "Other"),
    ("2026-03-20", "VCB IB 20260320987654 GD CHUYEN TIEN", -300000, "Other"),
    ("2026-04-11", "NAP TIEN 20260411", -50000, "Other"),

    # Chuyển tiền mơ hồ (Transfer)
    ("2026-01-30", "Chuyen tien cho anh minh", -300000, "Transfer"),
    ("2026-03-22", "CK den STK 1234567890 NGUYEN VAN B", -1000000, "Transfer"),
    ("2026-07-10", "Chuyen cho chi gai tien cho thang nay", -500000, "Transfer"),
    ("2026-08-25", "NAPAS247 CK DEN TRAN VAN C", -800000, "Transfer"),

    # ShopeeFood / GrabFood → Food (không phải Shopping)
    ("2026-02-28", "ShopeeFood don hang bun bo Hue", -78000, "Food"),
    ("2026-04-28", "GrabFood com ga xoi mo Quan 1", -65000, "Food"),
    ("2026-06-18", "BAEMIN DON HANG PHO BO", -89000, "Food"),
    ("2026-09-14", "ShopeeFood tra sua Mixue 3 ly", -99000, "Food"),

    # GrabCar / taxi → Transport (không phải Other)
    ("2026-03-08", "GrabCar den san bay Tan Son Nhat", -120000, "Transport"),
    ("2026-05-14", "GoCar dat xe di quan 7", -95000, "Transport"),
    ("2026-07-22", "BE CAR DI CHUYEN NOI THANH", -75000, "Transport"),
    ("2026-11-12", "GrabCar Noi Bai Airport ride", -280000, "Transport"),

    # Nạp game / subcription nhầm
    ("2026-05-18", "Nap tien Google Play Store", -100000, "Subscriptions"),
    ("2026-09-20", "Apple App Store mua app 1 lan", -79000, "Subscriptions"),

    # ATM / rút tiền mặt (Other)
    ("2026-04-25", "POS 123456 TAI CHUOI TIEN LOI", -180000, "Other"),
    ("2026-10-10", "GD POS THANH TOAN CUOI KY", -500000, "Other"),

    # Thu nhập mơ hồ (Income)
    ("2026-04-30", "Hoan tien tu cong ty bao hiem", 2000000, "Income"),
    ("2026-07-30", "Nhan tien dat coc tu khach thue nha", 5000000, "Income"),

    # Utilities dạng mã ngân hàng
    ("2026-06-25", "TT HOA DON EVN THANG 06 020481829", -680000, "Utilities"),
    ("2026-10-25", "VNPT TELECOM CUOC THOAI THANG 10", -150000, "Utilities"),

    # Health / Gym mơ hồ
    ("2026-03-28", "Goi tap Gym Elite Fitness thang 03", -750000, "Entertainment"),
    ("2026-11-20", "KHAM SK DINH KY CONG TY", -0, "Health"),

    # Shopping mơ hồ vs Food
    ("2026-08-10", "Shopee mua thuc pham kho an lien", -189000, "Shopping"),
    ("2026-11-25", "Circle K mua nuoc ngot va banh", -45000, "Food"),
]

# Output path
output_path = r"e:\Work\Developer\University's Studies\DATN\budgetbot-aws\sample_data\eval_nlp.csv"
old_path    = r"e:\Work\Developer\University's Studies\DATN\budgetbot-aws\sample_data\eval_sample.csv"

# Write with utf-8-sig (BOM) so Excel opens correctly
with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["date", "description", "amount", "true_category"])
    writer.writerows(rows)

print(f"Written {len(rows)} rows to {output_path}")

# Category counts
from collections import Counter
counts = Counter(r[3] for r in rows)
for cat, cnt in sorted(counts.items()):
    print(f"  {cat}: {cnt}")

# Delete old file
if os.path.exists(old_path):
    os.remove(old_path)
    print(f"\nDeleted old file: {old_path}")
else:
    print(f"\nOld file not found (already deleted?): {old_path}")
