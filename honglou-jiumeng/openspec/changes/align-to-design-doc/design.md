# Technical Design: align-to-design-doc

## Overview
本文檔描述將《紅樓舊夢》對齊到設計文檔的技術決策和實現細節。

## Architecture Decisions

### 1. 答題驗證系統架構

**決策**：創建獨立的 `memory-quiz.js` 模塊處理答題邏輯

**理由**：
- 答題驗證邏輯複雜（時間限制、答錯懲罰、資源計算），需要獨立模塊
- 保持 `main.js` 簡潔，專注於遊戲主流程
- 便於測試和維護

**實現方式**：
```javascript
// js/memory-quiz.js
export function showMemoryQuiz(memory) {
  // 顯示答題界面
  // 處理答題邏輯
  // 計算資源獎勵
  // 解鎖記憶
}
```

### 2. 資源計算系統

**決策**：實作時間獎勵/懲罰和答錯懲罰的組合計算

**公式**：
```
最終資源 = 基礎資源 × 時間係數 × 答錯係數
```

**時間係數**：
- 10 秒內答對：1.1（+10%）
- 10-25 秒答對：1.0（100%）
- 25-30 秒答對：0.9（-10%）
- 超過 30 秒：0（無法獲得資源）

**答錯係數**：
- 第一次答對：1.0（100%）
- 答錯 1 次後答對：0.8（80%）
- 答錯 2 次後答對：0.6（60%）
- 答錯 3 次後答對：0.4（40%）
- 答錯 4 次及以上：0.2（20%，最低）

**實現位置**：`js/memory-quiz.js` 中的 `calculateMemoryReward()` 函數

### 3. 記憶數據結構設計

**決策**：使用統一的記憶數據結構，包含所有必要屬性

**數據結構**：
```javascript
{
  id: "memory_daiyu_001",
  storyLineId: "daiyu_main",
  orderIndex: 1,
  name: "初入榮府",
  type: "tear",  // "tear" 或 "stone"
  relatedCharacter: "林黛玉",
  relatedScene: "榮國府",
  relatedChapter: 3,
  readingRequired: true,
  readingVerified: false,
  unlocked: false,
  questions: [
    {
      question: "...",
      options: [...],
      correct: 0
    }
  ],
  baseReward: 10,
  tearReward: 10,  // 或 stoneReward（根據記憶類型）
  text: "原文摘錄..."
}
```

**存儲位置**：
- 記憶定義：`js/state.js` 中的 `gameData.memories`
- 問題數據庫：`assets/data/reading-questions.json`

### 4. 回目與節氣的對應關係

**決策**：使用數據驅動的方式管理回目與節氣的對應關係

**數據結構**：
```javascript
{
  chapter: 3,
  title: "賈雨村夤緣復舊職 林黛玉拋父進京都",
  memories: [
    {
      id: "memory_daiyu_001",
      // ... 記憶屬性
    }
  ],
  seasonalCycles: 2  // 這個回目對應 2 個節氣
}
```

**實現邏輯**：
- 每個節氣解鎖一個回憶
- 一個回目的所有回憶連續分佈在多個節氣中
- 玩家需要連續答對所有 3 個題目才能解鎖回憶

### 5. UI 組件設計

**決策**：使用對話框模式顯示答題界面

**結構**：
```html
<div class="quiz-dialog-overlay" id="quiz-dialog-overlay">
  <div class="quiz-dialog" id="quiz-dialog">
    <h3 class="quiz-title">第 X 回的記憶 - 回憶名稱</h3>
    <div class="quiz-progress">題目 1/3</div>
    <div class="quiz-timer">剩餘時間：30 秒</div>
    <div class="quiz-question">問題內容</div>
    <div class="quiz-options">
      <!-- 選項按鈕 -->
    </div>
    <div class="quiz-feedback"></div>
  </div>
</div>
```

**交互邏輯**：
- 點擊未解鎖記憶 → 顯示答題界面
- 選擇答案 → 顯示反饋 → 自動進入下一題
- 完成所有 3 題 → 計算資源 → 解鎖記憶 → 關閉對話框

## Data Flow

### 記憶解鎖流程
```
1. 玩家點擊未解鎖記憶
   ↓
2. 檢查 readingRequired 和 readingVerified
   ↓
3. 顯示答題界面（showMemoryQuiz）
   ↓
4. 玩家答題（3 題，每題 30 秒）
   ↓
5. 計算資源獎勵（時間 + 答錯懲罰）
   ↓
6. 解鎖記憶（unlocked = true）
   ↓
7. 給予資源（tear 或 stone）
   ↓
8. 更新 UI（記憶列表、資源顯示）
```

### 資源獲取流程
```
1. 答題解鎖記憶（不消耗行動力）
   ↓
2. 計算資源獎勵（根據答題表現）
   ↓
3. 更新 gameData.resources.tear 或 stone
   ↓
4. 更新 UI（資源顯示、動畫）
```

### 行動消耗流程
```
1. 答題解鎖記憶（不消耗行動力）✅
   ↓
2. 獲得資源
   ↓
3. 使用資源進行行動（消耗行動力）：
   - 解鎖建築（不消耗行動力，只消耗靈石）
   - 種植花魂（消耗 2 點行動力）
   - 澆灌花魂（消耗 1 點行動力，消耗絳珠）
```

## File Structure

```
honglou-jiumeng/
├── js/
│   ├── app.js              # 應用入口（不變）
│   ├── main.js             # 主邏輯（更新記憶收集流程）
│   ├── state.js            # 遊戲狀態（更新資源和記憶結構）
│   └── memory-quiz.js      # 新建：答題驗證系統
├── assets/
│   └── data/
│       └── reading-questions.json  # 新建：問題數據庫
├── index.html              # UI 更新（答題界面、記憶列表）
└── css/
    └── style.css           # 樣式更新（答題界面樣式）
```

## Testing Strategy

### 單元測試重點
- 資源計算邏輯（時間係數 × 答錯係數）
- 記憶解鎖條件檢查
- 答題驗證邏輯

### 集成測試重點
- 記憶解鎖完整流程
- 資源獲取和消耗
- UI 交互流程

### 手動測試重點
- 答題界面交互
- 記憶列表顯示
- 資源顯示更新
- 行動消耗邏輯

## Performance Considerations

- **問題數據庫加載**：使用 JSON 文件，按需加載
- **答題界面渲染**：使用對話框模式，避免頻繁 DOM 操作
- **資源計算**：簡單的數學運算，性能影響可忽略

## Security Considerations

- **問題數據庫**：存儲在客戶端，無需服務器驗證（MVP 階段）
- **答題驗證**：客戶端驗證，防止簡單作弊（時間限制 + 答錯懲罰）

## Future Enhancements

- **服務器端驗證**：未來可將問題數據庫和驗證邏輯移至服務器
- **問題隨機化**：每次答題從題庫中隨機選擇，降低抄答案的可能性
- **閱讀時間追蹤**：記錄玩家閱讀時間，作為額外驗證

