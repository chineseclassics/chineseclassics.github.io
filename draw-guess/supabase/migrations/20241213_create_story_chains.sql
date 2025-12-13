-- 分鏡接龍模式 - 故事鏈表
-- 創建時間：2024-12-13
-- 描述：存儲每一輪勝出結果的數據結構，包含文字和圖片交替的內容
-- Requirements: 6.5, 8.2

-- ============================================
-- 1. 創建 story_chains 表
-- ============================================

CREATE TABLE IF NOT EXISTS story_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'image')),
  content TEXT NOT NULL,  -- 文字內容或圖片 URL
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 索引優化
-- ============================================

-- 房間和輪次索引（按順序查詢故事鏈）
CREATE INDEX IF NOT EXISTS idx_story_chains_room ON story_chains(room_id, round_number);

-- 作者索引（統計貢獻）
CREATE INDEX IF NOT EXISTS idx_story_chains_author ON story_chains(author_id);

-- ============================================
-- 3. Row Level Security (RLS) 策略
-- ============================================

ALTER TABLE story_chains ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取故事鏈（用於故事回顧）
CREATE POLICY "story_chains_select" ON story_chains
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 房間參與者可以插入故事鏈項目
CREATE POLICY "story_chains_insert" ON story_chains
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = story_chains.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. 啟用 Realtime 訂閱
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE story_chains;

-- ============================================
-- 5. 註釋
-- ============================================

COMMENT ON TABLE story_chains IS '故事鏈表，存儲分鏡接龍模式中每輪的勝出句子和畫作截圖';
COMMENT ON COLUMN story_chains.item_type IS '項目類型：text（文字）或 image（圖片URL）';
COMMENT ON COLUMN story_chains.content IS '內容：文字句子或 Supabase Storage 圖片 URL';
COMMENT ON COLUMN story_chains.round_number IS '輪次編號，0 表示故事開頭';
