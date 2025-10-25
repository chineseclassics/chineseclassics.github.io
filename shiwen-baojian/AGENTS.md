# Repository Guidelines

## 專案結構與模組劃分
- `index.html` 為師生端入口，頁尾務必引入 `/assets/js/taixu-app-switcher.js` 以維持太虛幻境切換，並強制使用絕對路徑避免 iframe 遺留設定。新增頁面時同步更新根目錄 `index.html` 的 `apps` 陣列。
- `js/` 以 ES6 模組拆分核心流程：`auth/` 處理登入與角色判定、`editor/` 負責段落編輯器、`ai/` 管理 Supabase Edge Functions 呼叫。擴充模組請在相對資料夾建立 `README` 或註釋說明責任界線。
- `css/` 保存 Tailwind 補充樣式及自訂主題；`assets/data/` 儲存 JSON 教材與評分規則。若引入新教材，需同步於 `docs/` 撰寫版本記錄與來源。
- `supabase/` 自包含 `config.toml`、`functions/ai-feedback-agent/` 及 SQL 遷移檔，確保每次部署皆在此目錄執行。禁止將子項資源複製到平台根目錄以維持太虛幻境兩層結構。
- `docs/` 收錄教學素材，`openspec/` 儲存需求與決策紀錄，根目錄腳本如 `test-format-api.sh`、`test-two-stage-flow.sh` 提供即時驗證範例。

## 建置、測試與開發指令
- 本地預覽：`python3 -m http.server 8000` 後造訪 `http://localhost:8000/shiwen-baojian/index.html`，變更靜態檔案後重新整理即可。
- 替代預覽：`npx http-server -p 8000`（需 Node.js），或使用 VS Code Live Server，惟站點根目錄必須對準倉庫根以載入絕對路徑資源。
- Supabase 工作流程：`cd supabase` → `supabase login` → `supabase link --project-ref <project-id>`，部署時執行 `supabase functions deploy ai-feedback-agent` 並以 `supabase status` 確認連線。
- API 快測：`bash ./test-format-api.sh` 驗證格式規格，`bash ./test-two-stage-flow.sh` 模擬完整互動；必要憑證請放在 `.env.local` 並以腳本載入。
- Edge Functions 本地模擬：`supabase functions serve --env-file ../.env.local`，前端測試時記得調整 `js/ai/` 內端點指向本地埠號。

## 程式風格與命名慣例
- JavaScript 採 4 空格縮排，變數 `camelCase`、檔名 `kebab-case`、常數 `UPPER_SNAKE_CASE`，共用模組以命名空間物件輸出。
- 註釋統一使用繁體中文，只描述意圖與邏輯策略；複雜流程可在檔首加入簡短步驟圖示文字。
- 嚴控模組副作用，初始化函式應明確接受設定參數，遠端呼叫集中於 `services` 或 `ai` 層，便於測試替換。
- 靜態資源與資料檔按功能分區，未啟用素材請移至 `docs/drafts/` 或以外部連結保存，避免污染部署。

## 測試準則
- 推送前先以腳本驗證 AI 介接與排版輸出，再進行桌機與行動版瀏覽器手動測試，測試結果請記錄於 PR 訊息。
- Edge Function 變更需先 `supabase functions serve` 自測，再部署到遠端；如需環境變數請透過 `supabase secrets set` 管理。
- 新增互動元件時同步指定 `data-testid`，調整 DOM 結構需更新既有腳本中的選擇器，避免回歸失效。

## 提交與 Pull Request 規範
- 提交訊息遵循 `type(shiwen-baojian): 摘要`，常見類型含 `feat`、`fix`、`docs`、`refactor`；涉及資料庫遷移可加 `db` 標籤。
- PR 需附變更摘要、測試步驟、相關 Issue 連結；視覺或體驗調整請補充前後截圖並標註關鍵互動。
- 檢查未觸碰其他應用或平台級資源，並確認應用切換器註冊與 `index.html` 導覽同步更新。
- 合併前再次核對 `supabase/config.toml` 與實際專案 ID 是否一致，避免將草稿設定推送至正式環境。

## 安全與配置提示
- 憑證集中於 `.env.local` 或開發機密管理工具，嚴禁提交到版本控制；使用 CLI 時以 `--env-file` 或 `env-cmd` 載入。
- DeepSeek、Supabase 等 API Key 需分離開發與正式權限，並定期旋轉；如需共享請改用 `supabase secrets` 或 GitHub Actions Secret。
- 引入第三方字型或腳本前評估隱私與可用性，優先採用 CDN 已審核資源或自托管 `assets/` 版本，以符合教育場域要求。
- 資料遷移若出現錯誤，透過新增遞增 SQL 檔修補，不要直接修改既有檔案，確保團隊成員可重播資料庫狀態。
