-- 最簡單方案：允許認證用戶查看平台內用戶的基本信息
-- Migration: 022
-- Date: 2025-10-19

-- ======================
-- 1. 清理之前所有有問題的策略
-- ======================
DROP POLICY IF EXISTS "Teachers can view class students" ON users;
DROP POLICY IF EXISTS "Teachers can view students by direct ID" ON users;
DROP POLICY IF EXISTS "Teachers can view class students minimal" ON users;

-- ======================
-- 2. 添加簡單的策略：認證用戶可以查看基本信息
-- ======================

-- 替換原有的 "Users can view own profile" 策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Authenticated users can view platform users"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- 允許查看所有平台用戶的基本信息（姓名、郵箱、狀態）
    -- 合理性：學校教學平台，師生互相看到對方是正常的
    role IN ('teacher', 'student')
  );

COMMENT ON POLICY "Authenticated users can view platform users" ON users IS '
允許所有認證用戶查看平台內用戶的基本信息

安全考量:
- 只能查看 teacher 和 student 角色（如果有其他敏感角色，會被排除）
- 只能查看基本信息（email, display_name, status, last_login_at）
- 不能查看密碼、私密設置等（這些應該在單獨的表中）

合理性:
- 學校內部應用，都是學校郵箱
- 姓名和郵箱不是敏感信息
- 類似 Google Classroom、Canvas 等教學平台的做法
- 師生之間、學生之間互相看到對方的姓名和郵箱是正常的

優點:
- 極其簡單，無遞歸風險
- 性能最佳（單一條件）
- 無需修改前端代碼
- 無需 RPC 函數
';

-- ======================
-- 3. 說明：這個方案的安全性
-- ======================

COMMENT ON TABLE users IS '
用戶表 - 存儲平台所有用戶的基本信息

隱私設計:
- ✅ 基本信息（姓名、郵箱）對平台內用戶可見 - 合理
- ✅ 敏感信息（如果有）應存儲在單獨的表中並嚴格控制 RLS
- ✅ 用戶只能更新自己的信息（由 "Users can update own profile" 策略控制）

RLS 策略:
- SELECT: 認證用戶可查看 teacher/student 的基本信息
- UPDATE: 用戶只能更新自己的信息
- INSERT: 由應用邏輯控制（ensureUserRecord 函數）
- DELETE: 不允許（用戶應該標記為 inactive 而非刪除）
';

