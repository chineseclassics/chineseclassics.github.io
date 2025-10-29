-- 允許學生也可新增批註：增加 student_id，放寬 teacher_id 非必填；更新 RPC 以依使用者角色寫入

begin;

-- 1) 新增 student_id，放寬 teacher_id 限制
alter table public.annotations
  add column if not exists student_id uuid references public.users(id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'annotations' and column_name = 'teacher_id'
  ) then
    -- 將 teacher_id 改為可為 NULL
    alter table public.annotations alter column teacher_id drop not null;
  end if;
end $$;

-- 2) 更新 create_annotation_pm：依 users.role 填入 teacher_id 或 student_id
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
  if v_role is null then
    -- 未找到用戶角色，默認作學生
    v_role := 'student';
  end if;

  insert into public.annotations(
    essay_id, teacher_id, student_id, content,
    highlight_start, highlight_end,
    text_start, text_end, text_quote, text_prefix, text_suffix
  ) values (
    p_essay_id,
    case when v_role = 'teacher' then auth.uid() else null end,
    case when v_role = 'teacher' then null else auth.uid() end,
    p_content,
    p_text_start, p_text_end,
    p_text_start, p_text_end, p_text_quote, p_text_prefix, p_text_suffix
  ) returning id into v_id;
  return v_id;
end;
$$;

-- 3) 補充 get_essay_annotations_pm 返回內容和時間，便於右側卡片顯示
drop function if exists public.get_essay_annotations_pm(uuid);
create function public.get_essay_annotations_pm(
  p_essay_id uuid
) returns table (
  id uuid,
  text_start integer,
  text_end integer,
  text_quote text,
  text_prefix text,
  text_suffix text,
  content text,
  created_at timestamptz
) language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select a.id, a.text_start, a.text_end, a.text_quote, a.text_prefix, a.text_suffix, a.content, a.created_at
  from public.annotations a
  where a.essay_id = p_essay_id
  order by a.text_start asc nulls last, a.created_at asc nulls last;
end;
$$;

commit;


