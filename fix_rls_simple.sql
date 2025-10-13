-- =====================================================
-- 詩詞組句遠程對戰 RLS 策略快速修復
-- 目的: 允許匿名用戶使用遠程對戰功能
-- =====================================================

-- 1. 确认匿名认证已启用（查看结果）
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE is_anonymous = true 
            LIMIT 1
        ) THEN '✅ 匿名认证已启用'
        ELSE '❌ 匿名认证未启用 - 请在 Authentication > Providers 中启用'
    END as status;

-- 2. 临时禁用 RLS（用于测试）
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_events DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS 已临时禁用，请测试建立房间' as status;

-- 注意：这是临时方案，测试成功后需要重新启用 RLS 并配置正确的策略

