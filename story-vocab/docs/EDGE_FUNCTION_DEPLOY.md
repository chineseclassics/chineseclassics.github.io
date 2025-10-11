# 🚀 Edge Function 部署指南

完整的部署步骤，帮助您将 AI Agent 部署到 Supabase。

---

## 📋 前置准备

### 1. 安装 Supabase CLI

**macOS (使用 Homebrew):**
```bash
brew install supabase/tap/supabase
```

**其他系统或更多安装方式：**
https://supabase.com/docs/guides/cli

### 2. 验证安装
```bash
supabase --version
```

应该看到版本号，例如：`1.x.x`

---

## 🔑 第一步：配置 API Key

### 获取 DeepSeek API Key

1. 访问：https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 **API Keys** 页面
4. 点击 **Create new secret key**
5. 复制生成的 API Key（sk-xxxxxxxxxx）

### 在 Supabase 中添加 Secret

1. **访问 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/settings/functions
   ```

2. **找到 Secrets 部分**

3. **添加新 Secret**
   - Name: `DEEPSEEK_API_KEY`
   - Value: `sk-xxxxxxxxxx`（您的 DeepSeek API Key）

4. **点击 Save**

---

## 🚀 部署步驟

### 前置：架構確認

Story-Vocab 在子項目目錄內獨立部署，符合太虛幻境兩層架構原則：
- ✅ 配置文件：`story-vocab/supabase/config.toml`
- ✅ 部署位置：在 story-vocab 目錄內操作
- ❌ 不需要複製到太虛幻境根目錄

---

### 方法 1：使用 Supabase CLI（推薦）

1. **進入 story-vocab 目錄**
   ```bash
   cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io/story-vocab
   ```

2. **登錄 Supabase**
   ```bash
   supabase login
   ```
   
   會打開瀏覽器進行授權，完成後回到終端

3. **關聯項目**
   ```bash
   supabase link --project-ref bjykaipbeokbbykvseyr
   ```

4. **部署 Edge Function**
   ```bash
   supabase functions deploy story-agent
   ```
   
   應該看到：
   ```
   Deploying function story-agent...
   Deployed function story-agent to https://bjykaipbeokbbykvseyr.supabase.co/functions/v1/story-agent
   ```

5. **部署其他函數**
   ```bash
   supabase functions deploy vocab-recommender
   supabase functions deploy vocab-difficulty-evaluator
   ```

**工作原理**：
- Supabase CLI 自動從當前目錄的 `supabase/functions/` 讀取代碼
- 無需手動複製文件到其他位置
- 每個函數獨立部署和版本管理

6. **验证部署**
   ```bash
   curl -i --location --request POST \
     'https://bjykaipbeokbbykvseyr.supabase.co/functions/v1/story-agent' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"test": true}'
   ```

---

### 方法 2：手动部署（如果 CLI 有问题）

1. **压缩 Edge Function**
   ```bash
   cd story-vocab/supabase/functions
   zip -r story-agent.zip story-agent/
   ```

2. **上传到 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/functions
   - 点击 **Deploy a new function**
   - 上传 `story-agent.zip`

---

## 🧪 第三步：测试 Edge Function

### 使用测试页面（推荐）

1. **打开测试工具**
   ```
   http://localhost:8000/admin/test-ai-agent.html
   ```

2. **检查连接状态**
   - 应该看到 "✅ Edge Function 已部署"

3. **开始测试**
   - 选择用户级别和故事主题
   - 点击 "🎬 开始新故事"
   - 输入句子测试 AI 生成

---

### 使用 curl 测试（命令行）

```bash
curl -i --location --request POST \
  'https://bjykaipbeokbbykvseyr.supabase.co/functions/v1/story-agent' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "userSentence": "小明在森林里发现了一只小兔子",
    "selectedWord": "发现",
    "sessionId": "test-session-id",
    "conversationHistory": [],
    "userLevel": 2,
    "storyTheme": "natural_exploration",
    "currentRound": 0
  }'
```

---

## 🔧 故障排除

### 问题 1：部署失败 "authentication failed"

**原因：** 未登录或 token 过期

**解决：**
```bash
supabase logout
supabase login
```

---

### 问题 2：调用 Edge Function 返回 500 错误

**可能原因：**
1. DEEPSEEK_API_KEY 未配置
2. API Key 无效
3. 代码中有错误

**检查方法：**
1. **查看 Edge Function 日志**
   ```
   https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/logs/functions
   ```

2. **检查 Secrets 配置**
   ```
   https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/settings/functions
   ```
   
   确保 `DEEPSEEK_API_KEY` 已正确设置

---

### 问题 3：CORS 错误

**原因：** 跨域请求被阻止

**解决：** Edge Function 已包含 CORS 头，不应该出现此问题。如果仍然出现：

1. 检查请求是否使用了正确的 URL
2. 确保请求包含 `Authorization` 头
3. 清除浏览器缓存

---

### 问题 4：超时错误

**原因：** DeepSeek API 响应慢或网络问题

**解决：**
1. 检查网络连接
2. 增加超时时间
3. 检查 DeepSeek API 状态：https://status.deepseek.com/

---

## 📊 监控和调试

### 查看实时日志

1. **访问 Edge Function 日志**
   ```
   https://supabase.com/dashboard/project/bjykaipbeokbbykvseyr/logs/functions
   ```

2. **实时查看日志**
   - 点击 `story-agent` 函数
   - 查看 **Invocations** 标签
   - 查看每次调用的日志输出

### 本地调试（可选）

```bash
# 安装 Deno
brew install deno

# 本地运行 Edge Function
cd story-vocab/supabase/functions/story-agent
deno run --allow-net --allow-env index.ts

# 或使用 Supabase CLI
supabase functions serve story-agent
```

---

## ✅ 部署成功检查清单

- [ ] Supabase CLI 已安装
- [ ] 已登录 Supabase
- [ ] 已关联项目
- [ ] DeepSeek API Key 已添加到 Secrets
- [ ] Edge Function 已部署
- [ ] 测试页面显示 "✅ Edge Function 已部署"
- [ ] 可以成功调用并获得 AI 响应
- [ ] 词汇推荐功能正常

---

## 🎯 下一步

部署成功后，您可以：

1. ✅ 使用测试工具验证 AI 生成质量
2. ✅ 调整系统提示词优化故事生成
3. ✅ 开发前端故事接龙界面
4. ✅ 集成到完整的应用流程

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志** - 大多数问题都能从日志中找到原因
2. **检查文档** - https://supabase.com/docs/guides/functions
3. **社区支持** - https://github.com/supabase/supabase/discussions

---

**祝部署成功！** 🚀

