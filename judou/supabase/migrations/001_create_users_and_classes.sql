-- 句豆 - 用戶和班級表
-- Migration: 001
-- Description: 創建用戶表、班級表和班級成員關聯表

-- ======================
-- 1. 用戶表
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 註釋
COMMENT ON TABLE users IS '用戶表 - 存儲老師和學生信息';
COMMENT ON COLUMN users.role IS '角色：teacher 或 student，基於郵箱自動識別';

-- ======================
-- 2. 班級表
-- ======================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active);

COMMENT ON TABLE classes IS '班級表 - 老師創建和管理班級';

-- ======================
-- 3. 班級成員表（學生-班級關聯）
-- ======================
CREATE TABLE IF NOT EXISTS class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(class_id, student_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_class_members_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);

COMMENT ON TABLE class_members IS '班級成員表 - 學生和班級的多對多關聯';

-- ======================
-- RLS (Row Level Security) 策略
-- ======================

-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- ========== Users 表策略 ==========

-- 允許認證用戶查看所有用戶基本信息（教學平台需要師生互相可見）
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- 用戶可以插入自己的記錄
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 用戶可以更新自己的信息
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ========== Classes 表策略 ==========

-- 老師可以查看自己創建的班級
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- 學生可以查看自己所屬的班級
CREATE POLICY "Students can view their classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members
      WHERE class_id = classes.id
      AND student_id = auth.uid()
    )
  );

-- 老師可以創建班級
CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'teacher'
    )
  );

-- 老師可以更新自己的班級
CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

-- 老師可以刪除自己的班級
CREATE POLICY "Teachers can delete own classes"
  ON classes FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- ========== Class Members 表策略 ==========

-- 老師可以查看自己班級的成員
CREATE POLICY "Teachers can view class members"
  ON class_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_members.class_id
      AND teacher_id = auth.uid()
    )
  );

-- 學生可以查看自己的班級成員關係
CREATE POLICY "Students can view own class memberships"
  ON class_members FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- 老師可以添加班級成員
CREATE POLICY "Teachers can add class members"
  ON class_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_members.class_id
      AND teacher_id = auth.uid()
    )
  );

-- 老師可以刪除班級成員
CREATE POLICY "Teachers can remove class members"
  ON class_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_members.class_id
      AND teacher_id = auth.uid()
    )
  );

