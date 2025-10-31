-- 2025-10-31
-- 調整需求：老師刪除作業不應刪除學生論文
-- 實施：將 essays.assignment_id 外鍵由 ON DELETE CASCADE 改為 ON DELETE SET NULL，並允許 assignment_id 為 NULL

begin;

alter table public.essays alter column assignment_id drop not null;

alter table public.essays drop constraint if exists essays_assignment_id_fkey;

alter table public.essays
  add constraint essays_assignment_id_fkey
  foreign key (assignment_id)
  references public.assignments(id)
  on update no action
  on delete set null;

commit;
