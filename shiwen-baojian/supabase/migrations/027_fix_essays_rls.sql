-- 修復 essays 表的 RLS 策略
-- Migration: 027
-- Date: 2025-10-22
-- Description: 修復學生無法更新論文狀態的問題

-- ======================
-- 1. 清理所有現有策略
-- ======================

-- 刪除所有可能衝突的策略
DROP POLICY IF EXISTS "Users can manage own essays" ON essays;
DROP POLICY IF EXISTS "Students can manage own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view all essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view class essays" ON essays;

-- ======================
-- 2. 重建簡化的策略
-- ======================

-- 學生策略：允許學生管理自己的論文
CREATE POLICY "Students can manage own essays"
  ON essays FOR ALL
  USING (student_id = auth.uid());

-- 老師策略：允許老師查看所有論文
CREATE POLICY "Teachers can view all essays"
  ON essays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'teacher'
    )
  );

-- ======================
-- 3. 添加註釋
-- ======================

COMMENT ON POLICY "Students can manage own essays" ON essays IS '
學生可以管理自己的論文（創建、讀取、更新、刪除）
條件：student_id = auth.uid()
';

COMMENT ON POLICY "Teachers can view all essays" ON essays IS '
老師可以查看所有論文
條件：用戶角色為 teacher
';

-- ======================
-- 4. 驗證策略
-- ======================

-- 檢查策略是否正確創建
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'essays'
ORDER BY policyname;
