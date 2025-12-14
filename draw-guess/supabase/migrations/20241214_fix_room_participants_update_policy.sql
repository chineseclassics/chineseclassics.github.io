-- 修復 room_participants 表的 UPDATE RLS 策略
-- 問題：原策略只允許用戶更新自己的記錄，導致房主無法更新其他玩家的分數
-- 影響：分鏡接龍模式中，除房主外所有玩家的分數一直是 0
-- 解決方案：添加一個新策略，允許房主更新同房間內所有玩家的記錄
-- 創建時間：2024-12-14

-- 1. 添加房主更新策略
-- 允許房主更新同房間內所有參與者的分數
CREATE POLICY "room_participants_update_host" ON room_participants
  FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM game_rooms
      WHERE game_rooms.id = room_participants.room_id
      AND game_rooms.host_id = auth.uid()
    )
  );

COMMENT ON POLICY "room_participants_update_host" ON room_participants IS '允許房主更新同房間內所有參與者的分數';

