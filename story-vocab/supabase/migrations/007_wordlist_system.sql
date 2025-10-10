-- =====================================================
-- 词表系统架构 - 支持三种词表模式
-- Migration: 007_wordlist_system
-- Purpose: 实现系统预设词表、自定义词表和AI智能推荐三种模式
-- =====================================================

-- ========== 1. 修改 vocabulary 表 ==========

-- 添加 AI 评估相关字段
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS difficulty_confidence TEXT;
-- 'high' | 'medium' | 'low' - AI评估的置信度

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS difficulty_reasoning TEXT;
-- AI评估的理由说明，或"人工校准"

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS difficulty_evaluated_at TIMESTAMP;
-- 最后评估时间

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS is_calibration BOOLEAN DEFAULT false;
-- 是否为黄金标准校准词（150个精选词）

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS calibration_order INT;
-- 校准词的顺序（1-150）

-- 移除不再需要的字段（改用萌典API查询）
-- 注意：先检查是否存在，避免报错
DO $$ 
BEGIN
  -- 移除 pinyin（改用萌典API）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'pinyin'
  ) THEN
    ALTER TABLE vocabulary DROP COLUMN pinyin;
    RAISE NOTICE '✅ 已移除 pinyin 字段';
  END IF;
  
  -- 移除 part_of_speech（改用萌典API）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'part_of_speech'
  ) THEN
    ALTER TABLE vocabulary DROP COLUMN part_of_speech;
    RAISE NOTICE '✅ 已移除 part_of_speech 字段';
  END IF;
  
  -- 移除 theme 数组（用新的词表标签系统替代）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'theme'
  ) THEN
    ALTER TABLE vocabulary DROP COLUMN theme;
    RAISE NOTICE '✅ 已移除 theme 字段';
  END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_calibration ON vocabulary(is_calibration) 
  WHERE is_calibration = true;
CREATE INDEX IF NOT EXISTS idx_vocabulary_calibration_order ON vocabulary(calibration_order) 
  WHERE calibration_order IS NOT NULL;

COMMENT ON COLUMN vocabulary.difficulty_confidence IS 'AI评估置信度：high（人工校准或高置信）、medium（中等）、low（需复核）';
COMMENT ON COLUMN vocabulary.difficulty_reasoning IS 'AI评估理由或"人工校准"';
COMMENT ON COLUMN vocabulary.is_calibration IS '是否为黄金标准校准词（150个）';
COMMENT ON COLUMN vocabulary.calibration_order IS '校准词顺序（1-150），用于AI评估时的参考排序';

-- ========== 2. 创建 wordlists 表（词表定义） ==========

CREATE TABLE IF NOT EXISTS wordlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name TEXT NOT NULL,                       -- 词表名称："HSK标准词表"、"李老师词表"
  code TEXT UNIQUE NOT NULL,                -- 唯一代码："hsk_standard"、"custom_teacher_123"
  type TEXT NOT NULL,                       -- 'system' | 'custom'
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 自定义词表的所有者（系统词表为NULL）
  
  -- 层级配置（使用通用的"第N层级"）
  hierarchy_config JSONB DEFAULT '{
    "level_2_label": null,
    "level_3_label": null
  }',
  -- 例如：
  -- HSK: {"level_2_label": "等级", "level_3_label": null}
  -- 教材：{"level_2_label": "年级", "level_3_label": "单元"}
  -- 自定义：{"level_2_label": "分类", "level_3_label": "主题"}
  
  description TEXT,                         -- 词表描述
  is_public BOOLEAN DEFAULT false,          -- 自定义词表是否公开分享
  
  -- 统计信息
  total_words INT DEFAULT 0,                -- 词表中的词汇总数
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_type CHECK (type IN ('system', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_wordlists_type ON wordlists(type);
CREATE INDEX IF NOT EXISTS idx_wordlists_owner ON wordlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_wordlists_code ON wordlists(code);
CREATE INDEX IF NOT EXISTS idx_wordlists_public ON wordlists(is_public) WHERE is_public = true;

COMMENT ON TABLE wordlists IS '词表定义表 - 支持系统预设和自定义词表';
COMMENT ON COLUMN wordlists.hierarchy_config IS '层级配置：level_2_label（第二层级显示名）、level_3_label（第三层级显示名）';

-- ========== 3. 创建 wordlist_tags 表（第二/三层级标签） ==========

CREATE TABLE IF NOT EXISTS wordlist_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordlist_id UUID NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
  
  tag_level INT NOT NULL,                   -- 2=第二层级, 3=第三层级
  tag_code TEXT NOT NULL,                   -- 标签代码："HSK3级"、"四年级"、"基础"
  tag_display_name TEXT NOT NULL,           -- 显示名称（通常同tag_code）
  
  parent_tag_id UUID REFERENCES wordlist_tags(id) ON DELETE CASCADE, -- 父标签（第三层级指向第二层级）
  sort_order INT DEFAULT 0,                 -- 排序
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(wordlist_id, tag_code),
  CONSTRAINT valid_tag_level CHECK (tag_level IN (2, 3))
);

CREATE INDEX IF NOT EXISTS idx_wordlist_tags_wordlist ON wordlist_tags(wordlist_id);
CREATE INDEX IF NOT EXISTS idx_wordlist_tags_level ON wordlist_tags(tag_level);
CREATE INDEX IF NOT EXISTS idx_wordlist_tags_parent ON wordlist_tags(parent_tag_id) WHERE parent_tag_id IS NOT NULL;

COMMENT ON TABLE wordlist_tags IS '词表标签表 - 存储第二/三层级的标签（如HSK等级、教材单元等）';
COMMENT ON COLUMN wordlist_tags.tag_level IS '标签层级：2=第二层级（如等级/年级），3=第三层级（如单元/主题）';

-- ========== 4. 创建 vocabulary_wordlist_mapping 表（词汇-词表关联） ==========

CREATE TABLE IF NOT EXISTS vocabulary_wordlist_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  wordlist_id UUID NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
  
  -- 层级路径（JSON数组）
  tag_path JSONB DEFAULT '[]',              -- ["HSK3级"] 或 ["四年级", "第一单元"] 或 []
  
  -- 冗余字段（提高查询性能）
  level_2_tag TEXT,                         -- 第二层级标签
  level_3_tag TEXT,                         -- 第三层级标签
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 同一个词在同一个词表的同一层级位置只能出现一次
  UNIQUE(vocabulary_id, wordlist_id, level_2_tag, level_3_tag)
);

CREATE INDEX IF NOT EXISTS idx_vocab_mapping_wordlist ON vocabulary_wordlist_mapping(wordlist_id);
CREATE INDEX IF NOT EXISTS idx_vocab_mapping_vocab ON vocabulary_wordlist_mapping(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocab_mapping_tags ON vocabulary_wordlist_mapping(wordlist_id, level_2_tag, level_3_tag);
CREATE INDEX IF NOT EXISTS idx_vocab_mapping_level2 ON vocabulary_wordlist_mapping(level_2_tag) WHERE level_2_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vocab_mapping_level3 ON vocabulary_wordlist_mapping(level_3_tag) WHERE level_3_tag IS NOT NULL;

COMMENT ON TABLE vocabulary_wordlist_mapping IS '词汇-词表关联表 - 同一个词可以属于多个词表';
COMMENT ON COLUMN vocabulary_wordlist_mapping.tag_path IS '标签路径JSON数组，如["HSK3级"]或["四年级","第一单元"]';

-- ========== 5. 创建 user_wordlist_preferences 表（用户词表偏好） ==========

CREATE TABLE IF NOT EXISTS user_wordlist_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- 默认词表设置
  default_mode TEXT DEFAULT 'ai',           -- 'ai' | 'wordlist'
  default_wordlist_id UUID REFERENCES wordlists(id) ON DELETE SET NULL,
  default_level_2_tag TEXT,                 -- 默认选择的第二层级
  default_level_3_tag TEXT,                 -- 默认选择的第三层级
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_default_mode CHECK (default_mode IN ('ai', 'wordlist'))
);

CREATE INDEX IF NOT EXISTS idx_user_wordlist_pref_mode ON user_wordlist_preferences(default_mode);

COMMENT ON TABLE user_wordlist_preferences IS '用户词表偏好设置 - 记录用户默认使用的词表模式';

-- ========== 6. RLS 策略 ==========

-- 启用 RLS
ALTER TABLE wordlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordlist_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_wordlist_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wordlist_preferences ENABLE ROW LEVEL SECURITY;

-- wordlists: 系统词表所有人可读，自定义词表只有所有者和公开词表可读
CREATE POLICY "System wordlists are readable by everyone" ON wordlists
  FOR SELECT USING (type = 'system');

CREATE POLICY "Users can view own custom wordlists" ON wordlists
  FOR SELECT USING (type = 'custom' AND owner_id = auth.uid());

CREATE POLICY "Users can view public custom wordlists" ON wordlists
  FOR SELECT USING (type = 'custom' AND is_public = true);

CREATE POLICY "Users can insert own wordlists" ON wordlists
  FOR INSERT WITH CHECK (type = 'custom' AND owner_id = auth.uid());

CREATE POLICY "Users can update own wordlists" ON wordlists
  FOR UPDATE USING (type = 'custom' AND owner_id = auth.uid());

CREATE POLICY "Users can delete own wordlists" ON wordlists
  FOR DELETE USING (type = 'custom' AND owner_id = auth.uid());

-- wordlist_tags: 跟随wordlist的权限
CREATE POLICY "Tags are readable if wordlist is readable" ON wordlist_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = wordlist_tags.wordlist_id 
        AND (
          w.type = 'system' 
          OR w.owner_id = auth.uid() 
          OR w.is_public = true
        )
    )
  );

CREATE POLICY "Users can manage tags of own wordlists" ON wordlist_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = wordlist_tags.wordlist_id 
        AND w.owner_id = auth.uid()
    )
  );

-- vocabulary_wordlist_mapping: 跟随wordlist的权限
CREATE POLICY "Mappings are readable if wordlist is readable" ON vocabulary_wordlist_mapping
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = vocabulary_wordlist_mapping.wordlist_id 
        AND (
          w.type = 'system' 
          OR w.owner_id = auth.uid() 
          OR w.is_public = true
        )
    )
  );

CREATE POLICY "Users can manage mappings of own wordlists" ON vocabulary_wordlist_mapping
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM wordlists w 
      WHERE w.id = vocabulary_wordlist_mapping.wordlist_id 
        AND w.owner_id = auth.uid()
    )
  );

-- user_wordlist_preferences: 用户只能访问自己的偏好
CREATE POLICY "Users can view own preferences" ON user_wordlist_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_wordlist_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_wordlist_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== 7. 辅助函数 ==========

-- 更新 wordlist 的 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_wordlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wordlist_updated_at
BEFORE UPDATE ON wordlists
FOR EACH ROW
EXECUTE FUNCTION update_wordlist_updated_at();

-- 更新 wordlist 的词汇总数
CREATE OR REPLACE FUNCTION update_wordlist_total_words()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wordlists
  SET total_words = (
    SELECT COUNT(DISTINCT vocabulary_id)
    FROM vocabulary_wordlist_mapping
    WHERE wordlist_id = COALESCE(NEW.wordlist_id, OLD.wordlist_id)
  )
  WHERE id = COALESCE(NEW.wordlist_id, OLD.wordlist_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wordlist_total_words_insert
AFTER INSERT ON vocabulary_wordlist_mapping
FOR EACH ROW
EXECUTE FUNCTION update_wordlist_total_words();

CREATE TRIGGER trigger_update_wordlist_total_words_delete
AFTER DELETE ON vocabulary_wordlist_mapping
FOR EACH ROW
EXECUTE FUNCTION update_wordlist_total_words();

-- ========== 8. 创建视图（简化查询） ==========

-- 词表详情视图（包含统计信息）
CREATE OR REPLACE VIEW wordlist_details AS
SELECT 
  w.*,
  COUNT(DISTINCT m.vocabulary_id) as actual_word_count,
  COUNT(DISTINCT t.id) as tag_count
FROM wordlists w
LEFT JOIN vocabulary_wordlist_mapping m ON m.wordlist_id = w.id
LEFT JOIN wordlist_tags t ON t.wordlist_id = w.id
GROUP BY w.id;

-- 校准词汇视图（按等级统计）
CREATE OR REPLACE VIEW calibration_stats AS
SELECT 
  difficulty_level,
  COUNT(*) as word_count,
  array_agg(word ORDER BY calibration_order) as words,
  array_agg(category ORDER BY calibration_order) as categories
FROM vocabulary
WHERE is_calibration = true
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- ========== 9. 数据库函数（用于Edge Function查询） ==========

-- 从词表获取词汇（支持层级过滤）
CREATE OR REPLACE FUNCTION get_wordlist_vocabulary(
  p_wordlist_id UUID,
  p_level_2_tag TEXT DEFAULT NULL,
  p_level_3_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  difficulty_level INT,
  category TEXT,
  frequency INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.word,
    v.difficulty_level,
    v.category,
    v.frequency
  FROM vocabulary v
  INNER JOIN vocabulary_wordlist_mapping m ON m.vocabulary_id = v.id
  WHERE m.wordlist_id = p_wordlist_id
    AND (p_level_2_tag IS NULL OR m.level_2_tag = p_level_2_tag)
    AND (p_level_3_tag IS NULL OR m.level_3_tag = p_level_3_tag)
  ORDER BY RANDOM();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_wordlist_vocabulary IS '从指定词表获取词汇，支持第二/三层级过滤';

-- ========== 9. 完成信息 ==========

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ 词表系统架构迁移完成！';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '📊 新增表：';
  RAISE NOTICE '  - wordlists (词表定义)';
  RAISE NOTICE '  - wordlist_tags (第二/三层级标签)';
  RAISE NOTICE '  - vocabulary_wordlist_mapping (词汇-词表关联)';
  RAISE NOTICE '  - user_wordlist_preferences (用户偏好)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 修改表：';
  RAISE NOTICE '  - vocabulary (添加AI评估字段、移除冗余字段)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 已配置 Row Level Security 策略';
  RAISE NOTICE '📈 已创建辅助视图：wordlist_details, calibration_stats';
  RAISE NOTICE '🚀 系统准备就绪！';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：导入150个校准词到数据库';
  RAISE NOTICE '====================================================';
END $$;

