-- 回退：移除新增的錨點欄位與狀態約束
alter table if exists public.annotations
  drop column if exists text_quote,
  drop column if exists text_prefix,
  drop column if exists text_suffix,
  drop column if exists text_start,
  drop column if exists text_end,
  drop column if exists anchor_version;

alter table if exists public.essays
  drop constraint if exists essays_status_ck;


