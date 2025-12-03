-- 你畫我猜 - 初始數據庫架構
-- 創建時間：2025-01-XX
-- 描述：建立核心表結構和 RLS 策略

-- ============================================
-- 1. 用戶表（UUID 主鍵 + 多重身份系統）
-- ============================================

-- users 表：用戶主表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  user_type TEXT DEFAULT 'registered' CHECK (user_type IN ('registered', 'anonymous')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- user_identities 表：多重身份關聯表
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'anonymous')),
  provider_id TEXT NOT NULL,
  provider_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- ============================================
-- 2. 房間系統
-- ============================================

-- game_rooms 表：遊戲房間
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 6 位房間碼
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  words JSONB NOT NULL, -- 詞語列表
  word_count INT NOT NULL CHECK (word_count >= 6),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  settings JSONB, -- 遊戲設置（繪畫時間、輪數、提示數量等）
  current_round INT DEFAULT 0,
  current_drawer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- room_participants 表：房間參與者
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  score INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ============================================
-- 3. 遊戲輪次和猜測
-- ============================================

-- game_rounds 表：遊戲輪次
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  drawer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  word_source TEXT CHECK (word_source IN ('wordlist', 'custom')),
  drawing_data JSONB, -- 繪畫數據
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- guesses 表：猜測記錄
CREATE TABLE IF NOT EXISTS guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guess_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  score_earned INT DEFAULT 0,
  guessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id) -- 每個玩家在每輪只能猜一次
);

-- ============================================
-- 4. 索引優化
-- ============================================

-- 房間碼索引（快速查找）
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);

-- 房間狀態索引
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);

-- 房間參與者索引
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- 遊戲輪次索引
CREATE INDEX IF NOT EXISTS idx_game_rounds_room_id ON game_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_drawer_id ON game_rounds(drawer_id);

-- 猜測記錄索引
CREATE INDEX IF NOT EXISTS idx_guesses_round_id ON guesses(round_id);
CREATE INDEX IF NOT EXISTS idx_guesses_user_id ON guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_guesses_is_correct ON guesses(round_id, is_correct) WHERE is_correct = TRUE;

-- 用戶身份索引
CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider ON user_identities(provider, provider_id);

-- ============================================
-- 5. 更新時間觸發器
-- ============================================

-- 自動更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Row Level Security (RLS) 策略
-- ============================================

-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

-- users 表 RLS 策略
-- 所有人可以讀取用戶基本信息（教學平台，姓名郵箱不敏感）
CREATE POLICY "users_select" ON users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 用戶可以更新自己的資料
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- user_identities 表 RLS 策略
-- 用戶可以讀取自己的身份信息
CREATE POLICY "user_identities_select_own" ON user_identities
  FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = user_id);

-- 用戶可以插入自己的身份信息
CREATE POLICY "user_identities_insert_own" ON user_identities
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = user_id);

-- game_rooms 表 RLS 策略
-- 所有人可以讀取房間信息
CREATE POLICY "game_rooms_select" ON game_rooms
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 認證用戶可以創建房間
CREATE POLICY "game_rooms_insert" ON game_rooms
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 房主可以更新房間
CREATE POLICY "game_rooms_update_host" ON game_rooms
  FOR UPDATE
  TO authenticated, anon
  USING (host_id = auth.uid() OR host_id IS NULL);

-- 房主可以刪除房間
CREATE POLICY "game_rooms_delete_host" ON game_rooms
  FOR DELETE
  TO authenticated, anon
  USING (host_id = auth.uid());

-- room_participants 表 RLS 策略
-- 房間內玩家可以讀取參與者列表
CREATE POLICY "room_participants_select" ON room_participants
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM game_rooms
      WHERE game_rooms.id = room_participants.room_id
    )
  );

-- 認證用戶可以加入房間
CREATE POLICY "room_participants_insert" ON room_participants
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 玩家可以離開自己的參與記錄
CREATE POLICY "room_participants_delete_own" ON room_participants
  FOR DELETE
  TO authenticated, anon
  USING (user_id = auth.uid() OR user_id IS NULL);

-- game_rounds 表 RLS 策略
-- 房間內玩家可以讀取輪次信息
CREATE POLICY "game_rounds_select" ON game_rounds
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = game_rounds.room_id
    )
  );

-- 認證用戶可以創建輪次（通常由系統或房主）
CREATE POLICY "game_rounds_insert" ON game_rounds
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- guesses 表 RLS 策略
-- 房間內玩家可以讀取猜測記錄
CREATE POLICY "guesses_select" ON guesses
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM game_rounds
      JOIN room_participants ON room_participants.room_id = game_rounds.room_id
      WHERE game_rounds.id = guesses.round_id
    )
  );

-- 玩家可以插入自己的猜測
CREATE POLICY "guesses_insert_own" ON guesses
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 玩家不能修改他人的猜測（系統自動處理，不需要 UPDATE 策略）

-- ============================================
-- 7. 註釋
-- ============================================

COMMENT ON TABLE users IS '用戶主表，使用 UUID 主鍵，支持多重身份系統';
COMMENT ON TABLE user_identities IS '用戶身份關聯表，支持 Google OAuth 和匿名登入';
COMMENT ON TABLE game_rooms IS '遊戲房間表，包含房間信息和狀態';
COMMENT ON TABLE room_participants IS '房間參與者表，記錄玩家在房間中的信息';
COMMENT ON TABLE game_rounds IS '遊戲輪次表，記錄每輪的繪畫和詞語';
COMMENT ON TABLE guesses IS '猜測記錄表，記錄玩家的猜測和得分';

