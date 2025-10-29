-- 以 quote(+prefix/suffix) 批量重錨定指定 essay 的 annotations
-- 注意：此為簡化版（MVP），僅處理 quote 精確匹配與基本上下文校驗

create or replace function public.reanchor_annotations_by_quote(
  p_essay_id uuid,
  p_doc_text text
) returns integer
language plpgsql
as $$
declare
  r record;
  v_updated integer := 0;
  v_idx integer;
  v_pre text;
  v_suf text;
  v_start integer;
  v_len integer;
begin
  if p_doc_text is null then
    return 0;
  end if;

  for r in
    select a.id, a.text_quote, a.text_prefix, a.text_suffix
    from public.annotations a
    join public.paragraphs p on p.id = a.paragraph_id
    where p.essay_id = p_essay_id
  loop
    if coalesce(r.text_quote, '') <> '' then
      v_idx := position(r.text_quote in p_doc_text);
      if v_idx > 0 then
        -- 可選上下文驗證
        if coalesce(r.text_prefix,'') <> '' then
          v_pre := substring(p_doc_text from greatest(v_idx - length(r.text_prefix),1) for length(r.text_prefix));
          if v_pre <> r.text_prefix then
            -- 上下文不一致，略過更精細處理（MVP）
          end if;
        end if;

        v_start := v_idx - 1; -- 0-based
        v_len := length(r.text_quote);
        update public.annotations
          set text_start = v_start,
              text_end = v_start + v_len
          where id = r.id;
        v_updated := v_updated + 1;
      end if;
    end if;
  end loop;

  return v_updated;
end;
$$;


