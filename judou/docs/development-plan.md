# Judou Vue 開發計畫

> 版本：2025-11-24  
> 狀態：Draft

## 里程碑

| 週次 | 目標 | 交付項目 |
| --- | --- | --- |
| W1 | 架構搭建 | Vite + Vue + TS 專案、ESLint/Prettier、Tailwind / design tokens 整合 |
| W2 | Supabase 導入 | Schema 規劃、Auth/DB/Storage/Realtime PoC、Edge Function 範本 |
| W3-W4 | 功能遷移（主流程） | Home、Practice、Leaderboard、History、Settings、Feedback |
| W5 | 遊戲與即時功能 | Lobby / Play、Realtime channel、AI 對話整合 |
| W6 | 測試與部署 | Vitest + Playwright、自動化部署 GitHub Pages、文件 |

## User Stories （第一批）

1. **作為學生**，我可以登入（Supabase Auth）並看到與舊版一致的首頁資訊（積分、等級、最新文章）。
2. **作為學生**，我可以在練習頁選擇文章、提交答案、查看評分，所有資料寫入 Supabase。
3. **作為學生**，我可以在排行榜頁查看最新排名，列表資料從 Supabase 及 Realtime 更新。
4. **作為學生**，我可以在設定頁更改暱稱、密碼與主題樣式（local / remote settings）。
5. **作為學生**，我可以在遊戲大廳與其他人匹配，利用 Supabase Realtime 同步狀態。

## 技術工作項

- [ ] Vite + Vue 3 + TypeScript 初始化
- [ ] Tailwind + PostCSS + design tokens 導入
- [ ] Pinia store 與型別定義
- [ ] Supabase client 工廠 + composable (`useSupabase`, `useAuth`)
- [ ] API schema 對應（Text, PracticeRecord, Leaderboard, GameRoom 等）
- [ ] Realtime channel 實驗（取代 Flask-SocketIO）
- [ ] Supabase Edge Function 範本（AI chat、排行榜彙總）
- [ ] PWA & Capacitor 評估
- [ ] 測試框架（Vitest + Playwright）設定
- [ ] GitHub Actions（lint/test/build/deploy）

## 風險與備案

| 風險 | 影響 | 緩解措施 |
| --- | --- | --- |
| Realtime 替代 Socket.IO 時延 | 遊戲體驗下降 | 測試 channel latency，必要時混合 Edge Function + Redis（Supabase 內建） |
| 現有資料遷移 | 歷史紀錄遺失 | 撰寫 migration script，先遷移 staging，再切換 |
| GitHub Pages 靜態限制 | 需伺服器端功能 | 全部改由 Supabase 提供 API/Edge Functions |
| AI API 金鑰管理 | 安全風險 | 只在 Edge Function 中呼叫外部 AI，前端不存金鑰 |

## 下一步

1. 建立 `package.json`、安裝 Vite/Vue 依賴。
2. 初始化 `src/` 結構與全域樣式匯入。
3. 建立 Supabase 專案並記錄 `.env.example`。


