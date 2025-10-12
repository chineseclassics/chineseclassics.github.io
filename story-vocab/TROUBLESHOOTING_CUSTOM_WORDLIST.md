# 自定義詞表推薦問題診斷

## 問題描述

用戶上傳自定義詞表並選擇分層後，遊戲推薦的不是自定義詞表中的詞。

## 診斷步驟

### 1. 檢查前端傳遞的參數

打開控制台（F12），開始遊戲，查找以下日誌：

```
📚 开始游戏 - 词表模式: wordlist
📚 词表ID: [應該有UUID]
📚 层级2: [應該是你選擇的分層，如"基礎"]
📚 层级3: null
```

**檢查點**：
- ✅ wordlistMode 應該是 'wordlist'（不是 'ai'）
- ✅ wordlistId 應該有值
- ✅ level2Tag 應該是你選擇的分層

如果這些都正確，繼續下一步。

---

### 2. 檢查 Edge Function 接收的參數

在控制台的 Network 標籤：
1. 篩選：`vocab-recommender`
2. 點擊請求
3. 查看 **Payload**（請求體）

應該看到：
```json
{
  "userId": "...",
  "sessionId": "...",
  "roundNumber": 1,
  "storyContext": "",
  "wordlistMode": "wordlist",
  "wordlistId": "應該是你的詞表UUID",
  "level2Tag": "應該是你選的分層",
  "level3Tag": null
}
```

**檢查點**：
- ✅ wordlistMode 是 'wordlist'
- ✅ wordlistId 有值
- ✅ level2Tag 有值

如果參數正確，繼續下一步。

---

### 3. 檢查 Edge Function 的日誌

在 Supabase Dashboard：
1. 進入 **Edge Functions** → **vocab-recommender**
2. 點擊 **Logs** 標籤
3. 查看最新的日誌

應該看到：
```
[詞表模式] 詞表ID: xxx, L2: 基礎, L3: null
✅ 從詞表獲取 X 個候選詞彙
✅ 推薦了 5 個詞
```

**可能的問題**：

#### 問題 A：查詢返回 0 個詞彙
```
⚠️ 詞表 xxx 在指定層級沒有詞彙
```

**原因**：
- 上傳時 level_2_tag 沒有正確保存
- 或者查詢條件不匹配

**解決**：查看資料庫中的數據

#### 問題 B：Edge Function 仍然使用舊代碼
```
[查詢詞表失敗] ...
```

**原因**：Edge Function 沒有正確部署

**解決**：重新部署

---

### 4. 檢查資料庫中的數據

在 Supabase Dashboard → SQL Editor：

```sql
-- 查看你的自定義詞表
SELECT * FROM wordlists 
WHERE type = 'custom' 
ORDER BY created_at DESC 
LIMIT 5;

-- 查看詞表中的詞彙
SELECT * FROM wordlist_vocabulary 
WHERE wordlist_id = 'YOUR_WORDLIST_ID'
LIMIT 20;
```

**檢查點**：
- ✅ wordlist 記錄存在
- ✅ wordlist_vocabulary 中有詞彙記錄
- ✅ level_2_tag 欄位有值（如 "基礎"）
- ✅ 詞彙數量 >= 5

---

## 快速診斷命令

請在控制台運行以下命令，然後把結果告訴我：

```javascript
// 檢查 gameState
console.log('詞表模式:', gameState.wordlistMode);
console.log('詞表ID:', gameState.wordlistId);
console.log('第二層級:', gameState.level2Tag);
console.log('第三層級:', gameState.level3Tag);
```

然後告訴我輸出的內容！

