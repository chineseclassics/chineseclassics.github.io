-- 句豆對戰系統 - 添加豆製品徽章字段
-- Migration: 017
-- Description: 為 game_teams 表添加 bean_product 字段，支持豆製品徽章系統

-- =====================================================
-- 添加 bean_product 字段到 game_teams 表
-- =====================================================

ALTER TABLE game_teams 
ADD COLUMN IF NOT EXISTS bean_product TEXT 
CHECK (bean_product IS NULL OR bean_product IN ('豆芽', '豆乾', '豆腐', '豆包', '豆豉', '豆漿', '油豆腐', '豆苗'));

-- 添加索引（用於查詢和過濾）
CREATE INDEX IF NOT EXISTS idx_game_teams_bean_product 
ON game_teams(bean_product);

-- 添加註釋
COMMENT ON COLUMN game_teams.bean_product IS '豆製品徽章類型（用於隊伍標識和成就系統）';

