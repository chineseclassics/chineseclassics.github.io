-- =====================================================
-- 添加缺失的列
-- 使表结构匹配示例词汇数据
-- =====================================================

-- 添加 hsk_level 列（HSK 等级，可选）
ALTER TABLE vocabulary
ADD COLUMN IF NOT EXISTS hsk_level INT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_vocabulary_hsk_level ON vocabulary(hsk_level);

-- 添加注释
COMMENT ON COLUMN vocabulary.hsk_level IS 'HSK等级 (1-6)，用于标记词汇的HSK分级';

-- =====================================================
-- 说明：
-- HSK (汉语水平考试) 是国际通用的中文水平测试
-- 1 = HSK1 (最基础)
-- 6 = HSK6 (最高级)
-- NULL = 未分级或超出HSK范围
-- =====================================================

