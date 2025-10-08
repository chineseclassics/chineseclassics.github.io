# 數據庫遷移詳解 - 給非技術用戶

## 🤔 什麼是數據庫遷移？

簡單來說，數據庫遷移就像是給你的房子**添加新房間**，而不是拆掉重建。

**比喻**：
- ❌ **覆蓋**：拆掉整個房子重建 → 所有東西都沒了
- ✅ **遷移**：在現有房子上加蓋新房間 → 原來的東西都還在

## 📋 你現有的數據庫

從 migrations 文件夾的歷史記錄看，你已經有：

### 已執行的遷移：
1. **001_initial_schema.sql** - 初始數據庫結構
   - 創建了：`users`, `vocabulary`, `story_sessions`, `user_vocabulary`, `user_wordbook` 等表
   
2. **002_enable_rls_policies.sql** - 啟用安全策略
   
3. **003_allow_vocab_insert.sql** - 詞彙插入權限
   
4. **004_add_missing_columns.sql** - 添加 `hsk_level` 字段
   
5. **005_fix_rls_properly.sql** - 修復安全策略

### 現有的核心數據：
- ✅ 用戶數據（users表）
- ✅ 詞彙數據（vocabulary表）
- ✅ 故事會話（story_sessions表）
- ✅ 生詞本（user_wordbook表）

## 🆕 這次要添加什麼？

### 新的遷移：006_ai_vocab_system.sql

這次遷移會：

#### 1. **新增4個表**（全新的，不影響現有表）
- `user_profiles` - 用戶畫像表
- `game_rounds` - 遊戲回合記錄
- `game_session_summary` - 遊戲會話彙總
- `recommendation_history` - 推薦歷史

#### 2. **擴展1個現有表**（只添加新字段，不改動原有數據）
- `user_wordbook` 表會增加：
  - `word` - 詞語文本
  - `word_difficulty` - 詞語難度
  - `last_recommended_at` - 最後推薦時間
  - `times_recommended` - 推薦次數

**重要**：原有的 `vocabulary_id`, `from_story_id`, `example_sentence` 等字段**完全不變**！

## ✅ 安全保證

### 遷移的工作原理：

```
Supabase 會記錄：
✓ 001_initial_schema.sql       [已執行 ✓]
✓ 002_enable_rls_policies.sql  [已執行 ✓]
✓ 003_allow_vocab_insert.sql   [已執行 ✓]
✓ 004_add_missing_columns.sql  [已執行 ✓]
✓ 005_fix_rls_properly.sql     [已執行 ✓]
→ 006_ai_vocab_system.sql      [新的，待執行]
```

當你執行 `supabase db push` 時：
1. Supabase 檢查：哪些遷移已經執行過？
2. 發現：001-005 都執行過了 ✓
3. 只執行：006（新的）
4. 結果：只添加新東西，不動舊東西

### 數據安全：

| 操作 | 會發生什麼 | 數據安全嗎？ |
|------|------------|--------------|
| 新增表 | 創建全新的表 | ✅ 完全安全，不影響現有表 |
| 擴展表 | 在現有表添加新列 | ✅ 安全，原有數據不變 |
| 修改列 | 改變現有列的類型/名稱 | ⚠️ 有風險（我們沒做這個） |
| 刪除列 | 刪除現有列 | ❌ 危險（我們沒做這個） |
| 刪除表 | 刪除整個表 | ❌ 非常危險（我們沒做這個） |

**我們只做了前兩種安全操作！**

## 🔍 具體變化對比

### user_wordbook 表的變化：

#### 遷移前：
```
user_wordbook
├── id
├── user_id
├── vocabulary_id        ← 原有字段
├── from_story_id        ← 原有字段
├── example_sentence     ← 原有字段
├── user_note            ← 原有字段
└── created_at           ← 原有字段
```

#### 遷移後：
```
user_wordbook
├── id
├── user_id
├── vocabulary_id        ← 保持不變 ✓
├── from_story_id        ← 保持不變 ✓
├── example_sentence     ← 保持不變 ✓
├── user_note            ← 保持不變 ✓
├── created_at           ← 保持不變 ✓
├── word                 ← 新增 ✨
├── word_difficulty      ← 新增 ✨
├── last_recommended_at  ← 新增 ✨
└── times_recommended    ← 新增 ✨
```

**結論**：只是在房間裡多放了幾件家具，原有的家具位置完全不變！

## 🛡️ 多重保護機制

### 1. 條件性創建
```sql
CREATE TABLE IF NOT EXISTS user_profiles ...
```
意思：如果表已經存在，就跳過，不會報錯或覆蓋

### 2. 條件性添加字段
```sql
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'user_wordbook' AND column_name = 'word'
) THEN
  ALTER TABLE user_wordbook ADD COLUMN word TEXT;
END IF;
```
意思：先檢查字段是否存在，不存在才添加

### 3. 外鍵引用
```sql
user_id UUID REFERENCES users(id) ON DELETE CASCADE
```
意思：新表和舊表之間建立安全的關聯，刪除用戶時會自動清理相關數據

## 📊 執行遷移後的數據庫全貌

```
數據庫：story-vocab
│
├── 原有表（5個）← 完全不變 ✓
│   ├── users
│   ├── vocabulary
│   ├── story_sessions
│   ├── user_vocabulary
│   └── user_wordbook（擴展了4個新字段）
│
└── 新增表（4個）← 全新的 ✨
    ├── user_profiles
    ├── game_rounds
    ├── game_session_summary
    └── recommendation_history
```

## ❓ 常見問題

### Q1: 如果執行後出問題怎麼辦？

**A**: 有兩種恢復方式：

1. **回滾遷移**（Supabase 不直接支持，但可以手動）：
   ```sql
   DROP TABLE IF EXISTS recommendation_history CASCADE;
   DROP TABLE IF EXISTS game_session_summary CASCADE;
   DROP TABLE IF EXISTS game_rounds CASCADE;
   DROP TABLE IF EXISTS user_profiles CASCADE;
   
   -- 移除新添加的字段
   ALTER TABLE user_wordbook DROP COLUMN IF EXISTS word;
   ALTER TABLE user_wordbook DROP COLUMN IF EXISTS word_difficulty;
   ALTER TABLE user_wordbook DROP COLUMN IF EXISTS last_recommended_at;
   ALTER TABLE user_wordbook DROP COLUMN IF EXISTS times_recommended;
   ```

2. **Supabase Dashboard 備份**：
   - Supabase 每天自動備份
   - 可以恢復到執行遷移前的狀態

### Q2: 我的現有數據會丟失嗎？

**A**: 絕對不會！
- 新增的表是空的，不會影響舊數據
- user_wordbook 只添加新列，原有列和數據完全保留
- 所有現有的故事、詞彙、用戶數據都**100%安全**

### Q3: 執行遷移需要多久？

**A**: 非常快！
- 新增表：幾秒鐘
- 添加字段：幾秒鐘
- 總計：< 10秒

### Q4: 如果我不確定，可以先測試嗎？

**A**: 可以！兩種方式：

1. **使用 Supabase 的分支功能**（如果有）
2. **查看 SQL 而不執行**：
   ```bash
   # 只查看會執行什麼SQL，不真正執行
   cat story-vocab/supabase/migrations/006_ai_vocab_system.sql
   ```

## 🎯 總結

| 問題 | 答案 |
|------|------|
| 會覆蓋現有數據庫嗎？ | ❌ 不會 |
| 會刪除現有數據嗎？ | ❌ 不會 |
| 會修改現有表結構嗎？ | 只在 user_wordbook 添加新字段，原有字段不變 |
| 原有功能會受影響嗎？ | ❌ 不會 |
| 是否可以回滾？ | ✅ 可以（手動或從備份恢復） |
| 執行風險等級？ | 🟢 低風險 |

## ✅ 執行建議

**可以放心執行！** 理由：
1. 遷移設計非常保守（只增不改）
2. 使用了多重保護機制
3. Supabase 有自動備份
4. 可以手動回滾
5. 不影響現有功能

**執行前的小提示**：
1. 確認你的應用目前運行正常
2. 如果有重要數據，可以先在 Supabase Dashboard 手動導出一份
3. 執行遷移
4. 測試一下原有功能是否正常
5. 開始使用新功能！

---

如果還有任何疑問，隨時問我！🙋‍♂️

