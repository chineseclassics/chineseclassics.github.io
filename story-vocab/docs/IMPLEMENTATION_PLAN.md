# 詞遊記 Google 登入實施計劃

> **創建日期**：2025-10-11  
> **實施策略**：漸進式雙模式架構  
> **預計時間**：3-4 小時

---

## 🎯 核心決策總結

### 1. 採用雙模式架構
- **獨立模式**：完整的 Google OAuth 認證
- **平台模式**：接收太虛幻境傳來的用戶信息
- 同一套代碼自動適配

### 2. UUID 主鍵 + 多重身份系統
- 支持 Google 登入（主要）和匿名試用（訪客）
- Google 用戶通過 email 在兩種模式下統一
- 未來可擴展其他登入方式

### 3. Supabase 完全獨立
- 詞遊記使用自己的 Supabase project (bjykaipbeokbbykvseyr)
- 通過 postMessage 與平台通信
- 不共享數據庫

### 4. 實施順序
- **第一階段**：獨立模式（現在實施）
- **第二階段**：平台模式（未來對接）

---

## 📋 實施步驟

### 階段一：配置 Google OAuth（15分鐘）

#### 1.1 Supabase Dashboard 配置

訪問：https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr

1. 進入 "Authentication" → "Providers"
2. 找到 "Google" provider，點擊 "Enable"
3. 準備填入：
   - Client ID（從 Google Cloud Console 獲取）
   - Client Secret（從 Google Cloud Console 獲取）

#### 1.2 Google Cloud Console 配置

訪問：https://console.cloud.google.com/apis/credentials

1. 創建 OAuth 2.0 客戶端 ID（如果還沒有）
2. 應用類型：Web 應用程式
3. 名稱：Story-Vocab App
4. 授權的重定向 URI：
   ```
   https://bjykaipbeokbbykvseyr.supabase.co/auth/v1/callback
   https://chineseclassics.github.io/story-vocab/
   http://localhost:8000 (本地測試)
   ```
5. 授權的 JavaScript 來源：
   ```
   https://chineseclassics.github.io
   http://localhost:8000
   ```
6. 複製 Client ID 和 Client Secret
7. 返回 Supabase Dashboard 填入

#### 1.3 驗證配置

在 Supabase Dashboard 測試 Google 登入是否正常工作。

---

### 階段二：數據庫遷移（15分鐘）

#### 2.1 創建遷移文件

文件：`story-vocab/supabase/migrations/20251011_multi_identity_system.sql`

```sql
-- 詞遊記多重身份認證系統遷移
-- UUID 主鍵 + 支持 Google、匿名等多種登入方式

BEGIN;

-- 1. 備份現有數據（如果有）
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM users;

-- 2. 創建新的 users 表結構
CREATE TABLE users_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- Google 用戶有，匿名為 NULL
  username TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  user_type TEXT DEFAULT 'registered', -- 'registered' | 'anonymous'
  current_level DECIMAL(2,1) DEFAULT 2.0,
  total_stories_completed INT DEFAULT 0,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 創建身份關聯表
CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'google' | 'anonymous' | 'apple'
  provider_id TEXT NOT NULL,           -- 該提供商的用戶 ID
  provider_data JSONB,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider, provider_id)
);

-- 4. 刪除舊表，重命名新表
DROP TABLE IF EXISTS users CASCADE;
ALTER TABLE users_new RENAME TO users;

-- 5. 創建索引
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_identities_user ON user_identities(user_id);
CREATE INDEX idx_identities_provider ON user_identities(provider, provider_id);

-- 6. 添加註釋
COMMENT ON TABLE users IS '詞遊記用戶表 - 支持多種登入方式';
COMMENT ON TABLE user_identities IS '用戶身份關聯表 - 綁定不同的登入提供商';
COMMENT ON COLUMN users.user_type IS 'registered（正式用戶）或 anonymous（匿名訪客）';
COMMENT ON COLUMN user_identities.provider IS '登入提供商：google, anonymous, apple 等';

COMMIT;
```

#### 2.2 運行遷移

```bash
cd story-vocab
supabase db push
```

---

### 階段三：實現認證模塊（2小時）

#### 3.1 創建文件結構

```bash
mkdir -p story-vocab/js/auth
```

#### 3.2 運行模式檢測器

文件：`story-vocab/js/auth/run-mode-detector.js`

**實施內容**：
- 檢測是否在 iframe 中
- 檢測是否在太虛幻境域名
- 檢測是否有平台標識
- 支持強制模式（localStorage）

#### 3.3 認證服務抽象層

文件：`story-vocab/js/auth/auth-service.js`

**實施內容**：
- AuthService 基類（定義接口）
- createAuthService() 工廠函數
- 根據運行模式創建對應實現

#### 3.4 獨立模式實現

文件：`story-vocab/js/auth/standalone-auth.js`

**實施內容**：
- Google OAuth 登入流程
- 用戶同步邏輯（使用 Google ID）
- Session 管理
- 認證狀態監聽

**關鍵邏輯**：
```javascript
async function findOrCreateUser(authInfo) {
  const { provider, providerId, email, displayName } = authInfo;
  
  // 1. 用 provider + providerId 查找
  let identity = await supabase
    .from('user_identities')
    .select('user_id, users(*)')
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .single();
  
  if (identity?.users) return identity.users;
  
  // 2. 如果有 email，用 email 查找（跨模式關鍵）
  let user = null;
  if (email) {
    user = await supabase.from('users')
      .select('*').eq('email', email).single();
  }
  
  // 3. 創建新用戶
  if (!user) {
    user = await supabase.from('users').insert({
      email: email,
      display_name: displayName,
      user_type: provider === 'anonymous' ? 'anonymous' : 'registered'
    }).select().single();
  }
  
  // 4. 綁定身份
  await supabase.from('user_identities').insert({
    user_id: user.data.id,
    provider: provider,
    provider_id: providerId
  });
  
  return user;
}
```

#### 3.5 平台模式實現

文件：`story-vocab/js/auth/platform-auth.js`

**實施內容**：
- postMessage 監聽
- 接收平台用戶信息
- 同步到詞遊記 users 表
- 預留數據同步接口

**關鍵邏輯**：
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'TAIXU_AUTH') {
    const platformUser = event.data.user;
    
    // 用 email 查找用戶（與獨立模式統一）
    let user = await supabase.from('users')
      .select('*')
      .eq('email', platformUser.email)
      .single();
    
    if (!user) {
      user = await supabase.from('users').insert({
        email: platformUser.email,
        display_name: platformUser.display_name,
        user_type: 'registered'
      }).select().single();
    }
    
    return user;
  }
});
```

---

### 階段四：集成到應用（1小時）

#### 4.1 修改 app.js

**修改內容**：
1. 導入認證模塊
2. 使用 createAuthService() 初始化
3. 替換現有的 signInAnonymously()
4. 添加 loginWithGoogle() 和 logout() 函數
5. 更新 UI 函數

#### 4.2 修改 supabase-client.js

**修改內容**：
- 移除或標記為 deprecated：signInAnonymously()
- 確保 initSupabase() 正常工作

#### 4.3 修改 index.html

**修改內容**：
在側邊欄添加登入選擇界面：

```html
<div id="guest-login-prompt" style="display: none;">
  <p style="margin-bottom: 10px;">💡 選擇登入方式</p>
  
  <!-- Google 登入 -->
  <button onclick="loginWithGoogle()" style="width: 100%; margin-bottom: 8px;">
    🔐 使用 Google 登入
    <span style="font-size: 11px; display: block;">推薦 - 數據雲端保存</span>
  </button>
  
  <!-- 訪客試用 -->
  <button onclick="continueAsGuest()" style="width: 100%;">
    👤 訪客試用
    <span style="font-size: 11px; display: block;">立即體驗，無需註冊</span>
  </button>
</div>
```

---

### 階段五：測試驗證（30分鐘）

#### 5.1 本地測試

```bash
cd story-vocab
python3 -m http.server 8000
```

測試內容：
- [ ] 打開 http://localhost:8000
- [ ] 看到登入按鈕
- [ ] 點擊登入，跳轉到 Google
- [ ] 登入成功，跳轉回應用
- [ ] 側邊欄顯示用戶名和頭像
- [ ] 創建故事，數據保存成功
- [ ] 刷新頁面，session 保持
- [ ] 登出功能正常

#### 5.2 生產環境測試

```bash
git add .
git commit -m "feat: 添加 Google 登入（雙模式架構）"
git push origin main
```

等待部署後測試：
- [ ] https://chineseclassics.github.io/story-vocab/
- [ ] 從太虛幻境 iframe 打開測試

#### 5.3 數據驗證

在 Supabase Dashboard 檢查：
- [ ] users 表結構正確（id 是 TEXT 類型）
- [ ] 用戶記錄使用 Google ID
- [ ] 關聯表（story_sessions 等）正常關聯

---

## 🔮 未來階段：平台對接（待實施）

當太虛幻境平台完成統一用戶中心後：

### 1. 平台主站實現
- 實現統一 Google 登入
- 實現 postMessage 通信
- 創建平台用戶中心 Supabase

### 2. 詞遊記對接
- platform-auth.js 已準備好
- 測試 postMessage 通信
- 驗證雙模式切換

### 3. 測試場景
- [ ] 平台登入 → 打開詞遊記 → 自動識別用戶
- [ ] 使用同一個 Google 賬號，分別從平台和獨立登入
- [ ] 驗證數據一致性（同一個 user_id）

---

## ✅ 成功標準

### 階段一完成標準
- [ ] Google OAuth 配置正確
- [ ] Google 用戶可以正常登入
- [ ] 匿名用戶可以訪客試用
- [ ] 用戶信息正確保存（UUID + user_identities）
- [ ] Google 用戶通過 email 跨模式統一
- [ ] 創作的故事正確關聯到用戶
- [ ] 登出功能正常
- [ ] 刷新頁面 session 保持

### 最終完成標準
- [ ] 雙模式自動切換
- [ ] 同一個 Google 賬號（email）數據一致
- [ ] 匿名用戶可以試用（獨立模式）
- [ ] 平台模式下 Google 用戶無需再次登入
- [ ] 獨立模式支持 Google 和匿名兩種方式
- [ ] 代碼符合架構規範

---

## 📚 相關文檔

- [認證架構設計](mdc:story-vocab/docs/AUTH_ARCHITECTURE.md)
- [Cursor Rule: Story-Vocab 認證](mdc:.cursor/rules/story-vocab-auth.mdc)
- [Cursor Rule: 雙模式架構](mdc:.cursor/rules/dual-mode-architecture.mdc)
- [太虛幻境架構文檔](mdc:TAIXU_ARCHITECTURE.md)

---

**準備好開始實施了！** 🚀

