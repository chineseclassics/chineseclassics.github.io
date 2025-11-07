-- =====================================================
-- 空山錄音上傳配置
-- 004_recording_uploads.sql
-- =====================================================

-- 建立錄音專用 Storage bucket（如已存在請略過）
INSERT INTO storage.buckets (id, name, public)
SELECT 'kongshan_recordings', 'kongshan_recordings', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'kongshan_recordings'
);

-- =====================================================
-- Storage RLS 策略：錄音檔案
-- =====================================================
CREATE POLICY IF NOT EXISTS "錄音僅限擁有者上傳"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[1], '')
);

CREATE POLICY IF NOT EXISTS "錄音修改僅限擁有者"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kongshan_recordings'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[1], '')
)
WITH CHECK (
  bucket_id = 'kongshan_recordings'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[1], '')
);

CREATE POLICY IF NOT EXISTS "錄音刪除僅限擁有者"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kongshan_recordings'
  AND auth.uid()::TEXT = COALESCE((storage.foldername(name))[1], '')
);

CREATE POLICY IF NOT EXISTS "所有認證用戶可讀錄音"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kongshan_recordings'
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- recordings 資料表
-- =====================================================
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_owner ON recordings(owner_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

-- 自動更新 updated_at
CREATE TRIGGER IF NOT EXISTS update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 啟用 RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY IF NOT EXISTS "錄音公開閱讀與擁有者存取"
ON recordings FOR SELECT
USING (
  status = 'published' OR auth.uid() = owner_id
);

CREATE POLICY IF NOT EXISTS "錄音新增僅限擁有者"
ON recordings FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "錄音更新僅限擁有者"
ON recordings FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "錄音刪除僅限擁有者"
ON recordings FOR DELETE
USING (auth.uid() = owner_id);

-- =====================================================
-- 結束
-- =====================================================

