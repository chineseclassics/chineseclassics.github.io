-- 句豆 - 添加註釋來源追蹤
-- Migration: 013
-- Description: 為 text_annotations 表添加 source 和 is_edited 字段，用於區分 AI 生成和用戶手動添加的註釋

-- ======================
-- 添加來源和編輯標記字段
-- ======================

ALTER TABLE text_annotations 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' 
CHECK (source IN ('ai', 'manual'));

ALTER TABLE text_annotations 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- 添加註釋說明
COMMENT ON COLUMN text_annotations.source IS '註釋來源：ai=AI 生成，manual=用戶手動添加';
COMMENT ON COLUMN text_annotations.is_edited IS '是否被用戶編輯過：true=已編輯，false=未編輯';

-- 創建索引（用於快速查詢 AI 生成的未編輯註釋）
CREATE INDEX IF NOT EXISTS idx_text_annotations_source_edited 
ON text_annotations(text_id, source, is_edited) 
WHERE source = 'ai' AND is_edited = false;

-- 注意：不需要向後兼容，現有註釋都是測試版，默認 source = 'manual' 即可

