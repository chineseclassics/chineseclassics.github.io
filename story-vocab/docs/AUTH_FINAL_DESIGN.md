# 詞遊記認證系統最終設計方案

> **確定日期**：2025-10-11  
> **核心決策**：UUID 主鍵 + 多重身份系統  
> **支持方式**：Google 登入（主要）+ 匿名試用（訪客）

---

## 🎯 設計演進歷程

### 最初想法（已棄用）
❌ **Google ID 作為主鍵**
- 問題：無法支持非 Google 用戶
- 問題：未來擴展受限

### 最終方案（確定）
✅ **UUID 主鍵 + 多重身份系統**
- 支持 Google 用戶（學校學生）
- 支持匿名用戶（社會大眾訪客）
- 預留未來擴展（Apple、微信等）

---

## 📊 用戶類型設計

### 類型 1：Google 用戶（registered）

**目標**：學校學生（擁有 Google Workspace 賬號）

**特性**：
- ✅ 使用 Google OAuth 登入
- ✅ 數據雲端保存（Supabase）
- ✅ 支持跨設備使用
- ✅ 支持跨模式（平台/獨立）
- ✅ 通過 **email** 統一身份

**數據示例**：
```sql
-- users 表
{
  id: "uuid-550e8400...",
  email: "zhang@school.edu",
  display_name: "張同學",
  user_type: "registered"
}

-- user_identities 表
{
  user_id: "uuid-550e8400...",
  provider: "google",
  provider_id: "102345678901234567890"  // Google ID
}
```

### 類型 2：匿名用戶（anonymous）

**目標**：訪客試用（沒有 Google 賬號的一般大眾）

**特性**：
- ✅ 一鍵開始，無需註冊
- ✅ 數據保存在雲端（Supabase session）
- ✅ 瀏覽器 session 保持時可繼續使用
- ❌ 不支持跨設備
- ❌ 不支持跨模式
- ❌ 不提供升級為正式用戶功能

**數據示例**：
```sql
-- users 表
{
  id: "uuid-660e8400...",
  email: null,
  display_name: "訪客8234",
  user_type: "anonymous"
}

-- user_identities 表
{
  user_id: "uuid-660e8400...",
  provider: "anonymous",
  provider_id: "anon_abc123xyz"  // Supabase 匿名 ID
}
```

**設計理念**：
- 降低試用門檻
- 如果用戶喜歡，會主動用 Google 註冊
- 簡化邏輯，避免過度設計

---

## 🏗️ 數據庫設計

### 完整表結構

```sql
-- 1. 用戶主表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- Google 用戶必須，匿名用戶為 NULL
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

-- 2. 用戶身份關聯表
CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'google' | 'anonymous' | 'apple' | 'email'
  provider_id TEXT NOT NULL,           -- 該提供商的用戶唯一 ID
  provider_data JSONB,                 -- 提供商的額外數據（email, name 等）
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

-- 4. 註釋
COMMENT ON TABLE users IS '詞遊記用戶表 - 支持多種登入方式';
COMMENT ON TABLE user_identities IS '用戶身份關聯表 - 綁定不同的登入提供商';
COMMENT ON COLUMN users.email IS 'Google等OAuth用戶必須，匿名用戶為NULL';
COMMENT ON COLUMN users.user_type IS 'registered（正式用戶）或anonymous（匿名訪客）';
```

---

## 🔄 跨模式數據統一

### Google 用戶（需要跨模式）

**統一標識符**：Email

```javascript
// 獨立模式 - Google 登入
const googleId = authUser.user_metadata.sub;
const email = authUser.email;

// 1. 先用 email 查找（跨模式的關鍵）
let user = await supabase.from('users')
  .select('*')
  .eq('email', email)
  .single();

if (!user) {
  // 2. 創建新用戶
  user = await supabase.from('users').insert({
    email: email,
    display_name: authUser.user_metadata.name,
    user_type: 'registered'
  }).select().single();
  
  // 3. 綁定 Google 身份
  await supabase.from('user_identities').insert({
    user_id: user.id,
    provider: 'google',
    provider_id: googleId
  });
}

// 平台模式 - 接收平台用戶
const platformUser = event.data.user;

// 1. 同樣用 email 查找
let user = await supabase.from('users')
  .select('*')
  .eq('email', platformUser.email)
  .single();

if (!user) {
  // 2. 創建（使用平台信息）
  user = await supabase.from('users').insert({
    email: platformUser.email,
    display_name: platformUser.display_name,
    user_type: 'registered'
  }).select().single();
}

✅ 結果：同一個 email = 同一個用戶
```

### 匿名用戶（不需要跨模式）

```javascript
// 只在獨立模式提供
const { data } = await supabase.auth.signInAnonymously();

const user = await supabase.from('users').insert({
  email: null,
  display_name: `訪客${Math.floor(Math.random() * 10000)}`,
  user_type: 'anonymous'
}).select().single();

await supabase.from('user_identities').insert({
  user_id: user.id,
  provider: 'anonymous',
  provider_id: data.user.id
});

✅ 特點：
- 數據保存在雲端（只要 session 有效）
- 換設備會丟失（可接受）
- 不提供升級功能（簡化邏輯）
```

---

## 🎨 用戶界面設計

### 登入選擇界面

```
┌─────────────────────────────────┐
│  🎭 詞遊記                       │
│  與AI共創故事，樂學詞語          │
│                                 │
│  💡 選擇登入方式                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔐 使用 Google 登入       │  │
│  │ 推薦 - 數據雲端保存        │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 👤 訪客試用               │  │
│  │ 立即體驗，無需註冊         │  │
│  └───────────────────────────┘  │
│                                 │
│  ℹ️ 訪客數據不跨設備            │
└─────────────────────────────────┘
```

### 用戶類型標識

**Google 用戶**：
```
側邊欄：
┌──────────────────┐
│ 👤 張同學         │
│ 等級 L2 · 初級    │
│ 🔐 Google 賬號    │  ← 標識
└──────────────────┘
```

**匿名用戶**：
```
側邊欄：
┌──────────────────┐
│ 👤 訪客8234       │
│ 等級 L2 · 初級    │
│ ⚡ 試用模式       │  ← 標識
└──────────────────┘
```

---

## 📋 實施檢查清單

### 數據庫
- [ ] 創建 users 表（UUID 主鍵，email 可為 NULL）
- [ ] 創建 user_identities 表
- [ ] 創建必要的索引
- [ ] 運行遷移

### 認證模塊
- [ ] run-mode-detector.js（檢測模式）
- [ ] auth-service.js（抽象層）
- [ ] standalone-auth.js（Google + 匿名）
- [ ] platform-auth.js（接收平台信息）

### UI 集成
- [ ] 登入選擇界面
- [ ] Google 登入按鈕
- [ ] 訪客試用按鈕
- [ ] 用戶類型標識

### 測試
- [ ] Google 登入流程
- [ ] 匿名試用流程
- [ ] 跨模式數據統一（Google 用戶 email）
- [ ] 數據正確保存

---

## ✅ 優勢總結

### 1. 覆蓋所有目標用戶
- ✅ 學校學生（Google）
- ✅ 社會大眾（匿名）
- ✅ 未來用戶（其他方式）

### 2. 用戶體驗優化
- ✅ Google 用戶：完整功能，跨設備
- ✅ 訪客：零門檻試用
- ✅ 登入方式清晰直觀

### 3. 架構標準靈活
- ✅ UUID 主鍵（最佳實踐）
- ✅ 身份分離（用戶 vs 認證）
- ✅ 輕鬆擴展新的登入方式

### 4. 符合教育場景
- ✅ 學校 Google 系統無縫對接
- ✅ 訪客可以試用後決定是否註冊
- ✅ 數據隱私保護（匿名用戶無個人信息）

---

## 📚 相關文檔

- [多重身份系統詳細設計](MULTI_IDENTITY_SYSTEM.md)
- [實施計劃](IMPLEMENTATION_PLAN.md)
- [架構決策總結](AUTH_DECISIONS_SUMMARY.md)
- [Cursor Rule: 認證架構](@story-vocab/auth)

---

**這是經過充分討論後的最終方案，平衡了當前需求和未來擴展性。** ✅

