-- 分鏡接龍模式 - 擴展 game_rooms 表
-- 創建時間：2024-12-13
-- 描述：添加分鏡接龍模式所需的字段
-- Requirements: 1.2, 7.1, 7.4

-- ============================================
-- 1. 添加遊戲模式字段
-- ============================================

-- game_mode: 遊戲模式
-- classic: 傳統猜詞模式（默認）
-- storyboard: 分鏡接龍模式
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'classic'
  CHECK (game_mode IN ('classic', 'storyboard'));

-- ============================================
-- 2. 添加單局模式字段
-- ============================================

-- single_round_mode: 單局模式
-- true: 一局結束後自動進入故事結局
-- false: 可以繼續多局（默認）
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS single_round_mode BOOLEAN DEFAULT FALSE;

-- ============================================
-- 3. 添加最後一局標記字段
-- ============================================

-- is_final_round: 是否為最後一局
-- true: 當前局為最後一局，結束後進入故事結局
-- false: 非最後一局（默認）
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS is_final_round BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. 添加分鏡模式階段字段
-- ============================================

-- storyboard_phase: 分鏡模式當前階段
-- setup: 故事開頭設定
-- drawing: 繪畫階段
-- writing: 編劇階段
-- voting: 投票階段
-- summary: 結算階段
-- ending: 故事結局設定
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS storyboard_phase TEXT DEFAULT 'setup'
  CHECK (storyboard_phase IN ('setup', 'drawing', 'writing', 'voting', 'summary', 'ending'));

-- ============================================
-- 5. 索引優化
-- ============================================

-- 遊戲模式索引（按模式查詢房間）
CREATE INDEX IF NOT EXISTS idx_game_rooms_game_mode ON game_rooms(game_mode);

-- ============================================
-- 6. 註釋
-- ============================================

COMMENT ON COLUMN game_rooms.game_mode IS '遊戲模式：classic（傳統猜詞）或 storyboard（分鏡接龍）';
COMMENT ON COLUMN game_rooms.single_round_mode IS '單局模式：true 表示一局結束後自動進入故事結局';
COMMENT ON COLUMN game_rooms.is_final_round IS '最後一局標記：true 表示當前局結束後進入故事結局';
COMMENT ON COLUMN game_rooms.storyboard_phase IS '分鏡模式當前階段';
