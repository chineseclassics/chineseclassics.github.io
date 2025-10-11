# Google ID 作為主鍵設計文檔

> **創建日期**：2025-10-11  
> **核心決策**：使用 Google ID 而非 UUID 作為 users 表主鍵

---

## 🎯 問題背景

### 場景：同一個 Google 賬號，兩種登入方式

```
張同學的 Google 賬號: zhang@school.edu

情況 A：在太虛幻境平台登入
  ↓
太虛幻境 Supabase A 處理 OAuth
  ↓
生成: user_id = "uuid-aaa-111"

情況 B：直接打開詞遊記獨立版登入
  ↓  
詞遊記 Supabase B 處理 OAuth
  ↓
生成: user_id = "uuid-bbb-222"

❌ 問題：兩個不同的 user_id，無法識別為同一個用戶！
```

---

## ✅ 解決方案：使用 Google ID

### Google ID 的特性

Google 為每個用戶提供唯一且永久不變的標識符：

```javascript
// Google OAuth 返回的用戶信息
{
  "id": "102345678901234567890",        // Supabase 生成的 UUID
  "email": "zhang@school.edu",
  "user_metadata": {
    "sub": "102345678901234567890",     // ✅ Google 唯一 ID
    "name": "張同學",
    "avatar_url": "https://...",
    "provider_id": "102345678901234567890"
  }
}
```

**關鍵字段**：
- `user_metadata.sub` - Google 的用戶唯一標識符
- `user_metadata.provider_id` - 同樣是 Google ID（備用）

**特性**：
- ✅ 全球唯一
- ✅ 永久不變
- ✅ 不管從哪個 Supabase project 登入，都一樣

---

## 📊 數據庫設計

### 修改前（錯誤）

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ❌ 各自生成，不統一
  username TEXT,
  email TEXT,
  display_name TEXT
);
```

**問題**：每個 Supabase 生成自己的 UUID，無法關聯。

### 修改後（正確）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- ✅ Google ID
  google_id TEXT UNIQUE NOT NULL,         -- Google ID（冗餘，方便查詢）
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  current_level DECIMAL(2,1) DEFAULT 2.0,
  total_stories_completed INT DEFAULT 0,
  auth_mode TEXT DEFAULT 'standalone',    -- 'standalone' | 'platform'
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

**優點**：
- ✅ 同一個 Google 賬號 → 同一個 id
- ✅ 跨模式數據自動統一
- ✅ 無需數據遷移

---

## 🔄 用戶同步邏輯

### 獨立模式

```javascript
async function syncUserToDatabase(authUser) {
  const supabase = getSupabase(); // 詞遊記的 Supabase B
  
  // 提取 Google ID
  const googleId = authUser.user_metadata?.sub || 
                   authUser.user_metadata?.provider_id;
  
  // 使用 upsert（如果存在就更新，不存在就創建）
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: googleId,                          // ✅ Google ID 作為主鍵
      google_id: googleId,
      email: authUser.email,
      display_name: authUser.user_metadata?.name,
      avatar_url: authUser.user_metadata?.avatar_url,
      auth_mode: 'standalone',
      last_login_at: new Date().toISOString()
    }, {
      onConflict: 'id'  // 主鍵衝突時更新
    })
    .select()
    .single();
  
  return data;
}
```

### 平台模式

```javascript
async function syncPlatformUser(platformUser) {
  const supabase = getSupabase(); // 詞遊記的 Supabase B
  
  // 平台傳來的用戶信息（已包含 Google ID）
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: platformUser.google_id,            // ✅ 使用平台傳來的 Google ID
      google_id: platformUser.google_id,
      email: platformUser.email,
      display_name: platformUser.display_name,
      avatar_url: platformUser.avatar_url,
      auth_mode: 'platform',
      last_login_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select()
    .single();
  
  return data;
}
```

---

## ✅ 數據一致性驗證

### 測試場景

**第一次：平台模式登入**
```
1. 張同學在太虛幻境平台用 Google 登入
2. 平台 Supabase A 創建平台用戶記錄
3. 打開詞遊記 iframe
4. 詞遊記接收平台用戶信息（包含 Google ID）
5. 詞遊記 Supabase B 創建：
   users.id = "102345678901234567890"
   users.email = "zhang@school.edu"
6. 創作 3 個故事，數據在 Supabase B
```

**第二次：獨立模式登入**
```
1. 張同學直接打開詞遊記獨立版
2. 點擊 "使用 Google 登入"
3. 詞遊記 Supabase B 處理 Google OAuth
4. 提取 Google ID = "102345678901234567890"
5. 執行 upsert，發現 id 已存在
6. 更新 last_login_at，不創建新記錄
7. ✅ 看到之前創作的 3 個故事！
```

**結果**：
- ✅ 同一個用戶記錄（id = "102345678901234567890"）
- ✅ 數據完全一致
- ✅ 無需遷移或合併

---

## 🏗️ Supabase 獨立性確認

### 架構圖

```
┌─────────────────────────────────────────┐
│  太虛幻境平台                            │
│  Supabase Project A (平台用戶中心)       │
│  URL: https://platform-hub.supabase.co  │
├─────────────────────────────────────────┤
│  Tables:                                │
│  - platform_users                       │
│  - learning_metrics (跨應用聚合數據)     │
│  - unified_vocabulary (統一生詞本)       │
└────────────┬────────────────────────────┘
             │
             │ postMessage
             │ 傳遞：{ google_id, email, name, avatar }
             │ 不傳遞：story_sessions, vocabulary 等詳細數據
             ↓
┌─────────────────────────────────────────┐
│  詞遊記應用                              │
│  Supabase Project B (bjykaipbeokbbykvseyr) │
│  URL: https://bjykaipbeokbbykvseyr.supabase.co │
├─────────────────────────────────────────┤
│  Tables:                                │
│  - users (本地用戶副本，使用 Google ID)  │
│  - story_sessions (故事詳細數據)        │
│  - user_vocabulary (詞彙學習記錄)       │
│  - user_wordbook (生詞本)               │
│  - game_rounds (遊戲回合記錄)           │
└─────────────────────────────────────────┘
```

### 通信方式確認

**❌ 不是這樣**：
```javascript
// 錯誤：直接連接平台數據庫
const platformUser = await platformSupabase
  .from('platform_users')
  .select('*')
  .eq('id', userId);  // ❌ 跨 project 查詢
```

**✅ 正確方式**：
```javascript
// 平台主站（太虛幻境 index.html）
iframe.contentWindow.postMessage({
  type: 'TAIXU_AUTH',
  user: {
    google_id: '102345678901234567890',
    email: 'zhang@school.edu',
    display_name: '張同學',
    avatar_url: 'https://...'
  }
}, '*');

// 詞遊記（platform-auth.js）
window.addEventListener('message', (event) => {
  if (event.data.type === 'TAIXU_AUTH') {
    // 接收並同步到自己的數據庫
    await supabase.from('users').upsert({
      id: event.data.user.google_id,  // ✅ 使用平台傳來的 Google ID
      google_id: event.data.user.google_id,
      email: event.data.user.email,
      // ...
    });
  }
});
```

---

## 🎯 用戶體驗流程

### 平台模式（主要使用場景）

```
用戶打開太虛幻境主站
  ↓
點擊 "使用 Google 登入"（只需一次）
  ↓
太虛幻境 Supabase A 處理 OAuth
  ↓
用戶信息存入平台 users 表
  ↓
用戶點擊打開詞遊記
  ↓
詞遊記在 iframe 中加載
  ↓
詞遊記檢測到"平台模式"
  ↓
向平台發送 "APP_READY" 消息
  ↓
平台通過 postMessage 傳遞用戶信息
  ↓
詞遊記接收，同步到自己的 users 表（Supabase B）
  ↓
✅ 用戶直接開始使用（無需再次登入）
```

### 獨立模式（未來分發）

```
用戶直接打開詞遊記
  ↓
詞遊記檢測到"獨立模式"
  ↓
顯示 "使用 Google 登入" 按鈕
  ↓
用戶點擊登入
  ↓
詞遊記 Supabase B 處理 OAuth
  ↓
提取 Google ID，存入 users 表
  ↓
✅ 用戶開始使用
```

---

## 🔧 關聯表處理

### 外鍵關係

所有關聯 users 表的外鍵需要匹配 TEXT 類型：

```sql
-- story_sessions 表
CREATE TABLE story_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),     -- ✅ TEXT 類型，存 Google ID
  story_theme TEXT,
  conversation_history JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_vocabulary 表
CREATE TABLE user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),     -- ✅ TEXT 類型
  vocabulary_id UUID REFERENCES vocabulary(id),
  times_used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_wordbook 表
CREATE TABLE user_wordbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),     -- ✅ TEXT 類型
  vocabulary_id UUID REFERENCES vocabulary(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 遷移注意事項

如果 users 表已有數據（使用 UUID）：

**選項 A：清空重建**（推薦，如果是測試數據）
```sql
TRUNCATE users CASCADE;  -- 清空所有用戶數據和關聯數據
-- 然後運行新的遷移
```

**選項 B：保留舊數據**（如果有重要數據）
```sql
-- 需要手動將舊 UUID 映射到 Google ID
-- 用戶下次用 Google 登入時會創建新記錄
-- 舊數據可能無法關聯
```

---

## 📝 代碼實現示例

### 提取 Google ID

```javascript
/**
 * 從 Supabase Auth 用戶對象提取 Google ID
 */
function extractGoogleId(authUser) {
  // Google ID 可能在不同字段
  return authUser.user_metadata?.sub ||           // 主要位置
         authUser.user_metadata?.provider_id ||   // 備用位置
         authUser.identities?.[0]?.id ||          // 第三選擇
         authUser.id;                             // 降級方案（Supabase UUID）
}
```

### 同步用戶（通用邏輯）

```javascript
/**
 * 同步用戶到 users 表
 * 獨立模式和平台模式都使用這個邏輯
 */
async function syncUser(userData, authMode) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userData.google_id,
      google_id: userData.google_id,
      email: userData.email,
      display_name: userData.display_name,
      avatar_url: userData.avatar_url,
      auth_mode: authMode,              // 記錄登入方式
      last_login_at: new Date().toISOString()
    }, {
      onConflict: 'id',                 // 如果 id 已存在就更新
      ignoreDuplicates: false           // 執行更新而不是忽略
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

---

## 🧪 測試驗證

### 測試步驟

1. **清空測試數據**
   ```sql
   TRUNCATE users CASCADE;
   ```

2. **平台模式測試**
   - 模擬平台傳遞用戶信息（Google ID = "test_12345"）
   - 檢查 users 表創建的記錄
   - 記錄 user_id

3. **獨立模式測試**
   - 用同一個 Google 賬號登入
   - 檢查是否使用同一個 user_id
   - 驗證數據一致性

### 驗證 SQL

```sql
-- 查看用戶記錄
SELECT id, google_id, email, auth_mode, last_login_at 
FROM users;

-- 驗證外鍵關聯
SELECT u.id, u.display_name, COUNT(s.id) as story_count
FROM users u
LEFT JOIN story_sessions s ON s.user_id = u.id
GROUP BY u.id, u.display_name;
```

---

## ⚠️ 注意事項

### 1. ID 類型一致性

所有引用 users.id 的外鍵必須是 TEXT 類型：
```sql
ALTER TABLE story_sessions 
  ALTER COLUMN user_id TYPE TEXT;
```

### 2. 索引性能

TEXT 主鍵比 UUID 稍慢，但差異可忽略：
- Google ID 長度：20 位數字
- UUID 長度：36 字符
- 索引效率：TEXT 略低，但對小型應用無影響

### 3. 降級處理

如果無法獲取 Google ID（異常情況）：
```javascript
const googleId = extractGoogleId(authUser) || 
                 `fallback_${authUser.id}`;  // 使用 Supabase UUID
```

---

## 🎯 優勢總結

### 1. 跨模式數據統一
- 同一個 Google 賬號 = 同一個用戶
- 切換模式時數據自動對應
- 無需遷移或合併

### 2. 簡化架構
- 不需要複雜的用戶映射表
- 不需要數據同步機制
- 邏輯清晰易維護

### 3. 學校場景友好
- 學校使用 Google Workspace
- 每個學生有唯一的 Google 賬號
- Google ID 是天然的學生標識符

### 4. 隱私保護
- Google ID 是匿名的數字串
- 不暴露學生真實姓名或學號
- 符合隱私保護要求

---

## 📚 參考資源

- [Google Identity 文檔](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google OAuth 指南](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [認證架構設計](AUTH_ARCHITECTURE.md)
- [實施計劃](IMPLEMENTATION_PLAN.md)

---

**關鍵要點**：Google ID 是連接平台模式和獨立模式的橋樑，保證了雙模式架構的數據一致性。

