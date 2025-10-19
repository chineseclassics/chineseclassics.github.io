#!/bin/bash
# 快速测试 format-spec-generator Edge Function
# Created: 2025-10-19

echo "🧪 测试 AI 格式生成器..."
echo ""

# 检查是否提供了 ANON_KEY
if [ -z "$1" ]; then
    echo "❌ 用法：./test-format-api.sh YOUR_ANON_KEY"
    echo ""
    echo "获取 Anon Key："
    echo "1. 访问：https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds/settings/api"
    echo "2. 复制 'anon' 'public' key"
    echo ""
    exit 1
fi

ANON_KEY=$1
URL="https://fjvgfhdqrezutrmbidds.supabase.co/functions/v1/format-spec-generator"

echo "📡 发送测试请求到 Edge Function..."
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "mode": "custom",
    "teacher_input": "請從至少兩個方面，寫兩段話（不需要開頭結尾），分析《春江花月夜》結構安排的精妙之處。\n\n字數：400-600 字\n評分標準：B 理解"
  }' | jq '.'

echo ""
echo "✅ 测试完成"

