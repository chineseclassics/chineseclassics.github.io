-- =====================================================
-- 重新排序「小學中文字詞表（2025）」二級標籤
-- 按照年級順序：一、二、三、四、五
-- Migration: 024_reorder_primary_wordlist_tags
-- =====================================================

BEGIN;

-- 更新 sort_order 按照正確的年級順序
UPDATE wordlist_tags
SET sort_order = CASE tag_code
  -- 一年級
  WHEN '一上單元一' THEN 1
  WHEN '一上單元二' THEN 2
  WHEN '一下單元一' THEN 3
  WHEN '一下單元二' THEN 4
  
  -- 二年級
  WHEN '二上單元一' THEN 5
  WHEN '二上單元二' THEN 6
  WHEN '二下單元一' THEN 7
  WHEN '二下單元二' THEN 8
  
  -- 三年級
  WHEN '三上單元一' THEN 9
  WHEN '三上單元二' THEN 10
  WHEN '三下單元一' THEN 11
  WHEN '三下單元二' THEN 12
  
  -- 四年級
  WHEN '四上單元一' THEN 13
  WHEN '四上單元二' THEN 14
  WHEN '四下單元一' THEN 15
  WHEN '四下單元二' THEN 16
  
  -- 五年級
  WHEN '五上單元一' THEN 17
  WHEN '五上單元二' THEN 18
  WHEN '五下單元一' THEN 19
  WHEN '五下單元二' THEN 20
END
WHERE wordlist_id = (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025')
  AND tag_level = 2;

COMMIT;

-- 驗證結果
SELECT tag_code, tag_display_name, sort_order
FROM wordlist_tags
WHERE wordlist_id = (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025')
  AND tag_level = 2
ORDER BY sort_order;

