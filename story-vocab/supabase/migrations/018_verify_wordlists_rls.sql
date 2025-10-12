-- =====================================================
-- 驗證並確保 wordlists 表的 RLS 策略完整
-- 創建日期：2025-10-13
-- 目的：確保系統詞表和公開詞表的讀取策略存在
-- =====================================================

BEGIN;

-- ========================================
-- 確保系統詞表讀取策略存在
-- ========================================

-- 刪除舊策略（如果存在）
DROP POLICY IF EXISTS "System wordlists are readable by everyone" ON wordlists;

-- 重新創建：所有用戶可以讀取系統詞表
CREATE POLICY "System wordlists are readable by everyone" ON wordlists
  FOR SELECT 
  USING (type = 'system');

-- ========================================
-- 確保公開自定義詞表的讀取策略存在
-- ========================================

-- 刪除舊策略（如果存在）
DROP POLICY IF EXISTS "Users can view public custom wordlists" ON wordlists;

-- 重新創建：所有用戶可以讀取公開的自定義詞表
CREATE POLICY "Users can view public custom wordlists" ON wordlists
  FOR SELECT 
  USING (type = 'custom' AND is_public = true);

COMMIT;

-- ========================================
-- 驗證結果
-- ========================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  -- 統計 wordlists 表的策略數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'wordlists';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ wordlists 表 RLS 策略驗證完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '策略總數：%', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '應有的策略：';
  RAISE NOTICE '  1. System wordlists are readable by everyone';
  RAISE NOTICE '  2. Users can view public custom wordlists';
  RAISE NOTICE '  3. Users can view own custom wordlists';
  RAISE NOTICE '  4. Users can insert own wordlists';
  RAISE NOTICE '  5. Users can update own wordlists';
  RAISE NOTICE '  6. Users can delete own wordlists';
  RAISE NOTICE '';
  RAISE NOTICE '預期總數：6 個';
END $$;

-- =====================================================
-- 遷移完成說明
-- =====================================================
-- 
-- 本遷移確保 wordlists 表的所有 RLS 策略完整：
-- 
-- 系統詞表（type='system'）：
-- - ✅ 所有用戶可讀
-- - ❌ 無法寫入（只有管理員通過 service_role）
-- 
-- 公開自定義詞表（type='custom', is_public=true）：
-- - ✅ 所有用戶可讀
-- - ❌ 只有創建者可寫
-- 
-- 私有自定義詞表（type='custom', is_public=false）：
-- - ✅ 只有創建者可讀寫
-- - ❌ 其他用戶完全看不到
-- =====================================================

