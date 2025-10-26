-- 增強批注錨定系統
-- 添加文本片段錨定和上下文信息

-- 添加新的錨定字段到 annotations 表
ALTER TABLE annotations 
ADD COLUMN IF NOT EXISTS anchor_text TEXT,
ADD COLUMN IF NOT EXISTS anchor_context JSONB,
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS repositioned_at TIMESTAMP WITH TIME ZONE;

-- 添加索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_annotations_anchor_text ON annotations(anchor_text);
CREATE INDEX IF NOT EXISTS idx_annotations_orphaned ON annotations(is_orphaned);
CREATE INDEX IF NOT EXISTS idx_annotations_paragraph_id ON annotations(paragraph_id);

-- 創建批注重新定位函數
CREATE OR REPLACE FUNCTION reposition_annotations_after_text_change()
RETURNS TRIGGER AS $$
DECLARE
    annotation_record RECORD;
    new_start INTEGER;
    new_end INTEGER;
    text_found BOOLEAN;
BEGIN
    -- 當段落內容更新時，重新定位所有相關批注
    IF TG_OP = 'UPDATE' AND OLD.content != NEW.content THEN
        -- 獲取該段落的所有批注
        FOR annotation_record IN 
            SELECT * FROM annotations 
            WHERE paragraph_id = NEW.id 
            AND is_orphaned = FALSE
        LOOP
            -- 嘗試在更新後的文本中找到錨定文本
            IF annotation_record.anchor_text IS NOT NULL THEN
                -- 使用文本搜索重新定位
                SELECT 
                    position(annotation_record.anchor_text IN NEW.content) - 1,
                    position(annotation_record.anchor_text IN NEW.content) + length(annotation_record.anchor_text) - 1
                INTO new_start, new_end;
                
                -- 如果找到文本，更新位置
                IF new_start >= 0 THEN
                    UPDATE annotations 
                    SET 
                        highlight_start = new_start,
                        highlight_end = new_end,
                        repositioned_at = NOW()
                    WHERE id = annotation_record.id;
                ELSE
                    -- 如果找不到文本，標記為孤立
                    UPDATE annotations 
                    SET 
                        is_orphaned = TRUE,
                        repositioned_at = NOW()
                    WHERE id = annotation_record.id;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_reposition_annotations ON paragraphs;
CREATE TRIGGER trigger_reposition_annotations
    AFTER UPDATE ON paragraphs
    FOR EACH ROW
    EXECUTE FUNCTION reposition_annotations_after_text_change();

-- 創建批注重新定位的 RPC 函數
CREATE OR REPLACE FUNCTION reposition_annotation(
    annotation_id UUID,
    new_anchor_text TEXT,
    new_context JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    annotation_record RECORD;
    new_start INTEGER;
    new_end INTEGER;
    paragraph_content TEXT;
BEGIN
    -- 獲取批注信息
    SELECT a.*, p.content as paragraph_content
    INTO annotation_record
    FROM annotations a
    JOIN paragraphs p ON a.paragraph_id = p.id
    WHERE a.id = annotation_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    paragraph_content := annotation_record.paragraph_content;
    
    -- 嘗試在段落中找到新的錨定文本
    SELECT 
        position(new_anchor_text IN paragraph_content) - 1,
        position(new_anchor_text IN paragraph_content) + length(new_anchor_text) - 1
    INTO new_start, new_end;
    
    -- 更新批注
    IF new_start >= 0 THEN
        UPDATE annotations 
        SET 
            anchor_text = new_anchor_text,
            anchor_context = COALESCE(new_context, anchor_context),
            highlight_start = new_start,
            highlight_end = new_end,
            is_orphaned = FALSE,
            repositioned_at = NOW()
        WHERE id = annotation_id;
        RETURN TRUE;
    ELSE
        -- 標記為孤立
        UPDATE annotations 
        SET 
            anchor_text = new_anchor_text,
            anchor_context = COALESCE(new_context, anchor_context),
            is_orphaned = TRUE,
            repositioned_at = NOW()
        WHERE id = annotation_id;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 創建獲取孤立批注的函數
CREATE OR REPLACE FUNCTION get_orphaned_annotations(paragraph_id_param UUID)
RETURNS TABLE (
    id UUID,
    content TEXT,
    anchor_text TEXT,
    anchor_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    repositioned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.content,
        a.anchor_text,
        a.anchor_context,
        a.created_at,
        a.repositioned_at
    FROM annotations a
    WHERE a.paragraph_id = paragraph_id_param 
    AND a.is_orphaned = TRUE
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 創建修訂歷史追蹤表
CREATE TABLE IF NOT EXISTS essay_revision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('withdrawn', 'resubmitted', 'content_modified')),
    previous_status TEXT,
    new_status TEXT,
    annotation_count INTEGER DEFAULT 0,
    orphaned_annotation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_essay_revision_history_essay_id ON essay_revision_history(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_revision_history_action ON essay_revision_history(action);
CREATE INDEX IF NOT EXISTS idx_essay_revision_history_created_at ON essay_revision_history(created_at);

-- 創建修訂歷史追蹤函數
CREATE OR REPLACE FUNCTION track_essay_revision()
RETURNS TRIGGER AS $$
DECLARE
    annotation_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- 計算批注統計
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_orphaned = TRUE)
    INTO annotation_count, orphaned_count
    FROM annotations a
    JOIN paragraphs p ON a.paragraph_id = p.id
    WHERE p.essay_id = NEW.id;
    
    -- 記錄修訂歷史
    IF TG_OP = 'UPDATE' THEN
        -- 狀態變化
        IF OLD.status != NEW.status THEN
            INSERT INTO essay_revision_history (
                essay_id,
                action,
                previous_status,
                new_status,
                annotation_count,
                orphaned_annotation_count,
                created_by
            ) VALUES (
                NEW.id,
                CASE 
                    WHEN NEW.status = 'draft' AND OLD.status = 'submitted' THEN 'withdrawn'
                    WHEN NEW.status = 'submitted' AND OLD.status = 'draft' THEN 'resubmitted'
                    ELSE 'content_modified'
                END,
                OLD.status,
                NEW.status,
                annotation_count,
                orphaned_count,
                NEW.student_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_track_essay_revision ON essays;
CREATE TRIGGER trigger_track_essay_revision
    AFTER UPDATE ON essays
    FOR EACH ROW
    EXECUTE FUNCTION track_essay_revision();

-- 添加 RLS 策略
ALTER TABLE essay_revision_history ENABLE ROW LEVEL SECURITY;

-- 學生可以查看自己作業的修訂歷史
CREATE POLICY "Students can view their own revision history" ON essay_revision_history
    FOR SELECT USING (created_by = auth.uid());

-- 老師可以查看自己班級學生的修訂歷史
CREATE POLICY "Teachers can view their students' revision history" ON essay_revision_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM essays e
            JOIN assignments a ON e.assignment_id = a.id
            JOIN class_memberships cm ON a.class_id = cm.class_id
            WHERE e.id = essay_revision_history.essay_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'teacher'
        )
    );

-- 更新現有批注，添加錨定信息（如果沒有）
UPDATE annotations 
SET 
    anchor_text = substring(content from 1 for 50), -- 使用內容前50字符作為錨定
    anchor_context = jsonb_build_object(
        'before', '',
        'after', '',
        'full_text', content
    )
WHERE anchor_text IS NULL;
