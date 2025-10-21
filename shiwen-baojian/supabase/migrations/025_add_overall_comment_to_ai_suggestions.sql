-- 时文宝鉴 - 为 AI 评分建议表添加总评字段
-- Migration: 025
-- Created: 2025-10-21
-- Description: 添加 overall_comment 字段，存储 AI 生成的总评（包含优点和改进建议）

-- ============================================================
-- 添加 overall_comment 字段
-- ============================================================

-- 添加总评字段（TEXT 类型，存储 JSON 字符串）
ALTER TABLE public.ai_grading_suggestions 
ADD COLUMN IF NOT EXISTS overall_comment TEXT;

-- 添加注释说明
COMMENT ON COLUMN public.ai_grading_suggestions.overall_comment IS 
  'AI 总评（JSON 格式字符串）- 包含 strengths（优点）和 improvements（改进建议），供老师参考';

-- ============================================================
-- 验证修改
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'ai_grading_suggestions'
    AND column_name = 'overall_comment'
  ) THEN
    RAISE NOTICE '✅ Migration 025: overall_comment 字段已成功添加到 ai_grading_suggestions 表';
  ELSE
    RAISE EXCEPTION '❌ Migration 025 失败: overall_comment 字段未添加';
  END IF;
END $$;

