-- 句豆 - 增強歷史記錄追蹤
-- Migration: 010
-- Description: 擴展交易類型支持練習得豆，創建閱讀記錄表

-- ======================
-- 1. 擴展 game_transactions 表的交易類型
-- ======================

-- 修改 type 欄位的 CHECK 約束，添加練習相關類型
ALTER TABLE game_transactions DROP CONSTRAINT IF EXISTS game_transactions_type_check;
ALTER TABLE game_transactions ADD CONSTRAINT game_transactions_type_check 
  CHECK (type IN (
    'entry_fee',        -- 入場費
    'prize',            -- 獎勵
    'refund',           -- 退款
    'win_streak_bonus', -- 連勝獎勵
    'practice_reward',  -- 練習獎勵（新增）
    'daily_login',      -- 每日登入獎勵（新增）
    'daily_first',      -- 每日首練獎勵（新增）
    'level_up'          -- 升級獎勵（新增，預留）
  ));

-- 添加練習記錄關聯欄位（可選）
ALTER TABLE game_transactions 
ADD COLUMN IF NOT EXISTS practice_record_id UUID REFERENCES practice_records(id) ON DELETE SET NULL;

-- 添加文章關聯欄位（可選）
ALTER TABLE game_transactions 
ADD COLUMN IF NOT EXISTS text_id UUID REFERENCES practice_texts(id) ON DELETE SET NULL;

-- 重命名表為更通用的名稱（保持向後兼容，創建視圖）
-- 注意：不實際重命名表，而是創建一個視圖別名
CREATE OR REPLACE VIEW bean_transactions AS
SELECT * FROM game_transactions;

COMMENT ON VIEW bean_transactions IS '豆子交易記錄視圖（game_transactions 的別名）';

-- ======================
-- 2. 創建閱讀記錄表
-- ======================

CREATE TABLE IF NOT EXISTS reading_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  
  -- 閱讀進度
  progress INTEGER NOT NULL DEFAULT 0,           -- 閱讀進度百分比 (0-100)
  is_completed BOOLEAN NOT NULL DEFAULT false,   -- 是否完成閱讀
  
  -- 閱讀時間統計
  read_duration INTEGER NOT NULL DEFAULT 0,      -- 累計閱讀時長（秒）
  read_count INTEGER NOT NULL DEFAULT 1,         -- 閱讀次數
  
  -- 時間戳
  first_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 首次閱讀時間
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),   -- 最後閱讀時間
  completed_at TIMESTAMP WITH TIME ZONE,                  -- 完成時間
  
  -- 唯一約束：每個用戶每篇文章一條記錄
  CONSTRAINT reading_records_user_text_unique UNIQUE (user_id, text_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reading_records_user_id ON reading_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_records_text_id ON reading_records(text_id);
CREATE INDEX IF NOT EXISTS idx_reading_records_last_read ON reading_records(last_read_at DESC);

-- 註釋
COMMENT ON TABLE reading_records IS '用戶閱讀記錄';
COMMENT ON COLUMN reading_records.progress IS '閱讀進度百分比 (0-100)';
COMMENT ON COLUMN reading_records.read_duration IS '累計閱讀時長（秒）';
COMMENT ON COLUMN reading_records.read_count IS '閱讀次數';

-- ======================
-- 3. RLS 策略
-- ======================

-- 啟用 RLS
ALTER TABLE reading_records ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己的閱讀記錄
CREATE POLICY "Users can view own reading records"
  ON reading_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 用戶可以插入自己的閱讀記錄
CREATE POLICY "Users can insert own reading records"
  ON reading_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 用戶可以更新自己的閱讀記錄
CREATE POLICY "Users can update own reading records"
  ON reading_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ======================
-- 4. 創建統計視圖（方便查詢）
-- ======================

-- 用戶活動統計視圖
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT 
  u.id as user_id,
  u.display_name,
  -- 練習統計
  COALESCE(pr.practice_count, 0) as total_practices,
  COALESCE(pr.best_accuracy, 0) as best_accuracy,
  -- 對戰統計
  COALESCE(gp.game_count, 0) as total_games,
  COALESCE(gp.win_count, 0) as total_wins,
  -- 閱讀統計
  COALESCE(rr.reading_count, 0) as total_readings,
  COALESCE(rr.completed_count, 0) as completed_readings,
  -- 豆子統計
  COALESCE(p.total_beans, 0) as total_beans
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) as practice_count, MAX(accuracy) as best_accuracy
  FROM practice_records
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) pr ON pr.user_id = u.id
LEFT JOIN (
  SELECT gp.user_id, COUNT(*) as game_count,
         COUNT(*) FILTER (WHERE gr.winner_user_id = gp.user_id) as win_count
  FROM game_participants gp
  JOIN game_rooms gr ON gr.id = gp.room_id
  WHERE gr.status = 'finished'
  GROUP BY gp.user_id
) gp ON gp.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*) as reading_count,
         COUNT(*) FILTER (WHERE is_completed = true) as completed_count
  FROM reading_records
  GROUP BY user_id
) rr ON rr.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id;

COMMENT ON VIEW user_activity_stats IS '用戶活動統計視圖';


