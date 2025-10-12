-- 修復 user_wordlist_preferences 表的 RLS 策略
-- 問題：策略使用 auth.uid() 而不是 get_user_id_from_auth()
-- 日期：2025-10-12

-- 刪除舊的策略
DROP POLICY IF EXISTS "Users can view own preferences" ON user_wordlist_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_wordlist_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_wordlist_preferences;

-- 創建新的策略，使用 get_user_id_from_auth() 映射函數
CREATE POLICY "Users can view own preferences" ON user_wordlist_preferences
  FOR SELECT 
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "Users can insert own preferences" ON user_wordlist_preferences
  FOR INSERT 
  WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "Users can update own preferences" ON user_wordlist_preferences
  FOR UPDATE 
  USING (user_id = get_user_id_from_auth());

-- 驗證策略已更新
DO $$
BEGIN
  RAISE NOTICE '✅ user_wordlist_preferences RLS 策略已修復';
  RAISE NOTICE '   使用 get_user_id_from_auth() 進行用戶 ID 映射';
END $$;

