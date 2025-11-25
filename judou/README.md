# Judou Vue 2.0（代號：Edamame Sprout）

以現有 Flask 版「句豆」為藍本，重構為 **Vue 3 + Supabase** 的雲原生應用，保留既有 UI 美學與功能，同時兼顧長期可維護性、擴展性與 PWA / 原生封裝的可行性。

## 技術堆疊

| 層級 | 選型 | 說明 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite + TypeScript | 元件化 + HMR + TS 型別安全 |
| 狀態 | Pinia | 模組化 store，支援 SSR / Persist |
| UI | Tailwind 基礎 + Design Tokens | 導入 `design-tokens.css`、`edamame-ui.css` |
| 後端 | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) | 取代 Flask + PostgreSQL + Redis + Azure AD |
| 即時 | Supabase Realtime Channels | 替代 Flask-SocketIO |
| AI | Supabase Edge Function 代理外部 AI API | 隱藏金鑰，統一授權 |
| 部署 | GitHub Pages (靜態) + Supabase 雲服務 | CI/CD 透過 GitHub Actions |

## 目標

1. **完整功能對齊**：Home / Practice / Leaderboard / History / Settings / Feedback / Game Lobby & Play / Design System Demo。
2. **設計一致性**：沿用 Edamame 設計語言、玻璃質感、動畫、豆子角色。
3. **最佳實踐**：TypeScript、組件化、Composable API、E2E 測試、CI/CD、自動化部署。
4. **長期延展**：PWA、Capacitor 打包、A/B 測試、國際化。

## 專案結構（草案）

```
judou-vue/
├── docs/                 # 架構、開發、遷移筆記
├── public/               # 靜態資產
├── src/
│   ├── assets/           # 圖片、設計 tokens
│   ├── components/       # 通用元件 (Edamame UI)
│   ├── composables/      # Supabase / utilities hooks
│   ├── layouts/          # 頁面版型（含 sidebar）
│   ├── pages/            # 路由頁
│   ├── router/           # Vue Router 設定
│   ├── stores/           # Pinia stores
│   ├── styles/           # global CSS + tokens
│   └── main.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
└── vite.config.ts
```

## 開發流程

1. **腳手架**：Vite + Vue 3 + TypeScript + ESLint + Prettier + Vitest。
2. **樣式導入**：整合既有 `design-tokens.css`/`edamame-ui.css`，並轉為 CSS 變數 / Tailwind preset。
3. **Supabase 連線**：封裝 `supabaseClient.ts`，建立 Auth / DB / Realtime / Storage / Edge Functions 介面。
4. **核心組件**：Sidebar、Glass Card、Edamame Button、動畫角色等。
5. **頁面遷移**：依優先順序重寫頁面，確保功能與視覺一致。
6. **測試 & 部署**：Vitest + Playwright，GitHub Actions 自動化部署至 GitHub Pages。

## 環境設定

1. 進入 `judou-vue/app/`。
2. 複製 `env.example` 為 `.env`（或 `.env.local`）並填入 Supabase 專案的 `URL` 與 `Anon Key`。
3. 執行 `npm install`（已完成）後，即可用 `npm run dev` 啟動開發伺服器。

> 若尚未設定環境變數，Supabase client 會在啟動時提示，請先完成上述步驟。

## 下一步

1. 根據 `docs/development-plan.md` 的里程碑，實作 Supabase 資料模型與 store。
2. 將 Flask 版功能逐頁遷移至 Vue 版（Home → Practice → Leaderboard…）。
3. 匯出舊版資料後以 Migration 匯入 Supabase，並補上 Realtime / Edge Functions。
