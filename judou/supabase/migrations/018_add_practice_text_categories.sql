-- 句豆 - 練習文章多選分類支持
-- Migration: 018
-- Description: 為練習文章添加多選分類功能，支持一個文章屬於多個分類

-- ======================
-- 1. 創建 text_practice_categories 關聯表
-- ======================

CREATE TABLE IF NOT EXISTS text_practice_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES practice_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- 每個文章和分類的組合只能有一條記錄
  UNIQUE(text_id, category_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_text_practice_categories_text_id ON text_practice_categories(text_id);
CREATE INDEX IF NOT EXISTS idx_text_practice_categories_category_id ON text_practice_categories(category_id);

-- 註釋說明
COMMENT ON TABLE text_practice_categories IS '練習文章與分類的多對多關聯表';
COMMENT ON COLUMN text_practice_categories.text_id IS '練習文章 ID';
COMMENT ON COLUMN text_practice_categories.category_id IS '分類 ID';

-- ======================
-- 2. 遷移現有數據
-- ======================

-- 將現有的 category_id 數據遷移到關聯表
INSERT INTO text_practice_categories (text_id, category_id)
SELECT id, category_id
FROM practice_texts
WHERE category_id IS NOT NULL
ON CONFLICT (text_id, category_id) DO NOTHING;

-- ======================
-- 3. RLS 策略
-- ======================

ALTER TABLE text_practice_categories ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可以查看關聯
CREATE POLICY "Users can view practice text categories"
ON text_practice_categories FOR SELECT
TO authenticated
USING (true);

-- 匿名用戶可以查看關聯（用於公開練習）
CREATE POLICY "Anon can view practice text categories"
ON text_practice_categories FOR SELECT
TO anon
USING (true);

-- 管理員可以創建關聯（系統文章）
CREATE POLICY "Admins can create practice text categories"
ON text_practice_categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM practice_texts
    WHERE id = text_id
    AND (
      is_system = true AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.is_admin = true OR users.is_super_admin = true)
      )
      OR (
        is_system = false AND created_by = auth.uid()
      )
    )
  )
);

-- 管理員可以更新關聯（系統文章）
CREATE POLICY "Admins can update practice text categories"
ON text_practice_categories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM practice_texts
    WHERE id = text_id
    AND (
      is_system = true AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.is_admin = true OR users.is_super_admin = true)
      )
      OR (
        is_system = false AND created_by = auth.uid()
      )
    )
  )
);

-- 管理員可以刪除關聯（系統文章）
CREATE POLICY "Admins can delete practice text categories"
ON text_practice_categories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM practice_texts
    WHERE id = text_id
    AND (
      is_system = true AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.is_admin = true OR users.is_super_admin = true)
      )
      OR (
        is_system = false AND created_by = auth.uid()
      )
    )
  )
);

