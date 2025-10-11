# 詞遊記認證架構設計

> **創建日期**：2025-10-11  
> **核心理念**：應用獨立 + 平台協作

---

## 🎯 架構決策

根據太虛幻境的「獨立後端 + 統一用戶中心」架構原則，詞遊記採用：

### ✅ 獨立認證系統 + 雙模式支持

```
詞遊記獨立認證（基於自己的 Supabase project）
         ↕
    運行模式檢測
         ↓
    ┌────────┴────────┐
    ↓                 ↓
獨立運行模式      平台集成模式
（單獨分發）      （在太虛幻境內）
```

---

## 📐 核心設計原則

### 1. 應用完全自包含
- ✅ 詞遊記有自己完整的用戶系統
- ✅ 使用自己的 Supabase project（bjykaipbeokbbykvseyr）
- ✅ 不依賴太虛幻境的 cc-auth.js
- ✅ 可以完全獨立運行和分發

### 2. 平台協作可選
- ✅ 檢測是否在太虛幻境內運行
- ✅ 如果在平台內，可接收統一用戶信息
- ✅ 數據可選擇性同步到平台用戶中心
- ✅ 同一套代碼支持兩種模式

### 3. 用戶體驗一致
- ✅ 無論哪種模式，用戶操作流程相同
- ✅ 數據在應用內完整保存
- ✅ 平台模式下額外同步聚合數據

### 4. 🔑 UUID 主鍵 + 多重身份系統（核心）

**關鍵決策**：使用 UUID 作為主鍵，支持多種登入方式

**為什麼？**
```
目標用戶：
1. Google 用戶（學校學生）- 主要
2. 匿名訪客（社會大眾）- 次要
3. 未來其他方式（Apple、微信等）- 預留

❌ Google ID 作為主鍵 → 無法支持匿名和其他方式
✅ UUID 主鍵 + 身份表 → 完全靈活
```

**數據庫設計**：
```sql
-- 用戶主表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                -- Google 用戶有，匿名為 NULL
  display_name TEXT NOT NULL,
  user_type TEXT DEFAULT 'registered', -- 'registered' | 'anonymous'
  // ...
);

-- 身份關聯表
CREATE TABLE user_identities (
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,           -- 'google' | 'anonymous' | 'apple'
  provider_id TEXT NOT NULL,
  UNIQUE(provider, provider_id)
);
```

**跨模式統一**：
- Google 用戶：通過 **email** 統一
- 匿名用戶：不需要跨模式

### 5. 🔗 Supabase 完全獨立 + postMessage 通信

**架構確認**：
```
太虛幻境平台 Supabase A（未來）
  ↓ postMessage（傳遞用戶信息）
  ↓ 不是數據庫連接！
詞遊記應用 Supabase B (bjykaipbeokbbykvseyr)
```

**關鍵點**：
- ✅ 兩個 Supabase project 完全獨立
- ✅ 沒有數據庫層面的連接或同步
- ✅ 只通過 postMessage 傳遞必要的用戶信息
- ✅ Google ID 是連接兩者的橋樑
- ✅ 詞遊記完全控制自己的數據

**為什麼這樣設計？**
1. 保持應用完全獨立（可隨時單獨分發）
2. 數據所有權清晰（詞遊記完全控制自己的數據）
3. 符合太虛幻境架構理念（獨立後端 + 統一用戶中心）
4. 學校使用 Google 系統，Google ID 是天然的統一標識符

---

## 🏗️ 技術架構

### 文件結構

```
story-vocab/
├── js/
│   ├── auth/
│   │   ├── auth-service.js           # 認證服務抽象層
│   │   ├── standalone-auth.js        # 獨立模式實現
│   │   ├── platform-auth.js          # 平台模式實現
│   │   └── run-mode-detector.js      # 運行模式檢測
│   │
│   ├── config.js                      # 配置（含 Supabase）
│   ├── supabase-client.js             # Supabase 客戶端
│   └── app.js                         # 應用初始化
│
└── supabase/                          # 獨立的 Supabase 配置
    ├── config.toml                    # project_id: story-vocab
    ├── functions/                     # Edge Functions
    └── migrations/                    # 數據庫遷移
```

---

## 💻 實施方案

### 步驟 1：運行模式檢測

**創建文件**：`story-vocab/js/auth/run-mode-detector.js`

```javascript
// =====================================================
// 運行模式檢測器
// 判斷應用是在平台內還是獨立運行
// =====================================================

/**
 * 檢測當前運行模式
 * @returns {'standalone' | 'platform'}
 */
export function detectRunMode() {
  // 方法 1：檢查是否在 iframe 中
  const isInIframe = window.self !== window.top;
  
  // 方法 2：檢查 URL 是否在太虛幻境域名
  const hostname = window.location.hostname;
  const isInPlatformDomain = hostname === 'chineseclassics.github.io';
  
  // 方法 3：檢查是否有平台標識（太虛幻境會注入）
  const hasPlatformFlag = window.TAIXU_PLATFORM_MODE === true;
  
  // 方法 4：localStorage 強制模式（用於開發測試）
  const forceMode = localStorage.getItem('FORCE_RUN_MODE');
  if (forceMode === 'standalone' || forceMode === 'platform') {
    console.log(`🔧 強制模式: ${forceMode}`);
    return forceMode;
  }
  
  // 判斷邏輯
  if (hasPlatformFlag || (isInIframe && isInPlatformDomain)) {
    console.log('🌐 檢測到平台集成模式');
    return 'platform';
  }
  
  console.log('📱 檢測到獨立運行模式');
  return 'standalone';
}

/**
 * 獲取當前運行模式（緩存結果）
 */
let cachedMode = null;

export function getRunMode() {
  if (!cachedMode) {
    cachedMode = detectRunMode();
  }
  return cachedMode;
}

export default {
  detectRunMode,
  getRunMode
};
```

---

### 步驟 2：認證服務抽象層

**創建文件**：`story-vocab/js/auth/auth-service.js`

```javascript
// =====================================================
// 認證服務抽象層
// 定義統一的認證接口
// =====================================================

/**
 * 認證服務基類
 * 所有認證實現都要繼承這個類
 */
export class AuthService {
  /**
   * 初始化認證服務
   */
  async initialize() {
    throw new Error('子類必須實現 initialize()');
  }
  
  /**
   * 獲取當前用戶
   * @returns {Promise<User|null>}
   */
  async getCurrentUser() {
    throw new Error('子類必須實現 getCurrentUser()');
  }
  
  /**
   * Google 登入
   * @returns {Promise<{error?: Error}>}
   */
  async loginWithGoogle() {
    throw new Error('子類必須實現 loginWithGoogle()');
  }
  
  /**
   * 登出
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error('子類必須實現 logout()');
  }
  
  /**
   * 監聽認證狀態變化
   * @param {Function} callback - 狀態變化時的回調函數
   */
  onAuthStateChange(callback) {
    throw new Error('子類必須實現 onAuthStateChange()');
  }
}

/**
 * 用戶數據類型
 * @typedef {Object} User
 * @property {string} id - 用戶 ID
 * @property {string} email - 郵箱
 * @property {string} display_name - 顯示名稱
 * @property {string} [avatar_url] - 頭像 URL
 * @property {number} current_level - 當前等級
 * @property {string} run_mode - 運行模式 ('standalone' | 'platform')
 */

export default AuthService;
```

---

### 步驟 3：獨立模式實現

**創建文件**：`story-vocab/js/auth/standalone-auth.js`

```javascript
// =====================================================
// 獨立運行模式認證
// 使用詞遊記自己的 Supabase project
// =====================================================

import AuthService from './auth-service.js';
import { getSupabase } from '../supabase-client.js';

export class StandaloneAuth extends AuthService {
  constructor() {
    super();
    this.supabase = null;
    this.currentUser = null;
  }
  
  async initialize() {
    console.log('🔐 初始化獨立認證系統...');
    
    this.supabase = getSupabase();
    
    // 檢查現有 session
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (session) {
      console.log('✅ 發現已有 session');
      await this.syncUserToDatabase(session.user);
      return session.user;
    }
    
    console.log('ℹ️ 用戶未登入');
    return null;
  }
  
  async getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user) {
      await this.syncUserToDatabase(user);
    }
    
    return this.currentUser;
  }
  
  async loginWithGoogle() {
    console.log('🔐 使用 Google 登入（獨立模式）...');
    
    const redirectTo = window.location.origin + window.location.pathname;
    
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo
      }
    });
    
    if (error) {
      console.error('❌ Google 登入失敗:', error);
      return { error };
    }
    
    // OAuth 會跳轉，不會執行到這裡
    return {};
  }
  
  async logout() {
    console.log('🚪 登出（獨立模式）...');
    
    await this.supabase.auth.signOut();
    this.currentUser = null;
    
    // 清除 localStorage
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar_url');
  }
  
  onAuthStateChange(callback) {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 認證狀態變化:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await this.syncUserToDatabase(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
      }
      
      callback(event, this.currentUser);
    });
  }
  
  /**
   * 同步用戶到 users 表
   */
  async syncUserToDatabase(authUser) {
    try {
      // 檢查用戶是否已存在
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (existingUser) {
        this.currentUser = {
          ...existingUser,
          run_mode: 'standalone'
        };
        return;
      }
      
      // 創建新用戶
      const displayName = authUser.user_metadata?.name || 
                         authUser.email?.split('@')[0] || 
                         `用戶${Math.floor(Math.random() * 10000)}`;
      
      const { data: newUser, error } = await this.supabase
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
      
      this.currentUser = {
        ...newUser,
        run_mode: 'standalone'
      };
      
      console.log('✅ 新用戶已創建:', this.currentUser);
      
    } catch (error) {
      console.error('❌ 同步用戶失敗:', error);
      throw error;
    }
  }
}

export default StandaloneAuth;
```

---

### 步驟 4：平台模式實現

**創建文件**：`story-vocab/js/auth/platform-auth.js`

```javascript
// =====================================================
// 平台集成模式認證
// 接收太虛幻境傳來的用戶信息
// =====================================================

import AuthService from './auth-service.js';
import { getSupabase } from '../supabase-client.js';

export class PlatformAuth extends AuthService {
  constructor() {
    super();
    this.supabase = null;
    this.currentUser = null;
    this.platformUser = null;
  }
  
  async initialize() {
    console.log('🌐 初始化平台集成認證...');
    
    this.supabase = getSupabase();
    
    // 等待平台傳遞用戶信息
    return new Promise((resolve) => {
      window.addEventListener('message', async (event) => {
        // 驗證消息來源
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === 'TAIXU_AUTH') {
          console.log('✅ 收到平台用戶信息');
          this.platformUser = event.data.user;
          
          // 同步到詞遊記的 users 表
          await this.syncPlatformUser(this.platformUser);
          
          resolve(this.currentUser);
        }
      });
      
      // 告訴平台：我準備好接收用戶信息了
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'TAIXU_APP_READY',
          app: 'story-vocab'
        }, '*');
      }
      
      // 超時處理（5秒）
      setTimeout(() => {
        if (!this.currentUser) {
          console.warn('⚠️ 未收到平台用戶信息，降級到獨立模式');
          resolve(null);
        }
      }, 5000);
    });
  }
  
  async getCurrentUser() {
    return this.currentUser;
  }
  
  async loginWithGoogle() {
    // 平台模式下，登入由太虛幻境主站處理
    console.log('🌐 平台模式：請在太虛幻境主站登入');
    
    // 通知主站需要登入
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_REQUEST_LOGIN',
        app: 'story-vocab'
      }, '*');
    }
    
    return { error: new Error('請在太虛幻境主站登入') };
  }
  
  async logout() {
    console.log('🌐 平台模式：通知主站登出');
    
    // 通知主站登出
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_REQUEST_LOGOUT',
        app: 'story-vocab'
      }, '*');
    }
    
    this.currentUser = null;
    this.platformUser = null;
  }
  
  onAuthStateChange(callback) {
    // 平台模式下，監聽來自主站的消息
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'TAIXU_AUTH_CHANGED') {
        if (event.data.user) {
          this.syncPlatformUser(event.data.user).then(() => {
            callback('SIGNED_IN', this.currentUser);
          });
        } else {
          this.currentUser = null;
          callback('SIGNED_OUT', null);
        }
      }
    });
  }
  
  /**
   * 同步平台用戶到詞遊記的 users 表
   */
  async syncPlatformUser(platformUser) {
    try {
      // 檢查用戶是否已存在
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', platformUser.id)
        .single();
      
      if (existingUser) {
        this.currentUser = {
          ...existingUser,
          run_mode: 'platform',
          platform_user: platformUser
        };
        return;
      }
      
      // 創建新用戶（使用平台的用戶信息）
      const { data: newUser, error } = await this.supabase
        .from('users')
        .insert({
          id: platformUser.id,
          username: platformUser.email,
          display_name: platformUser.display_name,
          email: platformUser.email,
          current_level: platformUser.grade_level || 2.0,
          avatar_url: platformUser.avatar_url
        })
        .select()
        .single();
      
      if (error) throw error;
      
      this.currentUser = {
        ...newUser,
        run_mode: 'platform',
        platform_user: platformUser
      };
      
      console.log('✅ 平台用戶已同步到詞遊記');
      
    } catch (error) {
      console.error('❌ 同步平台用戶失敗:', error);
    }
  }
  
  /**
   * 同步學習數據到平台用戶中心
   */
  async syncLearningData(data) {
    if (!this.platformUser) return;
    
    // 通知平台更新學習數據
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'TAIXU_SYNC_LEARNING_DATA',
        app: 'story-vocab',
        data: data
      }, '*');
    }
  }
}

export default PlatformAuth;
```

---

### 步驟 5：認證服務工廠

**修改文件**：`story-vocab/js/auth/auth-service.js`（添加工廠函數）

```javascript
// ... 前面的 AuthService 類定義 ...

import { getRunMode } from './run-mode-detector.js';
import StandaloneAuth from './standalone-auth.js';
import PlatformAuth from './platform-auth.js';

/**
 * 創建適合當前運行模式的認證服務
 */
export async function createAuthService() {
  const runMode = getRunMode();
  
  let authService;
  
  if (runMode === 'platform') {
    authService = new PlatformAuth();
  } else {
    authService = new StandaloneAuth();
  }
  
  await authService.initialize();
  
  return authService;
}

export { AuthService };
export default {
  AuthService,
  createAuthService
};
```

---

### 步驟 6：集成到應用

**修改文件**：`story-vocab/js/app.js`

```javascript
// 在文件開頭導入
import { createAuthService } from './auth/auth-service.js';
import { getRunMode } from './auth/run-mode-detector.js';
import { gameState } from './core/game-state.js';

// 全局認證服務實例
let authService = null;

/**
 * 初始化應用
 */
async function initializeApp() {
    try {
        console.log(`🎮 詞遊記啟動（${getRunMode()}模式）`);
        
        // 1. 初始化 Supabase
        const supabase = await initSupabase();
        console.log('✅ Supabase 客戶端初始化成功');
        
        // 2. 初始化認證（雙模式支持）
        authService = await createAuthService();
        const user = await authService.getCurrentUser();
        
        if (user) {
            console.log('✅ 用戶已登入:', user.display_name);
            gameState.userId = user.id;
            gameState.user = user;
            updateUIForLoggedInUser(user);
        } else {
            console.log('ℹ️ 用戶未登入（訪客模式）');
            updateUIForGuestUser();
        }
        
        // 3. 設置認證監聽器
        authService.onAuthStateChange((event, user) => {
            if (event === 'SIGNED_IN' && user) {
                gameState.userId = user.id;
                gameState.user = user;
                updateUIForLoggedInUser(user);
                showToast('✅ 登入成功！');
            } else if (event === 'SIGNED_OUT') {
                gameState.userId = null;
                gameState.user = null;
                updateUIForGuestUser();
            }
        });
        
        // 4. 初始化AI反饋toggle狀態
        initFeedbackToggle();
        
        console.log('✅ 應用初始化完成');
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        showToast('初始化失敗，請刷新頁面重試');
    }
}

/**
 * Google 登入
 */
async function loginWithGoogle() {
    try {
        showToast('正在跳轉到 Google 登入...');
        
        const result = await authService.loginWithGoogle();
        
        if (result.error) {
            console.error('❌ 登入失敗:', result.error);
            showToast('❌ 登入失敗，請重試');
        }
    } catch (error) {
        console.error('❌ 登入異常:', error);
        showToast('❌ 登入異常，請重試');
    }
}

/**
 * 登出
 */
async function logout() {
    try {
        await authService.logout();
        showToast('✅ 已登出');
        
        // 刷新頁面
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error('❌ 登出失敗:', error);
        showToast('❌ 登出失敗，請重試');
    }
}

/**
 * 更新 UI（已登入）
 */
function updateUIForLoggedInUser(user) {
    const displayName = user.display_name || '用戶';
    
    // 更新側邊欄
    const userDisplayNameEl = document.getElementById('user-display-name');
    if (userDisplayNameEl) {
        userDisplayNameEl.textContent = displayName;
    }
    
    // 更新頭像
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl && user.avatar_url) {
        userAvatarEl.innerHTML = `<img src="${user.avatar_url}" 
                                        alt="${displayName}" 
                                        style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">`;
    }
    
    // 隱藏訪客登入提示
    const guestPrompt = document.getElementById('guest-login-prompt');
    if (guestPrompt) guestPrompt.style.display = 'none';
    
    // 保存到 localStorage
    localStorage.setItem('user_display_name', displayName);
    localStorage.setItem('user_email', user.email);
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
    
    // 顯示訪客登入提示
    const guestPrompt = document.getElementById('guest-login-prompt');
    if (guestPrompt) guestPrompt.style.display = 'block';
}

// 在 mountGlobalFunctions() 中添加
function mountGlobalFunctions() {
    // ... 現有代碼 ...
    
    // 認證相關
    window.loginWithGoogle = loginWithGoogle;
    window.logout = logout;
    window.handleLogout = logout;
    
    // ... 其他代碼 ...
}
```

---

## 🎨 UI 改動

在 `story-vocab/index.html` 的側邊欄添加登入提示：

```html
<div class="sidebar-header">
    <!-- 現有的應用標題和用戶信息 -->
    
    <!-- 🆕 訪客登入提示（未登入時顯示）-->
    <div id="guest-login-prompt" style="display: none; margin-top: 15px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
        <p style="color: white; font-size: 13px; margin-bottom: 8px;">
            💡 登入後可保存學習進度
        </p>
        <button onclick="loginWithGoogle()" 
                style="width: 100%; padding: 8px; background: white; color: #667eea; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            <span style="margin-right: 8px;">🔐</span>
            使用 Google 登入
        </button>
    </div>
</div>
```

---

## 🔄 太虛幻境主站適配（未來）

當太虛幻境主站實現統一用戶中心時，需要添加：

### index.html（太虛幻境主站）

```javascript
// 打開應用時，傳遞用戶信息
function openApp(appId) {
  const app = apps.find(a => a.id === appId);
  appFrame.src = app.url;
  
  // 標記為平台模式
  window.TAIXU_PLATFORM_MODE = true;
  
  appFrame.addEventListener('load', () => {
    // 等待應用準備好
    window.addEventListener('message', (event) => {
      if (event.data.type === 'TAIXU_APP_READY') {
        // 傳遞用戶信息
        appFrame.contentWindow.postMessage({
          type: 'TAIXU_AUTH',
          user: currentPlatformUser
        }, '*');
      }
    });
  });
}

// 監聽應用的請求
window.addEventListener('message', (event) => {
  if (event.data.type === 'TAIXU_REQUEST_LOGIN') {
    // 觸發主站登入
    showLoginModal();
  }
  
  if (event.data.type === 'TAIXU_SYNC_LEARNING_DATA') {
    // 同步學習數據到平台用戶中心
    syncToPlatformHub(event.data.app, event.data.data);
  }
});
```

---

## ✅ 優勢總結

這個架構提供了：

1. **✅ 完全獨立**
   - 詞遊記可以完全獨立運行
   - 不依賴太虛幻境的任何代碼
   - 使用自己的 Supabase project

2. **✅ 靈活協作**
   - 在太虛幻境內時自動切換到平台模式
   - 可選擇性同步數據到平台用戶中心
   - 同一套代碼支持兩種模式

3. **✅ 用戶體驗好**
   - 獨立運行：完整的登入註冊流程
   - 平台內運行：無縫使用統一賬號
   - 數據始終完整保存在應用內

4. **✅ 未來友好**
   - 隨時可以單獨分發為 App 或小程序
   - 不影響在平台內的集成
   - 擴展性強，維護成本低

---

## 📝 實施優先級

### 第一階段（現在）：獨立認證
- [ ] 實現運行模式檢測
- [ ] 實現獨立認證（StandaloneAuth）
- [ ] 配置 Google OAuth（Supabase Dashboard）
- [ ] 測試登入登出流程

### 第二階段（未來）：平台集成
- [ ] 太虛幻境主站實現統一用戶中心
- [ ] 實現平台認證（PlatformAuth）
- [ ] 實現 postMessage 通信
- [ ] 測試雙模式切換

---

**這樣設計，詞遊記既保持完全獨立，又能在平台內無縫協作！** 🎉

