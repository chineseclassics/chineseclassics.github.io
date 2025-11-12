-- =====================================================
-- 添加地點信息到 recordings 表
-- 012_add_location_to_recordings.sql
-- =====================================================

-- 在 recordings 表中新增 location_name 字段
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- 添加註釋說明
COMMENT ON COLUMN recordings.location_name IS '錄音地點名稱（如「陽明山」、「阿里山」等），由用戶通過地理位置 API 獲取';

-- =====================================================
-- 結束
-- =====================================================

