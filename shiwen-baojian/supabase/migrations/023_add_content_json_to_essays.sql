-- 時文寶鑑 - 添加 content_json 欄位到 essays 表
-- Migration: 023
-- Description: 支持存儲完整的作業內容 JSON（用於練筆和作業恢復）

-- ======================
-- 添加 content_json 欄位
-- ======================

ALTER TABLE essays 
  ADD COLUMN IF NOT EXISTS content_json JSONB;

COMMENT ON COLUMN essays.content_json IS '完整的作業內容 JSON（包括引言、分論點、結論等所有內容）';

-- ======================
-- 索引優化
-- ======================

-- 為 content_json 添加 GIN 索引（支持 JSON 查詢）
CREATE INDEX IF NOT EXISTS idx_essays_content_json 
  ON essays USING gin(content_json);

COMMENT ON TABLE essays IS '論文表 - assignment_id 可為 NULL 用於自主練筆';

