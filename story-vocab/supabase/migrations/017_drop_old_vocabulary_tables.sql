-- =====================================================
-- 刪除舊的詞彙表結構
-- 創建日期：2025-10-13
-- ⚠️  警告：此操作不可逆，執行前請確保數據已正確遷移
-- =====================================================

-- ⚠️⚠️⚠️ 重要提醒 ⚠️⚠️⚠️
-- 執行此遷移前，請確認：
-- 1. 已執行 015 和 016 遷移
-- 2. 已在前端測試系統詞表功能正常
-- 3. 已備份數據庫（如需回滾）

BEGIN;

-- ========================================
-- 1. 刪除 vocabulary_wordlist_mapping 表的 RLS 策略
-- ========================================

DROP POLICY IF EXISTS "Mappings are readable if wordlist is readable" ON vocabulary_wordlist_mapping;
DROP POLICY IF EXISTS "Users can manage mappings of own wordlists" ON vocabulary_wordlist_mapping;

-- ========================================
-- 2. 刪除 vocabulary 表的 RLS 策略
-- ========================================

DROP POLICY IF EXISTS "public_read_vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "public_insert_vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "public_update_vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "public_delete_vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "Vocabulary is readable by everyone" ON vocabulary;

-- ========================================
-- 3. 刪除舊表（CASCADE 會同時刪除依賴）
-- ========================================

-- 先刪除映射表（外鍵依賴 vocabulary）
DROP TABLE IF EXISTS vocabulary_wordlist_mapping CASCADE;

-- 再刪除詞彙主表
DROP TABLE IF EXISTS vocabulary CASCADE;

-- ========================================
-- 4. 驗證結果
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 舊詞彙表結構已刪除';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已刪除的表：';
  RAISE NOTICE '  - vocabulary';
  RAISE NOTICE '  - vocabulary_wordlist_mapping';
  RAISE NOTICE '';
  RAISE NOTICE '新架構：';
  RAISE NOTICE '  - wordlist_vocabulary（統一詞彙表）';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  如需回滾，請從備份恢復數據庫';
END $$;

COMMIT;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 本遷移完成了詞表系統的架構重構：
-- 
-- 刪除的表：
-- 1. vocabulary - 全局詞彙表
-- 2. vocabulary_wordlist_mapping - 詞彙-詞表映射表
-- 
-- 新架構：
-- - wordlist_vocabulary - 統一詞彙表（系統+自定義）
-- 
-- 優勢：
-- 1. 架構簡化：單一詞彙表
-- 2. 易於擴展：添加新系統詞表只需導入數據
-- 3. 權限清晰：RLS 策略統一管理
-- 4. AI 自由：智能模式不依賴數據庫詞彙
-- 
-- 後續步驟：
-- 1. 修改前端代碼（screens.js）
-- 2. 修改 Edge Function（vocab-recommender）
-- 3. 測試三種模式（系統詞表、自定義詞表、AI智能）
-- 
-- 注意事項：
-- - user_vocabulary 表保留（未來可能重構）
-- - 如有問題，從備份恢復：psql < backup.sql
-- =====================================================

