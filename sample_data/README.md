# BudgetBot Sample & Benchmark Datasets

Synthetic and curated Vietnamese financial transaction datasets inspired by common bank statement and e-wallet formats in Vietnam (Vietcombank, MB Bank, Techcombank, VietinBank, VPBank, ACB, MoMo, ZaloPay). Merchant names, service providers, and transaction descriptions match real businesses in Vietnam; amounts and dates are randomized with fixed seeds for strict reproducibility.

---

## 1. Danh sách & Vai trò của các tệp dữ liệu trong thư mục này

| Tên tệp | Định dạng | Số dòng | Mục đích & Tác dụng trong dự án |
| :--- | :--- | :--- | :--- |
| **`vietnamese_transactions_1000.csv`** | CSV (`utf-8-sig`) | 1,000 dòng | **Tập dữ liệu chuẩn (Benchmark & Training dataset):** 1,000 giao dịch cân bằng đều giữa 10 danh mục (100 mẫu/danh mục). **Nâng cấp 15/11/2026: 1000/1000 descriptions hoàn toàn unique (Zero Duplication)** — an toàn tuyệt đối cho phép chia Train/Test không bị Data Leakage. Bổ sung biến thể không dấu SMS, mã ngân hàng, viết tắt thực tế. Dùng để huấn luyện (fine-tuning TF-IDF + Linear SVC), benchmark mô hình NLP, và kiểm tra tính nhất quán của hệ thống phân loại. |
| **`vietnamese_transactions_1000.xlsx`** | Excel (.xlsx) | 1,000 dòng | **Bản biểu diễn trực quan Excel:** Có định dạng màu sắc (xanh cho thu nhập, đỏ cho chi tiêu), header có style chuẩn phục vụ việc kiểm tra thủ công, demo trực quan cho hội đồng và người dùng văn phòng. Nội dung đồng bộ hoàn toàn với `.csv`. |
| **`bank_statement_q2_2026.csv`** | CSV | 84 dòng | **Tập dữ liệu sao kê quý 2/2026 (Quý thực tế):** Dùng để kiểm thử trọn vẹn luồng Upload sao kê (End-to-End Ingestion) và kiểm tra tính năng biểu đồ xu hướng hàng tháng (`monthly_trends`), phân tích chi tiêu theo danh mục trên Dashboard Overview. **Không có nhãn category — không dùng cho NLP training/eval.** |
| **`eval_nlp.csv`** *(thay thế `eval_sample.csv` lỗi schema — xóa 15/11/2026)* | CSV | 174 dòng | **Tập dữ liệu đánh giá NLP chuẩn (FR-22 / UC-09):** Có cột `true_category` với đủ 10 danh mục PascalCase chuẩn để so sánh trực tiếp kết quả phân loại (tính toán Accuracy, Precision, Recall, Macro F1, Confusion Matrix). Bao gồm 28 edge-cases thách thức (mã FT/TRX mờ đục, ShopeeFood vs Shopping, GrabCar vs Other). |
| **`test_hybrid.csv`** | CSV | 20 dòng | **Kiểm thử kiến trúc phân tầng Hybrid AI:** Bao gồm cả các mẫu rõ ràng (chạy qua LocalAI Rule-based) và các mẫu mã mờ đục `FT...` hoặc câu đa nghĩa để kiểm thử cơ chế fallback và phân cấp độ tin cậy (`confidence`: High, Medium, Low). ⚠️ Header chữ hoa `Date,Description,Amount`. |
| **`test_manual_review.csv`** | CSV | 2 dòng | **Kiểm thử tính năng HITL (Human-in-the-loop Review):** Chứa các giao dịch mơ hồ đặc thù để kích hoạt modal cảnh báo xác nhận giao dịch nghi ngờ (KAN-27) trên giao diện Web. |
| **`smoke_test_5_rows.csv`** | CSV | 5 dòng | **Kiểm thử khói (Smoke Test / CI/CD):** 5 dòng siêu ngắn để chạy kiểm thử nhanh luồng parse sao kê trong pytest mà không tốn tài nguyên. |

---

## 2. Cấu trúc trường dữ liệu (Schema)

### Schema tập Benchmark 1,000 mẫu (`vietnamese_transactions_1000.csv`):
```csv
date,description,amount,category,source_bank,confidence_benchmark
```
- `date`: Ngày phát sinh giao dịch định dạng chuẩn ISO `YYYY-MM-DD`.
- `description`: Chuỗi nội dung/diễn giải giao dịch thực tế (tiếng Việt có dấu, không dấu, viết tắt, mã giao dịch).
- `amount`: Số tiền bằng VND. Quy ước: **Số âm (`-`)** là chi tiêu/ghi nợ, **Số dương (`+`)** là thu nhập/hoàn tiền.
- `category`: Nhãn danh mục chuẩn theo đúng 10 danh mục PascalCase.
- `source_bank`: Đơn vị phát hành/kênh thanh toán (Vietcombank, MBBank, Techcombank, MoMo, ZaloPay, VPBank, ACB, VietinBank).
- `confidence_benchmark`: Độ tin cậy kỳ vọng (`high`, `medium`, `low`) phục vụ đánh giá năng lực đánh giá độ tin cậy của AI.

### Schema tập sao kê cơ bản (`bank_statement_q2_2026.csv`):
```csv
date,description,amount
```

---

## 3. Quy chuẩn 10 Danh mục PascalCase

BudgetBot phân loại chi tiêu theo chuẩn 10 danh mục thống nhất từ backend đến frontend:
1. **`Food`**: Ăn uống, cà phê, nhà hàng, quán ăn, trà sữa, ship đồ ăn online (Highlands, ShopeeFood, Phở, Phúc Long...).
2. **`Transport`**: Đi lại, xăng xe, đặt xe công nghệ, vé xe, gửi xe, phí đường bộ (Grab, Be, Xanh SM, Petrolimex, VETC...).
3. **`Shopping`**: Mua sắm siêu thị, đồ gia dụng, thời trang, phụ kiện (Shopee, Lazada, Tiki, WinMart, Uniqlo...).
4. **`Utilities`**: Hóa đơn tiền điện, nước, internet, cước di động, phí chung cư (EVN, Sawaco, FPT, Viettel...).
5. **`Entertainment`**: Xem phim, game, du lịch, concert, karaoke, khách sạn (CGV, Lotte Cinema, Steam, Garena...).
6. **`Health`**: Khám chữa bệnh, thuốc men, bệnh viện, nha khoa, tiêm phòng (Long Châu, Pharmacity, Bạch Mai, VNVC...).
7. **`Subscriptions`**: Thuê bao dịch vụ định kỳ, phần mềm bản quyền (Netflix, Spotify, ChatGPT Plus, iCloud, Cursor Pro...).
8. **`Income`**: Thu nhập, lương, thưởng, hoàn tiền, nhận chuyển khoản (Lương công ty, thưởng KPI, hoàn tiền Shopee...).
9. **`Transfer`**: Chuyển khoản ví điện tử, gửi tiết kiệm, trả nợ cá nhân, tiền thuê trọ (VietQR, MoMo, Napas 247...).
10. **`Other`**: Phí ngân hàng, mã giao dịch không rõ nội dung, rút ATM, từ thiện (Phí duy trì tài khoản, mã `FT...`, rút tiền mặt...).

---

## 4. Tại sao sử dụng Synthetic Data thay vì lấy từ HuggingFace?

Không có bộ dữ liệu sao kê ngân hàng tiếng Việt công khai nào đạt chuẩn và bảo vệ quyền riêng tư trên HuggingFace:
- Các dataset công khai (`tushar27/Indian-bank-statements`, `Iress/transactions-classification`) chỉ dành cho ngân hàng Ấn Độ hoặc Anh/Mỹ với tiền tệ USD/INR và tên merchant nước ngoài.
- Dữ liệu sao kê ngân hàng cá nhân tại Việt Nam chứa thông tin định danh cá nhân nhạy cảm (PII: Số tài khoản, số thẻ, số CCCD, tên người gửi/nhận).
- Vì vậy, giải pháp **tổng hợp dữ liệu có kiểm soát (Synthetic Data Generation)** dựa trên khảo sát thực tế các merchant và cú pháp ngân hàng Việt Nam là giải pháp chuẩn mực được chấp nhận trong các nghiên cứu khoa học và đồ án kỹ thuật.

---

## 5. Tái sinh bộ dữ liệu (Re-generation)

Dữ liệu được tạo tự động và xác định (deterministic) thông qua script Python:

```bash
# Sinh 1000 mẫu chuẩn (mặc định seed=42)
python scripts/generate_vietnamese_dataset.py --count 1000 --seed 42

# Tùy biến số lượng dòng (ví dụ 500 mẫu)
python scripts/generate_vietnamese_dataset.py --count 500 --seed 123
```
Script sẽ tự động xuất đồng thời file `.csv` và `.xlsx` cùng bảng phân bổ số liệu chi tiết.
