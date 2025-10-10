# AI 智能詞彙推薦系統 - 部署指南

## 部署前檢查清單

### 1. 數據庫遷移

在部署前，需要先執行數據庫遷移：

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io

# 連接到 Supabase 項目
supabase link --project-ref bjykaipbeokbbykvseyr

# 執行遷移
supabase db push
```

這會創建/更新以下表：
- **新增表**：
  - `user_profiles` - 用戶畫像表
  - `game_rounds` - 遊戲回合記錄
  - `game_session_summary` - 遊戲會話彙總
  - `recommendation_history` - 推薦歷史
- **擴展表**：
  - `user_wordbook` - 添加新字段（不影響現有數據）

**注意**：遷移是增量式的，不會覆蓋或刪除現有數據！

### 2. 部署 Edge Functions

#### 步驟 1：複製函數文件到根目錄

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io

# 複製 vocab-recommender 函數
cp -r story-vocab/supabase/functions/vocab-recommender supabase/functions/

# 複製 _shared 文件夾
cp -r story-vocab/supabase/functions/_shared supabase/functions/
```

#### 步驟 2：部署函數

```bash
# 部署 vocab-recommender
supabase functions deploy vocab-recommender

# 驗證部署
supabase functions list
```

#### 步驟 3：設置環境變量

確保以下環境變量已設置：

```bash
# DeepSeek API Key（如果還沒設置）
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 驗證
supabase secrets list
```

### 3. 測試部署

#### 測試 vocab-recommender

使用管理界面測試：

```
/story-vocab/admin/test-vocab-recommender.html
```

或使用 curl：

```bash
curl -X POST \
  'https://bjykaipbeokbbykvseyr.supabase.co/functions/v1/vocab-recommender' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-id",
    "sessionId": "test-session-id",
    "roundNumber": 1,
    "storyContext": "在一個陽光明媚的早晨..."
  }'
```

預期返回：

```json
{
  "success": true,
  "words": [
    {
      "word": "高興",
      "difficulty": 1,
      "category": "形容詞"
    },
    ...
  ],
  "source": "calibration"
}
```

## 驗證清單

### 數據庫

- [ ] 所有表已創建
- [ ] 索引已創建
- [ ] 註釋已添加

檢查命令：

```sql
-- 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history');

-- 檢查索引
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'game_rounds', 'game_session_summary', 'recommendation_history');
```

### Edge Functions

- [ ] vocab-recommender 已部署
- [ ] 環境變量已設置
- [ ] 測試調用成功

### 前端集成

- [ ] 校準詞庫文件可訪問（/story-vocab/data/calibration-vocabulary.json）
- [ ] 新 JS 模塊正確加載
- [ ] 瀏覽器控制台無報錯

## 回滾計劃

如果部署後出現問題，可以回滾：

### 回滾 Edge Functions

```bash
# 查看部署歷史
supabase functions list --project-ref bjykaipbeokbbykvseyr

# 如果需要，刪除新函數
supabase functions delete vocab-recommender
```

### 回滾數據庫（謹慎操作）

```sql
-- 只在必要時執行
DROP TABLE IF EXISTS recommendation_history CASCADE;
DROP TABLE IF EXISTS game_session_summary CASCADE;
DROP TABLE IF EXISTS game_rounds CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 恢復 user_wordbook 表（移除新字段）
ALTER TABLE user_wordbook DROP COLUMN IF EXISTS last_recommended_at;
ALTER TABLE user_wordbook DROP COLUMN IF EXISTS times_recommended;
ALTER TABLE user_wordbook DROP COLUMN IF EXISTS word_difficulty;
```

### 回滾前端代碼

```bash
git checkout HEAD -- story-vocab/js/
```

## 監控

部署後監控以下指標：

1. **Edge Function 調用次數**
   - Supabase Dashboard > Functions > vocab-recommender

2. **錯誤率**
   - 檢查 Edge Function 日誌

3. **數據庫表增長**
   - 監控 `game_rounds` 和 `user_profiles` 表的記錄數

4. **用戶反饋**
   - 觀察是否有用戶報告詞彙推薦不合理

## 故障排查

### 問題 1：vocab-recommender 返回 500 錯誤

**可能原因**：
- DeepSeek API Key 未設置或錯誤
- 數據庫查詢失敗

**解決方法**：
1. 檢查 Edge Function 日誌
2. 驗證環境變量
3. 測試數據庫連接

### 問題 2：校準詞彙未加載

**可能原因**：
- 文件路徑錯誤
- CORS 問題

**解決方法**：
1. 檢查瀏覽器控制台
2. 驗證文件路徑：`/story-vocab/data/calibration-vocabulary.json`
3. 檢查網絡請求

### 問題 3：用戶畫像未創建

**可能原因**：
- 數據庫權限問題
- 遷移未執行

**解決方法**：
1. 檢查數據庫日誌
2. 驗證表是否存在
3. 重新執行遷移

## 性能優化建議

部署後如果遇到性能問題：

1. **數據庫索引優化**
   ```sql
   -- 添加複合索引
   CREATE INDEX idx_game_rounds_user_created 
   ON game_rounds(user_id, created_at DESC);
   ```

2. **Edge Function 緩存**
   - 考慮緩存用戶畫像（5分鐘）
   - 減少數據庫查詢次數

3. **前端優化**
   - 預加載校準詞庫
   - 使用 localStorage 緩存用戶狀態

## 後續改進

- [ ] 添加 A/B 測試框架
- [ ] 收集詞彙推薦質量數據
- [ ] 優化校準算法
- [ ] 添加用戶反饋機制
- [ ] 實施詞彙難度動態調整

