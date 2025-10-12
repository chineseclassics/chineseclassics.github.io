# 反饋流程說明與截斷問題修復

## 📋 當前架構說明

### 🎯 關鍵問題回答

**Q1: 反饋和故事接龍是在同一次 AI 調用中實現的嗎？**

❌ **不是！** 是**兩次獨立的 AI 調用**：

#### 學習模式（反饋開啟）流程

```
用戶輸入句子，第一次點擊「發送」
    ↓
【第一次 AI 調用】只獲取反饋
    getFeedbackOnly()
    → story-agent (requestFeedbackOnly: true)
    → DeepSeek API 調用 #1
    → 生成：評分 + 評語 + 優化版句子
    ↓
顯示反饋給用戶
設置 window._feedbackShown = true
啟用輸入框（用戶可修改句子）
    ↓
用戶修改（或不修改），第二次點擊「發送」
    ↓
【第二次 AI 調用】生成故事
    confirmAndSubmit()
    → submitSentence(sentence, word, skipFeedback=true)
    → story-agent (skipFeedback: true)
    → DeepSeek API 調用 #2
    → 生成：故事下一句
    ↓
顯示故事句子和詞彙推薦
```

#### 快速模式（反饋關閉）流程

```
用戶輸入句子，點擊「發送」
    ↓
【一次 AI 調用】只生成故事
    confirmAndSubmit()
    → submitSentence(sentence, word, skipFeedback=true)
    → story-agent (skipFeedback: true)
    → DeepSeek API 調用
    → 生成：故事下一句
    ↓
顯示故事句子和詞彙推薦
```

### 📊 AI 調用次數對比

| 模式 | 第一次提交 | 第二次提交 | 總 AI 調用 |
|------|-----------|-----------|-----------|
| **學習模式** | 反饋 AI | 故事 AI | **2 次** |
| **快速模式** | 故事 AI | - | **1 次** |

### 🔑 關鍵參數

| 參數 | 作用 | 使用場景 |
|------|------|---------|
| `requestFeedbackOnly: true` | 只生成反饋，不生成故事 | 第一次提交（學習模式） |
| `skipFeedback: true` | 只生成故事，不生成反饋 | 第二次提交 & 快速模式 |

## 🤔 是否應該分離成兩個 Agent？

### 當前狀態
✅ **已經事實上分離了**！通過參數控制：
- `requestFeedbackOnly` 模式 = 反饋專用
- 正常模式 + `skipFeedback` = 故事專用

### 建議：真正分離成兩個獨立的 Edge Functions

#### ✅ 優點

1. **職責更清晰**
   - `story-agent` - 專注故事接龍
   - `feedback-agent` - 專注評價反饋

2. **優化更容易**
   - 可以針對反饋單獨調整 max_tokens
   - 提示詞可以各自優化

3. **部署更靈活**
   - 可以獨立更新和測試
   - 反饋有問題不影響故事生成

4. **代碼更簡潔**
   - 不需要複雜的條件判斷
   - 每個函數只做一件事

#### ❌ 缺點

1. **需要額外開發**
   - 創建新的 Edge Function
   - 修改前端調用邏輯

2. **管理兩個函數**
   - 部署時需要部署兩個
   - 配置需要維護兩份

### 📝 建議

**短期**：保持當前架構（通過參數控制），因為：
- 已經工作正常
- 維護成本低

**長期**：如果反饋系統變得更複雜（如多層級評價、詳細分析等），可以考慮分離

## 🐛 反饋截斷問題修復

### 問題分析

**症狀**：AI 反饋的評語或優化版句子顯示不完整

**原因**：
1. ~~`max_tokens` 設置太小（350）~~ ← 已修復
2. AI 生成的反饋超過 max_tokens 限制被截斷
3. 提示詞沒有明確強調字數限制

### 修復措施

#### 1. 增加 max_tokens

```typescript
// 修復前
max_tokens: 350  // 容易截斷

// 修復後
max_tokens: 450  // 足夠容納完整反饋
```

**Token 消耗估算**：
- 總分行：~5 tokens
- 評語（50-70字）：~100-140 tokens
- 優化版句子（20-40字）：~40-80 tokens
- **總計**：~145-225 tokens
- **450 tokens 提供了約 2 倍的安全邊際**

#### 2. 強化提示詞

```typescript
// 修復前
評語：[60-80字的真誠評語，溫暖但客觀]

// 修復後
評語：[**嚴格控制在50-70字內**，真誠評語，溫暖但客觀]

**重要**：評語不可超過70字，優化版句子必須完整輸出，不可截斷。
```

#### 3. 添加截斷檢測

```typescript
// 檢查是否被截斷
const finishReason = data.choices[0].finish_reason
const usage = data.usage

console.log('📊 Token 使用:', {
  prompt_tokens: usage?.prompt_tokens,
  completion_tokens: usage?.completion_tokens,
  total_tokens: usage?.total_tokens,
  finish_reason: finishReason
})

if (finishReason === 'length') {
  console.warn('⚠️ 反饋被截斷（達到 max_tokens 限制），內容可能不完整')
}
```

**監控指標**：
- `finish_reason === 'stop'` - 正常結束 ✅
- `finish_reason === 'length'` - 被截斷 ⚠️
- `completion_tokens` - 實際使用的 tokens

#### 4. 優化 System Prompt

```typescript
// 添加強調
{ role: 'system', content: '你必須只使用繁體中文（Traditional Chinese）回答。嚴格遵守字數限制。' }
```

### 測試建議

請測試以下場景並觀察控制台：

1. ✅ **正常句子**：詞語使用正確
   - 觀察 `completion_tokens` 是否 < 450
   - 檢查 `finish_reason` 是否為 'stop'

2. ✅ **錯誤句子**：詞語使用錯誤
   - 評語應該明確指出錯誤
   - 優化版句子應該完整顯示

3. ⚠️ **極端情況**：複雜的錯誤
   - 如果 `finish_reason === 'length'`，記錄該案例
   - 考慮進一步增加 max_tokens 或精簡提示詞

### 如果仍然截斷

**進一步措施**：

1. **增加 max_tokens 到 500**
   ```typescript
   max_tokens: 500
   ```

2. **精簡提示詞示例**
   - 移除部分詳細示例
   - 只保留核心指導

3. **分段生成**（複雜方案）
   - 第一次生成：評分 + 評語
   - 第二次生成：優化版句子
   - （不推薦，增加複雜度）

## 📊 性能對比

### 學習模式 AI 調用

| 階段 | AI 調用 | 用途 | 時間 |
|------|--------|------|------|
| 第一次提交 | DeepSeek #1 | 反饋評價 | ~1-1.5s |
| 第二次提交 | DeepSeek #2 | 故事生成 | ~1-1.5s |
| **總計** | **2 次** | **完整體驗** | **~2-3s** |

### 快速模式 AI 調用

| 階段 | AI 調用 | 用途 | 時間 |
|------|--------|------|------|
| 提交 | DeepSeek #1 | 故事生成 | ~1-1.5s |
| **總計** | **1 次** | **快速創作** | **~1.5-2s** |

## 🔧 相關文件

- [Story-Agent 實現](../supabase/functions/story-agent/index.ts)
- [前端提交邏輯](../js/app.js)
- [Story-Agent 優化記錄](./STORY_AGENT_OPTIMIZATION.md)
- [跳過反饋優化](./SKIP_FEEDBACK_OPTIMIZATION.md)

## 📝 開發備註

### 添加新功能時注意

1. **反饋相關**
   - 修改時確保 `requestFeedbackOnly` 模式正常
   - 注意 max_tokens 限制

2. **故事相關**
   - 確保 `skipFeedback` 參數正確傳遞
   - 避免重複生成反饋

3. **測試兩種模式**
   - 學習模式（反饋開啟）
   - 快速模式（反饋關閉）

---

**最後更新**：2025-10-12  
**維護者**：書院中文經典  
**部署狀態**：✅ 已部署到生產環境

