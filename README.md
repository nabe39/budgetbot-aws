# BudgetBot — Hệ thống Quản lý Chi tiêu Cá nhân (Web & Mobile)

Ứng dụng quản lý tài chính cá nhân hỗ trợ phân loại giao dịch tiếng Việt bằng NLP (**TF-IDF + Linear SVC**), nhập sao kê ngân hàng (`.csv`, `.xlsx`, `.pdf`, ảnh), thiết lập hạn mức chi tiêu và trợ lý hỏi đáp AI.

Dự án gồm 3 thành phần chính:
* **Backend API:** FastAPI + Python + Module NLP (`src/`)
* **Web App:** React + Vite (`frontend-react/`)
* **Mobile App:** React Native + Expo (`mobile-expo/`)

---

## 1. Cấu trúc thư mục

```text
budgetbot-aws/
├── src/                  # Backend FastAPI, NLP, adapters (PostgreSQL / SQLite)
├── database/migrations/  # Script SQL khởi tạo bảng & dữ liệu mẫu PostgreSQL
├── frontend-react/       # Giao diện Web (React + Vite, chạy cổng 5173)
├── mobile-expo/          # Ứng dụng Mobile (React Native + Expo Go)
├── sample_data/          # Dữ liệu sao kê & tập dữ liệu tiếng Việt mẫu
├── docker-compose.yml    # Khởi chạy PostgreSQL 15 bằng Docker
├── requirements.txt      # Thư viện Python cho Backend
└── .env.example          # File cấu hình mẫu cho Backend
```

---

## 2. Yêu cầu cài đặt trước

* **Python** >= 3.10 (khuyên dùng 3.12)
* **Node.js** >= 18 & `npm`
* **PostgreSQL 15** (chạy qua Docker Desktop hoặc kết nối tới máy khác qua LAN / Radmin VPN)
* Ứng dụng **Expo Go** trên điện thoại iOS / Android (để chạy thử app mobile)

---

## 3. Bước 1: Chuẩn bị Database & file `.env` cho Backend

### Cách A: Chạy PostgreSQL bằng Docker trên máy cá nhân
```bash
docker compose up -d
```

### Cách B: Kết nối tới PostgreSQL Docker trên máy khác (cùng Wi-Fi hoặc qua Radmin VPN)
1. Lấy IP của máy chạy Docker PostgreSQL (dạng `192.168.x.x` hoặc IP Radmin `26.x.x.x`).
2. Trên máy chạy Docker, đảm bảo đã mở Firewall cho port TCP `5432`.

### Tạo file `.env` ở thư mục gốc (`budgetbot-aws/.env`)
Copy từ `.env.example` sang `.env` và chỉnh lại thông tin kết nối:

```ini
AI_BACKEND=nlp_ml
STORAGE_BACKEND=local
STORAGE_LOCAL_DIR=./_data/uploads

# Chọn postgres (hoặc sqlite nếu muốn chạy nhanh không cần PostgreSQL)
USERSTORE_BACKEND=postgres
USERSTORE_POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/budgetbot
USERSTORE_SQLITE_PATH=./_data/transactions.db

JWT_SECRET=budgetbot-secure-jwt-secret-key-32bytes-auth-token
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=60
CORS_ORIGINS=*
```
*(Nếu dùng PostgreSQL ở máy khác, thay `localhost` trong `USERSTORE_POSTGRES_URL` bằng IP của máy đó.)*

---

## 4. Bước 2: Chạy Backend FastAPI

Mở terminal tại thư mục gốc `budgetbot-aws/`:

```powershell
# (Khuyên dùng) Tạo môi trường ảo Python
python -m venv .venv
.\.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Chạy server Backend (dùng --host 0.0.0.0 để điện thoại cùng Wi-Fi truy cập được)
uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
```

Kiểm tra Backend hoạt động: mở trình duyệt vào `http://localhost:8000/health` (kết quả trả về `"status": "ok"`).

---

## 5. Bước 3: Chạy Giao diện Web (`frontend-react`)

Mở một terminal mới tại `budgetbot-aws/`:

```powershell
cd frontend-react
npm install
npm run dev
```

* Truy cập Web tại: **http://localhost:5173/**
* *(Tùy chọn)* Nếu Backend chạy ở địa chỉ khác `http://localhost:8000`, tạo file `frontend-react/.env` từ `frontend-react/.env.example` và sửa `VITE_API_BASE`.

---

## 6. Bước 4: Chạy App Mobile (`mobile-expo`) bằng Expo Go

Mở một terminal mới tại `budgetbot-aws/`:

1. **Cài đặt thư viện:**
   ```powershell
   cd mobile-expo
   npm install
   ```

2. **Cấu hình địa chỉ Backend cho điện thoại:**
   * Xem IPv4 Wi-Fi của máy tính bằng lệnh `ipconfig` (ví dụ: `192.168.170.233`).
   * Tạo file `mobile-expo/.env` với nội dung:
     ```ini
     EXPO_PUBLIC_API_BASE=http://<IP_WIFI_CUA_MAY_TINH>:8000
     ```
     *(Nếu dùng Android Emulator thì không cần tạo `.env`, app mặc định gọi `http://10.0.2.2:8000`.)*

3. **Khởi chạy Expo:**
   ```powershell
   npx expo start -c
   ```
   * Mở ứng dụng **Expo Go** trên điện thoại (chung mạng Wi-Fi với máy tính) và quét mã QR hiện trên terminal.

---

## 7. Xử lý một số lỗi thường gặp

* **Lỗi `[WinError 10013]` khi chạy `uvicorn` trên port `8000`:**
  Port `8000` đang bị một tiến trình Python cũ chiếm giữ. Tìm và tắt tiến trình cũ trước khi chạy lại:
  ```powershell
  netstat -ano | Select-String ":8000"
  Stop-Process -Id <PID> -Force
  ```
* **App Mobile báo `Login failed. Check API connection`:**
  * Kiểm tra lại Backend đã chạy với `--host 0.0.0.0` chưa.
  * Kiểm tra IP trong `mobile-expo/.env` có khớp với IPv4 hiện tại của máy tính (`ipconfig`) không, sau đó chạy lại `npx expo start -c`.
  * Nếu điện thoại vẫn không vào được `http://<IP_WIFI>:8000/health`, mở Windows Firewall cho phép port `8000`.
