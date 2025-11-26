-- 句豆 - 修復練習記錄的用戶隱私
-- Migration: 005
-- Description: 添加 user_id 欄位，確保用戶只能查看自己的練習記錄

-- ======================
-- 1. 添加 user_id 欄位
-- ======================

ALTER TABLE practice_records 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_practice_records_user_id ON practice_records(user_id);

-- 根據 username 回填 user_id（匹配 users 表中的 email 前綴）
UPDATE practice_records pr
SET user_id = u.id
FROM users u
WHERE pr.user_id IS NULL
AND pr.username IS NOT NULL
AND pr.username != 'guest'
AND u.email LIKE pr.username || '@%';

-- ======================
-- 2. 更新 RLS 策略
-- ======================

-- 刪除舊的 RLS 策略
DROP POLICY IF EXISTS "practice_records select" ON practice_records;
DROP POLICY IF EXISTS "practice_records insert" ON practice_records;

-- 用戶只能查看自己的記錄
CREATE POLICY "Users can view own practice records"
ON practice_records FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 用戶可以插入自己的記錄
CREATE POLICY "Users can insert own practice records"
ON practice_records FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 允許匿名插入（訪客練習）
CREATE POLICY "Anonymous can insert practice records"
ON practice_records FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

