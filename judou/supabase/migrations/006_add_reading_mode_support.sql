-- 句豆 - 閱讀模式支持
-- Migration: 006
-- Description: 為句豆添加閱讀模式支持，包括文章類型擴展、註釋系統和閱讀進度追蹤

-- ======================
-- 1. 擴展 practice_texts 表
-- ======================

-- 添加文章類型欄位
ALTER TABLE practice_texts 
ADD COLUMN IF NOT EXISTS text_type TEXT DEFAULT 'practice' 
CHECK (text_type IN ('practice', 'reading', 'both'));

-- 添加來源文章關聯（用於從閱讀文章提取練習片段）
ALTER TABLE practice_texts 
ADD COLUMN IF NOT EXISTS source_text_id UUID REFERENCES practice_texts(id) ON DELETE SET NULL;

-- 添加片段在原文中的位置（可選，用於定位）
ALTER TABLE practice_texts 
ADD COLUMN IF NOT EXISTS source_start_index INT;

ALTER TABLE practice_texts 
ADD COLUMN IF NOT EXISTS source_end_index INT;

-- 註釋說明
COMMENT ON COLUMN practice_texts.text_type IS '文章類型：practice=練習素材，reading=閱讀文章，both=兩者皆可';
COMMENT ON COLUMN practice_texts.source_text_id IS '來源文章 ID（如果是從閱讀文章提取的片段）';
COMMENT ON COLUMN practice_texts.source_start_index IS '片段在原文中的起始字符位置';
COMMENT ON COLUMN practice_texts.source_end_index IS '片段在原文中的結束字符位置';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_practice_texts_text_type ON practice_texts(text_type);
CREATE INDEX IF NOT EXISTS idx_practice_texts_source_text_id ON practice_texts(source_text_id);

-- 將現有文章標記為練習素材
UPDATE practice_texts SET text_type = 'practice' WHERE text_type IS NULL;

-- ======================
-- 2. 創建 text_annotations 表（註釋系統）
-- ======================

CREATE TABLE IF NOT EXISTS text_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  start_index INT NOT NULL,           -- 註釋起始字符位置
  end_index INT NOT NULL,             -- 註釋結束字符位置
  term TEXT NOT NULL,                 -- 被註釋的字/詞
  annotation TEXT NOT NULL,           -- 註釋內容
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 確保位置有效
  CONSTRAINT valid_annotation_range CHECK (start_index >= 0 AND end_index > start_index)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_text_annotations_text_id ON text_annotations(text_id);
CREATE INDEX IF NOT EXISTS idx_text_annotations_created_by ON text_annotations(created_by);

-- 註釋說明
COMMENT ON TABLE text_annotations IS '文章註釋表 - 存儲字詞的註釋信息';
COMMENT ON COLUMN text_annotations.start_index IS '註釋起始字符位置（從0開始，不含斷句符）';
COMMENT ON COLUMN text_annotations.end_index IS '註釋結束字符位置（不包含該位置的字符）';
COMMENT ON COLUMN text_annotations.term IS '被註釋的字/詞原文';
COMMENT ON COLUMN text_annotations.annotation IS '註釋解釋內容';

-- ======================
-- 3. 創建 reading_progress 表（閱讀進度）
-- ======================

CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  progress_percent FLOAT DEFAULT 0,     -- 閱讀進度百分比（0-100）
  last_paragraph INT DEFAULT 0,         -- 上次閱讀的段落索引
  bookmarked BOOLEAN DEFAULT false,     -- 是否收藏
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 每個用戶對每篇文章只有一條進度記錄
  UNIQUE(user_id, text_id),
  
  -- 進度範圍檢查
  CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_text_id ON reading_progress(text_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_bookmarked ON reading_progress(bookmarked) WHERE bookmarked = true;

-- 註釋說明
COMMENT ON TABLE reading_progress IS '閱讀進度表 - 追蹤用戶的閱讀進度和書籤';
COMMENT ON COLUMN reading_progress.progress_percent IS '閱讀進度百分比（0-100）';
COMMENT ON COLUMN reading_progress.last_paragraph IS '上次閱讀到的段落索引（從0開始）';
COMMENT ON COLUMN reading_progress.bookmarked IS '是否已收藏該文章';

-- ======================
-- 4. RLS 策略
-- ======================

-- 啟用 RLS
ALTER TABLE text_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- ========== text_annotations 表策略 ==========

-- 所有認證用戶可以查看註釋（註釋是公開的學習資源）
CREATE POLICY "Authenticated users can view annotations"
ON text_annotations FOR SELECT
TO authenticated
USING (true);

-- 老師和管理員可以創建註釋
CREATE POLICY "Teachers and admins can create annotations"
ON text_annotations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() 
    AND (role = 'teacher' OR is_admin = true OR is_super_admin = true)
  )
);

-- 創建者可以更新自己的註釋
CREATE POLICY "Creators can update own annotations"
ON text_annotations FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- 管理員可以更新任何註釋
CREATE POLICY "Admins can update any annotations"
ON text_annotations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- 創建者可以刪除自己的註釋
CREATE POLICY "Creators can delete own annotations"
ON text_annotations FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- 管理員可以刪除任何註釋
CREATE POLICY "Admins can delete any annotations"
ON text_annotations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- ========== reading_progress 表策略 ==========

-- 用戶只能查看自己的閱讀進度
CREATE POLICY "Users can view own reading progress"
ON reading_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 用戶可以創建自己的閱讀進度
CREATE POLICY "Users can create own reading progress"
ON reading_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 用戶可以更新自己的閱讀進度
CREATE POLICY "Users can update own reading progress"
ON reading_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 用戶可以刪除自己的閱讀進度
CREATE POLICY "Users can delete own reading progress"
ON reading_progress FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ======================
-- 5. 自動更新 updated_at 觸發器
-- ======================

-- 創建通用的更新時間戳函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- text_annotations 表觸發器
DROP TRIGGER IF EXISTS update_text_annotations_updated_at ON text_annotations;
CREATE TRIGGER update_text_annotations_updated_at
  BEFORE UPDATE ON text_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- reading_progress 表觸發器
DROP TRIGGER IF EXISTS update_reading_progress_updated_at ON reading_progress;
CREATE TRIGGER update_reading_progress_updated_at
  BEFORE UPDATE ON reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

