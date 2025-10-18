-- Migration: 创建防作弊系统相关表
-- Created: 2025-10-19
-- Description: 创建用于记录学生写作行为的表（粘贴事件、打字模式、写作会话）

-- ==================== 粘贴事件表 ====================

CREATE TABLE IF NOT EXISTS public.paste_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,             -- 写作会话 ID
    timestamp TIMESTAMPTZ NOT NULL,       -- 粘贴时间
    content_length INTEGER NOT NULL,      -- 粘贴内容长度
    content_preview TEXT,                 -- 内容预览（前 100 字符）
    target_element TEXT,                  -- 粘贴目标元素 ID
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_paste_events_user_id 
ON public.paste_events(user_id);

CREATE INDEX IF NOT EXISTS idx_paste_events_session_id 
ON public.paste_events(session_id);

CREATE INDEX IF NOT EXISTS idx_paste_events_timestamp 
ON public.paste_events(timestamp DESC);

-- 启用 RLS
ALTER TABLE public.paste_events ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以插入自己的粘贴记录
CREATE POLICY "Users can insert own paste events"
ON public.paste_events
FOR INSERT
TO authenticated, anon
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS 策略：用户可以查看自己的记录
CREATE POLICY "Users can view own paste events"
ON public.paste_events
FOR SELECT
TO authenticated, anon
USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS 策略：老师可以查看学生的记录（通过班级关联）
CREATE POLICY "Teachers can view students paste events"
ON public.paste_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
    )
);

-- 添加注释
COMMENT ON TABLE public.paste_events IS '粘贴事件记录表（防作弊系统）';
COMMENT ON COLUMN public.paste_events.session_id IS '写作会话标识符';
COMMENT ON COLUMN public.paste_events.content_length IS '粘贴内容的字符数';
COMMENT ON COLUMN public.paste_events.content_preview IS '粘贴内容预览（最多 100 字符）';
COMMENT ON COLUMN public.paste_events.target_element IS '粘贴目标编辑器的元素 ID';

-- ==================== 打字模式表 ====================

CREATE TABLE IF NOT EXISTS public.typing_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,             -- 写作会话 ID
    timestamp TIMESTAMPTZ NOT NULL,       -- 打字时间
    char_count INTEGER NOT NULL,          -- 字符数量
    duration_ms INTEGER NOT NULL,         -- 持续时间（毫秒）
    speed_cpm INTEGER NOT NULL,           -- 打字速度（字符/分钟）
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_typing_patterns_user_id 
ON public.typing_patterns(user_id);

CREATE INDEX IF NOT EXISTS idx_typing_patterns_session_id 
ON public.typing_patterns(session_id);

CREATE INDEX IF NOT EXISTS idx_typing_patterns_timestamp 
ON public.typing_patterns(timestamp DESC);

-- 启用 RLS
ALTER TABLE public.typing_patterns ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以插入自己的打字记录
CREATE POLICY "Users can insert own typing patterns"
ON public.typing_patterns
FOR INSERT
TO authenticated, anon
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS 策略：用户可以查看自己的记录
CREATE POLICY "Users can view own typing patterns"
ON public.typing_patterns
FOR SELECT
TO authenticated, anon
USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS 策略：老师可以查看学生的记录
CREATE POLICY "Teachers can view students typing patterns"
ON public.typing_patterns
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
    )
);

-- 添加注释
COMMENT ON TABLE public.typing_patterns IS '打字模式记录表（防作弊系统）';
COMMENT ON COLUMN public.typing_patterns.char_count IS '打字爆发中的字符数';
COMMENT ON COLUMN public.typing_patterns.duration_ms IS '打字爆发的持续时间（毫秒）';
COMMENT ON COLUMN public.typing_patterns.speed_cpm IS '打字速度（字符/分钟）';

-- ==================== 写作会话表（可选）====================

CREATE TABLE IF NOT EXISTS public.writing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,      -- 会话标识符
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,      -- 会话开始时间
    end_time TIMESTAMPTZ,                 -- 会话结束时间
    paste_count INTEGER DEFAULT 0,        -- 粘贴次数
    total_chars_typed INTEGER DEFAULT 0,  -- 总打字字符数
    total_chars_pasted INTEGER DEFAULT 0, -- 总粘贴字符数
    avg_typing_speed_cpm INTEGER,         -- 平均打字速度
    pasted_ratio INTEGER,                 -- 粘贴内容占比（%）
    risk_level TEXT,                      -- 风险等级（low/medium/high）
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_id 
ON public.writing_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_writing_sessions_essay_id 
ON public.writing_sessions(essay_id);

CREATE INDEX IF NOT EXISTS idx_writing_sessions_session_id 
ON public.writing_sessions(session_id);

-- 启用 RLS
ALTER TABLE public.writing_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以创建和更新自己的会话
CREATE POLICY "Users can manage own sessions"
ON public.writing_sessions
FOR ALL
TO authenticated, anon
USING (user_id = auth.uid() OR auth.uid() IS NULL)
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS 策略：老师可以查看学生的会话
CREATE POLICY "Teachers can view students sessions"
ON public.writing_sessions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
    )
);

-- 添加注释
COMMENT ON TABLE public.writing_sessions IS '写作会话记录表（防作弊系统）';
COMMENT ON COLUMN public.writing_sessions.session_id IS '唯一的会话标识符';
COMMENT ON COLUMN public.writing_sessions.paste_count IS '该会话中的粘贴次数';
COMMENT ON COLUMN public.writing_sessions.total_chars_typed IS '该会话中打字的总字符数';
COMMENT ON COLUMN public.writing_sessions.total_chars_pasted IS '该会话中粘贴的总字符数';
COMMENT ON COLUMN public.writing_sessions.pasted_ratio IS '粘贴内容占总内容的百分比';
COMMENT ON COLUMN public.writing_sessions.risk_level IS '诚信风险等级（low/medium/high）';

