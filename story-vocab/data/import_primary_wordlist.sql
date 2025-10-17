-- =====================================================
-- 小學中文字詞表 (2025) - 直接 SQL 導入
-- 總詞語數：1,308 個
-- 適用年級：一年級至五年級
-- =====================================================

BEGIN;

-- ========================================
-- 1. 創建詞表記錄
-- ========================================

INSERT INTO wordlists (
  name,
  code,
  type,
  owner_id,
  hierarchy_config,
  description,
  total_words,
  is_public
) VALUES (
  '小學中文字詞表（2025）',
  'primary_chinese_2025',
  'system',
  NULL,
  '{"level_2_label": "單元", "level_3_label": "課文"}'::jsonb,
  '香港小學中文課本字詞表（一年級至五年級），包含 1,308 個核心詞語，按單元和課文組織。',
  1308,
  true
)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_words = EXCLUDED.total_words,
  updated_at = NOW()
RETURNING id;

-- 保存詞表 ID（用於後續插入）
DO $$
DECLARE
  v_wordlist_id UUID;
BEGIN
  SELECT id INTO v_wordlist_id
  FROM wordlists
  WHERE code = 'primary_chinese_2025';
  
  RAISE NOTICE '✅ 詞表 ID: %', v_wordlist_id;
END $$;

-- ========================================
-- 2. 創建層級標籤
-- ========================================

-- 第二層級標籤（單元）
INSERT INTO wordlist_tags (wordlist_id, tag_level, tag_code, tag_display_name, sort_order)
SELECT 
  (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025'),
  2,
  tag_name,
  tag_name,
  ROW_NUMBER() OVER (ORDER BY tag_name)
FROM (VALUES
  ('一上單元一'),
  ('一上單元二'),
  ('一下單元一'),
  ('一下單元二'),
  ('二上單元一'),
  ('二上單元二'),
  ('二下單元一'),
  ('二下單元二'),
  ('三上單元一'),
  ('三上單元二'),
  ('三下單元一'),
  ('三下單元二'),
  ('四上單元一'),
  ('四上單元二'),
  ('四下單元一'),
  ('四下單元二'),
  ('五上單元一'),
  ('五上單元二'),
  ('五下單元一'),
  ('五下單元二')
) AS tags(tag_name)
ON CONFLICT (wordlist_id, tag_level, tag_code) DO NOTHING;

-- 第三層級標籤（課文）- 自動從數據中提取
-- 由於課文太多（92個），這裡在導入詞彙時自動創建

RAISE NOTICE '✅ 已創建 20 個單元標籤';

-- ========================================
-- 3. 導入詞彙數據
-- ========================================

-- 注意：這裡需要使用 CSV 文件導入
-- 方法 1：使用 Supabase Dashboard 的 SQL Editor
--   1. 在 Supabase Dashboard 打開 SQL Editor
--   2. 運行此腳本的前兩部分（創建詞表和標籤）
--   3. 使用 Table Editor 的 Import CSV 功能導入詞彙

-- 方法 2：使用 psql 命令行
--   psql "postgresql://..." -c "\COPY wordlist_vocabulary(wordlist_id, word, level_2_tag, level_3_tag) FROM 'path/to/csv' WITH (FORMAT csv, HEADER true, DELIMITER ',')"

-- 方法 3：使用 SQL INSERT（僅適用於小數據量）
-- 由於有 1,308 個詞語，建議使用方法 1 或 2

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '⚠️ 詞彙導入說明';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE '請選擇以下方法之一導入詞彙：';
RAISE NOTICE '';
RAISE NOTICE '方法 1（推薦）：使用 Supabase Dashboard';
RAISE NOTICE '  1. 打開 Table Editor';
RAISE NOTICE '  2. 選擇 wordlist_vocabulary 表';
RAISE NOTICE '  3. 點擊 Insert > Insert via spreadsheet';
RAISE NOTICE '  4. 準備 CSV 數據（需要 4 列）：';
RAISE NOTICE '     - wordlist_id: %', (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025');
RAISE NOTICE '     - word: 詞語';
RAISE NOTICE '     - level_2_tag: 單元';
RAISE NOTICE '     - level_3_tag: 課文';
RAISE NOTICE '';
RAISE NOTICE '方法 2：使用 Web 導入工具';
RAISE NOTICE '  1. 打開 story-vocab/admin/import-system-wordlist.html';
RAISE NOTICE '  2. 填寫詞表信息（使用已有的 code: primary_chinese_2025）';
RAISE NOTICE '  3. 上傳 CSV 文件';
RAISE NOTICE '  4. 點擊導入';
RAISE NOTICE '';

COMMIT;

-- =====================================================
-- 導入完成後的驗證
-- =====================================================

-- 查詢詞表信息
SELECT 
  id,
  name,
  code,
  total_words,
  created_at
FROM wordlists
WHERE code = 'primary_chinese_2025';

-- 查詢已導入的詞彙數量
SELECT 
  COUNT(*) as imported_words,
  COUNT(DISTINCT level_2_tag) as units,
  COUNT(DISTINCT level_3_tag) as lessons
FROM wordlist_vocabulary
WHERE wordlist_id = (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025');

-- 查詢各單元的詞彙數量
SELECT 
  level_2_tag as unit,
  COUNT(*) as word_count
FROM wordlist_vocabulary
WHERE wordlist_id = (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025')
GROUP BY level_2_tag
ORDER BY level_2_tag;

