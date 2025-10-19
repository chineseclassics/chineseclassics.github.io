-- 最佳實踐：使用 RPC 函數完全替代 RLS（避免性能和遞歸問題）
-- Migration: 020
-- Date: 2025-10-19

-- ======================
-- 1. 刪除之前的策略
-- ======================
DROP POLICY IF EXISTS "Teachers can view students by direct ID" ON users;

-- ======================
-- 2. 更完整的 RPC 函數：獲取班級成員（包含完整信息）
-- ======================
CREATE OR REPLACE FUNCTION get_class_members_with_details(target_class_id UUID)
RETURNS TABLE (
  member_id UUID,
  student_id UUID,
  email TEXT,
  display_name TEXT,
  status TEXT,
  last_login_at TIMESTAMPTZ,
  role TEXT,
  added_at TIMESTAMPTZ,
  is_pending BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- 返回已激活的學生（來自 class_members）
  RETURN QUERY
  SELECT 
    cm.id as member_id,
    u.id as student_id,
    u.email,
    u.display_name,
    u.status,
    u.last_login_at,
    u.role,
    cm.added_at,
    false as is_pending
  FROM class_members cm
  JOIN users u ON u.id = cm.student_id
  WHERE cm.class_id = target_class_id
  
  UNION ALL
  
  -- 返回待激活的學生（來自 pending_students）
  SELECT 
    ps.id as member_id,
    NULL::UUID as student_id,
    ps.email,
    '待激活-' || split_part(ps.email, '@', 1) as display_name,
    'pending' as status,
    NULL::TIMESTAMPTZ as last_login_at,
    'student' as role,
    ps.added_at,
    true as is_pending
  FROM pending_students ps
  WHERE ps.class_id = target_class_id;
END;
$$;

COMMENT ON FUNCTION get_class_members_with_details IS '
獲取班級成員完整信息（包括已激活和待激活學生）

參數:
- target_class_id: 班級 ID

返回:
- 該班級所有學生的完整信息（已激活 + 待激活）

安全保證:
- 只有該班級的老師可以調用
- 使用 SECURITY DEFINER 繞過 RLS
- 函數內部驗證調用者權限

使用場景:
- 老師端學生列表頁面
- 替代直接查詢 class_members + users
- 避免 RLS 遞歸和性能問題
';

-- ======================
-- 3. 保留最小 RLS 策略（用於老師查看論文等場景）
-- ======================

-- 這個策略只用於特定場景（如查看論文時需要獲取學生姓名）
-- 使用更安全的寫法：先獲取允許的 student_id 列表，再用 ANY 比較
CREATE POLICY "Teachers can view class students minimal"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- 允許查看自己
    auth.uid() = id
    OR
    -- 允許老師查看班級學生（使用 ANY 避免遞歸）
    (
      role = 'student' 
      AND id = ANY(
        ARRAY(
          SELECT cm.student_id 
          FROM class_members cm
          WHERE cm.class_id = ANY(
            ARRAY(SELECT c.id FROM classes c WHERE c.teacher_id = auth.uid())
          )
        )
      )
    )
  );

COMMENT ON POLICY "Teachers can view class students minimal" ON users IS '
最小權限策略：用戶查看自己 + 老師查看班級學生

技術要點:
- 使用 ANY(ARRAY(...)) 而非 IN，更安全
- 嵌套的 ARRAY 子查詢避免遞歸
- 限制為 authenticated 用戶
';

