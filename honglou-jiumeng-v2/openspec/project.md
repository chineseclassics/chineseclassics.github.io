# Project Context

## Purpose
《紅樓舊夢》是太虛幻境平台下的教育遊戲應用，旨在通過遊戲化機制促進中學生閱讀《紅樓夢》前八十回。玩家作為石頭（寶玉），用林黛玉的絳珠灌溉大觀園花魂，重建園中景致與眾人的美好記憶。

核心目標：
- 促進學生閱讀紅樓夢前八十回（核心教育目標）
- 通過閱讀驗證機制確保學生真正讀過原文
- 在遊戲中自然接觸原文情節與語言
- 體會「記憶 vs 時間」的主題與無常感
- 不是背情節，不是做題，而是邊讀邊玩

## Tech Stack
- **前端框架**：純 HTML5/CSS3/Vanilla JavaScript（ES 模組，無框架）
- **樣式系統**：原生 CSS（不使用 Tailwind，保持簡潔）
- **部署平台**：GitHub Pages
- **版本控制**：Git + GitHub Desktop

**未來可能集成**：
- DeepSeek API（AI 文字調味，低頻調用）

## Project Conventions

### Code Style
- **語言**：所有代碼註釋使用繁體中文
- **命名**：
  - 文件名：kebab-case（如 `game-state.js`）
  - CSS 類名：kebab-case（如 `.memory-item`）
  - JavaScript 變量：camelCase（如 `gameState`）
  - JavaScript 常量：UPPER_SNAKE_CASE（如 `MAX_ACTION_POINTS`）
- **縮進**：使用 2 空格
- **註釋**：關鍵邏輯必須有繁體中文註釋

### Architecture Patterns
- **應用獨立性**：完全自包含的單元，所有資源在應用內部
- **文件結構**：
  ```
  honglou-jiumeng-v2/
  ├── index.html          # 主入口
  ├── js/                 # JavaScript 模塊
  │   ├── main.js        # 主邏輯
  │   ├── state.js       # 遊戲狀態管理
  │   ├── memories.js   # 記憶系統
  │   ├── seasons.js     # 節氣系統
  │   └── ...
  ├── css/                # 樣式文件
  ├── assets/             # 字體、圖片、數據
  └── docs/               # 設計文檔
  ```
- **統一導航**：必須引入太虛幻境應用切換器組件
  ```html
  <script src="../../assets/js/taixu-app-switcher.js"></script>
  ```
- **路徑規範**：
  - 應用內資源：相對路徑
  - 平台資源：絕對路徑（如 `/assets/js/taixu-app-switcher.js`）

### Design Principles
- **閱讀驅動遊戲**：讀完對應回目才能解鎖相關記憶
- **答題不消耗行動力**：答題解鎖記憶不消耗行動力，可以隨時進行
- **資源稀缺性**：絳珠有限，需要策略性分配
- **隱性化設計**：不在遊戲中明確告訴玩家「去閱讀」，而是通過題目自然引導

## Key Design Documents
- `docs/GAME_REDESIGN_PLAN.md` - 完整遊戲設計文檔（主要參考）
- `docs/GAME_FLOW_SIMULATION.md` - 遊戲流程模擬

## MVP Scope
第一版（MVP）聚焦核心可玩系統：
- 節氣循環（24 節氣，每節氣 4 點行動力）
- 資源系統（絳珠、靈石）
- 記憶系統（閱讀解鎖、答題驗證）
- 園林建築（5×5 格子，瀟湘館解鎖）
- 花魂系統（黛玉花魂，等級 0-5）
- 基本 UI（狀態列、記憶列表、答題界面）

明確排除：
- 鳥靈系統
- 複雜佈局 buff
- 多角色花魂
- DeepSeek AI 整合
- 隨機事件系統

