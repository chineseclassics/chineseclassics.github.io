-- 允許老師查看自己班級學生的 users 信息
-- Migration: 018
-- Date: 2025-10-19

-- ======================
-- 添加 RLS 策略：老師可以查看班級學生的信息
-- ======================

CREATE POLICY "Teachers can view class students"
  ON users FOR SELECT
  USING (
    -- 老師可以查看自己班級的學生信息
    EXISTS (
      SELECT 1 
      FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = users.id
      AND c.teacher_id = auth.uid()
    )
  );

COMMENT ON POLICY "Teachers can view class students" ON users IS '
允許老師查看自己班級學生的基本信息（姓名、郵箱、狀態等）

使用場景：
- 老師端查看學生列表
- 老師端查看學生論文
- 老師端批改作業

安全保證：
- 只能查看自己班級的學生
- 不能查看其他老師班級的學生
- 不能查看其他老師的信息
';

