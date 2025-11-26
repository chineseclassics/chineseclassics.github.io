-- 句豆 - 私有分類支持
-- Migration: 004
-- Description: 為分類表添加私有分類支持，允許老師創建自己的分類結構

-- ======================
-- 1. 添加 is_system 和 created_by 欄位
-- ======================

ALTER TABLE practice_categories 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 註釋說明
COMMENT ON COLUMN practice_categories.is_system IS '是否為系統分類（true=系統分類，false=老師私有分類）';
COMMENT ON COLUMN practice_categories.created_by IS '分類創建者 ID（私有分類）';

-- 將現有分類標記為系統分類
UPDATE practice_categories SET is_system = true WHERE is_system IS NULL;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_practice_categories_is_system ON practice_categories(is_system);
CREATE INDEX IF NOT EXISTS idx_practice_categories_created_by ON practice_categories(created_by);

-- ======================
-- 2. 更新 RLS 策略
-- ======================

-- 刪除舊策略
DROP POLICY IF EXISTS "Anyone can view categories" ON practice_categories;
DROP POLICY IF EXISTS "Public can view categories" ON practice_categories;
DROP POLICY IF EXISTS "Authenticated can view categories" ON practice_categories;

-- 系統分類：所有人可見
CREATE POLICY "Users can view system categories"
ON practice_categories FOR SELECT
TO authenticated
USING (is_system = true);

-- 私有分類：創建者可見
CREATE POLICY "Teachers can view own private categories"
ON practice_categories FOR SELECT
TO authenticated
USING (is_system = false AND created_by = auth.uid());

-- 學生可以查看老師的私有分類（通過班級關聯）
CREATE POLICY "Students can view teacher private categories"
ON practice_categories FOR SELECT
TO authenticated
USING (
  is_system = false AND 
  EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = auth.uid()
    AND c.teacher_id = practice_categories.created_by
  )
);

-- 老師可以創建私有分類
CREATE POLICY "Teachers can create private categories"
ON practice_categories FOR INSERT
TO authenticated
WITH CHECK (
  is_system = false AND 
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- 管理員可以創建系統分類
CREATE POLICY "Admins can create system categories"
ON practice_categories FOR INSERT
TO authenticated
WITH CHECK (
  is_system = true AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- 老師可以更新自己的私有分類
CREATE POLICY "Teachers can update own private categories"
ON practice_categories FOR UPDATE
TO authenticated
USING (is_system = false AND created_by = auth.uid());

-- 管理員可以更新系統分類
CREATE POLICY "Admins can update system categories"
ON practice_categories FOR UPDATE
TO authenticated
USING (
  is_system = true AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- 老師可以刪除自己的私有分類
CREATE POLICY "Teachers can delete own private categories"
ON practice_categories FOR DELETE
TO authenticated
USING (is_system = false AND created_by = auth.uid());

-- 管理員可以刪除系統分類
CREATE POLICY "Admins can delete system categories"
ON practice_categories FOR DELETE
TO authenticated
USING (
  is_system = true AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

