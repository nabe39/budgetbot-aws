#!/usr/bin/env python3
"""Generate a realistic Vietnamese bank transactions dataset (500 - 1000+ rows).

Targeted for NLP classification benchmarks, model fine-tuning, and BudgetBot evaluation.
Covers 10 PascalCase categories:
    Food, Transport, Shopping, Utilities, Entertainment,
    Health, Subscriptions, Income, Transfer, Other

Supported Banks/E-Wallets:
    Vietcombank, Techcombank, MBBank, VietinBank, VPBank, ACB, MoMo, ZaloPay
"""
import argparse
import csv
import datetime
import random
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Health",
    "Subscriptions",
    "Income",
    "Transfer",
    "Other",
]

BANKS = [
    "Vietcombank",
    "Techcombank",
    "MBBank",
    "VietinBank",
    "VPBank",
    "ACB",
    "MoMo",
    "ZaloPay"
]

# ─────────────────────────── VOCABULARY ──────────────────────────────────────

NAMES = [
    "Nguyen Van An", "Tran Thi Bich", "Le Van Cuong", "Pham Minh Duc",
    "Hoang Ngoc Lan", "Vu Thi Mai", "Doan Quoc Bao", "Bui Thi Thu",
    "Dang Huu Tai", "Ngo Thi Kim", "Duong Van Nam", "Phan Thanh Dat",
    "Vo Thi Hoa", "Nguyen Thi Phuong", "Tran Van Hung", "Le Thi Thuy",
    "Pham Van Long", "Hoang Thi Nga", "Vu Van Thanh", "Do Thi Hien",
    "Nguyen Minh Tuan", "Tran Thi Loan", "Le Hoang Nam", "Pham Thi Ly",
    "Bui Van Quang", "Dang Thi Yen", "Ngo Van Phuc", "Luu Thi Thu Ha",
    "Trinh Van Khanh", "Dinh Thi Ngoc Anh", "Cao Van Duc", "Ly Thi Kim Ngan",
]

LOCATIONS = [
    "Nguyen Trai", "Ba Trieu", "Tran Duy Hung", "Landmark 81",
    "Nguyen Hue", "Le Van Sy", "Cau Giay", "Hai Ba Trung",
    "Pham Ngoc Thach", "Le Duan", "Phan Xich Long", "Thao Dien",
    "Quan 1 HCM", "Quan 7 HCM", "Binh Thanh", "Thu Duc",
    "Dong Da HN", "Hoan Kiem HN", "Tay Ho HN", "Long Bien HN",
    "Nam Tu Liem HN", "Thanh Xuan HN", "Hoang Mai HN",
    "Go Vap HCM", "Tan Binh HCM", "Phu Nhuan HCM",
]

MALLS = [
    "Vincom Center", "Crescent Mall", "Aeon Mall", "Lotte Mall",
    "Van Hanh Mall", "Giga Mall", "Parkson", "Saigon Centre",
    "Bitexco Financial Tower", "Royal City HN", "Times City HN",
    "Vincom Mega Mall", "SC VivoCity", "Estella Place", "Landmark 81 Mall",
]

FOOD_ITEMS = [
    "com ga xoi mo", "tra sua oolong", "bun bo Hue", "banh mi thit nuong",
    "pizza hai san", "ga ran gion", "mi Quang suon bi", "banh xeo mien Tay",
    "chao long beo nhieu tieu", "bun moc thap cam",
]

MERCHANTS = [
    "Phuc Long", "Tra sua Tocotoco", "Com tam Ba Ghien",
    "Bun dau Co Hang", "Banh cuon Tay Ho", "Bun rieu Co Linh",
    "Pho Quynh", "Chao ba Giay", "Banh mi Lan Chi",
]

ROUTES = [
    "SG-DL", "HAN-SGN", "DAD-SGN", "HAN-DAD",
    "SG-VungTau", "SG-CanTho", "HAN-HPH", "SGN-PQC",
    "HAN-DLT", "SGN-NHA",
]

GAMES = [
    "Black Myth Wukong", "Elden Ring", "FC 25", "Cyberpunk 2077",
    "Dota 2 Battle Pass", "Valorant Points", "Genshin Impact Genesis Crystals",
    "League of Legends RP", "PUBG UC", "Call of Duty Points",
]

CONCERTS = [
    "Anh Trai Say Hi", "Anh Trai Vuot Ngan Chong Gai",
    "Ha Anh Tuan Live", "Den Vau Show", "Moc Tour",
    "Son Tung MTP World Tour", "Blackpink Hanoi",
]

BUILDINGS = [
    "Keangnam", "Bitexco", "Vietcombank Tower", "Landmark 72",
    "Deutsches Haus", "Diamond Plaza", "Saigon Times Square",
    "Lotte Center HN",
]

MONTHS = ["01", "02", "03", "04", "05", "06",
          "07", "08", "09", "10", "11", "12"]

BRANCH_CODES = [
    "01", "02", "03", "04", "05",
    "HN01", "HN02", "HN03",
    "SGN01", "SGN02", "SGN03",
    "DN01", "CT01", "HP01",
]

# 1 200 unique 9-digit transaction codes (pre-generated pool)
TX_CODES: list[str] = [f"{i:09d}" for i in range(100_000_000, 101_200_000)]


# ─────────────────────────── TEMPLATES ───────────────────────────────────────

TEMPLATES: dict[str, list[tuple[str, tuple[int, int]]]] = {
    # ── Food ─────────────────────────────────────────────────────────────────
    "Food": [
        ("Highlands Coffee {location}", (35_000, 150_000)),
        ("Thanh toan Phuc Long Tea & Coffee {branch}", (40_000, 180_000)),
        ("The Coffee House {location}", (39_000, 160_000)),
        ("Starbucks Reserve {location}", (90_000, 290_000)),
        ("Pho Bat Dan an sang", (45_000, 110_000)),
        ("Tien an trua com tam Cali", (55_000, 120_000)),
        ("Bun cha Huong Lien {branch}", (60_000, 150_000)),
        ("Banh mi Huynh Hoa {location}", (38_000, 85_000)),
        ("ShopeeFood {food_item}", (45_000, 220_000)),
        ("GrabFood don hang {merchant}", (50_000, 260_000)),
        ("KFC {branch} thanh toan don hang", (89_000, 320_000)),
        ("Lotteria Vincom {location}", (65_000, 210_000)),
        ("McDonald's {branch}", (79_000, 280_000)),
        ("Pizza 4P's {location}", (350_000, 1_500_000)),
        ("Haidilao Hotpot {location}", (500_000, 2_400_000)),
        ("Kichi Kichi lau bang chuyen {location}", (250_000, 890_000)),
        ("Sumo BBQ nuong lau {location}", (380_000, 1_200_000)),
        ("Tra sua Gong Cha {branch}", (45_000, 130_000)),
        ("ToCoToCo Bubble Tea {location}", (32_000, 95_000)),
        ("Circle K mua do an nhe {location}", (25_000, 95_000)),
        ("Quan com van phong {location}", (35_000, 65_000)),
        ("Lau de 404 {location}", (280_000, 950_000)),
        ("Hai san Bien Dong tiec toi {location}", (450_000, 2_200_000)),
        ("An sang banh cuon nong {location}", (30_000, 60_000)),
        ("Tra da via he va banh ngot {location}", (15_000, 45_000)),
        # Dạng không dấu SMS ngân hàng
        ("TT TIEN AN TRUA {location}", (40_000, 120_000)),
        ("CK tien an trua cho {name}", (35_000, 150_000)),
        ("GRAB FOOD ORDER {merchant}", (50_000, 260_000)),
        ("SHOPEEFOOD {food_item} DON HANG {tx_code}", (45_000, 220_000)),
        ("TT CAFE HIGHLANDS {branch}", (35_000, 160_000)),
        ("PIZZA HUT {location} THANH TOAN", (200_000, 900_000)),
        ("JOLLIBEE {location} FAST FOOD", (75_000, 300_000)),
        ("BURGER KING {location}", (79_000, 280_000)),
        ("BEAMIN ORDER {food_item}", (45_000, 220_000)),
        ("LAZYFOOD {merchant} ORDER", (50_000, 180_000)),
    ],

    # ── Transport ────────────────────────────────────────────────────────────
    "Transport": [
        ("GrabBike chuyen di {route}", (18_000, 65_000)),
        ("GrabCar den {dest}", (50_000, 280_000)),
        ("beBike di lam", (16_000, 55_000)),
        ("beCar di gap khach hang", (65_000, 320_000)),
        ("Xanh SM Taxi {dest}", (45_000, 250_000)),
        ("Xanh SM Bike {location}", (18_000, 70_000)),
        ("Cay xang Petrolimex {location}", (50_000, 1_200_000)),
        ("Do xang PVOIL Nguyen Huu Canh", (60_000, 800_000)),
        ("Do xang Shell Petrol {location}", (50_000, 600_000)),
        ("Nap tien tai khoan thu phi VETC", (200_000, 1_000_000)),
        ("Nap the thu phi tu dong ePass", (300_000, 1_500_000)),
        ("Gui xe may toa nha {building}", (5_000, 30_000)),
        ("Gui oto qua dem {location}", (50_000, 200_000)),
        ("Ve xe khach Phuong Trang SG-DL", (250_000, 450_000)),
        ("Ve tau hoa SE1 {route}", (450_000, 1_300_000)),
        ("Vietjet Air ve may bay {route}", (750_000, 3_200_000)),
        ("Vietnam Airlines HAN-SGN khuu hoi", (1_600_000, 5_500_000)),
        ("Bamboo Airways {route}", (950_000, 3_800_000)),
        ("Tiem sua xe Honda thay nhot va sam xe {location}", (120_000, 650_000)),
        ("Rua xe oto bot tuyet {location}", (80_000, 180_000)),
        # Dạng không dấu
        ("TT PHI GUI XE {building}", (5_000, 30_000)),
        ("GRAB BIKE {route}", (18_000, 65_000)),
        ("GRAB CAR {dest}", (50_000, 280_000)),
        ("DO XANG PETROLIMEX {location}", (50_000, 1_200_000)),
        ("THANH TOAN VETC {tx_code}", (200_000, 1_000_000)),
        ("VE MAY BAY VIETJET {route}", (750_000, 3_200_000)),
        ("VE XE KHACH HOANG LONG {route}", (150_000, 400_000)),
        ("TIEM SUA XE {location}", (100_000, 650_000)),
        ("NAP EPASS {branch_code} {tx_code}", (300_000, 1_500_000)),
        ("TAXI VINASUN {dest}", (50_000, 300_000)),
    ],

    # ── Shopping ─────────────────────────────────────────────────────────────
    "Shopping": [
        ("Shopee VN thanh toan don hang {tx_code}", (65_000, 1_250_000)),
        ("Lazada order {tx_code}", (89_000, 950_000)),
        ("Tiki mua sach va do gia dung", (120_000, 780_000)),
        ("TikTok Shop mua quan ao thoi trang", (150_000, 650_000)),
        ("WinMart+ {location} mua thuc pham", (95_000, 580_000)),
        ("Co.opmart {location} sieu thi cuoi tuan", (250_000, 1_600_000)),
        ("Big C / Tops Market rau cu qua", (180_000, 980_000)),
        ("Lotte Mart {location}", (220_000, 1_450_000)),
        ("Aeon Mall {location} mua sam", (350_000, 2_500_000)),
        ("Uniqlo {mall} mua ao khoac", (499_000, 1_890_000)),
        ("Zara Vincom mua quan tay", (799_000, 2_490_000)),
        ("The Gioi Di Dong phu kien dien thoai {location}", (150_000, 890_000)),
        ("FPT Shop mua cap sac nhanh {location}", (180_000, 650_000)),
        ("CellphoneS mua tai nghe bluetooth {location}", (350_000, 1_850_000)),
        ("Dien May Xanh noi com dien {location}", (450_000, 2_200_000)),
        ("Hasaki Beauty & Clinic my pham {location}", (180_000, 950_000)),
        ("Guardian mua do cham soc ca nhan {location}", (120_000, 540_000)),
        ("Bach Hoa Xanh mua thit ca {location}", (85_000, 420_000)),
        ("Nha sach Phuong Nam mua dung cu hoc tap", (65_000, 320_000)),
        ("Decathlon mua do the thao {location}", (199_000, 1_290_000)),
        # Dạng không dấu
        ("SHOPEE VN {tx_code}", (65_000, 1_250_000)),
        ("LAZADA ORDER {tx_code}", (89_000, 950_000)),
        ("TIKI {tx_code}", (120_000, 780_000)),
        ("TIKTOK SHOP {tx_code}", (150_000, 650_000)),
        ("WINMART {location}", (95_000, 580_000)),
        ("COOPMART {location}", (250_000, 1_600_000)),
        ("DIEN MAY XANH {location}", (450_000, 2_200_000)),
        ("THE GIOI DI DONG {location}", (150_000, 890_000)),
        ("HASAKI {location} MY PHAM", (180_000, 950_000)),
        ("GUARDIAN {location}", (120_000, 540_000)),
    ],

    # ── Utilities ────────────────────────────────────────────────────────────
    "Utilities": [
        ("EVN Ha Noi tien dien thang {month}", (350_000, 2_800_000)),
        ("EVN HCMC thanh toan tien dien {month}", (420_000, 3_200_000)),
        ("Cong ty cap nuoc Sawaco tien nuoc thang {month}", (65_000, 350_000)),
        ("Nuoc sach Song Da thang {month}", (75_000, 280_000)),
        ("Internet FPT Telecom cuoc thang {month}", (220_000, 440_000)),
        ("VNPT Fiber cuoc internet gia dinh thang {month}", (187_000, 374_000)),
        ("Viettel Telecom cuoc truyen hinh cap thang {month}", (150_000, 330_000)),
        ("Nap tien dien thoai Mobifone thang {month}", (50_000, 300_000)),
        ("ViettelPay nap the cao Viettel thang {month}", (50_000, 500_000)),
        ("Vinaphone tra sau cuoc thue bao thang {month}", (100_000, 400_000)),
        ("Phi ve sinh moi truong to dan pho thang {month}", (30_000, 80_000)),
        ("Phi quan ly chung cu thang {month}", (350_000, 1_200_000)),
        ("Phi gui xe va nuoc sinh hoat thang {month}", (150_000, 500_000)),
        ("Tien gas Petrovietnam 12kg thang {month}", (380_000, 460_000)),
        # Dạng không dấu SMS ngân hàng
        ("TT TIEN DIEN EVN THANG {month}", (350_000, 3_200_000)),
        ("TT CUOC INTERNET FPT THANG {month}", (220_000, 440_000)),
        ("TT TIEN NUOC SAWACO THANG {month}", (65_000, 350_000)),
        ("TT CUOC VIETTEL THANG {month}", (100_000, 500_000)),
        ("TT PHI QUAN LY CHUNG CU THANG {month}", (350_000, 1_200_000)),
        ("NAP DIEN THOAI MOBIFONE {month}", (50_000, 300_000)),
        ("TT TIEN GAS PETROVIETNAM THANG {month}", (380_000, 460_000)),
        ("TT CUOC VNPT THANG {month}", (187_000, 374_000)),
        ("TT CUOC TRUYEN HINH CAP THANG {month}", (150_000, 330_000)),
        ("TT CUOC VINAPHONE THANG {month}", (100_000, 400_000)),
    ],

    # ── Entertainment ────────────────────────────────────────────────────────
    "Entertainment": [
        ("CGV Cinemas {mall} ve xem phim", (110_000, 380_000)),
        ("Lotte Cinema {location}", (95_000, 280_000)),
        ("Galaxy Cinema {location} bap nuoc", (85_000, 250_000)),
        ("BHD Star Cineplex ve xem phim {location}", (100_000, 290_000)),
        ("Steam Game Purchase {game}", (150_000, 1_450_000)),
        ("Nintendo eShop mua game digital", (250_000, 1_350_000)),
        ("Nap the Garena Lien Quan Mobile", (50_000, 500_000)),
        ("Nap game VNG ZingXu", (50_000, 400_000)),
        ("Ve xem concert {concert}", (650_000, 3_500_000)),
        ("Karaoke ICOOL phong hat va do uong {location}", (450_000, 1_950_000)),
        ("Tour du lich Da Lat 3N2D {tx_code}", (1_800_000, 4_500_000)),
        ("Khach san Da Nang resort {tx_code}", (750_000, 3_800_000)),
        ("Goi tap gym California Fitness thang {month}", (450_000, 1_200_000)),
        ("Bowling Vincom Landmark 81 {location}", (120_000, 350_000)),
        ("Ve tham quan Thao Cam Vien", (40_000, 160_000)),
        ("Billiards Club danh bida voi ban {location}", (80_000, 300_000)),
        ("Escape Room {location} tro choi giai tri", (200_000, 500_000)),
        ("The thao Fit24 thang {month}", (350_000, 900_000)),
        ("Nap game Genshin Impact {tx_code}", (50_000, 1_600_000)),
        ("Nap Valorant Points {tx_code}", (100_000, 800_000)),
        ("Mua ve Anh Trai Show {location}", (650_000, 3_500_000)),
        ("Ve concert {concert} qua Ticket Box", (650_000, 3_500_000)),
        ("Khu vui choi Happy Land {location}", (100_000, 400_000)),
        ("Aqua Park {location} ve vao cua", (150_000, 600_000)),
        ("Cho thue xe dap dien {location}", (50_000, 200_000)),
    ],

    # ── Health ───────────────────────────────────────────────────────────────
    "Health": [
        ("Nha thuoc FPT Long Chau mua thuoc {location}", (45_000, 680_000)),
        ("Pharmacity {location} thuoc cam va vitamin", (55_000, 520_000)),
        ("Nha thuoc An Khang thuc pham chuc nang {location}", (85_000, 750_000)),
        ("Benh vien Bach Mai phi kham benh {tx_code}", (150_000, 850_000)),
        ("Benh vien Cho Ray xet nghiem mau {tx_code}", (250_000, 1_450_000)),
        ("Phong kham Da khoa Medlatec {location}", (180_000, 1_200_000)),
        ("Kham rang Nha khoa Kim tram rang {location}", (200_000, 1_800_000)),
        ("Mat kinh Sai Gon do mat va cat kinh", (350_000, 1_950_000)),
        ("Tiem ngua vac xin tai VNVC {location}", (450_000, 2_800_000)),
        ("Mua thuoc Panadol va siro ho {location}", (35_000, 120_000)),
        ("Vien Phi tai Mytour Clinic {tx_code}", (300_000, 1_500_000)),
        ("Mua que test Covid va khau trang y te", (45_000, 150_000)),
        ("Phi bao hiem suc khoe Bao Viet thang {month}", (1_200_000, 4_500_000)),
        ("PHARMACITY {location} MUA THUOC", (55_000, 520_000)),
        ("LONG CHAU {location} THUOC BO", (45_000, 680_000)),
        ("VINMEC {location} PHI KHAM {tx_code}", (300_000, 2_000_000)),
        ("HONG NGOC HOSPITAL PHI KHAM {tx_code}", (200_000, 1_500_000)),
        ("COLUMBIA ASIA {location} PHI KHAM", (350_000, 2_000_000)),
        ("Kham mat ban khoa {location}", (100_000, 800_000)),
        ("Mua vi sinh Yakult va vitamin {location}", (45_000, 200_000)),
        ("Phong kham MEDIPLUS {location}", (200_000, 1_200_000)),
        ("Benh vien Nhi Trung Uong phi kham {tx_code}", (150_000, 850_000)),
    ],

    # ── Subscriptions ────────────────────────────────────────────────────────
    "Subscriptions": [
        ("Netflix monthly subscription Standard", (180_000, 260_000)),
        ("Netflix monthly subscription Premium", (260_000, 290_000)),
        ("Netflix monthly subscription Basic", (120_000, 160_000)),
        ("Spotify Premium Individual thang {month}", (59_000, 89_000)),
        ("Apple iCloud 200GB storage thang {month}", (59_000, 199_000)),
        ("Google One 100GB cuoc hang thang {month}", (45_000, 99_000)),
        ("OpenAI ChatGPT Plus monthly thang {month}", (490_000, 520_000)),
        ("Cursor Pro AI assistant thang {month}", (480_000, 510_000)),
        ("YouTube Premium Family thang {month}", (79_000, 149_000)),
        ("Microsoft 365 Personal thang {month}", (149_000, 1_290_000)),
        ("Claude Pro Anthropic subscription thang {month}", (490_000, 520_000)),
        ("GitHub Copilot Individual thang {month}", (245_000, 260_000)),
        ("Adobe Creative Cloud Photography thang {month}", (245_000, 550_000)),
        ("Duolingo Super annual subscription", (590_000, 990_000)),
        ("Canva Pro subscription thang {month}", (149_000, 299_000)),
        ("VIU Premium goi phim chau A thang {month}", (59_000, 99_000)),
        ("HBO Max subscription thang {month}", (199_000, 299_000)),
        ("Disney+ subscription thang {month}", (199_000, 299_000)),
        ("Notion Plus workspace thang {month}", (99_000, 199_000)),
        ("Figma Professional thang {month}", (499_000, 599_000)),
        ("Vercel Pro hosting thang {month}", (499_000, 599_000)),
        ("AWS Lightsail instance thang {month}", (150_000, 500_000)),
        ("Namecheap domain renewal {tx_code}", (250_000, 800_000)),
        ("Cloudflare Pro plan thang {month}", (149_000, 499_000)),
        ("Windscribe VPN subscription thang {month}", (99_000, 299_000)),
    ],

    # ── Income ───────────────────────────────────────────────────────────────
    "Income": [
        ("Luong thang {month} tu Cong ty CP Cong nghe FPT", (18_000_000, 45_000_000)),
        ("Techcombank chuyen khoan tra luong thang {month}", (15_000_000, 38_000_000)),
        ("Nhan tien thuong du an chuyen doi so Q{quarter}", (3_000_000, 15_000_000)),
        ("Thuong KPI quy {quarter} nam 2026", (2_500_000, 12_000_000)),
        ("Hoan tien don hang Shopee VN {tx_code}", (85_000, 1_250_000)),
        ("Hoan tien giao dich mua sam Tiki {tx_code}", (120_000, 680_000)),
        ("Tien lai tiet kiem ky han thang {month}", (450_000, 3_800_000)),
        ("Nhan thanh toan hop dong freelancer {tx_code}", (3_500_000, 18_000_000)),
        ("Nhan tien hoan thue thu nhap ca nhan nam 2025", (1_200_000, 6_500_000)),
        ("Li xi dau nam moi Binh Ngo tu {name}", (500_000, 3_000_000)),
        ("Chuyen tien thu ho ban do cu tu {name}", (250_000, 1_800_000)),
        ("Co tuc bang tien mat nam 2026 {tx_code}", (1_500_000, 8_500_000)),
        ("LUONG THANG {month} CONG TY {tx_code}", (15_000_000, 45_000_000)),
        ("THUONG DU AN QUY {quarter} {tx_code}", (2_500_000, 15_000_000)),
        ("HOAN TIEN LAZADA {tx_code}", (85_000, 950_000)),
        ("TIEN LAI TIET KIEM THANG {month} {tx_code}", (450_000, 3_800_000)),
        ("Nhan luong part-time thang {month} tu {name}", (3_000_000, 10_000_000)),
        ("Thu nhap from Upwork {tx_code}", (5_000_000, 25_000_000)),
        ("Thu nhap Fiverr USD {tx_code}", (3_000_000, 15_000_000)),
        ("Nhan tien hoan tra vay {name} {tx_code}", (500_000, 5_000_000)),
        ("Ban hang Shopee thu nhap thang {month}", (2_000_000, 12_000_000)),
        ("Thu nhap YouTube Creator thang {month}", (1_500_000, 10_000_000)),
    ],

    # ── Transfer ─────────────────────────────────────────────────────────────
    "Transfer": [
        ("Chuyen khoan den {name} qua VietQR", (50_000, 5_000_000)),
        ("Chuyen tien tra tien an trua cho {name}", (35_000, 250_000)),
        ("Nap tien vao vi MoMo tu VCB", (100_000, 3_000_000)),
        ("Rut tien tu vi MoMo ve tai khoan ngan hang", (200_000, 5_000_000)),
        ("Chuyen tien vao tai khoan Tiet kiem online {tx_code}", (1_000_000, 20_000_000)),
        ("MBBank chuyen tien mien phi Napas 247 cho {name}", (100_000, 4_500_000)),
        ("Chuyen tien tra tien phong tro thang {month} cho {name}", (2_500_000, 6_500_000)),
        ("Chuyen khoan gop tien sinh nhat {name}", (100_000, 300_000)),
        ("Chuyen tien den STK {tx_code}", (50_000, 2_000_000)),
        ("Chuyen tien thanh toan tien vay tieu dung {tx_code}", (800_000, 3_500_000)),
        ("Chuyen tien noi bo sang tai khoan thanh toan phu {tx_code}", (500_000, 5_000_000)),
        ("Chuyen tien ung truoc tien mua do ho cho {name}", (150_000, 950_000)),
        # Dạng mã ngân hàng thực tế
        ("MB GD{tx_code} CHUYEN TIEN DEN {name}", (50_000, 5_000_000)),
        ("VCB IB {tx_code} CK DEN {name}", (50_000, 5_000_000)),
        ("TCB {branch_code} TRANSFER {tx_code} TO {name}", (100_000, 4_000_000)),
        ("ACB CK {tx_code} DEN {name}", (100_000, 4_000_000)),
        ("VPB {branch_code} {tx_code} CHUYEN {name}", (100_000, 4_000_000)),
        ("VTB CK {tx_code} DEN {name}", (50_000, 3_000_000)),
        ("Zalopay chuyen tien {name} {tx_code}", (50_000, 5_000_000)),
        ("MoMo chuyen tien {name} {tx_code}", (50_000, 3_000_000)),
        ("Nap tien vi ZaloPay thang {month}", (100_000, 3_000_000)),
        ("Rut tien vi ZaloPay ve ngan hang {tx_code}", (200_000, 5_000_000)),
        ("CK tien thue nha thang {month} cho {name}", (2_500_000, 8_000_000)),
        ("Chuyen tien mua sam nhom cho {name} {tx_code}", (200_000, 2_000_000)),
    ],

    # ── Other ────────────────────────────────────────────────────────────────
    "Other": [
        ("Phi duy tri tai khoan VCB Digibank thang {month}", (11_000, 22_000)),
        ("Phi quan ly the ATM thuong nien {tx_code}", (55_000, 110_000)),
        ("Phi tin nhan SMS Banking bien dong so du thang {month}", (11_000, 33_000)),
        ("Giao dich FT{tx_code}", (50_000, 2_000_000)),
        ("GD ma TRX{tx_code} qua he thong Napas", (100_000, 1_500_000)),
        ("Phi chuyen tien quoc te ngoai te {tx_code}", (110_000, 350_000)),
        ("Quyen gop quy tu thien vi nguoi ngheo {tx_code}", (50_000, 500_000)),
        ("Rut tien mat tai cay ATM ngoai he thong {location}", (500_000, 3_000_000)),
        ("Rut tien mat tai ATM cung ngan hang {location}", (500_000, 5_000_000)),
        ("Giao dich chuyen tien bi an khong ro noi dung {tx_code}", (20_000, 500_000)),
        ("Thanh toan phi bao hiem xe may bat buoc {tx_code}", (66_000, 86_000)),
        ("Phi giao dich the tin dung quoc te POS {tx_code}", (25_000, 120_000)),
        ("Dieu chinh chenh lech so du he thong {tx_code}", (10_000, 100_000)),
        ("Phi phat sinh giao dich vuot han muc {tx_code}", (22_000, 55_000)),
        ("Phi chuyen doi ngoai te USD {tx_code}", (100_000, 500_000)),
        ("Nop thue tncn quy {quarter} nam 2026", (500_000, 5_000_000)),
        ("Phi nop ho so thu tuc hanh chinh {tx_code}", (20_000, 200_000)),
        ("Nop tien le phi {tx_code}", (10_000, 100_000)),
        ("PHIDN {tx_code} TRICH PHI THE", (11_000, 55_000)),
        ("NAPAS {tx_code} GD THE", (50_000, 2_000_000)),
        ("ATM RUTIEN {location} {tx_code}", (500_000, 5_000_000)),
        ("Phi phat cham tra no the tin dung {tx_code}", (100_000, 500_000)),
        ("Phi thuong nien the VISA PLATINUM {tx_code}", (200_000, 500_000)),
        ("Phi phat hanh the ghi no quoc te {tx_code}", (50_000, 200_000)),
        ("Giao dich test he thong {tx_code}", (1_000, 10_000)),
    ],
}


# ─────────────────────────── HELPERS ─────────────────────────────────────────

def _pick_tx_code(rng: random.Random) -> str:
    """Return a random 9-digit transaction code string."""
    return f"{rng.randint(100_000_000, 999_999_999)}"


def _format_description(template: str, rng: random.Random) -> str:
    """Fill dynamic slots in template using the given RNG instance."""
    tx_code = _pick_tx_code(rng)
    desc = template.format(
        location=rng.choice(LOCATIONS),
        branch=rng.choice(LOCATIONS),
        mall=rng.choice(MALLS),
        food_item=rng.choice(FOOD_ITEMS),
        merchant=rng.choice(MERCHANTS),
        route=rng.choice(ROUTES),
        dest=rng.choice(LOCATIONS),
        game=rng.choice(GAMES),
        concert=rng.choice(CONCERTS),
        building=rng.choice(BUILDINGS),
        name=rng.choice(NAMES),
        month=rng.choice(MONTHS),
        quarter=rng.randint(1, 4),
        plan=rng.choice(["Standard", "Premium", "Gia dinh", "4K"]),
        tx_code=tx_code,
        branch_code=rng.choice(BRANCH_CODES),
    )
    return desc


def _generate_records_for_category(
    cat: str,
    count: int,
    seed: int,
    start_date: datetime.date,
    total_days: int,
) -> list[dict]:
    """Generate *count* records (possibly with duplicates) for a single category."""
    rng = random.Random(seed)
    templates = TEMPLATES[cat]
    records: list[dict] = []

    for _ in range(count):
        tmpl, (min_amt, max_amt) = rng.choice(templates)
        desc = _format_description(tmpl, rng)

        raw_amt = rng.randint(min_amt // 1000, max_amt // 1000) * 1000
        final_amt = abs(raw_amt) if cat == "Income" else -abs(raw_amt)

        rand_days = rng.randint(0, total_days)
        tx_date = start_date + datetime.timedelta(days=rand_days)
        source_bank = rng.choice(BANKS)

        # Confidence benchmark
        desc_low = desc.lower()
        if "FT" in desc or "TRX" in desc or "bi an" in desc_low:
            confidence = "low"
        elif cat in ("Other", "Transfer") and (
            "STK" in desc or "giao dich" in desc_low or "napas" in desc_low
        ):
            confidence = "medium"
        else:
            confidence = "high"

        records.append({
            "date": tx_date.strftime("%Y-%m-%d"),
            "description": desc,
            "amount": final_amt,
            "category": cat,
            "source_bank": source_bank,
            "confidence_benchmark": confidence,
        })

    return records


# ─────────────────────────── PUBLIC API ──────────────────────────────────────

def generate_dataset(total_count: int = 1000, seed: int = 42) -> list[dict]:
    """Generate *total_count* transactions with UNIQUE descriptions across all categories.

    Strategy:
      1. Allocate target counts evenly across categories.
      2. For each category, over-generate (×4) and deduplicate until the
         per-category quota is met, retrying with shifted seeds (up to MAX_RETRIES).
      3. Collect all per-category unique records, final-dedup across categories,
         shuffle, and return.
      4. Raise ValueError if the global uniqueness target is unreachable.
    """
    MAX_RETRIES = 10
    OVERGEN_FACTOR = 4   # generate this many times the quota per retry

    base_per_cat = total_count // len(CATEGORIES)
    remainder = total_count % len(CATEGORIES)

    start_date = datetime.date(2026, 1, 1)
    end_date = datetime.date(2026, 11, 10)
    total_days = (end_date - start_date).days

    all_records: list[dict] = []
    global_seen: set[str] = set()

    for cat_idx, cat in enumerate(CATEGORIES):
        quota = base_per_cat + (1 if cat_idx < remainder else 0)
        cat_seed = seed + cat_idx * 7919  # unique per-category seed
        cat_unique: list[dict] = []
        cat_seen: set[str] = set()

        for attempt in range(MAX_RETRIES + 1):
            batch = _generate_records_for_category(
                cat,
                quota * OVERGEN_FACTOR,
                cat_seed + attempt * 100_003,
                start_date,
                total_days,
            )
            for rec in batch:
                d = rec["description"]
                if d not in cat_seen and d not in global_seen:
                    cat_seen.add(d)
                    cat_unique.append(rec)
                    if len(cat_unique) >= quota:
                        break

            if len(cat_unique) >= quota:
                break

            if attempt == MAX_RETRIES:
                raise ValueError(
                    f"[{cat}] Could not generate {quota} unique descriptions after "
                    f"{MAX_RETRIES + 1} attempts (got {len(cat_unique)}). "
                    "Expand TEMPLATES or VOCABULARY for this category."
                )

        # Commit this category's quota
        committed = cat_unique[:quota]
        for rec in committed:
            global_seen.add(rec["description"])
        all_records.extend(committed)

    # Sanity check
    if len(all_records) != total_count:
        raise ValueError(
            f"Expected {total_count} records but assembled {len(all_records)}."
        )

    unique_count = len({r["description"] for r in all_records})
    if unique_count < total_count:
        raise ValueError(
            f"Cross-category duplicate detected: only {unique_count} unique descriptions "
            f"in {total_count} records."
        )

    # Shuffle before returning (export will re-sort by date)
    rng = random.Random(seed)
    rng.shuffle(all_records)
    return all_records


def export_csv(records: list[dict], filepath: Path):
    """Write records sorted by date to CSV format."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    sorted_records = sorted(records, key=lambda x: x["date"])
    fieldnames = ["date", "description", "amount", "category", "source_bank", "confidence_benchmark"]
    with open(filepath, mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sorted_records)
    print(f"-> Successfully exported {len(records)} rows to CSV: {filepath}")


def export_xlsx(records: list[dict], filepath: Path):
    """Write records sorted by date to formatted Excel spreadsheet."""
    if not HAS_OPENPYXL:
        print("openpyxl is not installed, skipping xlsx export.")
        return

    filepath.parent.mkdir(parents=True, exist_ok=True)
    sorted_records = sorted(records, key=lambda x: x["date"])
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions_Benchmark"

    headers = [
        "Ngày GD (Date)",
        "Nội dung giao dịch (Description)",
        "Số tiền (Amount VND)",
        "Danh mục (Category)",
        "Ngân hàng (Source Bank)",
        "Độ tin cậy kỳ vọng (Confidence)",
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 26

    for r_idx, r in enumerate(sorted_records, start=2):
        ws.append([
            r["date"], r["description"], r["amount"],
            r["category"], r["source_bank"], r["confidence_benchmark"],
        ])
        amt_cell = ws.cell(row=r_idx, column=3)
        amt_cell.number_format = '#,##0 "₫"'
        if r["amount"] > 0:
            amt_cell.font = Font(color="15803D", bold=True)
        else:
            amt_cell.font = Font(color="B91C1C")
        ws.cell(row=r_idx, column=1).alignment = Alignment(horizontal="center")
        ws.cell(row=r_idx, column=4).alignment = Alignment(horizontal="center")
        ws.cell(row=r_idx, column=5).alignment = Alignment(horizontal="center")
        ws.cell(row=r_idx, column=6).alignment = Alignment(horizontal="center")

    col_widths = {1: 15, 2: 55, 3: 20, 4: 18, 5: 18, 6: 18}
    for col_num, w in col_widths.items():
        col_letter = openpyxl.utils.get_column_letter(col_num)
        ws.column_dimensions[col_letter].width = w

    wb.save(filepath)
    print(f"-> Successfully exported {len(records)} rows to Excel: {filepath}")


def print_statistics(records: list[dict]):
    """Print class balance, financial distribution, and uniqueness stats."""
    from collections import Counter

    cat_counts = Counter(r["category"] for r in records)
    bank_counts = Counter(r["source_bank"] for r in records)
    conf_counts = Counter(r["confidence_benchmark"] for r in records)
    unique_descs = len({r["description"] for r in records})

    total_income = sum(r["amount"] for r in records if r["amount"] > 0)
    total_expense = sum(abs(r["amount"]) for r in records if r["amount"] < 0)

    print("\n" + "=" * 55)
    print(f"  DATASET SUMMARY: {len(records)} TRANSACTIONS")
    print("=" * 55)

    print(f"\n0. Unique descriptions : {unique_descs} / {len(records)}")

    print("\n1. Phân bổ theo 10 Danh mục (Category Distribution):")
    for cat in CATEGORIES:
        cnt = cat_counts.get(cat, 0)
        pct = (cnt / len(records)) * 100
        print(f"   - {cat:<15}: {cnt:>4} mẫu ({pct:>5.1f}%)")

    print("\n2. Phân bổ theo Ngân hàng / Ví điện tử:")
    for bank, cnt in bank_counts.most_common():
        pct = (cnt / len(records)) * 100
        print(f"   - {bank:<15}: {cnt:>4} mẫu ({pct:>5.1f}%)")

    print("\n3. Phân bổ Độ tin cậy kỳ vọng (Confidence Benchmark):")
    for conf, cnt in conf_counts.most_common():
        pct = (cnt / len(records)) * 100
        print(f"   - {conf:<10}: {cnt:>4} mẫu ({pct:>5.1f}%)")

    print("\n4. Thống kê dòng tiền:")
    print(f"   - Tổng thu (Income) : +{total_income:,.0f} VND")
    print(f"   - Tổng chi (Expense): -{total_expense:,.0f} VND")
    print("=" * 55 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Vietnamese bank transaction dataset."
    )
    parser.add_argument(
        "--count", type=int, default=1000,
        help="Total number of transaction rows to generate (default: 1000)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--output-csv", type=str,
        default="sample_data/vietnamese_transactions_1000.csv",
        help="Path for CSV output",
    )
    parser.add_argument(
        "--output-xlsx", type=str,
        default="sample_data/vietnamese_transactions_1000.xlsx",
        help="Path for XLSX output",
    )
    args = parser.parse_args()

    print(f"Generating {args.count} unique transactions (seed={args.seed}) ...")
    records = generate_dataset(total_count=args.count, seed=args.seed)

    csv_path = Path(args.output_csv)
    xlsx_path = Path(args.output_xlsx)

    export_csv(records, csv_path)
    export_xlsx(records, xlsx_path)
    print_statistics(records)


if __name__ == "__main__":
    main()
