begin;

alter table public.essays
drop column if exists subtitle;

commit;


