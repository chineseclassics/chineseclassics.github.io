-- =====================================================
-- 優化三級標籤查詢
-- 創建日期：2025-10-18
-- 目的：解決點擊二級卡片時查詢超時問題
-- =====================================================

BEGIN;

-- ========================================
-- 1. 創建優化的查詢函數
-- ========================================

-- 獲取某個二級分類下的所有三級標籤（去重）
CREATE OR REPLACE FUNCTION get_level3_tags_for_level2(
  p_wordlist_id UUID,
  p_level_2_tag TEXT
)
RETURNS TABLE (
  level_3_tag TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT wv.level_3_tag
  FROM wordlist_vocabulary wv
  WHERE wv.wordlist_id = p_wordlist_id
    AND wv.level_2_tag = p_level_2_tag
    AND wv.level_3_tag IS NOT NULL
  ORDER BY wv.level_3_tag;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ========================================
-- 2. 添加函數註釋
-- ========================================

COMMENT ON FUNCTION get_level3_tags_for_level2 IS '
獲取指定詞表和二級分類下的所有三級標籤（去重）
用於層級卡片模態窗口的快速查詢
';

-- ========================================
-- 3. 驗證索引是否存在
-- ========================================

-- 確保關鍵索引存在
DO $$
BEGIN
  -- 檢查複合索引是否存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'wordlist_vocabulary' 
    AND indexname = 'idx_wordlist_vocab_tags'
  ) THEN
    -- 如果不存在，創建索引
    CREATE INDEX idx_wordlist_vocab_tags 
    ON wordlist_vocabulary(wordlist_id, level_2_tag, level_3_tag);
    RAISE NOTICE '✅ 已創建索引 idx_wordlist_vocab_tags';
  ELSE
    RAISE NOTICE 'ℹ️ 索引 idx_wordlist_vocab_tags 已存在';
  END IF;
END $$;

-- ========================================
-- 4. 完成信息
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 三級標籤查詢優化完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 新增函數：';
  RAISE NOTICE '  - get_level3_tags_for_level2()';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 索引驗證：';
  RAISE NOTICE '  - idx_wordlist_vocab_tags (已確認)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 使用方式：';
  RAISE NOTICE '  SELECT * FROM get_level3_tags_for_level2(';
  RAISE NOTICE '    ''wordlist-uuid'',';
  RAISE NOTICE '    ''二下單元一''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- 說明
-- =====================================================
--
-- 本遷移解決了層級卡片查詢超時的問題：
--
-- 問題：
-- - 前端查詢 wordlist_vocabulary 表時超時（10秒）
-- - 導致模態窗口延遲打開
-- - 降級方案會顯示所有三級標籤（不正確）
--
-- 解決方案：
-- 1. 創建專用的 RPC 函數，使用 DISTINCT 去重
-- 2. 函數標記為 STABLE，允許查詢計劃優化
-- 3. 確保複合索引存在
--
-- 性能提升：
-- - 從 10+ 秒超時 → 預計 < 100ms
-- - DISTINCT 在數據庫端執行（更高效）
-- - 索引覆蓋查詢條件
--
-- =====================================================

