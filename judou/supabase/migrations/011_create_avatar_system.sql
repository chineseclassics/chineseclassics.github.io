-- 句豆 - 用戶頭像系統
-- Migration: 011
-- Description: 創建頭像定義表和用戶頭像解鎖表

-- ======================
-- 1. 頭像定義表
-- ======================

CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 頭像名稱（如「學者豆」）
  filename TEXT NOT NULL,                -- 文件名（如「學者豆.png」）
  rarity TEXT NOT NULL DEFAULT 'common'  -- 稀有度: common/rare/epic/legendary
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_type TEXT NOT NULL DEFAULT 'level'  -- 解鎖方式: level/achievement/event/default
    CHECK (unlock_type IN ('level', 'achievement', 'event', 'default')),
  unlock_value INT,                      -- 解鎖值（等級數或成就ID）
  unlock_description TEXT,               -- 解鎖說明
  order_index INT DEFAULT 0,             -- 顯示順序
  is_active BOOLEAN DEFAULT true,        -- 是否啟用
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_avatars_rarity ON avatars(rarity);
CREATE INDEX IF NOT EXISTS idx_avatars_unlock_type ON avatars(unlock_type);
CREATE INDEX IF NOT EXISTS idx_avatars_order ON avatars(order_index);

-- 註釋
COMMENT ON TABLE avatars IS '頭像定義表 - 存儲所有可用頭像';
COMMENT ON COLUMN avatars.rarity IS '稀有度：common(普通)/rare(稀有)/epic(珍貴)/legendary(傳奇)';
COMMENT ON COLUMN avatars.unlock_type IS '解鎖方式：level(等級)/achievement(成就)/event(活動)/default(默認可用)';

-- ======================
-- 2. 用戶已解鎖頭像表
-- ======================

CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每個用戶每個頭像只能有一條記錄
  CONSTRAINT user_avatars_unique UNIQUE (user_id, avatar_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_avatars_user ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_avatar ON user_avatars(avatar_id);

-- 註釋
COMMENT ON TABLE user_avatars IS '用戶已解鎖頭像表';

-- ======================
-- 3. 修改 profiles 表，添加當前頭像
-- ======================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.current_avatar_id IS '用戶當前使用的頭像ID';

-- ======================
-- 4. RLS 策略
-- ======================

-- avatars 表（所有人可讀）
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view avatars"
  ON avatars FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- user_avatars 表
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocked avatars"
  ON user_avatars FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own avatar unlocks"
  ON user_avatars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ======================
-- 5. 自動解鎖頭像函數
-- ======================

CREATE OR REPLACE FUNCTION check_and_unlock_avatars(p_user_id UUID, p_level INT)
RETURNS TABLE(avatar_id UUID, avatar_name TEXT) AS $$
BEGIN
  -- 插入所有應該解鎖但尚未解鎖的頭像
  RETURN QUERY
  WITH newly_unlocked AS (
    INSERT INTO user_avatars (user_id, avatar_id)
    SELECT p_user_id, a.id
    FROM avatars a
    WHERE a.is_active = true
      AND (
        -- 默認頭像
        a.unlock_type = 'default'
        -- 或者等級達標
        OR (a.unlock_type = 'level' AND a.unlock_value <= p_level)
      )
      -- 且尚未解鎖
      AND NOT EXISTS (
        SELECT 1 FROM user_avatars ua 
        WHERE ua.user_id = p_user_id AND ua.avatar_id = a.id
      )
    RETURNING user_avatars.avatar_id
  )
  SELECT nu.avatar_id, a.name
  FROM newly_unlocked nu
  JOIN avatars a ON a.id = nu.avatar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- 6. 更新用戶頭像函數
-- ======================

CREATE OR REPLACE FUNCTION update_user_avatar(p_user_id UUID, p_avatar_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_unlocked BOOLEAN;
BEGIN
  -- 檢查用戶是否已解鎖該頭像
  SELECT EXISTS(
    SELECT 1 FROM user_avatars 
    WHERE user_id = p_user_id AND avatar_id = p_avatar_id
  ) INTO v_unlocked;
  
  IF NOT v_unlocked THEN
    RETURN false;
  END IF;
  
  -- 更新用戶當前頭像
  UPDATE profiles 
  SET current_avatar_id = p_avatar_id, updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- 7. 插入初始頭像數據
-- ======================

INSERT INTO avatars (name, filename, rarity, unlock_type, unlock_value, unlock_description, order_index) VALUES
-- ⭐ 普通 (common) - 初始可用
('讀書豆', '讀書豆.png', 'common', 'default', NULL, '註冊即可使用', 1),
('逗號豆', '逗號豆.png', 'common', 'default', NULL, '註冊即可使用', 2),
('月亮豆', '月亮豆.png', 'common', 'default', NULL, '註冊即可使用', 3),

-- ⭐⭐ 稀有 (rare) - 等級解鎖
('學者豆', '學者豆.png', 'rare', 'level', 3, '達到 Lv.3 解鎖', 4),
('騰雲豆', '騰雲豆.png', 'rare', 'level', 3, '達到 Lv.3 解鎖', 5),
('仙子豆', '仙子豆.png', 'rare', 'level', 5, '達到 Lv.5 解鎖', 6),
('畫家豆', '畫家豆.png', 'rare', 'level', 5, '達到 Lv.5 解鎖', 7),
('詩人豆', '詩人豆.png', 'rare', 'level', 8, '達到 Lv.8 解鎖', 8),
('先生豆', '先生豆.png', 'rare', 'level', 8, '達到 Lv.8 解鎖', 9),

-- ⭐⭐⭐ 珍貴 (epic) - 中高等級解鎖
('探險豆', '探險豆.png', 'epic', 'level', 12, '達到 Lv.12 解鎖', 10),
('熊貓豆', '熊貓豆.png', 'epic', 'level', 12, '達到 Lv.12 解鎖', 11),
('神仙豆', '神仙豆.png', 'epic', 'level', 15, '達到 Lv.15 解鎖', 12),
('歌者豆', '歌者豆.png', 'epic', 'level', 15, '達到 Lv.15 解鎖', 13),
('皇后豆', '皇后豆.png', 'epic', 'level', 20, '達到 Lv.20 解鎖', 14),
('龍龍豆', '龍龍豆.png', 'epic', 'level', 20, '達到 Lv.20 解鎖', 15),

-- ⭐⭐⭐⭐ 傳奇 (legendary) - 高等級或成就解鎖
('悟空豆', '悟空豆.png', 'legendary', 'level', 25, '達到 Lv.25 解鎖', 16),
('武士豆', '武士豆.png', 'legendary', 'achievement', 1, '完成第一場對戰解鎖', 17),
('俠客豆', '俠客豆.png', 'legendary', 'achievement', 2, '對戰連勝 5 場解鎖', 18);

