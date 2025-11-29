#!/usr/bin/env python3
"""
句豆頭像分割腳本
將包含 18 個頭像的合併圖片分割成獨立的頭像文件

使用方法：
1. 將合併圖片保存為 avatars-combined.png（與此腳本同目錄）
2. 運行：python3 split-avatars.py
3. 頭像將保存到 avatars/ 文件夾
"""

from PIL import Image
import os

def split_avatars(input_path, output_dir, cols=6, rows=3):
    """
    分割頭像圖片
    
    Args:
        input_path: 輸入圖片路徑
        output_dir: 輸出目錄
        cols: 列數（默認 6）
        rows: 行數（默認 3）
    """
    # 創建輸出目錄
    os.makedirs(output_dir, exist_ok=True)
    
    # 打開圖片
    img = Image.open(input_path)
    width, height = img.size
    
    # 計算每個頭像的尺寸
    avatar_width = width // cols
    avatar_height = height // rows
    
    print(f"圖片尺寸: {width} x {height}")
    print(f"頭像尺寸: {avatar_width} x {avatar_height}")
    print(f"總數: {cols} x {rows} = {cols * rows} 個頭像")
    print()
    
    # 頭像命名（XX豆格式）
    avatar_names = [
        # 第一行
        "學者豆",      # 戴眼鏡讀書的豆子
        "仙子豆",      # 帶翅膀的豆子
        "先生豆",      # 戴帽子的古人
        "熊貓豆",      # 讀書的熊貓
        "龍龍豆",      # 綠色小龍
        "月亮豆",      # 抱著月亮的豆子
        # 第二行
        "讀書豆",      # 看書的豆子
        "騰雲豆",      # 騰雲駕霧的豆子
        "悟空豆",      # 孫悟空造型
        "神仙豆",      # 讀卷軸的小神仙
        "逗號豆",      # 抱著句號的豆子
        "探險豆",      # 戴帽子探險的豆子
        # 第三行
        "畫家豆",      # 拿畫筆的豆子
        "詩人豆",      # 吟詩的豆子
        "皇后豆",      # 戴皇冠的豆子
        "武士豆",      # 深色背景的武士豆
        "歌者豆",      # 唱歌的豆子
        "俠客豆",      # 拿劍的俠客
    ]
    
    count = 0
    for row in range(rows):
        for col in range(cols):
            # 計算裁剪區域
            left = col * avatar_width
            top = row * avatar_height
            right = left + avatar_width
            bottom = top + avatar_height
            
            # 裁剪頭像
            avatar = img.crop((left, top, right, bottom))
            
            # 生成文件名
            name = avatar_names[count] if count < len(avatar_names) else f"avatar_{count + 1}"
            output_path = os.path.join(output_dir, f"{name}.png")
            
            # 保存頭像
            avatar.save(output_path, "PNG")
            print(f"✓ 保存: {output_path}")
            
            count += 1
    
    print(f"\n完成！共分割 {count} 個頭像到 {output_dir}/")

if __name__ == "__main__":
    # 腳本所在目錄
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 輸入文件（與腳本同目錄）
    input_path = os.path.join(script_dir, "avatars-combined.png")
    
    # 輸出目錄
    output_dir = os.path.join(script_dir, "avatars")
    
    if not os.path.exists(input_path):
        print(f"錯誤: 找不到輸入文件 {input_path}")
        print("請將合併的頭像圖片保存為 'avatars-combined.png'")
    else:
        split_avatars(input_path, output_dir)

