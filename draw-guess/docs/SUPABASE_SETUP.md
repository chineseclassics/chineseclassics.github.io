# Supabase 配置指南

## 已完成的配置

✅ **數據庫遷移**：已執行 `001_initial_schema.sql`，所有表已創建  
✅ **前端配置**：`app/src/lib/supabase.ts` 已配置 Supabase URL 和 Key

## 需要在 Supabase Dashboard 中配置

### 1. 啟用 Realtime 功能（必需）

**重要**：應用使用 Supabase Realtime 進行實時同步，必須啟用此功能。

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇項目：`sylsqdkkshkeicaxhisq`
3. 前往 **Database** → **Replication**
4. 確認以下表已啟用 Realtime：
   - ✅ `game_rooms`
   - ✅ `room_participants`
   - ✅ `game_rounds`
   - ✅ `guesses`

**注意**：如果遷移文件 `002_enable_realtime.sql` 已執行，這些表應該已經自動啟用。如果沒有，可以手動在 Replication 頁面中啟用。

### 2. 啟用匿名認證

1. 前往 **Authentication** → **Providers**
2. 找到 **Anonymous** 提供者
3. 啟用 **Anonymous** 認證
4. 保存設置

### 3. 配置 Google OAuth（可選，用於正式登入）

1. 前往 **Authentication** → **Providers**
2. 找到 **Google** 提供者
3. 啟用 **Google** OAuth
4. 配置 OAuth 憑證：
   - 在 [Google Cloud Console](https://console.cloud.google.com/) 創建 OAuth 2.0 客戶端 ID
   - 設置授權重定向 URI：`https://sylsqdkkshkeicaxhisq.supabase.co/auth/v1/callback`
   - 將 Client ID 和 Client Secret 填入 Supabase Dashboard
5. 保存設置

### 4. 配置重定向 URL（Google OAuth 需要）

1. 前往 **Authentication** → **URL Configuration**
2. 在 **Redirect URLs** 中添加：
   - `http://localhost:5174`（開發環境）
   - `https://chineseclassics.github.io/draw-guess`（生產環境，如果已部署）

## 測試

### 測試匿名登入

1. 啟動開發服務器：`cd app && npm run dev`
2. 訪問 `http://localhost:5174`
3. 點擊「匿名遊玩」按鈕
4. 應該成功創建匿名會話並顯示臨時暱稱

### 測試 Google 登入

1. 確保已配置 Google OAuth（見上方步驟 2）
2. 點擊「Google 登入」按鈕
3. 應該跳轉到 Google 授權頁面
4. 授權後，應該返回應用並顯示 Google 用戶信息

## 故障排除

### Realtime 不工作

- **錯誤**：`Realtime subscription failed` 或數據不同步
- **解決**：
  1. 確認在 Supabase Dashboard → Database → Replication 中已啟用相關表的 Realtime
  2. 確認遷移文件 `002_enable_realtime.sql` 已執行
  3. 檢查瀏覽器控制台是否有 Realtime 連接錯誤

### 匿名登入失敗

- **錯誤**：`Anonymous sign-ins are disabled`
- **解決**：在 Supabase Dashboard 中啟用匿名認證（見步驟 2）

### Google 登入失敗

- **錯誤**：`OAuth provider not enabled`
- **解決**：在 Supabase Dashboard 中啟用 Google OAuth（見步驟 3）

### 重定向錯誤

- **錯誤**：`Invalid redirect URL`
- **解決**：在 Supabase Dashboard 中添加正確的重定向 URL（見步驟 3）

## 相關文檔

- [Supabase 匿名認證文檔](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Google OAuth 文檔](https://supabase.com/docs/guides/auth/social-login/auth-google)

