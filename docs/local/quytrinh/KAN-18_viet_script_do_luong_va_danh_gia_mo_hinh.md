# Báo Cáo Quy Trình Thực Hiện Task KAN-18

> **Ticket:** KAN-18  
> **Tiêu đề:** `[NLP] Viết script đo lường & Đánh giá mô hình (eval_nlp.py)`  
> **Yêu cầu chức năng ánh xạ:** FR-10, FR-11, FR-22 (Chương 3 & 4 ĐATN)  
> **Người thực hiện:** Võ Hồng Đức  
> **Trạng thái:** Hoàn thành (Done & Audited)  
> **Mã nguồn thực thi:** [`eval_nlp.py`](../../../eval_nlp.py), [`scripts/eval_nlp.py`](../../../scripts/eval_nlp.py)  
> **Tập dữ liệu kiểm thử:** [`sample_data/eval_nlp.csv`](../../../sample_data/eval_nlp.csv) (174 mẫu viết tay độc lập)  
> **Báo cáo thực nghiệm xuất bản:** [`docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md`](../../../docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md)  
> **Bộ kiểm thử tự động:** [`tests/test_eval_nlp.py`](../../../tests/test_eval_nlp.py) (Passed 100%)

---

## 1. Mục Tiêu & Yêu Cầu Của Task KAN-18

Trong nghiên cứu khoa học và phát triển hệ thống học máy (Machine Learning / NLP), việc chỉ đánh giá mô hình trên tập dữ liệu huấn luyện hoặc qua Cross-Validation là chưa đủ để khẳng định tính tổng quát hóa (Generalization). Nhiệm vụ của **KAN-18** là:

1. **Xây dựng script đo lường độc lập `eval_nlp.py`:**
   - Tải tập dữ liệu kiểm thử độc lập [`sample_data/eval_nlp.csv`](../../../sample_data/eval_nlp.csv) (174 mẫu viết tay hoàn toàn mới, không xuất hiện trong tập huấn luyện).
   - Chạy suy luận toàn bộ qua pipeline `predict_transaction(description, amount)`.
2. **Tính toán và xuất bản đầy đủ các chỉ số định lượng khoa học:**
   - **Accuracy (Độ chính xác tổng thể):** Tỷ lệ dự đoán đúng trên toàn bộ tập test.
   - **Precision (Macro & Weighted):** Khả năng hạn chế gán nhãn sai vào một danh mục.
   - **Recall (Macro & Weighted):** Khả năng không bỏ sót các giao dịch thuộc danh mục đó.
   - **Macro F1-Score (Yêu cầu FR-22):** Trung bình điều hòa giữa Precision và Recall trên 10 danh mục.
   - **Classification Report & Confusion Matrix:** Ma trận nhầm lẫn 10x10 phục vụ phân tích lỗi.
3. **Phân tầng độ tin cậy (Confidence Stratification Analysis):**
   - Đo lường độ chính xác thực tế tương ứng với 3 mức tin cậy: `high`, `medium`, `low`.
   - Chứng minh tính khoa học và sự cần thiết của cơ chế **Human-in-the-Loop (Review Modal)** trong hệ thống BudgetBot.
4. **Tự động xuất báo cáo Markdown chuyên nghiệp:**
   - Tạo file báo cáo hoàn chỉnh tại `docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md` sẵn sàng đưa vào Chương 3 và Chương 4 của Luận văn tốt nghiệp.

---

## 2. Kết Quả Đo Lường Định Lượng Trên Test Set

Được thực thi trực tiếp qua lệnh:
```bash
python eval_nlp.py --dataset sample_data/eval_nlp.csv --output docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md
```

### 2.1. Bảng Chỉ Số Tổng Thể
| Chỉ số (Metric) | Kết quả thực nghiệm | Đánh giá so với mục tiêu ĐATN |
| :--- | :---: | :--- |
| **Accuracy** | **87.36%** | Vượt mục tiêu tối thiểu (> 80%) đề ra trong đề cương. |
| **Macro Precision** | **88.36%** | Độ chuẩn xác cao đồng đều trên mọi danh mục. |
| **Macro Recall** | **87.59%** | Độ bao quát xuất sắc, nhận diện đúng hầu hết các mẫu thực tế. |
| **Macro F1-Score (FR-22)** | **87.42%** | Cân bằng hoàn hảo giữa Precision và Recall. |
| **Weighted F1-Score** | **87.10%** | Độ tin cậy tính theo trọng số phân phối mẫu. |
| **Độ trễ suy luận (Latency)** | **0.69 ms / giao dịch** | Siêu nhanh, xử lý tức thì trên máy cá nhân không cần GPU. |

### 2.2. Chi Tiết Từng Danh Mục (Classification Report)
| Danh Mục | Precision | Recall | F1-Score | Support (Số mẫu) |
| :--- | :---: | :---: | :---: | :---: |
| **Utilities (Hóa đơn)** | 100.00% | 100.00% | **100.00%** | 17 |
| **Entertainment (Giải trí)** | 100.00% | 87.50% | **93.33%** | 16 |
| **Food (Ăn uống)** | 86.96% | 100.00% | **93.02%** | 20 |
| **Health (Y tế)** | 93.33% | 87.50% | **90.32%** | 16 |
| **Income (Thu nhập)** | 88.24% | 93.75% | **90.91%** | 16 |
| **Shopping (Mua sắm)** | 83.33% | 93.75% | **88.24%** | 16 |
| **Transport (Di chuyển)** | 80.95% | 89.47% | **85.00%** | 19 |
| **Subscriptions (Định kỳ)** | 92.31% | 75.00% | **82.76%** | 16 |
| **Transfer (Chuyển khoản)** | 72.73% | 88.89% | **80.00%** | 18 |
| **Other (Khác / Mã ngân hàng)** | 85.71% | 60.00% | **70.59%** | 20 |

---

## 3. Phân Tích Độ Tin Cậy & Luận Điểm "Human-In-The-Loop"

Một đóng góp học thuật và ứng dụng quan trọng nhất của Task KAN-18 là làm rõ hiệu quả của cơ chế phân cấp độ tin cậy:

| Mức tin cậy (`confidence_level`) | Số mẫu kiểm thử | Tỷ lệ (%) | Độ chính xác đạt được | Hành vi Backend tương ứng |
| :--- | :---: | :---: | :---: | :--- |
| **`HIGH`** | 93 mẫu | 53.4% | **96.77%** | Tự động ghi vào CSDL PostgreSQL mà không làm phiền người dùng. |
| **`MEDIUM`** | 47 mẫu | 27.0% | **93.62%** | Ghi nhận kèm gắn Badge cảnh báo màu vàng trên giao diện. |
| **`LOW`** | 34 mẫu | 19.5% | **52.94%** | Tự động kích hoạt Review Modal để người dùng xác nhận. |

> [!NOTE]
> **Ý nghĩa thực tiễn:**
> - Nếu hệ thống tin tưởng mù quáng vào mô hình (không có phân cấp tin cậy), tỷ lệ lỗi tổng thể là $12.64\%$.
> - Tuy nhiên, khi kết hợp cơ chế phân cấp tin cậy: Với hơn 53% giao dịch thuộc nhóm `HIGH`, tỷ lệ chính xác gần như tuyệt đối (**96.77%**).
> - Nhóm giao dịch `LOW` chủ yếu gồm các mã giao dịch ngân hàng viết tắt (như `FT2601029484910`) hoặc câu mô tả quá ngắn mơ hồ. Việc đẩy nhóm này vào **Review Modal** giúp người dùng kiểm duyệt chỉ trong vài giây, loại bỏ triệt để sai số dữ liệu.

---

## 4. Kiểm Thử Tự Động & Bàn Giao

- Đã tích hợp test case tự động tại [`tests/test_eval_nlp.py`](../../../tests/test_eval_nlp.py).
- Kết quả test: **Passed 100%**.
- File script chạy độc lập tại root [`eval_nlp.py`](../../../eval_nlp.py) và thư mục [`scripts/eval_nlp.py`](../../../scripts/eval_nlp.py).
- File báo cáo markdown phục vụ luận văn: [`docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md`](../../../docs/report/bao_cao_danh_gia_nlp_thuc_nghiem.md).
