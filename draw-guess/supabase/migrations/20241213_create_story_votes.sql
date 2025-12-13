-- 分鏡接龍模式 - 投票記錄表
-- 創建時間：2024-12-13
-- 描述：存儲玩家的投票記錄
-- Requirements: 5.3

-- ============================================
-- 1. 創建 story_votes 表
-- ============================================

CREATE TABLE IF NOT EXISTS story_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES story_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, voter_id)  -- 每個玩家每輪只能投一票
);

-- ============================================
-- 2. 索引優化
-- ============================================

-- 輪次索引（查詢當前輪次的所有投票）
CREATE INDEX IF NOT EXISTS idx_story_votes_round ON story_votes(round_id);

-- 提交索引（統計每個句子的得票數）
CREATE INDEX IF NOT EXISTS idx_story_votes_submission ON story_votes(submission_id);

-- 投票者索引（檢查是否已投票）
CREATE INDEX IF NOT EXISTS idx_story_votes_voter ON story_votes(round_id, voter_id);

-- ============================================
-- 3. Row Level Security (RLS) 策略
-- ============================================

ALTER TABLE story_votes ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取投票記錄（用於統計和結算）
CREATE POLICY "story_votes_select" ON story_votes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 玩家可以插入自己的投票
CREATE POLICY "story_votes_insert" ON story_votes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = voter_id);

-- 玩家可以更新自己的投票（更改投票）
CREATE POLICY "story_votes_update_own" ON story_votes
  FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = voter_id);

-- 玩家可以刪除自己的投票（用於更改投票）
CREATE POLICY "story_votes_delete_own" ON story_votes
  FOR DELETE
  TO authenticated, anon
  USING (auth.uid() = voter_id);

-- ============================================
-- 4. 啟用 Realtime 訂閱
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE story_votes;

-- ============================================
-- 5. 自投限制函數（可選，應用層也會檢查）
-- ============================================

-- 創建函數檢查是否投給自己
CREATE OR REPLACE FUNCTION check_self_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- 檢查投票者是否是句子的作者
  IF EXISTS (
    SELECT 1 FROM story_submissions 
    WHERE id = NEW.submission_id 
    AND user_id = NEW.voter_id
  ) THEN
    RAISE EXCEPTION '不能投票給自己的句子';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
CREATE TRIGGER prevent_self_vote
  BEFORE INSERT OR UPDATE ON story_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_self_vote();

-- ============================================
-- 6. 註釋
-- ============================================

COMMENT ON TABLE story_votes IS '投票記錄表，存儲玩家的投票選擇';
COMMENT ON COLUMN story_votes.voter_id IS '投票者 ID';
COMMENT ON COLUMN story_votes.submission_id IS '被投票的句子 ID';
