# Initial App Structure Proposal

## Why
中學生在學習論文寫作時，常常對格式規範感到困惑，不清楚標題、段落、引用、參考文獻等各部分的正確格式。時文寶鑑旨在通過互動式教學、範例展示和即時檢查，幫助學生掌握學術論文的標準格式，提升寫作質量。

## What Changes
創建時文寶鑑應用的核心功能模塊：

- **論文格式範例庫**：展示標準論文各部分格式，提供正確與錯誤對比
- **格式檢查器**：檢測常見格式錯誤並提供修正建議
- **互動式寫作指導**：逐步引導完整論文結構
- **格式模板展示**：可視化展示論文格式規範
- **響應式 UI**：支持桌面和移動端訪問
- **太虛幻境集成**：引入應用切換器組件

## Impact

### Affected Specs
創建以下新規格：
- `ui-layout` - 整體界面布局和導航
- `format-examples` - 論文格式範例庫
- `format-checker` - 格式檢查器功能
- `writing-guide` - 互動式寫作指導
- `template-display` - 格式模板展示

### Affected Code
新建文件：
- `shiwen-baojian/index.html` - 主入口頁面
- `shiwen-baojian/js/` - JavaScript 功能模塊
  - `app.js` - 應用初始化
  - `format-checker.js` - 格式檢查邏輯
  - `example-manager.js` - 範例管理
  - `writing-guide.js` - 寫作指導邏輯
  - `template-renderer.js` - 模板渲染
- `shiwen-baojian/css/` - 樣式文件
  - `base.css` - 基礎樣式
  - `components.css` - 組件樣式
  - `responsive.css` - 響應式樣式
- `shiwen-baojian/assets/data/` - 數據文件
  - `format-examples.json` - 格式範例數據
  - `format-rules.json` - 格式規則數據
  - `templates.json` - 模板數據

### Integration with 太虛幻境
- 引入 `/assets/js/taixu-app-switcher.js`
- 在太虛幻境主頁註冊應用（需要更新 `/index.html` 和 `/assets/js/taixu-app-switcher.js`）

