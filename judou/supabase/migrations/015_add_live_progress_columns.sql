-- 增加即時進度相關欄位（鬥豆場）
-- 1) game_participants: last_interaction（最後互動時間）、wrong_breaks（累計錯誤斷句）
-- 2) game_text_progress: last_interaction（最後互動時間）

alter table public.game_participants
  add column if not exists last_interaction timestamptz,
  add column if not exists wrong_breaks integer default 0;

alter table public.game_text_progress
  add column if not exists last_interaction timestamptz;
