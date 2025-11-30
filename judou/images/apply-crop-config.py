#!/usr/bin/env python3
"""
句豆頭像裁剪配置應用腳本
根據 avatar-crop-editor.html 生成的配置文件，重新裁剪頭像

使用方法：
1. 在 avatar-crop-editor.html 中調整裁剪區域並保存配置
2. 將配置文件保存為 avatar-crop-config.json（與此腳本同目錄）
3. 確保原始圖片文件存在（與配置中指定的尺寸匹配）
4. 運行：python3 apply-crop-config.py
5. 頭像將保存到 avatars/ 文件夾
"""

from PIL import Image
import json
import os

def apply_crop_config(config_path, source_image_path, output_dir):
    """
    應用裁剪配置
    
    Args:
        config_path: 配置文件路徑
        source_image_path: 原始圖片路徑
        output_dir: 輸出目錄
    """
    # 讀取配置
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 打開原始圖片
    img = Image.open(source_image_path)
    width, height = img.size
    
    # 驗證圖片尺寸
    if width != config['imageWidth'] or height != config['imageHeight']:
        print(f"警告: 圖片尺寸不匹配！")
        print(f"  配置: {config['imageWidth']} x {config['imageHeight']}")
        print(f"  實際: {width} x {height}")
        response = input("是否繼續？(y/n): ")
        if response.lower() != 'y':
            return
    
    # 創建輸出目錄
    os.makedirs(output_dir, exist_ok=True)
    
    # 頭像名稱（與編輯器中的順序一致）
    avatar_names = [
        "書法豆", "仙子豆", "墨池豆", "夫子豆", "儒袍豆", "招財豆",
        "竹食豆", "卷靈豆", "鳳鳴豆", "月兔豆", "文龜豆", "禪定豆",
        "冥想豆", "瓶靈豆", "劍客豆", "狐仙豆", "面譜豆", "星際豆"
    ]
    
    print(f"開始處理 {len(config['cropConfigs'])} 個頭像...")
    print()
    
    # 處理每個頭像
    for i, crop_config in enumerate(config['cropConfigs']):
        x = crop_config['x']
        y = crop_config['y']
        size = crop_config['size']
        scale = crop_config.get('scale', 1.0)
        
        # 計算實際裁剪區域（考慮縮放）
        actual_size = size * scale
        offset_x = (size - actual_size) / 2
        offset_y = (size - actual_size) / 2
        
        # 計算裁剪區域
        left = x + offset_x
        top = y + offset_y
        right = left + actual_size
        bottom = top + actual_size
        
        # 確保在圖片範圍內
        left = max(0, min(left, width))
        top = max(0, min(top, height))
        right = max(left, min(right, width))
        bottom = max(top, min(bottom, height))
        
        # 裁剪頭像
        avatar = img.crop((int(left), int(top), int(right), int(bottom)))
        
        # 調整為正方形（512x512）
        avatar = avatar.resize((512, 512), Image.Resampling.LANCZOS)
        
        # 生成文件名
        name = avatar_names[i] if i < len(avatar_names) else f"avatar_{i + 1}"
        output_path = os.path.join(output_dir, f"{name}.png")
        
        # 保存頭像
        avatar.save(output_path, "PNG", optimize=True)
        print(f"✓ 保存: {output_path} (位置: {int(left)}, {int(top)}, 尺寸: {int(actual_size)})")
    
    print(f"\n完成！共處理 {len(config['cropConfigs'])} 個頭像到 {output_dir}/")

if __name__ == "__main__":
    # 腳本所在目錄
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 配置文件
    config_path = os.path.join(script_dir, "avatar-crop-config.json")
    
    # 原始圖片（嘗試多個可能的文件名）
    possible_images = ["new avatars.png", "avatars-combined.png"]
    source_image_path = None
    
    for img_name in possible_images:
        path = os.path.join(script_dir, img_name)
        if os.path.exists(path):
            source_image_path = path
            break
    
    # 輸出目錄
    output_dir = os.path.join(script_dir, "avatars")
    
    if not os.path.exists(config_path):
        print(f"錯誤: 找不到配置文件 {config_path}")
        print("請先在 avatar-crop-editor.html 中調整並保存配置")
    elif not source_image_path:
        print(f"錯誤: 找不到原始圖片文件")
        print(f"請確保以下文件之一存在: {', '.join(possible_images)}")
    else:
        apply_crop_config(config_path, source_image_path, output_dir)

