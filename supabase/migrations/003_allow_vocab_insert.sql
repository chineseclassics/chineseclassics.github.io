-- =====================================================
-- 允许导入词汇数据
-- 临时策略：允许所有人插入词汇（用于初始数据导入）
-- =====================================================

-- 允许匿名用户插入词汇（用于初始导入）
-- 注意：在生产环境中，应该删除此策略，只允许管理员操作
CREATE POLICY "临时允许导入词汇"
  ON vocabulary
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 允许更新词汇（如果需要）
CREATE POLICY "允许更新词汇"
  ON vocabulary
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- 允许删除词汇（用于清空测试数据）
CREATE POLICY "允许删除词汇"
  ON vocabulary
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- 重要说明：
-- 
-- 这些策略允许任何人管理词汇表，主要用于：
-- 1. MVP 开发阶段快速导入数据
-- 2. 测试和调试
-- 
-- 在生产环境中，建议：
-- 1. 删除这些策略
-- 2. 只保留 SELECT 策略（只读）
-- 3. 使用 service_role 密钥通过后端管理词汇
-- 
-- 删除方法：
-- DROP POLICY "临时允许导入词汇" ON vocabulary;
-- DROP POLICY "允许更新词汇" ON vocabulary;
-- DROP POLICY "允许删除词汇" ON vocabulary;
-- =====================================================

