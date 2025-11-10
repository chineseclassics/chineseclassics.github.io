-- =====================================================
-- 清理重複的聲色意境數據
-- 011_cleanup_duplicate_atmospheres.sql
-- =====================================================
-- 
-- 目的：處理同一用戶在同一詩句下發布的多個意境
-- 策略：
--   1. 優先保留已發布的（approved）意境
--   2. 如果有多個已發布的，保留最新的（按 created_at DESC）
--   3. 如果沒有已發布的，保留最新的（按 created_at DESC）
--   4. 刪除其他的
--
-- 注意：此遷移會刪除數據，執行前請先備份數據庫
-- =====================================================

-- 創建臨時表，標記要保留的意境
CREATE TEMP TABLE atmospheres_to_keep AS
WITH ranked_atmospheres AS (
  SELECT 
    id,
    poem_id,
    created_by,
    status,
    created_at,
    -- 優先級：approved > 其他狀態，相同狀態按時間排序
    ROW_NUMBER() OVER (
      PARTITION BY poem_id, created_by 
      ORDER BY 
        CASE 
          WHEN status = 'approved' THEN 1
          WHEN status = 'pending' THEN 2
          WHEN status = 'draft' THEN 3
          WHEN status = 'rejected' THEN 4
          ELSE 5
        END,
        created_at DESC
    ) AS rn
  FROM poem_atmospheres
  WHERE created_by IS NOT NULL  -- 只處理用戶創建的意境，不處理系統預設
)
SELECT id
FROM ranked_atmospheres
WHERE rn = 1;

-- 創建索引以加速刪除操作
CREATE INDEX IF NOT EXISTS idx_temp_atmospheres_to_keep ON atmospheres_to_keep(id);

-- 刪除不在保留列表中的意境
-- 注意：由於外鍵約束，相關的 atmosphere_likes 和 atmosphere_sounds 會自動刪除（ON DELETE CASCADE）
DELETE FROM poem_atmospheres
WHERE created_by IS NOT NULL
  AND id NOT IN (SELECT id FROM atmospheres_to_keep);

-- 清理臨時表
DROP TABLE IF EXISTS atmospheres_to_keep;

-- 輸出清理結果（需要在 Supabase Dashboard 的 SQL Editor 中查看）
-- SELECT 
--   COUNT(*) FILTER (WHERE created_by IS NOT NULL) AS total_user_atmospheres,
--   COUNT(DISTINCT (poem_id, created_by)) AS unique_user_poem_combinations
-- FROM poem_atmospheres;

