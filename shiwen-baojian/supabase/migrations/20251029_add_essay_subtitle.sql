-- 為 essays 新增副標題欄位

begin;

alter table public.essays
add column if not exists subtitle text;

commit;


