#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 HSK Excel 文件转换为标准 CSV 格式
- 简体转繁体
- 提取词语和等级
- 生成标准 CSV：词语,第二层级,第三层级
"""

import sys
import os
import re
import csv

# 尝试导入 xlrd（用于读取 .xls 文件）
try:
    import xlrd
except ImportError:
    print("需要安装 xlrd 库")
    print("请运行: pip3 install xlrd")
    sys.exit(1)

# 尝试导入 OpenCC（用于简繁转换）
try:
    from opencc import OpenCC
    cc = OpenCC('s2t')  # 简体到繁体
except ImportError:
    print("需要安装 opencc-python-reimplemented 库进行简繁转换")
    print("请运行: pip3 install opencc-python-reimplemented")
    sys.exit(1)

# Excel 文件路径
excel_file = '../docs/HSK-2012 (1).xls'
output_file = '../docs/hsk_standard_traditional.csv'

if not os.path.exists(excel_file):
    print(f"文件不存在: {excel_file}")
    sys.exit(1)

print("=" * 60)
print("🚀 开始转换 HSK Excel 文件")
print("=" * 60)

# 打开 Excel 文件
workbook = xlrd.open_workbook(excel_file)

# 等级映射（工作表名 -> 等级标签）
level_mapping = {
    'HSK（一级）（150）': 'HSK1級',
    'HSK（二级）（300）': 'HSK2級',
    'HSK（三级）（600）': 'HSK3級',
    '新HSK（四级）（1200）': 'HSK4級',
    '新HSK（五级）（2500）': 'HSK5級',
    '新HSK（六级）（5000）': 'HSK6級'
}

# 收集所有词汇
all_words = []
stats = {}

print("\n📖 正在读取各等级词汇...\n")

for sheet_name, level_label in level_mapping.items():
    try:
        sheet = workbook.sheet_by_name(sheet_name)
        count = 0
        
        print(f"  处理: {sheet_name} -> {level_label}")
        
        for row_idx in range(sheet.nrows):
            cell_value = str(sheet.cell(row_idx, 0).value).strip()
            
            if not cell_value:
                continue
            
            # 提取词语（去掉括号及其内容）
            # 例如："爱（一级）" -> "爱"
            word = re.sub(r'[（(].*?[）)]', '', cell_value).strip()
            
            if word:
                # 简体转繁体
                word_traditional = cc.convert(word)
                
                all_words.append({
                    'word': word_traditional,
                    'level_2': level_label,
                    'level_3': ''
                })
                count += 1
        
        stats[level_label] = count
        print(f"    ✅ 提取 {count} 个词汇")
        
    except Exception as e:
        print(f"    ❌ 处理失败: {e}")

print(f"\n📊 统计:")
print(f"  总计: {len(all_words)} 个词汇")
for level, count in stats.items():
    print(f"  {level}: {count} 个")

# 去重（保留第一次出现的等级）
seen = {}
unique_words = []

for item in all_words:
    word = item['word']
    if word not in seen:
        seen[word] = True
        unique_words.append(item)

print(f"\n去重后: {len(unique_words)} 个唯一词汇")

# 写入 CSV
print(f"\n💾 写入 CSV 文件: {output_file}")

with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    
    # 写入表头
    writer.writerow(['词语', '第二层级', '第三层级'])
    
    # 写入数据
    for item in unique_words:
        writer.writerow([item['word'], item['level_2'], item['level_3']])

print("✅ 转换完成！")
print("=" * 60)
print(f"\n📄 输出文件: {output_file}")
print(f"📈 词汇数量: {len(unique_words)}")
print("\n可以使用此文件导入到系统词表了！")
print("=" * 60)

# 显示前 10 个词汇作为示例
print("\n📋 前 10 个词汇预览:")
print("-" * 60)
for i, item in enumerate(unique_words[:10], 1):
    print(f"{i:2d}. {item['word']:10s} | {item['level_2']}")
print("-" * 60)

