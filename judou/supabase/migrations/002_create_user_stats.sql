-- 句豆 - 用戶統計表
-- Migration: 002
-- Description: 創建用戶統計表，記錄豆子、經驗值、練習次數等

-- ======================
-- 用戶統計表
-- ======================
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beans INTEGER NOT NULL DEFAULT 0,              -- 豆子數量
  total_exp INTEGER NOT NULL DEFAULT 0,          -- 總經驗值
  total_practices INTEGER NOT NULL DEFAULT 0,    -- 總練習次數
  correct_count INTEGER NOT NULL DEFAULT 0,      -- 正確次數
  streak_days INTEGER NOT NULL DEFAULT 0,        -- 連續學習天數
  last_practice_at TIMESTAMP WITH TIME ZONE,     -- 最後練習時間
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_stats_user_unique UNIQUE (user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_beans ON user_stats(beans DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_exp ON user_stats(total_exp DESC);

-- 註釋
COMMENT ON TABLE user_stats IS '用戶統計數據';
COMMENT ON COLUMN user_stats.beans IS '豆子數量（獎勵貨幣）';
COMMENT ON COLUMN user_stats.total_exp IS '總經驗值（用於計算等級）';
COMMENT ON COLUMN user_stats.total_practices IS '總練習次數';
COMMENT ON COLUMN user_stats.correct_count IS '正確次數';
COMMENT ON COLUMN user_stats.streak_days IS '連續學習天數';
COMMENT ON COLUMN user_stats.last_practice_at IS '最後練習時間';

-- ======================
-- RLS 策略
-- ======================
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己的統計
CREATE POLICY "用戶可以查看自己的統計"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶可以插入自己的統計
CREATE POLICY "用戶可以創建自己的統計"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶可以更新自己的統計
CREATE POLICY "用戶可以更新自己的統計"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- 老師可以查看所有學生的統計（用於排行榜等功能）
CREATE POLICY "認證用戶可以查看所有統計"
  ON user_stats FOR SELECT
  USING (auth.role() = 'authenticated');

