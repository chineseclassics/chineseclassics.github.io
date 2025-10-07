-- =====================================================
-- 正确配置 RLS 策略
-- 允许匿名用户管理词汇（MVP 开发阶段）
-- =====================================================

-- 1. 确保 RLS 已启用
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（清理旧策略避免冲突）
DROP POLICY IF EXISTS "词汇表公开读取" ON vocabulary;
DROP POLICY IF EXISTS "临时允许导入词汇" ON vocabulary;
DROP POLICY IF EXISTS "允许更新词汇" ON vocabulary;
DROP POLICY IF EXISTS "允许删除词汇" ON vocabulary;
DROP POLICY IF EXISTS "管理员可以管理词汇" ON vocabulary;

-- 3. 创建新的策略（使用不同的名称避免冲突）

-- 允许所有人（包括匿名用户）读取词汇
CREATE POLICY "public_read_vocabulary"
  ON vocabulary
  FOR SELECT
  USING (true);

-- 允许所有人（包括匿名用户）插入词汇
CREATE POLICY "public_insert_vocabulary"
  ON vocabulary
  FOR INSERT
  WITH CHECK (true);

-- 允许所有人（包括匿名用户）更新词汇
CREATE POLICY "public_update_vocabulary"
  ON vocabulary
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 允许所有人（包括匿名用户）删除词汇
CREATE POLICY "public_delete_vocabulary"
  ON vocabulary
  FOR DELETE
  USING (true);

-- 4. 添加 hsk_level 列（如果还没有）
ALTER TABLE vocabulary
ADD COLUMN IF NOT EXISTS hsk_level INT;

-- 5. 添加索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_hsk_level ON vocabulary(hsk_level);

-- =====================================================
-- 验证策略
-- =====================================================
-- 查看当前策略：
-- SELECT * FROM pg_policies WHERE tablename = 'vocabulary';
--
-- 应该看到 4 个策略：
-- - public_read_vocabulary
-- - public_insert_vocabulary  
-- - public_update_vocabulary
-- - public_delete_vocabulary
-- =====================================================

-- =====================================================
-- 生产环境建议（未来）
-- =====================================================
-- 在生产环境中，应该：
-- 1. 删除 INSERT/UPDATE/DELETE 策略
-- 2. 只保留 SELECT 策略
-- 3. 使用 service_role key 通过后端 API 管理词汇
-- 
-- 删除写入权限：
-- DROP POLICY "public_insert_vocabulary" ON vocabulary;
-- DROP POLICY "public_update_vocabulary" ON vocabulary;
-- DROP POLICY "public_delete_vocabulary" ON vocabulary;
-- =====================================================

