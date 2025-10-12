-- =====================================================
-- 修復 AI 系統表的 RLS 策略（安全版本）
-- 創建日期：2025-10-12
-- 說明：完全清理並重建策略，避免命名衝突
-- =====================================================

BEGIN;

-- ========================================
-- 1. 完全清理：刪除所有可能存在的策略
-- ========================================

-- user_profiles 表 - 刪除所有策略
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;

-- game_rounds 表 - 刪除所有策略
DROP POLICY IF EXISTS "Users can view own game rounds" ON game_rounds;
DROP POLICY IF EXISTS "Users can insert own game rounds" ON game_rounds;
DROP POLICY IF EXISTS "Users can update own game rounds" ON game_rounds;
DROP POLICY IF EXISTS "rounds_select_own" ON game_rounds;
DROP POLICY IF EXISTS "rounds_insert_own" ON game_rounds;
DROP POLICY IF EXISTS "rounds_update_own" ON game_rounds;

-- game_session_summary 表 - 刪除所有策略
DROP POLICY IF EXISTS "Users can view own session summary" ON game_session_summary;
DROP POLICY IF EXISTS "Users can insert own session summary" ON game_session_summary;
DROP POLICY IF EXISTS "Users can update own session summary" ON game_session_summary;
DROP POLICY IF EXISTS "summary_select_own" ON game_session_summary;
DROP POLICY IF EXISTS "summary_insert_own" ON game_session_summary;
DROP POLICY IF EXISTS "summary_update_own" ON game_session_summary;

-- recommendation_history 表 - 刪除所有策略
DROP POLICY IF EXISTS "Users can view own recommendation history" ON recommendation_history;
DROP POLICY IF EXISTS "Users can insert own recommendation history" ON recommendation_history;
DROP POLICY IF EXISTS "recommendations_select_own" ON recommendation_history;
DROP POLICY IF EXISTS "recommendations_insert_own" ON recommendation_history;

-- ========================================
-- 2. 重新創建正確的策略
-- ========================================

-- -------------------------------------
-- user_profiles 表
-- -------------------------------------

CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "profiles_insert_own" ON user_profiles
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- game_rounds 表（修復 403 錯誤）
-- -------------------------------------

CREATE POLICY "rounds_select_own" ON game_rounds
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "rounds_insert_own" ON game_rounds
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "rounds_update_own" ON game_rounds
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- game_session_summary 表
-- -------------------------------------

CREATE POLICY "summary_select_own" ON game_session_summary
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "summary_insert_own" ON game_session_summary
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "summary_update_own" ON game_session_summary
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- recommendation_history 表
-- -------------------------------------

CREATE POLICY "recommendations_select_own" ON recommendation_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM story_sessions 
      WHERE story_sessions.id = recommendation_history.session_id 
        AND story_sessions.user_id = get_user_id_from_auth()
    )
  );

CREATE POLICY "recommendations_insert_own" ON recommendation_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_sessions 
      WHERE story_sessions.id = recommendation_history.session_id 
        AND story_sessions.user_id = get_user_id_from_auth()
    )
  );

COMMIT;

-- ========================================
-- 3. 驗證結果
-- ========================================

-- 查看創建的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history')
ORDER BY tablename, policyname;

-- =====================================================
-- 遷移完成
-- =====================================================

