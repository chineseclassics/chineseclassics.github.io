-- 时文宝鉴 - AI 反馈和写作行为表
-- Migration: 004
-- Description: 创建 AI 反馈表、写作行为表、批注表

-- ======================
-- 1. AI 反馈表
-- ======================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  paragraph_version_id UUID REFERENCES paragraph_versions(id),
  
  -- 反馈内容（完整的 JSON 结构）
  feedback_json JSONB NOT NULL,
  
  -- AI 评分预估（仅供老师参考）
  ai_grading_json JSONB,
  
  -- 生成时间
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- API 使用统计
  tokens_used INTEGER,
  response_time_ms INTEGER
);

-- 索引
CREATE INDEX idx_feedback_paragraph ON ai_feedback(paragraph_id);
CREATE INDEX idx_feedback_version ON ai_feedback(paragraph_version_id);
CREATE INDEX idx_feedback_generated ON ai_feedback(generated_at DESC);

COMMENT ON TABLE ai_feedback IS 'AI 反馈表 - 存储所有 AI 生成的段落反馈';
COMMENT ON COLUMN ai_feedback.ai_grading_json IS 'AI 评分预估，仅老师可见';

-- ======================
-- 2. 写作行为事件表
-- ======================
CREATE TABLE IF NOT EXISTS writing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  
  -- 事件类型
  event_type TEXT NOT NULL CHECK (event_type IN (
    'paste',                -- 粘贴
    'typing_burst',         -- 快速打字
    'long_pause',          -- 长时间停顿
    'rapid_delete',        -- 快速删除
    'session_start',       -- 开始写作
    'session_end'          -- 结束写作
  )),
  
  -- 事件数据（JSON，根据类型包含不同字段）
  event_data JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_writing_events_paragraph ON writing_events(paragraph_id);
CREATE INDEX idx_writing_events_student ON writing_events(student_id);
CREATE INDEX idx_writing_events_type ON writing_events(event_type);
CREATE INDEX idx_writing_events_created ON writing_events(created_at);

COMMENT ON TABLE writing_events IS '写作行为事件表 - 记录粘贴、打字等行为用于诚信分析';

-- 事件数据结构示例：
COMMENT ON COLUMN writing_events.event_data IS '
paste: {content_length, preview, timestamp}
typing_burst: {duration_ms, char_count, cpm}
long_pause: {duration_ms}
rapid_delete: {char_count}
';

-- ======================
-- 3. 写作诚信报告表（聚合数据）
-- ======================
CREATE TABLE IF NOT EXISTS writing_integrity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  
  -- 统计数据
  total_paste_count INTEGER DEFAULT 0,
  total_paste_length INTEGER DEFAULT 0,
  average_typing_speed DECIMAL(10,2),  -- CPM
  pause_frequency DECIMAL(10,2),
  revision_count INTEGER DEFAULT 0,
  
  -- 异常评分 (0-100)
  anomaly_score INTEGER DEFAULT 0,
  
  -- 标记的可疑事件
  flagged_events JSONB DEFAULT '[]',
  
  -- 报告生成时间
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_integrity_essay ON writing_integrity_reports(essay_id);
CREATE INDEX idx_integrity_student ON writing_integrity_reports(student_id);
CREATE INDEX idx_integrity_anomaly ON writing_integrity_reports(anomaly_score);

COMMENT ON TABLE writing_integrity_reports IS '写作诚信报告 - 聚合分析结果';

-- ======================
-- 4. 老师批注表
-- ======================
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  
  -- 批注内容
  content TEXT NOT NULL,
  
  -- 行内高亮位置（可选）
  highlight_start INTEGER,
  highlight_end INTEGER,
  
  -- 批注类型
  annotation_type TEXT DEFAULT 'comment' CHECK (annotation_type IN ('comment', 'highlight', 'suggestion')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_annotations_paragraph ON annotations(paragraph_id);
CREATE INDEX idx_annotations_teacher ON annotations(teacher_id);

COMMENT ON TABLE annotations IS '老师批注表 - 老师对学生段落的评论和标注';

-- ======================
-- RLS 策略
-- ======================

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_integrity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- AI Feedback 策略
-- 学生可以查看自己段落的反馈（但过滤掉 ai_grading_json）
CREATE POLICY "Students can view own feedback without grading"
  ON ai_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      WHERE p.id = ai_feedback.paragraph_id
      AND e.student_id = auth.uid()
    )
  );

-- 老师可以查看班级学生的完整反馈（包括 ai_grading_json）
CREATE POLICY "Teachers can view class feedback with grading"
  ON ai_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      JOIN assignments a ON a.id = e.assignment_id
      WHERE p.id = ai_feedback.paragraph_id
      AND a.teacher_id = auth.uid()
    )
  );

-- 系统可以插入反馈（通过 Edge Function）
CREATE POLICY "Service role can insert feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (true);  -- Edge Function 使用 service_role key

-- Writing Events 策略
-- 学生可以创建自己的写作事件
CREATE POLICY "Students can create own writing events"
  ON writing_events FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- 学生可以查看自己的写作事件
CREATE POLICY "Students can view own writing events"
  ON writing_events FOR SELECT
  USING (student_id = auth.uid());

-- 老师可以查看班级学生的写作事件
CREATE POLICY "Teachers can view class writing events"
  ON writing_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      JOIN assignments a ON a.id = e.assignment_id
      WHERE p.id = writing_events.paragraph_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Writing Integrity Reports 策略
-- 学生可以查看自己的诚信报告
CREATE POLICY "Students can view own integrity reports"
  ON writing_integrity_reports FOR SELECT
  USING (student_id = auth.uid());

-- 老师可以查看班级学生的诚信报告
CREATE POLICY "Teachers can view class integrity reports"
  ON writing_integrity_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM essays e
      JOIN assignments a ON a.id = e.assignment_id
      WHERE e.id = writing_integrity_reports.essay_id
      AND a.teacher_id = auth.uid()
    )
  );

-- 系统可以创建和更新诚信报告
CREATE POLICY "Service role can manage integrity reports"
  ON writing_integrity_reports FOR ALL
  WITH CHECK (true);

-- Annotations 策略
-- 老师可以管理自己的批注
CREATE POLICY "Teachers can manage own annotations"
  ON annotations FOR ALL
  USING (teacher_id = auth.uid());

-- 学生可以查看老师对自己论文的批注
CREATE POLICY "Students can view annotations on own essays"
  ON annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paragraphs p
      JOIN essays e ON e.id = p.essay_id
      WHERE p.id = annotations.paragraph_id
      AND e.student_id = auth.uid()
    )
  );

-- ======================
-- 触发器
-- ======================
-- 注意：sub_arguments 和 paragraphs 的触发器已在 003 中创建

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrity_reports_updated_at
  BEFORE UPDATE ON writing_integrity_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

