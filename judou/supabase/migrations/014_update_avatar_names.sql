-- 句豆 - 更新頭像文件名稱
-- Migration: 014
-- Description: 根據重新整理的頭像文件，更新所有頭像的文件名和名稱

-- ======================
-- 1. 更新現有頭像的文件名
-- ======================

-- 普通 (common)
UPDATE avatars SET filename = '讀書豆.png' WHERE filename = '讀書豆.png'; -- 不變
UPDATE avatars SET filename = '逗號豆.png' WHERE filename = '逗號豆.png'; -- 不變
UPDATE avatars SET filename = '月亮豆.png' WHERE filename = '月亮豆.png'; -- 不變
UPDATE avatars SET name = '寫字豆', filename = '寫字豆.png' WHERE filename = '書法豆.png'; -- 書法豆 → 寫字豆

-- 稀有 (rare)
UPDATE avatars SET name = '東坡豆', filename = '東坡豆.png' WHERE filename = '學者豆.png'; -- 學者豆 → 東坡豆
UPDATE avatars SET filename = '騰雲豆.png' WHERE filename = '騰雲豆.png'; -- 不變
UPDATE avatars SET filename = '仙子豆.png' WHERE filename = '仙子豆.png'; -- 不變
UPDATE avatars SET name = '畫師豆', filename = '畫師豆.png' WHERE filename = '畫家豆.png'; -- 畫家豆 → 畫師豆
UPDATE avatars SET filename = '詩人豆.png' WHERE filename = '詩人豆.png'; -- 不變
UPDATE avatars SET name = '儒生豆', filename = '儒生豆.png' WHERE filename = '先生豆.png'; -- 先生豆 → 儒生豆
UPDATE avatars SET name = '硯臺豆', filename = '硯臺豆.png' WHERE filename = '墨池豆.png'; -- 墨池豆 → 硯臺豆
UPDATE avatars SET filename = '夫子豆.png' WHERE filename = '夫子豆.png'; -- 不變
UPDATE avatars SET name = '儒生豆', filename = '儒生豆.png' WHERE filename = '儒袍豆.png'; -- 儒袍豆 → 儒生豆（合併到儒生豆）
UPDATE avatars SET filename = '招財豆.png' WHERE filename = '招財豆.png'; -- 不變

-- 珍貴 (epic)
UPDATE avatars SET filename = '熊貓豆.png' WHERE filename = '熊貓豆.png'; -- 不變
UPDATE avatars SET name = '天官豆', filename = '天官豆.png' WHERE filename = '神仙豆.png'; -- 神仙豆 → 天官豆
UPDATE avatars SET name = '唱歌豆', filename = '唱歌豆.png' WHERE filename = '歌者豆.png'; -- 歌者豆 → 唱歌豆
UPDATE avatars SET name = '天后豆', filename = '天后豆.png' WHERE filename = '皇后豆.png'; -- 皇后豆 → 天后豆
UPDATE avatars SET name = '青龍豆', filename = '青龍豆.png' WHERE filename = '龍龍豆.png'; -- 龍龍豆 → 青龍豆
UPDATE avatars SET filename = '竹食豆.png' WHERE filename = '竹食豆.png'; -- 不變
UPDATE avatars SET filename = '卷靈豆.png' WHERE filename = '卷靈豆.png'; -- 不變
UPDATE avatars SET filename = '鳳鳴豆.png' WHERE filename = '鳳鳴豆.png'; -- 不變
UPDATE avatars SET filename = '月兔豆.png' WHERE filename = '月兔豆.png'; -- 不變
UPDATE avatars SET filename = '文龜豆.png' WHERE filename = '文龜豆.png'; -- 不變
UPDATE avatars SET name = '冥想豆', filename = '冥想豆.png' WHERE filename = '禪定豆.png'; -- 禪定豆 → 冥想豆
UPDATE avatars SET filename = '瓶靈豆.png' WHERE filename = '瓶靈豆.png'; -- 不變

-- 傳奇 (legendary)
UPDATE avatars SET filename = '悟空豆.png' WHERE filename = '悟空豆.png'; -- 不變
UPDATE avatars SET filename = '武士豆.png' WHERE filename = '武士豆.png'; -- 不變
UPDATE avatars SET name = '唱戲豆', filename = '唱戲豆.png' WHERE filename = '面譜豆.png'; -- 面譜豆 → 唱戲豆
UPDATE avatars SET filename = '狐仙豆.png' WHERE filename = '狐仙豆.png'; -- 不變
UPDATE avatars SET filename = '星際豆.png' WHERE filename = '星際豆.png'; -- 不變

-- ======================
-- 2. 移除不存在的頭像（標記為不活躍）
-- ======================

UPDATE avatars SET is_active = false WHERE filename IN (
    '探險豆.png',  -- 已移除
    '俠客豆.png',  -- 已移除
    '劍客豆.png'   -- 已移除
);

-- ======================
-- 3. 添加新頭像
-- ======================

INSERT INTO avatars (name, filename, rarity, unlock_type, unlock_value, unlock_description, order_index) VALUES
-- 新增頭像
('陰險豆', '陰險豆.png', 'rare', 'level', 10, '達到 Lv.10 解鎖', 35),
('作文豆', '作文豆.png', 'rare', 'level', 11, '達到 Lv.11 解鎖', 36)
ON CONFLICT (filename) DO NOTHING;

-- ======================
-- 4. 處理重複的儒生豆（如果儒袍豆和先生豆都更新為儒生豆）
-- ======================

-- 先生豆和儒袍豆都更新為儒生豆時，會產生重複
-- 先將先生豆更新為儒生豆，然後將儒袍豆的記錄合併到先生豆的記錄中
-- 將儒袍豆標記為不活躍（因為已經有儒生豆了）

-- 如果先生豆已經更新為儒生豆，則將儒袍豆標記為不活躍
UPDATE avatars 
SET is_active = false 
WHERE filename = '儒袍豆.png' 
  AND EXISTS (
    SELECT 1 FROM avatars 
    WHERE filename = '儒生豆.png' 
    AND name = '儒生豆'
  );

-- 如果存在多個儒生豆記錄，保留 order_index 較小的那個
UPDATE avatars 
SET is_active = false 
WHERE filename = '儒生豆.png' 
  AND id NOT IN (
    SELECT id FROM avatars 
    WHERE filename = '儒生豆.png' 
    ORDER BY order_index ASC 
    LIMIT 1
  );

