# 时文宝鉴 Supabase 配置指南

## 📋 前提条件

- ✅ 已在 Supabase Dashboard 创建项目
- ⏳ 需要获取项目配置信息
- ⏳ 需要配置 Google OAuth
- ⏳ 需要部署数据库迁移

---

## 🔑 步骤 1：获取项目配置信息

### 在 Supabase Dashboard：

1. **打开你的项目**
2. **左侧菜单** → ⚙️ **Settings** → **API**
3. **复制以下信息：**

```
Project URL:
https://[your-project-id].supabase.co

API Keys:
- anon (public) key:  eyJhbGc...
- service_role key:   eyJhbGc...

Project Reference ID:
[your-project-id]
```

---

## 📝 步骤 2：更新前端配置文件

### 编辑 `js/config/supabase-config.js`：

将以下内容替换为你的实际值：

```javascript
export const SUPABASE_CONFIG = {
  url: 'https://[your-project-id].supabase.co',  // ← 替换
  anonKey: 'your_anon_key',  // ← 替换
  projectId: 'shiwen-baojian'
};
```

---

## 🔐 步骤 3：配置 Google OAuth

### 3.1 在 Google Cloud Console 创建 OAuth 凭据

1. 访问 https://console.cloud.google.com
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID：
   - 应用类型：Web 应用
   - 授权重定向 URI：`https://[your-project-id].supabase.co/auth/v1/callback`
5. 获取：
   - Client ID
   - Client Secret

### 3.2 在 Supabase Dashboard 配置 Google Provider

1. **Settings** → **Authentication** → **Providers**
2. 找到 **Google**，点击启用
3. 填入：
   - Client ID (from Google Console)
   - Client Secret (from Google Console)
4. 保存

### 3.3 配置授权域名

在 **Authentication** → **URL Configuration**：

添加：
- `https://chineseclassics.github.io/shiwen-baojian`
- `http://localhost:3000`（本地开发）

---

## 🗄️ 步骤 4：部署数据库迁移

### 4.1 在终端连接项目

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/shiwen-baojian

# 连接到你的 Supabase 项目
supabase link --project-ref [your-project-id]
```

### 4.2 部署迁移文件

```bash
# 推送所有迁移到远程数据库
supabase db push
```

**这会创建：**
- ✅ 所有表（users, classes, assignments, essays, paragraphs 等）
- ✅ 所有 RLS 策略
- ✅ 所有索引和触发器

### 4.3 验证表结构

在 Supabase Dashboard：
1. **Table Editor** → 查看所有表
2. 应该看到：
   - users
   - classes
   - class_members
   - assignments
   - essays
   - sub_arguments
   - paragraphs
   - paragraph_versions
   - ai_feedback
   - writing_events
   - writing_integrity_reports
   - annotations
   - grades

---

## 🔧 步骤 5：配置 Edge Function 环境变量

### 在 Supabase Dashboard：

1. **Edge Functions** → **Configuration**
2. 添加环境变量：

```
DEEPSEEK_API_KEY=your_deepseek_api_key
```

---

## ✅ 完成检查清单

- [ ] 获取 Project URL
- [ ] 获取 Anon Key
- [ ] 获取 Service Role Key
- [ ] 获取 Project ID
- [ ] 更新 `js/config/supabase-config.js`
- [ ] 配置 Google OAuth
- [ ] 运行 `supabase link`
- [ ] 运行 `supabase db push`
- [ ] 验证表结构
- [ ] 配置 Edge Function 环境变量

---

## 🚀 配置完成后

你就可以使用斜杠命令开始实施了：

```
/openspec-apply-app
```

---

**现在，请提供你的 Supabase 项目信息！** 📋

