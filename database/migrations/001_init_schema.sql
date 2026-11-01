-- =============================================================================
-- Migration 001: Khởi tạo Database Schema cho BudgetBot
-- Quản lý: users, transactions, budget_caps
-- RDBMS: PostgreSQL 15+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hàm trigger tự động cập nhật trường updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. BẢNG USERS: Quản lý tài khoản & phân quyền, hỗ trợ hash mật khẩu bcrypt
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục tối ưu hóa tìm kiếm tài khoản theo username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Trigger cập nhật updated_at tự động cho users
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

COMMENT ON TABLE users IS 'Bảng lưu trữ thông tin tài khoản người dùng, hỗ trợ mã hóa mật khẩu bcrypt';
COMMENT ON COLUMN users.id IS 'Khóa chính định danh người dùng (UUID hoặc chuỗi định danh)';
COMMENT ON COLUMN users.username IS 'Tên đăng nhập duy nhất';
COMMENT ON COLUMN users.password_hash IS 'Chuỗi mã băm bcrypt (độ dài 60 ký tự, định dạng $2b$...)';
COMMENT ON COLUMN users.full_name IS 'Họ và tên đầy đủ hiển thị của người dùng';

-- -----------------------------------------------------------------------------
-- 2. BẢNG TRANSACTIONS: Lưu trữ lịch sử giao dịch chi tiêu và thu nhập
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    txn_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    confidence VARCHAR(20) DEFAULT 'high',
    engine VARCHAR(50) DEFAULT 'nlp_linear_svc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Các chỉ mục bắt buộc theo yêu cầu nghiệp vụ
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);

-- Trigger cập nhật updated_at tự động cho transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

COMMENT ON TABLE transactions IS 'Bảng ghi nhận tất cả giao dịch tài chính cá nhân';
COMMENT ON COLUMN transactions.amount IS 'Số tiền giao dịch VND: Số âm = Khoản chi (Expense), Số dương = Khoản thu (Income)';
COMMENT ON COLUMN transactions.category IS 'Danh mục chuẩn (Food, Transport, Utilities, Income, Shopping, ...)';
COMMENT ON COLUMN transactions.confidence IS 'Độ tin cậy dự đoán của AI/NLP (high, medium, low)';
COMMENT ON COLUMN transactions.engine IS 'Engine phân loại dữ liệu (nlp_linear_svc, keyword_rules, user_confirmed)';

-- -----------------------------------------------------------------------------
-- 3. BẢNG BUDGET_CAPS: Quản lý hạn mức chi tiêu theo danh mục
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_caps (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    month VARCHAR(7), -- Định dạng YYYY-MM (NULL = áp dụng mặc định cho tất cả các tháng)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_caps_user_category UNIQUE (user_id, category)
);

-- Chỉ mục tra cứu hạn mức theo người dùng
CREATE INDEX IF NOT EXISTS idx_budget_caps_user ON budget_caps(user_id);

-- Trigger cập nhật updated_at tự động cho budget_caps
DROP TRIGGER IF EXISTS trg_budget_caps_updated_at ON budget_caps;
CREATE TRIGGER trg_budget_caps_updated_at
BEFORE UPDATE ON budget_caps
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

COMMENT ON TABLE budget_caps IS 'Bảng lưu trữ hạn mức ngân sách chi tiêu theo từng danh mục';
COMMENT ON COLUMN budget_caps.amount IS 'Số tiền chi tiêu tối đa cho phép trong danh mục (VND, luôn >= 0)';
COMMENT ON COLUMN budget_caps.month IS 'Tháng áp dụng hạn mức YYYY-MM (để trống nếu áp dụng cố định hàng tháng)';

