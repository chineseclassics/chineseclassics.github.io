-- 时文宝鉴 - 修复评分触发器的权限问题
-- Migration: 026
-- Created: 2025-10-21
-- Description: 修复 update_essay_status_on_grading 触发器函数
--             使用 SECURITY DEFINER 绕过 RLS，确保触发器能正常更新 essays.status

-- ============================================================
-- 重新创建触发器函数（使用 SECURITY DEFINER）
-- ============================================================

-- 删除旧的触发器函数（如果存在）
DROP FUNCTION IF EXISTS update_essay_status_on_grading() CASCADE;

-- 创建新的触发器函数
CREATE OR REPLACE FUNCTION update_essay_status_on_grading()
RETURNS TRIGGER 
SECURITY DEFINER  -- 🔑 关键：使用定义者权限，绕过 RLS
SET search_path = public
AS $$
BEGIN
  -- 当评分状态变为 final，更新论文状态为 graded
  IF NEW.status = 'final' AND (OLD.status IS NULL OR OLD.status != 'final') THEN
    -- 使用 SECURITY DEFINER 后，这个 UPDATE 会绕过 RLS 策略
    UPDATE essays
    SET status = 'graded'
    WHERE id = NEW.essay_id;
    
    -- 设置评分时间
    NEW.graded_at = NOW();
    
    -- 调试日志
    RAISE NOTICE '✅ 已将论文 % 状态更新为 graded', NEW.essay_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新创建触发器
DROP TRIGGER IF EXISTS on_grade_finalized ON grades;

CREATE TRIGGER on_grade_finalized
  BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_status_on_grading();

-- ============================================================
-- 验证触发器
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.triggers 
    WHERE trigger_name = 'on_grade_finalized'
    AND event_object_table = 'grades'
  ) THEN
    RAISE NOTICE '✅ Migration 026: 触发器 on_grade_finalized 已成功创建';
  ELSE
    RAISE EXCEPTION '❌ Migration 026 失败: 触发器未创建';
  END IF;
END $$;

-- ============================================================
-- 添加注释说明
-- ============================================================

COMMENT ON FUNCTION update_essay_status_on_grading() IS 
  '触发器函数：当评分状态变为 final 时，自动更新论文状态为 graded（使用 SECURITY DEFINER 绕过 RLS）';

-- ============================================================
-- 修复现有数据（将已评分但状态仍为 submitted 的论文更新为 graded）
-- ============================================================

UPDATE essays
SET status = 'graded'
WHERE id IN (
  SELECT essay_id 
  FROM grades 
  WHERE status = 'final'
  AND essay_id IN (
    SELECT id FROM essays WHERE status = 'submitted'
  )
);

-- 打印修复结果
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM essays e
  JOIN grades g ON g.essay_id = e.id
  WHERE e.status = 'graded' AND g.status = 'final';
  
  RAISE NOTICE '✅ Migration 026: 已修复 % 篇论文的状态', updated_count;
END $$;

