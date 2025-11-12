-- =====================================================
-- 管理員音效管理策略
-- 013_admin_sound_effects_policies.sql
-- =====================================================

-- =====================================================
-- sound_effects 表管理員策略
-- =====================================================

-- 管理員可讀所有音效（包括 private、pending、rejected）
DROP POLICY IF EXISTS "sound_effects_select_admin" ON sound_effects;
CREATE POLICY "sound_effects_select_admin"
  ON sound_effects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

-- 管理員可更新所有音效
DROP POLICY IF EXISTS "sound_effects_update_admin" ON sound_effects;
CREATE POLICY "sound_effects_update_admin"
  ON sound_effects FOR UPDATE
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

-- 管理員可刪除所有音效
DROP POLICY IF EXISTS "sound_effects_delete_admin" ON sound_effects;
CREATE POLICY "sound_effects_delete_admin"
  ON sound_effects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 結束
-- =====================================================

