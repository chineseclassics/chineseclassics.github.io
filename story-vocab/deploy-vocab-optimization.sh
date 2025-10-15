#!/bin/bash

# =====================================================
# 詞彙推薦系統優化 - 部署腳本
# =====================================================

set -e  # 遇到錯誤立即停止

echo "======================================"
echo "詞彙推薦系統優化 - 部署腳本"
echo "======================================"
echo ""

# 確認當前目錄
if [ ! -f "supabase/config.toml" ]; then
  echo "❌ 錯誤：請在 story-vocab 目錄下執行此腳本"
  exit 1
fi

echo "✅ 當前目錄：$(pwd)"
echo ""

# 1. 數據庫遷移
echo "📊 步驟 1：執行數據庫遷移（L1-L6 → L1-L5）..."
echo "   - 添加 confidence 字段"
echo "   - 遷移 L6 數據到 L5"
echo ""
read -p "是否執行數據庫遷移？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  supabase db push
  echo "✅ 數據庫遷移完成"
else
  echo "⏭️  跳過數據庫遷移"
fi
echo ""

# 2. 部署 Edge Functions
echo "🚀 步驟 2：部署 Edge Functions..."
echo ""

echo "   2.1 部署 vocab-recommender（更新版）..."
supabase functions deploy vocab-recommender
echo "   ✅ vocab-recommender 部署完成"
echo ""

echo "   2.2 部署 unified-story-agent（新版）..."
supabase functions deploy unified-story-agent
echo "   ✅ unified-story-agent 部署完成"
echo ""

# 3. 驗證部署
echo "🔍 步驟 3：驗證部署狀態..."
echo ""
supabase functions list
echo ""

# 4. 測試建議
echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
echo "📋 測試建議："
echo ""
echo "1. 新用戶測試："
echo "   - 註冊新帳號"
echo "   - 選擇年級"
echo "   - 立即開始遊戲（無需校準）"
echo "   - 檢查詞卡顯示速度"
echo ""
echo "2. 舊用戶測試："
echo "   - 登入現有帳號"
echo "   - 開始新遊戲"
echo "   - 驗證詞彙推薦準確性"
echo "   - 檢查難度範圍（L1-L5）"
echo ""
echo "3. 性能測試："
echo "   - 觀察打字機完成時詞卡是否已加載"
echo "   - 檢查控制台日誌"
echo "   - 預期：句子 + 詞語 3-5秒（vs 舊版 5-9秒）"
echo ""
echo "4. 探索期測試："
echo "   - 創建新用戶，玩前 3 次遊戲"
echo "   - 觀察推薦範圍是否更寬"
echo "   - 檢查第 4 次遊戲是否精準推薦"
echo ""
echo "======================================"

