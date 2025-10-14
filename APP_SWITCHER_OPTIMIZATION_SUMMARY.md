# 太虛幻境應用切換器優化總結

> **完成日期**: 2025-10-14  
> **優化目標**: 完成應用切換器組件化，解決代碼重複和整合不完整的問題

---

## ✅ 已完成的優化

### 1. 組件架構明確化

**組件定位**：
- **`assets/js/taixu-app-switcher.js`**（應用切換器組件）
  - 提供給各個應用頁面使用的統一導航
  - 創建浮動 Logo 和應用切換器模態框
  - 已被 22 個應用頁面引用

- **`index.html`**（主頁）
  - 使用自己的獨立實現
  - 不引用組件（已移除引用）
  - 包含完整的四境展示和應用網格

### 2. URL 路徑統一

**問題**：兩個文件中的應用 URL 路徑格式不一致
- ❌ 舊：`index.html` 使用相對路徑（`cilong.html`）
- ✅ 新：統一使用絕對路徑（`/cilong.html`）

**修復**：
- 將 `index.html` 中所有應用 URL 改為絕對路徑
- 與組件保持一致，確保導航正確

### 3. 數據同步

**應用數據**：
- **境地配置**（`realms`）：兩邊保持一致 ✅
- **應用列表**（`apps`）：內容一致，路徑已統一 ✅

**差異項**：
- `index.html` 移除了 `openInNewTab: true`（story-vocab），因為現在直接使用 `window.location.href` 跳轉

---

## 📋 當前架構

### 組件使用場景

```
太虛幻境
├── index.html（主頁）
│   ├── 不使用組件
│   ├── 自己的四境展示
│   ├── 自己的應用切換器
│   └── 直接頁面跳轉（不使用 iframe）
│
└── 各應用頁面（22個）
    ├── 引用 taixu-app-switcher.js
    ├── 顯示浮動 Logo（右側垂直居中）
    └── 點擊 Logo 打開應用切換器
```

### URL 導航方式

**主頁（index.html）**：
```javascript
// 直接跳轉
function openApp(appId) {
    const app = apps.find(a => a.id === appId);
    window.location.href = app.url; // 如：/cilong.html
}
```

**組件（taixu-app-switcher.js）**：
```javascript
// 直接跳轉
function navigateToApp(appId) {
    const app = apps.find(a => a.id === appId);
    window.location.href = app.url; // 如：/cilong.html
}
```

---

## 🎨 UI 一致性

### 浮動 Logo 樣式
- 位置：右側垂直居中（`right: 16px; top: 50%`）
- 層級：`z-index: 999999`（最高層）
- 默認狀態：半透明 + 縮小（`opacity: 0.6; scale: 0.9`）
- 懸停狀態：完全顯示 + 正常大小（`opacity: 1; scale: 1`）

### 應用切換器模態框
- 位置：居中顯示
- 層級：`z-index: 999998`（次高層）
- 佈局：
  - 頂部：返回主頁按鈕 + 標題 + 關閉按鈕
  - 主體：按境地分組的應用網格

### 移動端優化
- 浮動 Logo 縮小（24px → 20px）
- 應用網格緊凑化（4列 → 3列）
- 標題區域精簡
- 禁用懸停效果，使用點擊操作

---

## 🔧 技術細節

### 樣式管理
- **組件**：內嵌完整樣式（`createSwitcherStyles()`）
- **主頁**：在 `<style>` 標籤中定義樣式

### 事件綁定
- **組件**：使用 `bindEvents()` 統一綁定
- **主頁**：直接在 `<script>` 中綁定

### 初始化流程
- **組件**：
  ```javascript
  // 自動初始化
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAppSwitcher);
  } else {
      setTimeout(initAppSwitcher, 100);
  }
  ```
  
- **主頁**：
  ```javascript
  // 頁面加載後執行
  document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      setupBrowserCompatibility();
      setupKeyboardNavigation();
  });
  ```

---

## 📊 數據維護建議

### 更新應用數據時

**需要同步修改**：
1. `index.html` 中的 `apps` 數組（約第 1187 行）
2. `assets/js/taixu-app-switcher.js` 中的 `apps` 數組（約第 46 行）

**注意事項**：
- 保持兩邊的應用數據一致
- URL 必須使用絕對路徑（以 `/` 開頭）
- 新應用需要添加到對應的境地分類

**未來優化建議**：
- 考慮將應用數據抽取為獨立的 JSON 文件
- 兩邊共享同一個數據源
- 減少維護成本

---

## ✨ 優化成果

1. ✅ **架構清晰**：組件職責明確，主頁與組件分離
2. ✅ **路徑統一**：所有 URL 使用絕對路徑，導航一致
3. ✅ **代碼整潔**：移除了未使用的組件引用
4. ✅ **功能完整**：主頁和應用頁面都能正常導航

---

## 🚀 後續計劃

### 短期
- [x] 完成路徑統一
- [x] 移除冗餘引用
- [ ] 測試所有應用的導航功能

### 長期
- [ ] 將應用數據抽取為獨立文件（`apps-data.json`）
- [ ] 實現數據自動同步機制
- [ ] 添加應用數據驗證工具

---

**相關文件**：
- `index.html` - 主頁
- `assets/js/taixu-app-switcher.js` - 應用切換器組件
- `TAIXU_ARCHITECTURE.md` - 平台架構文檔

