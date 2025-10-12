# 多重身份系統修復總結

## 問題發現

**日期**：2025-10-12  
**報告人**：用戶  
**症狀**：故事創作時出現 403 Forbidden 錯誤

```
bjykaipbeokbbykvseyr.supabase.co/rest/v1/game_rounds:1  
Failed to load resource: the server responded with a status of 403 ()
❌ 記錄回合數據失敗
```

## 根本原因

實施 UUID 主鍵 + 多重身份系統後，存在**身份映射斷層**：

1. **架構變化**：
   - 舊系統：`auth.uid()` = `users.id`（直接相等）
   - 新系統：`auth.uid()` = `provider_id` → 需通過 `user_identities` 映射到 `users.id`

2. **不一致問題**：
   - 部分表的 RLS 策略已更新（users, story_sessions 等）
   - AI 系統表未更新（game_rounds, user_profiles 等）
   - 前端代碼直接使用 `auth.uid()`

## 修復內容

### 1. 數據庫層修復

#### 新建遷移：`010_fix_ai_system_rls.sql`

修復了 4 個表的 RLS 策略：

- ✅ `user_profiles` - 用戶畫像
- ✅ `game_rounds` - 遊戲回合記錄（導致 403 的表）
- ✅ `game_session_summary` - 遊戲會話彙總
- ✅ `recommendation_history` - 推薦歷史

**修復方式**：所有策略改用 `get_user_id_from_auth()` 函數

**示例**：

```sql
-- ❌ 舊策略（錯誤）
CREATE POLICY "Users can insert own game rounds" ON game_rounds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ✅ 新策略（正確）
CREATE POLICY "rounds_insert_own" ON game_rounds
  FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());
```

### 2. 前端代碼修復

#### 修復文件：`story-vocab/js/ui/screens.js`（3 處）

```javascript
// ❌ 錯誤做法
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('user_wordlist_preferences')
  .select('*')
  .eq('user_id', user.id);  // user.id 是 provider_id！

// ✅ 正確做法
const userId = gameState.userId;
await supabase.from('user_wordlist_preferences')
  .select('*')
  .eq('user_id', userId);  // gameState.userId 是 users.id
```

**修復位置**：
1. 第 38 行：`loadWordlistSelector()` - 詞表偏好加載
2. 第 611 行：`loadWordlistSelectorSetting()` - 詞表設置界面
3. 第 810 行：`handleWordlistUpload()` - 詞表上傳功能

#### 修復文件：`story-vocab/js/ui/modals.js`（1 處）

```javascript
// ❌ 錯誤
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('user_wordlist_preferences')
  .upsert({ user_id: user.id, ... });

// ✅ 正確
const { gameState } = await import('../core/game-state.js');
const userId = gameState.userId;
await supabase.from('user_wordlist_preferences')
  .upsert({ user_id: userId, ... });
```

**修復位置**：第 141 行：設置模態框詞表偏好保存

#### 修復文件：`story-vocab/js/supabase-client.js`

```javascript
/**
 * 获取当前用户（已棄用）
 * @deprecated 請使用認證服務：authService.getCurrentUser()
 */
export async function getCurrentUser() {
  // 🔧 修復：通過 user_identities 查找正確的 users.id
  const { data: identity } = await supabase
    .from('user_identities')
    .select('*, users(*)')
    .eq('provider_id', user.id)  // user.id 是 provider_id
    .maybeSingle();
  
  if (identity && identity.users) {
    return identity.users;  // 返回正確的 users 記錄
  }
  return null;
}
```

### 3. 規範文檔

#### 新建：`.cursor/rules/story-vocab-user-id.mdc`

創建了完整的用戶 ID 使用規範，包括：
- ❌ 錯誤做法示例
- ✅ 正確做法示例
- 📋 開發檢查清單
- 🐛 故障排除指南

**自動啟用條件**：編輯 `story-vocab/**/*.js`, `story-vocab/**/*.ts`, `story-vocab/supabase/migrations/*.sql`

## 實施步驟

### ✅ 已完成

- [x] 創建數據庫遷移文件（010_fix_ai_system_rls.sql）
- [x] 修復前端代碼（screens.js, modals.js, supabase-client.js）
- [x] 創建 Cursor Rule（story-vocab-user-id.mdc）
- [x] 編寫修復總結文檔（本文件）

### ⏳ 待執行

- [ ] 在 Supabase Dashboard 執行 SQL 遷移
- [ ] 測試 Google 登入 + 故事創作
- [ ] 測試匿名登入 + 故事創作
- [ ] 驗證 403 錯誤已消失
- [ ] 提交代碼到 Git

## 執行數據庫遷移

### 步驟 1：打開 SQL 編輯器
https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/sql

### 步驟 2：執行遷移

複製並執行 [`010_fix_ai_system_rls.sql`](../supabase/migrations/010_fix_ai_system_rls.sql) 的完整內容

### 步驟 3：驗證

執行後應顯示 "Success. No rows returned"

## 測試計劃

### 測試案例 1：Google 用戶創作故事

1. 使用 Google 登入
2. 開始新故事
3. 選擇詞彙並創作
4. **驗證**：控制台無 403 錯誤
5. **驗證**：`game_rounds` 表有新記錄

### 測試案例 2：匿名用戶創作故事

1. 點擊「訪客試用」
2. 開始新故事
3. 選擇詞彙並創作
4. **驗證**：控制台無 403 錯誤
5. **驗證**：`game_rounds` 表有新記錄

### 測試案例 3：詞表功能

1. 進入設置
2. 選擇自訂詞表
3. 開始新故事
4. **驗證**：正確加載詞表詞彙
5. **驗證**：偏好保存成功

## 架構圖

```
登入流程：
┌──────────────┐
│ Google OAuth │
│   或匿名登入  │
└───────┬──────┘
        │
        ↓ auth.uid()
┌──────────────────┐
│ Supabase Auth    │
│ provider_id      │
└───────┬──────────┘
        │
        ↓ 創建/查找
┌──────────────────┐
│ user_identities  │
│ provider_id      │ = auth.uid()
│ user_id          │ → users.id
└───────┬──────────┘
        │
        ↓
┌──────────────────┐
│ users            │
│ id (UUID)        │ ← 存入 gameState.userId
│ display_name     │
│ email            │
└──────────────────┘
```

## 經驗教訓

### 1. 架構遷移要全面

- ❌ 只更新部分表的 RLS 策略
- ✅ 使用遷移腳本確保所有表一致更新

### 2. 前端要統一數據來源

- ❌ 到處調用 `supabase.auth.getUser()`
- ✅ 統一使用 `gameState.userId`

### 3. 需要明確的文檔規範

- ❌ 口頭約定容易被遺忘
- ✅ Cursor Rule 自動提醒開發者

### 4. 測試要覆蓋所有登入方式

- ❌ 只測試 Google 登入
- ✅ Google + 匿名都要測試

## 預防措施

### Code Review 檢查清單

創建 PR 時檢查：
- [ ] 搜尋 `auth.getUser()` - 應該很少見
- [ ] 搜尋 `user.id` - 確保來自 `gameState`
- [ ] 新表是否配置了 RLS 策略
- [ ] RLS 策略是否使用 `get_user_id_from_auth()`

### 自動化（未來可考慮）

1. ESLint 規則：禁止直接使用 `auth.getUser().id`
2. 數據庫測試：驗證 RLS 策略正確性
3. E2E 測試：覆蓋兩種登入方式

## 相關文件

- [認證架構](AUTH_ARCHITECTURE.md)
- [多重身份系統遷移](../supabase/migrations/20251011_multi_identity_system.sql)
- [RLS 基礎修復](../supabase/migrations/009_fix_rls_for_multi_identity.sql)
- [AI 系統 RLS 修復](../supabase/migrations/010_fix_ai_system_rls.sql)
- [用戶 ID 使用規範](../../.cursor/rules/story-vocab-user-id.mdc)

## 聯繫方式

如遇到相關問題，請參考：
- 本文檔的「故障排除」章節
- Cursor Rule：`.cursor/rules/story-vocab-user-id.mdc`
- 認證架構文檔：`docs/AUTH_ARCHITECTURE.md`

---

**文檔版本**：1.0  
**最後更新**：2025-10-12  
**維護者**：書院中文經典

