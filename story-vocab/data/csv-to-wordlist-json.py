#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 詞表轉 JSON 工具
將 CSV 格式的詞表轉換為前端可用的 JSON 格式
"""

import csv
import json
import os
from collections import defaultdict

def read_csv_wordlist(csv_path):
    """讀取 CSV 詞表文件"""
    words_data = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('詞語') or row.get('词语', '').strip()
            level2 = row.get('第二層級') or row.get('第二层级', '').strip()
            level3 = row.get('第三層級') or row.get('第三层级', '').strip()
            
            # 跳過空行
            if not word:
                continue
                
            words_data.append({
                'word': word,
                'level2': level2,
                'level3': level3 if level3 else None
            })
    
    return words_data

def build_hierarchy(words_data):
    """構建層級結構"""
    hierarchy = defaultdict(lambda: defaultdict(list))
    
    for item in words_data:
        level2 = item['level2']
        level3 = item['level3']
        word = item['word']
        
        if level3:
            # 三層結構：level2 -> level3 -> words
            hierarchy[level2][level3].append(word)
        else:
            # 兩層結構：level2 -> words（使用特殊鍵 "_all"）
            if '_all' not in hierarchy[level2]:
                hierarchy[level2]['_all'] = []
            hierarchy[level2]['_all'].append(word)
    
    # 轉換為普通 dict
    result = {}
    for level2, level3_dict in hierarchy.items():
        result[level2] = dict(level3_dict)
    
    return result

def convert_csv_to_json(csv_path, output_path, wordlist_id, wordlist_name, wordlist_code):
    """轉換 CSV 到 JSON"""
    print(f"\n📖 讀取 CSV: {csv_path}")
    words_data = read_csv_wordlist(csv_path)
    print(f"✅ 共讀取 {len(words_data)} 個詞語")
    
    print(f"\n🏗️  構建層級結構...")
    hierarchy = build_hierarchy(words_data)
    
    # 統計信息
    level2_count = len(hierarchy)
    level3_count = sum(len(v) for v in hierarchy.values())
    
    print(f"✅ 第二層級數量: {level2_count}")
    print(f"✅ 第三層級數量: {level3_count}")
    
    # 構建 JSON 對象
    json_data = {
        "id": wordlist_id,
        "name": wordlist_name,
        "code": wordlist_code,
        "total_words": len(words_data),
        "hierarchy": hierarchy
    }
    
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 寫入 JSON 文件
    print(f"\n💾 寫入 JSON: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    
    # 顯示文件大小
    file_size = os.path.getsize(output_path)
    print(f"✅ 文件大小: {file_size / 1024:.1f} KB")
    
    return json_data

def main():
    """主函數"""
    print("=" * 60)
    print("🔄 CSV 詞表轉 JSON 工具")
    print("=" * 60)
    
    # 獲取腳本所在目錄
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # story-vocab/
    
    # 配置：小學中文字詞表
    primary_csv = os.path.join(script_dir, '小學中文字詞表_轉換後.csv')
    primary_json = os.path.join(project_root, 'assets/data/wordlists/primary_chinese_2025.json')
    
    # 配置：HSK 標準詞表
    hsk_csv = os.path.join(project_root, 'docs/hsk_standard_traditional.csv')
    hsk_json = os.path.join(project_root, 'assets/data/wordlists/hsk_standard.json')
    
    # 轉換小學詞表
    print("\n" + "=" * 60)
    print("📚 轉換：小學中文字詞表（2025）")
    print("=" * 60)
    convert_csv_to_json(
        csv_path=primary_csv,
        output_path=primary_json,
        wordlist_id="56b4c50c-bc8c-4998-a625-1a672792d4d3",
        wordlist_name="小學中文字詞表（2025）",
        wordlist_code="primary_chinese_2025"
    )
    
    # 轉換 HSK 詞表
    print("\n" + "=" * 60)
    print("📚 轉換：HSK 標準詞表")
    print("=" * 60)
    convert_csv_to_json(
        csv_path=hsk_csv,
        output_path=hsk_json,
        wordlist_id="hsk-standard-traditional",
        wordlist_name="HSK 標準詞表（繁體）",
        wordlist_code="hsk_standard"
    )
    
    print("\n" + "=" * 60)
    print("✅ 轉換完成！")
    print("=" * 60)
    print(f"\n生成的文件：")
    print(f"  - {primary_json}")
    print(f"  - {hsk_json}")
    print(f"\n下一步：運行前端應用測試加載")
    print()

if __name__ == '__main__':
    main()

