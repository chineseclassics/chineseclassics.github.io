#!/bin/bash
# 快速测试 format-spec-generator Edge Function
# Created: 2025-10-19

echo "🧪 测试 AI 格式生成器..."
echo ""

# 預設使用時文寶鑑的 Anon Key（如果未提供參數）
DEFAULT_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmdmaGRxcmV6dXRybWJpZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDE3ODIsImV4cCI6MjA3NjM3Nzc4Mn0.eVX46FM_UfLBk9vJiCfA_zC9PIMTJxmG8QNZQWdG8T8"

ANON_KEY="${1:-$DEFAULT_ANON_KEY}"
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

