#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
生成小學中文字詞表的完整 SQL 導入腳本
"""

import csv

# 讀取 CSV 文件
input_file = "小學中文字詞表_轉換後.csv"
output_file = "import_primary_wordlist_full.sql"

print(f"📖 讀取文件：{input_file}")

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"✅ 讀取完成，共 {len(rows)} 個詞語")

# 提取唯一的標籤
level_2_tags = sorted(set(row['第二層級'] for row in rows if row['第二層級']))
level_3_tags = sorted(set(row['第三層級'] for row in rows if row['第三層級']))

print(f"📊 統計：")
print(f"   - 第二層級標籤：{len(level_2_tags)} 個")
print(f"   - 第三層級標籤：{len(level_3_tags)} 個")

# 生成 SQL 腳本
print(f"📝 生成 SQL 腳本...")

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("""-- =====================================================
-- 小學中文字詞表 (2025) - 完整 SQL 導入腳本
-- 自動生成於：2025-10-17
-- 總詞語數：{} 個
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
  '{{"level_2_label": "單元", "level_3_label": "課文"}}'::jsonb,
  '香港小學中文課本字詞表（一年級至五年級），包含 {} 個核心詞語，按單元和課文組織。',
  {},
  true
)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_words = EXCLUDED.total_words,
  updated_at = NOW();

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
""".format(len(rows), len(rows), len(rows)))

    # 寫入第二層級標籤
    for i, tag in enumerate(level_2_tags):
        tag_escaped = tag.replace("'", "''")
        line = f"  ('{tag_escaped}')"
        if i < len(level_2_tags) - 1:
            line += ","
        f.write(line + "\n")
    
    f.write(""") AS tags(tag_name)
ON CONFLICT (wordlist_id, tag_level, tag_code) DO NOTHING;

-- 第三層級標籤（課文）
INSERT INTO wordlist_tags (wordlist_id, tag_level, tag_code, tag_display_name, sort_order)
SELECT 
  (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025'),
  3,
  tag_name,
  tag_name,
  ROW_NUMBER() OVER (ORDER BY tag_name)
FROM (VALUES
""")

    # 寫入第三層級標籤
    for i, tag in enumerate(level_3_tags):
        tag_escaped = tag.replace("'", "''")
        line = f"  ('{tag_escaped}')"
        if i < len(level_3_tags) - 1:
            line += ","
        f.write(line + "\n")
    
    f.write(""") AS tags(tag_name)
ON CONFLICT (wordlist_id, tag_level, tag_code) DO NOTHING;

-- ========================================
-- 3. 導入詞彙數據
-- ========================================

-- 批量插入所有詞語
INSERT INTO wordlist_vocabulary (wordlist_id, word, level_2_tag, level_3_tag)
SELECT 
  (SELECT id FROM wordlists WHERE code = 'primary_chinese_2025'),
  word,
  level_2_tag,
  level_3_tag
FROM (VALUES
""".format(len(rows), len(rows), len(rows)))

    # 寫入所有詞語數據
    for i, row in enumerate(rows):
        word = row['詞語'].replace("'", "''")  # 轉義單引號
        level_2 = row['第二層級'].replace("'", "''") if row['第二層級'] else ''
        level_3 = row['第三層級'].replace("'", "''") if row['第三層級'] else ''
        
        # 格式化為 SQL
        line = f"  ('{word}', '{level_2}', '{level_3}')"
        
        # 最後一行不加逗號
        if i < len(rows) - 1:
            line += ","
        
        f.write(line + "\n")
    
    f.write(""") AS t(word, level_2_tag, level_3_tag)
ON CONFLICT (wordlist_id, word, level_2_tag, level_3_tag) DO NOTHING;

COMMIT;

-- ========================================
-- 驗證導入結果
-- ========================================

DO $$
DECLARE
  v_wordlist_id UUID;
  v_word_count INT;
  v_unit_count INT;
  v_lesson_count INT;
  r RECORD;  -- 添加循環變量聲明
BEGIN
  -- 獲取詞表 ID
  SELECT id INTO v_wordlist_id
  FROM wordlists
  WHERE code = 'primary_chinese_2025';
  
  -- 統計詞彙數量
  SELECT COUNT(*) INTO v_word_count
  FROM wordlist_vocabulary
  WHERE wordlist_id = v_wordlist_id;
  
  -- 統計單元數量
  SELECT COUNT(DISTINCT level_2_tag) INTO v_unit_count
  FROM wordlist_vocabulary
  WHERE wordlist_id = v_wordlist_id;
  
  -- 統計課文數量
  SELECT COUNT(DISTINCT level_3_tag) INTO v_lesson_count
  FROM wordlist_vocabulary
  WHERE wordlist_id = v_wordlist_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 導入完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '詞表信息：';
  RAISE NOTICE '  - 詞表 ID: %', v_wordlist_id;
  RAISE NOTICE '  - 總詞語數: %', v_word_count;
  RAISE NOTICE '  - 單元數量: %', v_unit_count;
  RAISE NOTICE '  - 課文數量: %', v_lesson_count;
  RAISE NOTICE '';
  
  -- 顯示各單元的詞彙數量
  RAISE NOTICE '各單元詞彙數量：';
  FOR r IN (
    SELECT 
      level_2_tag,
      COUNT(*) as count
    FROM wordlist_vocabulary
    WHERE wordlist_id = v_wordlist_id
    GROUP BY level_2_tag
    ORDER BY level_2_tag
  ) LOOP
    RAISE NOTICE '  - %: % 個詞語', r.level_2_tag, r.count;
  END LOOP;
END $$;

-- =====================================================
-- 使用說明
-- =====================================================
--
-- 在 Supabase Dashboard 的 SQL Editor 中：
-- 1. 複製此完整 SQL 腳本
-- 2. 貼上到 SQL Editor
-- 3. 點擊 "Run" 執行
-- 4. 查看執行結果和統計信息
--
-- 注意：
-- - 如果詞表已存在，會更新詞表信息
-- - 重複的詞彙會自動跳過（ON CONFLICT DO NOTHING）
-- - 執行時間取決於數據庫性能，約需 5-10 秒
--
-- =====================================================
""")

print(f"✅ SQL 腳本已生成：{output_file}")
print(f"📊 包含 {len(rows)} 個詞語的完整導入語句")
print(f"\n💡 使用方法：")
print(f"   1. 打開 Supabase Dashboard 的 SQL Editor")
print(f"   2. 複製 {output_file} 的內容")
print(f"   3. 貼上並執行")
print(f"   4. 查看執行結果")

