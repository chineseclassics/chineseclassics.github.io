-- =====================================================
-- 修復 AI 系統表的 RLS 策略以支持多重身份系統
-- 創建日期：2025-10-12
-- 問題：game_rounds 等表仍使用 auth.uid()，導致 403 錯誤
-- =====================================================

BEGIN;

-- ========================================
-- 1. 刪除舊的 RLS 策略
-- ========================================

-- user_profiles 表
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- game_rounds 表
DROP POLICY IF EXISTS "Users can view own game rounds" ON game_rounds;
DROP POLICY IF EXISTS "Users can insert own game rounds" ON game_rounds;
DROP POLICY IF EXISTS "Users can update own game rounds" ON game_rounds;

-- game_session_summary 表
DROP POLICY IF EXISTS "Users can view own session summary" ON game_session_summary;
DROP POLICY IF EXISTS "Users can insert own session summary" ON game_session_summary;

-- recommendation_history 表
DROP POLICY IF EXISTS "Users can view own recommendation history" ON recommendation_history;
DROP POLICY IF EXISTS "Users can insert own recommendation history" ON recommendation_history;

-- ========================================
-- 2. 創建新的 RLS 策略（使用 get_user_id_from_auth()）
-- ========================================

-- -------------------------------------
-- user_profiles 表策略
-- -------------------------------------

-- 用戶可以查看自己的畫像
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以創建自己的畫像
CREATE POLICY "profiles_insert_own" ON user_profiles
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新自己的畫像
CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- game_rounds 表策略
-- -------------------------------------

-- 用戶可以查看自己的回合記錄
CREATE POLICY "rounds_select_own" ON game_rounds
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以創建自己的回合記錄
CREATE POLICY "rounds_insert_own" ON game_rounds
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新自己的回合記錄
CREATE POLICY "rounds_update_own" ON game_rounds
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- game_session_summary 表策略
-- -------------------------------------

-- 用戶可以查看自己的會話彙總
CREATE POLICY "summary_select_own" ON game_session_summary
  FOR SELECT
  USING (user_id = get_user_id_from_auth());

-- 用戶可以創建自己的會話彙總
CREATE POLICY "summary_insert_own" ON game_session_summary
  FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth());

-- 用戶可以更新自己的會話彙總
CREATE POLICY "summary_update_own" ON game_session_summary
  FOR UPDATE
  USING (user_id = get_user_id_from_auth());

-- -------------------------------------
-- recommendation_history 表策略
-- -------------------------------------

-- 用戶可以查看自己的推薦歷史
-- 通過 session_id 關聯驗證
CREATE POLICY "recommendations_select_own" ON recommendation_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM story_sessions 
      WHERE story_sessions.id = recommendation_history.session_id 
        AND story_sessions.user_id = get_user_id_from_auth()
    )
  );

-- 用戶可以創建自己的推薦歷史
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

-- =====================================================
-- 遷移完成
-- =====================================================
-- 
-- 修復的表：
-- 1. user_profiles - 用戶畫像
-- 2. game_rounds - 遊戲回合記錄
-- 3. game_session_summary - 遊戲會話彙總
-- 4. recommendation_history - 推薦歷史
--
-- 關鍵改變：
-- - 所有策略改用 get_user_id_from_auth()
-- - 正確處理多重身份架構（Google + 匿名）
-- - 修復 403 權限錯誤
-- =====================================================

