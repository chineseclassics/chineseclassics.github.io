-- =====================================================
-- 修正 admins SELECT RLS，避免遞迴查詢造成 500
-- 008_admins_select_policy_fix.sql
-- =====================================================

DROP POLICY IF EXISTS "管理員表-僅管理員可查看" ON admins;

CREATE POLICY "管理員表-本人可查看"
ON admins FOR SELECT
USING (auth.uid() = user_id);

-- =====================================================

