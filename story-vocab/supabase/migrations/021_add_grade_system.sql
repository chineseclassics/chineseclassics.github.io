-- =====================================================
-- 年級分級系統遷移
-- 新增年級相關欄位和自動升級機制
-- =====================================================

-- 1. 新增年級相關欄位到 users 表
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS grade_set_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS grade_auto_upgraded BOOLEAN DEFAULT FALSE;

-- 2. 添加約束條件
ALTER TABLE users 
  ADD CONSTRAINT check_grade_range 
  CHECK (grade >= 1 AND grade <= 13);

-- 3. 為現有用戶設置默認值
UPDATE users 
SET 
  grade = 6,
  grade_set_at = NOW(),
  grade_auto_upgraded = FALSE
WHERE grade IS NULL;

-- 4. 創建年級配置表（可選，用於存儲年級相關配置）
CREATE TABLE IF NOT EXISTS grade_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL UNIQUE,
  grade_name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  difficulty_center DECIMAL(2,1) NOT NULL,
  difficulty_min INTEGER NOT NULL,
  difficulty_max INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 插入年級配置數據
INSERT INTO grade_configs (grade, grade_name, age_range, difficulty_center, difficulty_min, difficulty_max) VALUES
  (1, '1年級', '6歲', 1.0, 1, 2),
  (2, '2年級', '7歲', 1.5, 1, 2),
  (3, '3年級', '8歲', 2.0, 1, 3),
  (4, '4年級', '9歲', 2.5, 2, 3),
  (5, '5年級', '10歲', 2.5, 2, 4),
  (6, '6年級', '11歲', 3.0, 2, 4),
  (7, '7年級', '12歲', 3.5, 3, 5),
  (8, '8年級', '13歲', 4.0, 3, 5),
  (9, '9年級', '14歲', 4.5, 4, 6),
  (10, '10年級', '15歲', 5.0, 4, 6),
  (11, '11年級', '16歲', 5.5, 5, 6),
  (12, '12年級', '17歲', 6.0, 5, 6),
  (13, '12年級以上', '18歲+', 6.0, 5, 6)
ON CONFLICT (grade) DO NOTHING;

-- 6. 確保 RLS 策略允許用戶更新自己的 grade
-- 檢查現有策略
DO $$
BEGIN
  -- 如果 users 表的 UPDATE 策略不存在，創建它
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own ON users
      FOR UPDATE
      USING (id = get_user_id_from_auth())
      WITH CHECK (id = get_user_id_from_auth());
  END IF;
END $$;

-- 7. 為 grade_configs 表啟用 RLS（只讀）
ALTER TABLE grade_configs ENABLE ROW LEVEL SECURITY;

-- 允許所有已認證用戶讀取年級配置
CREATE POLICY grade_configs_select_all ON grade_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- 8. 創建輔助函數：獲取年級配置
CREATE OR REPLACE FUNCTION get_grade_config(user_grade INTEGER)
RETURNS TABLE (
  grade INTEGER,
  grade_name TEXT,
  age_range TEXT,
  difficulty_center DECIMAL(2,1),
  difficulty_min INTEGER,
  difficulty_max INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.grade,
    gc.grade_name,
    gc.age_range,
    gc.difficulty_center,
    gc.difficulty_min,
    gc.difficulty_max
  FROM grade_configs gc
  WHERE gc.grade = user_grade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 創建年級升級檢查函數（用於前端調用）
CREATE OR REPLACE FUNCTION should_upgrade_grade(
  grade_set_at_param TIMESTAMP,
  current_grade INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  set_date DATE;
  curr_date DATE;  -- 改名避免與保留字衝突
  set_year INTEGER;
  set_month INTEGER;
  curr_year INTEGER;
  curr_month INTEGER;
  years_passed INTEGER;
BEGIN
  -- 如果已經是最高年級，不再升級
  IF current_grade >= 13 THEN
    RETURN FALSE;
  END IF;
  
  set_date := grade_set_at_param::DATE;
  curr_date := NOW()::DATE;  -- 使用 curr_date
  
  set_year := EXTRACT(YEAR FROM set_date);
  set_month := EXTRACT(MONTH FROM set_date);
  curr_year := EXTRACT(YEAR FROM curr_date);  -- 使用 curr_date
  curr_month := EXTRACT(MONTH FROM curr_date);  -- 使用 curr_date
  
  years_passed := curr_year - set_year;  -- 使用 curr_year
  
  -- 9月為學年分界點（月份從1開始，9月是第9個月）
  IF curr_month >= 9 AND set_month < 9 THEN  -- 使用 curr_month
    -- 已經跨越學年
    RETURN years_passed > 0;
  ELSIF curr_month < 9 AND set_month >= 9 THEN  -- 使用 curr_month
    -- 還沒跨越學年
    years_passed := years_passed - 1;
    RETURN years_passed > 0;
  ELSE
    -- 同一學年區間
    RETURN years_passed > 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. 創建註釋
COMMENT ON COLUMN users.grade IS '用戶年級（1-13，13代表12年級以上/成人）';
COMMENT ON COLUMN users.grade_set_at IS '年級設定時間，用於自動升級計算';
COMMENT ON COLUMN users.grade_auto_upgraded IS '標記是否已自動升級過';
COMMENT ON TABLE grade_configs IS '年級配置表，存儲每個年級的詞彙難度範圍';
COMMENT ON FUNCTION should_upgrade_grade IS '檢查是否應該升級年級（基於9月學年分界）';

-- 遷移完成

