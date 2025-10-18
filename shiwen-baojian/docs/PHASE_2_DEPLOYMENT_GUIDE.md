# 時文寶鑑 - 阶段 2 部署和测试指南

> **阶段 2：AI 反馈系统** - 部署 Edge Function 和测试完整功能

---

## 📋 部署前准备

### 1. 确认阶段 1 已正常运行

在开始阶段 2 之前，请确认以下功能正常：
- ✅ 学生能登录（Google 或匿名）
- ✅ 编辑器能正常使用
- ✅ 内容能自动保存到 Supabase

### 2. 获取 DeepSeek API Key

阶段 2 需要 DeepSeek API 来进行内容分析：

1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册并登录
3. 创建 API Key
4. **保存 API Key**（稍后在 Supabase 中配置）

---

## 🚀 部署步骤

### 步骤 1：部署 Edge Function

在项目根目录执行：

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io
```

#### 1.1 链接 Supabase 项目（如果还没链接）

```bash
supabase link --project-ref [你的项目 ID]
```

**获取项目 ID**：
- 登录 [Supabase Dashboard](https://supabase.com/dashboard)
- 打开你的项目
- 项目 ID 在项目设置中

#### 1.2 部署 Edge Function

```bash
supabase functions deploy ai-feedback-agent --project-ref [你的项目 ID]
```

**预期输出**：
```
Deploying ai-feedback-agent...
✅ Function deployed successfully
```

### 步骤 2：配置环境变量

在 Supabase Dashboard 中配置 DeepSeek API Key：

1. 打开项目 → Settings → Edge Functions
2. 添加环境变量：
   - **Name**: `DEEPSEEK_API_KEY`
   - **Value**: 你的 DeepSeek API Key（sk-...）
3. 点击 Save

### 步骤 3：测试 Edge Function

在 Supabase Dashboard → Edge Functions 中：

1. 找到 `ai-feedback-agent`
2. 点击 "Test"
3. 输入测试 payload：

```json
{
  "paragraph_id": "test-para-1",
  "paragraph_content": "<p>《紅樓夢》的藝術成就，主要體現在其生動立體的人物塑造上。林黛玉住在瀟湘館。</p>",
  "paragraph_type": "introduction",
  "format_spec": null
}
```

4. 点击 "Run"
5. **预期返回**：

```json
{
  "success": true,
  "feedback": {
    "structure_check": {...},
    "content_analysis": {...},
    "sentence_level_issues": [...],
    "severity_level": "...",
    "improvement_suggestions": [...]
  },
  "feedback_id": "..."
}
```

---

## ✅ 功能测试清单

### 测试 1：AI 反馈基本功能

1. **登录应用**（匿名或 Google）
2. **撰写引言段**：
   - 在引言编辑器中输入一些内容
   - 点击"AI 反馈"按钮
   - 观察加载动画
   - 查看反馈结果

**预期结果**：
- ✅ 显示加载动画（旋转图标 + "AI 正在分析您的段落..."）
- ✅ 3-5 秒后显示反馈
- ✅ 反馈包含：结构完整度、具体问题、改进建议

### 测试 2：正文段落 AI 反馈

1. **添加分论点**
2. **撰写段落内容**
3. **点击段落的"AI 反馈"按钮**
4. **查看反馈**

**预期结果**：
- ✅ 反馈针对正文段落的格式要求
- ✅ 检查主题句、文本证据、细读分析
- ✅ 句子级问题定位（第 X 句）

### 测试 3：结论段落 AI 反馈

1. **撰写结论段**
2. **点击结论的"AI 反馈"按钮**
3. **查看反馈**

**预期结果**：
- ✅ 反馈检查重申主张、总结分论点、引申思考

### 测试 4：防作弊系统

#### 4.1 粘贴监测

1. **复制一段文字**（> 200 字）
2. **粘贴到编辑器中**
3. **观察警告提示**

**预期结果**：
- ✅ 屏幕右上角显示黄色提示框
- ✅ 提示内容："检测到大量粘贴内容（XXX 字）"
- ✅ 提示 3 秒后自动消失

#### 4.2 频繁粘贴警告

1. **连续粘贴内容 6 次以上**
2. **观察警告**

**预期结果**：
- ✅ 显示橙色警告框
- ✅ 提示："您已粘贴内容多次。老师会查看粘贴记录和写作模式分析。"
- ✅ 有"我知道了"按钮可关闭

#### 4.3 打字监测（后台）

1. **正常打字一段内容**
2. **打开浏览器控制台（F12）**
3. **查看日志**

**预期日志**：
```
🔒 初始化防作弊系统...
✅ 粘贴事件监听器已绑定
✅ 打字事件监听器已绑定
✅ 防作弊系统初始化完成
📝 新写作会话开始: session-...
```

---

## 🐛 常见问题排查

### 问题 1：AI 反馈按钮点击后没有反应

**可能原因**：
- Edge Function 未部署
- API Key 未配置
- 网络连接问题

**排查步骤**：
1. 打开浏览器控制台（F12）
2. 查看错误信息
3. 检查 Network 标签中的请求状态

**常见错误**：
```
❌ 请求 AI 反馈失败: Function not found
```
**解决**：重新部署 Edge Function

```
❌ DeepSeek API 返回错误: 401
```
**解决**：检查 API Key 是否正确配置

### 问题 2：反馈显示"获取 AI 反馈失败"

**检查**：
1. 打开 Supabase Dashboard → Edge Functions
2. 查看 `ai-feedback-agent` 的日志
3. 找到错误信息

**常见问题**：
- `DEEPSEEK_API_KEY` 环境变量未设置
- API 配额用完
- 网络连接超时

### 问题 3：防作弊警告没有显示

**检查**：
1. 打开控制台，查看是否有日志：
   ```
   📋 检测到粘贴: { length: XXX, total_pastes: X }
   ```
2. 如果没有日志，检查 `anti-cheat.js` 是否正确加载

**解决**：
- 刷新页面
- 检查浏览器控制台是否有 JavaScript 错误

---

## 📊 验证数据保存

### 检查 AI 反馈是否保存到数据库

1. 打开 Supabase Dashboard → Table Editor
2. 选择 `ai_feedback` 表
3. 查看是否有新记录

**记录字段**：
- `paragraph_id`: 段落 ID
- `feedback_json`: AI 反馈内容（JSON）
- `ai_grading_json`: 评分预估（仅老师可见）
- `generated_at`: 生成时间

### 检查防作弊数据（暂时未保存到数据库）

防作弊数据目前只在客户端记录，老师端查看功能在阶段 3 实现。

控制台可以查看：
```javascript
// 打开控制台执行
console.log(AntiCheatState.currentSession)
```

**预期输出**：
```json
{
  "session_id": "session-...",
  "paste_count": 3,
  "total_chars_typed": 245,
  "total_chars_pasted": 120,
  "typing_speed_samples": [350, 380, 360]
}
```

---

## 🎉 阶段 2 完成标志

如果以下功能都正常，说明阶段 2 已成功部署：

- ✅ 引言、正文、结论都有"AI 反馈"按钮
- ✅ 点击按钮后显示加载动画
- ✅ 3-5 秒后显示 AI 反馈结果
- ✅ 反馈包含：结构检查、具体问题、改进建议
- ✅ 粘贴大量内容时显示警告
- ✅ 频繁粘贴时显示诚信提醒
- ✅ 控制台显示防作弊系统初始化成功

---

## 📝 下一步：阶段 3

阶段 2 完成后，可以开始阶段 3 的开发：
- 老师端班级管理
- 老师端任务创建
- 学生端任务列表
- 老师端批改功能

---

**部署日期**：2025-10-19  
**文档版本**：1.0  
**维护者**：时文宝鉴开发团队

