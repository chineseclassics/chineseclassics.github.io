-- 时文宝鉴 - 修复 RLS 策略循环引用
-- Migration: 009
-- Description: 修复 essays 表的 RLS 策略，避免与 class_members 表的循环引用

-- ======================
-- 1. 删除导致循环的策略
-- ======================

-- 删除 essays 的所有现有策略
DROP POLICY IF EXISTS "Students can manage own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view class essays" ON essays;

-- ======================
-- 2. 创建简化的策略（避免循环引用）
-- ======================

-- 学生策略：直接基于 student_id，不查询其他表
CREATE POLICY "Students can manage own essays"
  ON essays FOR ALL
  USING (
    student_id = auth.uid()
  );

-- 老师策略：简化版，只查询 assignments 表，不查询 class_members
-- 这样避免了与 class_members 的循环引用
CREATE POLICY "Teachers can view class essays"
  ON essays FOR SELECT
  USING (
    -- 只有关联了任务的论文才允许老师查看
    assignment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = essays.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- ======================
-- 3. 确保匿名用户可以创建测试草稿
-- ======================

-- 对于 assignment_id IS NULL 的测试草稿，
-- 已经被 "Students can manage own essays" 策略覆盖了
-- 因为它只检查 student_id = auth.uid()，不涉及其他表

-- ======================
-- 4. 验证策略
-- ======================

COMMENT ON POLICY "Students can manage own essays" ON essays 
  IS '学生可以管理自己的论文（包括匿名用户的测试草稿）';

COMMENT ON POLICY "Teachers can view class essays" ON essays 
  IS '老师可以查看通过任务关联的学生论文（简化版，避免循环引用）';

