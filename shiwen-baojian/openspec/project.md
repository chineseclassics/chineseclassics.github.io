# Project Context

## Purpose
時文寶鑑是太虛幻境平台下的教育應用，旨在幫助中學生學習論文寫作的標準格式。通過互動式指導、格式檢查和範例展示，讓學生掌握學術論文的規範寫作方法。

核心目標：
- 提供清晰的論文格式範例
- 自動檢測常見格式錯誤
- 互動式引導論文結構
- 提供可下載的格式模板

## Tech Stack
- **前端框架**：純 HTML5/CSS3/Vanilla JavaScript（無框架）
- **樣式系統**：Tailwind CSS（CDN）
- **圖標系統**：Font Awesome（CDN）
- **部署平台**：GitHub Pages
- **版本控制**：Git + GitHub Desktop

**未來可能集成**：
- Supabase（用戶數據、範例存儲）
- DeepSeek API（AI 寫作建議）

## Project Conventions

### Code Style
- **語言**：所有代碼註釋使用繁體中文
- **命名**：
  - 文件名：kebab-case（如 `format-checker.js`）
  - CSS 類名：kebab-case（如 `.format-example`）
  - JavaScript 變量：camelCase（如 `formatChecker`）
  - JavaScript 常量：UPPER_SNAKE_CASE（如 `DEFAULT_FORMAT`）
- **縮進**：使用 4 空格
- **註釋**：關鍵邏輯必須有繁體中文註釋

### Architecture Patterns
- **應用獨立性**：完全自包含的單元，所有資源在應用內部
- **文件結構**：
  ```
  shiwen-baojian/
  ├── index.html          # 主入口
  ├── js/                 # JavaScript 模塊
  ├── css/                # 樣式文件
  └── assets/             # 字體、圖片、數據
  ```
- **統一導航**：必須引入太虛幻境應用切換器組件
  ```html
  <script src="/assets/js/taixu-app-switcher.js"></script>
  ```
- **路徑規範**：
  - 應用內資源：相對路徑
  - 平台資源：絕對路徑（如 `/assets/js/taixu-app-switcher.js`）
  - 應用 URL：絕對路徑（如 `/shiwen-baojian/index.html`）

### Testing Strategy
- **開發測試**：本地 HTTP 服務器測試（`python3 -m http.server 8000`）
- **功能測試**：手動測試各項功能
- **兼容性測試**：桌面和移動端響應式測試
- **集成測試**：在太虛幻境主頁測試應用切換器導航

### Git Workflow
- **分支策略**：主要在 `main` 分支直接開發
- **提交規範**：
  ```
  類型(範圍): 簡短描述
  
  feat(shiwen-baojian): 添加格式檢查功能
  fix(shiwen-baojian): 修復範例顯示問題
  docs(shiwen-baojian): 更新使用說明
  ```
- **工作流程**：
  1. AI 修改代碼
  2. 用戶在 GitHub Desktop 檢查
  3. 用戶手動提交和推送

## Domain Context

### 教育背景
- **目標用戶**：中學生（初中、高中）
- **使用場景**：課堂教學、課後練習、自主學習
- **教學重點**：學術論文格式規範（標題、引言、正文、結論、參考文獻）

### 論文格式要點
- **標題格式**：字體、字號、對齊方式
- **段落格式**：首行縮進、行距、段距
- **引用格式**：直接引用、間接引用、註釋
- **參考文獻**：APA、MLA、Chicago 等標準格式
- **圖表格式**：編號、標題、說明

### 常見錯誤
- 標題不居中、字體不統一
- 段落首行未縮進
- 引用未標註來源
- 參考文獻格式不規範
- 圖表無編號或標題

## Important Constraints

### 技術約束
- **純前端**：不依賴後端服務器（初期）
- **離線可用**：基礎功能應該在離線狀態下可用
- **移動友好**：必須支持移動端訪問
- **瀏覽器兼容**：支持現代瀏覽器（Chrome、Safari、Firefox、Edge）

### 內容約束
- **語言**：所有界面和內容使用繁體中文
- **適齡性**：內容適合中學生年齡段
- **準確性**：格式規範必須符合學術標準

### 平台約束
- **太虛幻境集成**：必須遵循太虛幻境應用開發規範
- **文件組織**：遵循太虛幻境兩層結構（平台級/應用級）
- **資源管理**：所有資源放在應用內 `assets/` 文件夾

## External Dependencies

### CDN 依賴
- **Tailwind CSS**：`https://cdn.tailwindcss.com`
- **Font Awesome**：`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`

### 平台組件
- **太虛幻境應用切換器**：`/assets/js/taixu-app-switcher.js`
  - 提供浮動 Logo 和應用切換功能
  - 必須在 `</body>` 前引入

### 未來可能集成
- **Supabase**：用戶數據、範例存儲、學習記錄
- **DeepSeek API**：AI 寫作建議、格式檢查增強
- **導出功能**：Word/PDF 模板生成（可能需要第三方庫）
