-- 时文宝鉴 - 允许用户自行插入记录
-- Migration: 011
-- Description: 允许用户在 users 表中创建自己的记录（用于匿名登录）

-- ======================
-- 1. 添加 users 表的 INSERT 策略
-- ======================

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- 用户可以查看自己的资料
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- ⭐ 关键：用户可以创建自己的记录
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid()::text = id::text
  );

-- 用户可以更新自己的资料
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- ======================
-- 2. 添加注释
-- ======================

COMMENT ON POLICY "Users can insert own profile" ON users 
  IS '允许用户在首次登录时创建自己的记录（包括匿名用户）';

