-- 时文宝鉴 - 用户和班级表
-- Migration: 001
-- Description: 创建用户表、班级表和班级成员关联表

-- ======================
-- 1. 用户表
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 注释
COMMENT ON TABLE users IS '用户表 - 存储老师和学生信息';
COMMENT ON COLUMN users.role IS '角色：teacher 或 student，基于邮箱自动识别';

-- ======================
-- 2. 班级表
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
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_active ON classes(is_active);

COMMENT ON TABLE classes IS '班级表 - 老师创建和管理班级';

-- ======================
-- 3. 班级成员表（学生-班级关联）
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
CREATE INDEX idx_class_members_class ON class_members(class_id);
CREATE INDEX idx_class_members_student ON class_members(student_id);

COMMENT ON TABLE class_members IS '班级成员表 - 学生和班级的多对多关联';

-- ======================
-- RLS (Row Level Security) 策略
-- ======================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- Users 表策略
-- 用户可以查看自己的信息
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- 用户可以更新自己的信息
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Classes 表策略
-- 老师可以查看自己创建的班级
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  USING (teacher_id = auth.uid());

-- 老师可以创建班级
CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'teacher'
    )
  );

-- 老师可以更新自己的班级
CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE
  USING (teacher_id = auth.uid());

-- 老师可以删除自己的班级
CREATE POLICY "Teachers can delete own classes"
  ON classes FOR DELETE
  USING (teacher_id = auth.uid());

-- 学生可以查看自己所属的班级
CREATE POLICY "Students can view their classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members
      WHERE class_id = classes.id
      AND student_id = auth.uid()
    )
  );

-- Class Members 表策略
-- 老师可以管理自己班级的成员
CREATE POLICY "Teachers can manage class members"
  ON class_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_members.class_id
      AND teacher_id = auth.uid()
    )
  );

-- 学生可以查看自己的班级成员关系
CREATE POLICY "Students can view own class memberships"
  ON class_members FOR SELECT
  USING (student_id = auth.uid());

