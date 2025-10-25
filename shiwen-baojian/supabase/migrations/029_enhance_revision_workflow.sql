-- 論文修訂流程增強遷移文件
-- 此文件僅作為參考備份，實際功能已通過 Supabase MCP 直接實現

-- 1. 添加批注錨定字段（已實現）
ALTER TABLE annotations 
ADD COLUMN anchor_text TEXT,
ADD COLUMN is_orphaned BOOLEAN DEFAULT FALSE,
ADD COLUMN repositioned_at TIMESTAMP WITH TIME ZONE;

-- 2. 更新 create_annotation 函數支持錨定文本（已實現）
CREATE OR REPLACE FUNCTION create_annotation(
    p_paragraph_id UUID,
    p_content TEXT,
    p_highlight_start INTEGER,
    p_highlight_end INTEGER,
    p_annotation_type TEXT DEFAULT 'comment',
    p_priority TEXT DEFAULT 'normal',
    p_is_private BOOLEAN DEFAULT FALSE,
    p_anchor_text TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_annotation_id UUID;
    v_teacher_id UUID;
BEGIN
    v_teacher_id := auth.uid();
    
    -- 創建批注
    INSERT INTO annotations (
        paragraph_id,
        teacher_id,
        content,
        highlight_start,
        highlight_end,
        annotation_type,
        priority,
        is_private,
        anchor_text
    ) VALUES (
        p_paragraph_id,
        v_teacher_id,
        p_content,
        p_highlight_start,
        p_highlight_end,
        p_annotation_type,
        p_priority,
        p_is_private,
        p_anchor_text
    ) RETURNING id INTO v_annotation_id;
    
    RETURN v_annotation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 創建批注重新定位 RPC 函數（已實現）
CREATE OR REPLACE FUNCTION reposition_annotation(
    annotation_id UUID,
    new_anchor_text TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_annotation RECORD;
    v_new_start INTEGER;
    v_new_end INTEGER;
BEGIN
    -- 獲取批注信息
    SELECT * INTO v_annotation FROM annotations WHERE id = annotation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '批注不存在';
    END IF;
    
    -- 在段落內容中查找新的錨定文本
    SELECT 
        COALESCE(
            (SELECT position FROM (
                SELECT position, substring(content::text, position, length(new_anchor_text)) as match_text
                FROM generate_series(1, length(content::text) - length(new_anchor_text) + 1) as position
                WHERE substring(content::text, position, length(new_anchor_text)) = new_anchor_text
                ORDER BY abs(position - v_annotation.highlight_start)
                LIMIT 1
            ) subq), 
            v_annotation.highlight_start
        ) INTO v_new_start;
    
    v_new_end := v_new_start + length(new_anchor_text);
    
    -- 更新批注位置
    UPDATE annotations 
    SET 
        highlight_start = v_new_start,
        highlight_end = v_new_end,
        anchor_text = new_anchor_text,
        is_orphaned = FALSE,
        repositioned_at = NOW()
    WHERE id = annotation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 前端實現的功能
-- - 移除撤回邏輯中的批改限制（已實現）
-- - 實現批注錨定增強（已實現）
-- - 實現批注重新定位算法（已實現）
-- - 實現孤立批注處理（已實現）
-- - 實現修訂歷史追蹤（已實現）

-- 5. 完整的修訂流程
-- 學生提交論文 → 狀態：submitted
-- 老師添加批注 → 論文仍為 submitted，學生可查看批注
-- 學生撤回修改 → 狀態：draft，批注保留
-- 學生基於批注修改 → 批注智能重新定位
-- 學生重新提交 → 狀態：submitted，覆蓋原版本
-- 老師最終批改 → 狀態：graded，鎖定論文
