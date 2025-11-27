-- 句豆對戰系統（鬥豆場）數據庫遷移
-- 創建時間：2025-05-27

-- =====================================================
-- 1. 遊戲房間表 (game_rooms)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,  -- 6位房間碼
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_type TEXT NOT NULL CHECK (host_type IN ('teacher', 'student')),
  
  -- 遊戲配置
  game_mode TEXT NOT NULL CHECK (game_mode IN ('team_battle', 'pvp')),
  text_id UUID NOT NULL REFERENCES practice_texts(id) ON DELETE CASCADE,
  time_limit INT NOT NULL DEFAULT 180,  -- 秒
  
  -- 團隊模式配置
  team_count INT CHECK (team_count IS NULL OR (team_count >= 2 AND team_count <= 4)),
  
  -- PvP 模式配置
  max_players INT CHECK (max_players IS NULL OR (max_players >= 2 AND max_players <= 4)),
  entry_fee INT DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool INT DEFAULT 0 CHECK (prize_pool >= 0),
  
  -- 班級關聯（老師模式）
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- 遊戲狀態
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
  winner_team_id UUID,
  winner_user_id UUID,
  
  -- 時間戳
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 房間碼索引（快速查找）
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
-- 主持人索引
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_id ON game_rooms(host_id);
-- 狀態索引
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
-- 班級索引
CREATE INDEX IF NOT EXISTS idx_game_rooms_class_id ON game_rooms(class_id);

-- =====================================================
-- 2. 遊戲團隊表 (game_teams)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_color TEXT NOT NULL CHECK (team_color IN ('red', 'blue', 'green', 'yellow')),
  total_score INT DEFAULT 0,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, team_color),
  UNIQUE(room_id, order_index)
);

-- 房間索引
CREATE INDEX IF NOT EXISTS idx_game_teams_room_id ON game_teams(room_id);

-- =====================================================
-- 3. 遊戲參與者表 (game_participants)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES game_teams(id) ON DELETE SET NULL,
  
  -- 遊戲數據
  score INT DEFAULT 0,
  accuracy DECIMAL(5,2),
  time_spent INT,  -- 用時（秒）
  first_accuracy DECIMAL(5,2),  -- 首次正確率
  attempt_count INT DEFAULT 0,  -- 嘗試次數
  
  -- 狀態
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed', 'disconnected')),
  completed_at TIMESTAMPTZ,
  
  -- 入場費相關
  fee_paid INT DEFAULT 0,
  prize_won INT DEFAULT 0,
  
  -- 時間戳
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

-- 房間索引
CREATE INDEX IF NOT EXISTS idx_game_participants_room_id ON game_participants(room_id);
-- 用戶索引
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);
-- 團隊索引
CREATE INDEX IF NOT EXISTS idx_game_participants_team_id ON game_participants(team_id);

-- =====================================================
-- 4. 遊戲交易記錄表 (game_transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES game_rooms(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entry_fee', 'prize', 'refund', 'win_streak_bonus')),
  amount INT NOT NULL,
  balance_after INT,  -- 交易後餘額
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用戶索引
CREATE INDEX IF NOT EXISTS idx_game_transactions_user_id ON game_transactions(user_id);
-- 房間索引
CREATE INDEX IF NOT EXISTS idx_game_transactions_room_id ON game_transactions(room_id);
-- 時間索引
CREATE INDEX IF NOT EXISTS idx_game_transactions_created_at ON game_transactions(created_at);

-- =====================================================
-- 5. 擴展 user_stats 表（添加對戰相關欄位）
-- =====================================================
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS pvp_win_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pvp_best_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pvp_total_wins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pvp_total_games INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_fee_spent INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_fee_reset_at DATE;

-- =====================================================
-- 6. RLS 策略
-- =====================================================

-- 啟用 RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_transactions ENABLE ROW LEVEL SECURITY;

-- game_rooms 策略
-- 所有認證用戶可以查看等待中和進行中的房間
CREATE POLICY "game_rooms_select_public" ON game_rooms
  FOR SELECT TO authenticated
  USING (status IN ('waiting', 'playing') OR host_id = auth.uid());

-- 認證用戶可以創建房間
CREATE POLICY "game_rooms_insert" ON game_rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

-- 房主可以更新房間
CREATE POLICY "game_rooms_update" ON game_rooms
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

-- game_teams 策略
-- 所有認證用戶可以查看團隊
CREATE POLICY "game_teams_select" ON game_teams
  FOR SELECT TO authenticated
  USING (true);

-- 房主可以創建團隊
CREATE POLICY "game_teams_insert" ON game_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_rooms 
      WHERE id = room_id AND host_id = auth.uid()
    )
  );

-- 房主可以更新團隊
CREATE POLICY "game_teams_update" ON game_teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_rooms 
      WHERE id = room_id AND host_id = auth.uid()
    )
  );

-- game_participants 策略
-- 所有認證用戶可以查看參與者
CREATE POLICY "game_participants_select" ON game_participants
  FOR SELECT TO authenticated
  USING (true);

-- 認證用戶可以加入房間（創建參與者記錄）
CREATE POLICY "game_participants_insert" ON game_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 用戶可以更新自己的參與者記錄
CREATE POLICY "game_participants_update_self" ON game_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 房主可以更新所有參與者（分組等）
CREATE POLICY "game_participants_update_host" ON game_participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_rooms 
      WHERE id = room_id AND host_id = auth.uid()
    )
  );

-- game_transactions 策略
-- 用戶只能查看自己的交易記錄
CREATE POLICY "game_transactions_select" ON game_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 系統通過 RPC 插入交易記錄
CREATE POLICY "game_transactions_insert_system" ON game_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 7. 輔助函數
-- =====================================================

-- 生成唯一的6位房間碼
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 排除容易混淆的字符 I, O, 0, 1
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 創建房間時自動生成房間碼的觸發器
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    LOOP
      new_code := generate_room_code();
      SELECT EXISTS(SELECT 1 FROM game_rooms WHERE room_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.room_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_room_code
  BEFORE INSERT ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_code();

-- =====================================================
-- 8. 實時訂閱支持（啟用 Realtime）
-- =====================================================

-- 為需要實時更新的表啟用 Realtime
-- 注意：這需要在 Supabase Dashboard 中手動啟用，或通過以下方式
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE game_participants;

-- =====================================================
-- 9. 連勝獎勵配置（使用常量）
-- =====================================================
COMMENT ON TABLE game_rooms IS '鬥豆場遊戲房間';
COMMENT ON TABLE game_teams IS '鬥豆場團隊';
COMMENT ON TABLE game_participants IS '鬥豆場參與者';
COMMENT ON TABLE game_transactions IS '鬥豆場交易記錄（入場費、獎勵等）';

COMMENT ON COLUMN user_stats.pvp_win_streak IS '當前PvP連勝場數';
COMMENT ON COLUMN user_stats.pvp_best_streak IS '歷史最佳PvP連勝場數';
COMMENT ON COLUMN user_stats.pvp_total_wins IS 'PvP總勝場數';
COMMENT ON COLUMN user_stats.pvp_total_games IS 'PvP總場數';
COMMENT ON COLUMN user_stats.daily_fee_spent IS '當日已花費入場費';
COMMENT ON COLUMN user_stats.daily_fee_reset_at IS '每日入場費重置日期';

