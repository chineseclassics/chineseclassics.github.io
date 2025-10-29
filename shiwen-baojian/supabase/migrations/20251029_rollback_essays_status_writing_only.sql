-- 回退 essays.status 檢查約束到舊值 ['draft','submitted','graded'] 並將 writing 回填為 draft

begin;

alter table public.essays drop constraint if exists essays_status_check;

update public.essays set status = 'draft' where status = 'writing';

alter table public.essays alter column status set default 'draft';
alter table public.essays add constraint essays_status_check check (status in ('draft','submitted','graded'));

commit;


