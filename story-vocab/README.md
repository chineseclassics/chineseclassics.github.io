# 智慧故事坊 - 故事接龙词汇学习应用

## ⚡ 超快速开始（推荐）

如果您的 Supabase 已经配置好（URL 和 Key 已填入 `js/config.js`），可以直接：

1. **启动本地服务器**
   ```bash
   cd story-vocab
   python3 -m http.server 8000
   ```

2. **访问管理后台**
   
   打开浏览器访问：http://localhost:8000/admin/

3. **导入示例词汇**
   
   点击「词汇导入」→「加载词汇数据」→「开始导入」
   
   这将导入 120 个精选词汇（L1-L6，适合 7-18 岁学生）

4. **浏览词汇**
   
   使用「词汇浏览器」查看、筛选和搜索已导入的词汇

## 🚀 完整设置指南

### 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册并创建新项目
3. 记录以下信息：
   - Project URL: `https://xxxxx.supabase.co`
   - Project Anon Key: `eyJhbGci...`

### 第二步：运行数据库迁移

1. 安装 Supabase CLI（如果还没安装）:
   ```bash
   npm install -g supabase
   ```

2. 登录 Supabase:
   ```bash
   supabase login
   ```

3. 关联项目:
   ```bash
   cd story-vocab
   supabase link --project-ref your-project-ref
   ```

4. 运行迁移:
   ```bash
   supabase db push
   ```
   
   或者直接在 Supabase Dashboard 的 SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`

### 第三步：配置前端

1. 编辑 `js/config.js`，填入 Supabase 配置:
   ```javascript
   export const SUPABASE_CONFIG = {
     url: 'https://xxxxx.supabase.co', // 替换为您的 URL
     anonKey: 'eyJhbGci...' // 替换为您的 anon key
   };
   ```

2. 配置 DeepSeek API（在 Supabase Dashboard → Edge Functions → Settings → Secrets）:
   ```
   DEEPSEEK_API_KEY=sk-xxxxx
   ```

### 第四步：准备词汇数据

1. 准备词汇 CSV 文件（格式参考 `data/vocabulary-template.csv`）
2. 导入到 Supabase（使用 SQL 或 CSV 导入工具）

### 第五步：部署 Edge Function

1. 创建 Edge Function:
   ```bash
   supabase functions deploy story-agent
   ```

2. 测试 Function:
   ```bash
   supabase functions invoke story-agent --body '{"test": true}'
   ```

### 第六步：本地测试

1. 用浏览器打开 `index.html`
2. 或使用本地服务器:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

3. 访问 `http://localhost:8000`

---

## 📁 项目结构

```
story-vocab/
├── index.html                 # 首页
├── story.html                 # 故事创作页面（待创建）
├── config.html                # 设置页面（待创建）
├── result.html                # 结果页面（待创建）
│
├── css/
│   └── main.css              # 全局样式（待创建）
│
├── js/
│   ├── config.js             # ✅ 配置文件
│   ├── supabase-client.js    # ✅ Supabase 客户端
│   ├── auth.js               # 认证模块（待创建）
│   │
│   └── modules/
│       ├── story-engine.js   # 故事引擎（待创建）
│       ├── vocabulary.js     # 词汇推荐（待创建）
│       ├── creativity.js     # 创意度评分（待创建）
│       └── moedict.js        # 萌典 API（待创建）
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # ✅ 数据库架构
│   │
│   └── functions/
│       └── story-agent/
│           └── index.ts      # AI Agent（待创建）
│
└── data/
    └── vocabulary-template.csv  # 词汇模板（待创建）
```

---

## 🎯 MVP 开发任务清单

### Week 1: 基础设施 (Day 1-7)

- [x] 数据库架构设计
- [x] Supabase 配置
- [x] 前端配置文件
- [x] Supabase 客户端封装
- [ ] Supabase 项目创建
- [ ] 数据库迁移执行
- [ ] 词汇数据准备（1500个）
- [ ] 词汇数据导入

### Week 2: 核心功能 (Day 8-14)

- [ ] Edge Function: story-agent
- [ ] DeepSeek API 集成
- [ ] 故事引擎模块
- [ ] 词汇推荐算法
- [ ] 萌典 API 集成
- [ ] 创意度评分算法
- [ ] 前端页面（HTML/CSS）
- [ ] 页面交互逻辑

### Week 3: 测试优化 (Day 15-21)

- [ ] 完整流程测试
- [ ] AI 回应质量调优
- [ ] UI/UX 优化
- [ ] Bug 修复
- [ ] 性能优化
- [ ] 部署到生产环境
- [ ] 内测准备

---

## 🛠️ 开发指南

### 代码规范

- 使用 ES6 模块（`import/export`）
- 函数命名：驼峰式（camelCase）
- 变量命名：有意义的英文
- 注释：关键逻辑必须注释
- 错误处理：使用 try-catch

### Git 提交规范

```
feat: 添加新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 分支策略

- `main`: 生产环境
- `develop`: 开发环境
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

---

## 📊 数据库表说明

### users - 用户表
- 存储用户基本信息
- 当前等级、完成故事数

### vocabulary - 词汇表
- 核心词汇库
- 包含拼音、难度、分类、主题等

### story_sessions - 故事会话
- 每个故事的完整数据
- 对话历史、创意度评分

### user_vocabulary - 用户词汇记录
- 用户学习过的词汇
- 掌握程度、使用次数

### user_wordbook - 生词本
- 用户收藏的词汇
- 例句、来源故事

---

## 🔐 安全说明

### Row Level Security (RLS)

数据库已启用 RLS，确保：
- 用户只能看到自己的数据
- 词汇表对所有人可读
- API Key 存储在 Supabase Secrets

### API Key 管理

- 前端使用 `anon key`（公开安全）
- DeepSeek API Key 存储在 Edge Function 环境变量
- 不要将 API Key 提交到 Git

---

## 🐛 故障排查

### 数据库连接失败
1. 检查 `config.js` 中的 URL 和 Key
2. 确认 Supabase 项目状态正常
3. 查看浏览器控制台错误

### Edge Function 调用失败
1. 检查函数是否已部署
2. 确认环境变量已设置
3. 查看 Function 日志: `supabase functions logs story-agent`

### 词汇推荐为空
1. 确认词汇数据已导入
2. 检查难度等级是否匹配
3. 查看数据库查询日志

---

## 📞 联系方式

如有问题，请查看：
- 📖 [完整设计文档](../STORY_VOCABULARY_APP_DESIGN.md)
- 📝 [MVP 计划](../STORY_VOCABULARY_MVP_PLAN.md)
- 🐛 [GitHub Issues](https://github.com/...)

---

## 📄 License

待定

---

**最后更新**: 2025-10-06  
**版本**: 1.0.0-mvp  
**状态**: 开发中

