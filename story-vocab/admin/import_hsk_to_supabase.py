#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接将 HSK 词表导入到 Supabase 数据库
"""

import sys
import os
import csv
import json
from datetime import datetime

try:
    from supabase import create_client, Client
except ImportError:
    print("需要安装 supabase 库")
    print("请运行: pip3 install supabase")
    sys.exit(1)

# Supabase 配置
SUPABASE_URL = "https://bjykaipbeokbbykvseyr.supabase.co"
SUPABASE_KEY = input("请输入 Supabase Service Role Key（从 Supabase Dashboard → Settings → API → service_role key）：\n").strip()

if not SUPABASE_KEY:
    print("❌ 需要提供 Service Role Key")
    sys.exit(1)

# CSV 文件路径
CSV_FILE = '../docs/hsk_standard_traditional.csv'

# 词表信息
WORDLIST_INFO = {
    'name': 'HSK標準詞表 2012版',
    'code': 'hsk_standard_2012',
    'type': 'system',
    'description': 'HSK 2012版標準詞表，包含1-6級共4991個詞彙',
    'hierarchy_config': {
        'level_2_label': '等級',
        'level_3_label': None
    }
}

print("=" * 60)
print("🚀 HSK 詞表導入工具")
print("=" * 60)

# 连接 Supabase
print("\n📡 連接 Supabase...")
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase 連接成功")
except Exception as e:
    print(f"❌ 連接失敗: {e}")
    sys.exit(1)

# 读取 CSV 文件
print(f"\n📖 讀取 CSV 文件: {CSV_FILE}")
words_data = []

try:
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row['词语'].strip()
            level_2 = row['第二层级'].strip() if row['第二层级'] else None
            level_3 = row['第三层级'].strip() if row['第三层级'] else None
            
            if word:
                words_data.append({
                    'word': word,
                    'level_2_tag': level_2,
                    'level_3_tag': level_3
                })
    
    print(f"✅ 讀取成功：{len(words_data)} 個詞彙")
except Exception as e:
    print(f"❌ 讀取失敗: {e}")
    sys.exit(1)

# 统计等级分布
from collections import Counter
level_stats = Counter(w['level_2_tag'] for w in words_data if w['level_2_tag'])
print(f"\n📊 等級分佈:")
for level in sorted(level_stats.keys()):
    print(f"  {level}: {level_stats[level]} 個")

# 确认导入
print("\n" + "=" * 60)
print("準備導入以下詞表：")
print(f"  名稱：{WORDLIST_INFO['name']}")
print(f"  代碼：{WORDLIST_INFO['code']}")
print(f"  詞彙數：{len(words_data)}")
print("=" * 60)

confirm = input("\n確認導入？(yes/no): ").strip().lower()
if confirm != 'yes':
    print("❌ 取消導入")
    sys.exit(0)

print("\n🚀 開始導入...\n")

# 1. 創建詞表
print("1️⃣ 創建詞表記錄...")
try:
    response = supabase.table('wordlists').insert(WORDLIST_INFO).execute()
    wordlist = response.data[0]
    wordlist_id = wordlist['id']
    print(f"✅ 詞表創建成功: {wordlist_id}")
except Exception as e:
    print(f"❌ 創建詞表失敗: {e}")
    sys.exit(1)

# 2. 創建層級標籤
print("\n2️⃣ 創建層級標籤...")
levels = sorted(set(w['level_2_tag'] for w in words_data if w['level_2_tag']))
level_tag_map = {}

for i, level in enumerate(levels):
    try:
        tag_data = {
            'wordlist_id': wordlist_id,
            'tag_level': 2,
            'tag_code': level,
            'tag_display_name': level,
            'sort_order': i
        }
        response = supabase.table('wordlist_tags').insert(tag_data).execute()
        tag_id = response.data[0]['id']
        level_tag_map[level] = tag_id
        print(f"  ✅ {level}: {tag_id}")
    except Exception as e:
        print(f"  ❌ {level} 創建失敗: {e}")

# 3. 導入詞彙
print(f"\n3️⃣ 導入詞彙（共 {len(words_data)} 個）...")
print("這可能需要一些時間，請耐心等待...\n")

new_vocab_count = 0
existing_vocab_count = 0
mapping_count = 0
error_count = 0

for i, item in enumerate(words_data):
    word = item['word']
    
    # 顯示進度
    if (i + 1) % 100 == 0:
        print(f"進度: {i + 1}/{len(words_data)} ({(i+1)*100//len(words_data)}%)")
    
    try:
        # 查找詞彙是否已存在
        response = supabase.table('vocabulary').select('*').eq('word', word).execute()
        
        if response.data and len(response.data) > 0:
            # 詞彙已存在
            vocab = response.data[0]
            existing_vocab_count += 1
        else:
            # 新詞彙：使用默認值（稍後可以用 AI 評估）
            vocab_data = {
                'word': word,
                'difficulty_level': 3,  # 默認中等難度
                'category': '待分類',
                'frequency': 50
            }
            response = supabase.table('vocabulary').insert(vocab_data).execute()
            vocab = response.data[0]
            new_vocab_count += 1
        
        # 創建詞彙-詞表關聯
        tag_path = [item['level_2_tag']] if item['level_2_tag'] else []
        
        mapping_data = {
            'vocabulary_id': vocab['id'],
            'wordlist_id': wordlist_id,
            'tag_path': json.dumps(tag_path),
            'level_2_tag': item['level_2_tag'],
            'level_3_tag': item['level_3_tag']
        }
        
        try:
            supabase.table('vocabulary_wordlist_mapping').insert(mapping_data).execute()
            mapping_count += 1
        except Exception as e:
            # 如果是重複錯誤（23505），忽略
            if '23505' not in str(e):
                raise e
    
    except Exception as e:
        error_count += 1
        if error_count <= 10:  # 只顯示前10個錯誤
            print(f"  ❌ 處理失敗: {word} - {e}")

# 4. 更新詞表統計
print(f"\n4️⃣ 更新詞表統計...")
try:
    supabase.table('wordlists').update({
        'total_words': len(words_data)
    }).eq('id', wordlist_id).execute()
    print("✅ 統計更新成功")
except Exception as e:
    print(f"⚠️ 統計更新失敗（不影響數據）: {e}")

# 完成
print("\n" + "=" * 60)
print("✅ 導入完成！")
print("=" * 60)
print(f"\n📊 統計:")
print(f"  新增詞彙: {new_vocab_count}")
print(f"  已存在詞彙: {existing_vocab_count}")
print(f"  創建關聯: {mapping_count}")
print(f"  錯誤: {error_count}")
print(f"\n詞表ID: {wordlist_id}")
print(f"詞表代碼: {WORDLIST_INFO['code']}")
print("\n現在你可以在遊戲中選擇這個詞表了！")
print("=" * 60)

