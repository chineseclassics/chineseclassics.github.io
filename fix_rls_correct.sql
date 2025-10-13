-- =====================================================
-- 詩詞組句遠程對戰 RLS 策略正確配置
-- 目的: 安全地允許匿名用戶使用遠程對戰功能
-- =====================================================

-- ===== 1. 清除所有現有策略 =====
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 删除 rooms 表的所有策略
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'rooms') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON rooms';
    END LOOP;
    
    -- 删除 room_players 表的所有策略
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'room_players') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON room_players';
    END LOOP;
    
    -- 删除 room_events 表的所有策略
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'room_events') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON room_events';
    END LOOP;
END $$;

-- ===== 2. 创建新策略 =====

-- rooms 表
CREATE POLICY "allow_auth_insert_rooms" ON rooms
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "allow_auth_select_rooms" ON rooms
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "allow_host_update_rooms" ON rooms
    FOR UPDATE TO authenticated
    USING (host_id = auth.uid());

CREATE POLICY "allow_host_delete_rooms" ON rooms
    FOR DELETE TO authenticated
    USING (host_id = auth.uid());

-- room_players 表
CREATE POLICY "allow_auth_insert_players" ON room_players
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "allow_auth_select_players" ON room_players
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "allow_user_update_players" ON room_players
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "allow_user_delete_players" ON room_players
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- room_events 表
CREATE POLICY "allow_auth_insert_events" ON room_events
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "allow_auth_select_events" ON room_events
    FOR SELECT TO authenticated
    USING (true);

-- ===== 3. 启用 RLS =====
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_events ENABLE ROW LEVEL SECURITY;

-- ===== 4. 验证配置 =====
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('rooms', 'room_players', 'room_events')
ORDER BY tablename, cmd, policyname;

SELECT '✅ RLS 策略已正确配置！' as status;

