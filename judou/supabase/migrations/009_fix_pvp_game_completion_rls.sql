-- 修復 PvP 對戰無法正確結束的問題
-- 創建時間：2025-11-27
-- 
-- 問題：RLS 策略只允許房主更新房間，導致非房主最後提交時無法結束遊戲
-- 
-- 場景：
-- 1. 房主先完成 → 調用 checkGameCompletion() → 發現對方沒完成 → 不結束
-- 2. 非房主後完成 → 調用 checkGameCompletion() → 發現都完成 → 調用 endGame()
-- 3. endGame() 要更新 game_rooms.status = 'finished'
-- 4. 但 RLS 只允許房主更新！非房主的更新被 403 拒絕
-- 5. 遊戲卡在 'playing' 狀態
--
-- 解決方案：允許參與者將房間狀態從 'playing' 更新為 'finished'
-- 
-- 重要：必須使用 WITH CHECK 子句！
-- 因為 USING 條件是 status='playing'，但更新後 status='finished'
-- 如果沒有 WITH CHECK，PostgreSQL 會用 USING 作為 WITH CHECK
-- 導致更新後的行不滿足條件而被拒絕

-- 1. 刪除舊的 update 策略
DROP POLICY IF EXISTS "game_rooms_update" ON game_rooms;
DROP POLICY IF EXISTS "game_rooms_update_participant_finish" ON game_rooms;

-- 2. 房主可以更新任何欄位
CREATE POLICY "game_rooms_update_host" ON game_rooms
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

-- 3. 參與者可以在遊戲進行中時結束遊戲（僅限將狀態改為 finished）
CREATE POLICY "game_rooms_update_participant_finish" ON game_rooms
  FOR UPDATE TO authenticated
  USING (
    -- 必須是房間的參與者
    EXISTS (
      SELECT 1 FROM game_participants 
      WHERE room_id = game_rooms.id AND user_id = auth.uid()
    )
    -- 且房間當前狀態是 playing
    AND status = 'playing'
  )
  WITH CHECK (
    -- 更新後的狀態必須是 finished（只允許結束遊戲，不能改成其他狀態）
    status = 'finished'
  );

