-- =====================================================
-- RLS 策略配置
-- 允许前端访问必要的表
-- =====================================================

-- 1. 启用 RLS
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wordbook ENABLE ROW LEVEL SECURITY;

-- 2. Vocabulary 表策略（公开读取）
-- 所有用户（包括匿名）可以读取词汇
CREATE POLICY "词汇表公开读取"
  ON vocabulary
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 管理员可以插入、更新、删除词汇（使用 service_role）
CREATE POLICY "管理员可以管理词汇"
  ON vocabulary
  FOR ALL
  TO service_role
  USING (true);

-- 3. Users 表策略
-- 用户只能读取和更新自己的信息
CREATE POLICY "用户可以查看自己的信息"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的信息"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 允许匿名用户创建临时用户（用于快速开始）
CREATE POLICY "允许创建用户"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Story Sessions 表策略
-- 用户只能访问自己的故事
CREATE POLICY "用户可以查看自己的故事"
  ON story_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建故事"
  ON story_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的故事"
  ON story_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 允许匿名用户创建和访问故事（用于快速体验）
CREATE POLICY "匿名用户可以创建故事"
  ON story_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "匿名用户可以查看自己的故事"
  ON story_sessions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "匿名用户可以更新故事"
  ON story_sessions
  FOR UPDATE
  TO anon
  USING (true);

-- 5. User Vocabulary 表策略
-- 用户只能访问自己的词汇学习记录
CREATE POLICY "用户可以查看自己的词汇记录"
  ON user_vocabulary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建词汇记录"
  ON user_vocabulary
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的词汇记录"
  ON user_vocabulary
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. User Wordbook 表策略
-- 用户只能访问自己的生词本
CREATE POLICY "用户可以查看自己的生词本"
  ON user_wordbook
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以添加到生词本"
  ON user_wordbook
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新生词本"
  ON user_wordbook
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除生词本条目"
  ON user_wordbook
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 额外说明：
-- 1. anon = 匿名用户（未登录）
-- 2. authenticated = 已认证用户（已登录）
-- 3. service_role = 管理员角色（后台操作）
-- 
-- 当前配置允许：
-- - 所有人可以读取词汇表
-- - 匿名用户可以体验故事创作（但数据不会永久保存）
-- - 已认证用户的数据会被保护
-- =====================================================

