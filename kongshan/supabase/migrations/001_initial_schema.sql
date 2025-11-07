-- =====================================================
-- 空山應用數據庫遷移腳本
-- 001_initial_schema.sql
-- =====================================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 詩歌表
-- =====================================================
CREATE TABLE IF NOT EXISTS poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  dynasty TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_poems_author ON poems(author);
CREATE INDEX IF NOT EXISTS idx_poems_dynasty ON poems(dynasty);
CREATE INDEX IF NOT EXISTS idx_poems_created_at ON poems(created_at DESC);

-- =====================================================
-- 2. 音效表
-- =====================================================
CREATE TABLE IF NOT EXISTS sound_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,  -- Supabase Storage URL
  duration INTEGER,  -- 時長（秒）
  tags TEXT[],  -- 標籤數組（如：['雨聲', '自然', '寧靜']）
  source TEXT DEFAULT 'system',  -- 'system'（系統預設）或 'user'（用戶上傳）
  upload_type TEXT DEFAULT 'file',  -- 'file'（文件上傳）或 'recording'（錄音上傳）
  uploaded_by UUID REFERENCES auth.users(id),
  
  -- 審核狀態
  status TEXT DEFAULT 'approved',  -- 'private'（私有，僅創建者可用）, 'pending'（待審核）, 'approved'（已批准，公開可用）, 'rejected'（已拒絕）
  rejected_reason TEXT,  -- 拒絕原因
  reviewed_by UUID REFERENCES auth.users(id),  -- 審核者
  reviewed_at TIMESTAMP,  -- 審核時間
  
  -- 統計
  usage_count INTEGER DEFAULT 0,  -- 被使用的次數（在已發布的聲色意境中）
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_sound_effects_status ON sound_effects(status);
CREATE INDEX IF NOT EXISTS idx_sound_effects_source ON sound_effects(source);
CREATE INDEX IF NOT EXISTS idx_sound_effects_tags ON sound_effects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sound_effects_uploaded_by ON sound_effects(uploaded_by);

-- =====================================================
-- 3. 聲色意境表（核心表）
-- =====================================================
CREATE TABLE IF NOT EXISTS poem_atmospheres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE,
  name TEXT,  -- 意境名稱（可選，用戶可命名）
  description TEXT,  -- 意境描述（可選）
  
  -- 音效組合配置（JSONB 數組）
  sound_combination JSONB NOT NULL,  -- [{"sound_id": "uuid", "volume": 0.8, "loop": true}, ...]
  
  -- 背景配置
  background_config JSONB NOT NULL,  -- {"color_scheme": {...}, "abstract_elements": [...]}
  
  -- 元數據
  source TEXT DEFAULT 'system',  -- 'system'（系統預設）或 'user'（用戶創作）
  created_by UUID REFERENCES auth.users(id),  -- 創建者（系統預設為 NULL）
  is_ai_generated BOOLEAN DEFAULT false,  -- 是否使用 AI 生成
  is_default BOOLEAN DEFAULT false,  -- 是否為該詩歌的默認意境
  
  -- 審核狀態（僅用戶創作需要）
  status TEXT DEFAULT 'approved',  -- 'draft'（草稿）, 'pending'（待審核）, 'approved'（已批准）, 'rejected'（已拒絕）
  -- 注意：如果只使用系統預設音效，status 直接為 'approved'，不需要審核
  admin_feedback TEXT,  -- 管理員反饋（拒絕時）
  reviewed_by UUID REFERENCES auth.users(id),  -- 審核者
  reviewed_at TIMESTAMP,  -- 審核時間
  
  -- 統計
  view_count INTEGER DEFAULT 0,  -- 查看次數
  like_count INTEGER DEFAULT 0,  -- 點贊次數
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_atmospheres_poem_id ON poem_atmospheres(poem_id);
CREATE INDEX IF NOT EXISTS idx_atmospheres_status ON poem_atmospheres(status);
CREATE INDEX IF NOT EXISTS idx_atmospheres_source ON poem_atmospheres(source);
CREATE INDEX IF NOT EXISTS idx_atmospheres_created_by ON poem_atmospheres(created_by);
CREATE INDEX IF NOT EXISTS idx_atmospheres_is_default ON poem_atmospheres(is_default);
CREATE INDEX IF NOT EXISTS idx_atmospheres_like_count ON poem_atmospheres(like_count DESC);

-- =====================================================
-- 4. 聲色意境-音效關聯表（用於查詢和統計）
-- =====================================================
CREATE TABLE IF NOT EXISTS atmosphere_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atmosphere_id UUID REFERENCES poem_atmospheres(id) ON DELETE CASCADE,
  sound_effect_id UUID REFERENCES sound_effects(id) ON DELETE CASCADE,
  volume DECIMAL DEFAULT 1.0,  -- 音量 0-1
  loop BOOLEAN DEFAULT true,  -- 是否循環
  order_index INTEGER DEFAULT 0,  -- 顯示順序
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(atmosphere_id, sound_effect_id, order_index)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_atmosphere_sounds_atmosphere_id ON atmosphere_sounds(atmosphere_id);
CREATE INDEX IF NOT EXISTS idx_atmosphere_sounds_sound_effect_id ON atmosphere_sounds(sound_effect_id);

-- =====================================================
-- 5. 聲色意境點贊表
-- =====================================================
CREATE TABLE IF NOT EXISTS atmosphere_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atmosphere_id UUID REFERENCES poem_atmospheres(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(atmosphere_id, user_id)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_atmosphere_likes_atmosphere_id ON atmosphere_likes(atmosphere_id);
CREATE INDEX IF NOT EXISTS idx_atmosphere_likes_user_id ON atmosphere_likes(user_id);

-- =====================================================
-- 6. 用戶創作詩句表（未來功能，暫不實施）
-- =====================================================
CREATE TABLE IF NOT EXISTS user_poem_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_content TEXT NOT NULL,  -- 用戶輸入的詩句
  title TEXT,  -- 標題（可選）
  author TEXT,  -- 作者（可選，用戶可標註）
  status TEXT DEFAULT 'draft',  -- 'draft', 'pending_approval', 'approved', 'rejected'
  admin_feedback TEXT,  -- 管理員反饋
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_user_poem_creations_user_id ON user_poem_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_poem_creations_status ON user_poem_creations(status);

-- =====================================================
-- 觸發器：自動更新 updated_at
-- =====================================================

-- 詩歌表更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_poems_updated_at
  BEFORE UPDATE ON poems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sound_effects_updated_at
  BEFORE UPDATE ON sound_effects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poem_atmospheres_updated_at
  BEFORE UPDATE ON poem_atmospheres
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_poem_creations_updated_at
  BEFORE UPDATE ON user_poem_creations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 函數：更新聲色意境點贊數
-- =====================================================
CREATE OR REPLACE FUNCTION update_atmosphere_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poem_atmospheres
    SET like_count = like_count + 1
    WHERE id = NEW.atmosphere_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poem_atmospheres
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.atmosphere_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_atmosphere_like_count_trigger
  AFTER INSERT OR DELETE ON atmosphere_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_atmosphere_like_count();

-- =====================================================
-- 函數：更新音效使用次數
-- =====================================================
CREATE OR REPLACE FUNCTION update_sound_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 當聲色意境被創建且狀態為 approved 時，增加音效使用次數
    IF NEW.status = 'approved' THEN
      UPDATE sound_effects
      SET usage_count = usage_count + 1
      WHERE id IN (
        SELECT (value->>'sound_id')::UUID
        FROM jsonb_array_elements(NEW.sound_combination)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 當聲色意境狀態從非 approved 變為 approved 時
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      UPDATE sound_effects
      SET usage_count = usage_count + 1
      WHERE id IN (
        SELECT (value->>'sound_id')::UUID
        FROM jsonb_array_elements(NEW.sound_combination)
      );
    -- 當聲色意境狀態從 approved 變為非 approved 時
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      UPDATE sound_effects
      SET usage_count = GREATEST(usage_count - 1, 0)
      WHERE id IN (
        SELECT (value->>'sound_id')::UUID
        FROM jsonb_array_elements(OLD.sound_combination)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sound_usage_count_trigger
  AFTER INSERT OR UPDATE ON poem_atmospheres
  FOR EACH ROW
  EXECUTE FUNCTION update_sound_usage_count();

