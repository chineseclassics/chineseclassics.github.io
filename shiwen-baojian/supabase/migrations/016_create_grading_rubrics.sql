-- Migration: 创建评分标准和 AI 评分建议表
-- Created: 2025-10-19
-- Description: 创建评分标准表（grading_rubrics）和 AI 评分建议表（ai_grading_suggestions）
-- Related Change: teacher-custom-format-ai (阶段 1)

-- ============================================================
-- 1. 创建评分标准表 (grading_rubrics)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grading_rubrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 基本信息
    name TEXT NOT NULL,                         -- 评分标准名称（如 "IB MYP 中国古典文学"）
    description TEXT,                           -- 评分标准描述
    
    -- 类型和所有者
    type TEXT NOT NULL CHECK (type IN ('system', 'custom')),  -- 类型：系统内置或老师自定义
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- 创建者（系统内置为 NULL）
    
    -- 评分标准内容
    criteria JSONB NOT NULL,                    -- 评分标准定义（A/B/C/D 等标准，包含分值范围和描述）
    
    -- 共享设置
    is_public BOOLEAN DEFAULT false,            -- 是否公开分享给其他老师
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_type 
ON public.grading_rubrics(type);

CREATE INDEX IF NOT EXISTS idx_grading_rubrics_created_by 
ON public.grading_rubrics(created_by);

CREATE INDEX IF NOT EXISTS idx_grading_rubrics_is_public 
ON public.grading_rubrics(is_public) 
WHERE is_public = true;

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_grading_rubric_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grading_rubric_timestamp
    BEFORE UPDATE ON public.grading_rubrics
    FOR EACH ROW
    EXECUTE FUNCTION update_grading_rubric_updated_at();

-- 启用行级安全策略 (RLS)
ALTER TABLE public.grading_rubrics ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以查看系统内置的、自己创建的、以及公开的评分标准
CREATE POLICY "Users can view accessible rubrics"
ON public.grading_rubrics
FOR SELECT
USING (
    type = 'system' OR 
    created_by = auth.uid() OR 
    is_public = true
);

-- RLS 策略：老师可以创建自定义评分标准
CREATE POLICY "Teachers can create custom rubrics"
ON public.grading_rubrics
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid() AND 
    type = 'custom'
);

-- RLS 策略：老师可以更新自己的评分标准
CREATE POLICY "Teachers can update own rubrics"
ON public.grading_rubrics
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- RLS 策略：老师可以删除自己的评分标准
CREATE POLICY "Teachers can delete own rubrics"
ON public.grading_rubrics
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- 添加表和列的注释
COMMENT ON TABLE public.grading_rubrics IS '评分标准表 - 存储系统内置和老师自定义的评分标准';
COMMENT ON COLUMN public.grading_rubrics.id IS '主键 UUID';
COMMENT ON COLUMN public.grading_rubrics.name IS '评分标准名称';
COMMENT ON COLUMN public.grading_rubrics.description IS '评分标准描述';
COMMENT ON COLUMN public.grading_rubrics.type IS '类型：system（系统内置）或 custom（老师自定义）';
COMMENT ON COLUMN public.grading_rubrics.created_by IS '创建者 ID（系统内置为 NULL）';
COMMENT ON COLUMN public.grading_rubrics.criteria IS '评分标准 JSON 定义，包含各标准的名称、分值范围、描述符';
COMMENT ON COLUMN public.grading_rubrics.is_public IS '是否公开分享给其他老师';

-- ============================================================
-- 2. 创建 AI 评分建议表 (ai_grading_suggestions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_grading_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 关联信息
    essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
    grading_rubric_id UUID NOT NULL REFERENCES public.grading_rubrics(id) ON DELETE CASCADE,
    
    -- IB MYP 四个标准的评分（各 0-8 分）
    criterion_a_score INTEGER CHECK (criterion_a_score >= 0 AND criterion_a_score <= 8),
    criterion_b_score INTEGER CHECK (criterion_b_score >= 0 AND criterion_b_score <= 8),
    criterion_c_score INTEGER CHECK (criterion_c_score >= 0 AND criterion_c_score <= 8),
    criterion_d_score INTEGER CHECK (criterion_d_score >= 0 AND criterion_d_score <= 8),
    
    -- 评分理由
    reasoning JSONB NOT NULL,                   -- 每个标准的评分理由（JSON 格式：{"A": "...", "B": "...", ...}）
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_grading_suggestions_essay_id 
ON public.ai_grading_suggestions(essay_id);

CREATE INDEX IF NOT EXISTS idx_ai_grading_suggestions_rubric_id 
ON public.ai_grading_suggestions(grading_rubric_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.ai_grading_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：只有任务的创建老师可以查看 AI 评分建议
CREATE POLICY "Teachers can view AI suggestions for their assignments"
ON public.ai_grading_suggestions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.essays e
        JOIN public.assignments a ON e.assignment_id = a.id
        WHERE e.id = ai_grading_suggestions.essay_id
        AND a.teacher_id = auth.uid()
    )
);

-- RLS 策略：系统可以插入 AI 评分建议（通过 Edge Function）
CREATE POLICY "System can insert AI suggestions"
ON public.ai_grading_suggestions
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Edge Function 以服务角色运行，需要允许插入

-- 添加表和列的注释
COMMENT ON TABLE public.ai_grading_suggestions IS 'AI 评分建议表 - 存储 AI 生成的评分建议（仅老师可见）';
COMMENT ON COLUMN public.ai_grading_suggestions.id IS '主键 UUID';
COMMENT ON COLUMN public.ai_grading_suggestions.essay_id IS '关联的论文 ID';
COMMENT ON COLUMN public.ai_grading_suggestions.grading_rubric_id IS '使用的评分标准 ID';
COMMENT ON COLUMN public.ai_grading_suggestions.criterion_a_score IS 'Criterion A（分析）评分（0-8）';
COMMENT ON COLUMN public.ai_grading_suggestions.criterion_b_score IS 'Criterion B（组织）评分（0-8）';
COMMENT ON COLUMN public.ai_grading_suggestions.criterion_c_score IS 'Criterion C（创作）评分（0-8）';
COMMENT ON COLUMN public.ai_grading_suggestions.criterion_d_score IS 'Criterion D（语言）评分（0-8）';
COMMENT ON COLUMN public.ai_grading_suggestions.reasoning IS '各标准的评分理由 JSON';

-- ============================================================
-- 完成
-- ============================================================

-- 打印确认信息
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 016: 评分标准和 AI 评分建议表创建完成';
    RAISE NOTICE '   - grading_rubrics 表已创建';
    RAISE NOTICE '   - ai_grading_suggestions 表已创建';
    RAISE NOTICE '   - RLS 策略已配置';
END $$;

