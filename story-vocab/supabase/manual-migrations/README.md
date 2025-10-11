# 手動遷移執行指南

> **為什麼需要手動執行？**  
> Supabase CLI 的遷移狀態與遠端數據庫不同步，無法使用 `supabase db push`

---

## 📋 執行步驟

### 1. 打開 Supabase Dashboard

訪問：https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr

### 2. 進入 SQL Editor

點擊左側菜單 "SQL Editor"

### 3. 複製 SQL

打開文件：`manual-migrations/multi_identity_system.sql`

複製全部內容

### 4. 執行 SQL

1. 在 SQL Editor 中粘貼 SQL
2. 點擊右下角 "Run" 按鈕
3. 等待執行完成
4. 查看結果（應該顯示成功信息）

### 5. 驗證執行結果

在 SQL Editor 中運行：

```sql
-- 檢查 users 表新字段
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 檢查 user_identities 表
SELECT * FROM user_identities LIMIT 5;
```

應該看到：
- users 表有 email, avatar_url, user_type, last_login_at, updated_at 字段
- user_identities 表已創建

---

## ✅ 執行完成標準

- [ ] SQL 執行無錯誤
- [ ] users 表有新字段
- [ ] user_identities 表已創建
- [ ] 索引已創建
- [ ] RLS 策略已應用

---

## 🔧 如果遇到錯誤

### 錯誤：column "email" already exists

**說明**：字段已存在，SQL 會自動跳過  
**操作**：繼續執行，無需處理

### 錯誤：relation "user_identities" already exists

**說明**：表已存在，SQL 會自動跳過  
**操作**：繼續執行，無需處理

### 錯誤：外鍵約束錯誤

**說明**：可能有數據完整性問題  
**操作**：檢查錯誤信息，聯繫開發者

---

## 📚 相關文檔

- [多重身份系統設計](../../docs/MULTI_IDENTITY_SYSTEM.md)
- [實施計劃](../../docs/IMPLEMENTATION_PLAN.md)

---

執行完成後，返回實施計劃繼續下一步！🚀

