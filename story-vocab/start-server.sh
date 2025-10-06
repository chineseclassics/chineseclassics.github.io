#!/bin/bash

# 故事接龙应用 - 本地开发服务器启动脚本

echo "🚀 启动本地开发服务器..."
echo ""

# 检测可用的服务器
if command -v python3 &> /dev/null; then
    echo "✅ 使用 Python 3 HTTP 服务器"
    echo "📡 服务器地址: http://localhost:8000"
    echo "🧪 测试页面: http://localhost:8000/test-connection.html"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ 使用 Python 2 HTTP 服务器"
    echo "📡 服务器地址: http://localhost:8000"
    echo "🧪 测试页面: http://localhost:8000/test-connection.html"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    python -m SimpleHTTPServer 8000
elif command -v php &> /dev/null; then
    echo "✅ 使用 PHP 内置服务器"
    echo "📡 服务器地址: http://localhost:8000"
    echo "🧪 测试页面: http://localhost:8000/test-connection.html"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    php -S localhost:8000
else
    echo "❌ 未找到可用的服务器"
    echo ""
    echo "请安装以下任一工具："
    echo "  1. Python: brew install python3"
    echo "  2. Node.js: brew install node (然后运行 npx serve)"
    echo "  3. PHP: 通常 macOS 已预装"
    exit 1
fi

