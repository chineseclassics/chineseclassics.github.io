-- 2025-10-31
-- 調整 PM 批註 RPC：
-- 1) create_annotation_pm 依使用者角色（users.role）自動寫入 teacher_id 或 student_id
-- 2) update_annotation_pm 允許作者（老師或學生）更新
-- 3) delete_annotation_pm 允許作者（老師或學生）刪除

begin;

-- 1) 依角色寫入 teacher_id / student_id
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
  v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  insert into public.annotations(
    essay_id, teacher_id, student_id, content,
    highlight_start, highlight_end,
    text_start, text_end, text_quote, text_prefix, text_suffix
  ) values (
    p_essay_id,
    case when v_role = 'teacher' then auth.uid() else null end,
    case when v_role = 'student' then auth.uid() else null end,
    p_content,
    p_text_start, p_text_end,
    p_text_start, p_text_end, p_text_quote, p_text_prefix, p_text_suffix
  ) returning id into v_id;
  return v_id;
end;
$$;

-- 2) 作者可更新（老師或學生）
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
    and (teacher_id = auth.uid() or student_id = auth.uid());
end;
$$;

-- 3) 作者可刪除（老師或學生）
create or replace function public.delete_annotation_pm(
  p_annotation_id uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.annotations
  where id = p_annotation_id
    and (teacher_id = auth.uid() or student_id = auth.uid());
end;
$$;

commit;
