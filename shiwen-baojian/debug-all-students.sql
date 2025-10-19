-- 完整診斷所有學生的 SQL 腳本
-- 請在 Supabase Dashboard → SQL Editor 中執行

-- ========================================
-- 1. 查看所有 class_members（應該有 9 個）
-- ========================================
SELECT 
  cm.id as member_id,
  cm.class_id,
  cm.student_id,
  cm.added_at,
  u.email,
  u.display_name,
  u.status,
  u.last_login_at,
  c.class_name
FROM class_members cm
LEFT JOIN users u ON u.id = cm.student_id
LEFT JOIN classes c ON c.id = cm.class_id
ORDER BY cm.added_at DESC;

-- ========================================
-- 2. 查看所有 pending_students（應該是 0 個）
-- ========================================
SELECT 
  ps.id,
  ps.class_id,
  ps.email,
  ps.added_at,
  c.class_name
FROM pending_students ps
LEFT JOIN classes c ON c.id = ps.class_id
ORDER BY ps.added_at DESC;

-- ========================================
-- 3. 檢查是否有 student_id 為 null 或不存在的記錄
-- ========================================
SELECT 
  cm.id as member_id,
  cm.student_id,
  cm.added_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ 用戶不存在'
    ELSE '✅ 用戶存在'
  END as user_exists
FROM class_members cm
LEFT JOIN users u ON u.id = cm.student_id
WHERE u.id IS NULL;

-- ========================================
-- 4. 統計數據
-- ========================================
SELECT 
  '總學生數（class_members）' as metric,
  COUNT(*) as count
FROM class_members
UNION ALL
SELECT 
  '待激活學生數（pending_students）' as metric,
  COUNT(*) as count
FROM pending_students
UNION ALL
SELECT 
  '學生數（有效的 users）' as metric,
  COUNT(*) as count
FROM class_members cm
JOIN users u ON u.id = cm.student_id;

-- ========================================
-- 5. 特別檢查 3023022
-- ========================================
SELECT 
  '3023022 在 class_members' as check_point,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM class_members cm
      JOIN users u ON u.id = cm.student_id
      WHERE u.email = '3023022@student.isf.edu.hk'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as status
UNION ALL
SELECT 
  '3023022 在 pending_students' as check_point,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pending_students
      WHERE email = '3023022@student.isf.edu.hk'
    ) THEN '⚠️ 還在待激活（異常）'
    ELSE '✅ 已激活（正常）'
  END as status
UNION ALL
SELECT 
  '3023022 在 users' as check_point,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE email = '3023022@student.isf.edu.hk'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as status;

