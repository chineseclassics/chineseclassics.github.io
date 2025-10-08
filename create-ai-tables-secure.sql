-- =====================================================
-- AI 智能推荐系统 - 完整数据库结构（安全版）
-- ⚠️ 使用正确的 RLS 策略，适用于生产环境
-- =====================================================

-- ========== 1. user_profiles ==========
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  baseline_level INT,
  calibrated BOOLEAN DEFAULT false,
  calibration_date TIMESTAMP,
  current_level INT DEFAULT 2,
  total_games INT DEFAULT 0,
  total_rounds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ✅ 安全策略：用户只能访问自己的画像
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_profiles_calibrated ON user_profiles(calibrated);

-- ========== 2. game_rounds ==========
DROP TABLE IF EXISTS game_rounds CASCADE;

CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  recommended_words JSONB,
  selected_word TEXT NOT NULL,
  selected_difficulty INT,
  user_sentence TEXT NOT NULL,
  response_time INT,
  ai_score INT,
  ai_feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

-- ✅ 安全策略：用户只能访问自己的回合记录
CREATE POLICY "Users can view own game rounds" 
ON game_rounds FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game rounds" 
ON game_rounds FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game rounds" 
ON game_rounds FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_game_rounds_user ON game_rounds(user_id);
CREATE INDEX idx_game_rounds_session ON game_rounds(session_id);
CREATE INDEX idx_game_rounds_created ON game_rounds(created_at DESC);

-- ========== 3. game_session_summary ==========
DROP TABLE IF EXISTS game_session_summary CASCADE;

CREATE TABLE game_session_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  session_type TEXT NOT NULL,
  total_rounds INT,
  avg_score DECIMAL(3,1),
  avg_selected_difficulty DECIMAL(3,1),
  estimated_level_before INT,
  estimated_level_after INT,
  completed_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE game_session_summary ENABLE ROW LEVEL SECURITY;

-- ✅ 安全策略：用户只能访问自己的会话汇总
CREATE POLICY "Users can view own session summary" 
ON game_session_summary FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session summary" 
ON game_session_summary FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_game_session_summary_user ON game_session_summary(user_id);
CREATE INDEX idx_game_session_summary_completed ON game_session_summary(completed_at DESC);

-- ========== 4. recommendation_history ==========
DROP TABLE IF EXISTS recommendation_history CASCADE;

CREATE TABLE recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  recommended_words TEXT[],
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

-- ✅ 安全策略：通过 session_id 关联，用户只能访问自己的推荐历史
CREATE POLICY "Users can view own recommendation history" 
ON recommendation_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM story_sessions 
    WHERE story_sessions.id = recommendation_history.session_id 
      AND story_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own recommendation history" 
ON recommendation_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM story_sessions 
    WHERE story_sessions.id = recommendation_history.session_id 
      AND story_sessions.user_id = auth.uid()
  )
);

CREATE INDEX idx_recommendation_history_session ON recommendation_history(session_id);

-- ========== 5. 扩展 user_wordbook 表 ==========
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'word'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN word TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'word_difficulty'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN word_difficulty INT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'last_recommended_at'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN last_recommended_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'times_recommended'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN times_recommended INT DEFAULT 0;
  END IF;
END $$;

-- 同步数据
UPDATE user_wordbook ub
SET 
  word = v.word,
  word_difficulty = v.difficulty_level
FROM vocabulary v
WHERE ub.vocabulary_id = v.id
  AND (ub.word IS NULL OR ub.word_difficulty IS NULL);

CREATE INDEX IF NOT EXISTS idx_user_wordbook_recommended ON user_wordbook(user_id, last_recommended_at);
CREATE INDEX IF NOT EXISTS idx_user_wordbook_word ON user_wordbook(word);

-- ========== 注释（重要提醒） ==========
COMMENT ON TABLE user_profiles IS '⚠️ 使用安全的 RLS 策略 - 用户只能访问自己的数据';
COMMENT ON TABLE game_rounds IS '⚠️ 使用安全的 RLS 策略 - 用户只能访问自己的数据';
COMMENT ON TABLE game_session_summary IS '⚠️ 使用安全的 RLS 策略 - 用户只能访问自己的数据';
COMMENT ON TABLE recommendation_history IS '⚠️ 使用安全的 RLS 策略 - 通过 session 关联验证';

-- ========== 验证 RLS 策略 ==========
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history')
ORDER BY tablename, policyname;

-- ========== 验证表 ==========
SELECT 
  'user_profiles' AS table_name,
  COUNT(*) AS row_count
FROM user_profiles
UNION ALL
SELECT 'game_rounds', COUNT(*) FROM game_rounds
UNION ALL
SELECT 'game_session_summary', COUNT(*) FROM game_session_summary
UNION ALL
SELECT 'recommendation_history', COUNT(*) FROM recommendation_history;

SELECT '✅ 所有表已创建，RLS 策略已正确配置！' AS status;

-- ========== 安全检查清单 ==========
-- ✅ 所有表都启用了 RLS
-- ✅ 所有策略都基于 auth.uid() = user_id
-- ✅ 没有使用 USING (true) 的不安全策略
-- ✅ recommendation_history 通过 session 关联验证
-- ========== 如果需要调试，临时禁用 RLS ==========
-- 只在必要时执行，记得恢复！
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_rounds DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_session_summary DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendation_history DISABLE ROW LEVEL SECURITY;
