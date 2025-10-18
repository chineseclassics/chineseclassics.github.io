-- 时文宝鉴 - 论文和段落表
-- Migration: 003
-- Description: 创建论文表、分论点表、段落表，支持分层结构

-- ======================
-- 1. 论文表
-- ======================
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 论文标题
  title TEXT,
  
  -- 状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
  
  -- 提交时间
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- 字数统计
  total_word_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：一个学生一个任务只能有一篇论文
  UNIQUE(assignment_id, student_id)
);

-- 索引
CREATE INDEX idx_essays_assignment ON essays(assignment_id);
CREATE INDEX idx_essays_student ON essays(student_id);
CREATE INDEX idx_essays_status ON essays(status);

COMMENT ON TABLE essays IS '论文表 - 学生的论文作品';

-- ======================
-- 2. 分论点表（支持分层结构）
-- ======================
CREATE TABLE IF NOT EXISTS sub_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  
  -- 分论点标题
  title TEXT NOT NULL,
  
  -- 排序
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_sub_arguments_essay ON sub_arguments(essay_id);
CREATE INDEX idx_sub_arguments_order ON sub_arguments(essay_id, order_index);

COMMENT ON TABLE sub_arguments IS '分论点表 - 支持一个分论点包含多个段落';

-- ======================
-- 3. 段落表
-- ======================
CREATE TABLE IF NOT EXISTS paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  
  -- 所属分论点（引言和结论为 NULL）
  sub_argument_id UUID REFERENCES sub_arguments(id) ON DELETE CASCADE,
  
  -- 段落类型
  paragraph_type TEXT NOT NULL CHECK (paragraph_type IN ('introduction', 'body', 'conclusion')),
  
  -- 段落内容（Quill Delta JSON 格式）
  content JSONB NOT NULL DEFAULT '{"ops":[{"insert":""}]}',
  
  -- 排序
  order_index INTEGER NOT NULL,
  
  -- 字数
  word_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_paragraphs_essay ON paragraphs(essay_id);
CREATE INDEX idx_paragraphs_sub_argument ON paragraphs(sub_argument_id);
CREATE INDEX idx_paragraphs_type ON paragraphs(paragraph_type);
CREATE INDEX idx_paragraphs_order ON paragraphs(essay_id, order_index);

COMMENT ON TABLE paragraphs IS '段落表 - 支持分层结构和版本历史';
COMMENT ON COLUMN paragraphs.content IS 'Quill Delta JSON 格式的富文本内容';

-- ======================
-- 4. 段落版本历史表
-- ======================
CREATE TABLE IF NOT EXISTS paragraph_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  
  -- 版本内容快照
  content JSONB NOT NULL,
  
  -- 触发原因
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('ai_feedback', 'essay_submission', 'manual', 'auto_save', 'restored')),
  
  -- 版本备注
  note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_versions_paragraph ON paragraph_versions(paragraph_id);
CREATE INDEX idx_versions_created ON paragraph_versions(created_at DESC);

COMMENT ON TABLE paragraph_versions IS '段落版本历史 - 记录每次重要变更的快照';

-- ======================
-- RLS 策略
-- ======================

ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraph_versions ENABLE ROW LEVEL SECURITY;

-- Essays 策略
-- 学生只能查看和编辑自己的论文
CREATE POLICY "Students can manage own essays"
  ON essays FOR ALL
  USING (student_id = auth.uid());

-- 老师可以查看自己班级学生的论文
CREATE POLICY "Teachers can view class essays"
  ON essays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = essays.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Sub Arguments 策略
CREATE POLICY "Students can manage own sub arguments"
  ON sub_arguments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM essays
      WHERE id = sub_arguments.essay_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view class sub arguments"
  ON sub_arguments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM essays e
      JOIN assignments a ON a.id = e.assignment_id
      WHERE e.id = sub_arguments.essay_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Paragraphs 策略
CREATE POLICY "Students can manage own paragraphs"
  ON paragraphs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM essays
      WHERE id = paragraphs.essay_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view class paragraphs"
  ON paragraphs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM essays e
      JOIN assignments a ON a.id = e.assignment_id
      WHERE e.id = paragraphs.essay_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Paragraph Versions 策略
CREATE POLICY "Users can view paragraph versions they own"
  ON paragraph_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      WHERE p.id = paragraph_versions.paragraph_id
      AND (e.student_id = auth.uid() OR EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = e.assignment_id
        AND a.teacher_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Students can create versions for own paragraphs"
  ON paragraph_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      WHERE p.id = paragraph_versions.paragraph_id
      AND e.student_id = auth.uid()
    )
  );

-- ======================
-- 触发器：自动更新 updated_at
-- ======================

CREATE TRIGGER update_essays_updated_at
  BEFORE UPDATE ON essays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_arguments_updated_at
  BEFORE UPDATE ON sub_arguments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at
  BEFORE UPDATE ON paragraphs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

