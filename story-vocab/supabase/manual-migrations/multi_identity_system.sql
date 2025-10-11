-- =====================================================
-- 詞遊記多重身份認證系統 - 手動執行版本
-- 可以在 Supabase Dashboard SQL Editor 中直接執行
-- =====================================================
-- 創建日期：2025-10-11
-- 執行方式：複製此文件內容到 Supabase Dashboard → SQL Editor → Run
-- =====================================================

-- 1. 為 users 表添加新字段（安全，可重複執行）

-- 添加 email 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 添加 avatar_url 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 添加 user_type 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'registered';

-- 添加 last_login_at 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 添加 updated_at 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. 確保 display_name 不為 NULL
UPDATE users SET display_name = '用戶' || id::text WHERE display_name IS NULL OR display_name = '';

-- 3. 創建用戶身份關聯表
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_data JSONB,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT user_identities_provider_id_unique UNIQUE(provider, provider_id)
);

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_provider ON user_identities(provider, provider_id);

-- 5. 創建觸發器（自動更新 updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 啟用 Row Level Security
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;

-- 7. 創建 RLS 策略
DROP POLICY IF EXISTS "Users can view own identities" ON user_identities;
CREATE POLICY "Users can view own identities" ON user_identities
  FOR SELECT
  USING (
    auth.uid()::text = provider_id 
    OR 
    auth.uid()::text IN (
      SELECT provider_id FROM user_identities ui2 
      WHERE ui2.user_id = user_identities.user_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own identities" ON user_identities;
CREATE POLICY "Users can insert own identities" ON user_identities
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own identities" ON user_identities;
CREATE POLICY "Users can update own identities" ON user_identities
  FOR UPDATE
  USING (
    auth.uid()::text = provider_id 
    OR 
    auth.uid()::text IN (
      SELECT provider_id FROM user_identities ui2 
      WHERE ui2.user_id = user_identities.user_id
    )
  );

-- 8. 添加註釋
COMMENT ON TABLE users IS '詞遊記用戶表 - 支持多種登入方式（Google、匿名等）';
COMMENT ON TABLE user_identities IS '用戶身份關聯表 - 綁定不同的登入提供商';
COMMENT ON COLUMN users.email IS 'Google等OAuth用戶必須，匿名用戶為NULL';
COMMENT ON COLUMN users.user_type IS 'registered（正式用戶）或 anonymous（匿名訪客）';
COMMENT ON COLUMN user_identities.provider IS '登入提供商：google, anonymous, apple, email 等';
COMMENT ON COLUMN user_identities.provider_id IS '該提供商的用戶唯一標識符（如 Google ID）';

-- =====================================================
-- 執行完成！
-- 
-- 驗證：
-- SELECT * FROM information_schema.columns WHERE table_name = 'users';
-- SELECT * FROM user_identities LIMIT 5;
-- =====================================================

