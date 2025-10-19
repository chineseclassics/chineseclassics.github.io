# 时文宝鉴 Supabase 配置

## 🔧 项目信息

**Supabase 项目**：时文宝鉴专用
- **Project ID**: `fjvgfhdqrezutrmbidds`
- **URL**: `https://fjvgfhdqrezutrmbidds.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds

---

## ⚠️ 重要提示

**本项目不使用 Supabase CLI 部署**

原因：
- Supabase CLI 登录的账户用于 **story-vocab** 项目（ID: bjykaipbeokbbykvseyr）
- 时文宝鉴使用**不同的 Supabase 账户**
- 避免账户冲突，所有部署通过 **Dashboard 手动完成**

---

## 📦 Edge Functions 部署方式

### 方式：Dashboard 手动部署

1. 登录：https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds
2. 进入：**Edge Functions** 页面
3. 点击：**Create a new function** 或编辑现有函数
4. 复制代码：从 `shiwen-baojian/supabase/functions/[function-name]/index.ts`
5. 粘贴并部署

### 已部署的 Edge Functions

| Function Name | 文件路径 | 部署日期 | 状态 |
|--------------|---------|---------|------|
| `format-spec-generator` | `supabase/functions/format-spec-generator/index.ts` | 2025-10-19 | ✅ Active |
| `ai-feedback-agent` | `supabase/functions/ai-feedback-agent/index.ts` | （之前已部署） | ✅ Active |

---

## 🧪 测试工具

### 测试 HTML 页面
```
shiwen-baojian/test-format-spec-generator.html
```
- 在浏览器中打开
- 已预填正确的 Supabase URL
- 需要填入 Anon Key

### 测试脚本
```bash
cd shiwen-baojian
chmod +x test-format-api.sh
./test-format-api.sh YOUR_ANON_KEY
```

### 获取 Anon Key
访问：https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds/settings/api

复制 **anon** **public** key

---

## 🔐 环境变量配置

在 Supabase Dashboard 配置环境变量：

**位置**：Settings → Edge Functions → Secrets

**必需变量**：
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥（用于 AI 格式生成和反馈）
- `SUPABASE_URL`: `https://fjvgfhdqrezutrmbidds.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: 从 Settings → API 获取

---

## 📊 数据库迁移

**方式**：通过 SQL Editor 手动执行

1. 访问：https://supabase.com/dashboard/project/fjvgfhdqrezutrmbidds/sql/new
2. 复制迁移文件内容：`shiwen-baojian/supabase/migrations/*.sql`
3. 粘贴并执行

**已执行的迁移**：
- ✅ `016_create_grading_rubrics.sql` (2025-10-19)
  - 创建 `grading_rubrics` 表
  - 创建 `ai_grading_suggestions` 表

---

## 🚫 注意事项

### ❌ 不要执行这些命令
```bash
# 这些命令会部署到错误的项目（story-vocab）
supabase link --project-ref fjvgfhdqrezutrmbidds  # ❌
supabase functions deploy [function-name]          # ❌
supabase db push                                   # ❌
```

### ✅ 正确的做法
- 所有部署通过 **Dashboard 手动完成**
- 代码更新后，在 Dashboard 中复制粘贴新代码
- 数据库迁移通过 SQL Editor 手动执行

---

**最后更新**: 2025-10-19

