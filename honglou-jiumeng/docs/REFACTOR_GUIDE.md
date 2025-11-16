# main.js 重構指南

## 當前狀態
- `main.js` 有 3322 行，包含所有遊戲邏輯
- 所有功能都在一個文件中，難以維護

## 已創建的模塊

### ✅ 已完成模塊
1. **`js/core/elements.js`** - DOM 元素管理器
   - `initElements()` - 初始化所有 DOM 元素
   - `getElements()` - 獲取元素對象
   - `resetElements()` - 重置緩存

2. **`js/core/action-points.js`** - 行動力系統
   - `initializeActionCostLabels()` - 初始化行動消耗標籤
   - `updateActionPointsUI()` - 更新行動力 UI
   - `consumeActionPoints()` - 消耗行動力
   - `resetActionPoints()` - 重置行動力

3. **`js/ui/dialogs.js`** - 對話框系統
   - `showDialog()` - 顯示通用對話框
   - `hideDialog()` - 隱藏對話框
   - `showMemoryDialog()` - 顯示記憶對話框
   - `hideMemoryDialog()` - 隱藏記憶對話框
   - `showRpgDialog()` - 顯示 RPG 風格對話框

4. **`js/ui/hints.js`** - 提示系統
   - `showHint()` - 顯示提示
   - `removeHint()` - 移除提示

5. **`js/ui/display.js`** - UI 顯示更新
   - `updateResourceDisplay()` - 更新資源顯示
   - `updateCycleProgress()` - 更新輪迴進度條
   - `getConditionText()` - 獲取建築狀態文本

6. **`js/utils/helpers.js`** - 工具函數
   - `getConditionText()` - 獲取建築狀態文本
   - `detectDarkMode()` - 檢測暗黑模式

## 遷移策略

### 方案 A：漸進式遷移（推薦）

**優點**：
- 風險低，可以逐步測試
- 不影響現有功能
- 可以隨時回退

**步驟**：
1. 在 `main.js` 中導入新模塊
2. 逐步將函數遷移到對應模塊
3. 在 `main.js` 中調用新模塊的函數
4. 測試確保功能正常
5. 移除 `main.js` 中的舊函數

### 方案 B：一次性重構（不推薦）

**缺點**：
- 風險高，可能破壞現有功能
- 難以測試和調試
- 需要大量時間

## 下一步遷移計劃

### 階段一：更新 main.js 使用新模塊（已完成基礎）

```javascript
// 在 main.js 開頭添加導入
import { initElements, getElements } from './core/elements.js';
import { initializeActionCostLabels, updateActionPointsUI, consumeActionPoints, resetActionPoints } from './core/action-points.js';
import { showDialog, hideDialog, showMemoryDialog, hideMemoryDialog, showRpgDialog } from './ui/dialogs.js';
import { showHint, removeHint } from './ui/hints.js';
import { updateResourceDisplay, updateCycleProgress } from './ui/display.js';
import { detectDarkMode } from './utils/helpers.js';

// 在 initializeGame() 開頭替換 elements 初始化
const elements = initElements(); // 替代原來的 elements 對象定義
```

### 階段二：遷移 UI 相關模塊（優先級：高）

**目標模塊**：
- `ui/lists.js` - 列表更新（updateLists）
- `ui/menu.js` - 菜單系統（toggleMenu, closeMenu, showCurrentGoals, showPanelHelp）
- `ui/tutorial.js` - 教學系統（startTutorial, showTutorialStep 等）

**遷移步驟**：
1. 創建新模塊文件
2. 將函數複製到新模塊
3. 添加必要的導入（elements, gameData 等）
4. 在 `main.js` 中導入並使用新函數
5. 測試功能
6. 移除 `main.js` 中的舊函數

### 階段三：遷移遊戲邏輯模塊（優先級：中）

**目標模塊**：
- `game/garden.js` - 園林系統（initGarden, handleCellClick）
- `game/flowers.js` - 花魂系統（showWateringDialog, waterFlowerWithTear, plantFlower, checkSpecialInteractions）
- `game/buildings.js` - 建築系統（showBuildDialog, buildStructure, repairBuilding）
- `game/memories.js` - 記憶系統（collectMemory, spawnMemory, checkStoryLineMilestones）
- `game/seasons.js` - 節氣系統（advanceJieqi）
- `game/actions.js` - 行動系統（collectTears, searchMemories, getRandomSearchFailMessage）
- `game/events.js` - 事件系統（checkEvents, triggerWhiteFade, resetGame）

### 階段四：遷移工具模塊（優先級：低）

**目標模塊**：
- `utils/suggestions.js` - 建議系統（updateSuggestedActions, showSuggestion, executeRecommendedAction, checkIdleTime）

## 注意事項

### 1. 依賴關係
- 所有模塊都需要 `elements`（通過 `getElements()` 獲取）
- 所有模塊都需要 `gameData`（通過 `import` 導入）
- 模塊間可能有相互調用，需要仔細處理

### 2. 函數調用
- 遷移函數時，需要確保所有調用都更新
- 可以使用全局搜索查找所有調用點

### 3. 測試
- 每個模塊遷移後都要測試
- 確保功能完全正常後再移除舊代碼

### 4. 循環依賴
- 避免模塊間的循環依賴
- 如果必須，使用動態導入（`import().then()`）

## 示例：遷移一個函數

### 原代碼（main.js）
```javascript
function showHint(title, message, icon = '💡') {
  if (!elements.hintContainer) return;
  // ... 實現
}
```

### 遷移後（ui/hints.js）
```javascript
import { getElements } from '../core/elements.js';

export function showHint(title, message, icon = '💡') {
  const elements = getElements();
  if (!elements.hintContainer) return;
  // ... 實現
}
```

### 更新 main.js
```javascript
// 導入新模塊
import { showHint } from './ui/hints.js';

// 移除舊的 showHint 函數定義
// 直接使用導入的函數
```

## 當前進度

- [x] 創建基礎模塊結構
- [x] 創建 elements.js（DOM 元素管理器）
- [x] 創建 action-points.js（行動力系統）
- [x] 創建 dialogs.js（對話框系統）
- [x] 創建 hints.js（提示系統）
- [x] 創建 display.js（UI 顯示更新）
- [x] 創建 helpers.js（工具函數）
- [ ] 更新 main.js 使用新模塊
- [ ] 遷移 UI 相關模塊
- [ ] 遷移遊戲邏輯模塊
- [ ] 遷移工具模塊
- [ ] 清理和優化

## 建議

1. **先更新 main.js**：導入新模塊，替換 elements 初始化
2. **逐步遷移**：一次遷移一個模塊，測試後再繼續
3. **保持兼容**：遷移時保留舊函數，確保可以回退
4. **文檔更新**：每個模塊遷移後更新文檔

