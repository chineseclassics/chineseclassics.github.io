-- =====================================================
-- AI 智能詞彙推薦系統 - 數據庫結構
-- Migration: 006_ai_vocab_system
-- Purpose: 支持校準測試和AI智能推薦
-- 注意: 與現有表結構兼容，不覆蓋現有數據
-- =====================================================

-- ========== 用戶畫像表（極簡） ==========
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基線數據（第一次校準遊戲）
  baseline_level INT,                    -- 校準基線 (1-6整數)
  calibrated BOOLEAN DEFAULT false,      -- 是否已完成校準
  calibration_date TIMESTAMP,            -- 校準完成時間
  
  -- 當前評估
  current_level INT DEFAULT 2,           -- 當前水平 (1-6整數)
  total_games INT DEFAULT 0,             -- 總遊戲次數
  total_rounds INT DEFAULT 0,            -- 總輪次
  
  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 遊戲回合記錄（核心數據源） ==========
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  -- 推薦的詞（JSON數組）
  recommended_words JSONB,               -- [{"word":"高興","difficulty":1}, ...]
  
  -- 用戶選擇
  selected_word TEXT NOT NULL,
  selected_difficulty INT,               -- 所選詞的難度等級
  
  -- 用戶創作
  user_sentence TEXT NOT NULL,
  response_time INT,                     -- 響應時間（秒）
  
  -- AI 評分
  ai_score INT,                          -- 1-10 綜合評分
  ai_feedback TEXT,                      -- AI 反饋文字
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 遊戲會話彙總表 ==========
CREATE TABLE IF NOT EXISTS game_session_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  session_number INT NOT NULL,           -- 第幾次遊戲
  session_type TEXT NOT NULL,            -- 'calibration' | 'normal'
  
  -- 本次遊戲統計
  total_rounds INT,
  avg_score DECIMAL(3,1),
  avg_selected_difficulty DECIMAL(3,1),
  
  -- 評估結果
  estimated_level_before INT,            -- 遊戲前的評估
  estimated_level_after INT,             -- 遊戲後的評估
  
  completed_at TIMESTAMP DEFAULT NOW()
);

-- ========== 擴展 user_wordbook 表（添加新字段） ==========
-- 注意：不修改現有字段，只添加新字段
DO $$ 
BEGIN
  -- 添加 word 字段（直接存儲詞語文本，方便查詢）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'word'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN word TEXT;
  END IF;
  
  -- 添加難度等級
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'word_difficulty'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN word_difficulty INT;
  END IF;
  
  -- 添加最後推薦時間
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'last_recommended_at'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN last_recommended_at TIMESTAMP;
  END IF;
  
  -- 添加推薦次數
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'times_recommended'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN times_recommended INT DEFAULT 0;
  END IF;
END $$;

-- 從 vocabulary 表同步 word 和 difficulty_level 到新字段（如果為空）
UPDATE user_wordbook ub
SET 
  word = v.word,
  word_difficulty = v.difficulty_level
FROM vocabulary v
WHERE ub.vocabulary_id = v.id
  AND (ub.word IS NULL OR ub.word_difficulty IS NULL);

-- ========== 推薦歷史（避免重複） ==========
CREATE TABLE IF NOT EXISTS recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  recommended_words TEXT[],              -- 本輪推薦的5個詞
  source TEXT,                           -- 'calibration' | 'ai' | 'wordbook'
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_user_profiles_calibrated ON user_profiles(calibrated);
CREATE INDEX IF NOT EXISTS idx_game_rounds_user ON game_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_session ON game_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created ON game_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_session_summary_user ON game_session_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_game_session_summary_completed ON game_session_summary(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_wordbook_recommended ON user_wordbook(user_id, last_recommended_at);
CREATE INDEX IF NOT EXISTS idx_user_wordbook_word ON user_wordbook(word);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_session ON recommendation_history(session_id);

-- ========== RLS 策略 ==========
-- 啟用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

-- user_profiles: 用戶只能訪問自己的畫像
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- game_rounds: 用戶只能訪問自己的回合記錄
CREATE POLICY "Users can view own game rounds" ON game_rounds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game rounds" ON game_rounds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game rounds" ON game_rounds
  FOR UPDATE USING (auth.uid() = user_id);

-- game_session_summary: 用戶只能訪問自己的會話彙總
CREATE POLICY "Users can view own session summary" ON game_session_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session summary" ON game_session_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- recommendation_history: 通過 session_id 關聯，用戶只能訪問自己的推薦歷史
CREATE POLICY "Users can view own recommendation history" ON recommendation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM story_sessions 
      WHERE story_sessions.id = recommendation_history.session_id 
        AND story_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recommendation history" ON recommendation_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_sessions 
      WHERE story_sessions.id = recommendation_history.session_id 
        AND story_sessions.user_id = auth.uid()
    )
  );

-- ========== 註釋 ==========
COMMENT ON TABLE user_profiles IS 'AI智能推薦系統 - 用戶畫像表（極簡版）';
COMMENT ON TABLE game_rounds IS 'AI智能推薦系統 - 遊戲回合記錄（核心數據源）';
COMMENT ON TABLE game_session_summary IS 'AI智能推薦系統 - 遊戲會話彙總';
COMMENT ON TABLE recommendation_history IS 'AI智能推薦系統 - 推薦歷史記錄';

COMMENT ON COLUMN user_profiles.baseline_level IS '第一次校準遊戲評估的基線水平 (1-6)';
COMMENT ON COLUMN user_profiles.calibrated IS '是否已完成第一次校準遊戲';
COMMENT ON COLUMN user_profiles.current_level IS '當前評估水平（會隨用戶進步而更新）';
COMMENT ON COLUMN user_wordbook.word IS '詞語文本（從vocabulary表同步）';
COMMENT ON COLUMN user_wordbook.word_difficulty IS '詞語難度（從vocabulary表同步）';
COMMENT ON COLUMN user_wordbook.last_recommended_at IS '最後一次被推薦的時間';
COMMENT ON COLUMN user_wordbook.times_recommended IS '累計被推薦的次數';

-- ========== 完成信息 ==========
DO $$
BEGIN
  RAISE NOTICE '✅ AI 智能詞彙推薦系統 - 數據庫結構創建完成！';
  RAISE NOTICE '📊 新增表：user_profiles, game_rounds, game_session_summary, recommendation_history';
  RAISE NOTICE '🔧 擴展表：user_wordbook（添加新字段）';
  RAISE NOTICE '🔒 已配置 Row Level Security 策略';
  RAISE NOTICE '🚀 系統準備就緒！';
END $$;

