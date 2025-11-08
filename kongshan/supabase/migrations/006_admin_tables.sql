-- =====================================================
-- 空山管理員後台系統
-- 006_admin_tables.sql
-- =====================================================

-- =====================================================
-- 1. 管理員權限表（admins）
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- 啟用 RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS 策略：僅管理員可查看
DROP POLICY IF EXISTS "管理員表-僅管理員可查看" ON admins;
CREATE POLICY "管理員表-僅管理員可查看"
ON admins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- RLS 策略：僅超級管理員可插入
DROP POLICY IF EXISTS "管理員表-僅超級管理員可新增" ON admins;
CREATE POLICY "管理員表-僅超級管理員可新增"
ON admins FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- RLS 策略：僅超級管理員可更新
DROP POLICY IF EXISTS "管理員表-僅超級管理員可更新" ON admins;
CREATE POLICY "管理員表-僅超級管理員可更新"
ON admins FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- RLS 策略：僅超級管理員可刪除
DROP POLICY IF EXISTS "管理員表-僅超級管理員可刪除" ON admins;
CREATE POLICY "管理員表-僅超級管理員可刪除"
ON admins FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- =====================================================
-- 2. 操作日誌表（admin_logs）
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'review_recording', 'delete_poem', 'delete_sound', 'delete_user', 'promote_admin', 'revoke_admin', etc.
  target_type TEXT NOT NULL, -- 'recording', 'poem', 'sound_effect', 'user', 'admin', etc.
  target_id UUID, -- 目標記錄的 ID
  details JSONB, -- 操作詳情（JSON 格式）
  ip_address TEXT, -- IP 地址（從請求頭獲取）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_type ON admin_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 啟用 RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：僅管理員可查看
DROP POLICY IF EXISTS "操作日誌-僅管理員可查看" ON admin_logs;
CREATE POLICY "操作日誌-僅管理員可查看"
ON admin_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- RLS 策略：僅管理員可插入（記錄操作）
DROP POLICY IF EXISTS "操作日誌-僅管理員可插入" ON admin_logs;
CREATE POLICY "操作日誌-僅管理員可插入"
ON admin_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 3. 通知表（notifications）
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'review_result', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- 相關記錄的 ID（如 recording_id）
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- 啟用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用戶只能查看自己的通知
DROP POLICY IF EXISTS "通知-用戶查看自己的通知" ON notifications;
CREATE POLICY "通知-用戶查看自己的通知"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- RLS 策略：系統和管理員可以插入通知
DROP POLICY IF EXISTS "通知-系統和管理員可插入" ON notifications;
CREATE POLICY "通知-系統和管理員可插入"
ON notifications FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  )
);

-- RLS 策略：用戶可以更新自己的通知（標記為已讀）
DROP POLICY IF EXISTS "通知-用戶更新自己的通知" ON notifications;
CREATE POLICY "通知-用戶更新自己的通知"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. 擴展 recordings 表添加審核相關字段
-- =====================================================
-- 檢查並添加 reviewed_by 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE recordings ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 檢查並添加 reviewed_at 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE recordings ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 檢查並添加 rejection_reason 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE recordings ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- 檢查並添加 review_notes 字段（備註）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE recordings ADD COLUMN review_notes TEXT;
  END IF;
END $$;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_recordings_reviewed_by ON recordings(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_recordings_reviewed_at ON recordings(reviewed_at);

-- =====================================================
-- 5. 初始化超級管理員
-- =====================================================
-- 注意：此部分需要在 Supabase Dashboard 的 SQL Editor 中手動執行
-- 因為需要先查詢用戶 ID

-- 將 gnoluy@gmail.com 和 ylzhang@isf.edu.hk 設為超級管理員
-- 如果找不到用戶 ID，則記錄註釋說明該賬戶待啟用後手動添加
DO $$
DECLARE
  gnoluy_user_id UUID;
  ylzhang_user_id UUID;
BEGIN
  -- 查找 gnoluy@gmail.com 的用戶 ID
  SELECT user_id INTO gnoluy_user_id
  FROM travelers
  WHERE email = 'gnoluy@gmail.com'
  LIMIT 1;

  -- 如果找不到，嘗試從 auth.users 查找
  IF gnoluy_user_id IS NULL THEN
    SELECT id INTO gnoluy_user_id
    FROM auth.users
    WHERE email = 'gnoluy@gmail.com'
    LIMIT 1;
  END IF;

  -- 如果找到，插入為超級管理員
  IF gnoluy_user_id IS NOT NULL THEN
    INSERT INTO admins (user_id, role, created_by)
    VALUES (gnoluy_user_id, 'super_admin', gnoluy_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 查找 ylzhang@isf.edu.hk 的用戶 ID
  SELECT user_id INTO ylzhang_user_id
  FROM travelers
  WHERE email = 'ylzhang@isf.edu.hk'
  LIMIT 1;

  -- 如果找不到，嘗試從 auth.users 查找
  IF ylzhang_user_id IS NULL THEN
    SELECT id INTO ylzhang_user_id
    FROM auth.users
    WHERE email = 'ylzhang@isf.edu.hk'
    LIMIT 1;
  END IF;

  -- 如果找到，插入為超級管理員
  IF ylzhang_user_id IS NOT NULL THEN
    INSERT INTO admins (user_id, role, created_by)
    VALUES (ylzhang_user_id, 'super_admin', ylzhang_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 結束
-- =====================================================

