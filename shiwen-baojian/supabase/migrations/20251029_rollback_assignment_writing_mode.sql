-- 回退：移除 assignments 的 writing_mode 與 editor_layout_json

begin;

alter table public.assignments
drop column if exists editor_layout_json;

alter table public.assignments
drop constraint if exists assignments_writing_mode_check;

alter table public.assignments
drop column if exists writing_mode;

commit;


