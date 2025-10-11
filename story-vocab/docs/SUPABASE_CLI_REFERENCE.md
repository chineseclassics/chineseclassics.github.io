# Supabase CLI 使用參考手冊

## 📊 當前環境狀態

- **Supabase CLI 版本**: 2.48.3
- **鏈接的項目**: story-vocab (bjykaipbeokbbykvseyr)
- **項目區域**: Southeast Asia (Singapore)
- **配置文件**: `/supabase/config.toml`

## 🔍 數據庫查詢命令（最常用）

### 1. 查看所有表格及統計信息

```bash
supabase inspect db table-stats --linked
```

**輸出信息**:
- 表名稱
- 表大小（Table size）
- 索引大小（Index size）
- 總大小（Total size）
- 估計行數（Estimated row count）
- 順序掃描次數（Seq scans）

**當前數據庫表格列表**:
1. `vocabulary_wordlist_mapping` (1.6 MB, 4990 行)
2. `vocabulary` (1.1 MB, 5132 行)
3. `story_sessions` (168 KB, 82 行)
4. `game_rounds` (152 KB, 51 行)
5. `users` (104 KB, 135 行)
6. `wordlists` (104 KB, 1 行)
7. `wordlist_tags` (88 KB, 6 行)
8. `user_wordbook` (48 KB, 0 行)
9. `user_wordlist_preferences` (48 KB, 5 行)
10. `user_vocabulary` (40 KB, 0 行)
11. `user_profiles` (40 KB, 2 行)
12. `game_session_summary` (32 KB, 0 行)
13. `recommendation_history` (24 KB, 0 行)

### 2. 查看索引使用情況

```bash
supabase inspect db index-stats --linked
```

**輸出信息**:
- 索引名稱
- 大小
- 使用百分比
- 索引掃描次數
- 順序掃描次數
- 是否未使用（Unused）

**關鍵發現**:
- ✅ 高頻使用索引: `vocabulary_word_key` (5736 次掃描)
- ✅ 高頻使用索引: `vocabulary_pkey` (5090 次掃描)
- ⚠️ 未使用索引: `idx_vocab_mapping_level2`, `idx_story_user` 等（可考慮刪除以節省空間）

### 3. 查看數據庫整體統計

```bash
supabase inspect db db-stats --linked
```

**輸出信息**:
- 緩存命中率
- 數據庫總大小
- WAL（Write-Ahead Log）大小
- 事務統計

### 4. 查看長時間運行的查詢

```bash
supabase inspect db long-running-queries --linked
```

**用途**: 診斷性能問題，找出慢查詢

### 5. 查看查詢性能統計（最慢的查詢）

```bash
supabase inspect db outliers --linked
```

**用途**: 找出執行時間最長的查詢，優化性能

### 6. 查看表的膨脹情況

```bash
supabase inspect db bloat --linked
```

**用途**: 檢查哪些表有過多的死元組（dead tuples），需要進行 VACUUM

### 7. 查看鎖定情況

```bash
supabase inspect db locks --linked
```

**用途**: 診斷並發問題，查看哪些查詢持有鎖

### 8. 查看阻塞查詢

```bash
supabase inspect db blocking --linked
```

**用途**: 找出被阻塞的查詢和阻塞它們的查詢

## 📥 數據導出命令

### 導出整個數據庫架構

```bash
supabase db dump --linked -f backup_schema.sql
```

**注意**: 需要 Docker 運行（用於本地處理）

### 導出特定表的數據

```bash
supabase db dump --linked --data-only -s public -x public.sensitive_table -f data_backup.sql
```

**參數說明**:
- `--data-only`: 只導出數據，不包含架構
- `-s public`: 指定 schema
- `-x public.sensitive_table`: 排除敏感表
- `-f`: 輸出文件名

## 🔄 數據庫遷移命令

### 從遠程拉取最新架構

```bash
supabase db pull --linked
```

**用途**: 將遠程數據庫的架構同步到本地 migration 文件

### 創建新的遷移文件

```bash
supabase migration new add_new_feature
```

**輸出**: 在 `supabase/migrations/` 下創建新的 SQL 文件

### 推送遷移到遠程數據庫

```bash
supabase db push --linked
```

**用途**: 將本地 migration 文件應用到遠程數據庫

### 查看本地和遠程的差異

```bash
supabase db diff --linked
```

**用途**: 比較本地和遠程數據庫的架構差異

## 🚀 Edge Functions 管理

### 列出所有 Edge Functions

```bash
supabase functions list --linked
```

**當前項目的 Functions**:
1. `story-agent`
2. `vocab-difficulty-evaluator`
3. `vocab-recommender`

### 部署 Edge Function

```bash
supabase functions deploy vocab-recommender --linked
```

### 查看 Function 日誌

```bash
supabase functions logs vocab-recommender --linked
```

### 本地測試 Edge Function

```bash
supabase functions serve vocab-recommender
```

**訪問**: `http://localhost:54321/functions/v1/vocab-recommender`

## 🔐 配置管理

### 查看項目列表

```bash
supabase projects list
```

### 鏈接到項目

```bash
supabase link --project-ref bjykaipbeokbbykvseyr
```

### 查看當前鏈接狀態

```bash
supabase status
```

**注意**: 需要 Docker 運行以查看本地開發環境狀態

## 📝 使用 SQL 直接查詢

### 方法 1: 使用 psql（推薦）

如果您有 PostgreSQL 客戶端，可以直接連接：

```bash
PGPASSWORD=your_service_role_key psql -h db.bjykaipbeokbbykvseyr.supabase.co -U postgres -d postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 方法 2: 使用 Supabase Studio

訪問: https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/editor

在 SQL Editor 中直接執行查詢

## 🛠️ 高級配置建議

### 1. 配置環境變量

創建 `.env.local` 文件（已在 .gitignore 中）：

```bash
SUPABASE_URL=https://bjykaipbeokbbykvseyr.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 配置 Shell 別名

在 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
alias supa='supabase'
alias supa-tables='supabase inspect db table-stats --linked'
alias supa-indexes='supabase inspect db index-stats --linked'
alias supa-stats='supabase inspect db db-stats --linked'
alias supa-slow='supabase inspect db outliers --linked'
alias supa-long='supabase inspect db long-running-queries --linked'
alias supa-funcs='supabase functions list --linked'
```

然後運行 `source ~/.zshrc` 使別名生效

### 3. 配置輸出格式

使用 JSON 格式輸出以便於解析：

```bash
supabase inspect db table-stats --linked --output json > tables.json
```

使用 YAML 格式：

```bash
supabase inspect db table-stats --linked --output yaml
```

## 📊 在 Cursor 中使用示例

### 示例 1: 檢查數據庫健康狀態

```bash
# 查看表統計
supabase inspect db table-stats --linked

# 查看索引效率
supabase inspect db index-stats --linked

# 查看數據庫整體狀態
supabase inspect db db-stats --linked
```

### 示例 2: 性能診斷

```bash
# 找出慢查詢
supabase inspect db outliers --linked

# 查看長時間運行的查詢
supabase inspect db long-running-queries --linked

# 檢查表膨脹
supabase inspect db bloat --linked
```

### 示例 3: 日常開發流程

```bash
# 1. 拉取最新架構
supabase db pull --linked

# 2. 創建新遷移
supabase migration new add_new_feature

# 3. 編輯遷移文件...

# 4. 推送到遠程
supabase db push --linked

# 5. 驗證變更
supabase inspect db table-stats --linked
```

## 🔍 查詢表結構的方法

由於 Supabase CLI 沒有直接的 "describe table" 命令，可以使用以下方法：

### 方法 1: 導出架構並查看

```bash
# 導出完整架構（需要 Docker）
supabase db dump --linked -f schema.sql

# 然後用文本編輯器查看
cat schema.sql | grep "CREATE TABLE vocabulary"
```

### 方法 2: 使用項目文件

查看您的遷移文件：

```bash
cat supabase/migrations/001_initial_schema.sql
cat supabase/migrations/006_ai_vocab_system.sql
```

### 方法 3: 通過 Supabase Dashboard

訪問: https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/editor

點擊左側的表名可以看到完整的結構定義

## 📚 常見問題

### Q: 為什麼有些命令報錯 "Docker daemon not running"？

**A**: 某些命令（如 `db dump`）需要 Docker 來處理本地數據。您可以：
1. 安裝並啟動 Docker Desktop
2. 或者直接使用 Supabase Dashboard 的 SQL Editor 執行查詢

### Q: 如何直接執行 SQL 查詢？

**A**: 目前 CLI 沒有直接的 SQL 執行命令，建議：
1. 使用 Supabase Dashboard 的 SQL Editor
2. 使用 `psql` 客戶端連接
3. 使用 JavaScript/TypeScript 客戶端庫

### Q: 如何查看表的列信息？

**A**: 
```bash
# 方法 1: 查看遷移文件
grep -A 20 "CREATE TABLE vocabulary" supabase/migrations/*.sql

# 方法 2: 導出架構並搜索
supabase db dump --linked -f schema.sql
grep -A 20 "CREATE TABLE vocabulary" schema.sql
```

## 🎯 最佳實踐

1. **定期檢查性能**：每週運行一次 `outliers` 和 `bloat` 檢查
2. **監控索引使用**：定期查看 `index-stats`，刪除未使用的索引
3. **版本控制遷移**：所有架構變更都應通過 migration 文件管理
4. **測試後部署**：使用本地環境測試遷移後再 `db push` 到生產環境
5. **備份數據**：定期使用 `db dump` 導出數據

## 🔗 相關資源

- [Supabase CLI 官方文檔](https://supabase.com/docs/guides/cli)
- [本地開發指南](https://supabase.com/docs/guides/local-development)
- [遷移管理](https://supabase.com/docs/guides/cli/managing-migrations)
- [Edge Functions](https://supabase.com/docs/guides/functions)

---

**更新日期**: 2025-10-11
**項目**: story-vocab (bjykaipbeokbbykvseyr)

