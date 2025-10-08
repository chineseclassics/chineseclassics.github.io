# 🔧 AI 評分缺失問題修復

## ❌ 問題描述

### 症狀
用戶完成第一次10輪校準遊戲後，控制台顯示：
```
[校準完成] 平均難度=3.8, 平均分=0.0, 眾數=L4, 最終評估=L3
```

**平均分=0.0** 是不正常的，說明 AI 評分數據沒有正確記錄到數據庫中。

### 影響
- ✅ 遊戲流程正常運行
- ✅ 詞彙推薦正常工作
- ❌ **所有回合的 `ai_score` 字段都是 `null`**
- ❌ **無法基於評分進行水平評估**
- ❌ **用戶無法看到自己的進步**

---

## 🔍 根本原因

### 問題鏈條

1. **story-agent Edge Function** 的正常流程（第78-143行）：
   ```typescript
   // 舊代碼：只返回故事和詞彙，沒有評分和反饋
   return new Response(JSON.stringify({
     success: true,
     data: {
       aiSentence,              // ✅ AI 生成的句子
       recommendedWords,        // ✅ 推荐的词汇
       currentRound: currentRound + 1,
       isComplete: currentRound >= 9
       // ❌ 缺少 score 和 feedback
     }
   }))
   ```

2. **前端期望獲取評分**（story-engine.js 第218-219行）：
   ```javascript
   await recordRoundData({
     aiScore: aiData.score || null,      // ❌ aiData.score 不存在
     aiFeedback: aiData.feedback || null // ❌ aiData.feedback 不存在
   });
   ```

3. **數據庫記錄**：
   - `ai_score` 字段被記錄為 `null`
   - `ai_feedback` 字段被記錄為 `null`

4. **校準評估計算平均分**（calibration-game.js 第295行）：
   ```javascript
   const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
   // null 被當作 0，導致平均分=0.0
   ```

---

## ✅ 修復方案

### 修改 story-agent Edge Function

在正常流程中添加評分和反饋生成：

```typescript
// 3. 生成評分和反饋（如果不是初始請求）
let feedback = null
if (!isInitialRequest && selectedWord) {
  console.log('👨‍🏫 生成評分和反饋...')
  feedback = await generateFeedback({
    userSentence,
    selectedWord,
    conversationHistory,
    storyTheme,
    apiKey: deepseekApiKey
  })
}

// 5. 返回结果（包含評分和反饋）
return new Response(
  JSON.stringify({
    success: true,
    data: {
      aiSentence,
      recommendedWords,
      currentRound: currentRound + 1,
      isComplete: currentRound >= 9,
      score: feedback?.score || null,          // ✅ 添加評分
      feedback: feedback?.comment || null      // ✅ 添加反饋文字
    }
  })
)
```

### 修復內容

#### 修改前
- ❌ 正常流程不生成評分
- ❌ 只在 `requestFeedbackOnly=true` 時生成評分
- ❌ 前端從未請求評分

#### 修改後
- ✅ 正常流程自動生成評分
- ✅ 每輪用戶提交後立即評分
- ✅ 評分和反饋一起返回給前端

---

## 📊 預期效果

### 控制台輸出（修復後）

```
[校準完成] 開始最終評估
[校準完成] 平均難度=3.8, 平均分=7.5, 眾數=L4, 最終評估=L4
✅ 校準評估完成: {level: 4, avgScore: '7.5', summary: '基於10輪測試，評估用戶水平為 L4'}
```

### 數據庫記錄（修復後）

| 輪次 | selected_word | ai_score | ai_feedback |
|------|---------------|----------|-------------|
| 1    | 高興          | 8        | 用詞恰當，句子流暢... |
| 2    | 寧靜          | 7        | 描寫生動，可以更簡潔... |
| 3    | 翱翔          | 9        | 詞彙運用精準，富有想像力... |
| ...  | ...           | ...      | ... |
| 10   | 蔥蘢          | 7        | 表達清楚，繼續加油... |

**平均分**: 7.5/10 ✅

---

## 🚀 部署步驟

### 1. 部署 Edge Function

```bash
cd story-vocab
npx supabase functions deploy story-agent
```

**結果**：
```
Deployed Functions on project bjykaipbeokbbykvseyr: story-agent
```

### 2. 測試驗證

1. **清除瀏覽器緩存**：`Cmd + Shift + R`
2. **開始新遊戲**（完整10輪）
3. **觀察控制台**：
   - 每輪提交後應該看到評分日誌
   - 遊戲結束時平均分不應該是 0.0

### 3. 檢查數據庫

在 Supabase Dashboard → Table Editor → `game_rounds`：

```sql
SELECT 
  round_number,
  selected_word,
  selected_difficulty,
  ai_score,
  ai_feedback
FROM game_rounds
WHERE session_id = '你的session_id'
ORDER BY round_number;
```

**預期**：所有行的 `ai_score` 應該是 1-10 的整數，不應該是 `null`。

---

## 📝 技術細節

### generateFeedback 函數

`story-agent` 中的 `generateFeedback` 函數會：

1. **調用 DeepSeek API** 生成評價
2. **解析反饋文本**，提取：
   - `score`：1-10 的整數評分
   - `comment`：文字評語
   - `optimizedSentence`：優化版句子建議

3. **返回結構化數據**：
   ```javascript
   {
     score: 8,
     comment: "用詞恰當，句子流暢...",
     optimizedSentence: "..."
   }
   ```

### 為什麼之前沒有評分？

原因是 `story-agent` 設計時有**兩種模式**：
- **正常模式**：生成故事（無評分）
- **反饋模式**：生成評分（`requestFeedbackOnly=true`）

但前端**從未使用反饋模式**，導致評分功能一直沒有被調用。

現在修復後，**正常模式也會自動生成評分**，無需額外調用。

---

## ⚠️ 注意事項

### API 調用次數增加

- **修復前**：每輪 1 次 DeepSeek API 調用（生成故事）
- **修復後**：每輪 2 次 DeepSeek API 調用（生成故事 + 生成評分）

**成本影響**：
- 每局遊戲（10輪）：20 次 API 調用
- 以 DeepSeek 價格估算：約 $0.002-0.005/局

**優化建議**：
- 可以考慮將故事生成和評分合併到一個 API 調用中
- 使用更高效的 Prompt 設計

### 評分延遲

生成評分需要額外的 API 調用時間（約1-2秒），可能影響用戶體驗。

**可選優化**：
- 使用 Promise.all 並行調用故事生成和評分
- 或者使用單一 API 調用同時返回故事和評分

---

## ✅ 驗收標準

修復成功的標誌：

- [ ] 遊戲流程正常，無錯誤
- [ ] 每輪提交後能看到 AI 評分和反饋
- [ ] 數據庫 `game_rounds` 表中 `ai_score` 不為 null
- [ ] 校準完成時顯示的平均分不是 0.0
- [ ] 用戶畫像基於實際評分正確評估水平

---

## 📅 修復記錄

- **修復日期**: 2025-10-08
- **修復文件**: `story-vocab/supabase/functions/story-agent/index.ts`
- **部署狀態**: ✅ 已部署到生產環境
- **測試狀態**: ⏳ 待用戶驗證

---

**請測試並確認評分功能正常！** 🎯

