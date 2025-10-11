# 🚀 Supabase CLI 在 Cursor 中的使用指南

## ✨ 快速開始

您現在可以在 Cursor 中直接查詢 Supabase 數據庫的所有信息！

### 🎯 最常用的 3 個命令

```bash
# 1. 查看所有數據庫表格（最常用！）
./supabase-utils.sh tables

# 2. 查看特定表的結構
./query-table-structure.sh vocabulary

# 3. 運行完整健康檢查
./supabase-utils.sh health
```

## 📋 當前項目信息

- **項目名稱**: story-vocab
- **項目 ID**: bjykaipbeokbbykvseyr
- **區域**: Southeast Asia (Singapore)
- **CLI 版本**: 2.48.3

### 數據庫統計

| 表名 | 大小 | 行數 |
|------|------|------|
| vocabulary_wordlist_mapping | 1.6 MB | 4,990 |
| vocabulary | 1.1 MB | 5,132 |
| story_sessions | 168 KB | 82 |
| game_rounds | 152 KB | 51 |
| users | 104 KB | 135 |

### Edge Functions

| 函數名 | 版本 | 狀態 |
|--------|------|------|
| story-agent | 14 | ACTIVE |
| vocab-recommender | 3 | ACTIVE |
| vocab-difficulty-evaluator | 2 | ACTIVE |

## 🛠️ 可用工具

### 1. 主工具腳本 (`supabase-utils.sh`)

#### 數據庫查詢命令

```bash
./supabase-utils.sh tables      # 查看所有表格
./supabase-utils.sh indexes     # 查看索引使用情況
./supabase-utils.sh stats       # 查看數據庫統計
./supabase-utils.sh slow        # 查看最慢的查詢
./supabase-utils.sh long        # 查看長時間運行的查詢
./supabase-utils.sh bloat       # 查看表膨脹情況
./supabase-utils.sh locks       # 查看鎖定情況
./supabase-utils.sh blocking    # 查看阻塞查詢
```

#### 數據庫管理命令

```bash
./supabase-utils.sh pull        # 從遠程拉取架構
./supabase-utils.sh push        # 推送本地遷移到遠程
./supabase-utils.sh diff        # 比較本地和遠程差異
./supabase-utils.sh migration   # 創建新的遷移文件
```

#### Edge Functions 命令

```bash
./supabase-utils.sh functions      # 列出所有函數
./supabase-utils.sh deploy-vocab   # 部署 vocab-recommender
./supabase-utils.sh deploy-agent   # 部署 story-agent
./supabase-utils.sh deploy-all     # 部署所有函數
./supabase-utils.sh logs-vocab     # 查看 vocab-recommender 日誌
./supabase-utils.sh logs-agent     # 查看 story-agent 日誌
```

#### 實用工具命令

```bash
./supabase-utils.sh health      # 運行完整健康檢查
./supabase-utils.sh report      # 生成性能報告
./supabase-utils.sh schema      # 查看表結構（需要 Docker）
./supabase-utils.sh help        # 顯示幫助信息
```

### 2. 表結構查詢工具 (`query-table-structure.sh`)

快速查看任何表的完整定義、索引和策略：

```bash
# 查看 vocabulary 表的結構
./query-table-structure.sh vocabulary

# 查看 users 表的結構
./query-table-structure.sh users

# 查看 story_sessions 表的結構
./query-table-structure.sh story_sessions
```

**輸出包括**:
- 完整的 CREATE TABLE 語句
- 所有相關索引
- RLS（Row Level Security）策略
- 表在哪些遷移文件中被提及

## 💡 實際使用示例

### 示例 1: 開發新功能前了解數據庫結構

```bash
# 1. 先查看所有可用的表
./supabase-utils.sh tables

# 2. 查看你需要使用的表的具體結構
./query-table-structure.sh vocabulary

# 3. 現在你知道了表有哪些字段，可以編寫代碼了
```

**你會看到**:
```sql
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  pinyin TEXT,
  difficulty_level INT NOT NULL,
  category TEXT NOT NULL,
  theme TEXT[] DEFAULT '{}',
  part_of_speech TEXT[],
  frequency INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 示例 2: 性能優化

```bash
# 1. 查看哪些查詢最慢
./supabase-utils.sh slow

# 2. 查看索引使用情況
./supabase-utils.sh indexes

# 3. 查看哪些索引沒有被使用（可以刪除）
./supabase-utils.sh indexes | grep "true"

# 4. 查看表膨脹情況
./supabase-utils.sh bloat
```

### 示例 3: 部署新的 Edge Function

```bash
# 1. 修改函數代碼後，部署到生產環境
./supabase-utils.sh deploy-vocab

# 2. 查看部署日誌確認沒有錯誤
./supabase-utils.sh logs-vocab

# 3. 列出所有函數確認版本號更新了
./supabase-utils.sh functions
```

### 示例 4: 數據庫架構變更

```bash
# 1. 創建新的遷移文件
./supabase-utils.sh migration

# 輸入遷移名稱，例如: add_user_preferences

# 2. 編輯生成的遷移文件
# supabase/migrations/XXX_add_user_preferences.sql

# 3. 推送到遠程數據庫
./supabase-utils.sh push

# 4. 驗證變更
./supabase-utils.sh tables
```

### 示例 5: 每週健康檢查

```bash
# 運行完整的健康檢查
./supabase-utils.sh health

# 或者生成詳細報告
./supabase-utils.sh report
```

**報告會保存在**: `./supabase-reports/report_YYYYMMDD_HHMMSS.txt`

## 📊 在 Cursor Chat 中詢問數據庫問題

現在你可以在 Cursor 中直接詢問：

### ✅ 可以問的問題

```
1. "當前數據庫中有哪些表？"
   → 使用: ./supabase-utils.sh tables

2. "vocabulary 表有哪些字段？"
   → 使用: ./query-table-structure.sh vocabulary

3. "哪些查詢最慢？"
   → 使用: ./supabase-utils.sh slow

4. "哪些索引沒有被使用？"
   → 使用: ./supabase-utils.sh indexes

5. "當前有哪些 Edge Functions？"
   → 使用: ./supabase-utils.sh functions

6. "幫我部署 vocab-recommender 函數"
   → 使用: ./supabase-utils.sh deploy-vocab
```

### 🎯 Cursor 會自動運行對應的命令並給你結果！

例如，當你問："vocabulary 表的結構是什麼？"

Cursor 會執行：
```bash
./query-table-structure.sh vocabulary
```

然後告訴你：
- 表有哪些字段
- 每個字段的類型
- 有哪些索引
- 有哪些約束

## 🔍 原生 Supabase CLI 命令

如果你需要更高級的功能，也可以直接使用原生命令：

### 數據庫檢查

```bash
# 表統計（包含 JSON 輸出）
supabase inspect db table-stats --linked --output json

# 索引統計
supabase inspect db index-stats --linked

# 數據庫整體統計
supabase inspect db db-stats --linked

# 查詢性能分析
supabase inspect db outliers --linked

# 長時間運行的查詢
supabase inspect db long-running-queries --linked
```

### Edge Functions

```bash
# 列出所有函數
supabase functions list --project-ref bjykaipbeokbbykvseyr

# 部署函數
supabase functions deploy vocab-recommender --project-ref bjykaipbeokbbykvseyr

# 查看日誌
supabase functions logs vocab-recommender --project-ref bjykaipbeokbbykvseyr
```

### 數據庫遷移

```bash
# 從遠程拉取架構
supabase db pull --linked

# 創建新遷移
supabase migration new my_migration

# 推送遷移
supabase db push --linked

# 比較差異
supabase db diff --linked
```

## 📚 詳細文檔

- **完整參考手冊**: [SUPABASE_CLI_REFERENCE.md](./SUPABASE_CLI_REFERENCE.md)
- **快速參考卡片**: [SUPABASE_QUICK_REFERENCE.md](./SUPABASE_QUICK_REFERENCE.md)

## 🚨 常見問題

### Q: 為什麼有些命令說需要 Docker？

**A**: 某些命令（如 `db dump`）需要 Docker 來處理數據。如果沒有 Docker，可以：
1. 使用 `./query-table-structure.sh` 查看表結構（從遷移文件讀取）
2. 直接訪問 Supabase Dashboard

### Q: 如何快速查看某個表的字段？

**A**: 
```bash
./query-table-structure.sh [table_name]
```

### Q: 如何知道數據庫性能如何？

**A**:
```bash
./supabase-utils.sh health
```

### Q: 如何部署 Edge Function？

**A**:
```bash
./supabase-utils.sh deploy-vocab  # 或其他函數名
```

## 🎉 總結

現在你擁有完整的 Supabase CLI 工具鏈！你可以：

✅ **隨時查詢數據庫結構** - 不需要離開 Cursor  
✅ **監控數據庫性能** - 一條命令搞定  
✅ **管理 Edge Functions** - 快速部署和查看日誌  
✅ **安全地修改數據庫架構** - 通過遷移系統  
✅ **在 Cursor Chat 中直接詢問** - AI 會幫你運行命令  

**開始使用吧！** 🚀

---

**創建日期**: 2025-10-11  
**作者**: Cursor AI Assistant  
**項目**: story-vocab

