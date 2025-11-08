-- =====================================================
-- 修正 admin_logs.admin_id 可為 NULL，避免與 ON DELETE SET NULL 衝突
-- 007_admin_logs_nullable.sql
-- =====================================================

ALTER TABLE admin_logs
  ALTER COLUMN admin_id DROP NOT NULL;

-- =====================================================

