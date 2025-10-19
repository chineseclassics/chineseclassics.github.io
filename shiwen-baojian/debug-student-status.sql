-- 診斷學生 3023022@student.isf.edu.hk 的狀態
-- 請在 Supabase Dashboard → SQL Editor 中執行這些查詢

-- 1. 檢查 users 表中是否有這個學生
SELECT 
  id, 
  email, 
  display_name, 
  role, 
  status, 
  last_login_at,
  created_at
FROM users 
WHERE email = '3023022@student.isf.edu.hk';

-- 2. 檢查 pending_students 表中是否還有這個學生
SELECT 
  id,
  class_id,
  email,
  added_by,
  added_at
FROM pending_students 
WHERE email = '3023022@student.isf.edu.hk';

-- 3. 檢查 class_members 表中是否有這個學生
SELECT 
  cm.id,
  cm.class_id,
  cm.student_id,
  cm.added_at,
  c.class_name,
  u.email,
  u.display_name
FROM class_members cm
JOIN classes c ON c.id = cm.class_id
JOIN users u ON u.id = cm.student_id
WHERE u.email = '3023022@student.isf.edu.hk';

-- 4. 查看所有 pending_students（檢查是否有其他問題）
SELECT 
  ps.id,
  ps.email,
  ps.added_at,
  c.class_name
FROM pending_students ps
JOIN classes c ON c.id = ps.class_id
ORDER BY ps.added_at DESC;

-- 5. 查看這個班級的所有成員（包括已激活的）
SELECT 
  cm.id,
  cm.student_id,
  u.email,
  u.display_name,
  u.status,
  u.last_login_at,
  cm.added_at
FROM class_members cm
JOIN users u ON u.id = cm.student_id
ORDER BY cm.added_at DESC;

