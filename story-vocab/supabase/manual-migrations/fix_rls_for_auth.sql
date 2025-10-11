-- =====================================================
-- 修復 RLS 策略以支持新的認證系統
-- 允許用戶創建和管理自己的數據
-- =====================================================

-- 1. 刪除所有現有的 users 表 RLS 策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- 2. 創建新的 RLS 策略（支持多重身份系統）

-- 允許任何認證用戶創建新用戶記錄
CREATE POLICY "Allow authenticated users to insert" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允許匿名用戶創建自己的記錄
CREATE POLICY "Allow anonymous users to insert" ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 用戶可以查看自己的數據
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  TO authenticated, anon
  USING (
    -- 方式1：用戶 ID 匹配（匿名用戶）
    id::text = auth.uid()::text
    OR
    -- 方式2：通過 email 匹配（Google 用戶）
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- 方式3：通過 user_identities 匹配
    id IN (
      SELECT user_id FROM user_identities 
      WHERE provider_id = auth.uid()::text
    )
  );

-- 用戶可以更新自己的數據
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  TO authenticated, anon
  USING (
    id::text = auth.uid()::text
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    id IN (
      SELECT user_id FROM user_identities 
      WHERE provider_id = auth.uid()::text
    )
  );

-- 3. 確保 user_identities 的策略正確

-- 刪除舊策略
DROP POLICY IF EXISTS "Users can view own identities" ON user_identities;
DROP POLICY IF EXISTS "Users can insert own identities" ON user_identities;
DROP POLICY IF EXISTS "Users can update own identities" ON user_identities;

-- 允許創建新身份
CREATE POLICY "Allow insert identities" ON user_identities
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 查看自己的身份
CREATE POLICY "View own identities" ON user_identities
  FOR SELECT
  TO authenticated, anon
  USING (
    provider_id = auth.uid()::text
    OR
    user_id IN (
      SELECT user_id FROM user_identities 
      WHERE provider_id = auth.uid()::text
    )
  );

-- 更新自己的身份
CREATE POLICY "Update own identities" ON user_identities
  FOR UPDATE
  TO authenticated, anon
  USING (
    provider_id = auth.uid()::text
    OR
    user_id IN (
      SELECT user_id FROM user_identities 
      WHERE provider_id = auth.uid()::text
    )
  );

-- =====================================================
-- 修復完成！
-- 現在用戶應該可以：
-- 1. 創建新的 users 記錄（匿名或 Google）
-- 2. 創建對應的 user_identities 記錄
-- 3. 查看和更新自己的數據
-- =====================================================

