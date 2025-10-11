# 設置化詞表系統重構總結

## 🎯 實施目標

將詞表選擇從遊戲開始界面移入設置頁面，簡化遊戲流程，並集成自定義詞表上傳功能。

## ✅ 已完成的工作

### 1. 設置頁面全面改造（`settings.html`）

**核心改進**：
- 統一下拉菜單：將AI智能推薦、系統詞表、自定義詞表整合在一個下拉框中
- 集成上傳功能：點擊"➕ 添加自定義詞表"時，打開模態窗口進行上傳
- 模態窗口包含：
  - 詞表名稱輸入（必填）
  - 詞表描述（可選）
  - CSV模板下載
  - 文件拖拽上傳區
  - 實時進度條顯示導入進度

**功能特點**：
- 自動解析CSV文件（詞語、第二層級、第三層級）
- 自動創建層級標籤
- 自動檢測已有詞彙，避免重複
- 批量導入（每批50個詞，顯示進度）

### 2. 初始創作界面重構（`index.html`）

**UI結構**：
```
開始界面
├── AI模式區域（默認隱藏）
│   └── 歡迎文字 + AI提示
├── 詞表層級選擇區域（默認隱藏）
│   ├── 第二層級卡片網格
│   └── 第三層級卡片網格（點擊第二層級後展開）
├── 主題選擇（始終顯示）
└── 開始按鈕 + 底部提示
    └── "當前詞表：XXX | [更換]"
```

**特點**：
- 移除了舊的詞表選擇器組件
- 根據用戶設置動態顯示：AI模式 或 層級卡片
- 層級卡片復用原有的 `.level-card` 樣式（L1-L6）

### 3. 新增層級卡片渲染模塊（`js/ui/hierarchy-cards.js`）

**功能**：
- `renderLevel2Cards()` - 渲染第二層級卡片
- `renderLevel3Cards()` - 渲染第三層級卡片（點擊第二層級後觸發）
- `clearHierarchyCards()` - 清空層級選擇
- `getSelectedHierarchy()` - 獲取當前選中的層級

**交互邏輯**：
- 點擊第二層級卡片 → 更新選中狀態 → 保存到 `gameState.level2Tag`
- 檢查是否有第三層級 → 有則展開，無則隱藏
- 點擊第三層級卡片 → 保存到 `gameState.level3Tag`

### 4. 啟動界面初始化邏輯升級（`js/ui/screens.js`）

**`initStartScreen()` 改為異步函數**：
1. 獲取當前用戶
2. 查詢用戶的詞表偏好設置（`user_wordlist_preferences`）
3. 根據偏好決定顯示模式：
   - **AI模式**：`default_mode === 'ai'` 或 `default_wordlist_id` 為空
   - **詞表模式**：加載詞表和標籤，渲染層級卡片
4. 更新 `gameState` 中的詞表狀態
5. 更新底部詞表名稱顯示

**新增輔助函數**：
- `showAIMode()` - 顯示AI模式區域，隱藏層級區域
- `showWordlistHierarchy()` - 顯示層級區域，隱藏AI模式
- `updateWordlistNameDisplay(name)` - 更新底部詞表名稱

### 5. 遊戲啟動邏輯簡化（`js/app.js`）

**`handleStartGame()` 函數重構**：
- 移除對 `wordlistSelector` 組件的依賴
- 直接從 `gameState` 讀取詞表配置（已在 `initStartScreen()` 中設置）
- 僅驗證：如果顯示了第二層級卡片，必須選擇層級
- 不再需要手動讀取UI或保存設置

**移除的代碼**：
- 導入 `wordlistSelector`
- 初始化 `wordlistSelector.initialize()`
- 渲染 `wordlistSelector.render()`

### 6. 文件清理

**已刪除文件**：
- ❌ `js/ui/wordlist-selector.js` - 功能已移至設置頁面
- ❌ `admin/upload-custom-wordlist.html` - 功能已集成到設置頁面的模態窗口

### 7. 數據流

```
用戶設置流程：
settings.html
  ↓ 用戶選擇詞表並保存
user_wordlist_preferences 表
  ↓
initStartScreen() 讀取設置
  ↓
gameState（wordlistMode, wordlistId, level2Tag, level3Tag）
  ↓
handleStartGame() 驗證並開始遊戲
  ↓
vocab-recommender Edge Function（根據詞表參數推薦詞彙）
```

## 📊 已完成的TODO項目

✅ 改造 `settings.html`，添加統一下拉菜單和上傳模態窗口  
✅ 在 `settings.html` 內嵌所有上傳邏輯，無需單獨的 JS 文件  
✅ 創建 `js/ui/hierarchy-cards.js`，處理層級卡片渲染  
✅ 修改 `index.html`，添加AI模式區域和層級卡片區域  
✅ 修改 `js/ui/screens.js`，動態顯示AI或層級模式  
✅ 修改 `js/app.js`，簡化 `handleStartGame()` 邏輯  
✅ 刪除 `js/ui/wordlist-selector.js` 和 `admin/upload-custom-wordlist.html`  

## 🧪 測試建議

### 本地測試流程

1. **啟動本地服務器**（如果還沒啟動）：
   ```bash
   cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/story-vocab
   python3 -m http.server 8000
   ```

2. **測試設置頁面**：
   - 訪問 `http://localhost:8000/settings.html`
   - 驗證下拉菜單是否正確顯示 AI智能推薦、系統詞表、自定義詞表
   - 點擊"➕ 添加自定義詞表"，確認模態窗口打開
   - 下載CSV模板，編輯後上傳測試

3. **測試主遊戲界面**：
   - 訪問 `http://localhost:8000/index.html`
   - **情況A - 默認AI模式**：
     - 底部顯示"當前詞表：AI智能推薦"
     - 顯示AI歡迎信息
     - 可直接選擇主題並開始遊戲
   - **情況B - 選擇系統/自定義詞表後**：
     - 底部顯示"當前詞表：XXX"
     - 如果詞表有層級，顯示層級卡片網格
     - 點擊第二層級卡片，展開第三層級（如果有）
     - 選擇層級後，點擊開始按鈕

4. **測試詞彙推薦**：
   - 開始遊戲後，檢查瀏覽器控制台：
     - 確認打印"詞表模式"、"詞表ID"、"層級2"、"層級3"
   - 驗證推薦的詞彙是否符合選定的詞表和層級

5. **測試設置持久化**：
   - 在設置頁面選擇詞表並保存
   - 返回主頁，刷新頁面
   - 確認顯示的詞表名稱與設置一致

## 🔍 關鍵技術點

1. **統一下拉菜單設計**：
   - 使用 `<optgroup>` 分組（系統詞表 / 我的詞表）
   - 特殊選項 `value="__add_custom__"` 觸發模態窗口
   - 選擇後重置回當前值，避免視覺混亂

2. **模態窗口實現**：
   - 純CSS控制顯示/隱藏（`.modal-overlay.active`）
   - 拖拽上傳區域支持點擊和拖放
   - 實時進度條反饋（10%檔案讀取 → 30%創建詞表 → 40%標籤 → 90%導入完成）

3. **層級卡片復用**：
   - 直接使用 `.level-card` 類名，復用L1-L6的樣式
   - 使用 `data-tag` 屬性存儲標籤代碼
   - 事件委托處理點擊和選中狀態

4. **異步初始化**：
   - `initStartScreen()` 改為 `async`，等待數據加載
   - 錯誤處理：網絡失敗時自動降級到AI模式
   - 用戶體驗：底部顯示"加載中..." → 實際詞表名稱

## 🚀 後續可優化項

- [ ] 添加詞表預覽功能（在設置頁面查看詞表內容）
- [ ] 支持在設置頁面編輯已有詞表的層級結構
- [ ] 添加詞表分享功能（導出為CSV，供其他用戶使用）
- [ ] 優化模態窗口的響應式設計（移動端適配）
- [ ] 添加詞表統計信息（詞數、層級數、最後更新時間）

## 📝 開發注意事項

1. `settings.html` 是完全獨立的頁面，所有邏輯都在內嵌 script 中
2. `hierarchy-cards.js` 需要在 `screens.js` 中導入
3. `gameState` 中的詞表字段會在 `initStartScreen()` 中初始化，無需手動設置
4. 刪除舊文件後，確保沒有其他地方引用這些文件

---

**實施日期**：2025-10-10  
**實施狀態**：✅ 已完成核心功能，待測試

