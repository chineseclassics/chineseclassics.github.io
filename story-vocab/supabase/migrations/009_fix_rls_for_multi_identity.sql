-- =====================================================
-- 修復 RLS 策略以支持多重身份系統
-- 創建日期：2025-10-11
-- 問題：auth.uid() 不再等於 users.id，需要通過 user_identities 查找
-- =====================================================

BEGIN;

-- ========================================
-- 1. 刪除舊的 RLS 策略
-- ========================================

-- users 表
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "用户可以查看自己的信息" ON users;
DROP POLICY IF EXISTS "用户可以更新自己的信息" ON users;
DROP POLICY IF EXISTS "允许创建用户" ON users;

-- story_sessions 表
DROP POLICY IF EXISTS "Users can view own story sessions" ON story_sessions;
DROP POLICY IF EXISTS "Users can insert own story sessions" ON story_sessions;
DROP POLICY IF EXISTS "Users can update own story sessions" ON story_sessions;
DROP POLICY IF EXISTS "用户可以查看自己的故事" ON story_sessions;
DROP POLICY IF EXISTS "用户可以创建故事" ON story_sessions;
DROP POLICY IF EXISTS "用户可以更新自己的故事" ON story_sessions;
DROP POLICY IF EXISTS "匿名用户可以创建故事" ON story_sessions;
DROP POLICY IF EXISTS "匿名用户可以查看自己的故事" ON story_sessions;
DROP POLICY IF EXISTS "匿名用户可以更新故事" ON story_sessions;

-- user_vocabulary 表
DROP POLICY IF EXISTS "Users can view own vocabulary records" ON user_vocabulary;
DROP POLICY IF EXISTS "Users can manage own vocabulary records" ON user_vocabulary;
DROP POLICY IF EXISTS "用户可以查看自己的词汇记录" ON user_vocabulary;
DROP POLICY IF EXISTS "用户可以创建词汇记录" ON user_vocabulary;
DROP POLICY IF EXISTS "用户可以更新自己的词汇记录" ON user_vocabulary;

-- user_wordbook 表
DROP POLICY IF EXISTS "Users can view own wordbook" ON user_wordbook;
DROP POLICY IF EXISTS "Users can manage own wordbook" ON user_wordbook;
DROP POLICY IF EXISTS "用户可以查看自己的生词本" ON user_wordbook;
DROP POLICY IF EXISTS "用户可以添加到生词本" ON user_wordbook;
DROP POLICY IF EXISTS "用户可以更新生词本" ON user_wordbook;
DROP POLICY IF EXISTS "用户可以删除生词本条目" ON user_wordbook;

-- ========================================
-- 2. 創建輔助函數：通過 auth.uid() 找到 users.id
-- ========================================

CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM user_identities 
    WHERE provider_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加註釋
COMMENT ON FUNCTION get_user_id_from_auth() IS 
'通過 auth.uid() 在 user_identities 表中查找對應的 users.id';

-- ========================================
-- 3. 創建新的 RLS 策略
-- ========================================

-- -------------------------------------
-- users 表策略
-- -------------------------------------

-- 允許創建用戶（登入時需要）
CREATE POLICY "allow_user_creation" ON users
  FOR INSERT
  WITH CHECK (true);

-- 用戶可以查看自己的信息
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = get_user_id_from_auth());

-- 用戶可以更新自己的信息
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = get_user_id_from_auth());

-- -------------------------------------
-- story_sessions 表策略
-- -------------------------------------

-- 用戶可以查看自己的故事
CREATE POLICY "sessions_select_own" ON story_sessions
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以創建故事
CREATE POLICY "sessions_insert_own" ON story_sessions
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新自己的故事
CREATE POLICY "sessions_update_own" ON story_sessions
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- user_vocabulary 表策略
-- -------------------------------------

-- 用戶可以查看自己的詞彙記錄
CREATE POLICY "vocab_select_own" ON user_vocabulary
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以創建詞彙記錄
CREATE POLICY "vocab_insert_own" ON user_vocabulary
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新自己的詞彙記錄
CREATE POLICY "vocab_update_own" ON user_vocabulary
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- 用戶可以刪除詞彙記錄
CREATE POLICY "vocab_delete_own" ON user_vocabulary
  FOR DELETE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- user_wordbook 表策略
-- -------------------------------------

-- 用戶可以查看自己的生詞本
CREATE POLICY "wordbook_select_own" ON user_wordbook
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以添加到生詞本
CREATE POLICY "wordbook_insert_own" ON user_wordbook
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新生詞本
CREATE POLICY "wordbook_update_own" ON user_wordbook
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- 用戶可以刪除生詞本條目
CREATE POLICY "wordbook_delete_own" ON user_wordbook
  FOR DELETE
  USING (user_id = get_user_id_from_auth());

COMMIT;

-- =====================================================
-- 遷移完成
-- =====================================================
-- 
-- 關鍵改變：
-- 1. 創建了 get_user_id_from_auth() 函數
--    - 通過 auth.uid() 在 user_identities 中查找 users.id
--    - 支持 Google 和匿名兩種登入方式
--
-- 2. 所有 RLS 策略改用 get_user_id_from_auth()
--    - 不再直接比較 auth.uid() = user_id
--    - 正確處理多重身份架構
--
-- 3. 統一策略命名
--    - 使用英文命名，避免編碼問題
--    - 清晰的命名規則：表名_操作_範圍
-- =====================================================

