-- =====================================================
-- 移除 hsk_level 字段
-- Migration: 008_remove_hsk_level
-- Reason: HSK分级针对外语学习者，与母语学习者的L1-L6难度分级体系不匹配
-- =====================================================

-- 1. 移除 hsk_level 字段
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'hsk_level'
  ) THEN
    -- 删除索引（如果存在）
    DROP INDEX IF EXISTS idx_vocabulary_hsk_level;
    
    -- 删除字段
    ALTER TABLE vocabulary DROP COLUMN hsk_level;
    
    RAISE NOTICE '✅ 已移除 hsk_level 字段及其索引';
  ELSE
    RAISE NOTICE 'ℹ️ hsk_level 字段不存在，跳过';
  END IF;
END $$;

-- 2. 说明
COMMENT ON TABLE vocabulary IS '词汇表：存储所有唯一词汇。难度等级(difficulty_level 1-6)针对母语学习者(7-18岁)，基于150个黄金标准校准词的AI评估。如需HSK分级，请使用词表系统(wordlists + wordlist_tags)。';

-- 完成
SELECT '✅ Migration 008 完成：已移除 hsk_level 字段' AS status;

