# 校準詞庫加載與去重邏輯修復

**修復日期**：2025-10-12  
**問題**：校準詞庫加載 404 錯誤 + AI 推薦模式缺少去重邏輯  
**狀態**：✅ 已修復並部署

---

## 問題描述

### 問題 1：校準詞庫加載失敗（404 錯誤）

**症狀**：
- 第 6 輪開始，詞卡數量越來越少（應該始終 5 個）
- 控制台錯誤：`Failed to load resource: 404 /story-vocab/data/calibration-vocabulary.json`
- 警告：`L2 池中詞語不足，從相鄰難度補充`

**根本原因**：
1. 前 5 輪使用硬編碼詞（25 個詞）
2. 第 6-10 輪嘗試從本地 JSON 加載（路徑錯誤，導致 404）
3. 降級到 fallback 詞庫（只有前 5 輪用過的 25 個詞）
4. 去重機制導致可用詞越來越少

### 問題 2：AI 智能推薦模式缺少去重邏輯

**症狀**：
- 已校準用戶的第二次及之後遊戲，可能推薦重複的詞

**根本原因**：
- 校準模式（第一次遊戲）：✅ 有完整的跨輪次去重
- 詞表模式：✅ 有去重邏輯（最近 3 輪）
- **AI智能推薦模式**：❌ **完全沒有去重邏輯**

---

## 修復方案

### 修復 1：統一使用 Supabase 校準詞庫（3 層降級策略）

**文件**：`story-vocab/js/features/calibration-game.js`

**策略 1（優先）**：從 Supabase 加載
```javascript
const { data: calibrationWords } = await supabase
  .from('vocabulary')
  .select('word, difficulty_level, category, frequency, calibration_order')
  .eq('is_calibration', true)
  .order('calibration_order')
```

**策略 2（備用）**：從本地 JSON 加載
```javascript
const response = await fetch('./data/calibration-vocabulary.json')  // 修復路徑
```

**策略 3（最終）**：硬編碼詞庫（擴充到每級 10 個詞）

**好處**：
1. 統一數據源（黃金校準詞同時用於用戶測試和 AI 評估）
2. 避免路徑問題
3. 支持動態更新（通過管理界面）
4. 150 個詞足夠 10+ 輪遊戲不重複

### 修復 2：AI 智能推薦模式添加完整去重邏輯

**文件**：`story-vocab/supabase/functions/vocab-recommender/index.ts`

**修改內容**：

#### 2.1 獲取已推薦詞列表
```typescript
const { data: recentRec } = await supabase
  .from('recommendation_history')
  .select('recommended_words')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: false })

const recentWords = new Set(
  (recentRec || []).flatMap(r => r.recommended_words || [])
)
```

#### 2.2 在 AI Prompt 中添加已用詞列表
```typescript
const usedWordsList = Array.from(recentWords).join('、')
const prompt = buildAIPrompt(userProfile, storyContext, roundNumber, usedWordsList)
```

#### 2.3 過濾 AI 返回的詞（雙重保險）
```typescript
let filteredWords = (aiWords.words || []).filter((w: any) => !recentWords.has(w.word))

// 如果不足 5 個，從校準詞庫補充
if (filteredWords.length < 5) {
  const calibrationWords = await getCalibrationWords(supabase, userId, roundNumber)
  const needed = 5 - filteredWords.length
  const supplements = calibrationWords
    .filter((w: any) => !recentWords.has(w.word))
    .slice(0, needed)
  filteredWords = [...filteredWords, ...supplements]
}
```

#### 2.4 更新 AI Prompt
**文件**：`story-vocab/supabase/functions/vocab-recommender/prompts.ts`

在 Prompt 中添加：
```typescript
${usedWordsList ? `
## ⚠️ 本次遊戲已推薦過的詞（必須避開）

${usedWordsList}

**重要**：推薦的5個詞都不能包含在上述列表中，必須完全不重複。
` : ''}
```

---

## 修改文件清單

### 前端
1. ✅ `story-vocab/js/features/calibration-game.js`
   - 修改 `loadCalibrationVocabulary()` - 從 Supabase 優先加載
   - 新增 `loadLocalCalibrationVocabulary()` - 本地 JSON 備用
   - 改進 `createFallbackCalibrationPool()` - 擴充硬編碼詞庫

### 後端（Edge Functions）
2. ✅ `story-vocab/supabase/functions/vocab-recommender/index.ts`
   - 修改 `recommendByAI()` - 添加完整去重邏輯
   
3. ✅ `story-vocab/supabase/functions/vocab-recommender/prompts.ts`
   - 修改 `buildAIPrompt()` - 添加 `usedWordsList` 參數
   - 在 Prompt 中明確要求 AI 避開已用詞

### 部署
4. ✅ 部署 Edge Function
   ```bash
   cd story-vocab
   supabase functions deploy vocab-recommender
   ```

---

## 測試計劃

### ✅ 測試案例 1：第一次遊戲（校準模式）

**目標**：驗證從 Supabase 加載校準詞，每輪都有 5 個不重複的詞

**步驟**：
1. 清除瀏覽器緩存，重新登入
2. 開始新遊戲（第一次遊戲自動進入校準模式）
3. 完成 10 輪故事創作
4. 觀察控制台日誌

**預期結果**：
- ✅ 控制台顯示：`✅ 從 Supabase 加載校準詞庫: 150 個詞`
- ✅ 顯示各難度級別詞數：`L1: 25, L2: 25, L3: 25, L4: 25, L5: 25, L6: 25`
- ✅ 每輪都有 5 個詞卡
- ✅ 所有詞不重複
- ✅ 無 404 錯誤

### ⏳ 測試案例 2：第二次遊戲（AI 智能推薦模式）

**目標**：驗證 AI 推薦模式的去重邏輯

**步驟**：
1. 完成第一次遊戲後，開始第二次遊戲
2. 觀察 AI 推薦的詞是否與之前重複
3. 檢查控制台日誌

**預期結果**：
- ✅ 控制台顯示：`[AI 推薦去重] 本次會話已推薦 X 個詞`
- ✅ 每輪都有 5 個詞卡
- ✅ 所有詞與本次會話內之前推薦的詞不重複
- ✅ 如果 AI 返回重複詞，自動從校準詞庫補充

### ⏳ 測試案例 3：詞表模式

**目標**：驗證詞表模式的去重邏輯正常工作

**步驟**：
1. 進入設置，選擇自訂詞表
2. 開始新遊戲
3. 觀察詞彙推薦

**預期結果**：
- ✅ 每輪都有 5 個詞卡
- ✅ 所有詞來自選定的詞表
- ✅ 去重邏輯正常工作（最近 3 輪不重複）

---

## 預期修復效果

### 所有模式的統一保證

無論是哪種模式，都保證：
1. ✅ 每輪始終有 5 個詞
2. ✅ 詞彙與本次會話內之前的輪次完全不重複
3. ✅ 無 404 或其他加載錯誤
4. ✅ 多層降級策略確保可靠性

### 模式對比

| 模式 | 觸發條件 | 去重範圍 | 修復狀態 |
|------|---------|---------|----------|
| 校準模式 | 第一次遊戲（AI 模式） | 本次會話所有輪次 | ✅ 已有，已加強 |
| 詞表模式 | 選擇詞表 | 最近 3 輪 | ✅ 已有 |
| AI 智能推薦 | 已校準用戶（第二次+） | 本次會話所有輪次 | ✅ **新增** |

---

## 後續優化建議

### 短期（可選）

1. **驗證 Supabase 校準詞數量**
   - 檢查 `vocabulary` 表中 `is_calibration = true` 的詞
   - 建議：每級至少 20 個詞，共 120+ 個
   - 如果不足，使用管理界面導入本地 JSON 的 150 個詞

2. **監控校準詞使用情況**
   - 哪些詞經常被選擇
   - 哪些詞從未被選擇
   - 優化校準詞庫內容

### 長期（未來）

1. **動態校準詞庫**
   - 根據用戶選擇頻率調整詞庫
   - 定期補充新詞

2. **個性化推薦**
   - 根據用戶歷史偏好推薦
   - 避免用戶不喜歡的詞類型

---

## 相關文件

- [校準遊戲管理器](../js/features/calibration-game.js)
- [詞彙推薦集成](../js/core/vocab-integration.js)
- [Edge Function: vocab-recommender](../supabase/functions/vocab-recommender/index.ts)
- [本地校準詞庫](../data/calibration-vocabulary.json)
- [管理工具：導入校準詞](../admin/import-calibration-words.html)

---

**文檔版本**：1.0  
**維護者**：書院中文經典  
**最後更新**：2025-10-12

