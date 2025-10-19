-- 时文宝鉴 - 待加入学生表
-- Migration: 017
-- Description: 创建 pending_students 表，存储老师预先添加的学生邮箱，等待学生首次登录激活

-- ======================
-- 1. 创建待加入学生表
-- ======================
CREATE TABLE IF NOT EXISTS pending_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：一个邮箱在一个班级中只能被添加一次
  UNIQUE(class_id, email)
);

-- 索引
CREATE INDEX idx_pending_students_class ON pending_students(class_id);
CREATE INDEX idx_pending_students_email ON pending_students(email);

COMMENT ON TABLE pending_students IS '
待加入学生表 - 存储老师预先添加的学生邮箱

工作流程:
1. 老师输入学生邮箱列表
2. 系统验证邮箱格式（*@student.isf.edu.hk）
3. 保存到 pending_students 表
4. 学生首次 Google 登录时:
   - 系统通过邮箱匹配 pending_students 记录
   - 创建 users 记录（使用 Auth UUID）
   - 添加到 class_members
   - 删除 pending_students 记录（已激活）
   - 学生自动看到班级和任务
';

-- ======================
-- 2. RLS 策略
-- ======================
ALTER TABLE pending_students ENABLE ROW LEVEL SECURITY;

-- 老师可以管理自己班级的待加入学生
CREATE POLICY "Teachers can manage pending students for their classes"
  ON pending_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = pending_students.class_id
      AND teacher_id = auth.uid()
    )
  );

COMMENT ON POLICY "Teachers can manage pending students for their classes" ON pending_students IS
'老师可以查看、添加、删除自己班级的待加入学生邮箱';

-- ======================
-- 3. 创建自动激活函数（学生登录时调用）
-- ======================
CREATE OR REPLACE FUNCTION activate_pending_student(student_email TEXT, student_auth_id UUID)
RETURNS TABLE (
  activated BOOLEAN,
  class_ids UUID[],
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_records RECORD;
  activated_classes UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 查找该邮箱的所有待加入记录
  FOR pending_records IN
    SELECT class_id, added_by
    FROM pending_students
    WHERE email = student_email
  LOOP
    -- 添加到 class_members（如果还没有）
    INSERT INTO class_members (class_id, student_id, added_by)
    VALUES (pending_records.class_id, student_auth_id, pending_records.added_by)
    ON CONFLICT (class_id, student_id) DO NOTHING;
    
    -- 记录激活的班级
    activated_classes := array_append(activated_classes, pending_records.class_id);
    
    -- 删除 pending 记录
    DELETE FROM pending_students
    WHERE email = student_email AND class_id = pending_records.class_id;
  END LOOP;
  
  -- 返回结果
  IF array_length(activated_classes, 1) > 0 THEN
    RETURN QUERY SELECT 
      true AS activated,
      activated_classes AS class_ids,
      '已自动加入 ' || array_length(activated_classes, 1)::TEXT || ' 个班级' AS display_name;
  ELSE
    RETURN QUERY SELECT 
      false AS activated,
      ARRAY[]::UUID[] AS class_ids,
      '无待加入班级' AS display_name;
  END IF;
END;
$$;

COMMENT ON FUNCTION activate_pending_student IS '
学生首次登录时调用此函数，自动激活待加入记录

参数:
- student_email: 学生的 Google 邮箱
- student_auth_id: Supabase Auth 生成的用户 ID

返回:
- activated: 是否激活了待加入记录
- class_ids: 自动加入的班级 ID 列表
- display_name: 提示信息
';

-- ======================
-- 4. 使用说明
-- ======================
COMMENT ON TABLE pending_students IS '
待加入学生表 - 实现"老师预先添加邮箱，学生登录自动激活"的功能

完整流程:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
老师端操作:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 老师在"批量添加学生"中输入邮箱列表
2. 系统验证邮箱格式（*@student.isf.edu.hk）
3. 将有效邮箱保存到 pending_students 表
4. 老师端学生列表显示"待激活"状态（灰色图标）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
学生端操作（首次登录）:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 学生用 Google 账号登录（如 3015174@student.isf.edu.hk）
2. 系统调用 activate_pending_student(email, auth_id)
3. 函数自动:
   - 查找该邮箱的所有 pending_students 记录
   - 添加到对应班级的 class_members
   - 删除 pending_students 记录
4. 学生立即看到班级和任务
5. 老师端学生列表自动更新为"已激活"（绿色图标）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
姓名更新:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 老师看到的初始姓名：学生-3015174（临时）
- 学生登录后：Yulong ZHANG（从 Google 获取）
- 老师端自动更新显示真实姓名
';

