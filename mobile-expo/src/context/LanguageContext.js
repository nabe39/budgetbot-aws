import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext(null);

export const translations = {
  en: {
    'nav.overview': 'Overview',
    'nav.transactions': 'Transactions',
    'nav.ask_ai': 'Ask AI',
    'nav.budget_coach': 'Coach',
    'nav.caps_alerts': 'Limits',
    'nav.logout': 'Logout',

    'auth.login_title': 'Sign in to manage your personal budget',
    'auth.register_title': 'Create your BudgetBot account',
    'auth.full_name': 'Full Name',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.signin_btn': 'Sign In',
    'auth.signing_in': 'Signing in...',
    'auth.signup_btn': 'Create Account',
    'auth.signing_up': 'Creating account...',
    'auth.no_account': "Don't have an account?",
    'auth.create_one': 'Create one',
    'auth.have_account': 'Already have an account?',
    'auth.sign_in_link': 'Sign in',

    'overview.title': 'Financial Overview',
    'overview.upload_title': 'Drag a statement here or click to browse',
    'overview.upload_sub': 'Supported formats: .csv, .xlsx, .pdf, .png, .jpg',
    'overview.spending_summary': 'Spending Summary',
    'overview.all_time': 'Overview',
    'overview.current_month': 'This Month',
    'overview.previous_month': 'Last Month',
    'overview.pick_month': 'Pick Month',
    'overview.no_data': 'No data available. Please upload a bank statement.',
    'overview.total_income': 'Total Income',
    'overview.total_expenses': 'Total Expenses',
    'overview.net_savings': 'Net Savings',
    'overview.savings_rate': 'Savings Rate',
    'overview.top_drivers': 'Top 3 Spending Drivers',
    'overview.monthly_comparison': 'Monthly Income & Expense Comparison',
    'overview.income_bar': 'Income',
    'overview.expense_bar': 'Expenses',
    'overview.spending_by_category': 'Spending by Category',

    'savings.outstanding': 'Outstanding',
    'savings.healthy': 'Healthy',
    'savings.low': 'Low (<20%)',
    'savings.deficit': 'Deficit',

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

    'conf.high': 'High',
    'conf.medium': 'Medium',
    'conf.low': 'Low',
    'conf.na': 'N/A',

    'txn.title': 'Transaction Management',
    'txn.subtitle': 'Track and categorize your personal cash flows',
    'txn.add_btn': 'Add Transaction',
    'txn.total_txns': 'Total Transactions',
    'txn.total_income': 'Total Income',
    'txn.total_expense': 'Total Expense',
    'txn.net_balance': 'Net Balance',
    'txn.all_categories': 'All Categories',
    'txn.date_placeholder': 'YYYY-MM-DD or YYYY-MM',
    'txn.no_data': 'No transactions found for the selected filter.',
    'txn.clear_all': 'Clear filters',
    'txn.prev': 'Previous',
    'txn.next': 'Next',
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
    'txn.delete_confirm': 'Are you sure you want to delete this transaction?',
  },
  vi: {
    'nav.overview': 'Tổng quan',
    'nav.transactions': 'Giao dịch',
    'nav.ask_ai': 'Hỏi AI',
    'nav.budget_coach': 'Tư vấn',
    'nav.caps_alerts': 'Hạn mức',
    'nav.logout': 'Đăng xuất',

    'auth.login_title': 'Đăng nhập để quản lý chi tiêu cá nhân',
    'auth.register_title': 'Tạo tài khoản BudgetBot mới',
    'auth.full_name': 'Họ và tên',
    'auth.username': 'Tên đăng nhập',
    'auth.password': 'Mật khẩu',
    'auth.signin_btn': 'Đăng nhập',
    'auth.signing_in': 'Đang đăng nhập...',
    'auth.signup_btn': 'Đăng ký',
    'auth.signing_up': 'Đang tạo tài khoản...',
    'auth.no_account': 'Chưa có tài khoản?',
    'auth.create_one': 'Đăng ký ngay',
    'auth.have_account': 'Đã có tài khoản?',
    'auth.sign_in_link': 'Đăng nhập',

    'overview.title': 'Tổng quan Tài chính',
    'overview.upload_title': 'Kéo thả tệp sao kê vào đây hoặc bấm để chọn',
    'overview.upload_sub': 'Định dạng hỗ trợ: .csv, .xlsx, .pdf, .png, .jpg',
    'overview.spending_summary': 'Tổng quan Chi tiêu',
    'overview.all_time': 'Tổng quan',
    'overview.current_month': 'Tháng này',
    'overview.previous_month': 'Tháng trước',
    'overview.pick_month': 'Chọn lịch',
    'overview.no_data': 'Chưa có dữ liệu. Vui lòng tải lên sao kê ngân hàng.',
    'overview.total_income': 'Tổng Thu nhập',
    'overview.total_expenses': 'Tổng Chi tiêu',
    'overview.net_savings': 'Tiết kiệm ròng',
    'overview.savings_rate': 'Tỷ lệ tiết kiệm',
    'overview.top_drivers': 'Top 3 Khoản chi lớn nhất',
    'overview.monthly_comparison': 'So sánh Thu nhập & Chi tiêu theo Tháng',
    'overview.income_bar': 'Thu nhập',
    'overview.expense_bar': 'Chi tiêu',
    'overview.spending_by_category': 'Chi tiêu theo Danh mục',

    'savings.outstanding': 'Xuất sắc',
    'savings.healthy': 'Tốt',
    'savings.low': 'Thấp (<20%)',
    'savings.deficit': 'Thâm hụt',

    'cat.Food': 'Ăn uống & Thực phẩm',
    'cat.Transport': 'Đi lại & Di chuyển',
    'cat.Shopping': 'Mua sắm cá nhân',
    'cat.Utilities': 'Hóa đơn & Tiện ích',
    'cat.Entertainment': 'Giải trí & Thư giãn',
    'cat.Health': 'Y tế & Sức khỏe',
    'cat.Subscriptions': 'Dịch vụ định kỳ',
    'cat.Housing': 'Nhà ở & Thuê nhà',
    'cat.Income': 'Thu nhập',
    'cat.Transfer': 'Chuyển tiền / Tiết kiệm',
    'cat.Other': 'Khác',

    'conf.high': 'Cao',
    'conf.medium': 'Trung bình',
    'conf.low': 'Thấp',
    'conf.na': 'N/A',

    'txn.title': 'Quản lý Giao dịch',
    'txn.subtitle': 'Theo dõi và phân loại các khoản thu chi cá nhân',
    'txn.add_btn': 'Thêm giao dịch',
    'txn.total_txns': 'Tổng giao dịch',
    'txn.total_income': 'Tổng thu',
    'txn.total_expense': 'Tổng chi',
    'txn.net_balance': 'Số dư ròng',
    'txn.all_categories': 'Tất cả danh mục',
    'txn.date_placeholder': 'YYYY-MM-DD hoặc YYYY-MM',
    'txn.no_data': 'Không tìm thấy giao dịch nào phù hợp với bộ lọc.',
    'txn.clear_all': 'Xóa bộ lọc',
    'txn.prev': 'Trước',
    'txn.next': 'Sau',
    'txn.add_modal_title': 'Thêm giao dịch mới',
    'txn.edit_modal_title': 'Chỉnh sửa giao dịch',
    'txn.type_expense': 'Chi tiêu (Tiền ra)',
    'txn.type_income': 'Thu nhập (Tiền vào)',
    'txn.field_date': 'Ngày giao dịch',
    'txn.field_desc': 'Mô tả / Nội dung',
    'txn.field_category': 'Danh mục',
    'txn.field_confidence': 'Độ tin cậy NLP',
    'txn.field_amount': 'Số tiền (VNĐ)',
    'txn.save_changes': 'Lưu thay đổi',
    'txn.submit_add': 'Thêm giao dịch',
    'txn.cancel': 'Hủy',
    'txn.delete_confirm': 'Bạn có chắc chắn muốn xóa giao dịch này?',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('vi');

  useEffect(() => {
    AsyncStorage.getItem('lang').then((saved) => {
      if (saved === 'en' || saved === 'vi') setLanguage(saved);
    });
  }, []);

  const toggleLanguage = async () => {
    const next = language === 'vi' ? 'en' : 'vi';
    setLanguage(next);
    await AsyncStorage.setItem('lang', next);
  };

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;
  const getCategoryName = (cat) => t(`cat.${cat}`) || cat;
  const getConfidenceLabel = (conf) => {
    const c = (conf || '').toLowerCase();
    if (c === 'high' || c === 'medium' || c === 'low') return t(`conf.${c}`);
    return t('conf.na');
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, getCategoryName, getConfidenceLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
