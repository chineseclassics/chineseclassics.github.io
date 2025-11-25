# Judou Vue App

Vue 3 + TypeScript + Vite 重構版的句豆介面，整合設計 tokens、Edamame UI 與 Supabase 後端。

## 開發指令

```bash
npm install
npm run dev
npm run build
```

> 本專案使用 `@supabase/supabase-js`。請依下列步驟設定環境變數，否則 Supabase client 會在執行時警告。

## 環境變數

1. 複製 `env.example` 為 `.env` 或 `.env.local`。
2. 填入 Supabase 專案資訊：

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. 重新啟動 `npm run dev` 後，即可在 `App.vue` 中看到來自 `poems` 資料表的即時資料。

## 目錄重點

- `src/styles/`：導入 `design-tokens.css`、`edamame-ui.css`、`edamame-character.css`，並在 `index.css` 統一出口。
- `src/lib/supabaseClient.ts`：配置 Supabase client。
- `src/composables/useSupabase.ts`：提供安全取得 Supabase client 的 helper。
- `src/App.vue`：示範讀取 `poems` 資料表以驅動 UI。
