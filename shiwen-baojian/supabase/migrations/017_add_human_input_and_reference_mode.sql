-- ======================
-- 迁移 017：添加 human_input 字段 + 引用模式
-- 创建时间：2025-10-20
-- 目的：
--   1. 在 format_specifications 表中添加 human_input 字段（保存 AI 优化后的结构化文本）
--   2. 将 assignments 表改为引用模式（保存 format_spec_id 而非 JSON 快照）
--   3. 移除 assignments.description 字段（避免与写作要求混淆）
--   4. 移除 assignments.format_spec_json 字段（改用引用）
-- ======================

-- ======================
-- 第一部分：修改 format_specifications 表
-- ======================

-- 添加 human_input 字段
ALTER TABLE public.format_specifications
ADD COLUMN IF NOT EXISTS human_input TEXT;

-- 添加注释
COMMENT ON COLUMN public.format_specifications.human_input IS 
'保存 AI 优化后的结构化文本（学生端显示用）。模式 A 使用预设自然语言，模式 B/C 使用 AI 优化后的文本（非老师原始输入）。';

-- ======================
-- 第二部分：修改 assignments 表
-- ======================

-- 添加 format_spec_id 字段（引用模式）
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS format_spec_id UUID REFERENCES public.format_specifications(id) ON DELETE SET NULL;

-- 添加注释
COMMENT ON COLUMN public.assignments.format_spec_id IS 
'写作要求 ID（引用 format_specifications 表）。老师修改写作要求后，学生实时看到最新内容。';

-- 创建索引（优化关联查询）
CREATE INDEX IF NOT EXISTS idx_assignments_format_spec_id 
ON public.assignments(format_spec_id);

-- ======================
-- 第三部分：移除旧字段（先备份，后删除）
-- ======================

-- 注意：在生产环境中，应先备份数据！
-- 如果已有数据，需要先迁移：
-- UPDATE assignments 
-- SET format_spec_id = (SELECT id FROM format_specifications WHERE name = '红楼梦论文格式' LIMIT 1)
-- WHERE format_spec_id IS NULL;

-- 移除 description 字段（避免与写作要求混淆）
ALTER TABLE public.assignments
DROP COLUMN IF EXISTS description;

-- 移除 format_spec_json 字段（改用引用）
ALTER TABLE public.assignments
DROP COLUMN IF EXISTS format_spec_json;

-- ======================
-- 第四部分：更新表注释
-- ======================

COMMENT ON TABLE public.format_specifications IS 
'写作要求规范表（原名：格式规范表）- 存储老师自定义的写作要求（涵盖格式 + 内容）';

COMMENT ON TABLE public.assignments IS 
'任务表 - 存储老师发布的写作任务。通过 format_spec_id 引用写作要求，老师修改后学生实时看到最新内容。';

-- ======================
-- 验证
-- ======================

-- 查看表结构
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'format_specifications' AND column_name = 'human_input';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'assignments' AND column_name IN ('format_spec_id', 'description', 'format_spec_json');

