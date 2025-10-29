-- PM 模式批註支持：為 annotations 增加 essay_id，並新增 RPC 以 PM 文字錨點創建/查詢

begin;

-- 1) 增加 essay_id 欄位（允許為 NULL 以兼容舊資料）
alter table public.annotations
add column if not exists essay_id uuid references public.essays(id);

-- 2) 回填舊資料（透過 paragraphs 關聯）
update public.annotations a
set essay_id = p.essay_id
from public.paragraphs p
where a.paragraph_id = p.id and a.essay_id is null;

-- 3) 以 PM 文字錨點創建批註（SECURITY DEFINER 以繞過 RLS）
create or replace function public.create_annotation_pm(
  p_essay_id uuid,
  p_content text,
  p_text_start integer,
  p_text_end integer,
  p_text_quote text,
  p_text_prefix text,
  p_text_suffix text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.annotations(
    essay_id, teacher_id, content,
    highlight_start, highlight_end,  -- 向下兼容舊欄位
    text_start, text_end, text_quote, text_prefix, text_suffix
  ) values (
    p_essay_id, auth.uid(), p_content,
    p_text_start, p_text_end,
    p_text_start, p_text_end, p_text_quote, p_text_prefix, p_text_suffix
  ) returning id into v_id;
  return v_id;
end;
$$;

-- 4) 查詢某篇 essay 的 PM 批註（SECURITY DEFINER）
create or replace function public.get_essay_annotations_pm(
  p_essay_id uuid
) returns table (
  id uuid,
  text_start integer,
  text_end integer,
  text_quote text,
  text_prefix text,
  text_suffix text
) language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select a.id, a.text_start, a.text_end, a.text_quote, a.text_prefix, a.text_suffix
  from public.annotations a
  where a.essay_id = p_essay_id
  order by a.created_at asc nulls last;
end;
$$;

commit;


