-- 2025-10-31
-- 問題：刪除任務（assignments）時，因 essays -> annotations 沒有級聯刪除導致 23503 外鍵衝突
-- 原因：essays(id) 被 annotations(essay_id) 以 NO ACTION 參照
-- 解法：將 annotations.essay_id 外鍵改為 ON DELETE CASCADE，確保刪除作業 -> 連帶刪除作文 -> 連帶刪除其批註

begin;

-- 安全起見，先刪除舊外鍵再以 CASCADE 方式重建
alter table public.annotations drop constraint if exists annotations_essay_id_fkey;

alter table public.annotations
  add constraint annotations_essay_id_fkey
  foreign key (essay_id)
  references public.essays(id)
  on update no action
  on delete cascade;

commit;
