-- PM 批註 CRUD：更新與刪除

begin;

-- 更新批註內容與（可選）文字錨點
create or replace function public.update_annotation_pm(
  p_annotation_id uuid,
  p_content text default null,
  p_text_start integer default null,
  p_text_end integer default null,
  p_text_quote text default null,
  p_text_prefix text default null,
  p_text_suffix text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.annotations
  set
    content = coalesce(p_content, content),
    text_start = coalesce(p_text_start, text_start),
    text_end = coalesce(p_text_end, text_end),
    text_quote = coalesce(p_text_quote, text_quote),
    text_prefix = coalesce(p_text_prefix, text_prefix),
    text_suffix = coalesce(p_text_suffix, text_suffix)
  where id = p_annotation_id
    and teacher_id = auth.uid();
end;
$$;

-- 刪除批註
create or replace function public.delete_annotation_pm(
  p_annotation_id uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.annotations
  where id = p_annotation_id
    and teacher_id = auth.uid();
end;
$$;

commit;


