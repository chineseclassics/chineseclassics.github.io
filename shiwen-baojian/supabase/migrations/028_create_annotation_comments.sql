-- 批注評論功能遷移文件
-- 此文件僅作為參考備份，實際功能已通過 Supabase MCP 直接實現

-- 批注評論表（已存在）
CREATE TABLE IF NOT EXISTS annotation_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    comment_type TEXT DEFAULT 'reply' CHECK (comment_type IN ('reply', 'question', 'clarification')),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加評論 RPC 函數（已存在）
CREATE OR REPLACE FUNCTION add_annotation_comment(
    p_annotation_id UUID,
    p_content TEXT,
    p_comment_type TEXT DEFAULT 'reply'
) RETURNS UUID AS $$
DECLARE
    v_comment_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- 驗證批注存在
    IF NOT EXISTS (SELECT 1 FROM annotations WHERE id = p_annotation_id) THEN
        RAISE EXCEPTION '批注不存在';
    END IF;
    
    -- 創建評論
    INSERT INTO annotation_comments (
        annotation_id,
        user_id,
        content,
        comment_type
    ) VALUES (
        p_annotation_id,
        v_user_id,
        p_content,
        p_comment_type
    ) RETURNING id INTO v_comment_id;
    
    RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 獲取評論 RPC 函數（已存在）
CREATE OR REPLACE FUNCTION get_annotation_comments(p_annotation_id UUID)
RETURNS TABLE (
    comment_id UUID,
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    content TEXT,
    comment_type TEXT,
    is_resolved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id as comment_id,
        ac.user_id,
        u.display_name as user_name,
        u.role as user_role,
        ac.content,
        ac.comment_type,
        ac.is_resolved,
        ac.created_at,
        ac.updated_at
    FROM annotation_comments ac
    JOIN users u ON ac.user_id = u.id
    WHERE ac.annotation_id = p_annotation_id
    ORDER BY ac.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 策略（已存在）
ALTER TABLE annotation_comments ENABLE ROW LEVEL SECURITY;

-- 允許認證用戶查看評論
CREATE POLICY "Users can view annotation comments" ON annotation_comments
    FOR SELECT USING (auth.role() = 'authenticated');

-- 允許認證用戶創建評論
CREATE POLICY "Users can create annotation comments" ON annotation_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允許用戶更新自己的評論
CREATE POLICY "Users can update own comments" ON annotation_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- 允許用戶刪除自己的評論
CREATE POLICY "Users can delete own comments" ON annotation_comments
    FOR DELETE USING (auth.uid() = user_id);
