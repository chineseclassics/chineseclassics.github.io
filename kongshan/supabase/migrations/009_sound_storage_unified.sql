-- =====================================================
-- 空山音效 Storage 統一管理配置
-- 009_sound_storage_unified.sql
-- =====================================================

-- 更新 bucket 為公開（但通過 RLS 策略控制實際訪問權限）
UPDATE storage.buckets
SET public = TRUE
WHERE id = 'kongshan_recordings';

-- 如果 bucket 不存在，創建它
INSERT INTO storage.buckets (id, name, public)
SELECT 'kongshan_recordings', 'kongshan_recordings', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'kongshan_recordings'
);

-- =====================================================
-- Storage RLS 策略：統一音效管理
-- 路徑結構：
--   pending/{user_id}/{filename}  - 待審核錄音（私有）
--   approved/{filename}            - 審核通過的錄音（公開）
--   system/{filename}              - 系統預設音效（公開）
-- =====================================================

-- 刪除舊的策略（如果存在）
DROP POLICY IF EXISTS "錄音僅限擁有者上傳" ON storage.objects;
DROP POLICY IF EXISTS "錄音修改僅限擁有者" ON storage.objects;
DROP POLICY IF EXISTS "錄音刪除僅限擁有者" ON storage.objects;
DROP POLICY IF EXISTS "所有認證用戶可讀錄音" ON storage.objects;

-- =====================================================
-- 策略 1：pending/ 路徑 - 僅用戶本人和管理員可讀
-- =====================================================
DROP POLICY IF EXISTS "pending-路徑僅用戶和管理員可讀" ON storage.objects;
CREATE POLICY "pending-路徑僅用戶和管理員可讀"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kongshan_recordings'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    -- 用戶可讀自己的文件
    auth.uid()::TEXT = COALESCE((storage.foldername(name))[2], '')
    OR
    -- 管理員可讀所有 pending 文件
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  )
);

-- =====================================================
-- 策略 2：approved/ 和 system/ 路徑 - 所有人可讀（公開）
-- =====================================================
DROP POLICY IF EXISTS "approved-system-路徑公開可讀" ON storage.objects;
CREATE POLICY "approved-system-路徑公開可讀"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kongshan_recordings'
  AND (
    (storage.foldername(name))[1] = 'approved'
    OR
    (storage.foldername(name))[1] = 'system'
  )
);

-- =====================================================
-- 策略 3：pending/ 路徑 - 僅用戶可上傳
-- =====================================================
DROP POLICY IF EXISTS "pending-路徑僅用戶可上傳" ON storage.objects;
CREATE POLICY "pending-路徑僅用戶可上傳"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND (storage.foldername(name))[1] = 'pending'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[2], '')
);

-- =====================================================
-- 策略 4：approved/ 和 system/ 路徑 - 僅管理員可上傳
-- =====================================================
DROP POLICY IF EXISTS "approved-system-路徑僅管理員可上傳" ON storage.objects;
CREATE POLICY "approved-system-路徑僅管理員可上傳"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND (
    (storage.foldername(name))[1] = 'approved'
    OR
    (storage.foldername(name))[1] = 'system'
  )
  AND EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 策略 5：pending/ 路徑 - 僅用戶可更新/刪除
-- =====================================================
DROP POLICY IF EXISTS "pending-路徑僅用戶可更新" ON storage.objects;
CREATE POLICY "pending-路徑僅用戶可更新"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kongshan_recordings'
  AND (storage.foldername(name))[1] = 'pending'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[2], '')
)
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND (storage.foldername(name))[1] = 'pending'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[2], '')
);

DROP POLICY IF EXISTS "pending-路徑僅用戶和管理員可刪除" ON storage.objects;
CREATE POLICY "pending-路徑僅用戶和管理員可刪除"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kongshan_recordings'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    auth.uid()::TEXT = COALESCE((storage.foldername(name))[2], '')
    OR
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  )
);

-- =====================================================
-- 策略 6：approved/ 和 system/ 路徑 - 僅管理員可更新/刪除
-- =====================================================
DROP POLICY IF EXISTS "approved-system-路徑僅管理員可更新" ON storage.objects;
CREATE POLICY "approved-system-路徑僅管理員可更新"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kongshan_recordings'
  AND (
    (storage.foldername(name))[1] = 'approved'
    OR
    (storage.foldername(name))[1] = 'system'
  )
  AND EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND (
    (storage.foldername(name))[1] = 'approved'
    OR
    (storage.foldername(name))[1] = 'system'
  )
  AND EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "approved-system-路徑僅管理員可刪除" ON storage.objects;
CREATE POLICY "approved-system-路徑僅管理員可刪除"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kongshan_recordings'
  AND (
    (storage.foldername(name))[1] = 'approved'
    OR
    (storage.foldername(name))[1] = 'system'
  )
  AND EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 結束
-- =====================================================

