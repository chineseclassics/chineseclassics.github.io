-- 时文宝鉴 - 简化 RLS 策略用于测试
-- Migration: 010
-- Description: 临时简化 RLS 策略，打破循环引用，支持匿名用户测试

-- ======================
-- 策略：完全重建，避免所有循环引用
-- ======================

-- ==================
-- 1. Classes 表
-- ==================

-- 删除可能导致循环的策略
DROP POLICY IF EXISTS "Students can view their classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;

-- 重建简化策略
CREATE POLICY "Teachers can manage own classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid());

-- 学生查看班级：简化版，不查询 class_members（避免循环）
-- 暂时允许学生查看所有班级（测试用）
CREATE POLICY "Students can view classes"
  ON classes FOR SELECT
  USING (true);  -- 临时：允许所有已登录用户查看班级

-- ==================
-- 2. Class Members 表
-- ==================

-- 删除可能导致循环的策略
DROP POLICY IF EXISTS "Teachers can manage class members" ON class_members;
DROP POLICY IF EXISTS "Students can view own class memberships" ON class_members;

-- 重建简化策略：不查询 classes 表（避免循环）
CREATE POLICY "Teachers can manage class members"
  ON class_members FOR ALL
  USING (
    -- 直接检查是否是老师，不查询 classes 表
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

CREATE POLICY "Students can view own class memberships"
  ON class_members FOR SELECT
  USING (student_id = auth.uid());

-- ==================
-- 3. Assignments 表
-- ==================

-- 删除可能导致循环的策略
DROP POLICY IF EXISTS "Teachers can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view published assignments in their class" ON assignments;

-- 重建简化策略
CREATE POLICY "Teachers can manage own assignments"
  ON assignments FOR ALL
  USING (teacher_id = auth.uid());

-- 学生查看任务：简化版，不查询 class_members
CREATE POLICY "Students can view published assignments"
  ON assignments FOR SELECT
  USING (is_published = true);  -- 临时：允许查看所有已发布任务

-- ==================
-- 4. Essays 表（已在 009 修复，再次确认）
-- ==================

-- 删除所有策略
DROP POLICY IF EXISTS "Students can manage own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view class essays" ON essays;

-- 重建最简单的策略
CREATE POLICY "Users can manage own essays"
  ON essays FOR ALL
  USING (student_id = auth.uid());

-- 老师查看：不涉及任何其他表的复杂查询
CREATE POLICY "Teachers can view all essays"
  ON essays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

-- ==================
-- 5. Sub Arguments 表
-- ==================

DROP POLICY IF EXISTS "Students can manage own sub arguments" ON sub_arguments;
DROP POLICY IF EXISTS "Teachers can view class sub arguments" ON sub_arguments;

CREATE POLICY "Users can manage own sub arguments"
  ON sub_arguments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM essays
      WHERE id = sub_arguments.essay_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all sub arguments"
  ON sub_arguments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

-- ==================
-- 6. Paragraphs 表
-- ==================

DROP POLICY IF EXISTS "Students can manage own paragraphs" ON paragraphs;
DROP POLICY IF EXISTS "Teachers can view class paragraphs" ON paragraphs;

CREATE POLICY "Users can manage own paragraphs"
  ON paragraphs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM essays
      WHERE id = paragraphs.essay_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all paragraphs"
  ON paragraphs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

-- ==================
-- 7. 添加注释
-- ==================

COMMENT ON TABLE classes IS 'RLS 策略已简化，避免循环引用';
COMMENT ON TABLE class_members IS 'RLS 策略已简化，避免循环引用';
COMMENT ON TABLE assignments IS 'RLS 策略已简化，避免循环引用';
COMMENT ON TABLE essays IS 'RLS 策略已简化，支持匿名用户测试';

