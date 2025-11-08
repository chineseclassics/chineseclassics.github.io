-- =====================================================
-- 更新 recordings 表狀態字段
-- 010_update_recordings_status.sql
-- =====================================================

-- 將 status 字段的默認值從 'published' 改為 'pending'
-- 並將現有的 'published' 狀態更新為 'approved'
ALTER TABLE recordings
ALTER COLUMN status SET DEFAULT 'pending';

-- 更新現有記錄：將 'published' 改為 'approved'
UPDATE recordings
SET status = 'approved'
WHERE status = 'published';

-- 添加 CHECK 約束（如果還沒有）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'recordings_status_check'
  ) THEN
    ALTER TABLE recordings
    ADD CONSTRAINT recordings_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 更新 RLS 策略：將 'published' 改為 'approved'
DROP POLICY IF EXISTS "錄音公開閱讀與擁有者存取" ON recordings;
CREATE POLICY "錄音公開閱讀與擁有者存取"
ON recordings FOR SELECT
USING (
  status = 'approved' OR auth.uid() = owner_id
);

-- =====================================================
-- 結束
-- =====================================================

