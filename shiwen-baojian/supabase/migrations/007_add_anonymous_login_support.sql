-- 时文宝鉴 - 添加匿名登录支持（测试用）
-- Migration: 007
-- Description: 支持匿名用户登录为学生，用于老师测试学生端功能

-- ======================
-- 1. 修改 users 表支持匿名用户
-- ======================

-- 添加 user_type 列（如果不存在）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'registered' 
CHECK (user_type IN ('registered', 'anonymous'));

-- email 改为可选（匿名用户没有 email）
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- 添加匿名用户标识
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.user_type IS '用户类型：registered（正式用户）或 anonymous（匿名用户）';
COMMENT ON COLUMN users.is_anonymous IS '是否为匿名用户（测试用）';

-- ======================
-- 2. 创建匿名用户辅助函数
-- ======================

-- 函数：为匿名登录创建用户记录
CREATE OR REPLACE FUNCTION create_anonymous_student()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  random_number INTEGER;
BEGIN
  -- 生成随机数字
  random_number := floor(random() * 10000)::INTEGER;
  
  -- 创建匿名学生用户
  INSERT INTO users (
    id,
    email,
    display_name,
    role,
    user_type,
    is_anonymous
  ) VALUES (
    auth.uid(),  -- 使用 Supabase Auth 生成的匿名 ID
    NULL,        -- 匿名用户没有 email
    '匿名学生' || random_number,
    'student',   -- 自动设为学生角色
    'anonymous',
    true
  )
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

COMMENT ON FUNCTION create_anonymous_student IS '为匿名登录创建学生用户记录（测试用）';

-- ======================
-- 3. 更新 RLS 策略支持匿名用户
-- ======================

-- Users 表：匿名用户可以查看自己
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (
    auth.uid()::text = id::text
    OR (is_anonymous = true AND auth.uid()::text = id::text)
  );

-- Users 表：匿名用户可以更新自己的信息
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (
    auth.uid()::text = id::text
    OR (is_anonymous = true AND auth.uid()::text = id::text)
  );

-- 匿名用户可以创建自己的用户记录
CREATE POLICY "Anonymous users can create own profile"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid()::text = id::text
    AND is_anonymous = true
  );

-- ======================
-- 4. 添加测试班级和任务（可选）
-- ======================

-- 注释：可以手动在 Dashboard 创建测试班级和任务
-- 或者取消下面的注释来自动创建

/*
-- 创建测试班级（需要先有老师用户）
INSERT INTO classes (id, teacher_id, class_name, description)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),  -- 第一个老师
  '测试班级',
  '用于测试匿名学生功能'
) ON CONFLICT DO NOTHING;

-- 将匿名用户加入测试班级（需要手动添加）
*/

-- ======================
-- 5. 使用说明
-- ======================

COMMENT ON TABLE users IS '
用户表 - 支持三种登录方式:
1. Google OAuth (正式老师/学生) - role 基于邮箱自动识别
2. 匿名登录 (测试用学生) - 自动设为 student 角色
3. 平台模式 (未来) - 接收太虚幻境传来的用户信息

测试流程:
1. 老师用 Google OAuth 登录 (*@isf.edu.hk)
2. 创建班级和任务
3. 点击"匿名登录测试"按钮，以学生身份登录
4. 测试学生端功能
5. 退出匿名，回到老师身份
';

