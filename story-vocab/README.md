# 📚 故事词汇接龙 - 智慧故事坊

与AI共创精彩故事，轻松积累词汇的创意学习应用

---

## 🎮 快速开始

### 1️⃣ 启动本地服务器

```bash
cd story-vocab
python3 -m http.server 8000
```

### 2️⃣ 开始游戏

打开浏览器访问：**http://localhost:8000/story-game.html**

开始与AI创作故事！

### 3️⃣ 管理后台（可选）

访问管理后台：**http://localhost:8000/admin/**

- 📥 导入更多词汇
- 📖 浏览词汇库
- 🤖 测试AI Agent
- 📊 查看统计数据

---

## ✨ MVP 已完成功能

### 🎯 核心游戏功能
- ✅ **6个难度级别** (L1-L6，覆盖7-18岁学生)
- ✅ **4种故事主题** (自然探索、校园生活、奇幻冒险、科幻未来)
- ✅ **智能词汇推荐** (基于级别和主题的个性化推荐)
- ✅ **18轮故事接龙** (AI与用户交替创作)
- ✅ **实时词汇查询** (集成萌典API)
- ✅ **生词本功能** (收藏喜欢的词汇)
- ✅ **完整故事展示** (创作统计和分享功能)

### 🤖 AI Agent
- ✅ **DeepSeek API 集成** (部署在 Supabase Edge Function)
- ✅ **上下文感知** (根据故事历史智能续写)
- ✅ **阶段控制** (开始/发展/收尾不同策略)
- ✅ **词汇多样性** (避免重复，类别平衡)

### 🛠️ 管理工具
- ✅ **词汇导入工具** (批量导入JSON格式词汇)
- ✅ **词汇浏览器** (筛选、搜索、分页)
- ✅ **AI测试工具** (调试和优化AI响应)
- ✅ **统计面板** (实时数据统计)

### 💾 数据系统
- ✅ **Supabase 数据库** (用户、词汇、故事会话)
- ✅ **RLS 安全策略** (数据访问控制)
- ✅ **120个示例词汇** (L1-L6精选词汇)
- ✅ **本地存储** (生词本持久化)

---

## 📁 项目结构

```
story-vocab/
├── story-game.html           # 🎮 主游戏页面（单页应用）
│
├── admin/                    # 🛠️ 管理后台
│   ├── index.html           # 后台首页
│   ├── import-vocabulary.html    # 词汇导入工具
│   ├── browse-vocabulary.html    # 词汇浏览器
│   └── test-ai-agent.html   # AI Agent 测试
│
├── js/                       # 📦 JavaScript 模块
│   ├── config.js            # 配置文件（Supabase URL/Key）
│   └── supabase-client.js   # Supabase 客户端封装
│
├── supabase/                 # 🗄️ 后端服务
│   ├── migrations/          # 数据库迁移脚本
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_enable_rls_policies.sql
│   │   ├── 003_allow_vocab_insert.sql
│   │   ├── 004_add_missing_columns.sql
│   │   └── 005_fix_rls_properly.sql
│   │
│   └── functions/           # Edge Functions
│       └── story-agent/     # AI 故事生成服务
│           ├── index.ts     # 主逻辑
│           └── deno.json    # Deno 配置
│
└── data/                     # 📊 数据文件
    └── sample-vocabulary.json   # 示例词汇（120个）
```

---

## 🚀 部署指南

### 前提条件

1. ✅ Supabase 账户和项目
2. ✅ DeepSeek API Key
3. ✅ Supabase CLI（用于部署 Edge Function）

### 步骤 1: 配置 Supabase

1. **创建 Supabase 项目**
   - 访问 [https://supabase.com](https://supabase.com)
   - 创建新项目并记录 Project URL 和 Anon Key

2. **运行数据库迁移**
   - 在 Supabase Dashboard → SQL Editor 中依次执行：
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/005_fix_rls_properly.sql`

3. **配置 API 密钥**
   - 在 Supabase Dashboard → Edge Functions → Settings → Secrets 中添加：
     ```
     DEEPSEEK_API_KEY=sk-your-deepseek-key
     ```

### 步骤 2: 配置前端

编辑 `js/config.js`：

```javascript
export const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key'
};
```

### 步骤 3: 部署 Edge Function

```bash
# 安装 Supabase CLI (macOS)
brew install supabase/tap/supabase

# 或使用 npx (无需安装)
npx supabase functions deploy story-agent

# 部署函数
cd story-vocab
npx supabase functions deploy story-agent
```

详细步骤参见：[EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)

### 步骤 4: 导入词汇数据

1. 启动本地服务器
2. 访问 http://localhost:8000/admin/
3. 点击「词汇导入」→「加载词汇数据」→「开始导入」
4. 等待 120 个示例词汇导入完成

### 步骤 5: 测试游戏

访问 http://localhost:8000/story-game.html，开始创作故事！

---

## 🎨 游戏玩法

### 1. 选择级别和主题
- 根据年龄选择合适的难度级别（L1-L6）
- 选择感兴趣的故事主题

### 2. 开始创作
- AI 会给出故事开头
- 从推荐的 6 个词汇中选择一个
- 用选中的词造句，继续故事

### 3. 学习词汇
- 点击任何词语查看详细释义（萌典API）
- 收藏喜欢的词汇到生词本
- 查看拼音、定义和例句

### 4. 完成故事
- 经过 18 轮接龙，完成完整故事
- 查看创作统计（使用词汇数、故事字数）
- 分享或再玩一次

---

## 🛠️ 开发指南

### 本地开发

```bash
# 启动服务器
python3 -m http.server 8000

# 访问游戏
open http://localhost:8000/story-game.html

# 访问管理后台
open http://localhost:8000/admin/
```

### 测试 AI Agent

1. 访问 http://localhost:8000/admin/test-ai-agent.html
2. 选择级别、主题、轮次
3. 查看 AI 响应和推荐词汇

### 添加新词汇

1. 准备 JSON 格式数据（参考 `data/sample-vocabulary.json`）
2. 使用「词汇导入工具」批量导入
3. 或在 Supabase Dashboard 中手动添加

---

## 📊 数据库表说明

### `vocabulary` - 词汇表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| word | text | 词语 |
| pinyin | text | 拼音 |
| level | text | 难度级别 (L1-L6) |
| category | text | 词汇类别 |
| themes | text[] | 适用主题 |
| frequency | int | 使用频率 |
| hsk_level | int | HSK等级 |

### `story_sessions` - 故事会话
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | text | 用户ID |
| level | text | 难度级别 |
| theme | text | 故事主题 |
| story_history | jsonb | 对话历史 |
| creativity_score | float | 创意分数 |
| completed | boolean | 是否完成 |

### `user_vocabulary` - 用户词汇记录
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | text | 用户ID |
| vocabulary_id | uuid | 词汇ID |
| mastery_level | int | 掌握程度 |
| times_used | int | 使用次数 |

### `user_wordbook` - 生词本
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | text | 用户ID |
| vocabulary_id | uuid | 词汇ID |
| notes | text | 用户笔记 |

---

## 🐛 故障排查

### ❌ "Failed to fetch" 错误
**原因**: Supabase 连接问题或 RLS 策略未配置

**解决方案**:
1. 检查 `js/config.js` 中的 URL 和 Key 是否正确
2. 确认已执行 `005_fix_rls_properly.sql` 迁移
3. 查看浏览器控制台的详细错误信息

### ❌ AI 不响应
**原因**: Edge Function 未部署或 API Key 未配置

**解决方案**:
1. 确认 Edge Function 已部署: `npx supabase functions list`
2. 检查 DEEPSEEK_API_KEY 环境变量
3. 查看函数日志: `npx supabase functions logs story-agent`

### ❌ 词汇推荐为空
**原因**: 词汇数据未导入或级别不匹配

**解决方案**:
1. 访问管理后台确认词汇数量 > 0
2. 使用「词汇浏览器」查看各级别词汇分布
3. 使用「词汇导入工具」导入示例数据

### ❌ CORS 错误
**原因**: 直接打开 HTML 文件（file:// 协议）

**解决方案**:
必须使用本地服务器:
```bash
python3 -m http.server 8000
```
然后访问 http://localhost:8000

---

## 📈 未来计划

### 短期（1-2周）
- [ ] 用户登录/注册功能
- [ ] 创意度评分算法
- [ ] 故事分享功能（社交媒体）
- [ ] 更多词汇数据（扩展到 1500+ 词）

### 中期（1-2月）
- [ ] 多人协作故事接龙
- [ ] 学习报告和统计
- [ ] 徽章和成就系统
- [ ] 语音朗读功能

### 长期（3-6月）
- [ ] 故事社区（浏览他人作品）
- [ ] AI 故事插图生成
- [ ] 移动端 App
- [ ] 教师管理后台（班级管理）

---

## 📚 相关文档

- 📐 [完整设计文档](../STORY_VOCABULARY_APP_DESIGN.md)
- 📝 [MVP 开发计划](../STORY_VOCABULARY_MVP_PLAN.md)
- 🚀 [Edge Function 部署指南](./EDGE_FUNCTION_DEPLOY.md)

---

## 🙏 致谢

- **萌典 API**: 提供权威的中文词典数据
- **DeepSeek**: 提供强大的中文AI模型
- **Supabase**: 提供完整的后端服务

---

**最后更新**: 2025-10-07  
**版本**: 1.0.0-MVP  
**状态**: ✅ MVP 核心功能已完成

🎮 **立即开始游戏**: http://localhost:8000/story-game.html