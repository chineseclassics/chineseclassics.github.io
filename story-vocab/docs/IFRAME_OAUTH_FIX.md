# iframe 中 Google OAuth 登入問題修復

> **問題**：在太虛幻境主站通過 iframe 打開詞遊記時，Google OAuth 返回 403 錯誤  
> **原因**：Google 為了安全，禁止在 iframe 中進行 OAuth 登入（防止點擊劫持攻擊）  
> **解決方案**：檢測 iframe 環境，自動在新標籤頁中進行登入  
> **修復日期**：2025-10-13

---

## 🎯 問題分析

### 問題表現

```
✅ 直接訪問 → 正常登入
   https://chineseclassics.github.io/story-vocab/
   └─ Google OAuth ✅ 成功

❌ iframe 中訪問 → 403 錯誤
   太虛幻境主站 (index.html)
   └─ <iframe src="story-vocab/">
       └─ Google OAuth ❌ 403 Forbidden
```

### 根本原因

1. **Google 的安全限制**
   - Google OAuth 設置了 `X-Frame-Options: DENY`
   - 防止在 iframe 中顯示登入頁面
   - 避免點擊劫持（Clickjacking）攻擊

2. **瀏覽器差異**
   - Chrome：較寬鬆，但仍會阻止
   - Safari：更嚴格的隱私保護（ITP）
   - 兩者都會阻止 iframe 中的 OAuth

3. **Microsoft Clarity 衝突**
   - 太虛幻境主站使用 Microsoft Clarity 分析工具
   - Clarity 會嘗試追蹤 iframe 內容
   - 與 Safari 的跨站保護衝突

---

## 💡 解決方案

### 核心策略

**自動檢測 iframe 環境，在新標籤頁中完成登入**

```
iframe 中點擊登入
    ↓
檢測環境：window.self !== window.top
    ↓
在新標籤頁打開應用（帶 autoLogin 參數）
    ↓
新標籤頁中自動觸發 Google OAuth
    ↓
登入成功，用戶可以關閉新標籤頁
    ↓
返回 iframe，刷新後已登入
```

---

## 🔧 技術實現

### 1. 修改 `standalone-auth.js`

在 `loginWithGoogle()` 方法中添加 iframe 檢測：

```javascript:story-vocab/js/auth/standalone-auth.js
async loginWithGoogle() {
  console.log('🔐 使用 Google 登入（獨立模式）...');
  
  // 🎯 檢測是否在 iframe 中
  const isInIframe = window.self !== window.top;
  
  if (isInIframe) {
    console.warn('⚠️ 檢測到在 iframe 中，Google OAuth 不支持在 iframe 中進行');
    console.log('📤 將在新標籤頁中打開登入頁面...');
    
    // 構建新標籤頁的 URL（添加自動登入標識）
    const newTabUrl = `${window.location.origin}${window.location.pathname}?autoLogin=google`;
    
    // 在新標籤頁打開
    const newWindow = window.open(newTabUrl, '_blank');
    
    if (!newWindow) {
      // 瀏覽器阻止了彈窗
      return { 
        error: new Error('請允許彈出式視窗，或手動在新標籤頁中打開應用進行登入'),
        needsNewTab: true,
        newTabUrl: newTabUrl
      };
    }
    
    // 提示用戶
    return { 
      error: new Error('請在新打開的標籤頁中完成登入'),
      needsNewTab: true,
      newTabUrl: newTabUrl
    };
  }
  
  // 不在 iframe 中，正常進行 OAuth
  // ... 原有代碼 ...
}
```

### 2. 修改 `app.js` - 初始化部分

添加 `autoLogin` 參數檢測：

```javascript:story-vocab/js/app.js
async function initializeApp() {
  try {
    console.log(`🎮 詞遊記啟動（${getRunMode()}模式）`);
    
    // 🎯 檢查 URL 參數：autoLogin
    const urlParams = new URLSearchParams(window.location.search);
    const autoLogin = urlParams.get('autoLogin');
    
    // ... 初始化代碼 ...
    
    authService = await createAuthService();
    const user = await authService.getCurrentUser();
    
    // 🎯 如果有 autoLogin 參數，且用戶未登入，自動觸發登入
    if (autoLogin === 'google' && !user) {
      console.log('🔐 自動觸發 Google 登入（從 iframe 跳轉）...');
      hideLoadingScreen();
      showLoginScreen();
      // 稍微延遲，讓用戶看到登入界面
      setTimeout(async () => {
        await loginWithGoogle();
      }, 500);
      return; // 提前返回，等待登入完成
    }
    
    // ... 其他代碼 ...
  }
}
```

### 3. 修改 `app.js` - loginWithGoogle 函數

處理 iframe 場景的錯誤提示：

```javascript:story-vocab/js/app.js
async function loginWithGoogle() {
  if (!authService) {
    showToast('❌ 認證服務未初始化');
    return;
  }
  
  try {
    showToast('正在跳轉到 Google 登入...');
    
    const result = await authService.loginWithGoogle();
    
    if (result.error) {
      console.error('❌ 登入失敗:', result.error);
      
      // 🎯 特殊處理：在 iframe 中需要新標籤頁登入
      if (result.needsNewTab) {
        console.log('📤 需要在新標籤頁中進行登入');
        
        // 顯示友好的提示信息
        showToast('📤 請在新打開的標籤頁中完成登入', 5000);
        
        // 如果新標籤頁被阻止，顯示手動打開按鈕
        if (result.error.message.includes('允許彈出式視窗')) {
          setTimeout(() => {
            const shouldOpenManually = confirm(
              '瀏覽器阻止了彈出式視窗。\n\n' +
              '為了使用 Google 登入，需要在新標籤頁中打開應用。\n\n' +
              '點擊「確定」在新標籤頁中打開，或點擊「取消」使用訪客模式。'
            );
            
            if (shouldOpenManually) {
              window.open(result.newTabUrl, '_blank');
            }
          }, 1000);
        }
        
        return;
      }
      
      // 一般錯誤
      showToast('❌ 登入失敗，請重試');
    }
    // OAuth 會跳轉，成功不會執行到這裡
  } catch (error) {
    console.error('❌ 登入異常:', error);
    showToast('❌ 登入異常，請重試');
  }
}
```

### 4. 添加 Safari 兼容性防護

在 `index.html` 中添加錯誤攔截器：

```html:story-vocab/index.html
<head>
  <!-- 安全策略：允許 Google OAuth 和 Supabase -->
  <meta http-equiv="Content-Security-Policy" content="
      frame-ancestors 'self' https://chineseclassics.github.io;
      frame-src 'self' https://accounts.google.com https://*.supabase.co;
  ">
  
  <!-- Safari 隱私保護：防止父窗口的追蹤腳本干擾 OAuth -->
  <script>
    (function() {
      // 禁用 Microsoft Clarity 在 Safari 中的干擾
      if (window.clarity) {
        try {
          delete window.clarity;
        } catch(e) {}
      }
      
      // 阻止父窗口的錯誤事件冒泡
      window.addEventListener('error', function(e) {
        if (e.message && (e.message.includes('clarity') || 
            e.message.includes('accounts.google.com') ||
            e.message.includes('Blocked a frame'))) {
          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }, true);
    })();
  </script>
</head>
```

---

## 📊 用戶體驗流程

### 場景 1：直接訪問（正常流程）

```
用戶訪問：https://chineseclassics.github.io/story-vocab/
    ↓
點擊「使用 Google 登入」
    ↓
檢測：不在 iframe 中
    ↓
直接跳轉到 Google OAuth
    ↓
登入成功，返回應用
    ↓
✅ 完成
```

### 場景 2：通過太虛幻境主站（iframe 中）

```
用戶從太虛幻境主站點擊「詞遊記」
    ↓
在 iframe 中打開應用
    ↓
點擊「使用 Google 登入」
    ↓
檢測：在 iframe 中
    ↓
自動打開新標籤頁（帶 autoLogin=google 參數）
    ↓
新標籤頁自動觸發 Google OAuth
    ↓
登入成功
    ↓
用戶可以：
  - 繼續在新標籤頁使用 ✅
  - 關閉新標籤頁，返回 iframe ✅
    （iframe 中刷新頁面後會檢測到已登入）
```

### 場景 3：瀏覽器阻止彈窗

```
用戶在 iframe 中點擊「使用 Google 登入」
    ↓
檢測：在 iframe 中
    ↓
嘗試打開新標籤頁 → 被瀏覽器阻止
    ↓
顯示提示：「請允許彈出式視窗...」
    ↓
顯示 confirm 對話框
    ↓
用戶點擊「確定」
    ↓
手動打開新標籤頁
    ↓
完成登入 ✅
```

---

## ✅ 測試清單

### Chrome 測試

- [x] 直接訪問 story-vocab → Google 登入 ✅
- [x] 通過主站 iframe → 自動新標籤頁登入 ✅
- [x] 新標籤頁登入成功 ✅
- [x] 返回 iframe 刷新後保持登入狀態 ✅

### Safari 測試

- [x] 直接訪問 story-vocab → Google 登入 ✅
- [x] 通過主站 iframe → 自動新標籤頁登入 ✅
- [x] 無 Clarity 錯誤干擾 ✅
- [x] 跨站保護不影響功能 ✅

### 邊緣情況測試

- [x] 瀏覽器阻止彈窗 → 手動打開提示 ✅
- [x] autoLogin 參數正確觸發 ✅
- [x] 已登入用戶不重複登入 ✅
- [x] 訪客模式不受影響 ✅

---

## 🎯 優勢

### 1. 用戶體驗優秀

- ✅ 自動檢測環境，無需用戶選擇
- ✅ 流程順暢，清晰的提示信息
- ✅ 支援多種場景（直接訪問/iframe）

### 2. 技術方案優雅

- ✅ 不需要修改太虛幻境主站
- ✅ 不需要修改 Google OAuth 配置
- ✅ 完全在應用內部解決問題

### 3. 兼容性好

- ✅ Chrome、Safari 都支持
- ✅ 不影響現有功能
- ✅ 降級方案完善（手動打開新標籤頁）

### 4. 安全性高

- ✅ 遵守 Google OAuth 安全規範
- ✅ 防止點擊劫持攻擊
- ✅ 添加 Content Security Policy

---

## 📝 注意事項

### 用戶須知

1. **在 iframe 中登入時**：
   - 會自動打開新標籤頁
   - 請在新標籤頁中完成登入
   - 如果彈窗被阻止，會有提示

2. **Safari 用戶**：
   - 首次登入前需清除緩存
   - 建議允許彈出式視窗

### 開發者須知

1. **不要修改太虛幻境主站的 iframe 實現**
   - 目前的全屏 iframe 是正確的
   - 不需要添加 `allow="popups"` 屬性
   - 應用內部已處理所有場景

2. **autoLogin 參數**：
   - 用於從 iframe 跳轉到新標籤頁後自動登入
   - 格式：`?autoLogin=google`
   - 未來可擴展：`?autoLogin=apple` 等

3. **Session 共享**：
   - Supabase 使用 localStorage 存儲 session
   - 同域名（chineseclassics.github.io）下 localStorage 是共享的
   - iframe 和新標籤頁中的 session 會自動同步

---

## 🔍 故障排查

### 問題：新標籤頁沒有自動打開

**檢查**：
1. 瀏覽器是否阻止了彈窗
2. 查看控制台是否有錯誤
3. 確認 `window.open()` 調用成功

**解決**：
- 允許彈出式視窗
- 使用手動打開提示

### 問題：autoLogin 沒有觸發

**檢查**：
1. URL 中是否包含 `?autoLogin=google`
2. 控制台是否顯示「自動觸發 Google 登入」
3. 用戶是否已經登入

**解決**：
- 檢查 URL 參數解析
- 確認初始化順序正確

### 問題：Safari 中仍有錯誤

**檢查**：
1. 是否清除了緩存
2. 是否有 Clarity 相關錯誤
3. Content Security Policy 是否生效

**解決**：
- 完全退出 Safari 後重新打開
- 檢查 CSP meta 標籤
- 使用無痕模式測試

---

## 📚 相關文檔

- [Google OAuth 配置指南](GOOGLE_OAUTH_SETUP_GUIDE.md)
- [認證架構設計](AUTH_ARCHITECTURE.md)
- [部署指南](DEPLOYMENT.md)
- [快速修復指南](QUICK_FIX_OAUTH.md)

---

## 📅 更新日誌

### 2025-10-13

- ✅ 實現 iframe 檢測和新標籤頁登入
- ✅ 添加 autoLogin 參數支持
- ✅ 優化用戶提示信息
- ✅ 添加 Safari 兼容性防護
- ✅ 完善錯誤處理和降級方案

---

**修復完成！現在 iframe 中的 Google OAuth 登入已完美支持。** 🎉

