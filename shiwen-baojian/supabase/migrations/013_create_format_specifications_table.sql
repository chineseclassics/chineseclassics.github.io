-- Migration: 创建格式规范表
-- Created: 2025-10-19
-- Description: 创建用于存储老师自定义格式规范的表，支持混合存储架构
-- Note: 此表在阶段 3 启用，当前阶段 2 暂不执行

-- 创建格式规范表
CREATE TABLE IF NOT EXISTS public.format_specifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 基本信息
    name TEXT NOT NULL,                    -- 规范名称（如"我的议论文格式"）
    description TEXT,                      -- 规范描述
    essay_type TEXT NOT NULL,              -- 论文类型（argumentative, expository, etc.）
    
    -- 所有者和权限
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT false,       -- 是否系统内置（系统内置规范也可存到数据库）
    is_public BOOLEAN DEFAULT false,       -- 是否公开分享给其他老师
    
    -- 规范内容
    spec_json JSONB NOT NULL,              -- 完整的格式规范 JSON（遵循 format-spec schema）
    
    -- 版本管理
    version INTEGER DEFAULT 1,             -- 版本号
    parent_spec_id UUID REFERENCES public.format_specifications(id), -- 基于哪个规范创建的
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,         -- 被使用次数（关联的任务数）
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_format_specs_created_by 
ON public.format_specifications(created_by);

CREATE INDEX IF NOT EXISTS idx_format_specs_essay_type 
ON public.format_specifications(essay_type);

CREATE INDEX IF NOT EXISTS idx_format_specs_is_public 
ON public.format_specifications(is_public) 
WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_format_specs_is_system 
ON public.format_specifications(is_system) 
WHERE is_system = true;

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_format_spec_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_format_spec_timestamp
    BEFORE UPDATE ON public.format_specifications
    FOR EACH ROW
    EXECUTE FUNCTION update_format_spec_updated_at();

-- 启用行级安全策略 (RLS)
ALTER TABLE public.format_specifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略：老师可以查看自己的、系统的、公开的规范
CREATE POLICY "Users can view accessible specs"
ON public.format_specifications
FOR SELECT
USING (
    created_by = auth.uid() OR 
    is_system = true OR 
    is_public = true
);

-- RLS 策略：老师可以创建自己的规范
CREATE POLICY "Teachers can create own specs"
ON public.format_specifications
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid() AND 
    is_system = false  -- 只有系统管理员可以创建系统规范
);

-- RLS 策略：老师可以更新自己的规范
CREATE POLICY "Teachers can update own specs"
ON public.format_specifications
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- RLS 策略：老师可以删除自己的规范
CREATE POLICY "Teachers can delete own specs"
ON public.format_specifications
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- 添加表和列的注释
COMMENT ON TABLE public.format_specifications IS '格式规范表 - 存储老师自定义的论文格式要求';
COMMENT ON COLUMN public.format_specifications.id IS '主键 UUID';
COMMENT ON COLUMN public.format_specifications.name IS '规范名称';
COMMENT ON COLUMN public.format_specifications.description IS '规范描述';
COMMENT ON COLUMN public.format_specifications.essay_type IS '论文类型（argumentative, expository, narrative, book-review 等）';
COMMENT ON COLUMN public.format_specifications.created_by IS '创建者（老师）ID';
COMMENT ON COLUMN public.format_specifications.is_system IS '是否系统内置规范（true 表示官方模板）';
COMMENT ON COLUMN public.format_specifications.is_public IS '是否公开分享（true 表示其他老师也可以使用）';
COMMENT ON COLUMN public.format_specifications.spec_json IS '完整的格式规范 JSON，遵循 format-spec schema';
COMMENT ON COLUMN public.format_specifications.version IS '版本号（每次更新递增）';
COMMENT ON COLUMN public.format_specifications.parent_spec_id IS '父规范 ID（如果是基于某个规范修改而来）';
COMMENT ON COLUMN public.format_specifications.usage_count IS '使用次数统计（关联的任务数量）';

-- 示例数据（可选，用于测试）
-- INSERT INTO public.format_specifications (name, description, essay_type, is_system, spec_json) VALUES
-- ('红楼梦论文格式（数据库版）', '基于《论文格式宝典》的红楼梦论文格式', 'literary-analysis', true, '...');

