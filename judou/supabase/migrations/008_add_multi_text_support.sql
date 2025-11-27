-- 句豆對戰系統 - 多文章支持
-- 創建時間：2025-05-27
-- 
-- 支持老師選擇多篇文章進行課堂鬥豆
-- 學生在限時內按順序做題，計算正確斷句總數

-- =====================================================
-- 1. 添加 text_ids 陣列欄位
-- =====================================================
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS text_ids UUID[] DEFAULT '{}';

-- 為向後兼容，如果 text_id 有值但 text_ids 為空，自動填充
-- 這樣舊數據也能正常工作
UPDATE game_rooms 
SET text_ids = ARRAY[text_id]
WHERE text_id IS NOT NULL AND (text_ids IS NULL OR text_ids = '{}');

-- 添加註釋
COMMENT ON COLUMN game_rooms.text_ids IS '多篇文章ID列表（按順序）';
COMMENT ON COLUMN game_rooms.text_id IS '單篇文章ID（向後兼容，新遊戲優先使用 text_ids）';

-- =====================================================
-- 2. 擴展 game_participants 表以記錄多篇進度
-- =====================================================

-- 添加當前文章索引
ALTER TABLE game_participants 
ADD COLUMN IF NOT EXISTS current_text_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_texts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_breaks INT DEFAULT 0;

-- 添加註釋
COMMENT ON COLUMN game_participants.current_text_index IS '當前正在做的文章索引（0-based）';
COMMENT ON COLUMN game_participants.completed_texts IS '已完成的文章數量';
COMMENT ON COLUMN game_participants.correct_breaks IS '正確斷句位置總數（多篇累計）';

-- =====================================================
-- 3. 創建文章進度明細表（可選，用於詳細記錄每篇的成績）
-- =====================================================
CREATE TABLE IF NOT EXISTS game_text_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES game_participants(id) ON DELETE CASCADE,
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  text_index INT NOT NULL,  -- 在 text_ids 中的順序
  correct_count INT DEFAULT 0,  -- 正確斷句數
  wrong_count INT DEFAULT 0,  -- 錯誤斷句數
  time_spent INT,  -- 用時（秒）
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(participant_id, text_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_game_text_progress_participant 
ON game_text_progress(participant_id);

-- RLS
ALTER TABLE game_text_progress ENABLE ROW LEVEL SECURITY;

-- 認證用戶可以查看
CREATE POLICY "game_text_progress_select" ON game_text_progress
  FOR SELECT TO authenticated
  USING (true);

-- 用戶可以插入自己的進度
CREATE POLICY "game_text_progress_insert" ON game_text_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_participants 
      WHERE id = participant_id AND user_id = auth.uid()
    )
  );

-- 用戶可以更新自己的進度
CREATE POLICY "game_text_progress_update" ON game_text_progress
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_participants 
      WHERE id = participant_id AND user_id = auth.uid()
    )
  );

-- Realtime 支持
ALTER PUBLICATION supabase_realtime ADD TABLE game_text_progress;

-- 註釋
COMMENT ON TABLE game_text_progress IS '遊戲中每篇文章的完成進度';

