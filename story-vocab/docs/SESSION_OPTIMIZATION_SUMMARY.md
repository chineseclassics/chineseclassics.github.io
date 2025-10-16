# Session 系統優化總結

> **日期**：2025-10-16  
> **目標**：解決 session 重複獲取和並發問題

## 🎯 核心問題

### 問題1：重複調用 `getSession()`

**舊架構**：
```javascript
// app.js - 輪詢檢查（每 200ms 一次，最多 10 次）
const checkInterval = setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  // ...
}, 200);

// vocab-integration.js - 每次推薦詞彙都調用
const { data: { session } } = await supabase.auth.getSession();

// standalone-auth.js - 匿名登入時檢查
const { data: { session } } = await this.supabase.auth.getSession();

// standalone-auth.js - 獲取 Google 頭像時
const { data: { session } } = await this.supabase.auth.getSession();
```

**統計**：
- `app.js`：最多 10 次（輪詢）
- `vocab-integration.js`：每輪 1 次
- `standalone-auth.js`：2 次
- **總計**：單次遊戲可能 15+ 次重複調用

### 問題2：並發競爭

當第一輪和第二輪快速切換時：
```
第一輪：getSession() → 阻塞中...
第二輪：getSession() → 等待第一輪...
結果：第二輪超時 ⏱️
```

### 問題3：沒有統一管理

每個模塊都自己管理 session，導致：
- 重複邏輯
- 維護困難
- 容易出錯

## ✅ 解決方案：SessionManager

### 核心設計

創建全局 Session 管理器（`session-manager.js`），統一管理所有 session 操作。

```javascript
class SessionManager {
  // 緩存當前 session
  cachedSession = null;
  
  // 監聽認證狀態變化，自動更新緩存
  async initialize() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.cachedSession = session;
    });
  }
  
  // 優先使用緩存
  async getSession(forceRefresh = false) {
    if (this.cachedSession && !forceRefresh) {
      return this.cachedSession; // ♻️ 緩存命中
    }
    
    // 只在必要時調用 Supabase
    return await this.supabase.auth.getSession();
  }
}
```

### 關鍵特性

1. **自動緩存**：通過 `onAuthStateChange` 監聽，自動更新緩存
2. **並發控制**：同時多個請求時，等待第一個完成
3. **統一 API**：提供 `getSession()`、`getAccessToken()`、`getUser()` 等方法
4. **智能等待**：`waitForSession()` 在啟動時等待認證完成

## 📝 修改清單

### 1. 新增文件

**`js/core/session-manager.js`**
- 核心 SessionManager 類
- 單例模式
- 提供統一 API

### 2. 修改文件

#### `js/app.js`
**修改前**：
```javascript
// 輪詢檢查 session（10 次 × 200ms）
const checkInterval = setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  // ...
}, 200);
```

**修改後**：
```javascript
// 初始化 SessionManager
await sessionManager.initialize();

// 使用緩存或等待
if (sessionManager.isAuthenticated()) {
  return true; // 立即返回
}
return await sessionManager.waitForSession(5000);
```

**效果**：
- ❌ 刪除：10 次輪詢調用
- ✅ 替換：1 次緩存檢查 + 必要時等待

---

#### `js/core/vocab-integration.js`
**修改前**：
```javascript
// 每次推薦詞彙都獲取 session
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;
```

**修改後**：
```javascript
// 直接從 SessionManager 獲取 token
const accessToken = await sessionManager.getAccessToken();
```

**效果**：
- ✅ 使用緩存的 token
- ✅ 避免重複調用
- ✅ 解決並發問題

---

#### `js/auth/standalone-auth.js`
**修改前**：
```javascript
// 檢查現有 session
const { data: { session } } = await this.supabase.auth.getSession();

// 獲取 Google token
const { data: { session } } = await this.supabase.auth.getSession();
const googleToken = session?.provider_token;
```

**修改後**：
```javascript
// 使用 SessionManager
const sessionManager = (await import('../core/session-manager.js')).default;
const session = await sessionManager.getSession();

// 獲取 Google token
const googleToken = await sessionManager.getProviderToken();
```

**效果**：
- ✅ 減少 2 次 `getSession()` 調用
- ✅ 使用統一 API

## 📊 性能提升

### 調用次數對比

| 場景 | 舊架構 | 新架構 | 減少 |
|------|--------|--------|------|
| 應用啟動 | 1 次 | 1 次 | 0 |
| Session 檢查 | 10 次 | 0 次* | -10 |
| 詞彙推薦（8輪） | 8 次 | 0 次* | -8 |
| 匿名登入 | 1 次 | 0 次* | -1 |
| 獲取 Google 頭像 | 1 次 | 0 次* | -1 |
| **總計** | **21 次** | **1 次** | **-20 次** |

\* 使用緩存，不調用 `getSession()`

### 時間節省

假設每次 `getSession()` 需要 50ms：
- 舊架構：21 × 50ms = **1050ms** (1秒)
- 新架構：1 × 50ms = **50ms**
- **節省**：1000ms（95% 提升）

## 🔧 SessionManager API

### 核心方法

```javascript
// 初始化（只需調用一次）
await sessionManager.initialize();

// 獲取 session（優先使用緩存）
const session = await sessionManager.getSession();

// 強制刷新
const session = await sessionManager.getSession(true);

// 獲取 access token（用於 API 調用）
const token = await sessionManager.getAccessToken();

// 獲取當前用戶
const user = await sessionManager.getUser();

// 獲取 provider token（如 Google OAuth token）
const googleToken = await sessionManager.getProviderToken();

// 檢查是否已登入
if (sessionManager.isAuthenticated()) {
  // ...
}

// 等待 session 就緒（啟動時）
const isReady = await sessionManager.waitForSession(5000);

// 清除緩存（登出時）
sessionManager.clear();
```

## 🎯 使用規範

### ✅ 正確做法

```javascript
// 1. 初始化時調用（app.js）
await sessionManager.initialize();

// 2. 獲取 token 用於 API 調用
const token = await sessionManager.getAccessToken();
fetch(API_URL, {
  headers: { Authorization: `Bearer ${token}` }
});

// 3. 檢查登入狀態
if (sessionManager.isAuthenticated()) {
  // 用戶已登入
}

// 4. 等待就緒
await sessionManager.waitForSession();
```

### ❌ 錯誤做法

```javascript
// ❌ 不要直接調用 getSession()
const { data: { session } } = await supabase.auth.getSession();

// ❌ 不要輪詢檢查
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
}, 200);

// ❌ 不要在多個地方自己管理緩存
let cachedSession = null;
```

## 🐛 問題修復

### 修復1：第二輪詞彙卡片不顯示

**原因**：並發調用 `getSession()` 導致阻塞

**修復**：使用 SessionManager 的並發控制
```javascript
// 舊代碼（阻塞）
const { data: { session } } = await supabase.auth.getSession(); // 第一輪
const { data: { session } } = await supabase.auth.getSession(); // 第二輪 ← 阻塞

// 新代碼（緩存）
const token = await sessionManager.getAccessToken(); // 第一輪 - 獲取
const token = await sessionManager.getAccessToken(); // 第二輪 - 緩存命中 ✅
```

### 修復2：啟動時輪詢檢查

**原因**：`ensureSessionReady()` 使用輪詢（10次 × 200ms）

**修復**：使用 `waitForSession()` 智能等待
```javascript
// 舊代碼（輪詢）
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
}, 200);

// 新代碼（事件驅動）
await sessionManager.waitForSession(5000);
```

## 📚 相關文件

- `js/core/session-manager.js` - SessionManager 實現
- `js/app.js` - 應用初始化
- `js/core/vocab-integration.js` - 詞彙推薦
- `js/auth/standalone-auth.js` - 獨立認證

## 🔮 未來優化

1. **Token 自動刷新**
   - 監聽 `TOKEN_REFRESHED` 事件
   - 自動更新緩存的 token

2. **離線模式支持**
   - 檢測網絡狀態
   - 離線時使用本地緩存

3. **更細粒度的緩存失效**
   - 設置緩存時間（如 5 分鐘）
   - 過期後自動刷新

4. **錯誤恢復**
   - session 過期自動重新登入
   - 網絡錯誤重試機制

## 📝 測試清單

- [x] 應用啟動時正常初始化
- [x] 第一輪詞彙推薦正常
- [x] 第二輪詞彙推薦正常（不阻塞）
- [x] 快速連續多輪推薦（不阻塞）
- [x] 匿名登入時檢查現有 session
- [x] Google 登入獲取頭像
- [x] 登出時清除緩存
- [x] 緩存命中時立即返回
- [ ] Token 過期時自動刷新
- [ ] 網絡錯誤時重試

## 🎉 總結

通過引入 SessionManager：

1. **性能提升 95%**：從 21 次調用減少到 1 次
2. **解決並發問題**：第二輪詞彙推薦不再阻塞
3. **代碼簡化**：統一 API，減少重複邏輯
4. **易於維護**：集中管理，便於調試和優化

---

**最後更新**：2025-10-16  
**維護者**：太虛幻境開發團隊

