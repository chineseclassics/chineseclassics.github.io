#!/bin/bash

# ========================================
# Alice in Birthdayland - 照片優化腳本
# ========================================

echo "🎂 開始優化 Alice 的生日照片..."

# 進入圖片目錄
cd assets/images

# 創建優化後的目錄
mkdir -p optimized

# 照片映射（基於選擇腳本的結果）
declare -A photo_map=(
    ["DSCF3746_DxO.JPG"]="photo-1.jpg"
    ["DSCF3042_DxO.JPG"]="photo-2.jpg" 
    ["DSCF3396_DxO.JPG"]="photo-3.jpg"
    ["DSCF7351.JPG"]="photo-4.jpg"
    ["DSCF7244.JPG"]="photo-5.jpg"
    ["f79fc53fb5b65880aaa823245ac674e5.JPG"]="photo-6.jpg"
    ["0fdeb64621a4ac5a115f2c832ebbf65e.JPG"]="photo-7.jpg"
    ["655a39d56ee1d4667c49c59aa583453c.JPG"]="photo-8.jpg"
)

# 優化參數
QUALITY=85
MAX_WIDTH=1200
MAX_HEIGHT=1200

echo "📸 開始處理照片..."

# 處理每張選中的照片
for original in "${!photo_map[@]}"; do
    new_name="${photo_map[$original]}"
    
    if [ -f "$original" ]; then
        echo "處理: $original → $new_name"
        
        # 使用 ImageMagick 優化照片
        # 調整大小、壓縮、轉換格式
        convert "$original" \
            -resize "${MAX_WIDTH}x${MAX_HEIGHT}>" \
            -quality $QUALITY \
            -strip \
            "optimized/$new_name"
            
        echo "✅ 完成: $new_name"
    else
        echo "❌ 找不到文件: $original"
    fi
done

# 檢查結果
echo ""
echo "📊 優化結果："
ls -la optimized/photo-*.jpg

# 計算文件大小
echo ""
echo "💾 文件大小統計："
du -h optimized/photo-*.jpg

echo ""
echo "🎉 照片優化完成！"
echo "優化後的照片已保存到: assets/images/optimized/"
