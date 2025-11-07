-- =====================================================
-- 空山應用 RLS 策略配置
-- 002_rls_policies.sql
-- =====================================================

-- 啟用 RLS
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE sound_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE poem_atmospheres ENABLE ROW LEVEL SECURITY;
ALTER TABLE atmosphere_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE atmosphere_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_poem_creations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- poems 表策略
-- =====================================================

-- 所有用戶可讀
CREATE POLICY "poems_select_all"
  ON poems FOR SELECT
  USING (true);

-- 只有管理員可寫（暫時不實現，手動插入數據）

-- =====================================================
-- sound_effects 表策略
-- =====================================================

-- 公開可讀：status = 'approved' 的音效
CREATE POLICY "sound_effects_select_approved"
  ON sound_effects FOR SELECT
  USING (status = 'approved');

-- 用戶可讀自己上傳的所有音效（包括 private 狀態）
CREATE POLICY "sound_effects_select_own"
  ON sound_effects FOR SELECT
  USING (auth.uid() = uploaded_by);

-- 用戶可創建音效（上傳文件或錄音）
CREATE POLICY "sound_effects_insert_user"
  ON sound_effects FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- 用戶只能修改自己上傳的、狀態為 private 或 draft 的音效
CREATE POLICY "sound_effects_update_own_private"
  ON sound_effects FOR UPDATE
  USING (
    auth.uid() = uploaded_by 
    AND (status = 'private' OR status = 'draft')
  )
  WITH CHECK (
    auth.uid() = uploaded_by 
    AND (status = 'private' OR status = 'draft')
  );

-- =====================================================
-- poem_atmospheres 表策略
-- =====================================================

-- 公開可讀：status = 'approved' 的聲色意境
CREATE POLICY "atmospheres_select_approved"
  ON poem_atmospheres FOR SELECT
  USING (status = 'approved');

-- 用戶可讀自己創建的所有聲色意境（包括 draft、pending 和 rejected 狀態）
CREATE POLICY "atmospheres_select_own"
  ON poem_atmospheres FOR SELECT
  USING (auth.uid() = created_by);

-- 用戶可創建聲色意境
CREATE POLICY "atmospheres_insert_user"
  ON poem_atmospheres FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 用戶只能修改自己創建的、狀態為 draft 的聲色意境
CREATE POLICY "atmospheres_update_own_draft"
  ON poem_atmospheres FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = created_by 
    AND status = 'draft'
  );

-- =====================================================
-- atmosphere_sounds 表策略
-- =====================================================

-- 所有用戶可讀（用於查詢和統計）
CREATE POLICY "atmosphere_sounds_select_all"
  ON atmosphere_sounds FOR SELECT
  USING (true);

-- =====================================================
-- atmosphere_likes 表策略
-- =====================================================

-- 所有用戶可讀（用於統計）
CREATE POLICY "atmosphere_likes_select_all"
  ON atmosphere_likes FOR SELECT
  USING (true);

-- 用戶可創建自己的點贊
CREATE POLICY "atmosphere_likes_insert_user"
  ON atmosphere_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶可刪除自己的點贊
CREATE POLICY "atmosphere_likes_delete_own"
  ON atmosphere_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- user_poem_creations 表策略
-- =====================================================

-- 用戶可讀自己的創作
CREATE POLICY "user_poem_creations_select_own"
  ON user_poem_creations FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶可創建自己的創作
CREATE POLICY "user_poem_creations_insert_user"
  ON user_poem_creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶可修改自己的創作
CREATE POLICY "user_poem_creations_update_own"
  ON user_poem_creations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

