-- =============================================================================
-- Migration 002: Dữ liệu mẫu (Seed Data) cho môi trường Local / ĐATN
-- =============================================================================

-- Seed user mặc định: test-user-001 (username: "demo", mật khẩu: "password123")
INSERT INTO users (id, username, full_name, password_hash)
VALUES (
    'test-user-001',
    'demo',
    'Nguyen Van Demo',
    '$2b$12$0k0.MQRQJQIp4p8jGRYb1ug0NwjLQkf1/Ven1UtUE6eSKDSaw9ffO'
)
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed một số hạn mức chi tiêu mẫu cho test-user-001
INSERT INTO budget_caps (user_id, category, amount)
VALUES 
    ('test-user-001', 'Food', 3000000.00),
    ('test-user-001', 'Transport', 1000000.00),
    ('test-user-001', 'Entertainment', 1500000.00)
ON CONFLICT (user_id, category) DO NOTHING;
