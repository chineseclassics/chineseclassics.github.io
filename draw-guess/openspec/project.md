# Project Context

## Purpose
你畫我猜是太虛幻境平台下的教育應用，是一個支持中文的多人繪畫猜詞遊戲。通過繪畫和猜測，幫助學生掌握概念名詞和詩句，實現視覺化學習。

核心目標：
- 支持中文詞彙、概念名詞、詩句的繪畫猜詞
- 提供系統預設詞庫（文學概念詞庫、詩詞名句庫等）
- 支持自定義詞語輸入
- 實現分數累積和遊戲粘性功能
- 適合課堂教學和日常挑戰

## Tech Stack
- **前端框架**：Vue 3 + Vite + TypeScript
- **狀態管理**：Pinia
- **路由**：Vue Router
- **樣式系統**：Tailwind CSS
- **圖標系統**：Font Awesome 或 Heroicons
- **後端服務**：Supabase（數據庫、認證、實時同步）
- **繪畫技術**：HTML5 Canvas
- **構建工具**：Vite
- **部署平台**：GitHub Pages（構建後的靜態文件）

## Project Conventions

### Code Style
- **語言**：所有代碼註釋使用繁體中文
- **命名**：
  - 文件名：kebab-case（如 `room-manager.js`）
  - CSS 類名：kebab-case（如 `.game-room`）
  - JavaScript 變量：camelCase（如 `gameState`）
  - JavaScript 常量：UPPER_SNAKE_CASE（如 `MAX_PLAYERS`）
- **縮進**：使用 2 空格
- **註釋**：關鍵邏輯必須有繁體中文註釋

### Architecture Patterns
- **應用獨立性**：完全自包含的單元，所有資源在應用內部
- **文件結構**：
  ```
  draw-guess/
  ├── app/                    # Vue 應用源代碼
  │   ├── src/
  │   │   ├── main.ts         # 應用入口
  │   │   ├── App.vue         # 根組件
  │   │   ├── components/     # Vue 組件
  │   │   ├── views/          # 頁面組件
  │   │   ├── stores/         # Pinia 狀態管理
  │   │   ├── composables/    # 可復用邏輯
  │   │   ├── router/         # Vue Router 配置
  │   │   ├── lib/            # 核心類庫
  │   │   └── assets/         # 資源文件
  │   ├── public/             # 靜態資源
  │   ├── package.json        # 依賴管理
  │   └── vite.config.ts      # Vite 配置
  ├── assets/                 # 構建後的靜態文件（GitHub Pages）
  ├── admin/                  # 管理員後台（Vue 組件）
  ├── supabase/               # Supabase 相關
  └── docs/                   # 文檔
  ```
- **統一導航**：必須引入太虛幻境應用切換器組件
  ```html
  <script src="/assets/js/taixu-app-switcher.js"></script>
  ```
- **路徑規範**：
  - 應用內資源：相對路徑
  - 平台資源：絕對路徑（如 `/assets/js/taixu-app-switcher.js`）
  - 應用 URL：絕對路徑（如 `/draw-guess/index.html`）

### UI Design Principles
- **極簡 UI**：界面極簡，減少裝飾元素，讓畫作成為焦點
- **低調配色**：使用低調的配色方案（灰色系、米色、淺色調），不搶奪畫作的視覺焦點
- **突出畫作**：UI 作為畫布，用戶的畫作是主角
- **突出文字**：文字元素清晰可讀，但不過於突出
- **手繪風格**：保持手繪感，但以極簡方式呈現（細線條、低調圖標）
- **動畫**：適量的、優雅的、微妙的動畫，突出高級感

### Testing Strategy
- **開發測試**：使用 Vite 開發服務器（`npm run dev`）
- **功能測試**：手動測試各項功能（房間創建、繪畫、猜詞、實時同步）
- **兼容性測試**：桌面和移動端響應式測試
- **實時同步測試**：多設備同時測試實時同步功能
- **構建測試**：構建生產版本（`npm run build`）並測試
- **集成測試**：在太虛幻境主頁測試應用切換器導航

### Git Workflow
- **分支策略**：主要在 `main` 分支直接開發
- **提交規範**：
  ```
  類型(範圍): 簡短描述
  
  feat(draw-guess): 添加房間創建功能
  fix(draw-guess): 修復繪畫同步問題
  docs(draw-guess): 更新開發計劃
  ```
- **工作流程**：
  1. AI 修改代碼
  2. 用戶在 GitHub Desktop 檢查
  3. 用戶手動提交和推送

## Domain Context

### 教育背景
- **目標用戶**：學生（小學到高中）、教師、一般用戶
- **使用場景**：
  - 課堂教學：使用系統詞庫，複習概念和詩句
  - 日常挑戰：好友互相挑戰，提升粘性
- **教學重點**：
  - 概念名詞的視覺化理解
  - 詩句的意象理解
  - 詞彙記憶和聯想

### 遊戲機制
- **房間系統**：創建房間、加入房間、房間管理
- **繪畫系統**：Canvas 繪圖、實時同步、工具欄
- **猜詞系統**：輸入猜測、匹配判斷、計分
- **詞庫系統**：系統預設詞庫、自定義詞語、混合模式
- **用戶系統**：匿名遊玩、登入遊玩、分數累積

### 特色功能
- **支持中文**：專為中文詞彙、概念、詩句設計
- **系統詞庫**：管理員維護的主題詞庫（文學概念、詩詞名句等）
- **詞彙掌握度**：追蹤用戶猜中過的詞語
- **好友系統**：互相挑戰，提升粘性
- **成就系統**：解鎖成就，增加趣味性

## Important Constraints

### 技術約束
- **實時同步**：必須使用 Supabase Realtime 實現實時同步
- **繪畫性能**：繪畫數據需要壓縮和優化，減少傳輸量
- **移動友好**：必須支持移動端觸摸繪畫
- **瀏覽器兼容**：支持現代瀏覽器（Chrome、Safari、Firefox、Edge）

### 內容約束
- **語言**：所有界面和內容使用繁體中文
- **詞語限制**：
  - 最少 6 個詞語
  - 每個詞語 1-32 個字符
  - 自定義詞語最多 600 個字符
- **詞庫管理**：只有管理員可以管理系統預設詞庫

### 平台約束
- **太虛幻境集成**：必須遵循太虛幻境應用開發規範
- **文件組織**：遵循太虛幻境兩層結構（平台級/應用級）
- **資源管理**：所有資源放在應用內 `assets/` 文件夾
- **Supabase 獨立**：使用獨立的 Supabase 項目

## External Dependencies

### NPM 依賴
- **Vue 3**：`^3.5.0`
- **Vite**：`^7.0.0`
- **Pinia**：`^3.0.0`
- **Vue Router**：`^4.6.0`
- **TypeScript**：`^5.9.0`
- **@supabase/supabase-js**：`^2.84.0`
- **Tailwind CSS**：通過 npm 安裝
- **@vitejs/plugin-vue**：`^6.0.0`

### 平台組件
- **太虛幻境應用切換器**：`/assets/js/taixu-app-switcher.js`
  - 提供浮動 Logo 和應用切換功能
  - 必須在 `</body>` 前引入

### Supabase 服務
- **數據庫**：PostgreSQL（房間、用戶、詞庫、遊戲記錄等）
- **認證**：Google OAuth + 匿名認證
- **實時同步**：Realtime Channels（房間狀態、繪畫數據、猜詞結果）
- **Edge Functions**：（如需要，用於複雜邏輯處理）

## Development Phases

### Phase 1: MVP 核心功能
- 用戶系統（匿名 + Google 登入）
- 房間系統（創建/加入/離開）
- 基礎繪畫功能（Canvas）
- 猜詞系統（輸入/匹配）
- 基礎計分系統
- 實時同步（房間狀態、猜詞結果）

### Phase 2: 詞庫系統
- 系統詞庫管理（管理員後台）
- 詞庫選擇器（逐個點選、全選）
- 自定義詞語輸入
- 詞語列表構建（合併、去重、驗證）

### Phase 3: 分數累積和基礎粘性功能
- 分數累積系統
- 個人統計面板
- 基礎成就系統
- 排行榜系統
- 遊戲歷史記錄

### Phase 4: 社交和進階粘性功能
- 好友系統
- 詞彙掌握度系統
- 每日挑戰
- 繪畫同步優化
- 移動端優化

