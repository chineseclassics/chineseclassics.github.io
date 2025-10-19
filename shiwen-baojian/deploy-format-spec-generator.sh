#!/bin/bash
# 部署 format-spec-generator Edge Function
# Created: 2025-10-19

echo "🚀 开始部署 format-spec-generator Edge Function..."
echo ""

# 切换到 shiwen-baojian 目录
cd "$(dirname "$0")"

# 检查是否已连接到 Supabase 项目
echo "📋 检查 Supabase 连接状态..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  需要先登录 Supabase"
    supabase login
fi

# 确保项目已连接
echo "🔗 连接到 Supabase 项目..."
supabase link --project-ref bjykaipbeokbbykvseyr

# 部署 Edge Function
echo ""
echo "📦 部署 format-spec-generator..."
supabase functions deploy format-spec-generator --no-verify-jwt

# 检查部署状态
echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 已部署的 Edge Functions："
supabase functions list

echo ""
echo "🎯 下一步："
echo "   1. 测试 Edge Function（运行 test-format-spec-generator.html）"
echo "   2. 检查环境变量是否已配置 DEEPSEEK_API_KEY"
echo ""

