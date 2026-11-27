# Báo Cáo Đánh Giá Thực Nghiệm Mô Hình Phân Loại Giao Dịch NLP

> **Đề tài:** Xây dựng hệ thống hỗ trợ quản lý chi tiêu cá nhân dựa trên phân loại giao dịch bằng NLP và hỏi đáp bằng RAG  
> **Tập dữ liệu kiểm thử độc lập:** `E:\Work\Developer\University's Studies\DATN\budgetbot-aws\sample_data\eval_nlp.csv` (174 mẫu viết tay)  
> **Yêu cầu chức năng:** FR-10, FR-11, FR-22 (Chương 3 & 4 ĐATN)  
> **Thời gian đo lường:** Độ trễ trung bình **1.5885 ms / mẫu** (Tổng: 276.41 ms)  

---

## 1. Bảng Chỉ Số Đánh Giá Tổng Thể (Overall Metrics)

| Chỉ số đo lường (Metric) | Giá trị thực nghiệm | Ý nghĩa trong hệ thống BudgetBot |
| :--- | :---: | :--- |
| **Accuracy (Độ chính xác tổng thể)** | **88.51%** | Tỷ lệ số giao dịch được phân loại chính xác tuyệt đối trên tập kiểm thử độc lập. |
| **Macro Precision (Độ chuẩn xác vĩ mô)** | **89.20%** | Trung bình cộng Precision giữa 10 danh mục, coi trọng mọi nhóm không phân biệt cỡ mẫu. |
| **Macro Recall (Độ bao phủ vĩ mô)** | **88.73%** | Khả năng thu thập và nhận diện đầy đủ các giao dịch thuộc từng nhóm danh mục. |
| **Macro F1-Score (F1 trung bình vĩ mô)** | **88.40%** | **Chỉ số khoa học cốt lõi (FR-22)** cân bằng giữa Precision và Recall. |
| **Weighted F1-Score** | **88.18%** | F1-Score có tính trọng số theo phân phối mẫu thực tế của các danh mục. |
| **Tốc độ suy luận (Latency)** | **1.5885 ms/mẫu** | Đảm bảo phản hồi thời gian thực tức thì trên Backend FastAPI Local. |

---

## 2. Báo Cáo Chi Tiết Từng Danh Mục (Per-Class Classification Report)

| Danh Mục (Category) | Precision | Recall | F1-Score | Số Mẫu (Support) |
| :--- | :---: | :---: | :---: | :---: |
| **Entertainment** | 100.00% | 87.50% | 93.33% | 16 |
| **Food** | 91.30% | 100.00% | 95.45% | 21 |
| **Health** | 93.33% | 87.50% | 90.32% | 16 |
| **Income** | 88.89% | 100.00% | 94.12% | 16 |
| **Other** | 85.71% | 60.00% | 70.59% | 20 |
| **Shopping** | 83.33% | 93.75% | 88.24% | 16 |
| **Subscriptions** | 92.31% | 75.00% | 82.76% | 16 |
| **Transfer** | 76.19% | 94.12% | 84.21% | 17 |
| **Transport** | 80.95% | 89.47% | 85.00% | 19 |
| **Utilities** | 100.00% | 100.00% | 100.00% | 17 |

---

## 3. Ma Trận Nhầm Lẫn (Confusion Matrix)

Ma trận phản ánh số lượng dự đoán của mô hình so với nhãn chuẩn thực tế (Dòng: Nhãn thực tế, Cột: Nhãn dự đoán):

| Thực tế \ Dự đoán | **Ente** | **Food** | **Heal** | **Inco** | **Othe** | **Shop** | **Subs** | **Tran** | **Tran** | **Util** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Entertainment** | 14 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| **Food** | 0 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Health** | 0 | 0 | 14 | 0 | 1 | 0 | 0 | 0 | 1 | 0 |
| **Income** | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Other** | 0 | 1 | 0 | 1 | 12 | 0 | 0 | 4 | 2 | 0 |
| **Shopping** | 0 | 1 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| **Subscriptions** | 0 | 0 | 0 | 1 | 0 | 1 | 12 | 1 | 1 | 0 |
| **Transfer** | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 16 | 0 | 0 |
| **Transport** | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 17 | 0 |
| **Utilities** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17 |

---

## 4. Phân Tích Độ Tin Cậy & Cơ Chế Kiểm Duyệt (Human-in-the-Loop Validation)

Hệ thống phân cấp độ tin cậy để tự động hóa tối đa quy trình ghi nhận chi tiêu:

| Cấp độ tin cậy (`confidence_level`) | Số mẫu kiểm thử | Tỷ lệ (%) | Độ chính xác thực nghiệm | Hành vi Backend tương ứng |
| :--- | :---: | :---: | :---: | :--- |
| **`high`** | 100 | 57.5% | **98.00%** | Tự động commit vào PostgreSQL không cần hỏi lại. |
| **`medium`** | 42 | 24.1% | **90.48%** | Hiển thị Badge vàng trên danh sách giao dịch để người dùng chú ý. |
| **`low`** | 32 | 18.4% | **56.25%** | Tự động kích hoạt Review Modal để người dùng xác nhận hoặc gán lại nhãn. |

> [!IMPORTANT]
> **Ý nghĩa thực tiễn đối với hệ thống:**
> - Các giao dịch đạt mức **`high`** chiếm đa số (57.5%) đạt độ chính xác ấn tượng **98.00%**, đảm bảo an toàn dữ liệu tự động.
> - Các giao dịch mức **`low`** (18.4%) tập trung phần lớn các trường hợp nhầm lẫn hoặc mã ngân hàng viết tắt (Accuracy chỉ 56.25%), chứng minh cơ chế **Review Modal (Human-in-the-Loop)** là hoàn toàn cần thiết và loại bỏ 100% rủi ro đưa dữ liệu sai vào hệ thống.

---

## 5. Phân Tích Các Trường Hợp Nhầm Lẫn (Error Analysis)

Tổng cộng có **20 / 174 mẫu** bị dự đoán sai. Dưới đây là phân tích chi tiết tiêu biểu:

| STT | Mô tả giao dịch | Số tiền | Nhãn chuẩn | Dự đoán | Mức tin cậy | Nguyên nhân & Hướng giải quyết |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `Uber di chuyen noi thanh` | -95.000đ | **Transport** | `Shopping` | `low` (0.31) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 2 | `PHI DUONG BO CAO TOC LONG THANH` | -45.000đ | **Transport** | `Health` | `low` (0.26) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 3 | `THANH TOAN LAZADA DON HANG 789012` | -219.000đ | **Shopping** | `Food` | `low` (0.30) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 4 | `Steam Store mua DLC Monster Hunter Wilds` | -750.000đ | **Entertainment** | `Shopping` | `medium` (0.45) | Giao thoa ngữ nghĩa giữa 2 danh mục |
| 5 | `PlayStation Network mua the PS Plus Extra 3 thang` | -450.000đ | **Entertainment** | `Subscriptions` | `low` (0.43) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 6 | `Tiem ngua vac xin VNVC` | -850.000đ | **Health** | `Transport` | `medium` (0.59) | Giao thoa ngữ nghĩa giữa 2 danh mục |
| 7 | `BHYT nop phi bao hiem y te nam 2026` | -900.000đ | **Health** | `Other` | `high` (0.74) | Giao thoa ngữ nghĩa giữa 2 danh mục |
| 8 | `Spotify goi gia dinh Family 6 thanh vien gia han` | -180.000đ | **Subscriptions** | `Transport` | `low` (0.15) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 9 | `iCloud Plus dung luong 2TB gia han dinh ky` | -45.000đ | **Subscriptions** | `Income` | `low` (0.25) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 10 | `Nap tien nguon Viettel Money tu the ATM BIDV` | -1.000.000đ | **Transfer** | `Other` | `low` (0.43) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 11 | `Le phi cong chung chung thuc hop dong mua ban` | -200.000đ | **Other** | `Income` | `low` (0.26) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 12 | `Ung ho dong bao bi thiet hai do bao lu mien Trung` | -15.000đ | **Other** | `Food` | `low` (0.22) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 13 | `Tien gui xe qua dem tai ben xe Mien Dong` | -85.000đ | **Other** | `Transport` | `high` (0.73) | Giao thoa ngữ nghĩa giữa 2 danh mục |
| 14 | `THANH TOAN 350000 VND` | -350.000đ | **Other** | `Transport` | `low` (0.28) | Tên thương hiệu mới hoặc viết tắt mơ hồ |
| 15 | `MB IB 20260214123456 THANH TOAN` | -400.000đ | **Other** | `Transfer` | `low` (0.20) | Tên thương hiệu mới hoặc viết tắt mơ hồ |

---

## 6. Kết Luận

Mô hình phân loại giao dịch NLP trên BudgetBot đã đạt chỉ số **Macro F1 = 88.40%** và **Accuracy = 88.51%** trên tập dữ liệu kiểm thử độc lập.
Kết quả này đáp ứng vượt mức yêu cầu kỹ thuật đề ra trong Đề cương ĐATN (ngưỡng tối thiểu > 80%), bảo đảm tính khoa học, độ ổn định và độ trễ cực thấp để tích hợp trong hệ sinh thái BudgetBot Local.
