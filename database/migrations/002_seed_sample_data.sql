-- =============================================================================
-- Migration 002: Dữ liệu mẫu (Seed Data) cho môi trường Local / ĐATN
-- =============================================================================

-- Seed user mặc định: test-user-001 (mật khẩu: "password123")
-- Hash bcrypt tương ứng: $2b$12$e8rGgN9n3oIq64m5o967q.50pXe2g7O7k9N9tC7qfS6s2F5yA7x8e (hoặc sinh trực tiếp)
INSERT INTO users (id, username, full_name, password_hash)
VALUES (
    'test-user-001',
    'demo',
    'Nguyen Van Demo',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewe05yE3.pE2.qgG'
)
ON CONFLICT (id) DO NOTHING;

-- Seed một số hạn mức chi tiêu mẫu cho test-user-001
INSERT INTO budget_caps (user_id, category, amount)
VALUES 
    ('test-user-001', 'Food', 3000000.00),
    ('test-user-001', 'Transport', 1000000.00),
    ('test-user-001', 'Entertainment', 1500000.00)
ON CONFLICT (user_id, category) DO NOTHING;

