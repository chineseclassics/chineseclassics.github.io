# 🔒 安全檢查清單

## ⚠️ 重要提醒

每次部署前，必須確認所有數據表都使用**安全的 RLS 策略**！

---

## 📋 RLS 策略檢查

### ✅ 安全的策略（正確做法）

```sql
-- ✅ 用戶只能訪問自己的數據
CREATE POLICY "Users can view own data" 
ON table_name FOR SELECT 
USING (auth.uid() = user_id);

-- ✅ 通過關聯表驗證
CREATE POLICY "Users can view own recommendation history" 
ON recommendation_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM story_sessions 
    WHERE story_sessions.id = recommendation_history.session_id 
      AND story_sessions.user_id = auth.uid()
  )
);
```

### ❌ 不安全的策略（禁止使用）

```sql
-- ❌ 危險！允許所有人訪問所有數據
CREATE POLICY "Allow all access" 
ON table_name FOR ALL 
USING (true) WITH CHECK (true);

-- ❌ 危險！禁用 RLS
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

---

## 🔍 快速檢查命令

在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
-- 檢查所有表的 RLS 狀態
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 檢查所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ⚠️ 查找不安全的策略（不應該有結果）
SELECT 
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'  -- 這表示 USING (true)
ORDER BY tablename;
```

---

## 📊 當前系統的表和策略

### 核心表列表

| 表名 | RLS 啟用 | 策略類型 | 說明 |
|------|----------|----------|------|
| `users` | ✅ | `auth.uid() = id` | 用戶基本信息 |
| `user_profiles` | ✅ | `auth.uid() = user_id` | AI 用戶畫像 |
| `story_sessions` | ✅ | `auth.uid() = user_id` | 故事會話 |
| `game_rounds` | ✅ | `auth.uid() = user_id` | 遊戲回合記錄 |
| `game_session_summary` | ✅ | `auth.uid() = user_id` | 會話彙總 |
| `recommendation_history` | ✅ | 通過 `session` 關聯 | 推薦歷史 |
| `user_wordbook` | ✅ | `auth.uid() = user_id` | 用戶詞語本 |
| `vocabulary` | ✅ | 公開只讀 | 詞彙表 |
| `themes` | ✅ | 公開只讀 | 主題表 |

---

## 🚀 部署前檢查步驟

### 1️⃣ 數據庫遷移前

```bash
# 檢查遷移文件中的 RLS 策略
grep -n "USING (true)" story-vocab/supabase/migrations/*.sql

# ⚠️ 如果有任何結果，請修復！
```

### 2️⃣ 部署後驗證

```sql
-- 在 Supabase Dashboard 執行
-- 確認沒有不安全的策略
SELECT 
  tablename,
  policyname,
  'UNSAFE: USING (true)' AS warning
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true';

-- 應該返回 0 行結果
```

### 3️⃣ 功能測試

- [ ] 匿名用戶可以創建會話
- [ ] 用戶只能看到自己的數據
- [ ] 用戶無法訪問其他用戶的數據
- [ ] 詞彙表和主題表可以被所有人讀取

---

## 🛠️ 如果發現不安全的策略

### 立即修復步驟：

```sql
-- 1. 刪除不安全的策略
DROP POLICY "不安全的策略名稱" ON 表名;

-- 2. 創建安全的策略
CREATE POLICY "Users can view own data" 
ON 表名 FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
ON 表名 FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
ON 表名 FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 📝 為什麼 RLS 如此重要？

### ❌ 沒有 RLS 的風險

```javascript
// 任何用戶都可以：
const { data } = await supabase
  .from('user_profiles')
  .select('*')  // 看到所有用戶的畫像！

const { data } = await supabase
  .from('game_rounds')
  .select('*')
  .eq('user_id', '其他人的ID')  // 看到別人的遊戲記錄！
```

### ✅ 有 RLS 的保護

```javascript
// 即使惡意用戶嘗試：
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', '其他人的ID')

// 結果：data = []（RLS 自動過濾，只返回自己的數據）
```

---

## 🔗 相關文檔

- [Supabase RLS 官方文檔](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS 文檔](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- 項目遷移文件：`story-vocab/supabase/migrations/006_ai_vocab_system.sql`

---

## 💡 記憶技巧

**口訣**：`auth.uid() = user_id`

每次創建新表時，默認添加：

```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" 
ON new_table FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
ON new_table FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

---

## ✅ 最終檢查

部署前，大聲朗讀三遍：

> **"所有表都啟用了 RLS！"**  
> **"所有策略都基於 auth.uid()！"**  
> **"沒有 USING (true)！"**

✅ 確認無誤後，才能部署到生產環境。

---

**最後更新**: 2025-10-08  
**維護者**: 請在每次創建新表或修改 RLS 策略時更新此文檔

