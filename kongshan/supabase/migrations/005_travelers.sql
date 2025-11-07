-- =====================================================
-- 空山旅人紀錄
-- 005_travelers.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS travelers (
  user_id UUID PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_travelers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS travelers_set_last_seen ON travelers;
CREATE TRIGGER travelers_set_last_seen
  BEFORE UPDATE ON travelers
  FOR EACH ROW
  EXECUTE FUNCTION update_travelers_timestamp();

ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "旅人清單-公開閱讀"
ON travelers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "旅人清單-自我新增"
ON travelers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "旅人清單-自我更新"
ON travelers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

