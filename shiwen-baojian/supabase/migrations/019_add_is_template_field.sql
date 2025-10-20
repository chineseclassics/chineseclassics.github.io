-- Migration: 019_add_is_template_field.sql
-- Purpose: 区分通用模板和任务专属写作要求
-- Date: 2025-10-20
-- Related: teacher-custom-format-ai 阶段 3.4

-- ============================================================
-- 1. 添加 is_template 字段
-- ============================================================

COMMENT ON TABLE format_specifications IS '写作要求规范表 - 包含系统格式、通用模板、任务专属格式';

-- 添加 is_template 字段，区分：
-- - 通用模板（true）：可复用，显示在模板库
-- - 任务专属（false）：一次性使用，不显示在模板库
ALTER TABLE format_specifications 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

COMMENT ON COLUMN format_specifications.is_template IS '是否为通用模板（true=可复用显示在模板库, false=任务专属）';

-- ============================================================
-- 2. 自动更新系统格式为通用模板
-- ============================================================

-- 所有系统格式自动标记为通用模板（可在模板库中查看和使用）
UPDATE format_specifications 
SET is_template = true 
WHERE is_system = true;

-- ============================================================
-- 3. 更新查询逻辑说明
-- ============================================================

-- 模板库查询：is_template = true OR is_system = true
-- （虽然系统格式已设置 is_template=true，但保留 is_system 作为主要标识）

-- 任务创建下拉菜单查询：所有可见的格式
-- WHERE is_system = true OR created_by = current_user_id

-- ============================================================
-- 4. 索引优化（可选）
-- ============================================================

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_format_specifications_is_template 
ON format_specifications(is_template) 
WHERE is_template = true;

CREATE INDEX IF NOT EXISTS idx_format_specifications_template_user 
ON format_specifications(is_template, created_by) 
WHERE is_template = true;

-- ============================================================
-- 验证
-- ============================================================

-- 检查系统格式是否已标记为模板
-- SELECT id, name, is_system, is_template FROM format_specifications WHERE is_system = true;

-- 预期结果：所有 is_system=true 的记录，is_template 也应为 true

