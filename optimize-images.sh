#!/bin/bash

# 太虛幻境圖片優化腳本
# 用於優化 cclogo.png 並生成 favicon.ico

echo "🖼️  太虛幻境圖片優化工具"
echo "================================"

# 檢查是否安裝了 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ 需要安裝 ImageMagick"
    echo "macOS: brew install imagemagick"
    echo "Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# 創建優化後的圖片目錄
mkdir -p assets/images/optimized

echo "📸 正在優化 cclogo.png..."

# 1. 創建多個尺寸的 cclogo 版本
echo "  - 創建 64x64 版本（用於首頁）"
convert assets/images/cclogo.png -resize 64x64 assets/images/optimized/cclogo-64.png

echo "  - 創建 32x32 版本（用於應用切換器）"
convert assets/images/cclogo.png -resize 32x32 assets/images/optimized/cclogo-32.png

echo "  - 創建 16x16 版本（用於 favicon）"
convert assets/images/cclogo.png -resize 16x16 assets/images/optimized/cclogo-16.png

# 2. 創建 WebP 版本（更好的壓縮）
echo "  - 創建 WebP 版本"
convert assets/images/cclogo.png -resize 64x64 assets/images/optimized/cclogo-64.webp
convert assets/images/cclogo.png -resize 32x32 assets/images/optimized/cclogo-32.webp

# 3. 生成 favicon.ico（包含多個尺寸）
echo "  - 生成 favicon.ico"
convert assets/images/cclogo.png -resize 16x16 assets/images/optimized/favicon-16.png
convert assets/images/cclogo.png -resize 32x32 assets/images/optimized/favicon-32.png
convert assets/images/cclogo.png -resize 48x48 assets/images/optimized/favicon-48.png

# 合併成 ico 文件
convert assets/images/optimized/favicon-16.png assets/images/optimized/favicon-32.png assets/images/optimized/favicon-48.png favicon.ico

echo ""
echo "✅ 優化完成！"
echo ""
echo "📊 文件大小對比："
echo "原始 cclogo.png: $(ls -lh assets/images/cclogo.png | awk '{print $5}')"
echo "優化後 64x64 PNG: $(ls -lh assets/images/optimized/cclogo-64.png | awk '{print $5}')"
echo "優化後 64x64 WebP: $(ls -lh assets/images/optimized/cclogo-64.webp | awk '{print $5}')"
echo "新的 favicon.ico: $(ls -lh favicon.ico | awk '{print $5}')"
echo ""
echo "📁 生成的文件："
echo "  - assets/images/optimized/cclogo-64.png (首頁使用)"
echo "  - assets/images/optimized/cclogo-32.png (應用切換器使用)"
echo "  - assets/images/optimized/cclogo-64.webp (現代瀏覽器)"
echo "  - favicon.ico (網站圖標)"
echo ""
echo "🔄 下一步："
echo "  1. 檢查優化後的文件大小"
echo "  2. 更新 index.html 中的圖片路徑"
echo "  3. 測試網站加載速度"
