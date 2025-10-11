-- =====================================================
-- 詞遊記多重身份認證系統遷移
-- UUID 主鍵 + 支持 Google、匿名等多種登入方式
-- =====================================================
-- 創建日期：2025-10-11
-- 目標：支持 Google 用戶（學校學生）和匿名用戶（訪客試用）
-- =====================================================

BEGIN;

-- 1. 為 users 表添加新字段（增量遷移，安全）

-- 添加 email 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
    RAISE NOTICE '已添加 email 字段';
  END IF;
END $$;

-- 添加 avatar_url 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
    RAISE NOTICE '已添加 avatar_url 字段';
  END IF;
END $$;

-- 添加 user_type 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'registered';
    RAISE NOTICE '已添加 user_type 字段';
  END IF;
END $$;

-- 添加 last_login_at 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    RAISE NOTICE '已添加 last_login_at 字段';
  END IF;
END $$;

-- 添加 updated_at 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE '已添加 updated_at 字段';
  END IF;
END $$;

-- 修改 display_name 為 NOT NULL（如果現有數據允許）
-- 注意：如果有 NULL 值，這會失敗，需要先處理
DO $$
BEGIN
  -- 先為 NULL 值設置默認值
  UPDATE users SET display_name = '用戶' WHERE display_name IS NULL;
  
  -- 然後添加 NOT NULL 約束
  ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
  RAISE NOTICE 'display_name 已設為 NOT NULL';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'display_name 已經是 NOT NULL 或更新失敗';
END $$;

-- 2. 創建用戶身份關聯表（如果不存在）
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'google' | 'anonymous' | 'apple' | 'email'
  provider_id TEXT NOT NULL,           -- 該提供商的用戶唯一 ID
  provider_data JSONB,                 -- 提供商的額外數據（email, name, avatar 等）
  is_primary BOOLEAN DEFAULT true,     -- 是否為主要登入方式
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT user_identities_provider_id_unique UNIQUE(provider, provider_id)
);

-- 3. 創建索引（提高查詢效率）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_provider ON user_identities(provider, provider_id);

-- 4. 添加表註釋
COMMENT ON TABLE users IS '詞遊記用戶表 - 支持多種登入方式（Google、匿名等）';
COMMENT ON TABLE user_identities IS '用戶身份關聯表 - 綁定不同的登入提供商';

-- 7. 添加列註釋
COMMENT ON COLUMN users.id IS '用戶唯一標識符（UUID）';
COMMENT ON COLUMN users.email IS 'Google等OAuth用戶必須，匿名用戶為NULL';
COMMENT ON COLUMN users.user_type IS 'registered（正式用戶）或 anonymous（匿名訪客）';
COMMENT ON COLUMN user_identities.provider IS '登入提供商：google, anonymous, apple, email 等';
COMMENT ON COLUMN user_identities.provider_id IS '該提供商的用戶唯一標識符（如 Google ID）';
COMMENT ON COLUMN user_identities.provider_data IS '提供商的額外數據（JSONB 格式）';

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

-- 6. 啟用 Row Level Security（RLS）
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;

-- 7. 創建 user_identities 表的 RLS 策略

-- user_identities 表：用戶只能查看自己的身份
DROP POLICY IF EXISTS "Users can view own identities" ON user_identities;
CREATE POLICY "Users can view own identities" ON user_identities
  FOR SELECT
  USING (
    -- 匿名用戶：auth.uid() = provider_id
    auth.uid()::text = provider_id 
    OR 
    -- Google 用戶：auth.uid() 在 user_identities 中
    auth.uid()::text IN (
      SELECT provider_id FROM user_identities ui2 
      WHERE ui2.user_id = user_identities.user_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own identities" ON user_identities;
CREATE POLICY "Users can insert own identities" ON user_identities
  FOR INSERT
  WITH CHECK (true);  -- 允許創建新身份

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

COMMIT;

-- =====================================================
-- 遷移完成
-- =====================================================
-- 
-- 新表結構：
-- - users: UUID 主鍵，email 可為 NULL（匿名用戶）
-- - user_identities: 管理多種登入方式
--
-- 支持的登入方式：
-- - Google OAuth（學校學生）
-- - 匿名登入（訪客試用）
-- - 未來：Apple, 郵箱密碼 等
--
-- 跨模式統一：
-- - Google 用戶通過 email 統一
-- - 匿名用戶不需要跨模式
-- =====================================================

