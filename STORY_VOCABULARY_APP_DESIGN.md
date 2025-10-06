# 故事接龙词汇学习应用 - 软件规划文档

## 📋 项目概述

### 项目名称
智慧故事坊 / 词语接龙学堂

### 核心理念
通过 AI 驱动的故事接龙游戏，让中小学生在创意写作中自然地学习和积累词汇，实现寓教于乐的个性化学习体验。

### 目标用户
- **年龄范围**：7-18 岁（小学 2 年级 - 高中 3 年级）
- **核心用户群**：
  - 小学生（7-12 岁）- 基础词汇积累，培养创作兴趣
  - 初中生（13-15 岁）- 词汇深化，表达能力提升
  - 高中生（16-18 岁）- 高级词汇，文学创作
- **次要用户**：中文学习者（HSK 2-6 级）

### 核心价值（重新排序，强调吸引力）

#### 🎯 第一层：核心吸引力（让学生想用）
1. **意想不到的故事体验**：每次都能和 AI 创作出一个连自己都没想到的有趣故事
2. **真正的创作伙伴**：AI 不是老师，而是一个富有创意的创作搭档
3. **发现的惊喜感**：故事发展充满不确定性，不知道下一步会发生什么
4. **创作成就感**：完成故事后的满足感和分享欲望

#### 📚 第二层：学习价值（自然而然地学习）
1. **情境化词汇学习**：在精彩的故事中自然理解和使用词汇
2. **主动表达输出**：用词汇来表达自己的创意，而非被动记忆
3. **个性化学习路径**：AI 根据年龄和水平智能匹配词汇难度
4. **无痛学习体验**：专注于创作，学习在不知不觉中发生

**设计哲学**：
> "学生不是因为想学词汇而来，而是因为想创作有趣的故事而来。
> 词汇学习是创作的工具，而非目的本身。
> 当创作体验足够吸引人，学习自然就发生了。"

---

## 📊 市场调研与竞品分析

### 相关产品调研

#### 国际市场

**1. AI Dungeon（美国）**
- **特点**：基于 GPT 的文字冒险游戏，用户可以自由输入任何文字，AI 会根据输入生成故事
- **优势**：极高的自由度，每次体验完全不同
- **劣势**：缺乏教育目标，没有词汇学习功能，故事可能失控
- **借鉴点**：AI 动态生成故事的机制，防止故事跑偏的技术

**2. Sudowrite（创意写作工具）**
- **特点**：AI 辅助创意写作工具，提供续写、重写、头脑风暴等功能
- **优势**：AI 创作建议很有创意，适合作家使用
- **劣势**：面向成人专业作家，不适合儿童学习
- **借鉴点**：AI 提供多种续写选项的机制

**3. Storium（协作故事写作平台）**
- **特点**：多人协作创作故事的平台，有角色卡和场景卡系统
- **优势**：结构化的故事创作，社区活跃
- **劣势**：需要多人参与，学习成本高
- **借鉴点**：卡片系统和故事结构设计

**4. Twine / Ink（互动小说引擎）**
- **特点**：开源的交互式小说创作工具，支持分支选择
- **优势**：灵活的分支系统，可视化编辑
- **劣势**：需要预先编写所有分支，不能动态生成
- **借鉴点**：分支选择的 UI 设计

#### 华语市场

**1. PaGamO（台湾，叶丙成开发）**
- **特点**：游戏化学习平台，通过答题攻占领土
- **优势**：游戏化设计成功，学生参与度高
- **劣势**：传统的题目形式，缺乏创意表达
- **借鉴点**：游戏化激励机制

**2. 均一教育平台（台湾）**
- **特点**：非营利在线教育平台，提供各学科学习资源
- **优势**：内容体系完整，进度追踪清晰
- **劣势**：偏向传统教学，互动性不强
- **借鉴点**：学习进度管理和数据分析

**3. 传统词语/成语接龙游戏**
- **特点**：中文传统文字游戏，根据词语最后一字接下一个词
- **优势**：简单易懂，适合各年龄段
- **劣势**：机械重复，缺乏故事性和创意
- **借鉴点**：接龙的基本玩法

**4. 幼儿园语词接龙教学活动**
- **特点**：教师引导的课堂活动，用卡片进行词语接龙
- **优势**：寓教于乐，培养语言能力
- **劣势**：依赖教师引导，难以个性化
- **借鉴点**：词汇卡片的展示方式

#### 市场空白点分析

**目前市场缺失的产品特征（我们的机会）：**

1. ✅ **AI + 创意故事 + 词汇学习**的三合一
   - AI Dungeon 有 AI 和故事，但没有学习目标
   - PaGamO 有学习，但没有创意故事
   - 传统接龙有词汇，但没有 AI 和故事

2. ✅ **真正的共同创作体验**
   - 大部分教育产品是"完成任务"
   - 少有让学生感到"在创作"的产品

3. ✅ **防套路化机制**
   - 现有 AI 写作工具往往句式重复
   - 我们强调每次都不一样

4. ✅ **7-18 岁全年龄段覆盖**
   - 大部分产品针对单一年龄段
   - 我们提供完整的分级系统

5. ✅ **创意度量化与激励**
   - 传统教育软件关注"对错"和"分数"
   - 我们关注"创意"和"惊喜"

**结论**：这是一个**蓝海市场**，目前没有直接竞品！

---

## 🛠️ 技术平台与工具选型

### 推荐的技术栈（已确定）

#### 前端技术

**基础选择：HTML + Vanilla JavaScript + CSS**
- ✅ 无需构建工具，开发效率高
- ✅ 适合您当前的技术栈
- ✅ GitHub Pages 直接托管
- ✅ 性能好，加载快

**可选增强库：**

```javascript
// 1. Supabase JS Client（必需）
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// 2. Marked.js - 用于渲染故事文本（可选）
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

// 3. Chart.js - 用于展示学习曲线（可选）
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

// 4. html2canvas - 用于生成故事分享图片（可选）
<script src="https://cdn.jsdelivr.net/npm/html2canvas"></script>
```

**UI 框架建议：**
- 推荐：**Tailwind CSS**（您项目中已有）
- 原因：快速构建美观界面，响应式设计方便

#### 后端技术

**Supabase（已确定）**

**核心服务：**
1. **Supabase Database（PostgreSQL）**
   - 存储用户数据、词汇库、故事会话
   - 内置 Row Level Security（RLS）保护数据
   
2. **Supabase Edge Functions（Deno/TypeScript）**
   - 部署 AI Agent 逻辑
   - 调用 DeepSeek API
   - 词汇推荐算法
   
3. **Supabase Auth（可选）**
   - 用户注册/登录
   - 支持邮箱、OAuth 等方式

**为什么选 Supabase？**
- ✅ 免费额度充足（500MB 数据库 + 50 万次函数调用/月）
- ✅ 开发体验好，文档完善
- ✅ 自动生成 RESTful API
- ✅ 实时订阅功能（可用于多人协作）
- ✅ 与 DeepSeek 集成简单

#### AI 服务

**DeepSeek API（已确定）**

**优势：**
- ✅ 中文理解能力强
- ✅ 成本低（1元/100万tokens输入）
- ✅ 响应速度快
- ✅ 适合创意写作任务

**集成方式：**
```typescript
// Supabase Edge Function 中
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [...],
      temperature: 0.85,
      max_tokens: 200
    })
  });
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### 词典服务

**萌典 API（免费）**

```javascript
// 前端直接调用
async function lookupWord(word) {
  const response = await fetch(`https://www.moedict.tw/uni/${word}`);
  const data = await response.json();
  return {
    word: data.title,
    pinyin: data.heteronyms[0].pinyin,
    definitions: data.heteronyms[0].definitions
  };
}
```

### 可选的辅助工具

#### 1. 互动小说引擎（如需更复杂的分支）

**Ink（Inkle Studios 开发）**
- 开源的叙事脚本语言
- 支持复杂的分支和变量
- 可导出为 JSON，前端渲染

**适用场景**：如果未来要做"多结局"、"复杂分支"模式

#### 2. 自然语言处理库

**Compromise.js**
- 轻量级的 NLP 库
- 可用于分析用户输入的句子结构
- 帮助识别用户创意关键词

```javascript
import nlp from 'compromise';

function detectCreativeElements(sentence) {
  let doc = nlp(sentence);
  
  // 提取创意关键词
  let nouns = doc.nouns().out('array');
  let adjectives = doc.adjectives().out('array');
  
  const creativeKeywords = ['秘密', '魔法', '时光', '梦境'];
  let detected = nouns.filter(n => creativeKeywords.includes(n));
  
  return detected;
}
```

#### 3. 语音合成（可选功能）

**Web Speech API（浏览器原生）**
- 免费，无需额外服务
- 可以朗读故事文本
- 适合低年龄段用户

```javascript
function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}
```

#### 4. 数据分析与可视化

**Chart.js**
- 轻量级图表库
- 展示学习曲线、创意度变化

```javascript
// 展示创意度演变曲线
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['故事1', '故事2', '故事3', '故事4', '故事5'],
    datasets: [{
      label: '创意度',
      data: [65, 72, 88, 85, 92],
      borderColor: 'rgb(75, 192, 192)'
    }]
  }
});
```

### 不推荐的方案

❌ **完全自建后端（Node.js/Python）**
- 原因：需要服务器维护，成本高，开发周期长
- Supabase 已提供所需所有功能

❌ **使用重量级框架（React/Vue）**
- 原因：您的项目是静态页面托管，引入框架增加复杂度
- Vanilla JS 足够，性能更好

❌ **使用 OpenAI GPT-4**
- 原因：成本高（15美元/100万tokens），中文理解不如 DeepSeek
- DeepSeek 更适合这个项目

---

## 🎮 核心玩法设计

### 基本流程（方案 B - 自然引导式）

```
1. 情境选择 - AI 问："如果你能拥有一个神奇的能力..."
   用户选择或自由输入（如："能听懂动物说话"）
   ↓
2. AI 根据用户选择开启故事，自然引入情境
   给出首批词语选项（4个不同类型的词汇）
   ↓
3. 用户从 4 个词语中选 1 个，用它造句接龙
   ↓
4. AI 根据用户句子灵活继续接龙，推进剧情
   （AI 会"软性"引导故事发展，但尊重用户创意）
   ↓
5. AI 给出下一批词语选项（可点击查看释义）
   词语类型多样：动作/情感/描写/灵活
   ↓
6. 重复步骤 3-5，共 15-20 轮
   AI 动态识别用户创作风格，调整故事走向
   ↓
7. 故事自然完结，展示学习成果和生词本
   AI 可能生成一个符合故事的标题
```

**与传统方案的区别**：
- ❌ 不是"选择故事类型" → ✅ 是"选择情境/能力"
- ❌ 不是按固定模板发展 → ✅ 是根据用户创意灵活发展
- ❌ 不会感觉在"完成任务" → ✅ 感觉在"共同创作故事"

### 故事框架系统

#### 设计理念：隐藏式结构

**核心思想**：表面上是自由创作，实际上 AI 在背后有"软性引导"的故事框架，让用户感觉在真正创作而非填空。

**关键原则**：
- ✅ 不让用户"选择故事类型"，而是通过自然的情境问题引导
- ✅ AI 保持灵活，根据用户输入动态调整故事方向
- ✅ 故事结构存在但不明显，用户感受不到"套路"
- ✅ 词汇推荐围绕主题但不局限，保持多样性

#### 故事主题方向（用户不可见）

通过初始情境选择，AI 在后端确定故事的大致方向：

| 用户选择 | 后端主题 | 词汇重点 | 故事走向 |
|---------|---------|---------|---------|
| 能听懂动物说话 | 自然探险 | 动物、自然、情感 | 拯救/帮助型 |
| 发现神秘地图 | 冒险探索 | 地理、探索、勇气 | 寻宝/发现型 |
| 奇怪的梦境 | 奇幻想象 | 魔法、想象、惊奇 | 冒险/成长型 |
| 新转来的同学 | 校园日常 | 人际、情感、校园 | 友谊/成长型 |
| 科学实验意外 | 科学探索 | 科学、实验、发现 | 解谜/发现型 |
| 自由输入 | 动态判断 | 根据用户输入决定 | 灵活调整 |

#### 故事结构（3 段式灵活模型）

不再使用严格的 7 阶段，改为更自然的 3 段式：

| 段落 | 名称 | 目标 | 轮次 | AI 引导策略 |
|------|------|------|------|------------|
| 第一段 | 开端与探索 | 建立情境、引发兴趣、开始行动 | 5-7 轮 | 软引导：提出问题、引入有趣元素 |
| 第二段 | 挑战与成长 | 遇到困难、尝试解决、情感深化 | 5-7 轮 | 软引导：增加小冲突、但留给用户解决空间 |
| 第三段 | 解决与收获 | 克服困难、达成目标、情感升华 | 4-6 轮 | 软引导：自然收尾、点明成长 |

**段落切换标志**：
- 不是固定轮次，而是根据剧情自然发展
- AI 判断时机：用户完成某个小目标、剧情需要推进等
- 切换方式：用"突然"、"这时"、"没想到"等自然过渡词

#### 防止套路化与增强创意的机制

**核心挑战**：如何确保每次故事都有惊喜感，而不是千篇一律？

**解决方案：多层随机性 + AI 创意增强**

##### 1. 情境起点的多样性

即使同一个主题（如"能听懂动物说话"），也有多种开场：

```
同一选择的 5 种不同开场（随机选择）：

开场 A - 意外发现：
"公园里，一只小狗突然对你说话..."

开场 B - 梦境延续：
"你做了一个奇怪的梦，醒来后发现自己真的能听懂动物..."

开场 C - 紧急求助：
"你正在家里，窗外一只受伤的鸟向你呼救..."

开场 D - 神秘礼物：
"生日那天，你收到一个会说话的项链..."

开场 E - 科学实验：
"科学课上的实验意外让你获得了这个能力..."
```

##### 2. AI 回应的多样性策略

**避免固定句式**：
- ❌ 坏例子：AI 总是说"小明走进XXX，发现了XXX..."
- ✅ 好例子：
  - "推开门的瞬间，一阵奇怪的声音传来..."
  - "他刚想离开，身后突然..."
  - "没想到，接下来发生的事让他大吃一惊..."

**技术实现**：
```javascript
// AI Prompt 中增加反套路指令
const antiPatternPrompt = `
【重要：避免套路化】
1. 检查最近 3 轮对话，不要使用相同的句式开头
2. 避免固定的转折词（如总是用"突然"）
3. 每次引入新元素时，用不同的方式
4. 随机使用以下风格之一：
   - 悬念式：留下未解之谜
   - 意外式：出现意想不到的转折
   - 细节式：关注一个小细节引发变化
   - 对话式：通过角色对话推进
   - 感官式：通过声音、气味等感官描写
`;
```

##### 3. 动态随机事件库

在故事的关键节点，AI 可以从"随机事件池"中抽取元素：

```javascript
const randomEvents = {
  第一段: [
    { type: '意外发现', element: '神秘物品', examples: ['发光的石头', '古老的地图', '会动的画'] },
    { type: '新角色', element: '意外相遇', examples: ['健谈的老人', '神秘的孩子', '会魔法的猫'] },
    { type: '环境变化', element: '场景转换', examples: ['突然下雨', '起雾了', '时间停止'] },
  ],
  第二段: [
    { type: '挑战', element: '需要选择', examples: ['两条路', '求助信号', '藏起来的秘密'] },
    { type: '帮手', element: '意外支援', examples: ['老朋友出现', '获得工具', '动物帮忙'] },
    { type: '反转', element: '真相揭露', examples: ['事情不是表面那样', '发现隐藏信息', '误会解开'] },
  ],
  第三段: [
    { type: '升华', element: '情感深化', examples: ['理解了某个道理', '关系更进一步', '获得成长'] },
    { type: '彩蛋', element: '后续线索', examples: ['为下次冒险埋下伏笔', '发现新秘密', '获得特殊物品'] },
  ]
};

// AI 在合适时机随机选择插入
```

##### 4. 用户创意的放大机制

当用户说出特别有创意的句子时，AI 要"接住"并放大：

```
用户（创意输入）：我好奇地问小狗，它能不能带我去动物的秘密聚会。

AI（识别创意点并放大）：
"秘密聚会？！"小狗的眼睛突然亮了起来，"你怎么知道今晚午夜就有一场？
不过...那是只有特殊动物才能参加的聚会，人类可从来没去过。
要不要试试看能不能混进去？"

（AI 把用户随口的一个想法，变成了故事的核心转折点！）
```

**技术实现**：
```javascript
// 识别用户创意关键词
function detectCreativeElements(userInput) {
  const creativeKeywords = ['秘密', '魔法', '宝藏', '聚会', '时光', '梦境', '变身'];
  const detected = creativeKeywords.filter(kw => userInput.includes(kw));
  
  if (detected.length > 0) {
    return {
      hasCreativity: true,
      elements: detected,
      prompt: `用户提到了"${detected[0]}"，这是一个很棒的创意！
                请在你的回应中放大这个元素，让它成为故事的重要转折点。`
    };
  }
}
```

##### 5. 故事结局的多样性

同一个故事主题，可以有完全不同的结局：

**温馨结局**：帮助动物解决问题，建立友谊
**成长结局**：通过冒险学到重要道理
**开放结局**：留下悬念，鼓励续写
**意外结局**：反转，原来一切是...
**史诗结局**：发现更大的秘密和使命

AI 根据故事发展和用户风格，选择最合适的结局类型。

##### 6. 创意度评分系统

每个完成的故事，系统评估"创意指数"：

```javascript
function calculateCreativityScore(story) {
  let score = 0;
  
  // 词汇多样性（使用了多少不同类型的词）
  score += vocabularyDiversity * 10;
  
  // 情节独特性（与历史故事的相似度，越低越好）
  score += (1 - similarityToOthers) * 30;
  
  // 用户主动创新（用户主动引入了多少新元素）
  score += userInitiativeElements * 15;
  
  // AI 响应多样性（AI 使用了多少不同的句式）
  score += aiDiversity * 10;
  
  // 意外转折数量
  score += unexpectedTwists * 5;
  
  return Math.min(score, 100);
}
```

完成故事后显示：
```
🎨 故事创意度：92/100
🌟 超越了 89% 的用户！
💡 你的创新点：引入了"动物秘密聚会"的概念
🏆 获得"创意作家"徽章
```

这样可以：
- 激励用户下次更有创意
- 让用户知道"创意"是被重视和评估的
- 增加重玩动力（"下次能不能超过 95 分？"）

### 文字冒险元素

#### 1. 自然的选择节点（而非明显的分支）

不是硬性的 A/B 选择，而是通过词汇选择自然引导：

**示例：**
```
AI：小狗带你来到公园的深处，前方有三条小路。

词语选项：
[谨慎] - 会往安全路线发展
[好奇] - 会往探索发现方向
[勇敢] - 会往冒险挑战方向
[思考] - 会往智慧解谜方向

用户选择哪个词，故事就自然往那个方向发展，
但用户不会感觉是在"选择剧情分支"，而是在"表达想法"。
```

#### 2. 动态故事发展

AI 根据用户的累积选择调整故事风格：

```
如果用户多次选择"勇敢"、"冲动"类词汇 
→ 故事变得更冒险、节奏更快

如果用户多次选择"思考"、"观察"类词汇
→ 故事变得更细腻、重视细节

如果用户多次选择"朋友"、"帮助"类词汇
→ 故事中引入更多角色互动
```

#### 3. 收集与成就（保持）
- 完成不同风格的故事获得"故事徽章"
- 使用特殊词汇类型（成语、四字词语）获得奖励
- 激励重玩和探索

#### 4. 个性化创作风格识别

系统记录用户的创作偏好：
- 喜欢的词汇类型（动作/情感/描写）
- 故事风格倾向（冒险/温馨/悬疑）
- 创作长度偏好（简洁/详细）
- 未来故事据此个性化推荐

#### 5. 多人协作接龙模式（新增）

**设计理念**：从单人创作到社交创作，让故事更有趣！

##### 三种创作模式

**模式1：单人 + AI（核心模式）**
- 用户独自与 AI 合作创作故事
- AI 是创作伙伴，提供回应和引导
- 适合：想安静创作的用户

**模式2：多人 + AI（协作模式）**
- 2-4 名玩家 + AI 一起创作一个故事
- 玩家轮流造句，AI 在每轮后回应
- AI 扮演"调和者"角色，连接不同玩家的创意
- 适合：朋友、同学一起玩

**模式3：纯多人接龙（竞技模式）**
- 2-4 名玩家互相接龙，没有 AI
- 完全由玩家主导故事发展
- 更有挑战性，需要玩家有一定创作能力
- 适合：高年级学生、写作爱好者

##### 多人模式详细设计

**创建房间流程**：

```
1. 用户点击"多人故事"
   ↓
2. 选择模式
   [多人+AI] 或 [纯多人]
   ↓
3. 创建房间
   - 输入房间名称
   - 选择人数（2/3/4人）
   - 选择情境主题
   - 是否公开（可被其他人加入）
   ↓
4. 获得房间码（6位数字）
   分享给朋友
   ↓
5. 等待玩家加入
   显示已加入玩家列表
   ↓
6. 房主点击"开始故事"
```

**游戏进行流程（多人+AI模式）**：

```
第1轮：
玩家A 选词造句 → AI 回应 → 给出下一批词语

第2轮：
玩家B 选词造句 → AI 回应 → 给出下一批词语

第3轮：
玩家C 选词造句 → AI 回应 → 给出下一批词语

第4轮：
回到玩家A ...

持续 12-18 轮，每人贡献 3-6 句
```

**游戏进行流程（纯多人模式）**：

```
第1轮：
玩家A 选词造句 → 直接给玩家B

第2轮：
玩家B 选词造句 → 直接给玩家C

第3轮：
玩家C 选词造句 → 回到玩家A

持续 12-15 轮，每人贡献 4-5 句

最后：AI 生成一个总结性的结尾段落
```

##### 多人模式的特殊机制

**1. 实时同步**
```
使用 Supabase Realtime 功能：
- 所有玩家看到相同的故事进度
- 当前轮到谁会实时显示
- 其他玩家的输入即时出现
```

**2. 等待机制**
```
轮到你：
┌────────────────────────────┐
│ 🎯 轮到你了！              │
│                            │
│ 请在 60 秒内选词造句       │
│ [===========········] 35s  │
│                            │
│ [词语选项] [输入框]        │
└────────────────────────────┘

等待中：
┌────────────────────────────┐
│ ⏳ 等待玩家B...            │
│                            │
│ 你可以：                   │
│ • 查看已完成的故事         │
│ • 点击词语学习释义         │
│ • 给其他玩家的句子点赞     │
└────────────────────────────┘
```

**3. 超时处理**
```
如果玩家60秒未输入：
- 系统提示："玩家A似乎遇到困难..."
- AI 代替该玩家完成这一轮
- 继续游戏，不中断体验
- 该玩家下轮仍可继续参与
```

**4. 玩家互动**
```
每个玩家的句子旁边有互动按钮：
- 👍 点赞（最赞的句子会被标记）
- 💬 表情回应（😮 🔥 💡 ❤️）
- 不能修改他人的句子，保持创作的真实性
```

**5. 协作创意评分**
```
故事完成后：

个人创意度：
- 玩家A: 88分 🥇
- 玩家B: 85分 🥈  
- 玩家C: 82分 🥉

团队协作度：92分
- 故事连贯性：95分
- 创意碰撞：90分
- 互补配合：91分

获得团队成就："完美三人组" 🎭
```

**6. 角色分工（可选-高级功能）**
```
为增加趣味性，可以让每个玩家选择角色：

🎨 创意者 - 负责引入新元素和转折
📝 描写者 - 负责细节和氛围描写
🎭 角色师 - 负责角色对话和情感
🔧 收尾者 - 负责解决问题和推进剧情

每个角色会收到针对性的词汇推荐
```

##### 多人模式的技术实现

**房间系统数据结构**：

```sql
CREATE TABLE story_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,  -- 6位房间码
  room_name TEXT,
  host_user_id UUID REFERENCES users(id),
  
  -- 房间设置
  mode TEXT NOT NULL,  -- 'solo_ai', 'multi_ai', 'multi_only'
  max_players INT DEFAULT 4,
  is_public BOOLEAN DEFAULT false,
  
  -- 故事设置
  story_theme TEXT,
  initial_choice TEXT,
  
  -- 房间状态
  status TEXT DEFAULT 'waiting',  -- waiting/playing/completed
  current_turn_player_id UUID,
  current_round INT DEFAULT 0,
  
  -- 参与者
  player_ids UUID[] DEFAULT '{}',
  player_order JSONB DEFAULT '[]',  -- 玩家轮流顺序
  
  -- 故事数据
  conversation_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_room_code ON story_rooms(room_code);
CREATE INDEX idx_room_status ON story_rooms(status);
CREATE INDEX idx_room_public ON story_rooms(is_public) WHERE is_public = true;

-- 玩家-房间关系表
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES story_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  player_role TEXT,  -- 可选：'creator', 'describer', 'character', 'closer'
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(room_id, user_id)
);
```

**实时同步（Supabase Realtime）**：

```javascript
// 前端订阅房间更新
const supabase = createClient(supabaseUrl, supabaseKey);

// 订阅房间状态变化
const channel = supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'story_rooms',
      filter: `id=eq.${roomId}`
    },
    (payload) => {
      // 更新 UI
      updateGameState(payload.new);
      
      // 如果轮到自己
      if (payload.new.current_turn_player_id === currentUserId) {
        enableInput();
        startTimer(60);
      } else {
        disableInput();
        showWaitingState();
      }
    }
  )
  .subscribe();

// 提交自己的造句
async function submitSentence(word, sentence) {
  // 1. 添加到故事历史
  const { data } = await supabase.rpc('add_player_sentence', {
    room_id: roomId,
    user_id: currentUserId,
    word: word,
    sentence: sentence
  });
  
  // 2. 如果是多人+AI模式，调用 AI 生成回应
  if (roomMode === 'multi_ai') {
    await supabase.functions.invoke('story-agent-multiplayer', {
      body: { roomId, userId: currentUserId, sentence }
    });
  }
  
  // 3. 切换到下一个玩家
  await supabase.rpc('next_turn', { room_id: roomId });
}
```

**Edge Function 适配（多人+AI模式）**：

```typescript
// supabase/functions/story-agent-multiplayer/index.ts

async function handleMultiplayerStory(req) {
  const { roomId, userId, sentence } = await req.json();
  
  // 1. 获取房间信息
  const room = await getRoomInfo(roomId);
  
  // 2. 获取当前故事历史（包含所有玩家的输入）
  const storyHistory = room.conversation_history;
  
  // 3. AI 需要"调和"不同玩家的创意
  const systemPrompt = `
你是多人协作故事的 AI 引导者。
现在有 ${room.player_ids.length} 位玩家正在共同创作故事。

你的任务：
1. 根据玩家${getUserName(userId)}的句子继续故事
2. 连接前面其他玩家的创意，保持故事连贯
3. 为故事增添惊喜，但不要盖过玩家的创意
4. 让每个玩家都感到自己的贡献很重要

【重要】你的回应要简短（60-80字），为下一位玩家留足创作空间
`;

  // 4. 调用 DeepSeek
  const aiResponse = await callDeepSeek({ systemPrompt, userMessage: sentence });
  
  // 5. 推荐下一批词汇
  const nextVocab = await recommendVocabularyForMultiplayer({
    roomId,
    currentSegment: room.current_segment,
    allPlayersLevel: await getPlayersAverageLevel(room.player_ids)
  });
  
  // 6. 更新房间
  await updateRoom(roomId, {
    conversation_history: [
      ...storyHistory,
      { role: 'player', userId, content: sentence, round: room.current_round },
      { role: 'ai', content: aiResponse, round: room.current_round }
    ]
  });
  
  return { aiResponse, nextVocab };
}
```

##### 多人模式的 UI 设计

**房间等待界面**：

```
┌────────────────────────────────────────┐
│  🏠 房间：小明的奇幻冒险                │
│  房间码：348572  [📋 复制]             │
│                                        │
│  模式：多人+AI  人数：2/4              │
│  主题：自然探险                         │
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  👥 已加入玩家                          │
│                                        │
│  🎭 小明（房主）                        │
│  等级：L3  就绪 ✅                      │
│                                        │
│  🎨 小红                               │
│  等级：L2  就绪 ✅                      │
│                                        │
│  [等待更多玩家...]                      │
│                                        │
│  [邀请好友] [开始故事]                  │
└────────────────────────────────────────┘
```

**多人游戏界面**：

```
┌────────────────────────────────────────┐
│ ← 退出  奇幻冒险记  [====····] 5/16    │
│ 👥 小明🔥 小红 小刚                     │
├────────────────────────────────────────┤
│                                        │
│ 🎭 小明（L3）：                        │
│ 我兴奋地跑向那片神秘的森林。           │
│ 👍 2  💡                               │
│                                        │
│ 🤖 AI：                                │
│ 森林深处传来奇怪的声音，小明<词>小心  │
│ </词>地走了进去，突然发现...           │
│                                        │
│ 🎨 小红（L2）：                        │
│ 地上有一个会发光的石头，我好奇地捡起来。│
│ 👍 3  🔥                               │
│                                        │
│ 🤖 AI：                                │
│ 石头在手中<词>温暖</词>起来，似乎有   │
│ <词>魔力</词>...                       │
│                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│ 🎯 轮到你了，小刚！                    │
│ ⏱️ [===========········] 42s           │
│                                        │
│ 📝 选择词语来造句：                     │
│ [惊讶] [观察] [拿起] [询问]            │
│                                        │
│ 💬 你的句子：                           │
│ [输入框]                               │
│                                        │
│ [🎯 提交]  [❓ 跳过]                   │
└────────────────────────────────────────┘
```

**多人完成界面**：

```
┌────────────────────────────────────────┐
│  🎉 故事创作完成！                      │
│  《森林的秘密》                         │
│                                        │
│  🏆 团队表现                            │
│  ████████████████░░  92/100            │
│                                        │
│  • 故事连贯性：95分                     │
│  • 创意碰撞：90分                       │
│  • 互补配合：91分                       │
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  👥 个人表现                            │
│                                        │
│  🥇 小明（L3）创意度：88分              │
│     • 最佳句子："我惊讶地发现..."       │
│     • 新学词汇：5个                     │
│                                        │
│  🥈 小红（L2）创意度：85分              │
│     • 获赞最多：3个赞 👍               │
│     • 新学词汇：7个                     │
│                                        │
│  🥉 小刚（L3）创意度：89分              │
│     • 关键转折贡献                      │
│     • 新学词汇：6个                     │
│                                        │
│  🏅 获得团队成就："完美三人组"           │
│                                        │
│  [📤 分享故事]  [🔁 再来一局]          │
│  [📚 查看生词本]                        │
└────────────────────────────────────────┘
```

##### 多人模式的教育价值

**1. 社交学习**
- 看到其他人如何用词，互相学习
- 通过点赞鼓励好的表达
- 培养合作和沟通能力

**2. 创意碰撞**
- 不同思维方式的碰撞激发更多创意
- "原来还可以这样写！"的启发
- 故事走向更难预测，更有趣

**3. 良性竞争**
- 想写得比别人更好的动力
- 但不是纯竞争，而是共同创作
- 个人分数 + 团队分数的平衡

**4. 降低焦虑**
- 不是一个人面对 AI，有伙伴一起
- 看到别人也在思考，减轻压力
- 即使自己这轮不够好，还有队友和 AI 帮忙

##### 多人模式的激励机制

**1. 团队成就**
```
🏆 完美搭档（2人）- 配合度 >90
🎭 创意三人组（3人）- 团队创意度 >85
👑 传奇四人组（4人）- 完成5个故事

🔥 连击（Combo）- 连续3轮都获得点赞
💡 灵光乍现 - 你的句子引发故事大转折
❤️ 最受欢迎 - 你的句子获赞最多
```

**2. 好友系统**
```
- 可以添加常一起玩的人为好友
- 看到好友在线时可以邀请
- 查看和好友共同创作的故事历史
- "你和小红已经共同创作了 12 个故事！"
```

**3. 排行榜**
```
本周最佳团队：
1. 创意小队（4人）- 平均创意度 94
2. 故事达人（3人）- 平均创意度 91
3. 文字魔法师（2人）- 平均创意度 89

个人创作榜：
1. 小明 - 创意度总分 2,340
2. 小红 - 创意度总分 2,180
3. 小刚 - 创意度总分 2,050
```

#### 6. 激励重复创作的机制

**核心目标**：让用户想"再来一次！"

##### 机制 1：每次都不一样的保证

```
完成故事后的提示：
"想再来一次吗？下次的故事会完全不同！"

- 如果用户选了相同的情境（如再次选"听懂动物"）
  → 系统检测到，使用不同的开场（5种随机）
  → 提示："这次会遇到不同的动物和冒险哦！"

- 系统记录用户创作过的故事类型
  → 推荐尚未尝试的主题
  → "要不要试试《神秘地图》？很多人说超有趣！"
```

##### 机制 2：创意挑战

```
┌────────────────────────────┐
│  🎯 今日创意挑战            │
│                            │
│  在今天的故事中：           │
│  ✨ 使用"时光"这个词       │
│  🎭 让故事有意外反转        │
│  📝 用至少 3 个成语         │
│                            │
│  完成奖励：双倍积分         │
└────────────────────────────┘
```

##### 机制 3："发现新可能"提示

```
用户完成故事时，AI 分析故事中的"未展开分支"：

"在你的故事中，小豆提到了'动物秘密聚会'...
 如果当时你选择参加那个聚会，会发生什么呢？
 要不要重新创作，探索这条路线？"

→ 这会激发用户的好奇心："哦！还有这种可能性！"
→ 增加重玩动力
```

##### 机制 4：创意等级晋升

```
创意等级体系：
🌱 创作新手（0-5 个故事）
🌿 创意学徒（6-15 个故事）
🌳 故事编织者（16-30 个故事）
🌟 创意大师（31-50 个故事）
👑 传奇作家（51+ 个故事）

每个等级解锁新功能：
- L2：解锁"自由输入情境"
- L3：解锁"续写已完成的故事"
- L4：解锁"多结局模式"
- L5：可以邀请好友共同创作
```

##### 机制 5：故事收藏馆

```
用户的个人故事收藏馆：
┌─────────────────────────────┐
│  📚 我的故事收藏（12个）     │
│                             │
│  🌟 高分故事（创意度 >85）   │
│  《小豆的秘密冒险》 92分     │
│  《时光倒流的一天》 88分     │
│                             │
│  📖 全部故事                │
│  按时间/创意度/主题 排序     │
│                             │
│  🎨 创意演变曲线             │
│  [显示创意度随时间变化图表]  │
│                             │
│  💡 "你的创意在不断进步！"   │
└─────────────────────────────┘
```

看到自己的创意度在提升，会激励继续创作！

##### 机制 6：社区激励（可选）

```
- 每周"最佳故事"展示
- 用户可以给喜欢的故事点赞
- "本周有 156 人创作了故事，你要加入吗？"
- 不强制社交，但提供展示机会
```

##### 机制 7：意外惊喜

随机触发特殊事件：

```
- 某次打开应用，AI说："今天我学会了一个新技能！要试试吗？"
  → 这次故事中 AI 会用一种全新的风格（如诗歌式描写）
  
- 连续 7 天创作，第 7 天会遇到"传奇 AI 导师"
  → 特殊的 AI 人格，创作风格更加独特
  
- 创作第 10、25、50 个故事时，解锁特殊纪念故事
```

**设计原则**：
- 不是为了"完成任务"而创作
- 而是因为"好奇下次会怎样"而创作
- 每次都有新发现、新惊喜
- 创作本身就是奖励

---

## 🎯 词汇学习系统

### 用户和词汇分级体系（7-18 岁全覆盖）

#### 年龄与等级对应

| 等级 | 年龄 | 年级 | 词汇难度 | 词汇量 | 对应标准 | 词汇示例 | 故事风格 |
|------|------|------|----------|--------|----------|----------|----------|
| L1 | 7-8岁 | 2-3年级 | 入门 | 500 | 小学低年级 | 高兴、朋友、学校、跑步 | 简单、日常、温馨 |
| L2 | 9-10岁 | 4-5年级 | 基础 | 800 | 小学中年级 | 兴奋、伙伴、操场、探索 | 冒险、友谊、趣味 |
| L3 | 11-12岁 | 6年级 | 进阶 | 1000 | 小学高年级 | 欣喜若狂、志同道合、神秘 | 复杂情节、多角色 |
| L4 | 13-15岁 | 初中 | 提高 | 1200 | 初中/HSK4 | 欢欣鼓舞、心心相印、抉择 | 深度情感、道德困境 |
| L5 | 16-17岁 | 高中 | 高级 | 1000 | 高中/HSK5 | 喜不自胜、莫逆之交、思辨 | 文学性、哲理性 |
| L6 | 18岁+ | 高三+ | 精通 | 500 | 高考/HSK6 | 悲欢离合、肝胆相照、隽永 | 深刻主题、复杂叙事 |

#### 分级特点

**L1-L2（小学低中年级，7-10岁）**
- 词汇特点：高频日常词汇，双字词为主，少量三字词
- 故事长度：12-15 轮
- 故事复杂度：单线情节，1-2 个主要角色
- 创意空间：中等（需要更多引导）
- 句子长度：5-15 字

**L3-L4（小学高年级-初中，11-15岁）**
- 词汇特点：成语开始增多，四字词语，描写细腻
- 故事长度：15-18 轮
- 故事复杂度：可以有支线，3-4 个角色
- 创意空间：较大（AI 跟随用户创意）
- 句子长度：10-30 字

**L5-L6（高中，16-18岁）**
- 词汇特点：文学词汇、书面语、修辞手法
- 故事长度：18-25 轮
- 故事复杂度：多线叙事，深刻主题
- 创意空间：最大（AI 主要配合，少干预）
- 句子长度：15-50 字

#### 智能年龄识别

用户注册时：
1. 选择年龄/年级
2. 系统自动匹配对应等级
3. 可通过初始评估调整（做 3-5 轮简单故事，评估实际水平）

动态调整：
- 如果连续流畅完成 → 提示"你的水平很棒，要不要尝试挑战 L3 级别？"
- 如果持续困难 → 温和建议降低难度
- 跨等级学习：可选择"挑战模式"临时体验高一级

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

#### 推荐因素权重（更灵活的版本）

1. **用户水平匹配** (35%)
   - 70% 当前水平词汇
   - 20% 低一级复习词汇
   - 10% 高一级挑战词汇

2. **故事主题相关** (25%)
   - 根据后端判断的主题方向
   - 但不强制限定（允许跨主题词汇）

3. **词汇多样性** (20%)
   - 每次推荐包含不同类型：
     * 1 个动作类词汇
     * 1 个情感/态度类词汇
     * 1 个描写/观察类词汇
     * 1 个灵活词汇（根据剧情）
   - 让用户有不同方向的表达选择

4. **学习路径优化** (15%)
   - 间隔重复算法（SM-2）
   - 薄弱类别优先

5. **避免重复** (5%)
   - 最近 2 个故事已学过的词不再出现
   - 同一故事中不重复推荐

**关键改进**：
- 降低"故事主题匹配"权重，从 30% 降到 25%
- 新增"词汇多样性"维度，确保用户每次都有不同类型的选择
- 让故事发展更自然，不会因为"只推荐某主题词汇"而受限

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

#### 4. story_sessions (故事会话) - 方案 B 版本
```sql
CREATE TABLE story_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 故事信息
  story_theme TEXT NOT NULL,  -- 后端主题：'自然探险'/'校园日常'/'奇幻冒险'等（用户不可见）
  story_title TEXT,  -- 故事完成后生成的标题
  initial_choice TEXT,  -- 用户的初始情境选择（如"能听懂动物说话"）
  
  -- 进度信息
  current_segment INT DEFAULT 1,  -- 1-3 段
  current_round INT DEFAULT 0,
  max_rounds INT DEFAULT 18,
  
  -- 用户风格分析（动态更新）
  user_style_profile JSONB DEFAULT '{}',  -- { preference: 'adventure', traits: [...] }
  
  -- 对话和词汇
  conversation_history JSONB DEFAULT '[]',  -- 完整对话
  vocabulary_used UUID[] DEFAULT '{}',  -- 本次使用的词汇 ID
  
  -- 时间戳
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- 状态
  status TEXT DEFAULT 'active'  -- active/completed/abandoned
);

CREATE INDEX idx_story_user ON story_sessions(user_id);
CREATE INDEX idx_story_status ON story_sessions(status);
CREATE INDEX idx_story_theme ON story_sessions(story_theme);
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

#### 6. story_theme_configs (故事主题配置) - 方案 B 版本
```sql
CREATE TABLE story_theme_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name TEXT UNIQUE NOT NULL,  -- 'natural_exploration', 'school_life' 等
  display_name TEXT,  -- 显示名称（后台用）
  
  -- 情境选择（前端显示给用户）
  situation_prompts JSONB,  -- 多个情境选择选项
  -- 例如: [
  --   { "id": "animal_talk", "emoji": "🐕", "text": "能听懂动物说话", "description": "..." },
  --   { "id": "mysterious_map", "emoji": "🗺️", "text": "发现神秘地图", "description": "..." }
  -- ]
  
  -- 主题设置
  vocabulary_tags TEXT[],  -- ['动物', '自然', '情感']
  difficulty_range INT[],  -- [2, 4] 表示适合 L2-L4
  
  -- AI 引导策略（软性）
  segment_guides JSONB,  -- 每个段落的引导策略
  -- 例如: {
  --   "1": { "focus": "建立情境", "tactics": ["引入有趣元素", "提出问题"] },
  --   "2": { "focus": "增加挑战", "tactics": ["引入小冲突", "让用户解决"] },
  --   "3": { "focus": "自然收尾", "tactics": ["铺垫结局", "点明成长"] }
  -- }
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**预设主题配置示例**：

| theme_name | 情境示例 | 词汇标签 | 适合年级 |
|------------|----------|---------|---------|
| natural_exploration | 能听懂动物说话、发现神秘森林 | 动物、自然、情感 | L2-L4 |
| school_life | 新同学、神秘事件 | 校园、人际、情感 | L1-L3 |
| fantasy_adventure | 奇怪的梦、魔法世界 | 想象、魔法、惊奇 | L3-L5 |
| science_exploration | 实验意外、时光机器 | 科学、实验、发现 | L3-L5 |
| historical_journey | 穿越古代、历史人物 | 历史、文化、古代 | L4-L6 |

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
  
  // 4. 分析用户创作风格（用于动态调整）
  const userStyle = analyzeUserStyle(session.conversation_history);
  
  // 5. 判断是否需要推进故事段落
  const shouldAdvanceSegment = checkSegmentAdvancement(session, userInput);
  if (shouldAdvanceSegment) {
    session.current_segment++;  // 从第一段到第二段，或第二段到第三段
  }
  
  // 6. 构建 DeepSeek Prompt（灵活引导式）
  const systemPrompt = buildFlexibleSystemPrompt({
    storyTheme: session.story_theme,  // 后端主题（用户不可见）
    currentSegment: session.current_segment,  // 1, 2, 或 3
    userStyle: userStyle,  // 用户的创作风格偏好
    storyContext: extractStoryContext(session.conversation_history),
    recentHistory: session.conversation_history.slice(-3)
  });
  
  const userPrompt = `用户使用"${selectedWord}"造句：${userInput}\n\n请根据这句话自然地继续故事。`;
  
  // 7. 调用 DeepSeek API
  const aiResponse = await callDeepSeek({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.85,  // 稍高一些，增加创意
    max_tokens: 200
  });
  
  // 8. 推荐下一批词汇（更多样化）
  const nextVocabulary = await recommendVocabularyFlexible({
    userId,
    userLevel: userProfile.current_level,
    storyTheme: session.story_theme,  // 主题作为参考而非限制
    userStyle: userStyle,  // 用户风格偏好
    currentSegment: session.current_segment,
    recentWords: session.vocabulary_used,
    diversityMode: true,  // 启用多样性模式
    count: 4
  });
  
  // 9. 更新会话记录
  await updateSession(sessionId, {
    current_round: session.current_round + 1,
    current_segment: session.current_segment,
    user_style_profile: userStyle,  // 保存用户风格分析
    conversation_history: [
      ...session.conversation_history,
      { role: 'user', content: userInput, word: selectedWord, round: session.current_round },
      { role: 'ai', content: aiResponse, round: session.current_round }
    ]
  });
  
  // 10. 检查是否完成
  const isCompleted = session.current_round >= session.max_rounds || 
                      session.current_segment > 3;
  
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

#### System Prompt 模板（灵活引导式）

```
你是一位富有创意的儿童故事创作者和语文教师。你正在和一位 10 岁的小学生共同创作一个故事。

【创作理念】
- 这是一个真正的"共同创作"，不是填空游戏
- 学生是故事的主导者，你是优秀的创作伙伴
- 你要根据学生的想法灵活发展故事，而不是按固定模板

【当前故事信息】（仅供参考，可灵活调整）
故事主题方向：${storyTheme}（如：自然探险/校园日常/奇幻冒险）
故事发展阶段：第 ${currentSegment}/3 段
  - 第 1 段：开端与探索
  - 第 2 段：挑战与成长
  - 第 3 段：解决与收获

学生创作风格：${userStyleDescription}
  例如：喜欢冒险刺激/偏爱细腻描写/重视人物情感

【核心规则】
1. 回应长度：80-120 字
2. 语言风格：生动有趣，适合小学生
3. 最重要：顺着学生的思路发展，而非引导到预设剧情
4. 灵活性：如果学生的创意很棒但偏离主题，就跟随他的创意
5. 在你的句子中自然使用 2-3 个值得学习的词汇（标注为：<词>词语</词>）
6. 留下接续空间，让学生有发挥余地

【引导策略】（软性引导，不要生硬）
- 如果故事开始平淡，引入小惊喜（但不要总用"突然"）
- 如果故事过于发散，自然地聚焦到一个小目标
- 如果第 2 段了，适当增加一些小挑战让故事有起伏
- 如果第 3 段了，开始铺垫故事收尾，但不要突然结束

【重要：防止套路化】
1. 检查最近 3 轮你的回应，绝不使用相同的句式开头
2. 避免固定的转折词，变换使用：突然/这时/没想到/谁知/偏偏/说来奇怪
3. 每次引入新元素时，随机使用以下风格之一：
   - 悬念式：留下未解之谜，让读者好奇
   - 意外式：出现完全意想不到的转折
   - 细节式：关注一个小细节，从而引发大变化
   - 对话式：通过角色对话推进剧情
   - 感官式：通过声音、气味、触感等描写
4. 如果用户说出特别有创意的内容（如"秘密聚会"、"魔法"、"时光倒流"等），
   立刻"接住"这个创意，并在你的回应中放大它，让它成为故事的重要转折点！
5. 每个故事都应该是独一无二的，让用户感到"这是我从没经历过的故事"

【故事背景】
${storyContext}

【最近剧情】（最近 3 轮对话）
${recentHistory}

【任务】
请根据学生的句子自然地继续故事，让这个故事属于你们共同的创作！
```

#### User Prompt 格式（简化）

```
用户使用"${selectedWord}"造句：${userInput}

请根据这句话自然地继续故事。
```

**说明**：
- 不再告诉 AI "当前需要达到什么目标"
- 让 AI 更自然地响应用户的创意
- 所有引导信息都在 System Prompt 中，User Prompt 保持简洁

---

## 🎨 前端界面设计

### 页面结构

#### 1. 首页/创作开始
```
┌────────────────────────────────────────┐
│  🎭 智慧故事坊                          │
│                                        │
│  你的等级：L2  词汇量：156  故事：12    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  🌟 开始新的故事冒险                    │
│  📖 继续上次的故事                      │
│  📚 我的生词本 (23个词)                 │
│  📊 我的学习报告                        │
└────────────────────────────────────────┘
```

#### 1.5 故事启动界面（新增 - 情境选择）
```
┌────────────────────────────────────────┐
│  ← 返回  🎭 开始新故事                  │
├────────────────────────────────────────┤
│                                        │
│  AI：你好！我们要一起创作一个精彩的     │
│      故事。想象一下...                 │
│                                        │
│  💭 如果你能拥有一个神奇的能力，你最想   │
│     要哪一个？                          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🐕 能听懂动物说话                │  │
│  │    发现动物们的秘密世界...         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🗺️ 发现一张神秘地图              │  │
│  │    地图上标记着未知的宝藏...       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 💫 做了一个奇怪的梦              │  │
│  │    梦里的世界竟然是真的...         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 👥 班上来了新同学                │  │
│  │    他似乎有些不一样...             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ✏️ 我想从别的开始...              │  │
│  │    [输入你的想法]                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  提示：选择后，我们会根据你的想法       │
│        开始一个独一无二的故事！         │
└────────────────────────────────────────┘
```

#### 2. 故事接龙界面
```
┌────────────────────────────────────────┐
│ ← 退出  我的故事  [===·····] 4/18      │
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

#### 4. 故事完成界面（增强版 - 强调创意）
```
┌────────────────────────────────────────┐
│  🎉 太精彩了！                          │
│                                        │
│  📖 你和 AI 共同创作的故事              │
│     《小豆的秘密冒险》                  │
│     （AI 根据故事内容自动生成标题）     │
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  🎨 创意指数                            │
│  ████████████████░░  92/100            │
│  🌟 超越了全站 89% 的用户！             │
│                                        │
│  💡 你的创新亮点：                      │
│  • 引入了"动物秘密聚会"的独特概念      │
│  • 为角色设计了意想不到的性格          │
│  • 故事结局充满惊喜                     │
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  📊 学习成果（自然习得）                │
│  • 本次使用 16 个词汇                   │
│  • 其中 9 个是新学词汇 ⭐               │
│  • 词汇掌握度提升 +15                   │
│  • 你的等级：L2.3 → L2.5 ↗️            │
│                                        │
│  📚 本次学习的新词                      │
│  [焦急] [恳切] [欣喜] [迷茫] ...        │
│                                        │
│  🏆 获得成就                            │
│  🎭 "创意作家" - 创意度超过 90          │
│  📝 "连续创作者" - 连续 3 天创作        │
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  [完整故事文本，用户句子高亮]    │  │
│  │  [可以展开/折叠]                 │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [📤 分享故事]  [🔖 加入生词本]         │
│  [🎮 再来一次]  [📊 学习报告]          │
│                                        │
│  💬 "这个故事让我想到了..."            │
│     [写下你的感想，分享到社区]          │
└────────────────────────────────────────┘
```

**设计重点**：
- ✅ 创意指数放在最显眼位置（比学习成果更前）
- ✅ 突出"你和 AI 共同创作"（强调合作）
- ✅ 具体指出用户的创新点（让用户知道自己哪里做得好）
- ✅ 学习成果用"自然习得"来淡化"学习任务"感
- ✅ 增加分享功能（让用户展示创作）
- ✅ 鼓励写感想（深化体验）

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

### A. 示例故事流程（方案 B - 隐藏式结构）

**初始情境选择**：能听懂动物说话  
**后端主题**：自然探险（用户不可见）  
**预估时长**：20 分钟  
**词汇数量**：15 个新词

#### 完整流程示例

**【启动 - 情境选择】**

AI：你好！我们要一起创作一个精彩的故事。想象一下...
    如果你能拥有一个神奇的能力，你最想要哪一个？

用户选择：🐕 能听懂动物说话

**【第一段：开端与探索 - 第 1 轮】**

AI：周六的早晨，阳光洒在公园的小路上。你正在散步，突然听到一个<词>清晰</词>的声音："救命！有人能帮帮我吗？"你<词>惊讶</词>地发现，是一只小狗在说话！

词语选项：[兴奋][害怕][好奇][冷静]  
用户选择：兴奋  
用户造句：我兴奋地蹲下来，看着这只会说话的小狗。

**【第一段 - 第 2 轮】**

AI：小狗抬起头，棕色的眼睛里充满了<词>焦急</词>。"你真的能听懂我说话？太好了！我的主人早上带我来公园，但突然就不见了。你愿意帮我找到他吗？"小狗的声音里带着<词>恳切</词>的期待。

词语选项：[答应][思考][询问][观察]  
用户选择：答应  
用户造句：我毫不犹豫地答应要帮它找主人。

**【第一段 - 第 3 轮】**

AI：小狗<词>欣喜</词>地摇起尾巴。"我叫小豆，我的主人是一位老爷爷。我记得他说要去湖边的长椅，但走到一半就不见了。"说着，小豆带你往公园深处走去，那里的树木越来越<词>茂密</词>。

词语选项：[小心][快速][注意][跟随]  
...

**【第二段：挑战与成长 - 第 7 轮】**

（用户和小豆已经找了几个地方，AI 引入小挑战）

AI：前方的小路分成了三条。小豆<词>迷茫</词>地看着你："我不记得是哪一条了..."这时，你注意到其中一条路旁有一顶<词>熟悉</词>的帽子。

词语选项：[观察][决定][分析][建议]  
用户选择：观察  
用户造句：我仔细观察那顶帽子，发现上面有小豆主人的名字。

**【第二段 - 第 8 轮】**

AI：小豆<词>激动</词>地叫起来："对！就是爷爷的帽子！"你们沿着那条路继续前进，突然听到远处传来<词>微弱</词>的呼救声...

词语选项：[勇敢][谨慎][冲向][呼喊]  
...

**【第三段：解决与收获 - 第 15 轮】**

（找到了老爷爷，他的轮椅卡在树根边）

AI：老爷爷看到小豆和你，<词>感激</词>地笑了："谢谢你们！我本想推轮椅来这片我最喜欢的树林，没想到被树根卡住了。"小豆<词>兴奋</词>地扑进他怀里，你的心里也涌起一股<词>温暖</词>。

词语选项：[高兴][满足][开心][欣慰]  
用户选择：满足  
用户造句：我感到很满足，因为我用这个神奇的能力帮助了别人。

**【第三段 - 第 16 轮】**

AI：老爷爷拍拍你的肩膀："你能听懂小豆说话真是太<词>难得</词>了。这个能力让你帮助了我们，我相信未来你还能用它做更多<词>美好</词>的事。"夕阳西下，你和小豆一起送老爷爷回家，心里充满了<词>快乐</词>。

【故事完成】

**学习成果展示**：
- 使用词汇 16 个
- 其中新学词汇 9 个
- 故事风格：温馨、助人
- 创作特点：细腻、重视情感

---

### B. DeepSeek Prompt 完整示例（方案 B 版本）

```
【系统提示】
你是一位富有创意的儿童故事创作者和语文教师。你正在和一位 10 岁的小学生共同创作一个故事。

【创作理念】
- 这是一个真正的"共同创作"，不是填空游戏
- 学生是故事的主导者，你是优秀的创作伙伴
- 你要根据学生的想法灵活发展故事，而不是按固定模板

【当前故事信息】（仅供参考，可灵活调整）
故事主题方向：自然探险
故事发展阶段：第 1/3 段（开端与探索）
  - 第 1 段：开端与探索
  - 第 2 段：挑战与成长
  - 第 3 段：解决与收获

学生创作风格：情感细腻型
  - 偏好：描写情感和细节
  - 特点：用词温暖，关注角色感受

【核心规则】
1. 回应长度：80-120 字
2. 语言风格：生动有趣，适合小学生
3. 最重要：顺着学生的思路发展，而非引导到预设剧情
4. 灵活性：如果学生的创意很棒但偏离主题，就跟随他的创意
5. 在你的句子中自然使用 2-3 个值得学习的词汇（标注为：<词>词语</词>）
6. 留下接续空间，让学生有发挥余地

【引导策略】（软性引导，不要生硬）
- 如果故事开始平淡，用"突然"、"这时"引入小惊喜
- 如果故事过于发散，自然地聚焦到一个小目标
- 现在是第 1 段，重点是建立情境、引发兴趣
- 不要急于推进，让学生充分发挥

【故事背景】
- 用户选择了"能听懂动物说话"的能力
- 在公园遇到会说话的小狗"小豆"
- 小豆的主人（老爷爷）失踪了
- 正在帮助小豆寻找主人

【最近剧情】（最近 3 轮对话）
轮次 1：
  用户：我兴奋地蹲下来，看着这只会说话的小狗。
  AI：小狗抬起头，棕色的眼睛里充满了焦急...

轮次 2：
  用户：我毫不犹豫地答应要帮它找主人。
  AI：小狗欣喜地摇起尾巴。"我叫小豆..."

轮次 3（当前）：
  用户即将输入

【任务】
请根据学生的句子自然地继续故事，让这个故事属于你们共同的创作！
```

**【用户提示】**
```
用户使用"跟随"造句：我决定跟随小豆，一起去寻找它的主人。

请根据这句话自然地继续故事。
```

---

### C. 词汇推荐算法伪代码（方案 B 版本 - 更灵活）

```python
def recommend_vocabulary_flexible(user_id, story_session, count=4):
    """
    灵活的词汇推荐（强调多样性和自由度）
    """
    # 1. 获取用户信息
    user = get_user(user_id)
    user_level = user.current_level  # 例如 2.3
    user_style = story_session.user_style_profile  # 用户创作风格
    
    # 2. 确定难度范围（稍微宽松）
    difficulty_range = [
        int(user_level) - 1,  # 复习：1
        int(user_level),      # 当前：2
        int(user_level) + 1   # 挑战：3
    ]
    
    # 3. 获取故事上下文
    story_segment = story_session.current_segment  # 1, 2, 或 3
    story_theme = story_session.story_theme  # 作为参考，不强制
    used_words = story_session.vocabulary_used
    
    # 4. 确定词汇类型需求（保证多样性）
    # 不再严格按阶段限定，而是确保四个不同类型
    required_types = {
        'action': 1,      # 1 个动作类
        'emotion': 1,     # 1 个情感类
        'description': 1, # 1 个描写类
        'flexible': 1     # 1 个灵活类（根据剧情和用户风格）
    }
    
    # 5. 为每个类型分别查询候选词汇
    all_candidates = {}
    
    for word_type, needed_count in required_types.items():
        if word_type == 'flexible':
            # 灵活类根据用户风格和故事主题综合决定
            type_filter = determine_flexible_type(user_style, story_theme, story_segment)
        else:
            type_filter = [word_type]
        
        candidates = db.query("""
            SELECT * FROM vocabulary
            WHERE difficulty_level IN :difficulty_range
            AND category = ANY(:type_filter)
            AND id NOT IN :used_words
            AND id NOT IN (
                SELECT vocabulary_id FROM user_vocabulary
                WHERE user_id = :user_id
                AND last_reviewed_at > NOW() - INTERVAL '2 days'
            )
            ORDER BY RANDOM()
            LIMIT 10
        """)
        
        all_candidates[word_type] = candidates
    
    # 6. 从每个类型中选择最合适的词
    selected = []
    
    for word_type, candidates_list in all_candidates.items():
        if not candidates_list:
            continue
        
        # 为该类型的候选词打分
        scored = []
        for word in candidates_list:
            score = 0
            
            # 难度匹配分数
            if word.difficulty_level == int(user_level):
                score += 35
            elif word.difficulty_level == int(user_level) - 1:
                score += 25
            else:
                score += 10
            
            # 主题相关性分数（降低权重，不强制）
            if story_theme in word.theme:
                score += 15
            
            # 用户风格匹配分数（新增）
            if matches_user_style(word, user_style):
                score += 20
            
            # 学习记录加分
            user_vocab = get_user_vocabulary(user_id, word.id)
            if user_vocab:
                # 需要复习的词
                days_since_review = (now - user_vocab.last_reviewed_at).days
                if 2 <= days_since_review <= 7:
                    score += 15
            else:
                # 全新词汇
                score += 10
            
            # 使用频率分数（常用词优先）
            score += min(word.frequency / 100, 10)
            
            # 随机因子（增加变化性）
            score += random.uniform(0, 5)
            
            scored.append((word, score))
        
        # 选择该类型得分最高的词
        scored.sort(key=lambda x: x[1], reverse=True)
        if scored:
            selected.append(scored[0][0])
    
    # 7. 如果不足 4 个，补充一些通用词汇
    if len(selected) < count:
        additional = get_general_vocabulary(
            user_level, 
            count - len(selected),
            exclude=[w.id for w in selected]
        )
        selected.extend(additional)
    
    # 8. 打乱顺序（让用户感觉不到类型分类）
    random.shuffle(selected)
    
    return selected[:count]

def determine_flexible_type(user_style, story_theme, story_segment):
    """
    根据用户风格、故事主题和当前段落，决定"灵活"词汇的类型
    """
    # 如果用户偏爱冒险刺激
    if user_style.preference == 'adventure':
        return ['动作-冒险', '情感-勇敢', '描写-紧张']
    
    # 如果用户偏爱细腻描写
    elif user_style.preference == 'descriptive':
        return ['描写-环境', '感官-视觉', '描写-细节']
    
    # 如果用户偏爱情感表达
    elif user_style.preference == 'emotional':
        return ['情感-丰富', '思考-内心', '人际-关系']
    
    # 默认根据故事段落
    else:
        segment_types = {
            1: ['思考-好奇', '观察-发现'],
            2: ['决定-选择', '思考-判断'],
            3: ['情感-满足', '思考-总结']
        }
        return segment_types.get(story_segment, ['通用'])

def matches_user_style(word, user_style):
    """
    判断词汇是否匹配用户创作风格
    """
    if not user_style:
        return False
    
    style_category_map = {
        'adventure': ['动作', '勇敢', '冒险'],
        'descriptive': ['描写', '感官', '观察'],
        'emotional': ['情感', '内心', '人际']
    }
    
    preferred_categories = style_category_map.get(user_style.preference, [])
    return any(cat in word.category for cat in preferred_categories)
```

---

## 结语

这是一个富有创意和教育价值的项目，结合了 AI 技术、游戏化学习和个性化教育。通过故事接龙的形式，让词汇学习变得有趣而自然。

### 核心设计理念（方案 B - 隐藏式结构 + 创意驱动）

**为什么选择这个方案？**

#### 🎯 设计哲学的核心转变

**传统词汇学习软件**：
- 主打：学词汇 → 附加：有点趣味
- 结果：学生觉得是"任务"，动力不足

**我们的设计**：
- 主打：创作精彩故事 → 附带：自然学词汇
- 结果：学生想"再来一次"，学习自然发生

> **关键洞察**：
> "学生不是因为想学词汇而来，而是因为想创作意想不到的故事而来。
> 词汇只是创作的工具。当创作体验足够吸引人，学习就会自然发生。"

#### 🌟 六大设计支柱

1. **意想不到的故事体验**
   - 每次都不一样的开场（5 种随机）
   - 动态随机事件库
   - AI 识别并放大用户创意
   - 多样化的结局类型
   - **目标**：让用户每次都有"惊喜感"和"发现感"

2. **真正的创作自由**
   - 不是"选择故事类型"，而是"选择情境"
   - 3 段式灵活结构（而非 7 阶段固定模板）
   - AI 跟随用户创意，而非引导到预设路线
   - **目标**：让用户感觉在"共同创作"，而非"填空"

3. **防止套路化机制**
   - AI 检查自己的回应，避免重复句式
   - 变换使用不同的叙事风格
   - 用户创意的实时识别和放大
   - **目标**：确保每个故事都是独一无二的

4. **创意驱动的激励系统**
   - 创意度评分（比词汇数量更显眼）
   - 创意等级晋升
   - "发现新可能"提示
   - 故事收藏馆展示创意成长
   - **目标**：让用户想"下次能不能更有创意？"

5. **年龄分级系统（7-18 岁）**
   - 6 个等级，对应不同年龄段
   - 词汇难度、故事复杂度、创意空间都分级
   - 智能识别和动态调整
   - **目标**：确保每个年龄段都能享受适合的体验

6. **自然而然的学习**
   - 学习成果用"自然习得"来描述
   - 词汇是创作工具，而非学习目标
   - 淡化"任务感"，强化"成就感"
   - **目标**：让学习在不知不觉中发生

**关键创新点：**

- ✨ **情境选择替代类型选择** - "能听懂动物说话" vs "选择校园冒险"
- 🎭 **3 段式灵活结构** - 替代严格的 7 阶段模型
- 🎨 **词汇多样性推荐** - 每次 4 个词包含不同类型，保证表达自由度
- 🧠 **用户风格识别** - AI 学习用户偏好，动态调整故事和词汇
- 💫 **防套路化机制** - 多层随机性 + AI 自我检查
- 🎯 **创意度评分** - 让"创意"成为可见的、被奖励的
- 🔄 **激励重复创作** - 7 种机制确保用户想"再来一次"

### 技术架构优势

采用 **GitHub Pages + Cloudflare CDN + Supabase + DeepSeek** 的架构：
- ✅ 基础设施零成本（CDN 免费无限流量）
- ✅ 安全可靠（API Key 不暴露，数据持久化）
- ✅ 可扩展性强（轻松支持数千用户）
- ✅ 开发效率高（无需复杂服务器配置）

### 实施建议（基于创意驱动理念）

建议按照三阶段实施计划逐步推进：

#### 第一阶段：MVP（2周）- 验证核心吸引力
**重点**：确保"意想不到的故事"体验
- ✅ 实现 3 种情境选择，每种有 3 个不同开场
- ✅ AI 防套路化机制（句式变化检测）
- ✅ 基础创意度评分
- ✅ 完整的故事完成界面（突出创意指数）
- ✅ 2 个年龄等级（L2、L3）测试

**成功标准**：用户完成故事后，70% 选择"再来一次"

#### 第二阶段：完善（3周）- 增强多样性和分级
**重点**：确保不同用户都有好体验
- ✅ 扩展到 5 种情境，每种 5 个开场
- ✅ 完整的 6 个年龄等级
- ✅ 动态随机事件库
- ✅ 用户创意识别和放大机制
- ✅ 激励重复创作的 7 种机制

**成功标准**：用户平均创作 5+ 个故事，创意度平均 75+

#### 第三阶段：高级（4周）- 社区和长期留存
**重点**：建立创作社区
- ✅ 故事分享功能
- ✅ 社区最佳故事展示
- ✅ 续写已完成故事
- ✅ 多结局模式
- ✅ 好友共同创作（可选）

**成功标准**：30日留存率 >40%，月均创作 8+ 个故事

### 期待与愿景

期待这个应用能够为 7-18 岁的学生带来：

#### 🎨 创作层面
- **发现创作的乐趣** - 每次都能和 AI 创作出意想不到的故事
- **培养创意思维** - 学会用不同角度思考，敢于尝试新想法
- **获得成就感** - 看到自己的创意被认可、被放大
- **建立创作习惯** - 不是为了完成任务，而是享受创作过程

#### 📚 学习层面
- **自然积累词汇** - 在精彩的故事中，不知不觉学会新词
- **学会运用表达** - 用词汇来表达自己的想法，而非死记硬背
- **适应性学习** - 每个人都能在自己的水平上，舒适地学习和进步
- **爱上阅读写作** - 从"要我学"变成"我想写"

#### 🌟 更深远的影响
- **重新定义词汇学习** - 证明学习可以是主动的、快乐的、充满惊喜的
- **激发表达欲望** - 每个孩子都有故事想讲，我们提供舞台和工具
- **培养终身学习者** - 当学习本身变得有趣，孩子会自己去探索
- **连接想象与语言** - 帮助孩子把脑海中的画面，变成动人的文字

### 最后的话

这不仅是一个词汇学习工具，更是：
- 🎭 一个创意写作平台
- 🤝 一个智能创作伙伴
- 🌈 一个每次都有新惊喜的故事世界
- 💡 一个激发创造力和表达欲的成长空间

**我们相信**：
当学生不再是为了"学词汇"而来，
而是因为"想创作故事"而来，
学习就会自然发生，而且效果更好。

**核心使命**：
让每个孩子都能体验到——
和 AI 一起创作出连自己都没想到的精彩故事的那种惊喜与快乐！

---

**文档版本**：v3.0（创意驱动 + 隐藏式结构）  
**创建日期**：2025-10-06  
**最后更新**：2025-10-06  
**设计理念**：创意为主，学习为辅；惊喜驱动，自然习得  
**目标用户**：7-18 岁学生（小学 2 年级 - 高中 3 年级）  
**核心吸引力**：每次都能创作出意想不到的故事

