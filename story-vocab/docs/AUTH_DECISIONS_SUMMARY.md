# 詞遊記認證系統架構決策總結

> **決策日期**：2025-10-11  
> **討論參與**：用戶（開發者）+ AI 助手  
> **狀態**：已確定，準備實施

---

## 🎯 核心決策

### 1. 採用雙模式認證架構 ✅

**決策內容**：
- 詞遊記支持兩種運行模式：獨立模式 + 平台模式
- 同一套代碼自動檢測並適配不同環境
- 不是簡單地「先做一個，再做另一個」，而是從一開始就設計為雙模式

**理由**：
- 符合太虛幻境「獨立後端 + 統一用戶中心」架構原則
- 保證應用隨時可以單獨分發
- 避免將來需要大規模重構

---

### 2. 使用 Google ID 作為 users 表主鍵 ✅

**決策內容**：
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Google ID（不是 UUID）
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  -- ...
);
```

**關鍵保證**：
- 同一個 Google 賬號在兩種模式下對應同一個用戶
- 平台登入和獨立登入的數據自動統一
- 切換模式時無需數據遷移

**理由**：
- Google ID 全球唯一且永久不變
- 學校使用 Google Workspace，每個學生有 Google 賬號
- 這是連接平台模式和獨立模式的天然橋樑

---

### 3. Supabase 完全獨立 ✅

**決策內容**：
- 詞遊記使用自己的 Supabase project (bjykaipbeokbbykvseyr)
- 太虛幻境平台使用自己的 Supabase project（未來創建）
- 兩者通過 postMessage 通信，不共享數據庫

**數據流**：
```
太虛幻境 Supabase A ─── postMessage ───→ 詞遊記 Supabase B
                  （傳遞用戶信息）
                  不是數據庫連接！
```

**理由**：
- 符合應用完全自包含原則
- 數據所有權清晰（詞遊記完全控制自己的數據）
- 隨時可以單獨分發，不依賴平台
- 避免數據庫層面的耦合

---

### 4. 實施順序：先做獨立模式 ✅

**決策內容**：
- 第一階段：實現獨立模式（完整的 Google OAuth）
- 第二階段：實現平台模式（接收 postMessage）
- 兩個階段可以獨立測試

**理由**：
- 詞遊記的 Supabase 已存在，立即可用
- 太虛幻境平台登入還需要規劃和開發
- 先實現獨立模式不會浪費工作（永久需要）
- 為平台登入積累 Google OAuth 配置經驗

---

## 💡 關鍵洞察

### 問題：如何支持 Google 用戶和非 Google 用戶？

**最初想法**：用 Google ID 作為主鍵
- ❌ 問題：匿名用戶沒有 Google ID
- ❌ 問題：未來其他登入方式怎麼辦？

**最終決策**：UUID 主鍵 + 多重身份系統
- ✅ Google 用戶：通過 email 跨模式統一
- ✅ 匿名用戶：獨立 UUID，不需要跨模式
- ✅ 未來：靈活支持任何登入方式

### 問題：匿名用戶需要升級功能嗎？

**回答**：❌ 不需要

**理由**：
- 匿名用戶是試用性質
- 如果喜歡，直接用 Google 重新註冊
- 簡化邏輯，避免過度設計

### 問題：先做平台還是先做獨立？

**回答**：先做獨立（理由不變）

**實際選擇獨立優先的原因**：
- Supabase 已存在，立即可用
- 可以同時測試 Google 和匿名登入
- 不需要等平台完成
- 積累 OAuth 配置經驗

---

## 🎮 用戶體驗設計

### 平台模式（主要使用場景）

**流程**：
```
1. 用戶在太虛幻境主站用 Google 登入（一次）
2. 點擊打開詞遊記（iframe）
3. 詞遊記自動接收用戶信息
4. 直接開始使用，無需再次登入 ✅
```

**UI 行為**：
- 不顯示登入按鈕（因為平台已登入）
- 側邊欄自動顯示用戶名和頭像
- 用戶完全無感知

### 獨立模式（未來分發）

**流程**：
```
1. 用戶直接打開詞遊記獨立版
2. 看到 "使用 Google 登入" 按鈕
3. 點擊登入，完成 OAuth
4. 開始使用 ✅
```

**UI 行為**：
- 顯示登入按鈕
- 處理完整的 OAuth 流程
- 管理自己的 session

---

## 📋 實施檢查清單

### 配置階段
- [ ] Google Cloud Console 創建 OAuth 客戶端
- [ ] Supabase Dashboard 配置 Google Provider
- [ ] 配置 Redirect URLs

### 開發階段
- [ ] 創建 auth/ 目錄結構
- [ ] 實現運行模式檢測器
- [ ] 實現認證服務抽象層
- [ ] 實現獨立模式認證（StandaloneAuth）
- [ ] 實現平台模式認證（PlatformAuth，接口準備）
- [ ] 數據庫遷移（Google ID 主鍵）
- [ ] 集成到 app.js
- [ ] 添加登入 UI

### 測試階段
- [ ] 本地測試獨立登入
- [ ] 生產環境測試
- [ ] 驗證 Google ID 正確存儲
- [ ] 驗證數據關聯正確
- [ ] 測試登出功能
- [ ] 測試 session 持久化

### 未來階段
- [ ] 太虛幻境平台完成統一登入
- [ ] 實現 postMessage 通信
- [ ] 測試平台模式
- [ ] 驗證跨模式數據一致性

---

## 🔍 技術細節摘要

### Google ID 提取

```javascript
function extractGoogleId(authUser) {
  return authUser.user_metadata?.sub ||           // 主要
         authUser.user_metadata?.provider_id ||   // 備用
         authUser.identities?.[0]?.id;            // 降級
}
```

### 用戶同步（兩種模式通用）

```javascript
async function syncUser(googleId, userData, authMode) {
  await supabase.from('users').upsert({
    id: googleId,           // ✅ 關鍵
    google_id: googleId,
    email: userData.email,
    display_name: userData.display_name,
    avatar_url: userData.avatar_url,
    auth_mode: authMode,    // 'standalone' | 'platform'
    last_login_at: new Date()
  }, {
    onConflict: 'id'
  });
}
```

### postMessage 通信協議

```javascript
// 平台 → 詞遊記
iframe.contentWindow.postMessage({
  type: 'TAIXU_AUTH',
  user: {
    google_id: '102345678901234567890',
    email: 'zhang@school.edu',
    display_name: '張同學',
    avatar_url: 'https://...'
  }
}, '*');

// 詞遊記 → 平台
window.parent.postMessage({
  type: 'APP_READY',
  app: 'story-vocab'
}, '*');
```

---

## 📚 相關文檔

- [認證架構設計](./AUTH_ARCHITECTURE.md) - 完整技術方案
- [Google ID 主鍵設計](./GOOGLE_ID_AS_PRIMARY_KEY.md) - 數據一致性方案
- [實施計劃](./IMPLEMENTATION_PLAN.md) - 分階段實施步驟
- [太虛幻境架構](../../TAIXU_ARCHITECTURE.md) - 平台整體架構

### Cursor Rules

- `.cursor/rules/story-vocab-auth.mdc` - 詞遊記認證規範
- `.cursor/rules/dual-mode-architecture.mdc` - 雙模式架構通用規範

---

## ✅ 決策確認

**最終確認**：
- ✅ 採用雙模式架構
- ✅ 使用 Google ID 作為主鍵
- ✅ Supabase 完全獨立
- ✅ 先實施獨立模式
- ✅ 平台模式接口預留

**開始實施** → 查看 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

**創建日期**：2025-10-11  
**決策類型**：架構設計  
**影響範圍**：詞遊記認證系統、用戶數據結構、平台集成方式

