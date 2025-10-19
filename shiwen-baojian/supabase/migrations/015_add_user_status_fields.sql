-- 时文宝鉴 - 添加用户状态字段
-- Migration: 015
-- Description: 为 users 表添加 status 和 last_login_at 字段

-- ======================
-- 1. 添加 status 字段
-- ======================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'active', 'inactive'));

COMMENT ON COLUMN users.status IS '用户状态：pending（未登录）、active（已登录）、inactive（停用）';

-- ======================
-- 2. 重命名 last_login 为 last_login_at（与 Supabase 惯例一致）
-- ======================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users RENAME COLUMN last_login TO last_login_at;
  END IF;
END $$;

-- ======================
-- 3. 更新现有用户的 status
-- ======================
-- 将所有现有用户标记为 active（假设他们已经登录过）
UPDATE users
SET status = 'active'
WHERE status = 'pending' AND last_login_at IS NOT NULL;

-- ======================
-- 4. 说明
-- ======================
COMMENT ON TABLE users IS '
用户表 - 支持老师和学生
字段说明：
- status: pending（未登录）、active（已登录）、inactive（停用）
- last_login_at: 最后登录时间（用于计算活跃度）
- role: teacher 或 student（基于邮箱自动识别）
';

