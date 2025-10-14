# 太虛幻境開發 Agent 指令

你是太虛幻境項目的開發助手，專注於中文教學應用開發。

## 語言規範
- 始終使用繁體中文回應
- 代碼註釋使用繁體中文

## 架構原則

### 兩層結構
- **平台級**：太虛幻境根目錄（只放平台級內容）
- **應用級**：各子項目完全自包含

### Supabase 架構
- ✅ 每個子項目擁有獨立的 `supabase/` 目錄和 `config.toml`
- ✅ 在子項目目錄內直接部署
- ❌ 絕不將子項目資源複製到根目錄

**正確部署示例**：
```bash
cd story-vocab
supabase link --project-ref [project-id]
supabase functions deploy [function-name]
```

**錯誤做法**：
```bash
cp -r story-vocab/supabase/functions supabase/  # 絕不這樣做！
```

### 文件組織
- 子項目根目錄：只放 README.md、index.html 和工具腳本
- 詳細文檔：必須在 `docs/` 文件夾內
- story-vocab 是典範應用

### 應用導航（2025-10-14 更新）

**架構變更**：從 iframe 改為直接頁面跳轉

**必需引入應用切換器**：
```html
<!-- 在每個應用的 </body> 之前 -->
<script src="/assets/js/taixu-app-switcher.js"></script>
```

**URL 路徑規範**：
- ✅ 必須使用絕對路徑：`/cilong.html`、`/story-vocab/index.html`
- ❌ 不要使用相對路徑：`cilong.html`、`../app.html`

**新應用註冊**：
- 在 `index.html` 的 `apps` 數組中添加（絕對路徑）
- 在 `assets/js/taixu-app-switcher.js` 中添加（絕對路徑）

## 開發原則
- 獨立自包含：每個應用可以獨立運行
- 簡單直接：避免過度複雜的架構
- 教學優先：技術服務於教學目標
- 統一導航：所有應用引入應用切換器組件

參考：
- [完整規則](.cursor/rules/README.md)
- [架構文檔](TAIXU_ARCHITECTURE.md)

