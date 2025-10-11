# Google 登入功能集成指南

> **創建日期**：2025-10-11  
> **適用項目**：詞遊記 (story-vocab)  
> **集成方式**：使用太虛幻境通用認證模塊 cc-auth.js

---

## 📋 前置條件檢查清單

在開始之前，請確認以下配置已完成：

### Supabase 端配置

- [ ] 已在 Supabase Dashboard 的 "Authentication" → "Providers" 中啟用 Google Provider
- [ ] 已獲取 Google Cloud Console 的 Client ID 和 Client Secret
- [ ] 已在 Supabase 中配置 Google OAuth 憑證
- [ ] 已配置正確的 Redirect URLs（應包含 GitHub Pages 域名）

### Google Cloud Console 配置

- [ ] 已創建 OAuth 2.0 客戶端 ID
- [ ] 已授權的重定向 URI 包含：
  - `https://chineseclassics.github.io`（生產環境）
  - `https://bjykaipbeokbbykvseyr.supabase.co/auth/v1/callback`（Supabase 回調）
- [ ] 已授權的 JavaScript 來源包含：
  - `https://chineseclassics.github.io`

### 當前項目狀態確認

- [ ] story-vocab 已使用 Supabase 客戶端
- [ ] users 表已存在且可以存儲用戶信息
- [ ] 當前使用匿名登錄（將被替換或補充）

---

## 🏗️ 架構概覽

```
太虛幻境根目錄
├── assets/js/cc-auth.js         # 通用認證模塊（已實現 Google 登入）
│
└── story-vocab/
    ├── index.html                # 需要引入 cc-auth.js
    ├── js/
    │   ├── auth-integration.js   # 新建：認證集成模塊
    │   ├── supabase-client.js    # 需要修改：添加 Google 登入
    │   └── app.js                # 需要修改：使用新的認證流程
    └── docs/
        └── GOOGLE_AUTH_INTEGRATION.md  # 本文檔
```

---

## 📝 實施步驟

### 步驟 1：在 index.html 中引入 cc-auth.js

**位置**：`story-vocab/index.html` 的 `<head>` 部分

```html
<head>
    <!-- 現有的樣式文件 -->
    <link rel="stylesheet" href="./css/variables.css">
    <!-- ... 其他 CSS ... -->
    
    <!-- 🆕 引入 Supabase UMD 包（cc-auth.js 需要）-->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <!-- 🆕 引入太虛幻境通用認證模塊 -->
    <script src="../assets/js/cc-auth.js"></script>
    
    <!-- 🆕 隱藏全局認證狀態欄的樣式 -->
    <style>
        /* 隱藏 cc-auth 的全局狀態欄（story-vocab 有自己的用戶界面）*/
        #cc-auth-bar {
            display: none !important;
        }
    </style>
</head>
```

**說明**：
- cc-auth.js 會自動初始化 Supabase 客戶端並掛載到 `window.ccAuth`
- 我們隱藏全局認證狀態欄，因為 story-vocab 有自己的側邊欄用戶界面

---

### 步驟 2：創建認證集成模塊

**創建文件**：`story-vocab/js/auth-integration.js`

```javascript
// =====================================================
// 認證集成模塊
// 將 cc-auth.js 的認證狀態同步到 story-vocab 的 UI
// =====================================================

import { getSupabase } from './supabase-client.js';
import { gameState } from './core/game-state.js';
import { showToast } from './utils/toast.js';

/**
 * 初始化認證系統
 */
export async function initAuth() {
  console.log('🔐 初始化認證系統...');
  
  // 等待 cc-auth.js 準備就緒
  if (!window.ccAuth) {
    console.error('❌ cc-auth.js 未載入');
    return null;
  }
  
  try {
    // 獲取當前用戶
    const user = await window.ccAuth.getUser();
    
    if (user) {
      console.log('✅ 用戶已登入:', user.email);
      await syncUserToStoryVocab(user);
      updateUIForLoggedInUser(user);
      return user;
    } else {
      console.log('ℹ️ 用戶未登入');
      updateUIForGuestUser();
      return null;
    }
  } catch (error) {
    console.error('❌ 認證初始化失敗:', error);
    return null;
  }
}

/**
 * 同步 Supabase Auth 用戶到 story-vocab 的 users 表
 */
async function syncUserToStoryVocab(authUser) {
  const supabase = getSupabase();
  
  try {
    // 檢查用戶是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (existingUser) {
      console.log('✅ 用戶已存在於 users 表');
      gameState.userId = existingUser.id;
      gameState.user = existingUser;
      return existingUser;
    }
    
    // 創建新用戶記錄
    const displayName = authUser.user_metadata?.name || 
                       authUser.email?.split('@')[0] || 
                       `用戶${Math.floor(Math.random() * 10000)}`;
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        username: authUser.email,
        display_name: displayName,
        email: authUser.email,
        current_level: 2.0,
        avatar_url: authUser.user_metadata?.avatar_url
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ 新用戶已創建:', newUser);
    gameState.userId = newUser.id;
    gameState.user = newUser;
    
    showToast(`👋 歡迎，${displayName}！`);
    
    return newUser;
  } catch (error) {
    console.error('❌ 同步用戶失敗:', error);
    throw error;
  }
}

/**
 * 更新 UI（已登入用戶）
 */
function updateUIForLoggedInUser(user) {
  const displayName = user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     '用戶';
  
  // 更新側邊欄用戶名
  const userDisplayNameEl = document.getElementById('user-display-name');
  if (userDisplayNameEl) {
    userDisplayNameEl.textContent = displayName;
  }
  
  // 更新頭像（如果有）
  const userAvatarEl = document.getElementById('user-avatar');
  if (userAvatarEl && user.user_metadata?.avatar_url) {
    userAvatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" 
                                    alt="${displayName}" 
                                    style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">`;
  }
  
  // 保存到 localStorage（用於頁面刷新後快速顯示）
  localStorage.setItem('user_display_name', displayName);
  localStorage.setItem('user_email', user.email);
  if (user.user_metadata?.avatar_url) {
    localStorage.setItem('user_avatar_url', user.user_metadata.avatar_url);
  }
}

/**
 * 更新 UI（訪客模式）
 */
function updateUIForGuestUser() {
  const userDisplayNameEl = document.getElementById('user-display-name');
  if (userDisplayNameEl) {
    userDisplayNameEl.textContent = '訪客';
  }
  
  const userAvatarEl = document.getElementById('user-avatar');
  if (userAvatarEl) {
    userAvatarEl.innerHTML = '👤';
  }
}

/**
 * Google 登入
 */
export async function loginWithGoogle() {
  try {
    showToast('正在跳轉到 Google 登入...');
    
    const { error } = await window.ccAuth.loginGoogle();
    
    if (error) {
      console.error('❌ Google 登入失敗:', error);
      showToast('❌ 登入失敗，請重試');
    }
    // 成功會自動跳轉到 Google，回調後自動刷新頁面
  } catch (error) {
    console.error('❌ Google 登入異常:', error);
    showToast('❌ 登入異常，請重試');
  }
}

/**
 * 登出
 */
export async function logout() {
  try {
    await window.ccAuth.signOut();
    
    // 清除 gameState
    gameState.userId = null;
    gameState.user = null;
    
    // 清除 localStorage
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar_url');
    
    // 更新 UI
    updateUIForGuestUser();
    
    showToast('✅ 已登出');
    
    // 刷新頁面（清理狀態）
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('❌ 登出失敗:', error);
    showToast('❌ 登出失敗，請重試');
  }
}

/**
 * 監聽認證狀態變化
 */
export function setupAuthListener() {
  const supabase = getSupabase();
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 認證狀態變化:', event);
    
    if (event === 'SIGNED_IN') {
      const user = session?.user;
      if (user) {
        await syncUserToStoryVocab(user);
        updateUIForLoggedInUser(user);
        showToast('✅ 登入成功！');
      }
    } else if (event === 'SIGNED_OUT') {
      gameState.userId = null;
      gameState.user = null;
      updateUIForGuestUser();
    }
  });
}

export default {
  initAuth,
  loginWithGoogle,
  logout,
  setupAuthListener
};
```

---

### 步驟 3：修改 supabase-client.js

**位置**：`story-vocab/js/supabase-client.js`

**需要修改的部分**：

```javascript
// =====================================================
// 在文件開頭添加
// =====================================================

/**
 * 使用 cc-auth.js 的 Supabase 客戶端
 * （避免重複初始化）
 */
export async function initSupabase() {
  // 如果 cc-auth.js 已經初始化了客戶端，直接使用
  if (window.ccAuth) {
    supabaseClient = window.ccAuth.getClient();
    console.log('✅ 使用 cc-auth.js 的 Supabase 客戶端');
    return supabaseClient;
  }
  
  // 否則，按原來的方式初始化（向後兼容）
  if (supabaseClient) {
    console.log('ℹ️ Supabase 客戶端已存在，跳過重複初始化');
    return supabaseClient;
  }
  
  // ... 原有的初始化代碼 ...
}

// =====================================================
// 移除或註釋掉 signInAnonymously() 函數
// （改用 Google 登入）
// =====================================================

/**
 * 匿名登錄（已棄用，改用 Google 登錄）
 * @deprecated 請使用 auth-integration.js 中的 Google 登入
 */
export async function signInAnonymously() {
  console.warn('⚠️ 匿名登錄已棄用，請使用 Google 登入');
  throw new Error('請使用 Google 登入');
}
```

---

### 步驟 4：修改 app.js

**位置**：`story-vocab/js/app.js`

**修改初始化流程**：

```javascript
// =====================================================
// 在文件開頭導入認證模塊
// =====================================================

import { initAuth, setupAuthListener, loginWithGoogle, logout } from './auth-integration.js';

// =====================================================
// 修改 initializeApp() 函數
// =====================================================

async function initializeApp() {
    try {
        // 1. 初始化 Supabase（使用 cc-auth.js 的客戶端）
        const supabase = await initSupabase();
        console.log('✅ Supabase 客戶端初始化成功');
        
        // 2. 初始化認證（替換原來的匿名登錄）
        const user = await initAuth();
        
        if (user) {
            // 用戶已登入
            console.log('✅ 用戶已登入:', user);
        } else {
            // 用戶未登入，提示登入
            console.log('ℹ️ 用戶未登入（訪客模式）');
            // 可以顯示一個提示，引導用戶登入
            // showToast('💡 登入後可以保存學習進度');
        }
        
        // 3. 設置認證監聽器
        setupAuthListener();
        
        // 4. 初始化AI反饋toggle狀態
        initFeedbackToggle();
        
        console.log('✅ 應用初始化完成');
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        showToast('初始化失敗，請刷新頁面重試');
    }
}

// =====================================================
// 修改 handleLogout() 函數
// =====================================================

// 在 mountGlobalFunctions() 中修改
window.handleLogout = logout;  // 使用新的 logout 函數
```

---

### 步驟 5：添加登入界面

**選項 A：在側邊欄添加登入按鈕（適合未登入時）**

修改 `story-vocab/index.html` 的側邊欄部分：

```html
<!-- 側邊欄用戶信息區域 -->
<div class="sidebar-header">
    <button class="sidebar-close-btn" onclick="closeMobileSidebar()">×</button>
    
    <div class="app-title-section">
        <h1 class="app-title">詞遊記</h1>
        <p class="app-subtitle">與AI共創故事，樂學詞語</p>
    </div>
    
    <div class="user-profile">
        <div class="user-avatar" id="user-avatar" onclick="navigateTo('settings')">👤</div>
        <div class="user-info">
            <div class="user-name" id="user-display-name">訪客</div>
            <div class="user-level" id="user-level-display">等級 L2 · 初級</div>
        </div>
    </div>
    
    <!-- 🆕 未登入時顯示登入按鈕 -->
    <div id="guest-login-prompt" style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
        <p style="color: white; font-size: 13px; margin-bottom: 8px;">
            💡 登入後可保存學習進度
        </p>
        <button onclick="loginWithGoogle()" 
                style="width: 100%; padding: 8px; background: white; color: #667eea; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            <span style="margin-right: 8px;">🔐</span>
            使用 Google 登入
        </button>
    </div>
    
    <!-- 用戶統計 -->
    <div class="user-stats">
        <!-- 現有的統計內容 -->
    </div>
</div>
```

**選項 B：在設置頁面添加賬戶管理**

在設置界面添加一個新的區塊：

```html
<!-- 在設置界面添加賬戶管理區塊 -->
<div class="settings-section">
    <h2 class="section-title">🔐 賬戶管理</h2>
    <p class="section-desc">管理你的登入狀態</p>
    
    <!-- 未登入時顯示 -->
    <div id="account-guest" style="display: none;">
        <div class="info-box">
            <span class="info-icon">💡</span>
            <div class="info-text">
                <strong>登入以保存進度</strong><br>
                使用 Google 帳號登入，你的學習進度將自動保存到雲端
            </div>
        </div>
        <button class="btn-primary" onclick="loginWithGoogle()" style="width: 100%; margin-top: 15px;">
            🔐 使用 Google 登入
        </button>
    </div>
    
    <!-- 已登入時顯示 -->
    <div id="account-logged-in" style="display: none;">
        <div class="setting-item" style="display: flex; align-items: center; padding: 15px; background: #f5f5f5; border-radius: 8px;">
            <img id="account-avatar" src="" alt="頭像" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
            <div style="flex: 1;">
                <div id="account-name" style="font-weight: 600; margin-bottom: 4px;">載入中...</div>
                <div id="account-email" style="font-size: 13px; color: #666;">載入中...</div>
            </div>
        </div>
        <button class="btn-secondary" onclick="handleLogout()" style="width: 100%; margin-top: 15px;">
            🚪 登出
        </button>
    </div>
</div>
```

然後在 `auth-integration.js` 中添加函數來更新這個界面：

```javascript
/**
 * 更新設置頁面的賬戶區塊
 */
export function updateAccountSection() {
  const guestSection = document.getElementById('account-guest');
  const loggedInSection = document.getElementById('account-logged-in');
  
  if (gameState.user) {
    // 已登入
    if (guestSection) guestSection.style.display = 'none';
    if (loggedInSection) {
      loggedInSection.style.display = 'block';
      
      const nameEl = document.getElementById('account-name');
      const emailEl = document.getElementById('account-email');
      const avatarEl = document.getElementById('account-avatar');
      
      if (nameEl) nameEl.textContent = gameState.user.display_name || '用戶';
      if (emailEl) emailEl.textContent = gameState.user.email || '';
      if (avatarEl && gameState.user.avatar_url) {
        avatarEl.src = gameState.user.avatar_url;
      }
    }
  } else {
    // 未登入
    if (guestSection) guestSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
  }
}
```

並在 `initStartScreen()` 或 `initSettingsScreen()` 中調用這個函數。

---

### 步驟 6：掛載全局函數

**位置**：`story-vocab/js/app.js` 的 `mountGlobalFunctions()`

```javascript
function mountGlobalFunctions() {
    // ... 現有代碼 ...
    
    // 🆕 認證相關
    window.loginWithGoogle = loginWithGoogle;
    window.logout = logout;
    window.handleLogout = logout;  // 保持向後兼容
    
    // ... 其他代碼 ...
}
```

---

### 步驟 7：數據庫遷移（如果需要）

如果 users 表沒有 email 和 avatar_url 字段，需要添加：

**創建遷移文件**：`story-vocab/supabase/migrations/add_google_auth_fields.sql`

```sql
-- 為 users 表添加 Google 認證相關字段

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 創建索引（提高查詢效率）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 添加註釋
COMMENT ON COLUMN users.email IS '用戶郵箱（來自 Google 賬號）';
COMMENT ON COLUMN users.avatar_url IS '用戶頭像 URL（來自 Google 賬號）';
```

運行遷移：

```bash
cd story-vocab
supabase db push
```

---

## 🎯 測試步驟

### 1. 本地測試

```bash
# 啟動本地服務器（如果還沒有）
cd story-vocab
python3 -m http.server 8000
# 或
npm run serve
```

訪問 `http://localhost:8000` 並測試：

- [ ] 頁面加載時認證狀態正確顯示
- [ ] 點擊 "使用 Google 登入" 按鈕
- [ ] 跳轉到 Google 登入頁面
- [ ] 登入成功後跳轉回應用
- [ ] 側邊欄顯示用戶名和頭像
- [ ] 創建故事後數據正確保存到 users 表
- [ ] 登出功能正常

### 2. 生產環境測試

```bash
# 推送代碼到 GitHub
git add .
git commit -m "feat: 添加 Google 登入功能"
git push origin main
```

等待 Cloudflare 同步後，訪問 `https://chineseclassics.github.io/story-vocab/` 測試。

---

## ❓ 常見問題排查

### 問題 1：點擊登入沒有反應

**可能原因**：
- cc-auth.js 未正確載入
- Supabase 配置不正確

**排查步驟**：
```javascript
// 在瀏覽器控制台檢查
console.log(window.ccAuth);  // 應該有值
console.log(window.ccAuth.getClient());  // 應該返回 Supabase 客戶端
```

### 問題 2：登入後跳轉到錯誤的頁面

**可能原因**：
- Redirect URLs 配置不正確

**解決方法**：
1. 檢查 Supabase Dashboard → Authentication → URL Configuration
2. 確保 "Site URL" 設置為 `https://chineseclassics.github.io`
3. 確保 "Redirect URLs" 包含 `https://chineseclassics.github.io/story-vocab/`

### 問題 3：用戶信息不顯示

**可能原因**：
- users 表沒有對應記錄
- syncUserToStoryVocab() 失敗

**排查步驟**：
```javascript
// 檢查控制台是否有錯誤信息
// 檢查 Supabase Dashboard → Table Editor → users
// 確認用戶記錄是否創建
```

### 問題 4：登入後刷新頁面，用戶狀態丟失

**可能原因**：
- Supabase Session 過期
- localStorage 被清除

**解決方法**：
- 確保 cc-auth.js 的 `persistSession: true` 配置正確
- 檢查 `onAuthStateChange` 監聽器是否正常工作

---

## 📚 參考資源

- [Supabase Google OAuth 文檔](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console OAuth 設置](https://console.cloud.google.com/apis/credentials)
- [cc-auth.js 源碼](../assets/js/cc-auth.js)

---

## ✅ 完成檢查清單

集成完成後，請確認：

- [ ] 用戶可以使用 Google 登入
- [ ] 登入後側邊欄顯示用戶名和頭像
- [ ] 登入後創建的故事關聯到正確的 user_id
- [ ] 登出功能正常
- [ ] 刷新頁面後登入狀態保持
- [ ] 多個設備登入同一賬號，數據同步正常
- [ ] 錯誤情況有友好的提示
- [ ] 訪客模式仍然可用（未登入時可以試玩）

---

**祝集成順利！如有問題，請參考本文檔的排查部分或聯繫開發者。** 🚀

