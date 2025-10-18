-- 时文宝鉴 - 允许无任务草稿（用于测试）
-- Migration: 008
-- Description: 允许 essays.assignment_id 为 NULL，支持匿名用户测试草稿

-- ======================
-- 1. 修改 essays 表，允许 assignment_id 为 NULL
-- ======================

-- 删除唯一约束
ALTER TABLE essays 
  DROP CONSTRAINT IF EXISTS essays_assignment_id_student_id_key;

-- 允许 assignment_id 为 NULL
ALTER TABLE essays 
  ALTER COLUMN assignment_id DROP NOT NULL;

-- 添加新的唯一约束（考虑 NULL 情况）
-- 一个学生对于同一个任务只能有一篇论文
-- 对于测试草稿（assignment_id IS NULL），不限制数量
CREATE UNIQUE INDEX idx_essays_unique_per_assignment
  ON essays (assignment_id, student_id)
  WHERE assignment_id IS NOT NULL;

COMMENT ON COLUMN essays.assignment_id IS 'Assignment ID (可为 NULL 用于测试草稿)';

-- ======================
-- 2. 更新 RLS 策略：允许匿名用户保存草稿
-- ======================

-- 删除旧策略
DROP POLICY IF EXISTS "Students can manage own essays" ON essays;

-- 新策略：学生可以管理自己的论文（包括匿名用户的测试草稿）
CREATE POLICY "Students can manage own essays"
  ON essays FOR ALL
  USING (
    student_id = auth.uid()
    -- 匿名用户或已登录用户都可以访问自己的论文
  );

-- 老师查看策略保持不变（只查看有任务的论文）
DROP POLICY IF EXISTS "Teachers can view class essays" ON essays;

CREATE POLICY "Teachers can view class essays"
  ON essays FOR SELECT
  USING (
    assignment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = essays.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

-- ======================
-- 3. 添加默认测试任务（可选）
-- ======================

-- 为测试环境创建一个默认的"自由写作"任务
-- 注意：这需要先有一个测试老师和测试班级
-- 实际部署时可以删除此部分

COMMENT ON TABLE essays IS '论文表 - assignment_id 可为 NULL 用于测试草稿';

