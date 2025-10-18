-- 时文宝鉴 - 评分表
-- Migration: 005
-- Description: 创建老师批改和评分相关表

-- ======================
-- 1. 评分表
-- ======================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  
  -- IB 评分标准（A/B/C/D，每项 0-8 分）
  criterion_a_score INTEGER CHECK (criterion_a_score BETWEEN 0 AND 8),
  criterion_a_comment TEXT,
  
  criterion_b_score INTEGER CHECK (criterion_b_score BETWEEN 0 AND 8),
  criterion_b_comment TEXT,
  
  criterion_c_score INTEGER CHECK (criterion_c_score BETWEEN 0 AND 8),
  criterion_c_comment TEXT,
  
  criterion_d_score INTEGER CHECK (criterion_d_score BETWEEN 0 AND 8),
  criterion_d_comment TEXT,
  
  -- 总分（自动计算）
  total_score INTEGER GENERATED ALWAYS AS (
    COALESCE(criterion_a_score, 0) + 
    COALESCE(criterion_b_score, 0) + 
    COALESCE(criterion_c_score, 0) + 
    COALESCE(criterion_d_score, 0)
  ) STORED,
  
  -- 总评
  overall_comment TEXT,
  
  -- 状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  
  -- AI 评分参考（老师看到的 AI 预估）
  ai_grading_reference JSONB,
  
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 一篇论文只能有一个最终评分
  UNIQUE(essay_id)
);

-- 索引
CREATE INDEX idx_grades_essay ON grades(essay_id);
CREATE INDEX idx_grades_teacher ON grades(teacher_id);
CREATE INDEX idx_grades_status ON grades(status);

COMMENT ON TABLE grades IS '评分表 - 老师对学生论文的评分和评语';
COMMENT ON COLUMN grades.total_score IS '总分（四项标准之和，0-32 分）';

-- ======================
-- RLS 策略
-- ======================

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- 老师可以管理自己的评分
CREATE POLICY "Teachers can manage own grades"
  ON grades FOR ALL
  USING (teacher_id = auth.uid());

-- 学生可以查看自己论文的评分（但只有 status='final' 的）
CREATE POLICY "Students can view final grades on own essays"
  ON grades FOR SELECT
  USING (
    status = 'final'
    AND EXISTS (
      SELECT 1 FROM essays
      WHERE id = grades.essay_id
      AND student_id = auth.uid()
    )
  );

-- ======================
-- 触发器
-- ======================

CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 触发器：评分提交后自动更新论文状态
CREATE OR REPLACE FUNCTION update_essay_status_on_grading()
RETURNS TRIGGER AS $$
BEGIN
  -- 当评分状态变为 final，更新论文状态为 graded
  IF NEW.status = 'final' AND (OLD.status IS NULL OR OLD.status != 'final') THEN
    UPDATE essays
    SET status = 'graded'
    WHERE id = NEW.essay_id;
    
    NEW.graded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_grade_finalized
  BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_status_on_grading();

-- ======================
-- 视图：学生论文概览（老师使用）
-- ======================
CREATE OR REPLACE VIEW teacher_essay_overview AS
SELECT 
  e.id AS essay_id,
  e.assignment_id,
  e.student_id,
  u.display_name AS student_name,
  u.email AS student_email,
  e.title AS essay_title,
  e.status AS essay_status,
  e.total_word_count,
  e.submitted_at,
  
  -- 评分信息
  g.total_score,
  g.status AS grading_status,
  g.graded_at,
  
  -- 统计信息
  (SELECT COUNT(*) FROM paragraphs WHERE essay_id = e.id) AS paragraph_count,
  (SELECT COUNT(*) FROM ai_feedback WHERE paragraph_id IN 
    (SELECT id FROM paragraphs WHERE essay_id = e.id)) AS feedback_count,
    
  -- 诚信分数
  ir.anomaly_score,
  
  e.created_at,
  e.updated_at
FROM essays e
JOIN users u ON u.id = e.student_id
LEFT JOIN grades g ON g.essay_id = e.id
LEFT JOIN writing_integrity_reports ir ON ir.essay_id = e.id;

COMMENT ON VIEW teacher_essay_overview IS '老师论文概览视图 - 方便老师查看学生论文状态';

