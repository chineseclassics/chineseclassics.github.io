-- 句豆 - 新增頭像
-- Migration: 013
-- Description: 添加 17 個新頭像，替換仙子豆文件

-- ======================
-- 1. 插入新頭像數據
-- ======================

INSERT INTO avatars (name, filename, rarity, unlock_type, unlock_value, unlock_description, order_index) VALUES
-- ⭐ 普通 (common) - 初始可用
('書法豆', '書法豆.png', 'common', 'default', NULL, '註冊即可使用', 19),

-- ⭐⭐ 稀有 (rare) - 等級解鎖
('墨池豆', '墨池豆.png', 'rare', 'level', 4, '達到 Lv.4 解鎖', 20),
('夫子豆', '夫子豆.png', 'rare', 'level', 6, '達到 Lv.6 解鎖', 21),
('儒袍豆', '儒袍豆.png', 'rare', 'level', 7, '達到 Lv.7 解鎖', 22),
('招財豆', '招財豆.png', 'rare', 'level', 9, '達到 Lv.9 解鎖', 23),

-- ⭐⭐⭐ 珍貴 (epic) - 中高等級解鎖
('竹食豆', '竹食豆.png', 'epic', 'level', 13, '達到 Lv.13 解鎖', 24),
('卷靈豆', '卷靈豆.png', 'epic', 'level', 14, '達到 Lv.14 解鎖', 25),
('鳳鳴豆', '鳳鳴豆.png', 'epic', 'level', 16, '達到 Lv.16 解鎖', 26),
('月兔豆', '月兔豆.png', 'epic', 'level', 17, '達到 Lv.17 解鎖', 27),
('文龜豆', '文龜豆.png', 'epic', 'level', 18, '達到 Lv.18 解鎖', 28),
('禪定豆', '禪定豆.png', 'epic', 'level', 19, '達到 Lv.19 解鎖', 29),
('瓶靈豆', '瓶靈豆.png', 'epic', 'level', 21, '達到 Lv.21 解鎖', 30),

-- ⭐⭐⭐⭐ 傳奇 (legendary) - 高等級或成就解鎖
('劍客豆', '劍客豆.png', 'legendary', 'achievement', 3, '對戰獲勝 10 場解鎖', 31),
('狐仙豆', '狐仙豆.png', 'legendary', 'level', 26, '達到 Lv.26 解鎖', 32),
('面譜豆', '面譜豆.png', 'legendary', 'level', 28, '達到 Lv.28 解鎖', 33),
('星際豆', '星際豆.png', 'legendary', 'level', 30, '達到 Lv.30 解鎖', 34);

-- ======================
-- 2. 注意事項
-- ======================
-- 仙子豆.png 文件已更新（新版本），但數據庫記錄保持不變
-- 龍書豆已去除，不添加

