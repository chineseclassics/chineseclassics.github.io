-- 你畫我猜 - 輪次狀態和評分系統
-- 創建時間：2025-12-09
-- 描述：添加輪次狀態、詞語選項和畫作評分功能

-- ============================================
-- 1. 更新 game_rounds 表
-- ============================================

-- 添加輪次狀態欄位
-- selecting: 畫家正在選詞
-- drawing: 繪畫進行中
-- summary: 輪次結束，顯示總結
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'selecting' 
  CHECK (status IN ('selecting', 'drawing', 'summary'));

-- 添加詞語選項欄位（給畫家選擇的 3 個詞）
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS word_options JSONB;

-- 添加筆觸數量欄位（用於檢測畫家是否有畫）
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS stroke_count INT DEFAULT 0;

-- ============================================
-- 2. 創建畫作評分表
-- ============================================

CREATE TABLE IF NOT EXISTS drawing_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id)  -- 每人每輪只能評一次
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_drawing_ratings_round_id ON drawing_ratings(round_id);

-- RLS 策略
ALTER TABLE drawing_ratings ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取評分
CREATE POLICY "drawing_ratings_select" ON drawing_ratings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 認證用戶可以插入評分（但不能給自己的畫評分）
CREATE POLICY "drawing_ratings_insert" ON drawing_ratings
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM game_rounds gr 
      WHERE gr.id = round_id 
      AND gr.drawer_id != auth.uid()
    )
  );

-- 用戶可以更新自己的評分
CREATE POLICY "drawing_ratings_update_own" ON drawing_ratings
  FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 修改 guesses 表的唯一約束
-- ============================================

-- 移除原有的唯一約束（如果存在）
-- 允許玩家多次猜測，直到猜中為止
ALTER TABLE guesses DROP CONSTRAINT IF EXISTS guesses_round_id_user_id_key;

-- 添加新的約束：每個玩家只能有一條猜中記錄
CREATE UNIQUE INDEX IF NOT EXISTS idx_guesses_correct_once 
  ON guesses(round_id, user_id) 
  WHERE is_correct = TRUE;

-- ============================================
-- 4. 啟用 Realtime 訂閱
-- ============================================

-- 啟用 drawing_ratings 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE drawing_ratings;

-- 確保 game_rounds 的 Realtime 已啟用
-- ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
