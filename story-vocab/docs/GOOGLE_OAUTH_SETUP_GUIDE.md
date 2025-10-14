# Google OAuth 配置指南

> **目的**：為詞遊記配置 Google 登入功能  
> **預計時間**：15 分鐘

---

## 📋 配置步驟

### 步驟 1：配置 Google Cloud Console

#### 1.1 訪問 Google Cloud Console

打開瀏覽器訪問：https://console.cloud.google.com/apis/credentials

#### 1.2 選擇或創建項目

- 如果已有項目：選擇現有項目
- 如果沒有：點擊「創建項目」，輸入項目名稱（如「Story-Vocab App」）

#### 1.3 創建 OAuth 2.0 客戶端 ID

1. 點擊頂部「+ 創建憑證」
2. 選擇「OAuth 客戶端 ID」
3. 如果提示「配置同意畫面」，先完成同意畫面配置：
   - 用戶類型：選擇「外部」
   - 應用名稱：Story-Vocab / 詞遊記
   - 用戶支援電子郵件：你的郵箱
   - 其他可選項目可跳過
   - 保存

4. 返回創建 OAuth 客戶端：
   - 應用程式類型：**網頁應用程式**
   - 名稱：Story-Vocab App
   
5. 配置「已授權的 JavaScript 來源」：
   ```
   https://chineseclassics.github.io
   http://localhost:8000
   ```
   
6. 配置「已授權的重新導向 URI」：
   ```
   https://bjykaipbeokbbykvseyr.supabase.co/auth/v1/callback
   https://chineseclassics.github.io/story-vocab/
   http://localhost:8000
   ```

7. 點擊「建立」

#### 1.4 複製憑證

創建成功後會顯示：
- **用戶端 ID**（Client ID）：一串很長的字符串
- **用戶端密鑰**（Client Secret）：另一串字符串

**複製這兩個值**，下一步需要用到。

---

### 步驟 2：配置 Supabase Dashboard

#### 2.1 訪問 Supabase Dashboard

打開瀏覽器訪問：https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr

#### 2.2 啟用 Google Provider

1. 在左側菜單點擊「Authentication」
2. 點擊「Providers」標籤
3. 找到「Google」，點擊展開
4. 打開「Enable Sign in with Google」開關
5. 填入剛才複製的憑證：
   - **Client ID (for OAuth)**：粘貼 Google 的用戶端 ID
   - **Client Secret (for OAuth)**：粘貼 Google 的用戶端密鑰
6. 點擊「Save」保存

#### 2.3 配置 Site URL（如果還沒配置）

1. 在「Authentication」→「URL Configuration」
2. 確認「Site URL」設置為：
   ```
   https://chineseclassics.github.io/story-vocab/
   ```
3. 在「Redirect URLs」中添加（如果沒有）：
   ```
   https://chineseclassics.github.io/story-vocab/
   http://localhost:8000
   ```

---

### 步驟 3：執行數據庫遷移

#### 3.1 打開 SQL Editor

在 Supabase Dashboard：
1. 點擊左側菜單「SQL Editor」
2. 點擊「New query」

#### 3.2 複製並執行 SQL

打開文件：`story-vocab/supabase/manual-migrations/multi_identity_system.sql`

複製全部內容，粘貼到 SQL Editor，點擊「Run」

#### 3.3 驗證執行結果

執行成功後，運行驗證 SQL：

```sql
-- 檢查 users 表結構
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 檢查 user_identities 表是否創建
SELECT COUNT(*) as count FROM user_identities;
```

應該看到：
- users 表有 email, avatar_url, user_type, last_login_at 等新字段
- user_identities 表已創建（count = 0）

---

## ✅ 配置完成檢查清單

- [ ] Google Cloud Console OAuth 客戶端已創建
- [ ] Client ID 和 Client Secret 已複製
- [ ] Supabase Google Provider 已啟用
- [ ] Client ID 和 Secret 已填入 Supabase
- [ ] Redirect URLs 已配置
- [ ] 數據庫遷移 SQL 已執行
- [ ] users 表新字段已添加
- [ ] user_identities 表已創建

---

## 🧪 快速測試

配置完成後，可以在 Supabase Dashboard 測試：

1. 進入「Authentication」→「Users」
2. 點擊右上角「Add user」→「Sign in with Google」
3. 如果能跳轉到 Google 登入頁面，說明配置成功！

---

## 📝 配置完成後

返回 `story-vocab/docs/IMPLEMENTATION_PLAN.md`，繼續測試步驟！

---

## ❓ 常見問題

### Q: Google OAuth 同意畫面需要驗證嗎？

**A**: 開發測試階段不需要。只有要對外發布時才需要 Google 驗證。

### Q: Redirect URI 配置錯誤怎麼辦？

**A**: 
1. 檢查 Google Console 和 Supabase 的 URI 是否完全一致
2. 確保包含 Supabase 的回調 URL
3. 重新保存配置

### Q: 測試時跳轉失敗？

**A**: 
1. 檢查瀏覽器控制台的錯誤信息
2. 確認 Redirect URIs 包含當前域名
3. 確認 Supabase Provider 已啟用

---

**配置完成後，代碼已經準備好，可以立即測試！** 🚀

