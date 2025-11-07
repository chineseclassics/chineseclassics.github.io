-- =====================================================
-- 空山應用 Storage 設置說明
-- 003_storage_setup.sql
-- =====================================================

-- 注意：Storage bucket 需要在 Supabase Dashboard 中手動創建
-- 本文件提供 SQL 腳本用於設置 Storage 策略

-- =====================================================
-- Storage Bucket 設置步驟（在 Dashboard 中操作）
-- =====================================================

-- 1. 創建 bucket：sound-effects
--    - 訪問 Supabase Dashboard → Storage
--    - 點擊 "New bucket"
--    - 名稱：sound-effects
--    - 公開：否（需要認證）
--    - 文件大小限制：5MB（可調整）

-- =====================================================
-- Storage 策略（在 Dashboard 中設置）
-- =====================================================

-- 策略 1：所有用戶可讀 approved 音效
-- Policy name: sound-effects-read-approved
-- Operation: SELECT
-- Policy definition:
--   (bucket_id = 'sound-effects'::text) 
--   AND (
--     -- 系統預設音效（source = 'system'）
--     (storage.foldername(name))[1] = 'system'
--     OR
--     -- 用戶上傳但已審核通過的音效
--     EXISTS (
--       SELECT 1 FROM sound_effects 
--       WHERE file_url LIKE '%' || name 
--       AND status = 'approved'
--     )
--   )

-- 策略 2：用戶可讀自己上傳的音效
-- Policy name: sound-effects-read-own
-- Operation: SELECT
-- Policy definition:
--   (bucket_id = 'sound-effects'::text)
--   AND (
--     EXISTS (
--       SELECT 1 FROM sound_effects
--       WHERE file_url LIKE '%' || name
--       AND uploaded_by = auth.uid()
--     )
--   )

-- 策略 3：用戶可上傳音效
-- Policy name: sound-effects-upload-user
-- Operation: INSERT
-- Policy definition:
--   (bucket_id = 'sound-effects'::text)
--   AND (
--     -- 文件大小限制：5MB
--     (storage.raw_headers() -> 'content-length')::bigint < 5242880
--   )

-- 策略 4：用戶可更新自己上傳的音效（僅 private 狀態）
-- Policy name: sound-effects-update-own-private
-- Operation: UPDATE
-- Policy definition:
--   (bucket_id = 'sound-effects'::text)
--   AND (
--     EXISTS (
--       SELECT 1 FROM sound_effects
--       WHERE file_url LIKE '%' || name
--       AND uploaded_by = auth.uid()
--       AND status = 'private'
--     )
--   )

-- 策略 5：用戶可刪除自己上傳的音效（僅 private 狀態）
-- Policy name: sound-effects-delete-own-private
-- Operation: DELETE
-- Policy definition:
--   (bucket_id = 'sound-effects'::text)
--   AND (
--     EXISTS (
--       SELECT 1 FROM sound_effects
--       WHERE file_url LIKE '%' || name
--       AND uploaded_by = auth.uid()
--       AND status = 'private'
--     )
--   )

-- =====================================================
-- 文件路徑結構建議
-- =====================================================

-- sound-effects/
--   ├── system/              # 系統預設音效
--   │   ├── rain.mp3
--   │   ├── bird.mp3
--   │   └── ...
--   ├── user/                # 用戶上傳音效
--   │   ├── {user_id}/
--   │   │   ├── {sound_id}.mp3
--   │   │   └── ...
--   │   └── ...
--   └── recordings/          # 用戶錄音
--       ├── {user_id}/
--       │   ├── {sound_id}.webm
--       │   └── ...
--       └── ...

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. Storage 策略需要在 Dashboard 中手動設置，SQL 無法直接創建
-- 2. 文件上傳時，需要設置正確的文件路徑
-- 3. 刪除音效時，需要同時刪除 Storage 中的文件
-- 4. 建議使用 Supabase Storage API 管理文件上傳和刪除

