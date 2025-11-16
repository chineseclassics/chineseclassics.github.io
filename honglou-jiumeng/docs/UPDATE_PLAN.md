# 《紅樓舊夢》遊戲更新計劃

> **對照文檔**：`GAME_REDESIGN_PLAN copy.md`  
> **目標**：將現有遊戲實現對齊到設計文檔規範  
> **生成時間**：2025-01-XX

---

## 📋 更新計劃概覽

| 優先級 | 系統 | 當前狀態 | 目標狀態 | 工作量 |
|--------|------|----------|----------|--------|
| ⭐⭐⭐ | 記憶系統 | 點擊直接收集 | 答題驗證解鎖 | 大 |
| ⭐⭐⭐ | 資源系統 | tear/stone | pearl（絳珠）/stone（靈石） | 中 |
| ⭐⭐⭐ | 行動消耗 | 尋找記憶消耗行動力 | 答題不消耗行動力 | 中 |
| ⭐⭐⭐ | 記憶數據結構 | 缺少回目、題目 | 完整結構 | 大 |
| ⭐⭐ | UI 更新 | 基本 UI | 對齊設計文檔 | 中 |
| ⭐⭐ | 花魂系統 | 基本實現 | 對齊設計文檔 | 小 |

---

## 一、核心系統重構（優先級：⭐⭐⭐）

### 1.1 記憶系統重構

#### 🔴 當前問題

1. **記憶收集機制不符合設計**
   - ❌ 當前：點擊記憶直接收集，沒有驗證機制
   - ✅ 目標：必須通過答題驗證才能解鎖記憶

2. **記憶數據結構不完整**
   - ❌ 當前：缺少 `relatedChapter`、`questions`、`baseReward`、`type`（pearl/stone）
   - ✅ 目標：完整的記憶結構，包含回目對應、題目數組、資源獎勵

3. **記憶類型混淆**
   - ❌ 當前：使用 `type: "tear"` 或 `type: "stone"`
   - ✅ 目標：使用 `type: "pearl"`（黛玉相關，獲得絳珠）和 `type: "stone"`（寶玉相關，獲得靈石）

#### ✅ 需要實施的更改

**1. 更新記憶數據結構**（`state.js`）

```javascript
// 舊結構（需要替換）
{
  id: "daiyu-first-entry",
  name: "初入榮府",
  type: "tear",  // ❌ 錯誤
  collected: false,
  content: "...",
  relatedTear: "first-tear"
}

// 新結構（對齊設計文檔）
{
  id: "memory_daiyu_001",
  storyLineId: "daiyu_main",
  orderIndex: 1,
  name: "初入榮府",
  type: "pearl",  // ✅ pearl 類記憶（黛玉相關）
  relatedCharacter: "林黛玉",
  relatedScene: "榮國府",
  relatedChapter: 3,  // ✅ 對應第 3 回
  readingRequired: true,
  readingVerified: false,
  unlocked: false,
  questions: [  // ✅ 每個記憶包含 3 個題目
    {
      question: "這回中，黛玉初入榮國府時，第一個見到的主要人物是誰？",
      options: ["賈寶玉", "王夫人", "賈母", "賈政"],
      correct: 2  // 賈母
    },
    {
      question: "黛玉在榮國府的第一餐，因為什麼原因沒有吃飽？",
      options: ["飯菜不合口味", "不敢多吃", "身體不適", "被其他人打擾"],
      correct: 1  // 不敢多吃
    },
    {
      question: "這回中，黛玉初見寶玉時，寶玉說了什麼話？",
      options: ["這個妹妹我曾見過的", "妹妹從哪裡來", "妹妹好", "妹妹請坐"],
      correct: 0  // 這個妹妹我曾見過的
    }
  ],
  baseReward: 10,  // ✅ 基礎絳珠獎勵
  pearlReward: 10,  // ✅ 完成後獲得的絳珠數量
  text: "原文摘錄..."
}
```

**2. 實作答題驗證系統**（新建 `js/memory-quiz.js`）

- [ ] 創建答題 UI 組件
- [ ] 實作題目顯示邏輯（每個記憶 3 個題目）
- [ ] 實作答題計時（每個題目 30 秒限制）
- [ ] 實作答錯重試機制（記錄答錯次數）
- [ ] 實作資源計算系統（時間獎勵/懲罰 + 答錯懲罰）
- [ ] 實作連續答題機制（必須連續答對所有 3 個題目）

**3. 更新記憶收集流程**（`main.js`）

```javascript
// 舊流程（需要替換）
function collectMemory(memoryId) {
  // 直接收集記憶
  memory.collected = true;
  // 直接獲得資源
  gameData.resources.tear += memory.tearValue;
}

// 新流程（對齊設計文檔）
function unlockMemory(memoryId) {
  const memory = gameData.memories.find(m => m.id === memoryId);
  
  // 1. 檢查是否已解鎖
  if (memory.unlocked) return;
  
  // 2. 檢查閱讀要求（relatedChapter）
  if (memory.readingRequired && !memory.readingVerified) {
    // 顯示答題界面
    showMemoryQuiz(memory);
    return;
  }
  
  // 3. 答題完成後解鎖記憶
  memory.unlocked = true;
  
  // 4. 計算資源獎勵（根據答題表現）
  const reward = calculateMemoryReward(memory);
  
  // 5. 給予資源
  if (memory.type === "pearl") {
    gameData.resources.pearl += reward;
  } else if (memory.type === "stone") {
    gameData.resources.stone += reward;
  }
}
```

**4. 實作回目、回憶、題目與節氣的對應關係**

- [ ] 創建回目數據結構（`data/chapters.json`）
- [ ] 實作「一個回目對應多個節氣」的邏輯
- [ ] 實作「每個節氣解鎖一個回憶」的機制
- [ ] 實作「連續分佈」邏輯（一個回目的所有回憶連續分佈）

**5. 更新記憶列表 UI**（`index.html` + `main.js`）

- [ ] 顯示記憶狀態（已解鎖/未解鎖）
- [ ] 標註「第 X 回的記憶」（隱性化設計）
- [ ] 點擊未解鎖記憶時顯示答題界面
- [ ] 顯示閱讀進度提示

---

### 1.2 資源系統重構

#### 🔴 當前問題

1. **資源命名不一致**
   - ❌ 當前：`tear`（絳珠）
   - ✅ 目標：`pearl`（絳珠，統一資源）

2. **資源獲取方式不符合設計**
   - ❌ 當前：通過「尋找絳珠」行動生成記憶，點擊收集
   - ✅ 目標：通過答題解鎖記憶獲得資源（不消耗行動力）

3. **資源類型混淆**
   - ❌ 當前：`type: "tear"` 記憶對應淚水類型
   - ✅ 目標：`type: "pearl"` 記憶獲得絳珠（統一資源，不分類型）

#### ✅ 需要實施的更改

**1. 更新資源數據結構**（`state.js`）

```javascript
// 舊結構（需要替換）
resources: {
  stone: 5,
  tear: 1,  // ❌ 錯誤命名
  memory: 0
}

// 新結構（對齊設計文檔）
resources: {
  stone: 5,  // ✅ 靈石（用於解鎖建築）
  pearl: 1   // ✅ 絳珠（統一資源，用於澆灌所有花魂）
}
```

**2. 更新資源獲取邏輯**（`main.js`）

- [ ] 移除「尋找絳珠」行動（不再消耗行動力生成記憶）
- [ ] 移除「尋找寶玉領悟」行動（不再消耗行動力生成記憶）
- [ ] 實作「記憶發現機制」：記憶自動出現在 UI 中（不消耗行動力）
- [ ] 實作「答題解鎖記憶獲得資源」邏輯

**3. 更新資源顯示 UI**（`index.html`）

```html
<!-- 舊結構（需要替換） -->
<div class="status-item">
  <span class="status-icon">💧</span>絳珠
  <div class="status-value" id="tear-count">1</div>
</div>

<!-- 新結構（對齊設計文檔） -->
<div class="status-item">
  <span class="status-icon">💧</span>絳珠
  <div class="status-value" id="pearl-count">1</div>
</div>
```

**4. 更新所有資源引用**

- [ ] 將所有 `gameData.resources.tear` 改為 `gameData.resources.pearl`
- [ ] 將所有 `tear-count` 元素 ID 改為 `pearl-count`
- [ ] 更新 CSS 類名（如有）

---

### 1.3 行動消耗系統重構

#### 🔴 當前問題

1. **行動消耗不符合設計**
   - ❌ 當前：「尋找絳珠」消耗 1 點行動力，「尋找寶玉領悟」消耗 2 點行動力
   - ✅ 目標：答題解鎖記憶不消耗行動力，只有「使用資源進行行動」才消耗行動力

2. **行動按鈕不符合設計**
   - ❌ 當前：有「尋找絳珠」「尋找寶玉領悟」按鈕
   - ✅ 目標：移除這些按鈕，改為記憶列表中的答題解鎖機制

#### ✅ 需要實施的更改

**1. 更新行動消耗表**（`state.js`）

```javascript
// 舊結構（需要替換）
export const actionCosts = {
  collectTears: 1,      // ❌ 移除
  searchMemories: 2,     // ❌ 移除
  waterFlower: 1,        // ✅ 保留
  plantFlower: 2,        // ✅ 保留
  repairBuildingMin: 2,  // ⭐ 可延後
  repairBuildingMax: 3   // ⭐ 可延後
};

// 新結構（對齊設計文檔）
export const actionCosts = {
  waterFlower: 1,        // ✅ 澆灌花魂（消耗 1 點行動力）
  plantFlower: 2,        // ✅ 種植新花魂（消耗 2 點行動力）
  unlockBuilding: 0     // ✅ 解鎖建築（不消耗行動力，只消耗靈石）
};
```

**2. 移除舊的行動按鈕**（`index.html`）

```html
<!-- 舊結構（需要移除） -->
<button class="action-button" id="collect-tears">
  <span><span class="action-icon">💧</span>尋找絳珠</span>
  <span class="action-cost"><span class="cost-icon">⏱️</span>等待: 0</span>
</button>
<button class="action-button" id="search-memories">
  <span><span class="action-icon">🧠</span>尋找寶玉領悟</span>
  <span class="action-cost"><span class="cost-icon">💧</span>消耗: 2絳珠</span>
</button>

<!-- 新結構（對齊設計文檔） -->
<!-- 記憶列表中的答題解鎖機制（不消耗行動力） -->
```

**3. 更新行動流程**（`main.js`）

- [ ] 移除 `collectTears()` 函數
- [ ] 移除 `searchMemories()` 函數
- [ ] 實作「記憶發現機制」：記憶自動出現在記憶列表中
- [ ] 實作「答題解鎖記憶」流程（不消耗行動力）

**4. 更新每個節氣的完整循環**

```javascript
// 舊循環（需要替換）
每個節氣：
1. 推進節氣
2. 尋找絳珠（消耗行動力）→ 生成記憶
3. 點擊記憶 → 收集記憶 → 獲得資源
4. 使用資源行動（消耗行動力）

// 新循環（對齊設計文檔）
每個節氣：
1. 答題解鎖記憶（不消耗行動力）→ 獲得資源
2. 使用資源進行行動（消耗行動力）：
   - 解鎖建築（不消耗行動力，只消耗靈石）
   - 種植花魂（消耗 2 點行動力）
   - 澆灌花魂（消耗 1 點行動力，消耗絳珠）
3. 花魂升級 → 解鎖新記憶 → 回到步驟 1
```

---

## 二、數據結構更新（優先級：⭐⭐⭐）

### 2.1 記憶數據結構更新

#### ✅ 需要實施的更改

**1. 創建問題數據庫**（新建 `assets/data/reading-questions.json`）

```json
{
  "chapters": [
    {
      "chapter": 3,
      "title": "賈雨村夤緣復舊職 林黛玉拋父進京都",
      "memories": [
        {
          "id": "memory_daiyu_001",
          "name": "黛玉初入榮府",
          "type": "pearl",
          "questions": [
            {
              "question": "這回中，黛玉初入榮國府時，第一個見到的主要人物是誰？",
              "options": ["賈寶玉", "王夫人", "賈母", "賈政"],
              "correct": 2
            },
            {
              "question": "黛玉在榮國府的第一餐，因為什麼原因沒有吃飽？",
              "options": ["飯菜不合口味", "不敢多吃", "身體不適", "被其他人打擾"],
              "correct": 1
            },
            {
              "question": "這回中，黛玉初見寶玉時，寶玉說了什麼話？",
              "options": ["這個妹妹我曾見過的", "妹妹從哪裡來", "妹妹好", "妹妹請坐"],
              "correct": 0
            }
          ],
          "baseReward": 10
        }
      ],
      "seasonalCycles": 2
    }
  ]
}
```

**2. 更新記憶數據**（`state.js`）

- [ ] 將所有記憶的 `type: "tear"` 改為 `type: "pearl"`（黛玉相關）
- [ ] 添加 `relatedChapter` 屬性（對應回目）
- [ ] 添加 `questions` 數組（每個記憶 3 個題目）
- [ ] 添加 `baseReward` 屬性（基礎資源獎勵）
- [ ] 添加 `pearlReward` 或 `stoneReward` 屬性
- [ ] 移除 `relatedTear` 屬性（不再需要）

**3. 實作回目與節氣的對應關係**

- [ ] 創建回目數據結構
- [ ] 實作「一個回目對應多個節氣」的邏輯
- [ ] 實作「每個節氣解鎖一個回憶」的機制

---

### 2.2 花魂系統更新

#### 🔴 當前問題

1. **花魂數據結構基本正確**
   - ✅ 當前：有 `level`、`growth`、`growthToNext` 等屬性
   - ✅ 目標：保持現有結構，只需微調

2. **澆灌機制需要更新**
   - ❌ 當前：使用 `tearPreference`（特定淚水類型）
   - ✅ 目標：使用統一絳珠資源（`pearl`），不分類型

#### ✅ 需要實施的更改

**1. 更新花魂澆灌邏輯**（`main.js`）

```javascript
// 舊邏輯（需要替換）
function waterFlower(flowerId, tearId) {
  // 檢查淚水類型是否匹配
  if (!flower.tearPreference.includes(tearId)) {
    // 不匹配，無法澆灌
    return false;
  }
  // 消耗特定淚水
  gameData.resources.tears[tearId].collected = false;
}

// 新邏輯（對齊設計文檔）
function waterFlower(flowerId, pearlAmount) {
  // 檢查是否有足夠的絳珠
  if (gameData.resources.pearl < pearlAmount) {
    return false;
  }
  // 消耗統一絳珠資源
  gameData.resources.pearl -= pearlAmount;
  // 增加花魂成長值
  flower.growth += pearlAmount * growthMultiplier;
}
```

**2. 更新花魂數據結構**（`state.js`）

- [ ] 移除 `tearPreference` 屬性（不再需要）
- [ ] 更新澆灌邏輯使用統一絳珠資源

---

## 三、UI 更新（優先級：⭐⭐）

### 3.1 記憶列表 UI 更新

#### ✅ 需要實施的更改

**1. 更新記憶列表顯示**（`index.html` + `main.js`）

- [ ] 顯示記憶狀態（已解鎖/未解鎖）
- [ ] 標註「第 X 回的記憶」（隱性化設計）
- [ ] 點擊未解鎖記憶時顯示答題界面
- [ ] 顯示答題進度（已完成 X/3 題）

**2. 創建答題 UI 組件**（新建 `index.html` 答題對話框）

```html
<!-- 答題對話框 -->
<div class="quiz-dialog-overlay" id="quiz-dialog-overlay">
  <div class="quiz-dialog" id="quiz-dialog">
    <h3 class="quiz-title" id="quiz-title">第 X 回的記憶 - 回憶名稱</h3>
    <div class="quiz-progress" id="quiz-progress">題目 1/3</div>
    <div class="quiz-timer" id="quiz-timer">剩餘時間：30 秒</div>
    <div class="quiz-question" id="quiz-question">問題內容</div>
    <div class="quiz-options" id="quiz-options">
      <!-- 動態生成選項 -->
    </div>
    <div class="quiz-feedback" id="quiz-feedback"></div>
    <div class="quiz-actions">
      <button class="quiz-button" id="quiz-submit">提交答案</button>
    </div>
  </div>
</div>
```

**3. 更新記憶面板**（`index.html`）

- [ ] 移除「尋找絳珠」「尋找寶玉領悟」按鈕
- [ ] 更新記憶列表顯示邏輯
- [ ] 添加答題進度顯示

---

### 3.2 資源顯示 UI 更新

#### ✅ 需要實施的更改

**1. 更新資源顯示**（`index.html`）

```html
<!-- 舊結構（需要替換） -->
<div class="status-item">
  <div class="status-label">
    <span class="status-icon">💧</span>絳珠
  </div>
  <div class="status-value" id="tear-count">1</div>
</div>

<!-- 新結構（對齊設計文檔） -->
<div class="status-item">
  <div class="status-label">
    <span class="status-icon">💧</span>絳珠
  </div>
  <div class="status-value" id="pearl-count">1</div>
</div>
```

**2. 更新所有資源引用**（`main.js`）

- [ ] 將所有 `tear-count` 元素 ID 改為 `pearl-count`
- [ ] 將所有 `gameData.resources.tear` 改為 `gameData.resources.pearl`
- [ ] 更新資源變化動畫邏輯

---

## 四、功能實作清單（優先級：⭐⭐⭐）

### 4.1 MVP 必做功能

#### ✅ 核心系統

- [ ] **答題驗證系統**
  - [ ] 創建答題 UI 組件
  - [ ] 實作題目顯示邏輯（每個記憶 3 個題目）
  - [ ] 實作答題計時（每個題目 30 秒限制）
  - [ ] 實作答錯重試機制（記錄答錯次數）
  - [ ] 實作資源計算系統（時間獎勵/懲罰 + 答錯懲罰）
  - [ ] 實作連續答題機制（必須連續答對所有 3 個題目）

- [ ] **記憶系統重構**
  - [ ] 更新記憶數據結構（添加 `relatedChapter`、`questions`、`baseReward`）
  - [ ] 實作「記憶發現機制」（記憶自動出現在 UI 中）
  - [ ] 實作「答題解鎖記憶」流程（不消耗行動力）
  - [ ] 實作「回目、回憶、題目與節氣的對應關係」

- [ ] **資源系統重構**
  - [ ] 將 `tear` 改為 `pearl`（統一資源）
  - [ ] 更新資源獲取邏輯（通過答題解鎖記憶獲得）
  - [ ] 更新資源顯示 UI

- [ ] **行動消耗系統重構**
  - [ ] 移除「尋找絳珠」「尋找寶玉領悟」按鈕
  - [ ] 實作「答題解鎖記憶不消耗行動力」邏輯
  - [ ] 更新每個節氣的完整循環

#### ✅ 數據結構

- [ ] **問題數據庫**
  - [ ] 創建 `assets/data/reading-questions.json`
  - [ ] 為前 20 回準備問題（MVP 階段）
  - [ ] 每個回憶包含 3 個題目

- [ ] **記憶數據更新**
  - [ ] 更新所有記憶的 `type`（`pearl` 或 `stone`）
  - [ ] 添加 `relatedChapter` 屬性
  - [ ] 添加 `questions` 數組
  - [ ] 添加 `baseReward` 屬性

- [ ] **回目數據結構**
  - [ ] 創建回目數據結構
  - [ ] 實作「一個回目對應多個節氣」的邏輯
  - [ ] 實作「每個節氣解鎖一個回憶」的機制

#### ✅ UI 更新

- [ ] **記憶列表 UI**
  - [ ] 顯示記憶狀態（已解鎖/未解鎖）
  - [ ] 標註「第 X 回的記憶」
  - [ ] 點擊未解鎖記憶時顯示答題界面

- [ ] **答題 UI**
  - [ ] 創建答題對話框
  - [ ] 顯示題目和選項
  - [ ] 顯示答題進度和時間倒計時
  - [ ] 顯示答錯次數和資源獲得比例

- [ ] **資源顯示 UI**
  - [ ] 更新資源顯示（`pearl` 替代 `tear`）
  - [ ] 更新資源變化動畫

---

### 4.2 可延後功能

- [ ] 多角色花魂（寶釵、湘雲、探春）
- [ ] 鳥靈系統
- [ ] DeepSeek AI 整合
- [ ] 複雜佈局 buff
- [ ] 隨機事件系統
- [ ] 音效與動畫
- [ ] 教學引導更新

---

## 五、實施順序建議

### 階段一：數據結構更新（1-2 天）

1. 更新資源數據結構（`tear` → `pearl`）
2. 更新記憶數據結構（添加 `relatedChapter`、`questions`、`baseReward`）
3. 創建問題數據庫（`assets/data/reading-questions.json`）
4. 更新所有資源引用

### 階段二：核心系統重構（3-5 天）

1. 實作答題驗證系統（`js/memory-quiz.js`）
2. 更新記憶收集流程（移除直接收集，改為答題解鎖）
3. 實作「記憶發現機制」（記憶自動出現在 UI 中）
4. 實作「回目、回憶、題目與節氣的對應關係」

### 階段三：行動消耗系統重構（1-2 天）

1. 移除「尋找絳珠」「尋找寶玉領悟」按鈕
2. 更新行動消耗邏輯（答題不消耗行動力）
3. 更新每個節氣的完整循環

### 階段四：UI 更新（2-3 天）

1. 創建答題 UI 組件
2. 更新記憶列表 UI
3. 更新資源顯示 UI
4. 測試和調試

---

## 六、注意事項

### 6.1 設計文檔對齊原則

1. **嚴格對齊設計文檔**
   - 所有更改必須對齊 `GAME_REDESIGN_PLAN copy.md`
   - 如有疑問，優先參考設計文檔

2. **MVP 優先級**
   - 優先實作 MVP 必做功能
   - 可延後功能標記清楚，不影響 MVP 進度

3. **隱性化設計**
   - 閱讀系統隱性化：不在遊戲中明確告訴玩家「去閱讀」
   - 題目提示回目：題目會顯示「第 X 回的記憶」
   - 自然引導：玩家為了答對題目，自然會去閱讀

### 6.2 技術實現注意事項

1. **資源計算系統**
   - 時間獎勵/懲罰：10 秒內 +10%，25-30 秒 -10%，超過 30 秒 0%
   - 答錯懲罰：第一次答對 100%，答錯 1 次後 80%，答錯 2 次後 60%，依此類推
   - 組合效果：時間係數 × 答錯係數

2. **連續答題機制**
   - 每個記憶包含 3 個題目（固定數量）
   - 必須連續答對所有 3 個題目才能解鎖回憶
   - 每個題目獨立計算資源，最終資源 = 所有題目的資源總和

3. **回目與節氣的對應**
   - 一個回目對應多個節氣（根據回憶數量）
   - 每個節氣解鎖一個回憶
   - 一個回目的所有回憶要連續分佈在多個節氣中

---

## 七、測試檢查清單

### 7.1 功能測試

- [ ] 答題驗證系統正常工作
- [ ] 記憶解鎖流程正確（答題 → 解鎖 → 獲得資源）
- [ ] 資源計算正確（時間獎勵/懲罰 + 答錯懲罰）
- [ ] 行動消耗正確（答題不消耗行動力，行動消耗行動力）
- [ ] 記憶發現機制正常工作（記憶自動出現在 UI 中）

### 7.2 UI 測試

- [ ] 記憶列表顯示正確（狀態、回目標註）
- [ ] 答題界面顯示正確（題目、選項、進度、時間）
- [ ] 資源顯示正確（`pearl` 替代 `tear`）
- [ ] 資源變化動畫正常

### 7.3 數據測試

- [ ] 記憶數據結構正確（`relatedChapter`、`questions`、`baseReward`）
- [ ] 問題數據庫正確（每個回憶 3 個題目）
- [ ] 回目與節氣的對應關係正確

---

**文檔版本**：v1.0  
**最後更新**：2025-01-XX  
**維護者**：太虛幻境開發團隊

