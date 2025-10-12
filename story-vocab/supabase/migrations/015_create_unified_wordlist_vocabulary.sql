-- =====================================================
-- 創建統一詞彙表（系統詞表 + 自定義詞表）
-- 創建日期：2025-10-13
-- 目的：取代 vocabulary 和 vocabulary_wordlist_mapping
-- =====================================================

BEGIN;

-- ========================================
-- 1. 創建統一詞彙表
-- ========================================

CREATE TABLE IF NOT EXISTS wordlist_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordlist_id UUID NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  
  -- 分層標籤
  level_2_tag TEXT,
  level_3_tag TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 同一個詞表的同一層級位置只能出現一次相同詞語
  UNIQUE(wordlist_id, word, level_2_tag, level_3_tag)
);

-- ========================================
-- 2. 創建索引優化查詢
-- ========================================

CREATE INDEX idx_wordlist_vocab_wordlist ON wordlist_vocabulary(wordlist_id);
CREATE INDEX idx_wordlist_vocab_word ON wordlist_vocabulary(word);
CREATE INDEX idx_wordlist_vocab_tags ON wordlist_vocabulary(wordlist_id, level_2_tag, level_3_tag);
CREATE INDEX idx_wordlist_vocab_level2 ON wordlist_vocabulary(level_2_tag) WHERE level_2_tag IS NOT NULL;

-- ========================================
-- 3. 添加表註釋
-- ========================================

COMMENT ON TABLE wordlist_vocabulary IS '統一詞彙表 - 存儲所有詞表（系統+自定義）的詞彙';
COMMENT ON COLUMN wordlist_vocabulary.wordlist_id IS '所屬詞表ID';
COMMENT ON COLUMN wordlist_vocabulary.word IS '詞語文本';
COMMENT ON COLUMN wordlist_vocabulary.level_2_tag IS '第二層級標籤（如：HSK3、四年級）';
COMMENT ON COLUMN wordlist_vocabulary.level_3_tag IS '第三層級標籤（如：單元1，可選）';

-- ========================================
-- 4. 啟用 RLS 並配置權限策略
-- ========================================

ALTER TABLE wordlist_vocabulary ENABLE ROW LEVEL SECURITY;

-- 讀取權限：系統詞表所有人可讀，自定義詞表只有創建者可讀
CREATE POLICY "wordlist_vocabulary_select" ON wordlist_vocabulary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wordlists w
      WHERE w.id = wordlist_vocabulary.wordlist_id
        AND (
          w.type = 'system'  -- 系統詞表：所有人可讀
          OR 
          w.owner_id = get_user_id_from_auth()  -- 自定義詞表：只有創建者可讀
        )
    )
  );

-- 插入權限：只有自定義詞表的創建者可以插入
CREATE POLICY "wordlist_vocabulary_insert" ON wordlist_vocabulary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordlists w
      WHERE w.id = wordlist_vocabulary.wordlist_id
        AND w.type = 'custom'
        AND w.owner_id = get_user_id_from_auth()
    )
  );

-- 修改/刪除權限：只有自定義詞表的創建者
CREATE POLICY "wordlist_vocabulary_update" ON wordlist_vocabulary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM wordlists w
      WHERE w.id = wordlist_vocabulary.wordlist_id
        AND w.type = 'custom'
        AND w.owner_id = get_user_id_from_auth()
    )
  );

CREATE POLICY "wordlist_vocabulary_delete" ON wordlist_vocabulary
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM wordlists w
      WHERE w.id = wordlist_vocabulary.wordlist_id
        AND w.type = 'custom'
        AND w.owner_id = get_user_id_from_auth()
    )
  );

COMMIT;

-- ========================================
-- 驗證結果
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ wordlist_vocabulary 表已創建';
  RAISE NOTICE '   - 支持系統詞表和自定義詞表';
  RAISE NOTICE '   - RLS 策略已配置';
  RAISE NOTICE '   - 索引已優化';
  RAISE NOTICE '';
  RAISE NOTICE '📋 權限說明：';
  RAISE NOTICE '   系統詞表（type=system）：所有用戶可讀，不可寫';
  RAISE NOTICE '   自定義詞表（type=custom）：只有創建者可讀寫';
END $$;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 本遷移創建了統一的詞彙表 wordlist_vocabulary
-- 
-- 用途：
-- 1. 存儲系統詞表詞彙（HSK、人教版等）
-- 2. 存儲用戶自定義詞表詞彙
-- 
-- 優勢：
-- 1. 統一架構，系統詞表和自定義詞表使用相同邏輯
-- 2. 擴展容易，添加新系統詞表只需導入數據
-- 3. 權限隔離，通過 RLS 確保數據安全
-- 4. 查詢高效，關鍵欄位已建立索引
-- 
-- 下一步：
-- 執行 016_migrate_system_wordlists.sql 遷移現有系統詞表數據
-- =====================================================

