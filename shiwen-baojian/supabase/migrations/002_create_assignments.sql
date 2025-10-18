-- 时文宝鉴 - 任务表
-- Migration: 002
-- Description: 创建写作任务表，包含格式要求和评分标准

-- ======================
-- 任务表
-- ======================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  
  -- 基本信息
  title TEXT NOT NULL,
  description TEXT,
  
  -- 格式要求（JSON 格式，基于 honglou-essay-format.json）
  format_spec_json JSONB NOT NULL,
  
  -- 评分标准（IB MYP/DP 或自定义）
  grading_rubric_json JSONB NOT NULL,
  
  -- 字数要求
  min_word_count INTEGER DEFAULT 1500,
  max_word_count INTEGER DEFAULT 2500,
  
  -- 截止日期
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- 状态
  is_published BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_published ON assignments(is_published);

COMMENT ON TABLE assignments IS '写作任务表 - 老师创建的论文写作任务';
COMMENT ON COLUMN assignments.format_spec_json IS '格式要求 JSON，包含段落结构、检查规则等';
COMMENT ON COLUMN assignments.grading_rubric_json IS '评分标准 JSON，IB MYP/DP 或自定义标准';

-- ======================
-- RLS 策略
-- ======================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- 老师可以查看自己的任务
CREATE POLICY "Teachers can view own assignments"
  ON assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- 老师可以创建任务
CREATE POLICY "Teachers can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

-- 老师可以更新自己的任务
CREATE POLICY "Teachers can update own assignments"
  ON assignments FOR UPDATE
  USING (teacher_id = auth.uid());

-- 老师可以删除自己的任务
CREATE POLICY "Teachers can delete own assignments"
  ON assignments FOR DELETE
  USING (teacher_id = auth.uid());

-- 学生可以查看自己班级的已发布任务
CREATE POLICY "Students can view published assignments in their class"
  ON assignments FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM class_members
      WHERE class_id = assignments.class_id
      AND student_id = auth.uid()
    )
  );

-- ======================
-- 触发器：更新 updated_at
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

