-- Migration: 创建 AI 反馈表
-- Created: 2025-10-19
-- Description: 创建用于存储 AI 段落反馈的表，支持引言、正文、结论的反馈记录

-- 创建 AI 反馈表
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paragraph_id TEXT NOT NULL,           -- 段落标识符（可以是 "intro", "conclusion" 或动态生成的 ID）
    feedback_json JSONB NOT NULL,         -- AI 反馈内容（学生可见）
    ai_grading_json JSONB,                -- AI 评分预估（仅老师可见）
    generated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ai_feedback_paragraph_id 
ON public.ai_feedback(paragraph_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_generated_at 
ON public.ai_feedback(generated_at DESC);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许认证用户和匿名用户插入反馈
CREATE POLICY "Users can insert feedback"
ON public.ai_feedback
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- RLS 策略：允许认证用户和匿名用户查看反馈
CREATE POLICY "Users can view feedback"
ON public.ai_feedback
FOR SELECT
TO authenticated, anon
USING (true);

-- 添加表和列的注释说明
COMMENT ON TABLE public.ai_feedback IS 'AI 段落反馈记录表';
COMMENT ON COLUMN public.ai_feedback.id IS '主键 UUID';
COMMENT ON COLUMN public.ai_feedback.paragraph_id IS '段落标识符（支持 intro, conclusion 或动态生成的段落 ID）';
COMMENT ON COLUMN public.ai_feedback.feedback_json IS 'AI 反馈内容 JSON（包含结构检查、内容分析、句子级问题、改进建议等）';
COMMENT ON COLUMN public.ai_feedback.ai_grading_json IS 'AI 评分预估 JSON（IB 标准 A/B/C/D，仅供老师参考，不显示给学生）';
COMMENT ON COLUMN public.ai_feedback.generated_at IS 'AI 反馈生成时间';
COMMENT ON COLUMN public.ai_feedback.created_at IS '记录创建时间';

