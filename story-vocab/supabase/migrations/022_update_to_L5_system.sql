-- =====================================================
-- 遷移到 L1-L5 難度體系
-- 創建日期：2025-10-15
-- 目的：從 L1-L6 改為 L1-L5，對應 5 個年級階段
-- =====================================================

BEGIN;

-- ========================================
-- 1. 添加 confidence 字段到 user_profiles
-- ========================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'medium';

COMMENT ON COLUMN user_profiles.confidence IS '評估信心度：low（前3次遊戲）、medium（4-10次）、high（10+次）';

-- ========================================
-- 2. 遷移 user_profiles：L6 → L5
-- ========================================

-- 將所有 L6 的 baseline_level 轉為 L5
UPDATE user_profiles
SET baseline_level = 5.0
WHERE baseline_level > 5.0;

-- 將所有 L6 的 current_level 轉為 L5
UPDATE user_profiles
SET current_level = 5.0
WHERE current_level > 5.0;

-- ========================================
-- 3. 遷移 game_rounds：調整 difficulty
-- ========================================

-- 更新推薦詞語中的難度（JSON 數組）
UPDATE game_rounds
SET recommended_words = (
  SELECT jsonb_agg(
    CASE 
      WHEN (word->>'difficulty')::int > 5 
      THEN jsonb_set(word, '{difficulty}', '5'::jsonb)
      ELSE word
    END
  )
  FROM jsonb_array_elements(recommended_words) AS word
)
WHERE recommended_words IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(recommended_words) AS word
    WHERE (word->>'difficulty')::int > 5
  );

-- 更新 selected_difficulty
UPDATE game_rounds
SET selected_difficulty = 5
WHERE selected_difficulty > 5;

-- ========================================
-- 4. 更新 grade_configs（如果存在）
-- ========================================

-- 檢查並更新年級配置（L1-L5 體系）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_configs') THEN
    -- 更新配置以反映新的 L1-L5 體系
    UPDATE grade_configs
    SET 
      difficulty_min = CASE
        WHEN grade <= 3 THEN 1.0
        WHEN grade <= 6 THEN 2.0
        WHEN grade <= 9 THEN 3.0
        WHEN grade <= 12 THEN 4.0
        ELSE 5.0
      END,
      difficulty_max = CASE
        WHEN grade <= 3 THEN 2.0
        WHEN grade <= 6 THEN 3.0
        WHEN grade <= 9 THEN 4.0
        WHEN grade <= 12 THEN 5.0
        ELSE 5.0
      END
    WHERE difficulty_max > 5.0;
    
    RAISE NOTICE '✅ grade_configs 已更新為 L1-L5 體系';
  END IF;
END $$;

-- ========================================
-- 5. 統計和驗證
-- ========================================

DO $$
DECLARE
  affected_profiles INT;
  affected_rounds INT;
  max_baseline DECIMAL;
  max_current DECIMAL;
BEGIN
  -- 統計受影響的用戶
  SELECT COUNT(*) INTO affected_profiles
  FROM user_profiles
  WHERE baseline_level = 5.0 OR current_level = 5.0;
  
  -- 統計受影響的遊戲輪次
  SELECT COUNT(*) INTO affected_rounds
  FROM game_rounds
  WHERE selected_difficulty = 5;
  
  -- 檢查最大難度
  SELECT MAX(baseline_level), MAX(current_level) 
  INTO max_baseline, max_current
  FROM user_profiles;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 遷移到 L1-L5 體系完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '統計信息：';
  RAISE NOTICE '  - 受影響用戶數：%', affected_profiles;
  RAISE NOTICE '  - 受影響遊戲輪次：%', affected_rounds;
  RAISE NOTICE '  - 最大 baseline_level：%', max_baseline;
  RAISE NOTICE '  - 最大 current_level：%', max_current;
  RAISE NOTICE '';
  RAISE NOTICE '新增字段：';
  RAISE NOTICE '  - user_profiles.confidence（評估信心度）';
  RAISE NOTICE '';
  RAISE NOTICE '變更：';
  RAISE NOTICE '  - L6 → L5';
  RAISE NOTICE '  - 年級映射更新（1-3→L1, 4-6→L2, 7-9→L3, 10-12→L4, 13+→L5）';
END $$;

COMMIT;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 本遷移完成了以下工作：
-- 
-- 1. 添加 confidence 字段
--    - 用於記錄評估的信心度
--    - low：前3次遊戲（探索期）
--    - medium：4-10次遊戲
--    - high：10+次遊戲
-- 
-- 2. 遷移難度數據
--    - 所有 L6 數據轉為 L5
--    - user_profiles: baseline_level, current_level
--    - game_rounds: selected_difficulty, recommended_words
-- 
-- 3. 更新年級配置
--    - 反映新的 L1-L5 體系
--    - 1-3年級 → L1
--    - 4-6年級 → L2
--    - 7-9年級 → L3
--    - 10-12年級 → L4
--    - 13年級+ → L5
-- 
-- 注意事項：
-- - 遷移不可逆（L6 數據已轉為 L5）
-- - 建議在執行前備份數據庫
-- - 前端代碼需要同步更新
-- 
-- 後續步驟：
-- 1. 更新前端難度顯示（L1-L5）
-- 2. 更新 AI Prompt（基於新的難度定義）
-- 3. 測試新用戶註冊流程
-- 4. 測試詞彙推薦準確性
-- =====================================================

