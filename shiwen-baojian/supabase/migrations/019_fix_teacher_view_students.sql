-- 修復：允許老師查看班級學生信息（使用 RPC 函數避免 RLS 遞歸）
-- Migration: 019
-- Date: 2025-10-19

-- ======================
-- 1. 先刪除有問題的策略（如果存在）
-- ======================
DROP POLICY IF EXISTS "Teachers can view class students" ON users;

-- ======================
-- 2. 創建 RPC 函數：獲取班級學生信息（繞過 RLS）
-- ======================
CREATE OR REPLACE FUNCTION get_class_students(target_class_id UUID)
RETURNS TABLE (
  student_id UUID,
  email TEXT,
  display_name TEXT,
  status TEXT,
  last_login_at TIMESTAMPTZ,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- 使用函數所有者的權限，繞過 RLS
AS $$
BEGIN
  -- 檢查調用者是否是該班級的老師
  IF NOT EXISTS (
    SELECT 1 FROM classes
    WHERE id = target_class_id
    AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '無權訪問此班級';
  END IF;
  
  -- 返回班級學生信息
  RETURN QUERY
  SELECT 
    u.id as student_id,
    u.email,
    u.display_name,
    u.status,
    u.last_login_at,
    u.role
  FROM class_members cm
  JOIN users u ON u.id = cm.student_id
  WHERE cm.class_id = target_class_id;
END;
$$;

COMMENT ON FUNCTION get_class_students IS '
獲取班級學生信息（老師專用，繞過 RLS 遞歸問題）

參數:
- target_class_id: 班級 ID

返回:
- 該班級所有學生的基本信息

安全保證:
- 只有該班級的老師可以調用
- 使用 SECURITY DEFINER 繞過 RLS
- 函數內部驗證調用者權限
';

-- ======================
-- 3. 簡化的 RLS 策略（不造成遞歸）
-- ======================

-- 允許老師通過直接 ID 查看學生（不使用 JOIN，避免遞歸）
-- 這個策略用於簡單查詢，複雜查詢使用 RPC 函數
CREATE POLICY "Teachers can view students by direct ID"
  ON users FOR SELECT
  USING (
    role = 'student'
    AND id IN (
      SELECT student_id 
      FROM class_members 
      WHERE class_id IN (
        SELECT id FROM classes WHERE teacher_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "Teachers can view students by direct ID" ON users IS '
允許老師查看自己班級學生的信息（簡化版，避免遞歸）

限制：
- 只能查看角色為 student 的用戶
- 只能查看自己班級的學生
- 使用子查詢而非 JOIN，避免遞歸問題
';

