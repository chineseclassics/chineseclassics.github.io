# main.js 重構步驟

## 立即可以執行的步驟

### 步驟 1：更新 main.js 使用新模塊（5 分鐘）

在 `main.js` 開頭添加導入，並替換 elements 初始化：

```javascript
// 在文件開頭添加
import { initElements, getElements } from './core/elements.js';
import { initializeActionCostLabels, updateActionPointsUI, consumeActionPoints, resetActionPoints } from './core/action-points.js';
import { showDialog, hideDialog, showMemoryDialog, hideMemoryDialog, showRpgDialog } from './ui/dialogs.js';
import { showHint, removeHint } from './ui/hints.js';
import { updateResourceDisplay, updateCycleProgress } from './ui/display.js';
import { detectDarkMode } from './utils/helpers.js';

// 在 initializeGame() 函數開頭，替換：
// 舊代碼：
// const elements = { ... };

// 新代碼：
const elements = initElements();
```

### 步驟 2：替換已遷移的函數調用（10 分鐘）

在 `main.js` 中查找並替換以下函數的調用：

1. **行動力相關**：
   - `initializeActionCostLabels()` → 已遷移，直接使用
   - `updateActionPointsUI()` → 已遷移，直接使用
   - `consumeActionPoints()` → 已遷移，直接使用
   - `resetActionPoints()` → 已遷移，直接使用

2. **對話框相關**：
   - `showDialog()` → 已遷移，直接使用
   - `hideDialog()` → 已遷移，直接使用
   - `showMemoryDialog()` → 已遷移，直接使用
   - `hideMemoryDialog()` → 已遷移，直接使用
   - `showRpgDialog()` → 已遷移，直接使用

3. **提示相關**：
   - `showHint()` → 已遷移，直接使用
   - `removeHint()` → 已遷移，直接使用

4. **顯示相關**：
   - `updateResourceDisplay()` → 已遷移，直接使用
   - `updateCycleProgress()` → 已遷移，直接使用
   - `getConditionText()` → 已遷移，直接使用

5. **工具函數**：
   - `detectDarkMode()` → 已遷移，直接使用

### 步驟 3：移除 main.js 中的舊函數定義（5 分鐘）

在 `main.js` 中查找並刪除以下函數的定義（因為已經遷移到模塊中）：

- `initializeActionCostLabels()`
- `updateActionPointsUI()`
- `updateActionButtonsState()`（內部函數，已包含在 action-points.js）
- `consumeActionPoints()`
- `handleActionPointDepletion()`（內部函數，已包含在 action-points.js）
- `resetActionPoints()`
- `showDialog()`
- `hideDialog()`
- `showMemoryDialog()`
- `hideMemoryDialog()`
- `showRpgDialog()`
- `showHint()`
- `removeHint()`
- `updateResourceDisplay()`
- `updateCycleProgress()`
- `getConditionText()`
- `detectDarkMode()`

## 驗證步驟

1. **測試遊戲啟動**：確保遊戲可以正常啟動
2. **測試行動力系統**：確保行動力消耗和恢復正常
3. **測試對話框**：確保所有對話框正常顯示
4. **測試提示系統**：確保提示正常顯示和消失
5. **測試資源顯示**：確保資源數字正確更新

## 預期結果

完成後，`main.js` 應該：
- 減少約 500-800 行代碼
- 使用模塊化的函數
- 保持所有功能正常

## 下一步

完成步驟 1-3 後，可以繼續遷移其他模塊：
- `ui/lists.js` - 列表更新
- `ui/menu.js` - 菜單系統
- `ui/tutorial.js` - 教學系統
- `game/*` - 遊戲邏輯模塊

