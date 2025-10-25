-- 先移除舊版函數，避免返回型別不一致造成錯誤
DROP FUNCTION IF EXISTS public.get_paragraph_annotations(UUID);

CREATE FUNCTION public.get_paragraph_annotations(
    p_paragraph_id UUID
) RETURNS SETOF public.annotations
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT a.*
  FROM public.annotations AS a
  WHERE a.paragraph_id = p_paragraph_id
  ORDER BY a.highlight_start NULLS LAST, a.created_at ASC;
$function$;

COMMENT ON FUNCTION public.get_paragraph_annotations(UUID)
IS '傳回指定段落的所有批註，依高亮起點與建立時間排序';
