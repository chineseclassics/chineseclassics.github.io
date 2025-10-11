# 多重身份認證系統設計

> **創建日期**：2025-10-11  
> **核心決策**：UUID 主鍵 + 多重身份支持  
> **目標用戶**：Google 用戶（主要）+ 匿名訪客（試用）+ 未來其他方式

---

## 🎯 需求背景

### 目標用戶群

1. **學校學生**（主要）
   - 擁有 Google Workspace 賬號
   - 需要保存學習進度
   - 支持跨設備、跨模式

2. **社會大眾訪客**（次要）
   - 可能沒有 Google 賬號
   - 試用體驗為主
   - 數據保存在當前設備即可

3. **未來擴展用戶**（預留）
   - 其他學校（可能用 Apple、微信等）
   - 個人用戶（郵箱註冊）

---

## 🏗️ 架構設計

### 為什麼不用 Google ID 作為主鍵？

**問題場景**：
```
用戶 A：Google 登入 → id = "google_12345"
用戶 B：匿名登入 → id = "???"（沒有 Google ID）
用戶 C：Apple 登入 → id = "???"（沒有 Google ID）
```

❌ Google ID 無法覆蓋所有登入方式

### 解決方案：UUID + 身份分離

```
users 表（核心用戶數據）
  ↓ 一對多
user_identities 表（登入方式綁定）
  ├─ Google 身份
  ├─ 匿名身份
  ├─ Apple 身份（未來）
  └─ 郵箱身份（未來）
```

---

## 📊 數據庫設計

### 核心表結構

```sql
-- 1. 用戶主表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- Google/Apple 等有，匿名為 NULL
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  user_type TEXT DEFAULT 'registered', -- 'registered' | 'anonymous'
  current_level DECIMAL(2,1) DEFAULT 2.0,
  total_stories_completed INT DEFAULT 0,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 身份關聯表
CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'google' | 'anonymous' | 'apple' | 'email'
  provider_id TEXT NOT NULL,           -- 該提供商的用戶唯一 ID
  provider_data JSONB,                 -- 提供商的額外數據
  is_primary BOOLEAN DEFAULT true,     -- 是否為主要登入方式
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider, provider_id)        -- 同一提供商的 ID 只能綁定一個用戶
);

-- 3. 索引
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_identities_user ON user_identities(user_id);
CREATE INDEX idx_identities_provider ON user_identities(provider, provider_id);
```

---

## 👥 用戶類型設計

### 類型 1：Google 用戶（registered）

**數據示例**：
```sql
-- users 表
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "zhang@school.edu",
  display_name: "張同學",
  avatar_url: "https://...",
  user_type: "registered"
}

-- user_identities 表
{
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  provider: "google",
  provider_id: "102345678901234567890",  // Google ID
  provider_data: {
    "email": "zhang@school.edu",
    "name": "張同學",
    "avatar_url": "https://..."
  }
}
```

**特性**：
- ✅ 數據雲端保存
- ✅ 跨設備同步
- ✅ 支持跨模式（用 email 統一）

### 類型 2：匿名用戶（anonymous）

**數據示例**：
```sql
-- users 表
{
  id: "660e8400-e29b-41d4-a716-446655440001",
  email: null,                       -- 匿名無 email
  display_name: "訪客8234",
  avatar_url: null,
  user_type: "anonymous"
}

-- user_identities 表
{
  user_id: "660e8400-e29b-41d4-a716-446655440001",
  provider: "anonymous",
  provider_id: "anon_abc123xyz",     // Supabase 匿名 ID
  provider_data: null
}
```

**特性**：
- ✅ 數據保存在雲端（Supabase）
- ✅ 瀏覽器 session 保持時可繼續使用
- ❌ 換設備會丟失（可接受）
- ❌ 不支持跨模式同步（不需要）
- ❌ 不提供升級為正式用戶功能

---

## 🔄 跨模式數據統一

### Google 用戶的跨模式邏輯

**統一標識符**：Email（而非 Google ID）

```javascript
// 獨立模式 Google 登入
async function syncGoogleUser(authUser) {
  const email = authUser.email;
  const googleId = authUser.user_metadata.sub;
  
  // 1. 用 email 查找用戶（跨模式的關鍵）
  let user = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (!user) {
    // 2. 創建新用戶
    const { data } = await supabase.from('users').insert({
      email: email,
      display_name: authUser.user_metadata.name,
      avatar_url: authUser.user_metadata.avatar_url,
      user_type: 'registered'
    }).select().single();
    user = data;
    
    // 3. 綁定 Google 身份
    await supabase.from('user_identities').insert({
      user_id: user.id,
      provider: 'google',
      provider_id: googleId,
      provider_data: {
        email: email,
        name: authUser.user_metadata.name
      }
    });
  }
  
  return user;
}

// 平台模式接收用戶
async function syncPlatformUser(platformUser) {
  const email = platformUser.email;
  
  // 1. 用 email 查找（與獨立模式相同邏輯）
  let user = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (!user) {
    // 2. 創建用戶（使用平台傳來的信息）
    const { data } = await supabase.from('users').insert({
      email: email,
      display_name: platformUser.display_name,
      avatar_url: platformUser.avatar_url,
      user_type: 'registered'
    }).select().single();
    user = data;
  }
  
  return user;
}
```

**關鍵點**：
- ✅ 兩種模式都用 email 查找
- ✅ 同一個 email = 同一個用戶
- ✅ 數據自動統一

---

## 🎮 用戶體驗設計

### Google 用戶流程

**獨立模式**：
```
打開詞遊記 → 顯示登入選項 → 選擇 Google 登入 → OAuth 流程 → 開始使用
```

**平台模式**：
```
太虛幻境平台登入 → 打開詞遊記 → 自動接收用戶信息 → 開始使用
```

### 匿名用戶流程

**獨立模式**：
```
打開詞遊記 → 顯示登入選項 → 選擇「訪客試用」→ 自動創建匿名用戶 → 開始使用
```

**平台模式**：
```
不適用（匿名用戶只在獨立模式）
```

### UI 設計

```html
<!-- 登入選擇界面 -->
<div class="login-options">
  <h2>選擇登入方式</h2>
  
  <!-- Google 登入（推薦）-->
  <button class="login-btn google" onclick="loginWithGoogle()">
    <span class="icon">🔐</span>
    <div>
      <div class="title">使用 Google 登入</div>
      <div class="subtitle">推薦 - 數據雲端保存，支持跨設備</div>
    </div>
  </button>
  
  <!-- 匿名試用 -->
  <button class="login-btn anonymous" onclick="continueAsGuest()">
    <span class="icon">👤</span>
    <div>
      <div class="title">訪客試用</div>
      <div class="subtitle">無需註冊，立即體驗（數據不跨設備）</div>
    </div>
  </button>
</div>
```

---

## 🔍 查找用戶的優先級策略

```javascript
/**
 * 通用查找/創建用戶函數
 */
async function findOrCreateUser(authInfo) {
  const { provider, providerId, email, displayName, avatarUrl } = authInfo;
  
  // 策略 1：用 provider + providerId 查找身份
  const { data: identity } = await supabase
    .from('user_identities')
    .select('user_id, users(*)')
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .single();
  
  if (identity?.users) {
    // 找到了已綁定的用戶
    return identity.users;
  }
  
  // 策略 2：如果有 email，用 email 查找用戶（跨模式的關鍵）
  let user = null;
  if (email) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    user = data;
  }
  
  // 策略 3：創建新用戶
  if (!user) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email,
        display_name: displayName,
        avatar_url: avatarUrl,
        user_type: provider === 'anonymous' ? 'anonymous' : 'registered'
      })
      .select()
      .single();
    
    if (error) throw error;
    user = data;
  }
  
  // 綁定身份（如果還沒綁定）
  await supabase
    .from('user_identities')
    .upsert({
      user_id: user.id,
      provider: provider,
      provider_id: providerId,
      is_primary: true,
      last_used_at: new Date()
    }, {
      onConflict: 'provider,provider_id'
    });
  
  return user;
}
```

---

## 📋 用戶類型對比

| 用戶類型 | 登入方式 | Email | 數據保存 | 跨模式 | 跨設備 | 升級 |
|---------|---------|-------|---------|--------|--------|------|
| **Google 用戶** | Google OAuth | ✅ 必須 | ✅ 雲端 | ✅ 支持 | ✅ 支持 | - |
| **匿名用戶** | 匿名登入 | ❌ 無 | ✅ 雲端 | ❌ 不需要 | ❌ 不支持 | ❌ 不提供 |
| **未來用戶** | Apple/微信/郵箱 | ✅ 有 | ✅ 雲端 | ✅ 支持 | ✅ 支持 | - |

---

## 🔧 實施要點

### 數據庫遷移

需要創建兩個表：
1. users（UUID 主鍵，email 可為 NULL）
2. user_identities（關聯登入方式）

### 認證服務實現

需要支持：
1. Google OAuth 流程
2. 匿名登入流程
3. 通用的 findOrCreateUser() 邏輯

### UI 適配

需要添加：
1. 登入方式選擇界面
2. 訪客試用按鈕
3. 用戶類型標識（顯示是正式用戶還是訪客）

---

## ✅ 優勢總結

### 1. 完全靈活
- 支持當前需求（Google + 匿名）
- 支持未來擴展（任何 OAuth 提供商）

### 2. 用戶體驗好
- Google 用戶：完整功能
- 訪客：立即試用，無門檻
- 跨模式統一（Google 用戶）

### 3. 架構標準
- UUID 主鍵（最佳實踐）
- 身份分離（用戶 vs 認證）
- 易於維護和擴展

### 4. 數據安全
- 正式用戶數據永久保存
- 匿名用戶隔離（不影響正式用戶）
- 支持數據遷移（匿名→正式，如果未來需要）

---

## 📚 相關文檔

- [認證架構設計](AUTH_ARCHITECTURE.md)
- [實施計劃](IMPLEMENTATION_PLAN.md)
- [架構決策總結](AUTH_DECISIONS_SUMMARY.md)

---

**核心決策**：UUID 主鍵 + 多重身份 = 最靈活的長期方案

