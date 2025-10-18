-- 时文宝鉴 - 修复视图 RLS 安全策略
-- Migration: 006
-- Description: 为 teacher_essay_overview 视图添加行级安全策略

-- ======================
-- 为视图启用 RLS
-- ======================

-- 注意：视图默认继承底层表的 RLS，但需要显式启用
ALTER VIEW teacher_essay_overview SET (security_invoker = true);

-- 如果上面的方法不工作，我们可以删除视图并重建为安全视图
DROP VIEW IF EXISTS teacher_essay_overview;

-- 重建视图（使用 security_invoker）
CREATE VIEW teacher_essay_overview 
WITH (security_invoker = true) AS
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

-- ======================
-- 添加视图的 RLS 策略
-- ======================

-- 使用 security_invoker 模式，视图会使用调用者的权限
-- 这意味着：
-- - 老师只能看到自己班级学生的论文
-- - 学生只能看到自己的论文
-- RLS 策略由底层的 essays 表自动执行

COMMENT ON VIEW teacher_essay_overview IS '老师论文概览视图（安全模式） - 使用调用者权限，自动应用 RLS';

-- ======================
-- 额外说明
-- ======================

-- security_invoker = true 的作用：
-- 1. 视图查询使用当前用户的权限
-- 2. 自动继承 essays、users、grades 等表的 RLS 策略
-- 3. 老师只能看到自己教的班级
-- 4. 学生只能看到自己的论文
-- 5. 无需为视图单独编写 RLS 策略

