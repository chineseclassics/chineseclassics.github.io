-- =====================================================
-- 修復詞表系統的 RLS 策略
-- 創建日期：2025-10-12
-- 問題：wordlists、wordlist_tags、vocabulary_wordlist_mapping 
--       三個表的策略仍在使用 auth.uid()
-- 影響：用戶無法訪問和管理自己創建的自定義詞表
-- =====================================================

BEGIN;

-- ========================================
-- 1. wordlists 表：修復自定義詞表的權限
-- ========================================

-- 刪除舊的策略
DROP POLICY IF EXISTS "Users can view own custom wordlists" ON wordlists;
DROP POLICY IF EXISTS "Users can insert own wordlists" ON wordlists;
DROP POLICY IF EXISTS "Users can update own wordlists" ON wordlists;
DROP POLICY IF EXISTS "Users can delete own wordlists" ON wordlists;

-- 創建新的策略，使用 get_user_id_from_auth()
CREATE POLICY "Users can view own custom wordlists" ON wordlists
  FOR SELECT 
  USING (type = 'custom' AND owner_id = get_user_id_from_auth());

CREATE POLICY "Users can insert own wordlists" ON wordlists
  FOR INSERT 
  WITH CHECK (type = 'custom' AND owner_id = get_user_id_from_auth());

CREATE POLICY "Users can update own wordlists" ON wordlists
  FOR UPDATE 
  USING (type = 'custom' AND owner_id = get_user_id_from_auth());

CREATE POLICY "Users can delete own wordlists" ON wordlists
  FOR DELETE 
  USING (type = 'custom' AND owner_id = get_user_id_from_auth());

-- ========================================
-- 2. wordlist_tags 表：修復標籤權限
-- ========================================

-- 刪除舊的策略
DROP POLICY IF EXISTS "Tags are readable if wordlist is readable" ON wordlist_tags;
DROP POLICY IF EXISTS "Users can manage tags of own wordlists" ON wordlist_tags;

-- 創建新的策略
CREATE POLICY "Tags are readable if wordlist is readable" ON wordlist_tags
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = wordlist_tags.wordlist_id 
        AND (
          w.type = 'system' 
          OR w.owner_id = get_user_id_from_auth()
          OR w.is_public = true
        )
    )
  );

CREATE POLICY "Users can manage tags of own wordlists" ON wordlist_tags
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = wordlist_tags.wordlist_id 
        AND w.owner_id = get_user_id_from_auth()
    )
  );

-- ========================================
-- 3. vocabulary_wordlist_mapping 表：修復映射權限
-- ========================================

-- 刪除舊的策略
DROP POLICY IF EXISTS "Mappings are readable if wordlist is readable" ON vocabulary_wordlist_mapping;
DROP POLICY IF EXISTS "Users can manage mappings of own wordlists" ON vocabulary_wordlist_mapping;

-- 創建新的策略
CREATE POLICY "Mappings are readable if wordlist is readable" ON vocabulary_wordlist_mapping
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = vocabulary_wordlist_mapping.wordlist_id 
        AND (
          w.type = 'system' 
          OR w.owner_id = get_user_id_from_auth()
          OR w.is_public = true
        )
    )
  );

CREATE POLICY "Users can manage mappings of own wordlists" ON vocabulary_wordlist_mapping
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = vocabulary_wordlist_mapping.wordlist_id 
        AND w.owner_id = get_user_id_from_auth()
    )
  );

COMMIT;

-- ========================================
-- 驗證策略已更新
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ 詞表系統 RLS 策略已修復';
  RAISE NOTICE '   - wordlists: 4 個策略已更新';
  RAISE NOTICE '   - wordlist_tags: 2 個策略已更新';
  RAISE NOTICE '   - vocabulary_wordlist_mapping: 2 個策略已更新';
  RAISE NOTICE '   所有策略現在使用 get_user_id_from_auth() 進行用戶 ID 映射';
END $$;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 修復內容：
-- 1. wordlists 表 - 自定義詞表的所有權限檢查
--    - SELECT: 查看自己的詞表
--    - INSERT: 創建新詞表
--    - UPDATE: 更新詞表信息
--    - DELETE: 刪除詞表
--
-- 2. wordlist_tags 表 - 詞表標籤管理
--    - SELECT: 查看詞表標籤（關聯查詢）
--    - ALL: 管理自己詞表的標籤
--
-- 3. vocabulary_wordlist_mapping 表 - 詞彙映射
--    - SELECT: 查看詞表中的詞彙（關聯查詢）
--    - ALL: 管理自己詞表的詞彙映射
--
-- 關鍵改變：
-- - 所有 auth.uid() 改為 get_user_id_from_auth()
-- - 支持多重身份系統（Google + 匿名登入）
-- - 修復自定義詞表功能的權限問題
-- =====================================================

