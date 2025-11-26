-- 句豆 - 超級管理員和用戶管理功能
-- Migration: 003
-- Description: 添加超級管理員角色和用戶管理函數

-- ======================
-- 1. 添加超級管理員角色
-- ======================

-- 添加 is_super_admin 欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 註釋說明
COMMENT ON COLUMN users.is_super_admin IS '是否為超級管理員，可以管理用戶和任命其他管理員';

-- 將 ylzhang@isf.edu.hk 設為超級管理員
UPDATE users 
SET is_super_admin = true, is_admin = true 
WHERE email = 'ylzhang@isf.edu.hk';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- ======================
-- 2. 輔助函數
-- ======================

-- 檢查當前用戶是否為超級管理員
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

-- 檢查當前用戶是否為管理員（包括超級管理員）
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin OR is_super_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

-- 授予函數執行權限
GRANT EXECUTE ON FUNCTION is_current_user_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- ======================
-- 3. 用戶管理函數
-- ======================

-- 任命用戶為管理員（僅超級管理員可用）
CREATE OR REPLACE FUNCTION set_user_admin(target_user_id UUID, admin_status BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_is_super BOOLEAN;
  target_user RECORD;
BEGIN
  -- 檢查調用者是否為超級管理員
  SELECT is_super_admin INTO caller_is_super 
  FROM users WHERE id = auth.uid();
  
  IF NOT COALESCE(caller_is_super, false) THEN
    RETURN json_build_object('success', false, 'error', '只有超級管理員可以管理用戶權限');
  END IF;
  
  -- 獲取目標用戶信息
  SELECT * INTO target_user FROM users WHERE id = target_user_id;
  
  IF target_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', '找不到該用戶');
  END IF;
  
  -- 不能修改超級管理員的權限
  IF target_user.is_super_admin THEN
    RETURN json_build_object('success', false, 'error', '不能修改超級管理員的權限');
  END IF;
  
  -- 更新用戶管理員狀態
  UPDATE users SET is_admin = admin_status WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', CASE WHEN admin_status THEN '已任命為管理員' ELSE '已撤銷管理員權限' END,
    'user_id', target_user_id,
    'is_admin', admin_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_admin(UUID, BOOLEAN) TO authenticated;

-- 獲取所有用戶列表（僅超級管理員可用）
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  is_admin BOOLEAN,
  is_super_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 檢查是否為超級管理員
  IF NOT is_current_user_super_admin() THEN
    RAISE EXCEPTION '只有超級管理員可以查看用戶列表';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.display_name,
    u.role,
    COALESCE(u.is_admin, false) as is_admin,
    COALESCE(u.is_super_admin, false) as is_super_admin,
    u.created_at,
    u.last_login
  FROM users u
  ORDER BY u.is_super_admin DESC, u.is_admin DESC, u.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- ======================
-- 4. 修復 practice_texts 表的 RLS 策略
-- ======================

-- 刪除不安全的策略（允許任何人訪問所有文章）
DROP POLICY IF EXISTS "Allow anon manage practice texts" ON practice_texts;
DROP POLICY IF EXISTS "Allow anon read practice texts" ON practice_texts;

-- 添加超級管理員可以查看所有文章的策略（用於管理目的）
CREATE POLICY "Super admins can view all texts"
ON practice_texts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_super_admin = true
  )
);

