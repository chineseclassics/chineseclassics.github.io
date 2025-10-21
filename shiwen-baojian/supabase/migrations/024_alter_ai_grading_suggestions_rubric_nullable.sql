-- 时文宝鉴 - 修改 AI 评分建议表
-- Migration: 024
-- Created: 2025-10-21
-- Description: 将 grading_rubric_id 字段改为可选（允许 NULL）
-- Reason: Edge Function 目前不使用 grading_rubrics 表，而是直接使用传入的评分标准 JSON
--         将来如果需要引用 grading_rubrics 表，可以再改回 NOT NULL

-- ============================================================
-- 修改 ai_grading_suggestions 表结构
-- ============================================================

-- 将 grading_rubric_id 改为可选（允许 NULL）
ALTER TABLE public.ai_grading_suggestions 
ALTER COLUMN grading_rubric_id DROP NOT NULL;

-- ============================================================
-- 验证修改
-- ============================================================

-- 查看修改后的表结构
DO $$
DECLARE
  is_null text;
BEGIN
  SELECT is_nullable INTO is_null
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'ai_grading_suggestions'
  AND column_name = 'grading_rubric_id';
  
  IF is_null = 'YES' THEN
    RAISE NOTICE '✅ Migration 024: grading_rubric_id 已成功设置为可选';
  ELSE
    RAISE EXCEPTION '❌ Migration 024 失败: grading_rubric_id 仍为 NOT NULL';
  END IF;
END $$;

-- ============================================================
-- 添加注释说明
-- ============================================================

COMMENT ON COLUMN public.ai_grading_suggestions.grading_rubric_id IS 
  '评分标准 ID（可选）- 暂时允许 NULL，因为 Edge Function 使用传入的评分标准 JSON';

