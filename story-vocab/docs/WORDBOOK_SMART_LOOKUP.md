# 生詞本智能查找機制

> **創建日期**：2025-10-12  
> **目的**：最大化利用現有詞庫數據，保持數據一致性

---

## 📋 功能說明

用戶手動添加生詞時，系統會：
1. 先查找 `vocabulary` 表（系統詞庫）
2. 如果找到，使用系統的完整數據並關聯 `vocabulary_id`
3. 如果沒找到，保存為用戶自定義詞（`vocabulary_id = NULL`）

---

## 🔍 查找邏輯

### 步驟 1：查找詞庫

```javascript
const { data: vocabData } = await supabase
    .from('vocabulary')
    .select('id, pinyin, definition, difficulty_level, category')
    .eq('word', word)
    .maybeSingle();
```

### 步驟 2：決定數據來源

**情況 A：在詞庫中找到**
```javascript
insertData = {
    user_id: gameState.userId,
    vocabulary_id: vocabData.id,        // ✅ 關聯到詞庫
    word: word,
    pinyin: vocabData.pinyin,           // 使用系統數據
    definition: vocabData.definition,   // 使用系統數據
    word_difficulty: vocabData.difficulty_level,
    source: 'vocabulary'                // 標記來源
};
```

**情況 B：詞庫中沒有**
```javascript
insertData = {
    user_id: gameState.userId,
    vocabulary_id: null,                // ❌ 無關聯
    word: word,
    pinyin: pinyin,                     // 使用頁面抓取數據
    definition: definition,             // 使用頁面抓取數據
    word_difficulty: null,
    source: 'manual'                    // 標記來源
};
```

---

## ✅ 優勢

### 1. 數據一致性
```
用戶添加：高興
系統詞庫：高興 (ID: 123, 難度: 2, 拼音: gāo xìng)

結果：
✅ user_wordbook.vocabulary_id = 123
✅ 可以 JOIN vocabulary 表獲取最新數據
✅ AI 推薦時可以正確識別已學詞語
```

### 2. 避免重複
```
情況：用戶手動添加的詞，恰好在詞庫中

傳統方式：
- user_wordbook: "高興" (vocabulary_id = NULL)
- vocabulary: "高興" (ID = 123)
- 兩者孤立，形成重複數據

智能查找：
- user_wordbook: "高興" (vocabulary_id = 123)
- 直接關聯，無重複
```

### 3. 自動更新
```
詞庫更新：將"高興"的難度從 2 改為 1

關聯用戶：
✅ 通過 vocabulary_id JOIN，自動獲得最新難度

未關聯用戶：
❌ word_difficulty 仍然是舊值，無法更新
```

### 4. 支援 AI 推薦
```sql
-- 查找用戶已學詞語（兩種來源）
SELECT DISTINCT 
  COALESCE(v.word, uw.word) as learned_word
FROM user_wordbook uw
LEFT JOIN vocabulary v ON uw.vocabulary_id = v.id
WHERE uw.user_id = $1;

-- 過濾推薦詞語
SELECT * FROM vocabulary
WHERE word NOT IN (已學詞語列表)
  AND difficulty_level = $2;
```

---

## 📊 數據來源標記

`user_wordbook.source` 欄位標記數據來源：

| source 值 | 說明 | vocabulary_id |
|-----------|------|---------------|
| `vocabulary` | 來自系統詞庫 | ✅ 有值 |
| `manual` | 用戶手動添加（詞庫沒有） | ❌ NULL |
| `game` | 遊戲推薦並使用 | ✅ 有值 |
| `import` | 批量導入 | 取決於導入方式 |
| `migration` | 數據遷移 | ❌ NULL |

---

## 🔄 數據流程

```
用戶添加生詞 "高興"
        ↓
查找 vocabulary 表
        ↓
   ┌────┴────┐
   ↓         ↓
找到了      沒找到
   ↓         ↓
使用系統數據   使用頁面數據
vocabulary_id  vocabulary_id
   = 123        = NULL
   ↓         ↓
插入 user_wordbook
        ↓
   ✅ 完成
```

---

## 🧪 測試用例

### 測試 1：詞庫中的詞

```javascript
// 1. 添加"高興"（詞庫中有）
// 預期：vocabulary_id 有值，使用系統拼音和定義

// 2. 驗證數據庫
SELECT * FROM user_wordbook WHERE word = '高興';
// 應該有 vocabulary_id，且 source = 'vocabulary'
```

### 測試 2：詞庫中沒有的詞

```javascript
// 1. 添加"勇敢"（假設詞庫沒有）
// 預期：vocabulary_id = NULL，使用頁面抓取的數據

// 2. 驗證數據庫
SELECT * FROM user_wordbook WHERE word = '勇敢';
// 應該 vocabulary_id IS NULL，且 source = 'manual'
```

### 測試 3：同時添加兩種詞

```javascript
// 1. 添加"快樂"（詞庫有）和"開心"（詞庫沒有）

// 2. 驗證
SELECT word, vocabulary_id IS NOT NULL as in_vocab, source
FROM user_wordbook
WHERE word IN ('快樂', '開心');

// 預期結果：
// 快樂 | true  | vocabulary
// 開心 | false | manual
```

---

## ⚙️ 性能影響

### 額外查詢成本
- 每次添加生詞：+1 次 SELECT 查詢
- 查詢時間：< 10ms（使用索引）
- 用戶體驗：無感知（異步執行）

### 優化措施
```javascript
// 查詢使用索引
CREATE INDEX idx_vocabulary_word ON vocabulary(word);

// 只選擇需要的欄位
.select('id, pinyin, definition, difficulty_level, category')
```

---

## 🔮 未來改進

### 可能的增強

1. **批量查找**
   ```javascript
   // 如果用戶一次添加多個詞
   const words = ['高興', '開心', '快樂'];
   const { data } = await supabase
       .from('vocabulary')
       .select('*')
       .in('word', words);
   ```

2. **緩存查找結果**
   ```javascript
   // 避免重複查找同一個詞
   const vocabCache = new Map();
   ```

3. **模糊匹配**
   ```javascript
   // 支援繁簡轉換、異體字
   .or(`word.eq.${word},word.eq.${toSimplified(word)}`)
   ```

---

## 📚 相關文檔

- [數據雲端同步修復](DATA_CLOUD_SYNC_FIX.md)
- [用戶 ID 使用規範](../.cursor/rules/story-vocab-user-id.mdc)
- [Vocabulary 表結構](../supabase/migrations/001_initial_schema.sql)

---

**維護者**：書院中文經典  
**最後更新**：2025-10-12

