# main.js 重構計劃

## 目標
將 `main.js`（3322 行）安全地拆分為多個模塊，提高代碼可維護性和可讀性。

## 拆分策略

### 原則
1. **保持功能完整性**：拆分後功能不變
2. **最小化依賴**：模塊間依賴清晰
3. **向後兼容**：不破壞現有代碼
4. **漸進式重構**：可以逐步遷移

### 模塊劃分

```
js/
├── main.js                    # 主入口（簡化後，只負責初始化）
├── core/
│   ├── elements.js           # DOM 元素管理器
│   └── action-points.js      # 行動力系統
├── game/
│   ├── garden.js             # 園林系統（格子、點擊處理）
│   ├── flowers.js            # 花魂系統（澆灌、種植、成長）
│   ├── buildings.js          # 建築系統（建造、修復）
│   ├── memories.js           # 記憶系統（收集、生成、劇情線）
│   ├── seasons.js            # 節氣系統（推進、事件）
│   └── actions.js            # 行動系統（收集絳珠、尋找記憶）
├── ui/
│   ├── dialogs.js           # 對話框系統
│   ├── lists.js             # 列表更新
│   ├── display.js           # 資源顯示更新
│   ├── hints.js             # 提示系統
│   ├── tutorial.js          # 教學系統
│   └── menu.js              # 菜單系統
└── utils/
    ├── suggestions.js       # 建議系統
    └── helpers.js          # 工具函數
```

## 實施步驟

### 階段一：創建基礎模塊（不影響現有代碼）
1. 創建 `core/elements.js` - DOM 元素管理器
2. 創建各模塊文件結構
3. 將函數遷移到對應模塊（保持 `main.js` 中的函數暫時保留）

### 階段二：逐步遷移（測試每個模塊）
1. 遷移 UI 相關模塊（dialogs, hints, menu）
2. 遷移遊戲邏輯模塊（garden, flowers, buildings）
3. 遷移系統模塊（memories, seasons, actions）

### 階段三：清理和優化
1. 移除 `main.js` 中的舊函數
2. 優化模塊間依賴
3. 更新文檔

## 依賴關係

```
main.js
  ├── core/elements.js (DOM 元素)
  ├── core/action-points.js (行動力)
  ├── game/* (遊戲邏輯，依賴 elements 和 gameData)
  ├── ui/* (UI 更新，依賴 elements 和 gameData)
  └── utils/* (工具函數)
```

## 注意事項

1. **elements 對象**：所有模塊都需要訪問 DOM 元素，可以：
   - 方案 A：將 elements 作為參數傳遞
   - 方案 B：創建統一的元素管理器（推薦）

2. **gameData 依賴**：所有模塊都需要訪問遊戲狀態，通過 `import` 導入

3. **函數間調用**：需要仔細處理模塊間的函數調用

4. **測試**：每個模塊遷移後都要測試，確保功能正常

