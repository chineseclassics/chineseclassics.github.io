-- 句豆 - 為註釋添加拼音支持
-- Migration: 012
-- Description: 為 text_annotations 表添加 pinyin 字段，支持在註釋中顯示拼音

-- ======================
-- 添加拼音字段
-- ======================

ALTER TABLE text_annotations 
ADD COLUMN IF NOT EXISTS pinyin TEXT;

-- 添加註釋說明
COMMENT ON COLUMN text_annotations.pinyin IS '字詞的拼音（可選，主要用於難讀字）';

-- 注意：pinyin 字段為可選（nullable），因為：
-- 1. 現有註釋可能沒有拼音
-- 2. 不是所有字詞都需要拼音（常見字不需要）
-- 3. 向後兼容現有數據

