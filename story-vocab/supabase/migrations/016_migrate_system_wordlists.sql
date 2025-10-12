-- =====================================================
-- 遷移現有系統詞表數據到統一表
-- 創建日期：2025-10-13
-- 目的：從 vocabulary + vocabulary_wordlist_mapping 遷移到 wordlist_vocabulary
-- =====================================================

BEGIN;

-- ========================================
-- 1. 遷移系統詞表數據
-- ========================================

-- 從舊表結構遷移到新表
INSERT INTO wordlist_vocabulary (wordlist_id, word, level_2_tag, level_3_tag)
SELECT 
  m.wordlist_id,
  v.word,
  m.level_2_tag,
  m.level_3_tag
FROM vocabulary_wordlist_mapping m
JOIN vocabulary v ON m.vocabulary_id = v.id
WHERE EXISTS (
  SELECT 1 FROM wordlists w 
  WHERE w.id = m.wordlist_id 
    AND w.type = 'system'
)
ON CONFLICT (wordlist_id, word, level_2_tag, level_3_tag) DO NOTHING;

-- ========================================
-- 2. 驗證遷移結果
-- ========================================

DO $$
DECLARE
  migrated_count INT;
  wordlist_count INT;
  sample_wordlist TEXT;
  sample_word_count INT;
BEGIN
  -- 統計遷移的詞彙總數
  SELECT COUNT(*) INTO migrated_count FROM wordlist_vocabulary;
  
  -- 統計涉及的詞表數量
  SELECT COUNT(DISTINCT wordlist_id) INTO wordlist_count FROM wordlist_vocabulary;
  
  -- 取樣檢查（第一個詞表的詞彙數量）
  SELECT w.name, COUNT(wv.id)
  INTO sample_wordlist, sample_word_count
  FROM wordlists w
  LEFT JOIN wordlist_vocabulary wv ON w.id = wv.wordlist_id
  WHERE w.type = 'system'
  GROUP BY w.name
  LIMIT 1;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 數據遷移完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '總詞彙數：% 條', migrated_count;
  RAISE NOTICE '詞表數量：% 個', wordlist_count;
  RAISE NOTICE '';
  RAISE NOTICE '取樣驗證：';
  RAISE NOTICE '  詞表：%', sample_wordlist;
  RAISE NOTICE '  詞彙數：% 個', sample_word_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  請手動驗證數據完整性後再執行 017 遷移';
END $$;

COMMIT;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 本遷移將現有的系統詞表數據從舊表結構遷移到新表
-- 
-- 遷移路徑：
-- vocabulary (詞彙主表)
--   + vocabulary_wordlist_mapping (關聯表)
--     → wordlist_vocabulary (統一表)
-- 
-- 遷移範圍：
-- - 只遷移系統詞表（type = 'system'）
-- - 保留層級標籤信息
-- - 使用 ON CONFLICT DO NOTHING 避免重複
-- 
-- 驗證步驟：
-- 1. 檢查遷移的詞彙總數是否正確
-- 2. 在前端測試選擇系統詞表
-- 3. 開始遊戲驗證詞彙推薦是否正常
-- 
-- 如果驗證通過，可以執行下一步：
-- 017_drop_old_vocabulary_tables.sql
-- =====================================================

