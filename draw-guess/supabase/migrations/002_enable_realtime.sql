-- 你畫我猜 - 啟用 Realtime 功能
-- 創建時間：2025-01-XX
-- 描述：為需要實時同步的表啟用 Supabase Realtime

-- ============================================
-- 啟用 Realtime 發布
-- ============================================

-- 為需要實時更新的表啟用 Realtime
-- 這些表用於房間狀態、參與者、輪次和猜測的實時同步

ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE guesses;

-- 註釋
COMMENT ON TABLE game_rooms IS '遊戲房間表 - 已啟用 Realtime，用於實時同步房間狀態';
COMMENT ON TABLE room_participants IS '房間參與者表 - 已啟用 Realtime，用於實時同步玩家加入/離開和分數';
COMMENT ON TABLE game_rounds IS '遊戲輪次表 - 已啟用 Realtime，用於實時同步輪次開始/結束';
COMMENT ON TABLE guesses IS '猜測記錄表 - 已啟用 Realtime，用於實時同步猜測結果';

