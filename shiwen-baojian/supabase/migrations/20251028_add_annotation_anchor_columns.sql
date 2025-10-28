-- 向後兼容的新增欄位：文檔級錨點
alter table if exists public.annotations
  add column if not exists text_quote text,
  add column if not exists text_prefix text,
  add column if not exists text_suffix text,
  add column if not exists text_start int,
  add column if not exists text_end int,
  add column if not exists anchor_version int;

create index if not exists idx_annotations_essay on public.annotations(essay_id);
create index if not exists idx_annotations_text_start on public.annotations(essay_id, text_start);

-- 簡化 essays 狀態約束（兩態）
alter table if exists public.essays
  add constraint essays_status_ck check (status in ('editing','graded'));

-- 可選：把既有其他狀態先歸一為 editing
update public.essays set status='editing' where status in ('draft','submitted','in_progress');


