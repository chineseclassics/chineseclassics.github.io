-- 創建 get_essay_annotations RPC 函數
-- 用於一次性獲取整篇文章的所有批註

CREATE OR REPLACE FUNCTION get_essay_annotations(p_essay_id UUID)
RETURNS TABLE (
  id UUID,
  paragraph_id UUID,
  paragraph_order_index INT,
  content TEXT,
  highlight_start INT,
  highlight_end INT,
  anchor_text TEXT,
  annotation_type TEXT,
  priority TEXT,
  is_private BOOLEAN,
  is_orphaned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.paragraph_id,
    p.order_index AS paragraph_order_index,
    a.content,
    a.highlight_start,
    a.highlight_end,
    a.anchor_text,
    a.annotation_type,
    a.priority,
    a.is_private,
    a.is_orphaned,
    a.created_at,
    a.updated_at
  FROM annotations a
  JOIN paragraphs p ON a.paragraph_id = p.id
  WHERE p.essay_id = p_essay_id
  ORDER BY p.order_index, a.highlight_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
