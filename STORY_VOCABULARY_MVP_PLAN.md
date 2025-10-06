# 故事接龙词汇学习应用 - MVP 实施计划

## 🎯 MVP 核心目标

**验证核心价值**：用户是否喜欢和 AI 一起创作"意想不到的故事"？

**成功标准**：
- 用户完成第一个故事后，70% 选择"再来一次"
- 故事创意度平均分 >75
- 用户能感受到"每次都不一样"

---

## 📦 MVP 功能范围

### ✅ 包含功能（核心体验）

#### 1. 单人 + AI 创作模式
- [x] 用户与 AI 一对一创作故事
- [x] 完整的 3 段式故事结构
- [x] 15-18 轮接龙

#### 2. 情境选择系统
- [x] 3 种情境选择（听懂动物、神秘地图、奇怪的梦）
- [x] 每种情境 3 个不同开场（随机）
- [x] 自然的引导方式（而非"选择故事类型"）

#### 3. 核心词汇系统
- [x] 2 个年龄等级（L2、L3）
- [x] 约 1500 个词汇（L2: 800, L3: 700）
- [x] 每次推荐 4 个词汇（多样性：动作/情感/描写/灵活）
- [x] 萌典 API 集成（点击查看释义）

#### 4. AI 创作引擎
- [x] DeepSeek API 集成
- [x] 防套路化机制（句式变化、5种叙事风格）
- [x] 用户创意识别和放大
- [x] 动态故事发展

#### 5. 创意度评分
- [x] 基础创意度算法（4个维度）
- [x] 完成界面突出创意指数
- [x] 识别用户创新点

#### 6. 基础数据持久化
- [x] 用户数据（简单注册/匿名登录）
- [x] 故事会话保存
- [x] 生词本功能
- [x] 学习进度记录

### ❌ 暂不包含（后续扩展）

- ❌ 多人协作模式（重要，但第二阶段）
- ❌ 完整 6 个年龄等级（先验证 2 个等级）
- ❌ 5 种情境主题（先验证 3 种）
- ❌ 高级激励系统（故事收藏馆、成就、排行榜）
- ❌ 社交功能（分享、社区）
- ❌ 复习游戏（生词本小游戏）

---

## 🏗️ 架构设计（确保可扩展）

### 前端架构

```
/story-vocabulary-app/
├── index.html                 # 首页/登录
├── story.html                 # 故事创作主界面
├── config.html                # 设置/选择情境
├── result.html                # 故事完成界面
├── wordbook.html             # 生词本
│
├── css/
│   ├── main.css              # 全局样式
│   └── story.css             # 故事界面样式
│
├── js/
│   ├── config.js             # 配置（Supabase 连接）
│   ├── auth.js               # 认证模块
│   ├── supabase-client.js    # Supabase 客户端封装
│   │
│   ├── modules/
│   │   ├── story-engine.js   # 故事引擎（核心逻辑）
│   │   ├── vocabulary.js     # 词汇推荐
│   │   ├── creativity.js     # 创意度评分
│   │   ├── moedict.js        # 萌典 API 集成
│   │   └── ui-components.js  # UI 组件
│   │
│   └── pages/
│       ├── story-page.js     # 故事页面逻辑
│       ├── config-page.js    # 配置页面逻辑
│       └── result-page.js    # 结果页面逻辑
│
└── data/
    └── vocabulary-sample.json # 词汇库（样本，后期迁移到 DB）
```

**可扩展设计**：
- 模块化代码，每个功能独立文件
- 使用 ES6 模块（`import/export`）
- 清晰的 API 接口定义
- 预留扩展点（如 `multi-player.js`）

### 后端架构（Supabase）

```
Supabase 项目结构：

/supabase/
├── migrations/              # 数据库迁移
│   ├── 001_initial_schema.sql
│   ├── 002_vocabulary_data.sql
│   └── 003_add_rooms.sql  # 预留：多人功能
│
├── functions/               # Edge Functions
│   ├── story-agent/
│   │   └── index.ts        # 单人 AI Agent
│   │
│   ├── story-agent-multiplayer/  # 预留
│   │   └── index.ts        # 多人 AI Agent（第二阶段）
│   │
│   └── shared/
│       ├── deepseek.ts     # DeepSeek API 封装
│       ├── vocabulary.ts   # 词汇推荐算法
│       └── creativity.ts   # 创意度计算
│
└── seed/                    # 测试数据
    └── sample-vocab.sql
```

**可扩展设计**：
- 数据库使用 migrations（版本控制）
- Edge Functions 模块化
- 共享代码抽取到 `shared/`
- 预留多人功能的表结构

---

## 📊 数据库设计（MVP 简化版）

### MVP 必需表

```sql
-- 1. 用户表（简化版）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  display_name TEXT,
  current_level DECIMAL(2,1) DEFAULT 2.0,
  total_stories_completed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 词汇表（核心）
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  pinyin TEXT,
  difficulty_level INT NOT NULL,  -- 2, 3
  category TEXT,  -- 'action', 'emotion', 'description', 'flexible'
  theme TEXT[],   -- ['natural', 'adventure', 'fantasy']
  frequency INT
);

-- 3. 故事会话（核心）
CREATE TABLE story_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- 故事信息
  story_theme TEXT NOT NULL,
  initial_choice TEXT,
  opening_variant INT DEFAULT 1,  -- 1-3，记录使用了哪个开场
  
  -- 进度
  current_segment INT DEFAULT 1,  -- 1-3
  current_round INT DEFAULT 0,
  max_rounds INT DEFAULT 18,
  
  -- 数据
  conversation_history JSONB DEFAULT '[]',
  vocabulary_used UUID[] DEFAULT '{}',
  
  -- 评分
  creativity_score INT DEFAULT 0,
  creativity_details JSONB DEFAULT '{}',
  
  -- 状态
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 4. 用户词汇学习记录
CREATE TABLE user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  vocabulary_id UUID REFERENCES vocabulary(id),
  
  mastery_level INT DEFAULT 0,
  times_used INT DEFAULT 0,
  user_sentences JSONB DEFAULT '[]',
  
  first_learned_at TIMESTAMP DEFAULT NOW(),
  last_reviewed_at TIMESTAMP,
  
  UNIQUE(user_id, vocabulary_id)
);

-- 5. 生词本
CREATE TABLE user_wordbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  vocabulary_id UUID REFERENCES vocabulary(id),
  from_story_id UUID REFERENCES story_sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, vocabulary_id)
);
```

### 预留扩展（注释掉，第二阶段启用）

```sql
-- 多人房间表（第二阶段）
-- CREATE TABLE story_rooms (...);
-- CREATE TABLE room_players (...);

-- 成就系统（第三阶段）
-- CREATE TABLE achievements (...);
-- CREATE TABLE user_achievements (...);
```

---

## 🚀 开发步骤（分阶段）

### 第一周：基础设施搭建

**Day 1-2: Supabase 设置**
- [ ] 创建 Supabase 项目
- [ ] 运行数据库迁移（创建表结构）
- [ ] 配置环境变量（DeepSeek API Key）
- [ ] 测试基础连接

**Day 3-4: 词汇数据准备**
- [ ] 收集 L2、L3 词汇（各 800、700 个）
- [ ] 为词汇标注属性（难度、类型、主题）
- [ ] 导入到数据库
- [ ] 编写测试 SQL 验证数据

**Day 5-7: 前端基础框架**
- [ ] 创建 HTML 页面结构
- [ ] 设置 Tailwind CSS
- [ ] 实现 Supabase 客户端连接
- [ ] 简单的匿名登录

---

### 第二周：核心功能开发

**Day 8-10: 故事引擎**
- [ ] 实现情境选择界面
- [ ] 开发 Edge Function: `story-agent`
- [ ] DeepSeek API 集成
- [ ] 防套路化 Prompt 设计

**Day 11-12: 词汇系统**
- [ ] 词汇推荐算法实现
- [ ] 萌典 API 集成
- [ ] 词汇卡片 UI 组件
- [ ] 生词本功能

**Day 13-14: 创意度评分**
- [ ] 基础评分算法
- [ ] 故事完成界面
- [ ] 创意点识别

---

### 第三周：测试与优化

**Day 15-17: 完整流程测试**
- [ ] 端到端测试（创建到完成）
- [ ] AI 回应质量调优
- [ ] UI/UX 优化
- [ ] 修复 Bug

**Day 18-19: 数据和性能**
- [ ] 数据持久化测试
- [ ] 性能优化
- [ ] 加载速度优化

**Day 20-21: 内测准备**
- [ ] 部署到生产环境
- [ ] 准备测试账号
- [ ] 编写用户指南
- [ ] 准备反馈收集表单

---

## 🎯 MVP 测试计划

### 内测阶段（10-20 人）

**测试用户**：
- 3-5 名小学高年级学生（10-12岁）
- 3-5 名初中生（13-15岁）
- 2-3 名教师/家长
- 2-3 名技术测试员

**收集数据**：
1. **核心指标**
   - 完成率（开始故事的人中有多少完成）
   - 重玩率（完成后选择"再来一次"的比例）
   - 平均创意度分数
   - 每个故事平均时长

2. **用户反馈**
   - 是否感觉"每次都不一样"？（1-5分）
   - 是否感到"在创作"而非"完成任务"？（1-5分）
   - AI 回应是否有趣？（1-5分）
   - 词汇难度是否合适？（太难/合适/太简单）
   - 最喜欢/最不喜欢的部分？（开放问题）

3. **技术指标**
   - API 响应时间
   - 错误率
   - 数据库查询性能

### 优化迭代

根据测试反馈：
- 调整 AI Prompt（如果回应太套路）
- 调整词汇推荐（如果难度不合适）
- 优化 UI（如果用户卡住）
- 修复 Bug

---

## 🔧 技术债务管理

### 允许的快捷方式（MVP 可接受）

✅ **可以简化的地方**：
- 用匿名登录，暂不实现完整用户系统
- 词汇库先用 1500 个，不追求完整
- 只实现 3 种情境，每种 3 个开场
- 创意度评分用简化算法
- UI 可以不够精美，但要清晰易用

❌ **不能妥协的地方**：
- 数据库结构必须规范（避免后期重构）
- 代码必须模块化（确保可扩展）
- AI 回应质量必须过关（核心体验）
- 防套路化机制必须有效
- 数据持久化必须可靠

---

## 📈 扩展路径清晰化

### MVP → 第二阶段（多人功能）

**需要的改动**：
- 前端：添加 `multi-player.js` 模块
- 后端：启用预留的 `story_rooms` 表
- 后端：部署 `story-agent-multiplayer` Function
- 前端：集成 Supabase Realtime

**不需要改动**：
- 核心故事引擎（复用）
- 词汇系统（复用）
- 创意度评分（扩展）

### 第二阶段 → 第三阶段（完整功能）

**需要的改动**：
- 扩展到 6 个年龄等级
- 添加更多情境和开场
- 实现成就系统
- 添加社交功能

**不需要改动**：
- 数据库核心表（已设计好）
- 故事引擎（已模块化）
- AI Agent（参数调整即可）

---

## 💰 MVP 成本估算

### 开发成本
- 3 周开发时间
- 1 名全栈开发（您）

### 运营成本（测试阶段）
- Supabase: 免费
- DeepSeek API: 约 20-50 元/月（10-20 人测试）
- GitHub Pages + Cloudflare: 免费

**总成本**：约 50 元/月

---

## 🎯 MVP 成功标准

### 必须达到
- ✅ 完成率 >60%
- ✅ 重玩率 >50%
- ✅ 平均创意度 >70分
- ✅ 技术稳定（错误率 <2%）

### 希望达到
- 🎯 重玩率 >70%
- 🎯 平均创意度 >75分
- 🎯 用户主动推荐给朋友

### 决策标准
- 如果核心指标达标 → 继续开发完整版
- 如果指标不达标但反馈好 → 优化后再测
- 如果用户不感兴趣 → 重新思考核心价值

---

## 📝 下一步行动

1. ✅ **确认 MVP 范围**（已完成）
2. 🔄 **创建 Supabase 项目**（立即开始）
3. 🔄 **准备词汇数据**（并行进行）
4. 🔄 **搭建前端框架**（第一周）
5. 🔄 **开发核心功能**（第二周）

---

**让我们开始吧！** 🚀

准备好了吗？我们可以从创建 Supabase 项目和数据库结构开始！

