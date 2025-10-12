-- =====================================================
-- 修復 user_wordbook 表：讓 vocabulary_id 變為可選
-- 創建日期：2025-10-12
-- 原因：用戶手動添加的生詞可能不在 vocabulary 表中
-- =====================================================

BEGIN;

-- 1. 移除 vocabulary_id 的 NOT NULL 約束（如果有）
ALTER TABLE user_wordbook 
  ALTER COLUMN vocabulary_id DROP NOT NULL;

-- 2. 確保 word 欄位存在且不為 NULL（對於新記錄）
-- 如果 word 欄位不存在，006 遷移應該已經添加了
-- 這裡只是確保數據完整性

-- 3. 添加 source 欄位（如果不存在）- 標記數據來源
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'source'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN source TEXT;
    COMMENT ON COLUMN user_wordbook.source IS '數據來源: manual(手動添加), game(遊戲中添加), import(導入), migration(遷移)';
  END IF;
END $$;

-- 4. 添加 pinyin 和 translation 欄位（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'pinyin'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN pinyin TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'translation'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN translation TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wordbook' AND column_name = 'definition'
  ) THEN
    ALTER TABLE user_wordbook ADD COLUMN definition TEXT;
  END IF;
END $$;

-- 5. 修改唯一約束：從 (user_id, vocabulary_id) 改為支持多種情況
-- 先刪除舊約束
ALTER TABLE user_wordbook 
  DROP CONSTRAINT IF EXISTS user_wordbook_user_id_vocabulary_id_key;

-- 添加新的唯一約束：同一用戶不能重複添加同一個詞
-- 使用 word 而不是 vocabulary_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wordbook_user_word 
  ON user_wordbook(user_id, word);

-- 6. 添加索引優化查詢
CREATE INDEX IF NOT EXISTS idx_user_wordbook_source 
  ON user_wordbook(source);

COMMIT;

-- =====================================================
-- 驗證結果
-- =====================================================

-- 查看表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_wordbook'
ORDER BY ordinal_position;

-- 查看約束
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_wordbook';

-- =====================================================
-- 遷移完成
-- =====================================================

