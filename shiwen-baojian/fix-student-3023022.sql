-- 手動修復學生 3023022@student.isf.edu.hk 的激活問題
-- 請在 Supabase Dashboard → SQL Editor 中執行

-- 方法 1：使用 RPC 函數手動激活（推薦）
-- 首先查找學生的 auth_id
DO $$
DECLARE
  student_auth_id UUID;
  activation_result RECORD;
BEGIN
  -- 查找學生的 auth_id
  SELECT id INTO student_auth_id
  FROM users
  WHERE email = '3023022@student.isf.edu.hk';
  
  IF student_auth_id IS NULL THEN
    RAISE NOTICE '學生用戶記錄不存在，學生需要先登入';
  ELSE
    RAISE NOTICE '找到學生 ID: %', student_auth_id;
    
    -- 調用激活函數
    SELECT * INTO activation_result
    FROM activate_pending_student('3023022@student.isf.edu.hk', student_auth_id);
    
    RAISE NOTICE '激活結果: activated=%, class_ids=%, message=%', 
      activation_result.activated, 
      activation_result.class_ids, 
      activation_result.display_name;
  END IF;
END $$;

-- 方法 2：手動移動記錄（如果方法 1 失敗）
/*
-- 只有在方法 1 失敗時才使用這個方法

-- 步驟 1：查找學生 ID
SELECT id, email, display_name, status
FROM users
WHERE email = '3023022@student.isf.edu.hk';

-- 步驟 2：查找待激活記錄
SELECT ps.*, c.class_name
FROM pending_students ps
JOIN classes c ON c.id = ps.class_id
WHERE ps.email = '3023022@student.isf.edu.hk';

-- 步驟 3：手動添加到 class_members（替換下面的 UUID）
INSERT INTO class_members (class_id, student_id, added_by)
SELECT 
  ps.class_id,
  '學生的auth_id' as student_id, -- 從步驟 1 獲取
  ps.added_by
FROM pending_students ps
WHERE ps.email = '3023022@student.isf.edu.hk'
ON CONFLICT (class_id, student_id) DO NOTHING;

-- 步驟 4：刪除 pending 記錄
DELETE FROM pending_students
WHERE email = '3023022@student.isf.edu.hk';
*/

-- 驗證：檢查學生是否已加入班級
SELECT 
  cm.id,
  c.class_name,
  u.email,
  u.display_name,
  cm.added_at
FROM class_members cm
JOIN classes c ON c.id = cm.class_id
JOIN users u ON u.id = cm.student_id
WHERE u.email = '3023022@student.isf.edu.hk';

