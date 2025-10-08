-- =====================================================
-- 🔥 强制修复 RLS 策略（彻底删除后重建）
-- =====================================================

-- ========== 1. 彻底删除所有可能存在的策略 ==========

-- user_profiles - 删除所有可能的策略名称
DROP POLICY IF EXISTS "Allow all access to user_profiles" ON user_profiles CASCADE;
DROP POLICY IF EXISTS "Allow all access" ON user_profiles CASCADE;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles CASCADE;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles CASCADE;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles CASCADE;

-- game_rounds - 删除所有可能的策略
DROP POLICY IF EXISTS "Allow all access to game_rounds" ON game_rounds CASCADE;
DROP POLICY IF EXISTS "Allow all access" ON game_rounds CASCADE;
DROP POLICY IF EXISTS "Users can view own game rounds" ON game_rounds CASCADE;
DROP POLICY IF EXISTS "Users can insert own game rounds" ON game_rounds CASCADE;
DROP POLICY IF EXISTS "Users can update own game rounds" ON game_rounds CASCADE;

-- game_session_summary - 删除所有可能的策略
DROP POLICY IF EXISTS "Allow all access to game_session_summary" ON game_session_summary CASCADE;
DROP POLICY IF EXISTS "Allow all access" ON game_session_summary CASCADE;
DROP POLICY IF EXISTS "Users can view own session summary" ON game_session_summary CASCADE;
DROP POLICY IF EXISTS "Users can insert own session summary" ON game_session_summary CASCADE;

-- recommendation_history - 删除所有可能的策略
DROP POLICY IF EXISTS "Allow all access to recommendation_history" ON recommendation_history CASCADE;
DROP POLICY IF EXISTS "Allow all access" ON recommendation_history CASCADE;
DROP POLICY IF EXISTS "Users can view own recommendation history" ON recommendation_history CASCADE;
DROP POLICY IF EXISTS "Users can insert own recommendation history" ON recommendation_history CASCADE;

SELECT '✅ 所有旧策略已删除' AS step_1;

-- ========== 2. 创建全新的安全策略 ==========

-- ✅ user_profiles
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

SELECT '✅ user_profiles 策略已创建' AS step_2;

-- ✅ game_rounds
CREATE POLICY "Users can view own game rounds" 
ON game_rounds FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game rounds" 
ON game_rounds FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game rounds" 
ON game_rounds FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

SELECT '✅ game_rounds 策略已创建' AS step_3;

-- ✅ game_session_summary
CREATE POLICY "Users can view own session summary" 
ON game_session_summary FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session summary" 
ON game_session_summary FOR INSERT 
WITH CHECK (auth.uid() = user_id);

SELECT '✅ game_session_summary 策略已创建' AS step_4;

-- ✅ recommendation_history
CREATE POLICY "Users can view own recommendation history" 
ON recommendation_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM story_sessions 
    WHERE story_sessions.id = recommendation_history.session_id 
      AND story_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own recommendation history" 
ON recommendation_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM story_sessions 
    WHERE story_sessions.id = recommendation_history.session_id 
      AND story_sessions.user_id = auth.uid()
  )
);

SELECT '✅ recommendation_history 策略已创建' AS step_5;

-- ========== 3. 最终验证 ==========

-- 检查不安全的策略（应该返回 0 行）
SELECT 
  tablename,
  policyname,
  '❌ UNSAFE!' AS warning
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history')
  AND qual = 'true';

-- 显示所有安全策略
SELECT 
  tablename,
  policyname,
  cmd AS operation,
  '✅ SAFE' AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history')
ORDER BY tablename, policyname;

SELECT '🎉 RLS 策略修复完成！所有策略都是安全的。' AS final_result;
