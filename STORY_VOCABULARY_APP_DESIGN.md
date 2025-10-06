# 故事接龙词汇学习应用 - 软件规划文档

## 📋 项目概述

### 项目名称
智慧故事坊 / 词语接龙学堂

### 核心理念
通过 AI 驱动的故事接龙游戏，让中小学生在创意写作中自然地学习和积累词汇，实现寓教于乐的个性化学习体验。

### 目标用户
- 主要：小学 3-6 年级学生（8-12 岁）
- 次要：初中生、中文学习者

### 核心价值
1. **情境化学习**：在故事语境中理解和使用词汇
2. **主动输出**：通过造句加深记忆，而非被动阅读
3. **个性化路径**：AI 根据学生水平智能调整学习内容
4. **游戏化激励**：结合文字冒险游戏元素，提升学习动机

---

## 🎮 核心玩法设计

### 基本流程

```
1. 选择故事类型（校园/冒险/奇幻等）
   ↓
2. AI 开启故事开端，给出首批词语选项
   ↓
3. 用户从 4 个词语中选 1 个，用它造句接龙
   ↓
4. AI 根据用户句子继续接龙，推进剧情
   ↓
5. AI 给出下一批词语选项（可点击查看释义）
   ↓
6. 重复步骤 3-5，共 15-20 轮
   ↓
7. 故事完结，展示学习成果和生词本
```

### 故事框架系统

#### 故事模板类型
1. **校园冒险** - 校园生活、友谊、成长
2. **自然探险** - 动植物、地形、天气
3. **奇幻之旅** - 想象力、魔法、奇遇
4. **历史穿越** - 历史事件、古代生活
5. **科学探索** - 科学知识、实验、发现

#### 故事结构（7 阶段模型）

| 阶段 | 名称 | 目标 | 轮次 |
|------|------|------|------|
| 1 | 开端 | 介绍主角、日常生活 | 2-3 轮 |
| 2 | 触发 | 发生特殊事件，打破常规 | 2-3 轮 |
| 3 | 探索 | 主角开始行动、调查 | 3-4 轮 |
| 4 | 困难 | 遇到障碍、挑战 | 2-3 轮 |
| 5 | 转折 | 获得关键线索或帮助 | 2-3 轮 |
| 6 | 高潮 | 解决核心问题 | 2-3 轮 |
| 7 | 结局 | 回归日常，有所成长 | 1-2 轮 |

### 文字冒险元素

#### 1. 关键选择节点
- 在特定阶段（第 2、4、6 阶段开始时）
- 提供剧情分支选择
- 不同选择→不同故事线→不同词汇组

**示例：**
```
阶段 2 触发事件：
A) 勇敢地独自探索 → 动作/冒险类词汇
B) 寻找朋友帮忙 → 情感/交流类词汇
```

#### 2. 角色属性系统（可选-第二阶段实现）
- 勇气值 / 智慧值 / 友谊值
- 词汇选择影响属性
- 属性影响后续可用选项

#### 3. 收集与成就
- 完成不同故事线获得"故事徽章"
- 使用特殊词汇类型（成语、四字词语）获得奖励
- 激励重玩和探索

---

## 🎯 词汇学习系统

### 词汇分级体系

| 等级 | 难度 | 词汇量 | 对应标准 | 示例 |
|------|------|--------|----------|------|
| L1 | 入门 | 500 | 小学 1-2 年级 | 高兴、朋友、学校 |
| L2 | 基础 | 800 | 小学 3-4 年级 | 兴奋、伙伴、操场 |
| L3 | 进阶 | 1000 | 小学 5-6 年级 | 欣喜若狂、志同道合 |
| L4 | 提高 | 1200 | 初中 | 欢欣鼓舞、心心相印 |
| L5 | 高级 | 1000 | 高中/HSK5 | 喜不自胜、莫逆之交 |
| L6 | 精通 | 500 | HSK6+ | 欢欣鼓舞、肝胆相照 |

### 词汇属性标签

每个词汇包含：
```json
{
  "word": "兴高采烈",
  "pinyin": "xìng gāo cǎi liè",
  "difficulty_level": 3,
  "word_type": "成语",
  "category": "情感-积极",
  "theme": ["校园", "日常"],
  "frequency": 450,
  "part_of_speech": "形容词"
}
```

### 智能词汇推荐算法

#### 推荐因素权重
1. **用户水平匹配** (40%)
   - 80% 当前水平词汇
   - 15% 低一级复习词汇
   - 5% 高一级挑战词汇

2. **故事场景匹配** (30%)
   - 当前阶段需要的词性
   - 故事主题相关词汇

3. **学习路径规划** (20%)
   - 间隔重复算法（SM-2）
   - 薄弱类别优先

4. **避免重复** (10%)
   - 最近 3 个故事已学过的词不再出现
   - 同一故事中不重复推荐

#### 自适应难度调节

监测指标：
- **流畅度**：造句时间（超过 60 秒视为困难）
- **跳过率**：跳过某词的频率
- **造句质量**：是否正确使用词汇（AI 判断）

调节策略：
```
if 连续 3 轮流畅完成:
    难度 +0.5 级
    
if 连续 2 次跳过或造句困难:
    难度 -0.5 级
    
每个故事后评估整体表现，调整用户 level
```

### 生词本功能

#### 收藏内容
- 词语及释义（从萌典 API 获取）
- 用户的造句
- 所属故事名称
- 添加时间

#### 复习功能
- 生词本专属小游戏：
  - 选词填空
  - 词语配对
  - 看释义猜词
- 间隔复习提醒

---

## 🏗️ 技术架构

### 技术栈选择

```
前端：HTML + JavaScript + CSS
代码托管：GitHub Pages
CDN 加速：Cloudflare (同步 GitHub)
后端：Supabase (Edge Functions + Database)
AI：DeepSeek API
词典：萌典 API (Moedict)
```

### 架构图

```
┌─────────────────────────────────────────────┐
│    前端 (GitHub Pages + Cloudflare CDN)     │
│  - 用户界面                                   │
│  - 故事展示                                   │
│  - 词汇点击查询 (萌典 API)                    │
│  - 本地状态管理                               │
│  - 全球 CDN 加速                              │
└──────────────────┬──────────────────────────┘
                   │
                   │ Supabase Client SDK
                   ↓
┌─────────────────────────────────────────────┐
│         Supabase Edge Functions              │
│  - story-agent (主函数)                       │
│  - vocabulary-recommend (词汇推荐)            │
│  - user-progress (用户进度分析)               │
│  ├─ AI Agent 逻辑                            │
│  ├─ 故事框架引擎                              │
│  ├─ 词汇推荐引擎                              │
│  └─ 自适应难度调节                            │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴─────────┐
          ↓                  ↓
┌─────────────────┐  ┌──────────────────┐
│  DeepSeek API   │  │ Supabase DB      │
│  - 故事生成      │  │ - 用户数据        │
│  - 内容续写      │  │ - 词汇库          │
│  - 智能引导      │  │ - 学习记录        │
└─────────────────┘  │ - 故事会话        │
                     └──────────────────┘
```

### Cloudflare 集成优势

通过 Cloudflare 同步 GitHub Pages，可获得以下优势：

#### 性能优化
- **全球 CDN 加速** - 静态资源在全球节点缓存，中国大陆用户访问更快
- **智能路由** - 自动选择最快的服务器响应
- **HTTP/3 支持** - 更快的连接建立和数据传输
- **自动压缩** - Brotli/Gzip 自动压缩，减少传输量

#### 安全防护
- **DDoS 防护** - 免费的基础 DDoS 防护
- **SSL/TLS** - 免费 HTTPS 证书，自动续期
- **防火墙规则** - 可设置访问规则，阻止恶意请求
- **Bot 管理** - 识别和过滤恶意爬虫

#### 开发便利
- **实时部署** - GitHub 推送后自动同步到 Cloudflare
- **缓存控制** - 可通过 Cloudflare 控制台清除缓存
- **分析数据** - 访问量、流量、性能等数据分析
- **自定义域名** - 轻松配置自定义域名

#### 未来扩展选项（可选）

如果未来需要，Cloudflare 还提供：

**Cloudflare Workers** - 边缘计算服务
- 可作为 Supabase Edge Functions 的补充
- 处理简单的 API 请求（如词汇查询缓存）
- 内容个性化（根据用户地区显示不同内容）
- 成本：免费额度 10 万请求/天

**Cloudflare R2** - 对象存储
- 如需存储故事插图、音频等媒体文件
- 比 S3 更便宜（无流量费）
- 与 Cloudflare CDN 天然集成

**Cloudflare Pages Functions** - Serverless 函数
- 可替代部分 Supabase Functions（如果成本考虑）
- 与前端代码在同一仓库管理

> 💡 **建议**：MVP 阶段只用 Cloudflare CDN 即可，暂不需要 Workers 等高级功能。待业务增长后再根据需求评估。

---

### 数据库设计

#### 1. users (用户表)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  current_level DECIMAL(2,1) DEFAULT 2.0,  -- 2.0 表示 L2 级别
  total_vocabulary_learned INT DEFAULT 0,
  total_stories_completed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP
);
```

#### 2. vocabulary (词汇表 - 预置数据)
```sql
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  pinyin TEXT,
  difficulty_level INT NOT NULL,  -- 1-6
  word_type TEXT,  -- 成语/名词/动词/形容词等
  category TEXT,  -- 情感-积极/动作-快速/描写-自然等
  theme TEXT[],  -- ['校园', '日常']
  frequency INT,  -- 使用频率
  part_of_speech TEXT[],  -- ['形容词', '副词']
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vocab_difficulty ON vocabulary(difficulty_level);
CREATE INDEX idx_vocab_theme ON vocabulary USING GIN(theme);
```

#### 3. user_vocabulary (用户词汇学习记录)
```sql
CREATE TABLE user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES vocabulary(id),
  mastery_level INT DEFAULT 0,  -- 0-100 掌握程度
  first_learned_at TIMESTAMP DEFAULT NOW(),
  last_reviewed_at TIMESTAMP,
  times_used INT DEFAULT 0,
  times_skipped INT DEFAULT 0,
  user_sentences JSONB DEFAULT '[]',  -- 用户造的句子历史
  next_review_at TIMESTAMP,  -- 下次复习时间（间隔重复）
  
  UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_user_vocab_user ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocab_review ON user_vocabulary(next_review_at);
```

#### 4. story_sessions (故事会话)
```sql
CREATE TABLE story_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  story_type TEXT NOT NULL,  -- '校园冒险'/'自然探索'等
  story_title TEXT,
  current_stage INT DEFAULT 1,  -- 1-7
  current_round INT DEFAULT 0,
  max_rounds INT DEFAULT 18,
  choices_made JSONB DEFAULT '[]',  -- 用户做的关键选择
  conversation_history JSONB DEFAULT '[]',  -- 完整对话
  vocabulary_used UUID[] DEFAULT '{}',  -- 本次使用的词汇 ID
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'active'  -- active/completed/abandoned
);

CREATE INDEX idx_story_user ON story_sessions(user_id);
CREATE INDEX idx_story_status ON story_sessions(status);
```

#### 5. user_wordbook (用户生词本)
```sql
CREATE TABLE user_wordbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES vocabulary(id),
  user_note TEXT,  -- 用户笔记
  example_sentence TEXT,  -- 用户造的例句
  from_story_id UUID REFERENCES story_sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, vocabulary_id)
);
```

#### 6. story_templates (故事模板配置)
```sql
CREATE TABLE story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  theme_tags TEXT[],
  difficulty_range INT[],  -- [2, 4] 表示适合 L2-L4
  stage_prompts JSONB,  -- 每个阶段的 AI prompt 模板
  vocabulary_preferences JSONB,  -- 词汇类型偏好
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🤖 AI Agent 设计

### Edge Function: story-agent

#### 主要职责
1. 接收用户输入，调用 DeepSeek API 生成 AI 回应
2. 维护故事状态，确保剧情连贯
3. 推荐合适词汇
4. 更新用户学习数据

#### 核心逻辑流程

```typescript
async function storyAgent(request) {
  // 1. 解析请求
  const { userId, sessionId, userInput, selectedWord } = await request.json();
  
  // 2. 获取上下文
  const session = await getStorySession(sessionId);
  const userProfile = await getUserProfile(userId);
  const template = await getStoryTemplate(session.story_type);
  
  // 3. 更新用户词汇记录
  await recordVocabularyUsage(userId, selectedWord, userInput);
  
  // 4. 判断是否需要推进故事阶段
  const shouldAdvanceStage = checkStageAdvancement(session);
  if (shouldAdvanceStage) {
    session.current_stage++;
  }
  
  // 5. 构建 DeepSeek Prompt
  const systemPrompt = buildSystemPrompt({
    storyType: session.story_type,
    currentStage: session.current_stage,
    stageGoal: template.stage_prompts[session.current_stage],
    characterInfo: session.choices_made,
    recentHistory: session.conversation_history.slice(-4)
  });
  
  const userPrompt = `用户使用"${selectedWord}"造句：${userInput}\n请根据这句话继续故事，推进到${getStageDescription(session.current_stage)}。`;
  
  // 6. 调用 DeepSeek API
  const aiResponse = await callDeepSeek({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.8,
    max_tokens: 200
  });
  
  // 7. 推荐下一批词汇
  const nextVocabulary = await recommendVocabulary({
    userId,
    userLevel: userProfile.current_level,
    storyStage: session.current_stage,
    storyTheme: session.story_type,
    recentWords: session.vocabulary_used,
    count: 4
  });
  
  // 8. 更新会话记录
  await updateSession(sessionId, {
    current_round: session.current_round + 1,
    current_stage: session.current_stage,
    conversation_history: [
      ...session.conversation_history,
      { role: 'user', content: userInput, word: selectedWord, round: session.current_round },
      { role: 'ai', content: aiResponse, round: session.current_round }
    ]
  });
  
  // 9. 检查是否完成
  const isCompleted = session.current_round >= session.max_rounds || 
                      session.current_stage > 7;
  
  if (isCompleted) {
    await completeStory(sessionId);
  }
  
  // 10. 返回结果
  return {
    success: true,
    aiResponse,
    nextVocabulary,
    storyProgress: {
      stage: session.current_stage,
      round: session.current_round + 1,
      maxRounds: session.max_rounds,
      isCompleted
    },
    userStats: await getUserStats(userId)
  };
}
```

### DeepSeek Prompt 设计

#### System Prompt 模板

```
你是一位专业的儿童故事创作者和语文教师。你正在和一位${userAge}岁的小学生进行故事接龙游戏。

【故事类型】${storyType}
【当前阶段】${currentStage}/7 - ${stageDescription}
【阶段目标】${stageGoal}

【核心规则】
1. 你的每次回应必须在 80-120 字之间
2. 语言要适合小学生理解，生动有趣
3. 必须根据学生的句子自然延续故事
4. 推进剧情向当前阶段目标发展
5. 在你的句子中自然使用 2-3 个值得学习的词汇（标注为：<词>学习词</词>）
6. 保持角色和场景的一致性
7. 留下接续空间，不要一次性讲完故事

【故事背景】
${storyContext}

【最近剧情】
${recentHistory}

请根据学生的句子继续故事，确保剧情连贯且富有趣味性。
```

#### User Prompt 格式

```
用户使用"${selectedWord}"造句：${userInput}

请根据这句话继续故事。当前需要${stageGoal}。
```

---

## 🎨 前端界面设计

### 页面结构

#### 1. 首页/故事选择
```
┌────────────────────────────────────────┐
│  🎭 智慧故事坊                          │
│                                        │
│  你的等级：L2  词汇量：156  故事：12    │
│                                        │
│  ┌──────────┐  ┌──────────┐           │
│  │ 🏫 校园   │  │ 🌲 冒险   │           │
│  │  冒险    │  │  探索    │           │
│  └──────────┘  └──────────┘           │
│                                        │
│  ┌──────────┐  ┌──────────┐           │
│  │ ✨ 奇幻   │  │ 📚 历史   │           │
│  │  之旅    │  │  穿越    │           │
│  └──────────┘  └──────────┘           │
│                                        │
│  📖 继续上次的故事                      │
│  📚 我的生词本 (23个词)                 │
└────────────────────────────────────────┘
```

#### 2. 故事接龙界面
```
┌────────────────────────────────────────┐
│ ← 退出  校园奇遇记  [===·····] 4/18    │
├────────────────────────────────────────┤
│                                        │
│  🤖 AI：                               │
│  ┌──────────────────────────────────┐  │
│  │ 小明走进教室，发现黑板上写着一   │  │
│  │ 行奇怪的<词>字迹</词>。他<词>好  │  │
│  │ 奇</词>地走近，仔细<词>端详</词>  │  │
│  │ 着...                            │  │
│  └──────────────────────────────────┘  │
│                                        │
│  📝 请选择一个词语来造句：              │
│                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │疑惑   │ │仔细   │ │发现   │ │激动   │ │
│  │yíhuò │ │zǐxì  │ │fāxiàn│ │jīdòng│ │
│  │ⓘ ⭐  │ │ⓘ    │ │ⓘ    │ │ⓘ ⭐  │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│                                        │
│  💬 你的句子：                          │
│  ┌──────────────────────────────────┐  │
│  │ [输入框]                         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  提示：试着描述小明看到字迹后的反应     │
│                                        │
│  [🎯 提交句子]  [❓ 跳过这个词]         │
│                                        │
└────────────────────────────────────────┘
```

#### 3. 词语详情弹窗（点击 ⓘ 图标）
```
┌─────────────────────────┐
│  疑惑  yí huò          │
│                         │
│  【释义】                │
│  心中不明白，感到迷茫    │
│                         │
│  【例句】                │
│  他疑惑地看着这封信      │
│                         │
│  【词性】动词、形容词    │
│                         │
│  [⭐ 加入生词本]  [关闭] │
└─────────────────────────┘
```

#### 4. 故事完成界面
```
┌────────────────────────────────────────┐
│  🎉 故事完成！                          │
│                                        │
│  📖 校园奇遇记                          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  [完整故事文本，用户句子高亮]    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  📊 学习成果                            │
│  • 本次使用 15 个词汇                   │
│  • 其中 8 个是新学词汇                  │
│  • 你的等级提升到 L2.3                  │
│                                        │
│  📚 本次学习的词汇                      │
│  [疑惑] [仔细] [发现] [激动] ...        │
│                                        │
│  [🔖 查看完整生词本]  [🎮 开始新故事]   │
└────────────────────────────────────────┘
```

#### 5. 生词本界面
```
┌────────────────────────────────────────┐
│  ← 返回  📚 我的生词本                  │
├────────────────────────────────────────┤
│  已收藏 23 个词                         │
│  [全部] [按主题] [按时间] [复习模式]    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 疑惑  yí huò                     │  │
│  │ 心中不明白，感到迷茫              │  │
│  │                                  │  │
│  │ 我的句子：                        │  │
│  │ "小明疑惑地看着黑板上的字"        │  │
│  │                                  │  │
│  │ 来自：校园奇遇记  2024-10-01      │  │
│  │ [🗑️ 移除]                        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 端详  duān xiáng                 │  │
│  │ ...                              │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 交互细节

#### 词汇卡片交互
1. **点击词语** → 显示详情弹窗（调用萌典 API）
2. **点击星标 ⭐** → 加入/移出生词本
3. **选中词语** → 高亮显示，输入框提示更新

#### 智能提示系统
- 用户 30 秒未输入 → 显示提示："你可以这样开始：小明觉得..."
- 输入少于 5 个字 → "句子可以再长一点哦"
- 未使用选定词语 → "别忘了使用你选的词语：疑惑"
- 用词不当 → "这个词通常用在...情况，要不要换一个词试试？"

#### AI 句子中的可学习词汇
- 使用 `<词>...</词>` 标记
- 前端渲染为可点击的彩色文字
- 点击后同样调用萌典 API 显示详情

---

## 📅 实施计划

### 阶段一：MVP（2 周）

**目标**：验证核心玩法可行性

**任务清单**：
- [ ] 环境准备
  - [ ] 确认 GitHub Pages + Cloudflare 同步正常
  - [ ] 创建 Supabase 项目
  - [ ] 配置 Supabase 环境变量（DeepSeek API Key）
  - [ ] 创建数据库表（users, vocabulary, user_vocabulary, story_sessions, user_wordbook）
  - [ ] 配置 CORS（允许从您的域名访问 Supabase）
  
- [ ] 词汇数据准备
  - [ ] 收集 L1-L3 级别词汇（共 2000 个）
  - [ ] 为每个词汇标注属性（难度、主题、类型等）
  - [ ] 导入到 vocabulary 表
  
- [ ] 后端开发
  - [ ] 创建 Edge Function: `story-agent`
  - [ ] 实现基础故事接龙逻辑
  - [ ] 实现简单词汇推荐（随机 + 难度匹配）
  - [ ] DeepSeek API 集成
  - [ ] 测试 API 调用
  
- [ ] 前端开发
  - [ ] 创建故事接龙主界面
  - [ ] 实现词汇卡片组件
  - [ ] 集成萌典 API（词语详情查询）
  - [ ] 实现用户输入和提交逻辑
  - [ ] Supabase Client 集成
  - [ ] 基础样式设计
  
- [ ] 核心功能
  - [ ] 1 个故事模板（校园冒险）
  - [ ] 用户可选词造句接龙
  - [ ] AI 根据用户句子续写故事
  - [ ] 点击词语查看详情
  - [ ] 生词本收藏功能
  - [ ] 完成 15 轮接龙
  
- [ ] 测试与优化
  - [ ] 完整流程测试
  - [ ] AI 回应质量调优
  - [ ] 修复 bug

**交付物**：
- 可运行的 MVP 应用
- 1 个完整故事模板
- 基础词汇库（2000 词）

---

### 阶段二：完善核心功能（3 周）

**目标**：丰富内容，优化学习体验

**任务清单**：
- [ ] 故事系统扩展
  - [ ] 添加 4 个故事模板（自然探险、奇幻之旅、历史穿越、科学探索）
  - [ ] 实现故事分支选择功能
  - [ ] 完善 7 阶段故事结构引擎
  - [ ] 故事完成总结页面
  
- [ ] 词汇系统优化
  - [ ] 扩充词汇库到 5000+ 词（L1-L6）
  - [ ] 实现智能词汇推荐算法
  - [ ] 实现自适应难度调节
  - [ ] 添加词汇主题标签系统
  
- [ ] 学习追踪
  - [ ] 用户学习进度统计
  - [ ] 词汇掌握度计算
  - [ ] 学习曲线可视化
  - [ ] 每日学习目标设置
  
- [ ] 生词本增强
  - [ ] 生词本分类（按主题/时间/掌握度）
  - [ ] 生词本复习小游戏（选词填空、配对游戏）
  - [ ] 间隔重复提醒
  
- [ ] UI/UX 优化
  - [ ] 美化界面设计
  - [ ] 添加动画效果
  - [ ] 移动端适配
  - [ ] 智能提示系统完善
  
- [ ] 用户系统
  - [ ] 用户注册/登录（Supabase Auth）
  - [ ] 个人资料页面
  - [ ] 学习成就徽章
  - [ ] 跨设备数据同步

**交付物**：
- 5 个完整故事模板
- 完善的词汇学习系统
- 用户进度追踪
- 优化的用户体验

---

### 阶段三：高级功能（4 周）

**目标**：增强游戏性和社交性

**任务清单**：
- [ ] 游戏化元素
  - [ ] 角色属性系统（勇气/智慧/友谊值）
  - [ ] 故事徽章收集
  - [ ] 成就系统
  - [ ] 每日任务
  - [ ] 连续签到奖励
  
- [ ] AI Agent 智能化
  - [ ] 学习路径规划引擎
  - [ ] 个性化词汇推荐
  - [ ] 学习效果预测
  - [ ] 薄弱环节识别
  
- [ ] 内容创作工具
  - [ ] 教师/家长可自定义故事模板
  - [ ] 自定义词汇包上传
  - [ ] 学习计划制定工具
  
- [ ] 社交功能
  - [ ] 分享故事到社区
  - [ ] 查看他人的创意故事
  - [ ] 好友系统
  - [ ] 排行榜（词汇量/故事数）
  
- [ ] 数据分析
  - [ ] 学习报告生成（周报/月报）
  - [ ] 词汇掌握热力图
  - [ ] 学习建议生成
  - [ ] 家长查看学习进度
  
- [ ] 内容安全
  - [ ] 用户输入内容审核
  - [ ] AI 生成内容过滤
  - [ ] 举报机制

**交付物**：
- 完整的游戏化系统
- 智能学习助手
- 社交分享功能
- 数据分析报告

---

## 🚀 部署流程

### 开发环境设置

1. **前端开发**
   ```bash
   # 在本地开发
   cd /your/project/directory
   # 直接编辑 HTML/JS/CSS 文件
   # 用浏览器打开文件测试
   ```

2. **Supabase 本地测试**
   ```bash
   # 安装 Supabase CLI（可选）
   npm install -g supabase
   
   # 或直接在 Supabase Dashboard 上开发和测试
   ```

### 生产环境部署

#### 前端部署（已有流程）

1. **推送到 GitHub**
   ```bash
   git add .
   git commit -m "添加故事接龙功能"
   git push origin main
   ```

2. **Cloudflare 自动同步**
   - Cloudflare 会自动检测 GitHub 更新
   - 通常在 1-2 分钟内完成同步
   - 可在 Cloudflare Dashboard 查看部署状态

3. **清除缓存（如需要）**
   - 登录 Cloudflare Dashboard
   - 进入 "Caching" → "Configuration"
   - 点击 "Purge Everything" 清除所有缓存

#### 后端部署（Supabase）

1. **创建 Supabase 项目**
   - 访问 https://supabase.com
   - 创建新项目
   - 记录项目 URL 和 API Key

2. **设置数据库表**
   - 在 Supabase Dashboard 的 "SQL Editor" 中
   - 运行数据库建表 SQL（见文档 "数据库设计" 章节）

3. **部署 Edge Functions**
   ```bash
   # 安装 Supabase CLI
   npm install -g supabase
   
   # 登录
   supabase login
   
   # 关联项目
   supabase link --project-ref your-project-ref
   
   # 部署函数
   supabase functions deploy story-agent
   ```

4. **配置环境变量**
   - 在 Supabase Dashboard 的 "Edge Functions" → "Settings"
   - 添加环境变量：`DEEPSEEK_API_KEY`

#### 配置前端连接后端

在前端代码中添加 Supabase 配置：

```javascript
// config.js
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### CORS 配置

确保 Supabase 允许您的域名访问：

1. 在 Supabase Dashboard → "Authentication" → "URL Configuration"
2. 添加您的域名到 "Site URL" 和 "Redirect URLs"
3. 例如：`https://chineseclassics.github.io`

### 部署检查清单

#### 前端
- [ ] HTML/CSS/JS 文件已优化（压缩、合并）
- [ ] 图片资源已优化（压缩、WebP 格式）
- [ ] 推送到 GitHub 成功
- [ ] Cloudflare 同步完成
- [ ] 浏览器访问正常

#### 后端
- [ ] Supabase 项目创建完成
- [ ] 数据库表已创建
- [ ] Edge Functions 部署成功
- [ ] 环境变量配置完成
- [ ] API 调用测试通过

#### 集成测试
- [ ] 前端可以连接 Supabase
- [ ] 用户注册/登录正常
- [ ] 故事接龙功能正常
- [ ] 词汇查询（萌典 API）正常
- [ ] 数据持久化正常

### 监控与维护

#### Cloudflare 监控
- 访问 Cloudflare Dashboard
- 查看流量、性能、安全统计
- 设置邮件告警（流量异常、攻击等）

#### Supabase 监控
- 查看 API 请求量和响应时间
- 监控数据库大小和查询性能
- 查看 Edge Functions 执行日志

#### 日志查看
```bash
# 查看 Edge Functions 日志
supabase functions logs story-agent

# 实时日志
supabase functions logs story-agent --tail
```

---

## 💰 成本估算

### 免费服务额度

#### GitHub Pages
- **完全免费**
- 每月 100GB 流量
- 每小时 10 次构建

#### Cloudflare（免费计划）
- **完全免费**
- 无限流量
- 全球 CDN 加速
- 免费 SSL 证书
- 基础 DDoS 防护
- Workers：10 万请求/天（本项目暂不使用）

#### Supabase 免费额度
- 数据库：500MB（足够初期使用）
- Edge Functions：50 万次调用/月
- 认证：5 万活跃用户/月
- 存储：1GB
- 数据传输：2GB/月

**使用量预估**（100 个活跃用户）：
- 100 用户 × 2 故事/天 = 200 故事/天
- 200 故事 × 18 轮 = 3,600 次 API 调用/天
- 月调用量：3,600 × 30 = 10.8 万次/月

✅ **完全在免费额度内**

### DeepSeek API 成本
- 输入：1 元 / 100 万 tokens
- 输出：2 元 / 100 万 tokens

**预计**：
- 每轮对话：输入 500 tokens + 输出 150 tokens
- 每个故事 18 轮：9000 输入 + 2700 输出 tokens
- 100 个用户/天 × 2 故事 = 200 故事/天
- 月消耗：200 × 30 × (9000 + 2700) = 7020 万 tokens
- 月成本：70 × 1 + 21 × 2 = 112 元/月

✅ 成本可控

### 总成本（月）

| 服务 | 初期（<500 用户） | 中期（500-2000 用户） |
|------|------------------|---------------------|
| GitHub Pages | 免费 | 免费 |
| Cloudflare CDN | 免费 | 免费 |
| Supabase | 免费 | 免费（可能需升级到 $25/月） |
| DeepSeek API | ~100-200 元 | ~500-1000 元 |
| **总计** | **~100-200 元/月** | **~500-1200 元/月** |

💡 **成本优化建议**：
- 使用 Cloudflare Workers 缓存常用 API 响应，减少 DeepSeek 调用
- 实现智能的对话历史压缩，减少 tokens 消耗
- 对于简单的 AI 回应，可以使用预设模板，减少 API 调用

🎉 **结论**：得益于 GitHub Pages + Cloudflare 的免费方案，基础设施完全零成本，只需支付 AI API 费用，非常经济实惠！

---

## 🎯 成功指标 (KPI)

### 用户参与度
- 日活跃用户数 (DAU)
- 平均会话时长
- 故事完成率（目标 >70%）
- 用户留存率（次日/7 日/30 日）

### 学习效果
- 平均每个故事学习词汇数（目标 8-12 个）
- 生词本使用率（目标 >50% 用户）
- 词汇复习频率
- 用户等级提升速度

### 内容质量
- AI 回应连贯性（人工评估）
- 故事完整性评分
- 用户满意度（问卷调查）

### 技术指标
- API 响应时间（目标 <3 秒）
- 错误率（目标 <1%）
- 系统可用性（目标 >99%）

---

## 🔐 安全与隐私

### 数据安全
- DeepSeek API Key 存储在 Supabase 环境变量
- 用户密码使用 Supabase Auth 加密存储
- 所有 API 调用通过 HTTPS

### 内容安全
- 用户输入内容关键词过滤
- AI 生成内容事后审核
- 敏感词库定期更新

### 隐私保护
- 遵守儿童在线隐私保护法规
- 最小化数据收集
- 家长可查看/删除孩子数据
- 明确隐私政策

---

## 📱 未来扩展方向

### 短期（6 个月内）
- 移动 App（React Native）
- 更多故事主题（科幻、武侠、童话）
- 语音朗读功能
- 图片插画生成（配合故事）

### 中期（1 年内）
- 多人协作故事（2-4 人一起接龙）
- 教师版（班级管理、作业布置）
- 家长版（学习监控、进度报告）
- 词汇测试与评估

### 长期（2 年内）
- 英语版本
- 其他语言学习（日语、韩语等）
- AI 角色扮演对话
- 虚拟学习伙伴

---

## 🤝 团队与协作

### 技术栈要求
- 前端：HTML/CSS/JavaScript
- 后端：TypeScript (Deno - Supabase Edge Functions)
- 数据库：PostgreSQL (Supabase)
- AI：DeepSeek API

### 开发角色
- 全栈开发（1 人）- MVP 阶段可由您独立完成
- UI/UX 设计（外包或使用模板）
- 词汇内容编辑（需要语文教育背景）
- 测试与质量保证

---

## 📚 参考资源

### 技术文档
- [Supabase 官方文档](https://supabase.com/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [萌典 API](https://github.com/g0v/moedict-webkit)

### 教育资源
- 小学语文课程标准词汇表
- HSK 词汇表
- 现代汉语常用词表

### 灵感参考
- AI Dungeon（文字冒险游戏）
- Duolingo（游戏化语言学习）
- 成语接龙游戏

---

## 📝 附录

### A. 示例故事流程

**故事类型**：校园冒险  
**预估时长**：20 分钟  
**词汇数量**：15 个新词

#### 完整流程示例

**【开端 - 第 1 轮】**

AI：今天是周一的早晨，小明背着书包走进校园。阳光洒在<词>熟悉</词>的操场上，一切看起来都很<词>平常</词>。

词语选项：[兴奋][紧张][好奇][平静]  
用户选择：好奇  
用户造句：小明好奇地看着远处的教学楼。

**【开端 - 第 2 轮】**

AI：走近教学楼，小明突然注意到楼梯口贴着一张<词>特别</词>的海报。海报上画着一把<词>神秘</词>的钥匙，下面写着"寻找隐藏的宝藏"。

词语选项：[疑惑][激动][害怕][冷静]  
用户选择：激动  
用户造句：小明激动地凑近海报仔细阅读。

**【触发 - 第 3 轮】**

*关键选择*：你决定...
A) 立刻开始寻宝冒险
B) 先找同学商量

用户选择：A

AI：小明决定立刻行动！根据海报的<词>线索</词>，第一站是图书馆。他<词>迅速</词>跑向图书馆，推开门的那一刻，一阵<词>古老</词>书香扑面而来。

词语选项：[仔细][慌张][小心][大胆]  
...

*（继续 15 轮，经过探索→困难→转折→高潮→结局）*

---

### B. DeepSeek Prompt 完整示例

```
【系统提示】
你是一位专业的儿童故事创作者和语文教师。你正在和一位 10 岁的小学生进行故事接龙游戏。

【故事类型】校园冒险
【当前阶段】3/7 - 探索阶段
【阶段目标】主角开始探索和调查，寻找线索，推进冒险进程

【核心规则】
1. 每次回应 80-120 字
2. 语言生动有趣，适合小学生
3. 必须根据学生的句子自然延续
4. 推进剧情向"探索寻找线索"发展
5. 在句子中使用 2-3 个学习词汇，格式：<词>词语</词>
6. 保持角色一致性（主角：小明，10 岁男生，好奇心强）
7. 留下接续空间

【故事背景】
地点：阳光小学校园
主角：小明，好奇心强的小学生
事件：发现寻宝海报，开始探索
已完成：看到海报，决定寻宝，来到图书馆

【最近剧情】
- 小明在校园看到寻宝海报
- 他激动地决定开始寻宝
- 根据线索来到图书馆
- 用户刚说：小明小心地推开图书馆的门，环顾四周。

【任务】
请根据学生的句子"小明小心地推开图书馆的门，环顾四周"继续故事，描述图书馆里的发现，推进探索进程。
```

---

### C. 词汇推荐算法伪代码

```python
def recommend_vocabulary(user_id, story_session, count=4):
    """
    推荐下一批词汇
    """
    # 1. 获取用户信息
    user = get_user(user_id)
    user_level = user.current_level  # 例如 2.3
    
    # 2. 确定难度范围
    difficulty_range = [
        int(user_level) - 1,  # 复习：1
        int(user_level),      # 当前：2
        int(user_level) + 1   # 挑战：3
    ]
    
    # 3. 获取故事上下文
    story_stage = story_session.current_stage
    story_theme = story_session.story_type
    used_words = story_session.vocabulary_used
    
    # 4. 确定词汇类型需求（根据故事阶段）
    required_types = get_required_word_types(story_stage)
    # 例如：探索阶段 → ['动作', '观察', '发现']
    
    # 5. 查询候选词汇
    candidates = db.query("""
        SELECT * FROM vocabulary
        WHERE difficulty_level IN :difficulty_range
        AND :story_theme = ANY(theme)
        AND category IN :required_types
        AND id NOT IN :used_words
        AND id NOT IN (
            SELECT vocabulary_id FROM user_vocabulary
            WHERE user_id = :user_id
            AND last_reviewed_at > NOW() - INTERVAL '3 days'
        )
        ORDER BY RANDOM()
        LIMIT 20
    """)
    
    # 6. 智能打分排序
    scored_words = []
    for word in candidates:
        score = 0
        
        # 难度匹配分数
        if word.difficulty_level == int(user_level):
            score += 40
        elif word.difficulty_level == int(user_level) - 1:
            score += 30
        else:
            score += 10
        
        # 主题匹配分数
        if story_theme in word.theme:
            score += 20
        
        # 词性匹配分数
        if word.category in required_types:
            score += 20
        
        # 学习记录加分
        user_vocab = get_user_vocabulary(user_id, word.id)
        if user_vocab:
            # 需要复习的词
            days_since_review = (now - user_vocab.last_reviewed_at).days
            if 3 <= days_since_review <= 7:
                score += 15
        else:
            # 全新词汇
            score += 10
        
        # 使用频率分数（常用词优先）
        score += min(word.frequency / 100, 10)
        
        scored_words.append((word, score))
    
    # 7. 按分数排序并选择
    scored_words.sort(key=lambda x: x[1], reverse=True)
    
    # 8. 确保多样性（不要全是同一类型）
    selected = []
    categories_used = set()
    
    for word, score in scored_words:
        if len(selected) >= count:
            break
        # 尽量不重复类别
        if word.category not in categories_used or len(selected) >= count - 1:
            selected.append(word)
            categories_used.add(word.category)
    
    return selected

def get_required_word_types(stage):
    """
    根据故事阶段返回需要的词汇类型
    """
    stage_types = {
        1: ['描写-日常', '情感-平静'],  # 开端
        2: ['情感-惊讶', '感官-视觉'],  # 触发
        3: ['动作-移动', '思考-分析'],  # 探索
        4: ['情感-紧张', '动作-对抗'],  # 困难
        5: ['情感-希望', '思考-顿悟'],  # 转折
        6: ['动作-决定', '情感-激动'],  # 高潮
        7: ['情感-平静', '思考-总结']   # 结局
    }
    return stage_types.get(stage, ['通用'])
```

---

## 结语

这是一个富有创意和教育价值的项目，结合了 AI 技术、游戏化学习和个性化教育。通过故事接龙的形式，让词汇学习变得有趣而自然。

采用 Supabase + DeepSeek 的架构，既保证了安全性和可扩展性，又控制了成本。建议按照三阶段实施计划逐步推进，先验证核心玩法，再扩展功能。

期待这个应用能够帮助更多中小学生爱上阅读和写作，在快乐中积累词汇！

---

**文档版本**：v1.0  
**创建日期**：2025-10-06  
**最后更新**：2025-10-06

