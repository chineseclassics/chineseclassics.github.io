# 阶段 2 测试指南

## 🔐 前提条件

### 1. 数据库迁移已执行

确保以下迁移已在 Supabase Dashboard 执行：

- ✅ `013_create_format_specifications_table.sql`
- ✅ `016_create_grading_rubrics.sql`

**执行方法**：
1. 访问：https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds/sql/new
2. 复制迁移文件内容
3. 点击 Run 执行

---

### 2. 用户已登录

**格式编辑器和管理页面需要登录才能使用。**

**登录步骤**：
1. 打开时文宝鉴主页：`shiwen-baojian/index.html`
2. 使用 Google 账户登录（老师账户，`@isf.edu.hk` 邮箱）
3. 登录成功后，右上角应显示用户邮箱

**验证登录**：
- 在浏览器控制台执行：
  ```javascript
  window.supabaseClient.auth.getSession()
  ```
- 应该返回有效的 session 对象

---

## 🧪 测试流程

### 测试 1：创建自定义格式（从零开始）

#### 步骤 1：打开格式编辑器

在**已登录状态**下，打开：
```
shiwen-baojian/format-editor.html
```

**验证登录**：
- 右上角应显示：✓ your.email@isf.edu.hk
- 如果显示「⚠️ 未登錄」，点击「前往登錄」

---

#### 步骤 2：创建格式

1. **确认左侧选中「从零开始」**（默认已选中）

2. **在编辑器中输入**：
   ```
   总字数 1500-2000 字，必须 3 个分论点。
   
   详细分析红楼梦中林黛玉和薛宝钗的外貌描写，
   每个人物的分析不少于 300 字。
   ```

3. **点击「✨ AI 优化」**
   - 等待 3-5 秒
   - 观察「AI 正在优化格式要求...」提示

4. **查看优化结果**
   - 编辑器内容应更新为结构化文本
   - 控制台应显示：
     ```
     [Stage 1] AI 生成完成
     [Stage 2] 解析完成，耗时: Xms
     [FormatEditor] JSON 转换完成
     ```

5. **保存格式**
   - 点击「💾 保存格式」
   - 输入名称：`测试格式 - 红楼梦外貌分析`
   - 输入描述：`用于十年级红楼梦单元`
   - 点击「确认保存」

6. **验证保存成功**
   - 应看到「✅ 格式已保存！」
   - 自动跳转到格式管理页面

---

### 测试 2：查看格式列表

应该已跳转到 `format-manager.html`

**验证**：
- ✅ 能看到刚创建的格式
- ✅ 显示正确的信息（名称、描述、字数、段落数）
- ✅ 有「查看」、「编辑」、「删除」按钮

---

### 测试 3：查看格式详情

1. 点击任意格式的「👁️ 查看」按钮
2. 弹出详情模态框
3. 点击「📋 复制说明」
4. 打开记事本，粘贴（Cmd+V）
5. 验证格式说明已正确复制

---

### 测试 4：编辑格式

1. 点击「✏️ 编辑」按钮
2. 跳转回格式编辑器
3. 编辑器已加载现有内容
4. 修改内容（例如改字数为 1800-2200）
5. 点击「AI 优化」
6. 保存
7. 返回格式管理，验证更新

---

### 测试 5：删除格式

1. 点击「🗑️」删除按钮
2. 确认删除
3. 格式应从列表中消失

---

### 测试 6：搜索和筛选

1. **搜索**：输入「红楼梦」，应只显示相关格式
2. **筛选**：选择「仅显示自定义」，系统格式应隐藏
3. **排序**：选择不同排序方式，验证顺序变化

---

## ⚠️ 常见问题

### 问题 1：保存失败 - "请先登录"

**原因**：未登录或 session 过期

**解决**：
1. 返回主页 `shiwen-baojian/index.html`
2. 重新登录
3. 登录成功后再打开格式编辑器

---

### 问题 2：右上角显示「未登录」

**原因**：直接打开 format-editor.html，没有登录上下文

**解决**：
1. 先打开 `shiwen-baojian/index.html`
2. 登录
3. 然后从主页导航到格式编辑器

---

### 问题 3：AI 优化失败

**检查**：
1. Dashboard → Edge Functions → format-spec-generator 是否已部署
2. Settings → Edge Functions → Secrets → DEEPSEEK_API_KEY 是否已配置

---

## ✅ 测试成功标志

- ✅ 能成功创建格式并保存到数据库
- ✅ 在格式管理页面看到创建的格式
- ✅ 能查看格式详情并复制
- ✅ 能编辑和更新格式
- ✅ 能删除自定义格式
- ✅ 搜索和筛选功能正常

---

## 📊 数据库验证

在 Supabase Dashboard 中验证：

```sql
-- 查看所有格式
SELECT id, name, description, is_system, created_at 
FROM format_specifications
ORDER BY created_at DESC;

-- 查看您创建的格式
SELECT * FROM format_specifications 
WHERE is_system = false
ORDER BY created_at DESC;
```

---

**最后更新**：2025-10-19

