-- =====================================================
-- 故事接龙词汇学习应用 - 初始数据库架构
-- MVP 版本 - 确保可扩展
-- =====================================================

-- 1. 用户表（简化版）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  display_name TEXT,
  current_level DECIMAL(2,1) DEFAULT 2.0,  -- 2.0-3.9
  total_stories_completed INT DEFAULT 0,
  total_vocabulary_learned INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);

-- 2. 词汇表（核心数据）
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  pinyin TEXT,
  difficulty_level INT NOT NULL,  -- 2, 3（MVP只用这两个等级）
  
  -- 分类标签
  category TEXT NOT NULL,  -- 'action', 'emotion', 'description', 'flexible'
  theme TEXT[] DEFAULT '{}',  -- ['natural', 'adventure', 'fantasy']
  part_of_speech TEXT[],  -- ['noun', 'verb', 'adjective']
  
  -- 使用频率（常用词优先推荐）
  frequency INT DEFAULT 50,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vocabulary_difficulty ON vocabulary(difficulty_level);
CREATE INDEX idx_vocabulary_category ON vocabulary(category);
CREATE INDEX idx_vocabulary_theme ON vocabulary USING GIN(theme);

-- 3. 故事会话（核心业务表）
CREATE TABLE story_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 故事元信息
  story_theme TEXT NOT NULL,  -- 'natural_exploration', 'adventure', 'fantasy'
  initial_choice TEXT NOT NULL,  -- 用户选择的情境（如"能听懂动物说话"）
  opening_variant INT DEFAULT 1,  -- 1-3，记录使用了哪个开场变体
  story_title TEXT,  -- AI生成的故事标题
  
  -- 进度信息
  current_segment INT DEFAULT 1,  -- 1, 2, 3（三段式结构）
  current_round INT DEFAULT 0,
  max_rounds INT DEFAULT 18,
  
  -- 用户风格分析（动态更新）
  user_style_profile JSONB DEFAULT '{}',
  -- 例如: {"preference": "adventure", "traits": ["creative", "action-oriented"]}
  
  -- 核心数据
  conversation_history JSONB DEFAULT '[]',
  -- 格式: [
  --   {"role": "ai", "content": "...", "round": 1, "words": ["word1", "word2"]},
  --   {"role": "user", "content": "...", "word": "selected", "round": 1}
  -- ]
  
  vocabulary_used UUID[] DEFAULT '{}',  -- 本次故事使用的词汇ID
  
  -- 创意度评分
  creativity_score INT DEFAULT 0,  -- 0-100
  creativity_details JSONB DEFAULT '{}',
  -- 格式: {
  --   "vocabulary_diversity": 85,
  --   "plot_uniqueness": 90,
  --   "user_initiative": 88,
  --   "ai_diversity": 92,
  --   "unexpected_twists": 3
  -- }
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- 状态
  status TEXT DEFAULT 'active',  -- active, completed, abandoned
  
  CONSTRAINT valid_segment CHECK (current_segment BETWEEN 1 AND 3),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX idx_story_user ON story_sessions(user_id);
CREATE INDEX idx_story_status ON story_sessions(status);
CREATE INDEX idx_story_theme ON story_sessions(story_theme);

-- 4. 用户词汇学习记录
CREATE TABLE user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
  
  -- 掌握程度
  mastery_level INT DEFAULT 0,  -- 0-100
  times_used INT DEFAULT 0,
  times_skipped INT DEFAULT 0,
  
  -- 用户造句历史
  user_sentences JSONB DEFAULT '[]',
  -- 格式: [
  --   {"sentence": "...", "story_id": "...", "date": "..."},
  --   ...
  -- ]
  
  -- 学习时间
  first_learned_at TIMESTAMP DEFAULT NOW(),
  last_reviewed_at TIMESTAMP DEFAULT NOW(),
  next_review_at TIMESTAMP,  -- 间隔重复算法
  
  UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_user_vocab_user ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocab_review ON user_vocabulary(next_review_at);

-- 5. 生词本
CREATE TABLE user_wordbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
  
  -- 来源信息
  from_story_id UUID REFERENCES story_sessions(id) ON DELETE SET NULL,
  example_sentence TEXT,  -- 用户在故事中造的句子
  
  -- 用户笔记（可选）
  user_note TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_wordbook_user ON user_wordbook(user_id);

-- =====================================================
-- 预留表结构（第二阶段启用，现在注释掉）
-- =====================================================

/*
-- 多人房间表（第二阶段）
CREATE TABLE story_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  room_name TEXT,
  host_user_id UUID REFERENCES users(id),
  
  mode TEXT NOT NULL,  -- 'solo_ai', 'multi_ai', 'multi_only'
  max_players INT DEFAULT 4,
  is_public BOOLEAN DEFAULT false,
  
  story_theme TEXT,
  initial_choice TEXT,
  
  status TEXT DEFAULT 'waiting',
  current_turn_player_id UUID,
  current_round INT DEFAULT 0,
  
  player_ids UUID[] DEFAULT '{}',
  player_order JSONB DEFAULT '[]',
  
  conversation_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_room_code ON story_rooms(room_code);
CREATE INDEX idx_room_status ON story_rooms(status);

-- 房间玩家关系表
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES story_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  player_role TEXT,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(room_id, user_id)
);
*/

/*
-- 成就系统（第三阶段）
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  requirement JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);
*/

-- =====================================================
-- 辅助函数
-- =====================================================

-- 更新用户最后活跃时间
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_last_active
AFTER INSERT OR UPDATE ON story_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_last_active();

-- 更新故事会话的最后更新时间
CREATE OR REPLACE FUNCTION update_story_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_updated_at
BEFORE UPDATE ON story_sessions
FOR EACH ROW
EXECUTE FUNCTION update_story_updated_at();

-- =====================================================
-- Row Level Security (RLS) 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wordbook ENABLE ROW LEVEL SECURITY;

-- 用户只能看到自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own story sessions" ON story_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own story sessions" ON story_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story sessions" ON story_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vocabulary records" ON user_vocabulary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vocabulary records" ON user_vocabulary
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own wordbook" ON user_wordbook
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wordbook" ON user_wordbook
  FOR ALL USING (auth.uid() = user_id);

-- 词汇表对所有人可读（但只有管理员可写）
CREATE POLICY "Vocabulary is readable by everyone" ON vocabulary
  FOR SELECT USING (true);

-- =====================================================
-- 初始化完成
-- =====================================================

-- 插入一个测试用户（可选）
INSERT INTO users (username, display_name, current_level) 
VALUES ('test_user', '测试用户', 2.0)
ON CONFLICT (username) DO NOTHING;

-- 输出确认信息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库架构初始化完成！';
  RAISE NOTICE '📊 已创建表：users, vocabulary, story_sessions, user_vocabulary, user_wordbook';
  RAISE NOTICE '🔒 已启用 Row Level Security';
  RAISE NOTICE '🚀 准备导入词汇数据...';
END $$;

