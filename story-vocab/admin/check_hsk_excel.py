#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查 HSK Excel 文件结构
"""

import sys
import os

# 尝试导入 xlrd（用于读取 .xls 文件）
try:
    import xlrd
except ImportError:
    print("需要安装 xlrd 库来读取 .xls 文件")
    print("请运行: pip3 install xlrd")
    sys.exit(1)

# Excel 文件路径
excel_file = '../docs/HSK-2012 (1).xls'

if not os.path.exists(excel_file):
    print(f"文件不存在: {excel_file}")
    sys.exit(1)

print("正在读取 Excel 文件...")
print("=" * 60)

# 打开 Excel 文件
workbook = xlrd.open_workbook(excel_file)

# 显示所有工作表
print(f"\n📊 工作表列表:")
print(f"共有 {workbook.nsheets} 个工作表\n")

for i, sheet_name in enumerate(workbook.sheet_names()):
    print(f"  {i+1}. {sheet_name}")

print("\n" + "=" * 60)

# 读取第一个工作表
sheet = workbook.sheet_by_index(0)
print(f"\n📄 第一个工作表: {sheet.name}")
print(f"行数: {sheet.nrows}")
print(f"列数: {sheet.ncols}")

# 显示前几行数据
print(f"\n📋 前 20 行数据预览:")
print("-" * 60)

for row_idx in range(min(20, sheet.nrows)):
    row = []
    for col_idx in range(sheet.ncols):
        cell = sheet.cell(row_idx, col_idx)
        value = str(cell.value).strip()
        if len(value) > 20:
            value = value[:17] + "..."
        row.append(value)
    
    # 格式化输出
    print(f"第 {row_idx+1:3d} 行: {' | '.join(row)}")

print("-" * 60)

# 显示表头（假设第一行是表头）
if sheet.nrows > 0:
    print(f"\n📌 表头（第1行）:")
    headers = []
    for col_idx in range(sheet.ncols):
        header = str(sheet.cell(0, col_idx).value).strip()
        headers.append(header)
        print(f"  列 {col_idx+1}: {header}")

print("\n" + "=" * 60)
print("✅ 读取完成！")

