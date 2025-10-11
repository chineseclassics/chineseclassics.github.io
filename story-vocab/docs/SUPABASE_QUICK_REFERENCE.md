# Supabase CLI 快速參考卡片 🚀

## 🎯 最常用的命令（直接在 Cursor 中使用）

### 📊 數據庫查詢

```bash
# 查看所有表格（最常用！）
./supabase-utils.sh tables

# 查看特定表的結構
./query-table-structure.sh vocabulary

# 查看索引使用情況
./supabase-utils.sh indexes

# 查看慢查詢（性能優化）
./supabase-utils.sh slow

# 完整健康檢查
./supabase-utils.sh health
```

### 🚀 Edge Functions

```bash
# 部署單個函數
./supabase-utils.sh deploy-vocab

# 部署所有函數
./supabase-utils.sh deploy-all

# 查看函數日誌
./supabase-utils.sh logs-vocab
```

### 🔄 數據庫遷移

```bash
# 從遠程拉取最新架構
./supabase-utils.sh pull

# 推送本地遷移到遠程
./supabase-utils.sh push

# 比較本地和遠程差異
./supabase-utils.sh diff
```

---

## 📋 當前數據庫結構

### 核心表格（按大小排序）

| 表名 | 大小 | 行數 | 說明 |
|------|------|------|------|
| `vocabulary_wordlist_mapping` | 1.6 MB | 4990 | 詞彙與詞單的映射 |
| `vocabulary` | 1.1 MB | 5132 | 詞彙主表 |
| `story_sessions` | 168 KB | 82 | 故事會話記錄 |
| `game_rounds` | 152 KB | 51 | 遊戲回合數據 |
| `users` | 104 KB | 135 | 用戶表 |
| `wordlists` | 104 KB | 1 | 詞單定義 |
| `wordlist_tags` | 88 KB | 6 | 詞單標籤 |

### 用戶相關表格

- `user_wordbook` - 用戶詞本
- `user_wordlist_preferences` - 用戶詞單偏好
- `user_vocabulary` - 用戶詞彙掌握度
- `user_profiles` - 用戶配置文件
- `game_session_summary` - 遊戲會話摘要
- `recommendation_history` - 推薦歷史

---

## 🔍 如何查詢表結構

### 方法 1: 使用工具腳本（推薦）

```bash
./query-table-structure.sh vocabulary
```

**輸出示例**:
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

### 方法 2: 直接查看遷移文件

```bash
# 查看初始架構
cat supabase/migrations/001_initial_schema.sql

# 查看詞單系統
cat supabase/migrations/007_wordlist_system.sql

# 搜索特定表
grep -A 20 "CREATE TABLE vocabulary" supabase/migrations/*.sql
```

### 方法 3: 通過 Supabase Dashboard

訪問: https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/editor

---

## 💡 在 Cursor 中的實際使用示例

### 示例 1: 檢查數據庫當前狀態

```bash
# 在 Cursor 中直接運行
./supabase-utils.sh tables
```

**你會看到**:
- 所有表格的大小
- 當前行數
- 索引大小
- 掃描次數

### 示例 2: 了解表結構後修改代碼

```bash
# 1. 查看表結構
./query-table-structure.sh vocabulary

# 2. 了解字段後，編寫查詢代碼
# 例如在 TypeScript 中:
const { data } = await supabase
  .from('vocabulary')
  .select('word, pinyin, difficulty_level, category')
  .eq('difficulty_level', 2)
```

### 示例 3: 性能優化工作流

```bash
# 1. 查看慢查詢
./supabase-utils.sh slow

# 2. 查看索引使用情況
./supabase-utils.sh indexes

# 3. 找出未使用的索引（可以刪除）
./supabase-utils.sh indexes | grep "true"

# 4. 生成完整報告
./supabase-utils.sh report
```

### 示例 4: 部署新功能

```bash
# 1. 修改代碼後部署 Edge Function
./supabase-utils.sh deploy-vocab

# 2. 查看部署日誌
./supabase-utils.sh logs-vocab

# 3. 如果需要修改數據庫架構
./supabase-utils.sh migration

# 4. 推送遷移
./supabase-utils.sh push
```

---

## 🛠️ 常用的原生 Supabase CLI 命令

### 數據庫檢查（最實用）

```bash
# 表統計
supabase inspect db table-stats --linked

# 索引統計
supabase inspect db index-stats --linked

# 數據庫整體統計
supabase inspect db db-stats --linked

# 查詢性能分析
supabase inspect db outliers --linked

# 長時間運行的查詢
supabase inspect db long-running-queries --linked

# 表膨脹檢查
supabase inspect db bloat --linked

# 鎖定情況
supabase inspect db locks --linked

# 阻塞查詢
supabase inspect db blocking --linked
```

### Edge Functions

```bash
# 列出所有函數
supabase functions list --linked

# 部署函數
supabase functions deploy [function_name] --linked

# 查看日誌
supabase functions logs [function_name] --linked
```

### 數據庫遷移

```bash
# 從遠程拉取架構
supabase db pull --linked

# 創建新遷移
supabase migration new [migration_name]

# 推送遷移到遠程
supabase db push --linked

# 比較差異
supabase db diff --linked
```

---

## 🎨 輸出格式選項

所有 `inspect` 命令都支持多種輸出格式：

```bash
# 默認格式（表格）
supabase inspect db table-stats --linked

# JSON 格式（便於編程處理）
supabase inspect db table-stats --linked --output json

# YAML 格式
supabase inspect db table-stats --linked --output yaml
```

---

## 🔐 配置建議

### 1. Shell 別名（可選）

在 `~/.zshrc` 中添加：

```bash
# Supabase 快捷命令
alias supa='supabase'
alias supa-tables='./supabase-utils.sh tables'
alias supa-health='./supabase-utils.sh health'
alias supa-query='./query-table-structure.sh'
```

### 2. 項目環境變量

雖然 CLI 已經鏈接了項目，但如果需要在代碼中使用：

```bash
# .env.local (不要提交到 git)
SUPABASE_URL=https://bjykaipbeokbbykvseyr.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📈 性能監控最佳實踐

### 每週檢查清單

```bash
# 1. 查看表增長情況
./supabase-utils.sh tables

# 2. 檢查慢查詢
./supabase-utils.sh slow

# 3. 查看索引效率
./supabase-utils.sh indexes

# 4. 檢查表膨脹
./supabase-utils.sh bloat

# 5. 生成完整報告
./supabase-utils.sh report
```

### 關鍵指標

- **Table size 快速增長** → 考慮歸檔舊數據
- **Index 未使用** → 刪除以節省空間
- **高 Seq scans** → 可能需要添加索引
- **表膨脹嚴重** → 運行 VACUUM
- **慢查詢頻繁** → 優化查詢或添加索引

---

## 🚨 故障排除

### 問題 1: "Docker daemon not running"

**原因**: 某些命令需要 Docker

**解決方案**:
1. 啟動 Docker Desktop
2. 或者使用不需要 Docker 的替代方法（如查看遷移文件）

### 問題 2: 無法查詢表結構

**解決方案**:
```bash
# 方法 1: 使用工具腳本
./query-table-structure.sh vocabulary

# 方法 2: 查看遷移文件
cat supabase/migrations/*.sql | grep -A 20 "CREATE TABLE vocabulary"

# 方法 3: 使用 Dashboard
# 訪問 https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr
```

### 問題 3: 部署 Edge Function 失敗

**檢查步驟**:
```bash
# 1. 查看當前函數列表
./supabase-utils.sh functions

# 2. 檢查函數代碼是否有語法錯誤
cat supabase/functions/vocab-recommender/index.ts

# 3. 查看部署日誌
./supabase-utils.sh logs-vocab
```

---

## 📚 學習資源

- [完整參考手冊](./SUPABASE_CLI_REFERENCE.md)
- [Supabase 官方文檔](https://supabase.com/docs/guides/cli)
- [本地開發指南](https://supabase.com/docs/guides/local-development)

---

## ⚡ 最快速上手

**只需記住這 3 個命令**:

```bash
# 1. 查看數據庫狀態
./supabase-utils.sh tables

# 2. 查看表結構
./query-table-structure.sh [table_name]

# 3. 運行健康檢查
./supabase-utils.sh health
```

**就這麼簡單！** 🎉

---

**創建日期**: 2025-10-11  
**項目**: story-vocab  
**Supabase CLI 版本**: 2.48.3

