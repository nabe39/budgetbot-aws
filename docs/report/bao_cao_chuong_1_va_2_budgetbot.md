# BÁO CÁO KHÓA LUẬN TỐT NGHIỆP
## ĐỊNH HƯỚNG KHỞI NGHIỆP & ĐỔI MỚI SÁNG TẠO NĂM 2026

**Đề tài:**  
### XÂY DỰNG HỆ THỐNG HỖ TRỢ QUẢN LÝ CHI TIÊU CÁ NHÂN DỰA TRÊN PHÂN LOẠI GIAO DỊCH BẰNG NLP VÀ HỎI ĐÁP BẰNG RAG
*(Developing a Personal Expense Management Support System Based on NLP Transaction Classification and RAG-based Q&A)*

* **Sinh viên thực hiện:**
  1. Võ Hồng Đức – MSV: 22IT070 – Lớp: 22GIT (Công nghệ Thông tin)
  2. Phan Nguyễn Huy Hoàng – MSV: 22IT101 – Lớp: 22GIT (Công nghệ Thông tin)
* **Người hướng dẫn khoa học:** ThS. Dương Thị Mai Nga
* **Đơn vị đào tạo:** Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU), Đại học Đà Nẵng
* **Khoa:** Khoa học Máy tính

---

# CHƯƠNG 1. GIỚI THIỆU (INTRODUCTION)

## 1.1. Lý do chọn đề tài (Motivation)

### 1.1.1. Bối cảnh chuyển đổi số và thanh toán không tiền mặt
Trong thập kỷ qua, cuộc cách mạng chuyển đổi số tại Việt Nam đã diễn ra mạnh mẽ và làm thay đổi căn bản hành vi tiêu dùng của xã hội. Theo thống kê từ Ngân hàng Nhà nước Việt Nam (SBV), các phương thức thanh toán không tiền mặt (Internet Banking, Mobile Banking, ví điện tử MoMo, ZaloPay, VNPay, quét mã QR VietQR) tăng trưởng vượt bậc với tốc độ bình quân hơn 50% mỗi năm. Người dùng hiện đại, đặc biệt là thế hệ trẻ (Gen Z, Millennials), hiếm khi sử dụng tiền mặt trong các sinh hoạt hằng ngày. Thay vào đó, hàng chục đến hàng trăm vi giao dịch (micro-transactions) phát sinh mỗi tháng: từ tiền ăn uống, cà phê, thanh toán hóa đơn, di chuyển (Grab, Be, Gojek), đến mua sắm trực tuyến trên các sàn thương mại điện tử (Shopee, TikTok Shop, Lazada).

### 1.1.2. Vấn đề thực tiễn tồn tại trong quản lý tài chính cá nhân
Sự tiện lợi của thanh toán điện tử đã kéo theo một hệ quả nghiêm trọng: **hành vi chi tiêu vô thức (mindless spending)**. Người dùng dễ dàng rơi vào trạng thái mất kiểm soát tài chính cá nhân, không nắm rõ tiền đã chi vào những khoản nào và khó đạt được mục tiêu tiết kiệm. 

Mặc dù nhận thức được tầm quan trọng của việc quản lý tài chính cá nhân (Personal Financial Management - PFM), phần lớn người dùng nhanh chóng từ bỏ việc theo dõi tài chính sau một thời gian ngắn do các rào cản thực tiễn:
1. **Hạn chế về khả năng tự động phân loại ngữ cảnh tiếng Việt ngắn:** Mô tả giao dịch thực tế của người Việt thường chứa nhiều từ viết tắt, tiếng lóng, không dấu hoặc định dạng chuyển khoản ngân hàng (ví dụ: *"ck tien tro t5"*, *"cf sang voi b"*, *"grab di lam"*, *"bun bo hue 35k"*). Khi AI phân loại sai, các ứng dụng hiện hành thiếu cơ chế lưu vết học lại (feedback loop) một cách có hệ thống để tránh lặp lại lỗi.
2. **Điểm nghẽn lớn nhất — Thụ động và bế tắc trong khai thác dữ liệu đã tích lũy:** Làn sóng ứng dụng AI hiện nay trên thị trường nội địa mới chỉ dừng lại ở việc hỗ trợ ghi chép đầu vào (Smart Input). Sau khi dữ liệu được lưu, người dùng vẫn hoàn toàn thụ động trước các bảng tính và biểu đồ thống kê tĩnh. Khi người dùng cần giải đáp các thắc mắc phân tích chuyên sâu như: *"Tháng này tôi ăn ngoài tốn bao nhiêu so với tháng trước?"*, *"Những khoản chi tiêu lớn nhất tuần rồi là gì?"*, hay *"Cần điều chỉnh ngân sách danh mục nào để đạt mục tiêu tiết kiệm?"*, họ buộc phải tự lọc dữ liệu, tính toán và suy luận thủ công. Chưa có giải pháp nào cho phép hỏi đáp đàm thoại phân tích trực tiếp trên kho dữ liệu cá nhân có trích dẫn bằng chứng xác thực.

### 1.1.3. Nhu cầu thị trường và người dùng
Thị trường đang có nhu cầu cấp thiết về một công cụ quản lý tài chính mang tính **thông minh toàn diện, cá nhân hóa và chủ động tương tác**. Người tiêu dùng hiện đại không chỉ dừng lại ở nhu cầu "ghi chép nhanh" mà cần một **trợ lý tài chính thông minh (Smart Financial Assistant)** giải quyết trọn vẹn hai trụ cột:
* **Trụ cột 1 — Phân loại thông minh (Smart Input):** Tự động hiểu nội dung mô tả giao dịch tiếng Việt thực tế, tối ưu trải nghiệm ghi nhận và có cơ chế ghi nhận phản hồi chỉnh sửa của người dùng.
* **Trụ cột 2 — Khai thác thông minh (Smart Insight):** Cho phép tương tác, tra cứu, đối soát và nhận phân tích dữ liệu chi tiêu lịch sử thông qua đối thoại ngôn ngữ tự nhiên tiếng Việt bằng kỹ thuật RAG một cách trực quan, chính xác và có dẫn chứng giao dịch cụ thể, loại bỏ hoàn toàn hiện tượng ảo giác số liệu.

### 1.1.4. Xu hướng công nghệ liên quan
Sự phát triển đột phá của Trí tuệ nhân tạo (AI), đặc biệt là:
* **Xử lý ngôn ngữ tự nhiên (NLP):** Các kỹ thuật trích xuất đặc trưng kết hợp với các thuật toán học máy phân loại văn bản (TF-IDF, Linear SVC, Multinomial Naive Bayes) và các mô hình Transformer tiếng Việt (PhoBERT) chứng minh hiệu quả vượt trội trong việc phân loại văn bản ngắn với chi phí tài nguyên thấp.
* **Kỹ thuật RAG (Retrieval-Augmented Generation):** Sự kết hợp giữa Mô hình ngôn ngữ lớn (LLM - như GPT-4o-mini), Cơ sở dữ liệu vector (Vector Database - ChromaDB) và công nghệ tìm kiếm ngữ nghĩa (Semantic Search). RAG giải quyết triệt để vấn đề "ảo giác" (hallucination) của LLM bằng cách neo câu trả lời vào chính dữ liệu thực tế của người dùng, đồng thời loại bỏ chi phí đắt đỏ của việc fine-tune mô hình định kỳ khi dữ liệu tài chính thay đổi liên tục.

Từ bối cảnh thực tiễn và cơ sở công nghệ trên, nhóm nghiên cứu lựa chọn đề tài: **“Xây dựng hệ thống hỗ trợ quản lý chi tiêu cá nhân dựa trên phân loại giao dịch bằng NLP và hỏi đáp bằng RAG” (Dự án BUDGETBOT)**.

---

## 1.2. Mục tiêu đề tài (Objectives & Contributions)

### 1.2.1. Mục tiêu tổng quát
Nghiên cứu, thiết kế và phát triển hoàn chỉnh giải pháp hệ thống trợ lý quản lý chi tiêu cá nhân ứng dụng AI, có khả năng vận hành ổn định trên nền tảng web, đảm bảo giải quyết triệt để bài toán phân loại giao dịch tự động từ mô tả tiếng Việt thực tế và hỗ trợ hỏi đáp trực quan về dữ liệu tài chính cá nhân bằng ngôn ngữ tự nhiên thông qua kỹ thuật RAG. Đồng thời, đề tài hướng đến việc xây dựng mô hình sản phẩm có khả năng ứng dụng thực tế và đề xuất định hướng thương mại hóa, khởi nghiệp trong lĩnh vực FinTech.

### 1.2.2. Mục tiêu cụ thể
1. **Phân tích bài toán và khảo sát thị trường:** Nghiên cứu hành vi quản lý chi tiêu của người dùng trẻ tại Việt Nam; phân tích ưu nhược điểm của các ứng dụng PFM trong nước và quốc tế; áp dụng các mô hình kinh doanh PESTEL, Porter's Five Forces, SWOT.
2. **Thiết kế kiến trúc hệ thống và cơ sở dữ liệu:** Thiết kế hệ thống web ứng dụng backend RESTful API (NodeJS/FastAPI), CSDL quan hệ chuẩn hóa (PostgreSQL) lưu trữ dữ liệu giao dịch và CSDL vector (ChromaDB) lưu trữ các vector embedding ngữ nghĩa.
3. **Phát triển Module NLP phân loại tự động:** Xây dựng quy trình tiền xử lý văn bản tiếng Việt ngắn, thực nghiệm và so sánh các thuật toán phân loại (TF-IDF + Linear SVC, Multinomial Naive Bayes, PhoBERT) kết hợp cơ chế quy tắc bổ trợ (rule-based fallback).
4. **Xây dựng Pipeline RAG hỏi đáp tài chính cá nhân:** Nghiên cứu và áp dụng chiến lược chunking dữ liệu có cấu trúc (tổng hợp theo tháng và danh mục); tích hợp vector database ChromaDB, semantic search và LLM (GPT-4o-mini) để trả lời ngôn ngữ tự nhiên kèm trích dẫn dữ liệu nguồn.
5. **Xây dựng phiên bản thử nghiệm MVP (Minimum Viable Product):** Xây dựng giao diện web (React/Next.js) hiện đại, thân thiện, trực quan, hỗ trợ nhập liệu, xem thống kê dashboard và giao diện chat hỏi đáp.
6. **Đánh giá hiệu quả định lượng:** Đo lường độ chính xác phân loại bằng Accuracy, Precision, Recall, Macro F1; đo lường chất lượng RAG bằng framework RAGAS (Context Precision, Context Recall, Faithfulness).
7. **Đề xuất mô hình kinh doanh và chiến lược khởi nghiệp:** Hoàn thiện mô hình Canvas (Business Model Canvas - 9 khối) nhằm chứng minh tính khả thi phát triển thành một startup FinTech độc lập.

---

## 1.3. Đối tượng và Phạm vi đề tài (Scopes)

### 1.3.1. Đối tượng nghiên cứu
* **Đối tượng người dùng:** Người dùng cá nhân có nhu cầu theo dõi, phân loại và quản lý chi tiêu định kỳ (đặc biệt là sinh viên, nhân viên văn phòng, người trẻ có thói quen thanh toán không tiền mặt).
* **Đối tượng dữ liệu:** Dữ liệu giao dịch tài chính cá nhân bao gồm: thời gian (date), số tiền (amount), phân loại chi tiêu (category), nội dung mô tả/ghi chú (note/description).
* **Đối tượng công nghệ:** Kỹ thuật xử lý văn bản tiếng Việt ngắn (NLP), kỹ thuật truy xuất và sinh dữ liệu (RAG), kiến trúc Vector DB, mô hình ngôn ngữ lớn (LLM), cùng các framework lập trình web hiện đại.

### 1.3.2. Phạm vi đề tài
* **Phạm vi chức năng:**
  * Quản lý CRUD giao dịch chi tiêu cá nhân và hiển thị biểu đồ thống kê tổng quan (Dashboard).
  * Tự động dự đoán danh mục khi người dùng nhập mô tả giao dịch mới.
  * Cho phép người dùng chỉnh sửa danh mục để lưu vết và cải thiện mô hình học máy.
  * Cung cấp giao diện trợ lý ảo tương tác hội thoại, trả lời các thắc mắc chi tiêu của người dùng trong khoảng thời gian xác định kèm giao dịch chứng minh.
* **Phạm vi dữ liệu:** Dữ liệu giao dịch được tạo trực tiếp qua giao diện web hoặc nhập thông qua file dữ liệu mẫu chuẩn (CSV), mô phỏng sao kê ngân hàng cá nhân tại Việt Nam.
* **Môi trường triển khai:** Hệ thống web chạy trên môi trường điện toán đám mây (AWS / máy chủ cục bộ), database PostgreSQL kết hợp ChromaDB local gọn nhẹ, tối ưu chi phí vận hành.
* **Giới hạn hệ thống (Out of Scope):** 
  * Không tích hợp cổng kết nối trực tiếp Open Banking với API các ngân hàng tại Việt Nam (do rào cản pháp lý và cơ chế bảo mật sandbox).
  * Không bao gồm chức năng OCR quét hóa đơn ảnh phức tạp.
  * Không thực hiện tư vấn đầu tư tài chính chuyên sâu (chứng khoán, tiền mã hóa, bất động sản) nhằm bảo đảm an toàn đạo đức và trách nhiệm tài chính cho người dùng.

---

## 1.4. Ý nghĩa khoa học và thực tiễn

### 1.4.1. Ý nghĩa khoa học
* **Ứng dụng NLP trên dữ liệu văn bản tiếng Việt ngắn, phi cấu trúc:** Đề tài đóng góp nghiên cứu thực nghiệm về hiệu quả của các mô hình học máy cổ điển (Linear SVC, Multinomial Naive Bayes) so với mô hình Transformer chuyên sâu (PhoBERT) trên dữ liệu chi tiêu có tính chất ngắn, viết tắt, không dấu và mất cân bằng lớp.
* **Chiến lược RAG cho dữ liệu có cấu trúc (Structured Data RAG):** Đề tài đề xuất và kiểm chứng phương pháp phân mảnh (chunking) theo logic tổng hợp tháng và danh mục thay vì phân mảnh mù theo số ký tự cố định, mở ra hướng ứng dụng RAG hiệu quả và giảm ảo giác trên CSDL giao dịch tài chính.
* **Khung đánh giá định lượng minh bạch:** Áp dụng hệ chỉ số học thuật nghiêm ngặt (Macro F1, Context Precision/Recall, Faithfulness) để chứng minh chất lượng câu trả lời thay vì chỉ đánh giá cảm tính.

### 1.4.2. Ý nghĩa thực tiễn
* **Nâng cao năng lực quản lý tài chính cộng đồng:** Cung cấp giải pháp miễn phí/chi phí thấp giúp người dùng trẻ theo dõi dòng tiền dễ dàng, từ đó hình thành thói quen chi tiêu thông minh, hạn chế lạm phát cá nhân và nợ xấu.
* **Tối ưu hóa trải nghiệm người dùng (UX):** Giảm thiểu hơn 80% thời gian phân loại giao dịch thủ công; loại bỏ sự bối rối khi tìm kiếm số liệu nhờ khả năng đàm thoại tự nhiên tiếng Việt.
* **Khả năng thương mại hóa và mở rộng Startup:** Dự án có kiến trúc Module hóa rõ ràng, dễ dàng mở rộng thành sản phẩm SaaS (Software-as-a-Service), tích hợp vào các nền tảng tin nhắn (Telegram, Zalo OA) hoặc cung cấp giải pháp API phân loại cho các ví điện tử và ứng dụng ngân hàng số tại Việt Nam.

---

# CHƯƠNG 2. TỔNG QUAN TÀI LIỆU VÀ CƠ SỞ LÝ THUYẾT (LITERATURE REVIEW & BACKGROUND)

## 2.1. Tổng quan lĩnh vực và thị trường PFM

### 2.1.1. Xu hướng chuyển đổi số trong Quản lý Tài chính Cá nhân (PFM)
Quản lý tài chính cá nhân (Personal Financial Management - PFM) là quá trình lập kế hoạch, theo dõi, phân bổ và kiểm soát các nguồn thu - chi, tiết kiệm và đầu tư của một cá nhân hoặc hộ gia đình. Trước đây, PFM chủ yếu được thực hiện bằng sổ tay hoặc bảng tính Microsoft Excel. Tuy nhiên, cùng với làn sóng số hóa, thị trường FinTech đã chứng kiến sự chuyển dịch qua 3 thế hệ ứng dụng PFM:
* **Thế hệ 1 (Sổ ghi chép tĩnh):** Nhập liệu thuần thủ công, lưu trữ cục bộ, chỉ cung cấp bảng tính và biểu đồ hình tròn cơ bản.
* **Thế hệ 2 (Đồng bộ đa nền tảng và Cloud):** Lưu trữ đám mây, đồng bộ nhiều thiết bị, tự động lập ngân sách và thông báo nhắc nhở chi tiêu.
* **Thế hệ 3 (AI-Powered PFM - Thế hệ hiện tại):** Ứng dụng trí tuệ nhân tạo, NLP để tự động gắn nhãn giao dịch, phát hiện chi tiêu định kỳ, nhận diện bất thường và tích hợp trợ lý AI giao tiếp bằng ngôn ngữ tự nhiên.

### 2.1.2. Tổng hợp nhu cầu thị trường từ các báo cáo uy tín

Việc đánh giá nhu cầu thị trường được tổng hợp từ các báo cáo nghiên cứu thị trường chính thống sau:

* **Visa Consumer Payment Attitudes Study 2023–2024** *(Visa Inc.)*:
  * **56%** người tiêu dùng Việt Nam cho biết họ mang ít tiền mặt hơn so với năm trước, phản ánh xu hướng chuyển dịch mạnh sang thanh toán số trong sinh hoạt hằng ngày.
  * **89%** người dùng trẻ thuộc thế hệ Gen Z và Gen Y đã tích hợp thành công các phương thức thanh toán không tiền mặt vào cuộc sống thường ngày.
  * **4 trên 5 người tiêu dùng** (xấp xỉ 80%) đang sử dụng ví điện tử/mobile wallet làm phương thức thanh toán chính.
  * Tính đến cuối năm 2024, hơn **75%** giao dịch trực tiếp trên thẻ Visa tại Việt Nam là contactless (chạm/quét), cho thấy tốc độ hành vi chuyển đổi thanh toán rất nhanh.

* **Financial Trends Report 2023** *(Decision Lab, khảo sát trên 1.000+ người tiêu dùng Việt Nam)*:
  * **50%** người tham gia khảo sát chọn "tiết kiệm cho những khó khăn bất ngờ" là mục tiêu tài chính ưu tiên hàng đầu — tăng gần **10%** so với năm 2022, phản ánh áp lực tài chính và nhu cầu kiểm soát chi tiêu ngày càng tăng.
  * Số lượng người chủ động mở tài khoản tiết kiệm hoặc tích lũy tăng gần **gấp đôi**, từ **37% (năm 2022)** lên **62% (năm 2023)** — cho thấy người dùng đang ngày càng quan tâm hơn đến việc quản lý dòng tiền cá nhân một cách có kế hoạch.

* **Báo cáo Thị trường FinTech Việt Nam** *(Robocash Group, 2023)*:
  * Việt Nam là **thị trường FinTech tăng trưởng nhanh thứ hai khu vực ASEAN** (sau Singapore), được thúc đẩy bởi tỷ lệ thâm nhập smartphone cao và lượng lớn dân số chưa tiếp cận đầy đủ dịch vụ ngân hàng truyền thống.
  * Thị trường FinTech Việt Nam được dự báo đạt quy mô khoảng **18 tỷ USD vào năm 2024**.
  * Đáng chú ý, hơn **90% vốn đầu tư FinTech** hiện tập trung vào phân khúc thanh toán số và ví điện tử — để lại một khoảng trống đầu tư rất lớn và chưa được khai thác cho các phân khúc **quản lý tài chính cá nhân (PFM)**, cho vay số và credit scoring thay thế.

> **Nhận xét tổng hợp:** Các số liệu trên cho thấy người dùng trẻ tại Việt Nam đang thực hiện ngày càng nhiều giao dịch thanh toán số trong khi đồng thời có nhu cầu quản lý chi tiêu và tiết kiệm ngày càng cao. Tuy nhiên, phân khúc PFM vẫn còn rất thiếu vắng các công cụ thực sự thông minh, đặc biệt là các công cụ có khả năng **tự động hiểu nội dung giao dịch tiếng Việt thực tế** và hỗ trợ người dùng **tương tác trực tiếp với dữ liệu chi tiêu cá nhân** bằng ngôn ngữ tự nhiên.

---

## 2.2. So sánh chức năng chi tiết của các sản phẩm liên quan

Nhằm làm rõ các chức năng nghiệp vụ mà các ứng dụng hiện có đang cung cấp và nhận diện chính xác khoảng trống giải pháp, nhóm nghiên cứu phân tích chi tiết các chức năng cốt lõi của từng ứng dụng tại Việt Nam và trên thế giới:

### Bảng 2.1: Bảng so sánh chức năng chi tiết của các ứng dụng quản lý chi tiêu hiện hữu

| Nhóm sản phẩm | Ứng dụng | Các chức năng chính cung cấp | Điểm mạnh nổi bật | Hạn chế / Điểm nghẽn còn tồn tại |
| :--- | :--- | :--- | :--- | :--- |
| **Ứng dụng Việt Nam** | **Money Lover** | • Quản lý đa ví (tiền mặt, thẻ, ví điện tử).<br>• Lập ngân sách và cảnh báo vượt ngưỡng.<br>• Theo dõi khoản vay, sổ tiết kiệm, nhắc hóa đơn định kỳ.<br>• **AI Chatbot "MoneyLover Assistant":** Nhập giao dịch bằng tin nhắn tự nhiên (ví dụ: *"Ăn sáng 30k, cà phê 45k tiền mặt"*) — AI tự tách thành 2 khoản, tự phân loại và trừ đúng ví.<br>• **Quét hóa đơn thông minh (AI OCR):** Chụp ảnh hóa đơn siêu thị/nhà hàng, AI tự đọc và bóc tách dòng sản phẩm, ngày tháng, tổng tiền.<br>• Đồng bộ đa nền tảng (iOS, Android, Web). | • Tiên phong tích hợp AI nhập liệu đàm thoại tại Việt Nam — giảm đáng kể thao tác gõ tay.<br>• Hệ sinh thái tính năng quản lý tài chính đầy đủ nhất thị trường nội địa. | • AI nhập liệu tập trung vào **ghi chép đầu vào** — sau khi giao dịch được lưu, người dùng vẫn phải tự tra cứu qua bộ lọc/biểu đồ tĩnh để phân tích.<br>• **Chưa có tính năng hỏi đáp truy vấn ngược:** Người dùng không thể đặt câu hỏi như *"Tháng này tôi chi nhiều nhất vào khoản nào?"* và nhận câu trả lời kèm dẫn chứng giao dịch.<br>• Không có cơ chế đánh giá định lượng độ chính xác phân loại (không có Accuracy/F1 công bố). |
| | **Mona AI** | • Giao diện **thuần chat AI** — không có màn hình nhập liệu truyền thống.<br>• Ghi chép chi tiêu bằng tin nhắn văn bản hoặc chụp ảnh hóa đơn; AI tự "đọc hiểu" ngữ cảnh và phân loại vào các "hũ" tài chính tương ứng.<br>• Hệ thống "hũ chi tiêu" theo mục đích (ăn uống, đi lại, tiết kiệm, v.v.).<br>• Báo cáo tổng kết chi tiêu theo tuần/tháng. | • Định vị hoàn toàn khác biệt: là ứng dụng PFM **"AI-first"** tại Việt Nam, không có UI nhập liệu truyền thống.<br>• Trải nghiệm ghi chép cực kỳ tự nhiên — cảm giác như đang nhắn tin với trợ lý cá nhân. | • **Không có tính năng truy vấn/hỏi đáp trên dữ liệu lịch sử:** AI của Mona xử lý đầu vào (input) tốt nhưng chưa hỗ trợ người dùng phân tích, so sánh và khai thác lại dữ liệu chi tiêu đã lưu qua đàm thoại.<br>• Sản phẩm còn mới, hệ sinh thái tính năng chưa hoàn thiện bằng các đối thủ cũ. |
| | **MISA MoneyKeeper (Sổ Thu Chi)** | • Ghi chép thu - chi thủ công với phân loại danh mục chi tiết.<br>• Thiết lập hạn mức chi tiêu theo ngày/tháng/danh mục và sự kiện/chuyến đi.<br>• **Quét hóa đơn (OCR):** Chụp ảnh chứng từ, hóa đơn thu chi để lưu tự động.<br>• **Tìm kiếm thông minh bằng AI (MISA AVA):** Tra cứu chứng từ, hóa đơn, khoản chi phí qua câu lệnh ngôn ngữ tự nhiên thay vì bộ lọc thủ công.<br>• Xuất báo cáo Excel/PDF, phân chia sổ theo cá nhân/gia đình/công việc. | • Thương hiệu lâu đời, được tin dùng rộng rãi; giao diện thuần Việt.<br>• Hệ sinh thái MISA AVA (AI) đang được tích hợp dần vào toàn bộ sản phẩm. | • AI chủ yếu hỗ trợ **tìm kiếm/tra cứu** — chưa đủ sâu để phân tích xu hướng, so sánh tháng hay tư vấn tài chính qua đàm thoại.<br>• Giao diện nhập liệu thủ công truyền thống vẫn là luồng chính, AI là tính năng bổ trợ.<br>• Quảng cáo dày đặc ở bản miễn phí. |
| | **Ngân hàng số (TPBank, VPBank, VietinBank,...)** | • **Trợ lý ảo Chatbot 24/7** (TPBank TAtio, VPBank AI): hỗ trợ tra cứu số dư, lịch sử giao dịch, chuyển khoản, đặt lịch giao dịch qua hội thoại.<br>• **AI OCR tự động:** Quét hóa đơn điện/nước để điền mã khách hàng và số tiền; eKYC chụp CCCD/hộ chiếu để định danh tự động.<br>• Cảnh báo realtime khi có biến động số dư hoặc giao dịch bất thường.<br>• Phân loại chi tiêu cơ bản theo nhóm (ăn uống, mua sắm, chuyển tiền). | • Tích hợp sẵn vào nền tảng ngân hàng — dữ liệu giao dịch chính xác 100%, không cần nhập tay.<br>• Bảo mật cấp ngân hàng, độ tin cậy cao. | • **Không phải công cụ PFM chuyên sâu:** Chatbot ngân hàng tối ưu cho giao dịch, không phân tích chi tiêu cá nhân theo ngữ cảnh tiếng Việt thực tế.<br>• Không cho phép người dùng đặt câu hỏi phân tích tổng hợp như *"Tháng trước tôi chi tiêu nhiều hơn hay ít hơn tháng này?"* với dẫn chứng giao dịch cụ thể.<br>• Mỗi ngân hàng chỉ thấy dữ liệu của riêng ngân hàng đó — không tổng hợp được toàn bộ dòng tiền từ nhiều nguồn. |
| **Ứng dụng Quốc tế** | **YNAB (You Need A Budget)** | • Phương pháp phân bổ ngân sách "Zero-based Budgeting".<br>• Đồng bộ tự động từ hàng nghìn tài khoản ngân hàng quốc tế (qua Plaid).<br>• Quản lý mục tiêu tài chính dài hạn, báo cáo Net Worth, Cash Flow.<br>• Tài khoản dùng chung cho cặp đôi/gia đình (YNAB Together). | • Triết lý ngân sách chủ động được đánh giá hiệu quả nhất thế giới. | • ~$14.99/tháng (~360.000 VNĐ) — quá đắt với sinh viên/người dùng Việt.<br>• Learning curve rất cao.<br>• Không kết nối ngân hàng Việt Nam; không hỗ trợ tiếng Việt. |
| | **Copilot Money** | • Đồng bộ đa tài khoản (ngân hàng, thẻ tín dụng, đầu tư).<br>• Tự động phân loại giao dịch và học lại theo chỉnh sửa của người dùng.<br>• Phát hiện subscriptions định kỳ; báo cáo realtime tổng tài sản. | • UI/UX đẳng cấp nhất thị trường (Apple Design Award). | • Độc quyền iOS/macOS; chỉ hỗ trợ ngân hàng Mỹ/Canada.<br>• Không có tính năng hỏi đáp đàm thoại. |
| | **Cleo / Bilance** | • Chatbot hội thoại phân tích chi tiêu, cảnh báo lãng phí, chấm điểm sức khỏe tài chính.<br>• Trả lời câu hỏi chi tiêu qua tin nhắn chat; lập ngân sách theo tuần. | • Biến quản lý tài chính thành trò chuyện thú vị.<br>• Tích hợp phân tích đàm thoại trên dữ liệu cá nhân. | • Chỉ hỗ trợ tiếng Anh và ngân hàng châu Âu/Bắc Mỹ.<br>• Đôi khi nhầm lẫn số liệu với câu hỏi phức tạp. |

---

### 2.2.1. Định vị khoảng trống đổi mới — Luận điểm khác biệt của BUDGETBOT

Dựa trên phân tích bức tranh cạnh tranh thực tế năm 2025–2026, thị trường PFM Việt Nam đang trải qua **Làn sóng AI thế hệ 1: Thông minh hóa đầu vào (Smart Input)**. Cả Money Lover (MoneyLover Assistant), Mona AI và MISA đều đang cạnh tranh gay gắt để giải quyết bài toán **"làm thế nào để ghi chép nhanh hơn và dễ hơn"** bằng AI chatbot nhập liệu và OCR quét hóa đơn.

Đây là sự tiến bộ đáng kể — nhưng đồng thời cũng là **điểm giới hạn hiện tại**: Các ứng dụng nêu trên mới giải quyết được nửa đầu hành trình của người dùng (đưa dữ liệu *vào* hệ thống), nhưng chưa giải quyết được nửa sau quan trọng không kém — **"Tôi làm gì với kho dữ liệu chi tiêu đã tích lũy?"**

BUDGETBOT định vị mình tiên phong tại **Làn sóng AI thế hệ 2: Thông minh hóa đầu ra (Smart Insight)** — khai thác khoảng trống mà toàn bộ thị trường nội địa chưa ai giải quyết triệt để:

1. **Khoảng trống kỹ thuật — Phân loại NLP đo lường được và có cơ chế phản hồi người dùng:**
   Các ứng dụng hiện tại (Money Lover, Mona AI) đã tích hợp AI phân loại giao dịch, nhưng có hai hạn chế kỹ thuật cần làm rõ:
   * **Về trải nghiệm người dùng:** Khi AI phân loại sai (ví dụ: *"grab di hoc"* bị gán vào "Mua sắm" thay vì "Di chuyển"), người dùng có thể sửa lại nhãn nhưng **hệ thống không có cơ chế học lại (feedback loop) một cách có hệ thống** — lần sau giao dịch tương tự vẫn có thể bị phân loại sai. BUDGETBOT xây dựng cơ chế lưu lịch sử chỉnh sửa của người dùng để cải thiện tập dữ liệu huấn luyện theo thời gian.
   * **Về đóng góp học thuật của báo cáo:** Khác với các sản phẩm thương mại vốn không công bố phương pháp luận, BUDGETBOT xây dựng pipeline NLP với quy trình đánh giá định lượng chuẩn học thuật (Accuracy, Macro F1 trên tập kiểm thử độc lập) và so sánh thực nghiệm giữa các mô hình (Linear SVC, Naive Bayes, PhoBERT). Đây là đóng góp về **tính tái hiện và minh bạch nghiên cứu (reproducible research)** — có giá trị cho cộng đồng học thuật và là cơ sở để tối ưu hóa sản phẩm về sau, chứ không phải tính năng hiển thị trực tiếp cho người dùng cuối.


2. **Khoảng trống sản phẩm — Hỏi đáp phân tích có kiểm chứng (Analytical Q&A with Evidence):**
   Không một ứng dụng PFM nội địa nào hiện cung cấp tính năng: người dùng đặt câu hỏi phân tích bằng tiếng Việt tự nhiên (*"Tháng 9 tôi tiêu nhiều hơn tháng 8 bao nhiêu phần trăm?"*, *"Ba giao dịch lớn nhất tuần rồi là gì?"*) và nhận câu trả lời **kèm danh sách giao dịch gốc làm bằng chứng xác thực, không bịa số liệu**. Đây chính là đóng góp cốt lõi của pipeline RAG (Retrieval-Augmented Generation) trong BUDGETBOT.

3. **Khoảng trống học thuật — RAG trên dữ liệu tài chính có cấu trúc:**
   Trong khi các nghiên cứu RAG quốc tế chủ yếu tập trung vào văn bản tự do (sách, tài liệu, website), BUDGETBOT đề xuất và kiểm chứng **chiến lược chunking theo tổng hợp tháng/danh mục** — một phương pháp RAG chuyên biệt cho CSDL giao dịch có cấu trúc, được đánh giá định lượng bằng framework RAGAS (Faithfulness, Context Precision/Recall). Đây là đóng góp học thuật có giá trị độc lập.

> **Tóm lại:** Nếu Money Lover và Mona AI đang trả lời câu hỏi *"Làm sao để người dùng ghi chép nhanh hơn?"*, thì BUDGETBOT trả lời câu hỏi tiếp theo — *"Làm sao để người dùng hiểu và khai thác được dữ liệu chi tiêu họ đã ghi chép?"* — bằng một kiến trúc AI có đo lường, có bằng chứng và có thể mở rộng thành sản phẩm thương mại.


---

## 2.3. Phân tích môi trường khởi nghiệp và chiến lược

### 2.3.1. Phân tích mô hình PESTEL
Mô hình PESTEL giúp đánh giá toàn diện các yếu tố vĩ mô tác động đến đề tài khi định hướng thành một dự án khởi nghiệp:

* **P - Political (Chính trị):** Chính phủ Việt Nam đang tích cực ban hành các chiến lược quốc gia về phát triển kinh tế số, xã hội số và thúc đẩy nghiên cứu làm chủ công nghệ trí tuệ nhân tạo (Chiến lược quốc gia về AI đến năm 2030).
* **E - Economic (Kinh tế):** Thu nhập bình quân đầu người tại Việt Nam liên tục tăng, tầng lớp trung lưu mở rộng kéo theo nhu cầu quản trị tài sản và tối ưu chi tiêu cá nhân tăng cao. Thị trường FinTech Việt Nam được đánh giá là một trong những thị trường phát triển năng động nhất khu vực ASEAN.
* **S - Social (Xã hội):** Thế hệ Gen Z và Millennials chiếm tỷ trọng lớn trong lực lượng lao động. Đây là thế hệ sinh ra trong thời đại số hóa, ưa chuộng sự tiện lợi, tự động hóa và có thói quen tiêu dùng số thông qua mã QR và thương mại điện tử.
* **T - Technological (Công nghệ):** Sự bùng nổ của các mô hình ngôn ngữ lớn (LLM), công nghệ Vector Database và các thư viện NLP mã nguồn mở tiếng Việt giúp việc phát triển các ứng dụng AI thông minh trở nên khả thi với chi phí hạ tầng thấp.
* **E - Environmental (Môi trường):** Ứng dụng PFM thúc đẩy lối sống tiêu dùng bền vững, thanh toán không dùng tiền mặt, giảm thiểu in ấn hóa đơn giấy, góp phần bảo vệ tài nguyên môi trường.
* **L - Legal (Pháp lý):** Luật Giao dịch điện tử sửa đổi và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (PDPD) đòi hỏi hệ thống phải tuân thủ nghiêm ngặt tính ẩn danh và bảo mật thông tin tài chính của người dùng.

### 2.3.2. Phân tích mô hình Ngũ lực cạnh tranh của Porter (Porter's Five Forces)
* **Đối thủ cạnh tranh hiện tại (Mức độ Cao):** Các ứng dụng lớn như Money Lover, MISA MoneyKeeper và tân binh Mona AI đã có thị phần và đang đẩy mạnh Làn sóng 1 - "Smart Input" (nhập liệu đàm thoại AI, quét hóa đơn OCR). Tuy nhiên, các sản phẩm này chưa tiến vào Làn sóng 2 - "Smart Insight" (chưa cung cấp tính năng hỏi đáp phân tích kho dữ liệu quá khứ bằng RAG có kiểm chứng giao dịch gốc), tạo ra khoảng trống cạnh tranh chiến lược mà BUDGETBOT có thể chiếm lĩnh.
* **Nguy cơ từ sản phẩm thay thế (Mức độ Trung bình):** File Excel/Google Sheets hoặc tính năng quản lý chi tiêu tích hợp sẵn trên ứng dụng ngân hàng số (như Techcombank Mobile, TPBank). Tuy nhiên, các giải pháp này thường cứng nhắc, phân mảnh dòng tiền giữa các ngân hàng và thiếu khả năng tương tác đàm thoại phân tích thông minh.
* **Áp lực từ khách hàng (Mức độ Cao):** Người dùng có nhiều sự lựa chọn miễn phí và sẵn sàng rời bỏ ứng dụng nếu thao tác phức tạp, phân loại sai nhiều hoặc mô hình AI trả lời sai lệch số liệu.
* **Áp lực từ nhà cung cấp (Mức độ Thấp - Trung bình):** Chi phí API mô hình LLM (như OpenAI GPT-4o-mini, Anthropic Bedrock) và hạ tầng đám mây (AWS, Render). Tuy nhiên, xu hướng giảm giá API liên tục và khả năng dùng mô hình mã nguồn mở chạy local giúp giảm áp lực này.
* **Nguy cơ từ đối thủ mới gia nhập (Mức độ Cao):** Rào cản kỹ thuật để tạo ra một ứng dụng chat AI đơn giản ngày càng giảm. Do đó, lợi thế cạnh tranh của BUDGETBOT phải dựa vào chất lượng mô hình phân loại tiếng Việt có đánh giá chuẩn mực (Macro F1) và thuật toán chunking RAG tối ưu trên dữ liệu cấu trúc.

### 2.3.3. Phân tích ma trận SWOT
Dựa trên các phân tích trên, nhóm xây dựng ma trận SWOT định vị sản phẩm BUDGETBOT:

#### Bảng 2.2: Ma trận SWOT của dự án BUDGETBOT
| Các yếu tố | Điểm mạnh (Strengths - S) | Điểm yếu (Weaknesses - W) |
| :--- | :--- | :--- |
| **Nội bộ (Internal)** | • Thuật toán NLP nhẹ, tối ưu riêng cho mô tả giao dịch ngắn bằng tiếng Việt.<br>• Kiến trúc RAG chunking theo dữ liệu cấu trúc (tháng/danh mục) giúp triệt tiêu ảo giác số liệu.<br>• Có trích dẫn bằng chứng giao dịch nguồn.<br>• Chi phí vận hành hạ tầng thấp (dùng PostgreSQL + ChromaDB). | • Dữ liệu huấn luyện ban đầu cần xây dựng và gán nhãn thủ công.<br>• Chưa có kết nối tự động với API của hệ thống ngân hàng lớn.<br>• Phụ thuộc vào chất lượng internet và API sinh text từ LLM bên ngoài. |
| **Bên ngoài (External)** | **Cơ hội (Opportunities - O)** | **Thách thức (Threats - T)** |
| | • Tỷ lệ thanh toán không tiền mặt tăng trưởng bùng nổ tại Việt Nam.<br>• Người dùng trẻ có nhu cầu cao về các công cụ AI cá nhân hóa.<br>• Tiềm năng hợp tác/bán API phân loại giao dịch cho các ứng dụng ngân hàng số/ví điện tử. | • Vấn đề bảo mật thông tin và tâm lý lo ngại rò rỉ dữ liệu tài chính của người dùng.<br>• Cạnh tranh gay gắt từ các đối thủ lớn nếu họ đẩy mạnh tích hợp tính năng AI tương tự.<br>• Sự thay đổi trong chính sách chi phí API của các nhà cung cấp LLM. |

---

## 2.4. Xác định yêu cầu hệ thống

Dựa trên đề cương chi tiết và tài liệu đặc tả dự án, hệ thống BUDGETBOT được thiết kế với đầy đủ các yêu cầu chức năng (Functional Requirements - FR) và phi chức năng (Non-Functional Requirements - NFR).

### 2.4.1. Bảng yêu cầu chức năng (FR-01 đến FR-24)

#### A. Phân hệ Quản lý giao dịch và Thống kê
* **FR-01 (Thêm giao dịch - Cao):** Cho phép người dùng nhập giao dịch mới với các trường: ngày giờ, số tiền, danh mục, nội dung mô tả.
* **FR-02 (Xem danh sách giao dịch - Cao):** Hiển thị danh sách các giao dịch đã thực hiện theo thứ tự thời gian, hỗ trợ phân trang và tìm kiếm.
* **FR-03 (Sửa giao dịch - Cao):** Cho phép chỉnh sửa các thông tin giao dịch đã nhập (bao gồm việc đổi lại danh mục chi tiêu).
* **FR-04 (Xóa giao dịch - Cao):** Cho phép xóa bỏ một hoặc nhiều giao dịch nhập sai.
* **FR-05 (Thống kê chi tiêu - Cao):** Tổng hợp tổng thu, tổng chi và số dư theo khoảng thời gian (ngày, tuần, tháng, năm) và theo danh mục.
* **FR-06 (Dashboard trực quan - Cao):** Trình bày trực quan dữ liệu chi tiêu qua biểu đồ hình tròn (tỷ trọng danh mục) và biểu đồ cột/đường (xu hướng chi tiêu theo thời gian).
* **FR-07 (Hệ thống RESTful API - Cao):** Xây dựng các endpoint API chuẩn CRUD phục vụ quản lý giao dịch, kết nối và lưu trữ an toàn trong CSDL PostgreSQL.
* **FR-08 (Quản lý tài khoản người dùng - Trung bình):** Chức năng đăng ký, đăng nhập và phân quyền JWT nhằm bảo đảm tách biệt dữ liệu giữa các người dùng.

#### B. Phân hệ Phân loại giao dịch bằng NLP
* **FR-09 (Tiền xử lý văn bản - Cao):** Tự động chuẩn hóa văn bản tiếng Việt từ mô tả giao dịch: chuyển về chữ thường (lowercase), loại bỏ ký tự đặc biệt, số dư thừa, thực hiện tách từ tiếng Việt (tokenization).
* **FR-10 (Dự đoán phân loại tự động - Cao):** Nhận diện mô tả giao dịch đầu vào và tự động gán nhãn danh mục (như: Ăn uống, Di chuyển, Mua sắm, Hóa đơn, Giải trí,...).
* **FR-11 (Huấn luyện và so sánh mô hình - Cao):** Áp dụng vector hóa TF-IDF, huấn luyện và so sánh độ chính xác giữa Linear SVC và Multinomial Naive Bayes làm mô hình phân loại chính.
* **FR-12 (Tích hợp phân loại vào luồng giao dịch - Cao):** Ngay khi người dùng nhập mô tả giao dịch trên giao diện, hệ thống tự động gợi ý danh mục chi tiêu tức thì.
* **FR-13 (Thử nghiệm mô hình chuyên sâu PhoBERT - Thấp):** Thử nghiệm tinh chỉnh (fine-tune) mô hình PhoBERT tiếng Việt để so sánh đánh giá hiệu năng với mô hình máy học cổ điển.
* **FR-14 (Cơ chế người dùng hiệu chỉnh danh mục - Trung bình):** Cho phép người dùng ghi đè danh mục nếu AI dự đoán sai; lưu lại lịch sử chỉnh sửa để phục vụ học lại (feedback loop).

#### C. Phân hệ Hỏi đáp bằng RAG (Retrieval-Augmented Generation)
* **FR-15 (Tổng hợp dữ liệu có cấu trúc - Cao):** Gộp và xử lý dữ liệu giao dịch từ PostgreSQL thành các tài liệu văn bản tổng hợp theo từng tháng và từng danh mục chi tiêu.
* **FR-16 (Tạo và lưu trữ Vector Embedding - Cao):** Chuyển đổi các văn bản tổng hợp thành vector embedding và lưu trữ vào CSDL vector ChromaDB.
* **FR-17 (Truy xuất ngữ nghĩa - Cao):** Thực hiện Semantic Search trên ChromaDB dựa trên câu hỏi của người dùng để trích xuất Top-K văn bản liên quan nhất (K=3–5).
* **FR-18 (Sinh câu trả lời từ LLM - Cao):** Kết hợp câu hỏi và dữ liệu ngữ cảnh trích xuất, đưa vào Prompt tối ưu cho LLM (GPT-4o-mini) để tạo câu trả lời mạch lạc, chính xác.
* **FR-19 (Giao diện Chatbot đối thoại - Cao):** Cung cấp giao diện trò chuyện thân thiện, hiển thị câu trả lời kèm bảng/danh sách các giao dịch nguồn làm bằng chứng.
* **FR-20 (Xử lý trường hợp ngoại lệ / Edge Cases - Trung bình):** Thiết lập rào chắn (guardrails) từ chối trả lời câu hỏi ngoài phạm vi tài chính cá nhân hoặc cảnh báo khi không có đủ dữ liệu.
* **FR-21 (Đồng bộ và Re-embed định kỳ - Trung bình):** Tự động cập nhật và re-embed lại chunk tổng hợp trong ChromaDB khi có giao dịch mới được thêm/sửa/xóa.

#### D. Phân hệ Đánh giá hệ thống
* **FR-22 (Đánh giá Module NLP - Cao):** Đo lường và báo cáo các chỉ số: Accuracy, Precision, Recall, F1-score và đặc biệt là Macro F1 trên tập kiểm thử độc lập (Test Set).
* **FR-23 (Đánh giá Module RAG - Cao):** Đo lường chất lượng câu trả lời bằng framework RAGAS với các chỉ số: Context Precision, Context Recall và Faithfulness.
* **FR-24 (Kiểm thử và Tối ưu hóa - Cao):** Thực hiện kiểm thử tích hợp toàn diện, tinh chỉnh prompt và tham số mô hình nhằm đạt ngưỡng Faithfulness ≥ 80%.

### 2.4.2. Yêu cầu phi chức năng (Non-Functional Requirements - NFR)
* **Hiệu năng & Thời gian phản hồi (Performance):** 
  * API gợi ý phân loại NLP phản hồi dưới **300ms**.
  * Quá trình truy xuất và sinh câu trả lời RAG từ LLM hoàn thành trong vòng **2–4 giây**.
* **Độ chính xác và độ tin cậy (Accuracy & Reliability):** Mô hình NLP đạt Macro F1 tối thiểu từ **85%** trở lên; chỉ số Faithfulness của RAG đạt trên **80%**, tuyệt đối không bịa đặt số liệu tài chính.
* **Tính bảo mật và quyền riêng tư (Security & Privacy):** Mật khẩu người dùng được băm an toàn bằng thuật toán bcrypt; xác thực qua JWT; dữ liệu tài chính không lưu trữ thông tin nhạy cảm (như mã PIN, số thẻ ngân hàng).
* **Khả năng sử dụng (Usability):** Giao diện web chuẩn Responsive (tương thích máy tính và thiết bị di động), tuân thủ nguyên tắc thiết kế hiện đại, màu sắc trực quan, biểu đồ sinh động.
* **Tính mở rộng (Scalability):** Thiết kế kiến trúc module hóa tách rời (Decoupled Architecture), sẵn sàng đóng gói Docker và triển khai trên hạ tầng điện toán đám mây.

---

## 2.5. Cơ sở lý thuyết nền tảng

### 2.5.1. Xử lý ngôn ngữ tự nhiên (NLP) cho phân loại văn bản tiếng Việt ngắn

#### A. Đặc thù của văn bản mô tả giao dịch tiếng Việt
Văn bản giao dịch tài chính cá nhân tại Việt Nam có những đặc thù rất riêng biệt:
* **Độ dài câu rất ngắn:** Thường chỉ từ 1 đến 5 từ (ví dụ: *"an trua"*, *"do xang"*).
* **Không dấu, viết tắt và tiếng lóng:** Người dùng thường gõ không dấu để tiết kiệm thời gian (*"tien nha"*, *"cf"*, *"nhau"*).
* **Mất cân bằng dữ liệu giữa các lớp (Class Imbalance):** Tần suất giao dịch ăn uống thường chiếm 50–70% tổng số giao dịch, trong khi các danh mục như "Y tế", "Bảo hiểm" phát sinh rất ít.

#### B. Quy trình tiền xử lý văn bản tiếng Việt
1. **Chuẩn hóa chuỗi (Text Normalization):** Chuyển toàn bộ ký tự sang chữ thường (lowercase); loại bỏ dấu chấm câu, ký tự đặc biệt, biểu tượng cảm xúc (emoji) và các chữ số không mang ngữ nghĩa phân loại.
2. **Tách từ tiếng Việt (Vietnamese Word Segmentation):** Khác với tiếng Anh (mỗi từ phân tách bởi khoảng trắng), tiếng Việt có từ ghép gồm 2 hay nhiều âm tiết (ví dụ: *"ăn uống"*, *"mua sắm"*). Đề tài sử dụng thư viện mã nguồn mở chuyên dụng như **underthesea** hoặc **pyvi** để thực hiện phân tích hình thái và tách từ chính xác:
   > **Minh họa quy trình tách từ:**  
   > `"Đi siêu thị mua bánh kẹo"` $\longrightarrow$ `["Đi", "siêu_thị", "mua", "bánh_kẹo"]`

#### C. Kỹ thuật trích xuất đặc trưng TF-IDF (Term Frequency - Inverse Document Frequency)
TF-IDF là phương pháp thống kê dùng để đánh giá tầm quan trọng của một từ trong một tài liệu so với toàn bộ tập dữ liệu (corpus):
$$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \text{IDF}(t, D)$$
Trong đó:
* $\text{TF}(t, d) = \frac{f_{t,d}}{\sum_{t' \in d} f_{t',d}}$ là tần suất xuất hiện của từ $t$ trong mô tả giao dịch $d$.
* $\text{IDF}(t, D) = \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$ là nghịch đảo tần suất xuất hiện của từ $t$ trong toàn bộ tập văn bản $D$.

TF-IDF giúp làm nổi bật các từ mang tính phân loại đặc trưng cao (như *"xăng"*, *"cơm"*, *"netflix"*) và làm giảm trọng số của các từ ngữ xuất hiện quá phổ biến nhưng ít mang ý nghĩa nhận diện danh mục.

#### D. Các thuật toán học máy phân loại văn bản
1. **Linear Support Vector Classifier (Linear SVC):** 
   * Thuật toán tìm kiếm một siêu phẳng (hyperplane) tối ưu trong không gian đặc trưng đa chiều nhằm phân tách các lớp dữ liệu với khoảng cách biên (margin) lớn nhất.
   * Linear SVC đặc biệt mạnh mẽ và hiệu quả đối với dữ liệu thưa thớt (sparse data) có số chiều lớn sinh ra từ TF-IDF, đồng thời tốc độ suy luận (inference) cực kỳ nhanh (dưới 10ms).
2. **Multinomial Naive Bayes (MNB):**
   * Thuật toán phân loại xác suất dựa trên định lý Bayes với giả định ngây thơ về tính độc lập giữa các đặc trưng:
     $$P(c|d) \propto P(c) \prod_{i=1}^{n} P(t_i|c)^{f_i}$$
   * MNB rất phù hợp với dữ liệu dạng đếm tần suất từ, có thời gian huấn luyện nhanh và hoạt động bền bỉ ngay cả khi tập dữ liệu mẫu ban đầu còn hạn chế.
3. **So sánh với mô hình ngôn ngữ PhoBERT:**
   * PhoBERT là mô hình Transformer tiền huấn luyện chuyên sâu cho tiếng Việt (dựa trên kiến trúc RoBERTa). Mặc dù PhoBERT biểu diễn ngữ nghĩa rất tốt trên các đoạn văn bản dài, tuy nhiên đối với câu mô tả chi tiêu siêu ngắn (1–4 từ) và tập dữ liệu mẫu nhỏ (300–500 mẫu), việc fine-tune PhoBERT đòi hỏi tài nguyên tính toán lớn (GPU), dễ rơi vào hiện tượng quá khớp (overfitting) và độ trễ phản hồi cao hơn đáng kể. Do đó, đề tài chọn Linear SVC làm mô hình vận hành chính và đưa PhoBERT vào phần thực nghiệm so sánh học thuật.
4. **Cơ chế Fallback Rule-Based:**
   * Nhằm đảm bảo trải nghiệm người dùng thực tế không bị gián đoạn khi mô hình học máy có độ tin cậy thấp (Confidence Score < ngưỡng $\theta$), hệ thống tích hợp bộ quy tắc từ khóa (regex/keyword dictionary) ánh xạ các từ khóa nhận diện rõ ràng (ví dụ: *"grab"*, *"be"*, *"xanh sm"* $\rightarrow$ *Di chuyển*; *"spotify"*, *"netflix"* $\rightarrow$ *Giải trí*).

---

### 2.5.2. Kỹ thuật RAG (Retrieval-Augmented Generation) trên dữ liệu tài chính

#### A. Khái niệm và Kiến trúc tổng thể RAG
RAG (Retrieval-Augmented Generation) là một kiến trúc AI kết hợp giữa hai quá trình: **Truy xuất thông tin (Information Retrieval)** từ kho tri thức riêng biệt và **Sinh văn bản (Text Generation)** thông qua Mô hình ngôn ngữ lớn (LLM).

Quy trình RAG tiêu chuẩn gồm 3 bước:
1. **Indexing (Đánh chỉ mục):** Dữ liệu nguồn được phân mảnh (chunking), chuyển thành vector embedding và lưu trữ vào Vector Database.
2. **Retrieval (Truy xuất):** Khi người dùng đặt câu hỏi, câu hỏi được chuyển thành vector embedding. Hệ thống thực hiện tìm kiếm độ tương đồng (Cosine Similarity) trong Vector Database để chọn ra $K$ mảnh dữ liệu liên quan nhất.
3. **Generation (Sinh phản hồi):** Đưa câu hỏi của người dùng kèm $K$ mảnh ngữ cảnh trích xuất vào một khuôn mẫu Prompt đưa cho LLM tổng hợp và sinh câu trả lời tự nhiên.

#### B. Chiến lược Chunking dữ liệu có cấu trúc (Structured Data Chunking)
Một sai lầm phổ biến khi áp dụng RAG là lấy từng giao dịch đơn lẻ làm một chunk. Cách làm này sẽ tạo ra hàng nghìn vector siêu nhỏ rời rạc, làm phân mảnh ngữ cảnh và giảm sút nghiêm trọng chất lượng truy xuất của Vector DB. 

Trong đề tài BUDGETBOT, nhóm áp dụng **Chiến lược Chunking theo tổng hợp (Aggregated Chunking)**:
* **Chunk tổng hợp theo danh mục trong tháng:** 
  > *"Tháng 05/2026 – Danh mục Ăn uống: 18 giao dịch, tổng chi tiêu 4.250.000 VNĐ, trung bình 236.000 VNĐ/giao dịch. Giao dịch lớn nhất là 850.000 VNĐ tại Nhà hàng Hải sản ngày 15/05/2026."*
* **Chunk tổng hợp toàn tháng:**
  > *"Tổng kết tài chính Tháng 05/2026: Tổng thu 15.000.000 VNĐ, Tổng chi 10.500.000 VNĐ, Số dư tiết kiệm 4.500.000 VNĐ. Danh mục chiếm tỷ trọng lớn nhất là Ăn uống (40.5%), tiếp theo là Tiền nhà (28.5%)."*

Chiến lược này bảo tồn toàn vẹn ngữ nghĩa tài chính có cấu trúc, giúp LLM có đầy đủ thông tin để so sánh xu hướng giữa các tháng hoặc phân tích tỷ trọng mà không cần đọc qua hàng nghìn dòng bản ghi thô.

#### C. Cơ sở dữ liệu Vector (ChromaDB) và Mô hình Embedding
* **ChromaDB:** Cơ sở dữ liệu vector mã nguồn mở gọn nhẹ, chạy trực tiếp trên bộ nhớ/máy chủ cục bộ (in-process/serverless), hỗ trợ tìm kiếm khoảng cách Cosine hiệu năng cao mà không yêu cầu cấu hình hạ tầng phức tạp.
* **Mô hình Embedding:** Hệ thống sử dụng mô hình `text-embedding-3-small` (kích thước vector 1536 chiều) tối ưu về độ trễ và chi phí cực thấp, hoặc các mô hình mã nguồn mở tiếng Việt cục bộ (như `bkai-foundation-models/vietnamese-bi-encoder`) khi triển khai offline.
* **Độ tương đồng Cosine (Cosine Similarity):**
  $$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^{n} u_i^2} \sqrt{\sum_{i=1}^{n} v_i^2}}$$

#### D. Kiểm soát ảo giác bằng Trích xuất dữ liệu có kiểm chứng
Để đảm bảo tính toán số học chính xác tuyệt đối (điều mà LLM thuần túy thường hay tính sai), hệ thống áp dụng cơ chế lai (Hybrid Logic): các con số thống kê chính xác (tổng tiền, trung bình, min/max) được tính toán trực tiếp từ câu truy vấn SQL của PostgreSQL trong bước tiền tổng hợp chunk, sau đó LLM chỉ đóng vai trò diễn đạt câu trả lời mạch lạc bằng ngôn ngữ tự nhiên và dẫn nguồn dữ liệu.

---

### 2.5.3. Phương pháp và Bộ chỉ số đánh giá hệ thống

#### A. Đánh giá Module NLP phân loại giao dịch
Để đánh giá mô hình phân loại trên tập dữ liệu kiểm thử (Test Set chiếm 20% tổng dữ liệu), nhóm sử dụng các chỉ số:
* **Độ chính xác tổng thể (Accuracy):** Tỷ lệ dự đoán đúng trên toàn bộ tập dữ liệu:
  $$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}$$
* **Precision (Độ chuẩn xác):** Tỷ lệ dự đoán đúng trong số các mẫu được dự đoán thuộc lớp $c$:
  $$\text{Precision}_c = \frac{TP_c}{TP_c + FP_c}$$
* **Recall (Độ thu hồi):** Tỷ lệ nhận diện được các mẫu thực tế thuộc lớp $c$:
  $$\text{Recall}_c = \frac{TP_c}{TP_c + FN_c}$$
* **F1-Score:** Trung bình điều hòa giữa Precision và Recall của từng lớp:
  $$\text{F1}_c = 2 \times \frac{\text{Precision}_c \times \text{Recall}_c}{\text{Precision}_c + \text{Recall}_c}$$
* **Macro F1 (Chỉ số cốt lõi):** Trung bình cộng không trọng số của F1-Score qua tất cả các lớp:
  $$\text{Macro F1} = \frac{1}{|C|} \sum_{c \in C} \text{F1}_c$$
  > **Lý do khoa học:** Trong dữ liệu chi tiêu, số lượng giao dịch giữa các danh mục rất mất cân bằng (lớp "Ăn uống" có thể chiếm 150 mẫu, nhưng lớp "Bảo hiểm" chỉ có 10 mẫu). Nếu chỉ dùng Accuracy, mô hình chỉ cần dự đoán đúng lớp đa số là đã đạt điểm cao giả tạo. Do đó, **Macro F1** là chỉ số bắt buộc để phản ánh công bằng năng lực nhận diện của mô hình trên từng danh mục cụ thể.

#### B. Đánh giá Module RAG bằng Framework RAGAS
Nhóm xây dựng bộ câu hỏi mẫu kiểm thử (Ground Truth Dataset gồm 25–30 kịch bản câu hỏi thực tế) và áp dụng framework mã nguồn mở **RAGAS** để tự động chấm điểm hai tầng của pipeline:

1. **Đánh giá tầng Truy xuất (Retrieval Layer):**
   * **Context Precision:** Đo lường tỷ lệ các chunk được lấy về thực sự chứa thông tin liên quan đến câu hỏi và nằm ở vị trí xếp hạng cao trong kết quả trả về.
   * **Context Recall:** Đo lường tỷ lệ thông tin cần thiết có trong đáp án chuẩn (ground truth) được hệ thống truy xuất thành công từ CSDL vector.
2. **Đánh giá tầng Sinh phản hồi (Generation Layer):**
   * **Faithfulness (Độ trung thực):** Đo lường mức độ tuân thủ dữ liệu ngữ cảnh của câu trả lời, đảm bảo câu trả lời không chứa thông tin bịa đặt:
     $$\text{Faithfulness} = \frac{|V|}{|S|}$$
     *Trong đó:*
     * $|V|$ *(Verified Claims)*: Số lượng luận điểm/phát biểu trong câu trả lời được chứng minh trực tiếp bởi ngữ cảnh (Context) truy xuất từ dữ liệu giao dịch thực tế.
     * $|S|$ *(Total Claims)*: Tổng số lượng luận điểm/phát biểu xuất hiện trong câu trả lời của mô hình ngôn ngữ lớn (LLM).
     *Mục tiêu đề ra của đề tài: Chỉ số Faithfulness đạt tối thiểu từ **80% trở lên** (tiệm cận tiêu chuẩn triển khai thực tế 90%).*
   * **Answer Relevance (Độ phù hợp của câu trả lời):** Đánh giá mức độ trực diện và đầy đủ của câu trả lời đối với câu hỏi người dùng đặt ra, không nói vòng vo hoặc đưa thông tin dư thừa.

---

## 2.6. Tóm tắt Chương 2
Chương 2 đã cung cấp bức tranh toàn cảnh về thị trường ứng dụng quản lý chi tiêu cá nhân (PFM), phân tích chi tiết ưu nhược điểm của các giải pháp hiện hữu trong và ngoài nước, đồng thời áp dụng các công cụ phân tích chiến lược (PESTEL, Porter's Five Forces, SWOT) để chứng minh tính khả thi thương mại và khoảng trống độc đáo mà BUDGETBOT nhắm tới. 

Đồng thời, chương này đã thiết lập hệ thống 24 yêu cầu chức năng (FR-01 đến FR-24) và hệ thống yêu cầu phi chức năng chặt chẽ; đặt nền móng lý thuyết khoa học về kỹ thuật tiền xử lý văn bản tiếng Việt ngắn, so sánh các mô hình học máy (TF-IDF + Linear SVC / Naive Bayes vs PhoBERT), kiến trúc RAG với chiến lược chunking dữ liệu cấu trúc sáng tạo, cùng bộ công cụ định lượng chuẩn xác (Macro F1 và RAGAS). Đây là cơ sở tiền đề trực tiếp để nhóm triển khai thiết kế kiến trúc và phát triển sản phẩm chi tiết trong Chương 3.
