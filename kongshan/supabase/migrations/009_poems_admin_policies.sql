-- =====================================================
-- 為 poems 表添加管理員權限策略
-- 009_poems_admin_policies.sql
-- =====================================================

-- 管理員可插入詩句
CREATE POLICY "poems_insert_admin"
  ON poems FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

-- 管理員可更新詩句
CREATE POLICY "poems_update_admin"
  ON poems FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

-- 管理員可刪除詩句
CREATE POLICY "poems_delete_admin"
  ON poems FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

