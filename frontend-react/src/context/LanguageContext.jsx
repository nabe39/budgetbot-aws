import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  en: {
    // Nav
    'nav.overview': 'Overview',
    'nav.transactions': 'Transactions',
    'nav.ask_ai': 'Ask AI',
    'nav.budget_coach': 'Budget Coach',
    'nav.caps_alerts': 'Caps & Alerts',
    'nav.logout': 'Logout',

    // Topbar
    'topbar.api_connected': 'API Connected',
    'topbar.checking_api': 'Checking API...',
    'topbar.backend_offline': 'Backend Offline',
    'title.overview': 'Financial Overview',
    'title.transactions': 'Transaction Management',
    'title.chat': 'AI Financial Assistant',
    'title.coach': 'AI Budget Coach',
    'title.limits': 'Spending Caps & Alerts',

    // Transactions page
    'txn.title': 'All Transactions',
    'txn.subtitle': 'Track and categorize your personal cash flows',
    'txn.add_btn': 'Add Transaction',
    'txn.month': 'Month:',
    'txn.category': 'Category:',
    'txn.all_categories': 'All Categories',
    'txn.show': 'Show:',
    'txn.per_page': '/ page',
    'txn.clear': 'Clear',
    'txn.refresh': 'Refresh',
    'txn.total_txns': 'Total Transactions',
    'txn.total_income': 'Total Income',
    'txn.total_expense': 'Total Expense',
    'txn.net_balance': 'Net Balance',
    'txn.col_date': 'Date',
    'txn.col_desc': 'Description',
    'txn.col_category': 'Category',
    'txn.col_confidence': 'Confidence',
    'txn.col_amount': 'Amount',
    'txn.col_actions': 'Actions',
    'txn.showing_range': 'Showing {from} - {to} of {total} entries',
    'txn.prev': 'Previous',
    'txn.next': 'Next',
    'txn.no_data': 'No transactions found for the selected filter.',
    'txn.clear_all': 'Clear all filters',
    'txn.loading': 'Loading transactions...',
    'txn.delete_confirm': 'Are you sure you want to delete this transaction?',
    'txn.delete_failed': 'Delete failed: ',
    'txn.edit_failed': 'Update failed: ',
    'txn.add_failed': 'Add failed: ',
    'txn.add_modal_title': 'Add New Transaction',
    'txn.edit_modal_title': 'Edit Transaction',
    'txn.type_expense': 'Expense (Outflow)',
    'txn.type_income': 'Income (Inflow)',
    'txn.field_date': 'Transaction Date',
    'txn.field_desc': 'Description / Merchant',
    'txn.field_category': 'Category',
    'txn.field_confidence': 'NLP Confidence',
    'txn.field_amount': 'Amount (VND)',
    'txn.save_changes': 'Save Changes',
    'txn.submit_add': 'Add Transaction',
    'txn.cancel': 'Cancel',

    // Categories
    'cat.Food': 'Food & Dining',
    'cat.Transport': 'Transportation',
    'cat.Shopping': 'Shopping',
    'cat.Utilities': 'Bills & Utilities',
    'cat.Entertainment': 'Entertainment',
    'cat.Health': 'Health & Medical',
    'cat.Subscriptions': 'Subscriptions',
    'cat.Housing': 'Housing & Rent',
    'cat.Income': 'Income',
    'cat.Transfer': 'Transfer',
    'cat.Other': 'Other',

    // Confidence
    'conf.high': 'High',
    'conf.medium': 'Medium',
    'conf.low': 'Low',
    'conf.na': 'N/A',

    // Overview
    'overview.upload_title': 'Drag a statement here or click to browse',
    'overview.upload_sub': 'Supported formats: .csv, .xlsx, .pdf, .png, .jpg',
    'overview.spending_summary': 'Spending Summary',
    'overview.filter': 'Filter',
    'overview.no_data': 'No data available. Please upload a bank statement.',
    'overview.total_income': 'Total Income',
    'overview.total_expenses': 'Total Expenses',
    'overview.net_savings': 'Net Savings',
    'overview.savings_rate': 'Savings Rate',
    'overview.top_drivers': 'Top 3 Spending Drivers',
    'overview.spending_by_category': 'Spending by Category',
    'overview.benchmark_title': 'Financial Health Benchmark (50/30/20 Rule)',
    'overview.benchmark_sub': 'Standard allocation benchmark based on your total income',
    'overview.needs': 'Needs (Essential)',
    'overview.wants': 'Wants (Lifestyle)',
    'overview.savings': 'Savings (Future)',
    'overview.actual': 'Actual',
    'overview.target': 'Target',

    // Savings Badges
    'savings.outstanding': 'Outstanding',
    'savings.healthy': 'Healthy',
    'savings.low': 'Low (<20%)',
    'savings.deficit': 'Deficit',

    // Limits page
    'limits.title': 'Set Category Budget Caps',
    'limits.subtitle': 'Set spending limits to receive real-time alerts.',
    'limits.alert_title': 'Budget Limit Exceeded!',
    'limits.alert_desc': 'You have exceeded your {limit} limit for {category}. Current spend is {spent}.',
    'limits.cat_label': 'Category',
    'limits.cap_label': 'Monthly Cap (đ)',
    'limits.cap_placeholder': 'e.g. 5000000',
    'limits.save_btn': 'Save Cap',
    'limits.active_caps': 'Active Caps',
    'limits.col_cat': 'Category',
    'limits.col_limit': 'Monthly Limit',
    'limits.col_spent': 'Current Spend',
    'limits.col_status': 'Status',
    'limits.col_actions': 'Actions',
    'limits.status_exceeded': 'Exceeded',
    'limits.status_on_track': 'On Track',
    'limits.no_limits': 'No limits set.',
    'limits.confirm_delete': 'Delete budget cap for {category}?',
    'limits.delete_failed': 'Delete failed',
    'limits.edit_tooltip': 'Edit',
    'limits.delete_tooltip': 'Delete',

    // Chat / AI Assistant page
    'chat.title': 'AI Money Assistant',
    'chat.tab_chat': 'Ask AI',
    'chat.tab_transaction': 'Add Transaction',
    'chat.chat_desc': 'Ask questions about your spending and budget (e.g., "How much did I spend on food last month?", "What is my highest expense category?", "Can you summarize my spending trends?")',
    'chat.txn_desc': 'Enter your spending in natural language for the AI to automatically extract and log the transaction.',
    'chat.welcome_chat': 'Hi! I can help you analyze your spending. What would you like to know?',
    'chat.welcome_txn': 'Hello! Enter your spending here in natural language. I will automatically extract the details and save it to your transactions list.\n\n*Examples:*\n- *"Lunch at Highlands 50000"* (automatically uses today\'s date)\n- *"Bought clothes at Zara 500000 on 2026-05-26"*',
    'chat.chat_placeholder': 'Ask AI about your spending...',
    'chat.txn_placeholder': 'Enter spending (e.g., Lunch at Highlands 50000)...',
    'chat.analyzing': 'AI is analyzing...',
    'chat.clear_tooltip': 'Clear current tab history',
    'chat.confirm_clear_chat': 'Are you sure you want to clear the Ask AI chat history?',
    'chat.confirm_clear_txn': 'Are you sure you want to clear the Add Transaction history?',
    'chat.error_connect': 'Error connecting to AI.',
    'chat.error_parse': 'Could not parse transaction details.',
    'chat.card_saved': 'Transaction Saved',
    'chat.card_desc': 'Description:',
    'chat.card_date': 'Date:',
    'chat.card_cat': 'Category:',
    'chat.card_amt': 'Amount:',
    'chat.high_conf': 'High Confidence',
    'chat.med_conf': 'Medium Confidence',
    'chat.low_conf': 'Low Confidence',

    // Coach / Budget Coach page
    'coach.title': 'AI Budget Recommendations',
    'coach.subtitle': 'Get personalized, actionable financial advice based on a deep AI analysis of your actual spending patterns.',
    'coach.btn_generate': 'Generate Smart Insights',
    'coach.btn_analyzing': 'Analyzing Data...',
    'coach.ready_prompt': 'Your AI Coach is ready to review your finances.',
    'coach.no_insights': 'No insights returned.',
    'coach.fail_insights': 'Failed to load insights. ',
    'coach.spending_distribution': 'Spending Distribution',
    'coach.action_plan': 'Personalized Action Plan',
    'coach.action_items': 'Action Items',
    'coach.suggested_caps': 'Suggested Budget Caps',
    'coach.ignore': 'Ignore',
    'coach.accept': 'Accept',
    'coach.saving': 'Saving...',
    'coach.fail_cap': 'Failed to set cap: ',

    // Review Modal & Toast
    'review.title': 'Review & Confirm Statement Transactions',
    'review.desc': 'AI parsed and pre-classified {count} transaction(s). Please review categories before saving to PostgreSQL.',
    'review.badge_notice': 'Full Staging Review Mode',
    'review.explanation': 'All transactions from your statement are listed below. You can review, update any category, delete unwanted lines, and confirm to persist into PostgreSQL.',
    'review.tab_all': 'All ({count})',
    'review.tab_attention': 'Needs Attention ({count})',
    'review.tab_high': 'High Confidence ({count})',
    'review.summary_est_income': 'Est. Income:',
    'review.summary_est_expense': 'Est. Expense:',
    'review.empty_filter': 'No transactions found in this filter view.',
    'review.col_info': 'Transaction & Date',
    'review.col_amount': 'Amount',
    'review.col_confidence': 'Confidence',
    'review.col_category': 'Category Selection',
    'review.col_action': 'Action',
    'review.delete_item_tooltip': 'Skip this transaction',
    'review.ready_count': '{count} transaction(s) ready to save',
    'review.cancel': 'Cancel All',
    'review.confirm': 'Confirm & Save to PostgreSQL',
    'review.saving': 'Saving to PostgreSQL...',
    'review.batch_failed': 'Batch save failed: ',
    'toast.processing': 'Processing {count} file(s)...',
    'toast.view_txns': 'Click to view transactions →',

    // Auth
    'auth.login_title': 'Sign in to manage your finances',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.signin_btn': 'Sign In',
    'auth.signing_in': 'Signing in...',
    'auth.no_account': "Don't have an account?",
    'auth.create_one': 'Create one',
    'auth.register_title': 'Create your account',
    'auth.fullname': 'Full Name',
    'auth.confirm_password': 'Confirm Password',
    'auth.signup_btn': 'Create Account',
    'auth.creating': 'Creating account...',
    'auth.has_account': 'Already have an account?',
    'auth.signin_link': 'Sign in',
    'auth.pass_min_length': 'Password must be at least 8 characters',
    'auth.pass_mismatch': 'Passwords do not match',
    'auth.account_created': 'Account created! Redirecting to login...',
  },

  vi: {
    // Nav
    'nav.overview': 'Tổng quan',
    'nav.transactions': 'Giao dịch',
    'nav.ask_ai': 'Hỏi AI',
    'nav.budget_coach': 'Cố vấn tài chính',
    'nav.caps_alerts': 'Hạn mức & Cảnh báo',
    'nav.logout': 'Đăng xuất',

    // Topbar
    'topbar.api_connected': 'API Đã kết nối',
    'topbar.checking_api': 'Đang kiểm tra API...',
    'topbar.backend_offline': 'Mất kết nối Backend',
    'title.overview': 'Tổng quan Tài chính',
    'title.transactions': 'Quản lý Giao dịch',
    'title.chat': 'Trợ lý Tài chính AI',
    'title.coach': 'Cố vấn Chi tiêu AI',
    'title.limits': 'Hạn mức & Cảnh báo Chi tiêu',

    // Transactions page
    'txn.title': 'Quản lý Giao dịch',
    'txn.subtitle': 'Theo dõi và phân loại các khoản thu chi cá nhân',
    'txn.add_btn': 'Thêm giao dịch',
    'txn.month': 'Tháng:',
    'txn.category': 'Danh mục:',
    'txn.all_categories': 'Tất cả danh mục',
    'txn.show': 'Hiển thị:',
    'txn.per_page': '/ trang',
    'txn.clear': 'Xóa lọc',
    'txn.refresh': 'Làm mới',
    'txn.total_txns': 'Tổng giao dịch',
    'txn.total_income': 'Tổng thu',
    'txn.total_expense': 'Tổng chi',
    'txn.net_balance': 'Số dư ròng',
    'txn.col_date': 'Ngày',
    'txn.col_desc': 'Nội dung',
    'txn.col_category': 'Danh mục',
    'txn.col_confidence': 'Độ tin cậy',
    'txn.col_amount': 'Số tiền',
    'txn.col_actions': 'Thao tác',
    'txn.showing_range': 'Hiển thị {from} - {to} trong tổng số {total} giao dịch',
    'txn.prev': 'Trang trước',
    'txn.next': 'Trang sau',
    'txn.no_data': 'Không tìm thấy giao dịch nào phù hợp với bộ lọc.',
    'txn.clear_all': 'Xóa tất cả bộ lọc',
    'txn.loading': 'Đang tải danh sách giao dịch...',
    'txn.delete_confirm': 'Bạn có chắc chắn muốn xóa giao dịch này?',
    'txn.delete_failed': 'Xóa giao dịch thất bại: ',
    'txn.edit_failed': 'Cập nhật thất bại: ',
    'txn.add_failed': 'Thêm giao dịch thất bại: ',
    'txn.add_modal_title': 'Thêm giao dịch mới',
    'txn.edit_modal_title': 'Chỉnh sửa giao dịch',
    'txn.type_expense': 'Chi tiêu (Tiền ra)',
    'txn.type_income': 'Thu nhập (Tiền vào)',
    'txn.field_date': 'Ngày giao dịch',
    'txn.field_desc': 'Nội dung / Diễn giải',
    'txn.field_category': 'Danh mục',
    'txn.field_confidence': 'Độ tin cậy NLP',
    'txn.field_amount': 'Số tiền (VND)',
    'txn.save_changes': 'Lưu thay đổi',
    'txn.submit_add': 'Thêm giao dịch',
    'txn.cancel': 'Hủy',

    // Categories
    'cat.Food': 'Ăn uống',
    'cat.Transport': 'Di chuyển',
    'cat.Shopping': 'Mua sắm',
    'cat.Utilities': 'Hóa đơn & Tiện ích',
    'cat.Entertainment': 'Giải trí',
    'cat.Health': 'Y tế & Sức khỏe',
    'cat.Subscriptions': 'Dịch vụ định kỳ',
    'cat.Housing': 'Nhà ở & Tiền thuê',
    'cat.Income': 'Thu nhập',
    'cat.Transfer': 'Chuyển khoản',
    'cat.Other': 'Khác',

    // Confidence
    'conf.high': 'Cao',
    'conf.medium': 'Vừa',
    'conf.low': 'Thấp',
    'conf.na': 'N/A',

    // Overview
    'overview.upload_title': 'Kéo thả tệp sao kê vào đây hoặc bấm để chọn',
    'overview.upload_sub': 'Định dạng hỗ trợ: .csv, .xlsx, .pdf, .png, .jpg',
    'overview.spending_summary': 'Tổng quan Chi tiêu',
    'overview.filter': 'Lọc',
    'overview.no_data': 'Chưa có dữ liệu. Vui lòng tải lên sao kê ngân hàng.',
    'overview.total_income': 'Tổng thu nhập',
    'overview.total_expenses': 'Tổng chi tiêu',
    'overview.net_savings': 'Tiết kiệm ròng',
    'overview.savings_rate': 'Tỷ lệ tiết kiệm',
    'overview.top_drivers': 'Top 3 Khoản Chi Lớn Nhất',
    'overview.spending_by_category': 'Phân bổ Chi tiêu theo Danh mục',
    'overview.benchmark_title': 'Chuẩn Đánh Giá Sức Khỏe Tài Chính (Quy tắc 50/30/20)',
    'overview.benchmark_sub': 'Mô hình phân bổ chi tiêu chuẩn mực dựa trên tổng thu nhập',
    'overview.needs': 'Nhu cầu thiết yếu (Needs)',
    'overview.wants': 'Mong muốn cá nhân (Wants)',
    'overview.savings': 'Tiết kiệm & Đầu tư (Savings)',
    'overview.actual': 'Thực tế',
    'overview.target': 'Mục tiêu',

    // Savings Badges
    'savings.outstanding': 'Xuất sắc',
    'savings.healthy': 'Khỏe mạnh',
    'savings.low': 'Thấp (<20%)',
    'savings.deficit': 'Thâm hụt',

    // Limits page
    'limits.title': 'Thiết Lập Hạn Mức Chi Tiêu',
    'limits.subtitle': 'Đặt giới hạn ngân sách hàng tháng theo danh mục để nhận cảnh báo theo thời gian thực.',
    'limits.alert_title': 'Vượt Quá Hạn Mức Chi Tiêu!',
    'limits.alert_desc': 'Bạn đã chi vượt quá hạn mức {limit} cho danh mục {category}. Chi tiêu hiện tại là {spent}.',
    'limits.cat_label': 'Danh mục',
    'limits.cap_label': 'Hạn mức tháng (VND)',
    'limits.cap_placeholder': 'Ví dụ: 5000000',
    'limits.save_btn': 'Lưu Hạn Mức',
    'limits.active_caps': 'Hạn Mức Đang Hoạt Động',
    'limits.col_cat': 'Danh mục',
    'limits.col_limit': 'Hạn mức tháng',
    'limits.col_spent': 'Đã chi tiêu',
    'limits.col_status': 'Trạng thái',
    'limits.col_actions': 'Thao tác',
    'limits.status_exceeded': 'Vượt mức',
    'limits.status_on_track': 'Trong tầm kiểm soát',
    'limits.no_limits': 'Chưa thiết lập hạn mức nào.',
    'limits.confirm_delete': 'Bạn có chắc chắn muốn xóa hạn mức cho danh mục {category}?',
    'limits.delete_failed': 'Xóa thất bại',
    'limits.edit_tooltip': 'Chỉnh sửa',
    'limits.delete_tooltip': 'Xóa',

    // Chat / AI Assistant page
    'chat.title': 'Trợ Lý Tài Chính AI',
    'chat.tab_chat': 'Hỏi AI',
    'chat.tab_transaction': 'Ghi chép giao dịch',
    'chat.chat_desc': 'Đặt câu hỏi về chi tiêu và ngân sách của bạn (ví dụ: "Tháng trước tôi tiêu bao nhiêu tiền ăn uống?", "Khoản chi nào lớn nhất?", "Tóm tắt xu hướng chi tiêu giúp tôi")',
    'chat.txn_desc': 'Nhập chi tiêu bằng câu nói tự nhiên để AI tự động bóc tách thông tin và ghi lại giao dịch.',
    'chat.welcome_chat': 'Xin chào! Tôi có thể giúp bạn giải đáp và phân tích chi tiêu cá nhân. Bạn muốn hỏi điều gì hôm nay?',
    'chat.welcome_txn': 'Xin chào! Hãy nhập chi tiêu của bạn bằng câu tự nhiên. Tôi sẽ tự động trích xuất thông tin và lưu vào danh sách giao dịch.\n\n*Ví dụ:*\n- *"Ăn trưa Highlands 50000"* (tự động lấy ngày hôm nay)\n- *"Mua áo Zara 500k ngày 2026-05-26"*',
    'chat.chat_placeholder': 'Hỏi AI về chi tiêu, dòng tiền của bạn...',
    'chat.txn_placeholder': 'Nhập chi tiêu (ví dụ: Ăn trưa Highlands 50k)...',
    'chat.analyzing': 'AI đang phân tích...',
    'chat.clear_tooltip': 'Xóa lịch sử hội thoại hiện tại',
    'chat.confirm_clear_chat': 'Bạn có chắc chắn muốn xóa lịch sử trò chuyện với AI?',
    'chat.confirm_clear_txn': 'Bạn có chắc chắn muốn xóa lịch sử ghi chép giao dịch?',
    'chat.error_connect': 'Lỗi kết nối tới AI.',
    'chat.error_parse': 'Không thể trích xuất thông tin giao dịch.',
    'chat.card_saved': 'Giao Dịch Đã Được Lưu',
    'chat.card_desc': 'Nội dung:',
    'chat.card_date': 'Ngày:',
    'chat.card_cat': 'Danh mục:',
    'chat.card_amt': 'Số tiền:',
    'chat.high_conf': 'Độ tin cậy Cao',
    'chat.med_conf': 'Độ tin cậy Vừa',
    'chat.low_conf': 'Độ tin cậy Thấp',

    // Coach / Budget Coach page
    'coach.title': 'Khuyến Nghị Chi Tiêu Từ AI',
    'coach.subtitle': 'Nhận lời khuyên tài chính cá nhân hóa và các bước hành động cụ thể dựa trên phân tích sâu từ dữ liệu chi tiêu thực tế của bạn.',
    'coach.btn_generate': 'Tạo Báo Cáo Tư Vấn Thông Minh',
    'coach.btn_analyzing': 'Đang phân tích dữ liệu...',
    'coach.ready_prompt': 'Cố vấn tài chính AI đã sẵn sàng rà soát và đánh giá tài chính của bạn.',
    'coach.no_insights': 'Chưa có khuyến nghị nào được tạo.',
    'coach.fail_insights': 'Không thể tải khuyến nghị: ',
    'coach.spending_distribution': 'Phân Bổ Chi Tiêu',
    'coach.action_plan': 'Kế Hoạch Hành Động Cá Nhân Hóa',
    'coach.action_items': 'Các Bước Thực Hiện',
    'coach.suggested_caps': 'Hạn Mức Ngân Sách Đề Xuất',
    'coach.ignore': 'Bỏ qua',
    'coach.accept': 'Áp dụng',
    'coach.saving': 'Đang lưu...',
    'coach.fail_cap': 'Không thể thiết lập hạn mức: ',

    // Review Modal & Toast
    'review.title': 'Rà Soát & Xác Nhận Giao Dịch Sao Kê',
    'review.desc': 'AI đã bóc tách và phân loại gợi ý {count} giao dịch. Vui lòng rà soát trước khi lưu chính thức vào PostgreSQL.',
    'review.badge_notice': 'Chế độ Rà Soát Toàn Bộ (Kiểm soát 100%)',
    'review.explanation': 'Tất cả các giao dịch từ file sao kê được hiển thị dưới đây. Bạn có thể kiểm tra, chọn lại danh mục cho bất kỳ dòng nào hoặc xóa bớt dòng thừa trước khi lưu vào PostgreSQL.',
    'review.tab_all': 'Tất cả ({count})',
    'review.tab_attention': 'Cần chú ý ({count})',
    'review.tab_high': 'Độ tin cậy cao ({count})',
    'review.summary_est_income': 'Tổng thu dự kiến:',
    'review.summary_est_expense': 'Tổng chi dự kiến:',
    'review.empty_filter': 'Không có giao dịch nào trong bộ lọc này.',
    'review.col_info': 'Giao dịch & Ngày',
    'review.col_amount': 'Số tiền',
    'review.col_confidence': 'Độ tin cậy',
    'review.col_category': 'Chọn lại danh mục (10 danh mục)',
    'review.col_action': 'Thao tác',
    'review.delete_item_tooltip': 'Bỏ qua giao dịch này',
    'review.ready_count': '{count} giao dịch sẵn sàng lưu',
    'review.cancel': 'Hủy tất cả',
    'review.confirm': 'Xác nhận & Lưu vào PostgreSQL',
    'review.saving': 'Đang lưu vào PostgreSQL...',
    'review.batch_failed': 'Lưu hàng loạt thất bại: ',
    'toast.processing': 'Đang xử lý {count} tệp tin...',
    'toast.view_txns': 'Nhấn để xem danh sách giao dịch →',

    // Auth
    'auth.login_title': 'Đăng nhập để quản lý tài chính của bạn',
    'auth.username': 'Tên đăng nhập',
    'auth.password': 'Mật khẩu',
    'auth.signin_btn': 'Đăng nhập',
    'auth.signing_in': 'Đang đăng nhập...',
    'auth.no_account': 'Chưa có tài khoản?',
    'auth.create_one': 'Đăng ký ngay',
    'auth.register_title': 'Tạo tài khoản mới',
    'auth.fullname': 'Họ và tên',
    'auth.confirm_password': 'Xác nhận mật khẩu',
    'auth.signup_btn': 'Đăng ký tài khoản',
    'auth.creating': 'Đang tạo tài khoản...',
    'auth.has_account': 'Đã có tài khoản?',
    'auth.signin_link': 'Đăng nhập',
    'auth.pass_min_length': 'Mật khẩu phải chứa ít nhất 8 ký tự',
    'auth.pass_mismatch': 'Mật khẩu xác nhận không khớp',
    'auth.account_created': 'Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập...',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('budgetbot_lang') || 'vi';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('budgetbot_lang', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  const t = (key, params = {}, fallback = '') => {
    let str = translations[language]?.[key] || translations['en']?.[key] || fallback || key;
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return str;
  };

  const getCategoryName = (category) => {
    if (!category) return t('cat.Other');
    return t(`cat.${category}`, {}, category);
  };

  const getConfidenceLabel = (confidence) => {
    const c = (confidence || '').toLowerCase();
    return t(`conf.${c}`, {}, c.toUpperCase());
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, getCategoryName, getConfidenceLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
