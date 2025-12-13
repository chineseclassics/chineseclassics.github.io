-- 分鏡接龍模式 - 故事句子提交表
-- 創建時間：2024-12-13
-- 描述：存儲編劇提交的故事句子
-- Requirements: 4.4

-- ============================================
-- 1. 創建 story_submissions 表
-- ============================================

CREATE TABLE IF NOT EXISTS story_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sentence TEXT NOT NULL,
  vote_count INT DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id)  -- 每個編劇每輪只能提交一個句子
);

-- ============================================
-- 2. 索引優化
-- ============================================

-- 輪次索引（查詢當前輪次的所有提交）
CREATE INDEX IF NOT EXISTS idx_story_submissions_round ON story_submissions(round_id);

-- 用戶索引（統計用戶貢獻）
CREATE INDEX IF NOT EXISTS idx_story_submissions_user ON story_submissions(user_id);

-- 勝出句子索引
CREATE INDEX IF NOT EXISTS idx_story_submissions_winner ON story_submissions(round_id, is_winner) WHERE is_winner = true;

-- ============================================
-- 3. 更新時間觸發器
-- ============================================

CREATE TRIGGER update_story_submissions_updated_at
  BEFORE UPDATE ON story_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Row Level Security (RLS) 策略
-- ============================================

ALTER TABLE story_submissions ENABLE ROW LEVEL SECURITY;

-- 投票階段後所有人可以讀取提交（用於投票和結算）
CREATE POLICY "story_submissions_select" ON story_submissions
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 編劇可以插入自己的提交
CREATE POLICY "story_submissions_insert" ON story_submissions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = user_id);

-- 編劇可以更新自己的提交（投票開始前）
CREATE POLICY "story_submissions_update_own" ON story_submissions
  FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = user_id);

-- ============================================
-- 5. 啟用 Realtime 訂閱
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE story_submissions;

-- ============================================
-- 6. 註釋
-- ============================================

COMMENT ON TABLE story_submissions IS '故事句子提交表，存儲編劇提交的故事句子';
COMMENT ON COLUMN story_submissions.sentence IS '編劇提交的故事句子（最多 100 字符）';
COMMENT ON COLUMN story_submissions.vote_count IS '獲得的投票數';
COMMENT ON COLUMN story_submissions.is_winner IS '是否為勝出句子';
