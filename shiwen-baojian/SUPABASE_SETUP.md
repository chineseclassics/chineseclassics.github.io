# 🗄️ Supabase 数据库设置指南

## 📋 前提条件

您需要在 Supabase Dashboard 执行迁移文件来设置数据库。

---

## 🚀 快速部署步骤

### 1. 打开 Supabase Dashboard

访问：https://supabase.com/dashboard

登录您的项目（时文宝鉴项目）

### 2. 打开 SQL Editor

在左侧菜单找到 **SQL Editor**

### 3. 执行迁移文件 008

**重要**：需要执行最新的迁移文件来支持无任务草稿保存

#### 步骤：

1. 打开文件：`shiwen-baojian/supabase/migrations/008_allow_draft_without_assignment.sql`

2. 复制整个文件内容

3. 在 Supabase SQL Editor 粘贴内容

4. 点击 **Run** 执行

#### 预期结果：

```
✅ 成功修改 essays 表（允许 assignment_id 为 NULL）
✅ 成功创建唯一索引
✅ 成功更新 RLS 策略
```

---

## 🧪 测试数据库保存功能

### 1. 清空浏览器缓存（可选）

```javascript
// 在浏览器控制台执行
localStorage.clear();
```

### 2. 重新启动应用

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/shiwen-baojian
python3 -m http.server 8080
```

### 3. 登录并测试

1. 访问 `http://localhost:8080`
2. 点击"匿名测试"登录
3. 在编辑器中输入内容
4. 等待 3 秒自动保存

### 4. 检查保存状态

#### 方法 1：查看控制台日志

打开浏览器控制台（F12），应该看到：

```
💾 初始化存儲模組...
📡 網絡狀態: 在線
💾 開始自動保存...
💾 開始保存論文到 Supabase...
✅ 創建新論文: [UUID]
✅ 保存了 X 個分論點
✅ 保存了 X 個段落
✅ 論文保存成功: [UUID]
✅ 自動保存完成（Supabase + localStorage）
```

#### 方法 2：查看 Supabase 数据库

1. 在 Supabase Dashboard 打开 **Table Editor**
2. 查看以下表：
   - `essays` - 应该有一条记录
   - `sub_arguments` - 应该有您创建的分论点
   - `paragraphs` - 应该有您创建的段落

---

## 📊 数据库表结构说明

### 1. `essays` 表（论文）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 论文 ID |
| student_id | UUID | 学生 ID |
| assignment_id | UUID | 任务 ID（测试草稿为 NULL） |
| title | TEXT | 论文标题 |
| status | TEXT | 状态（draft/submitted/graded） |
| total_word_count | INTEGER | 总字数 |

### 2. `sub_arguments` 表（分论点）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 分论点 ID |
| essay_id | UUID | 所属论文 ID |
| title | TEXT | 分论点标题 |
| order_index | INTEGER | 排序索引 |

### 3. `paragraphs` 表（段落）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 段落 ID |
| essay_id | UUID | 所属论文 ID |
| sub_argument_id | UUID | 所属分论点 ID（引言/结论为 NULL） |
| paragraph_type | TEXT | 段落类型（introduction/body/conclusion） |
| content | JSONB | 段落内容（HTML） |
| word_count | INTEGER | 字数 |
| order_index | INTEGER | 排序索引 |

### 4. `paragraph_versions` 表（版本历史）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 版本 ID |
| paragraph_id | UUID | 段落 ID |
| content | JSONB | 内容快照 |
| trigger_type | TEXT | 触发类型（auto_save/ai_feedback/...） |
| note | TEXT | 备注 |
| created_at | TIMESTAMP | 创建时间 |

---

## 🔍 查询示例

### 查询当前用户的论文

```sql
SELECT 
  e.id,
  e.title,
  e.status,
  e.total_word_count,
  e.created_at,
  e.updated_at
FROM essays e
WHERE e.student_id = auth.uid()
ORDER BY e.updated_at DESC;
```

### 查询论文的分论点

```sql
SELECT 
  sa.id,
  sa.title,
  sa.order_index
FROM sub_arguments sa
WHERE sa.essay_id = '[ESSAY_ID]'
ORDER BY sa.order_index;
```

### 查询论文的所有段落

```sql
SELECT 
  p.id,
  p.paragraph_type,
  p.content,
  p.word_count,
  p.order_index,
  sa.title as sub_argument_title
FROM paragraphs p
LEFT JOIN sub_arguments sa ON sa.id = p.sub_argument_id
WHERE p.essay_id = '[ESSAY_ID]'
ORDER BY p.order_index;
```

### 查询段落的版本历史

```sql
SELECT 
  pv.id,
  pv.trigger_type,
  pv.note,
  pv.created_at
FROM paragraph_versions pv
WHERE pv.paragraph_id = '[PARAGRAPH_ID]'
ORDER BY pv.created_at DESC;
```

---

## 🐛 故障排查

### 问题 1：保存失败 - "relation does not exist"

**原因**：迁移文件 008 未执行

**解决方案**：
1. 在 Supabase SQL Editor 执行 `008_allow_draft_without_assignment.sql`
2. 刷新页面重新测试

### 问题 2：保存失败 - "permission denied"

**原因**：RLS 策略问题

**解决方案**：
1. 检查用户是否已登录（即使是匿名登录）
2. 在 SQL Editor 执行：
   ```sql
   SELECT auth.uid();  -- 确认有用户 ID
   ```
3. 重新执行迁移文件 007 和 008

### 问题 3：只保存到 localStorage，未保存到 Supabase

**检查**：
1. 控制台是否有错误信息
2. 网络是否正常
3. Supabase 配置是否正确（`js/config/supabase-config.js`）

**解决方案**：
```javascript
// 在控制台检查 Supabase 连接
console.log(AppState.supabase);  // 应该有对象
console.log(AppState.currentUser);  // 应该有用户信息
```

### 问题 4：数据保存了但查询不到

**原因**：RLS 策略限制

**临时调试**：
```sql
-- 暂时禁用 RLS（仅测试用）
ALTER TABLE essays DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_arguments DISABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs DISABLE ROW LEVEL SECURITY;

-- 查询所有数据
SELECT * FROM essays;
SELECT * FROM sub_arguments;
SELECT * FROM paragraphs;

-- 完成后记得重新启用
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
```

---

## ✅ 测试成功标志

1. **控制台日志**：
   - ✅ 看到"創建新論文"或"更新論文"
   - ✅ 看到"保存了 X 個分論點"
   - ✅ 看到"保存了 X 個段落"
   - ✅ 看到"自動保存完成（Supabase + localStorage）"

2. **Supabase Dashboard**：
   - ✅ `essays` 表有新记录
   - ✅ `sub_arguments` 表有数据
   - ✅ `paragraphs` 表有数据
   - ✅ 字数统计正确

3. **页面状态**：
   - ✅ 保存指示器显示"已保存"
   - ✅ 无错误提示

---

## 🎉 完成！

如果所有测试通过，说明 Supabase 数据库保存功能已正常工作！

**下一步**：可以进入阶段 2 - AI 反馈系统开发

