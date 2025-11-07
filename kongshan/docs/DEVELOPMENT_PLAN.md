# 空山应用开发计划

> **应用名称**：空山  
> **分类**：千古堂（古代经典体验）  
> **核心理念**：通过声音意境和抽象视觉，创造沉浸式的诗歌欣赏体验  
> **创建日期**：2025-01-XX

---

## 📋 目录

1. [项目概述](#项目概述)
2. [核心功能](#核心功能)
3. [技术架构](#技术架构)
4. [数据模型](#数据模型)
5. [实施阶段](#实施阶段)
6. [文件结构](#文件结构)
7. [关键技术实现](#关键技术实现)
8. [开发优先级](#开发优先级)
9. [注意事项](#注意事项)
10. [集成到太虚幻境](#集成到太虚幻境)

---

## 项目概述

### 应用定位

「空山」是一款专注于中国古代诗歌沉浸式欣赏的应用。通过精心设计的声音意境和抽象视觉背景，让用户在宁静的氛围中感受诗歌的意境之美。

### 核心特色

- 🎵 **声音意境**：多音效组合，营造诗歌氛围
- 🎨 **抽象视觉**：现代色彩与抽象元素，不干扰文字阅读
- 🎭 **声色意境**：用户可创作并发布自己的声音+视觉组合
- 🤖 **AI 智能**：自动分析诗歌，生成音效和背景建议
- 👥 **用户贡献**：用户可上传音效，管理员审核后加入系统
- 🎤 **录音上传**：用户可录音上传，配合诗歌意境

### 目标用户

- 中文教师和学生
- 古典文学爱好者
- 寻求宁静和沉思体验的用户

---

## 核心功能

### 1. 诗歌展示

**功能描述**：
- 竖排版从右到左显示（传统中文排版）
- 大字体、优雅排版
- 支持完整诗歌文本展示
- 响应式设计，适配桌面和移动端

**技术要求**：
- 使用 CSS `writing-mode: vertical-rl` 或 Canvas 绘制
- 支持多种古典字体
- 文字大小可调节

### 2. 声色意境系统（核心功能）

**功能描述**：
- **用户创作**：用户可以选择、组合库里的不同声音素材
- **背景自定义**：用户可以自定义背景色和动态效果
- **发布分享**：用户组合出的"声色意境"可以发布，供其他人在观赏这首诗时看到
- **多音效组合**：同时播放多个音效，支持独立音量控制
- **循环播放**：支持音效循环播放
- **播放控制**：播放/暂停、音量独立调节

**"声色意境"概念**：
- 一个"声色意境"包含：诗歌 + 音效组合 + 背景配置
- 系统预设的声色意境（管理员创建，默认展示）
- 用户创作的声色意境：
  - **使用系统预设音效**：不需要审核，可直接发布
  - **使用个人上传/录音音效**：需要审核后才能公开

**技术要求**：
- Web Audio API 实现混音
- 支持多个音频源同时播放
- 实时音量控制
- 音频预加载和缓存
- 声色意境编辑器界面

### 3. AI 智能生成

**功能描述**：
- DeepSeek AI 分析诗歌，生成音效建议（关键词、描述）
- AI 生成背景色彩和抽象元素指令
- 可选使用 AI 生成的内容
- 用户可手动调整 AI 建议

**技术要求**：
- Supabase Edge Function 调用 DeepSeek API
- JSON 格式返回分析结果
- 前端解析和展示 AI 建议

### 4. 用户贡献系统

**功能描述**：
- **音效上传**：用户上传音效文件（MP3、WAV 等格式）
- **录音上传**：用户可自己录音上传，配合诗歌意境
- **元数据填写**：填写音效元数据（名称、描述、标签）
- **私有使用**：用户自己录音上传的音效，暂时不能公开给其他人使用
- **审核流程**：管理员审核后，用户制作的"声色意境"才可以公布
- **音效入库**：审核通过后，用户上传的音效可以加入音效库供别人使用
- **审核拒绝**：审核拒绝时提供反馈

**技术要求**：
- Supabase Storage 存储音效文件
- 浏览器录音 API（MediaRecorder）
- 文件上传进度显示
- 音频预览功能
- 管理员权限控制（RLS 策略）
- 音效状态管理（私有/待审核/已公开）

### 5. 后期功能（第二阶段）

**功能描述**：
- 用户输入任意诗句，AI 自动生成声音意境
- 用户可手动修改 AI 生成的音效组合
- 用户可调整背景配置
- 管理员可审核并将用户创作加入系统诗歌库

**技术要求**：
- 用户创作数据存储
- 创作编辑器界面
- 创作审核工作流

---

### UI 设计原则

- **现代极简**：借鉴冥想类、soundscape 类应用（如 Tide），界面元素克制、布局简洁
- **轻量优雅**：字体使用优雅的衬线/无衬线组合，配色柔和，低对比度渐变
- **沉浸专注**：单屏体验，避免干扰；保留足够留白；强调声色意境的展示
- **动静结合**：背景动画保持缓慢、柔和；音效控制采用圆形或滑块，反馈细腻
- **暗色友好**：设计浅色与深色主题，夜间浏览更舒适
- **响应式一致**：桌面与移动端保持一致的沉浸体验，控件在移动端可触控

---

## 技术架构

### 前端技术栈

- **HTML5 + CSS3 + Vanilla JavaScript**
  - 不使用框架，保持轻量
  - ES6+ 模块化组织

- **Web Audio API**
  - 音频播放和混音
  - 实时音量控制
  - 音频缓存管理

- **Canvas API**
  - 抽象背景生成
  - 动态视觉效果

- **Supabase JS Client**
  - 用户认证
  - 数据库查询
  - 实时数据同步
  - Storage 文件上传

### 后端服务

- **Supabase**
  - PostgreSQL 数据库
  - 用户认证（Google OAuth、匿名登录）
  - Storage（音效文件存储）
  - Edge Functions（AI 服务代理）

- **DeepSeek API**
  - 通过 Supabase Edge Function 调用
  - 诗歌分析和建议生成
  - 成本控制和缓存策略

- **Pixabay API（可选）**
  - 免费音效搜索和下载
  - 通过 Edge Function 集成

### 架构图

```
┌─────────────────────────────────────┐
│         前端应用 (kongshan/)         │
├─────────────────────────────────────┤
│  - HTML/CSS/JS                        │
│  - Web Audio API (混音)               │
│  - Canvas (背景渲染)                  │
│  - Supabase Client                    │
└──────────────┬────────────────────────┘
               │
               │ HTTP/WebSocket
               │
┌──────────────▼────────────────────────┐
│      Supabase 后端服务                │
├───────────────────────────────────────┤
│  - PostgreSQL 数据库                  │
│  - Authentication                     │
│  - Storage (音效文件)                  │
│  - Edge Functions:                    │
│    ├── poem-analyzer (AI 分析)        │
│    └── sound-search (Pixabay)        │
└──────────────┬────────────────────────┘
               │
               │ API 调用
               │
┌──────────────▼────────────────────────┐
│      外部服务                          │
├───────────────────────────────────────┤
│  - DeepSeek API (AI 分析)             │
│  - Pixabay API (音效搜索)              │
└───────────────────────────────────────┘
```

---

## 数据模型

### 核心数据表

#### 1. `poems`（诗歌表）

存储系统预设的诗歌数据。

```sql
CREATE TABLE poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  dynasty TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `title`: 诗歌标题
- `author`: 作者姓名
- `dynasty`: 朝代（如：唐、宋）
- `content`: 完整诗歌内容（保留换行和标点）

#### 2. `sound_effects`（音效表）

存储所有音效文件信息。

```sql
CREATE TABLE sound_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,  -- Supabase Storage URL
  duration INTEGER,  -- 时长（秒）
  tags TEXT[],  -- 标签数组（如：['雨声', '自然', '宁静']）
  source TEXT DEFAULT 'system',  -- 'system'（系统预设）或 'user'（用户上传）
  upload_type TEXT DEFAULT 'file',  -- 'file'（文件上传）或 'recording'（录音上传）
  uploaded_by UUID REFERENCES auth.users(id),
  
  -- 审核状态
  status TEXT DEFAULT 'approved',  -- 'private'（私有，仅创建者可用）, 'pending'（待审核）, 'approved'（已批准，公开可用）, 'rejected'（已拒绝）
  rejected_reason TEXT,  -- 拒绝原因
  reviewed_by UUID REFERENCES auth.users(id),  -- 审核者
  reviewed_at TIMESTAMP,  -- 审核时间
  
  -- 统计
  usage_count INTEGER DEFAULT 0,  -- 被使用的次数（在已发布的声色意境中）
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `file_url`: Supabase Storage 中的文件路径
- `tags`: 用于搜索和分类
- `upload_type`: 区分文件上传和录音上传
- `status`: 
  - `private`: 用户上传但未审核，仅创建者可在自己的声色意境中使用
  - `pending`: 已提交审核，等待管理员审核
  - `approved`: 审核通过，公开可用，加入音效库
  - `rejected`: 审核拒绝
- `usage_count`: 统计该音效在已发布的声色意境中被使用的次数

#### 3. `poem_atmospheres`（声色意境表 - 核心表）

存储每首诗歌的"声色意境"配置。一个声色意境包含音效组合和背景配置。

```sql
CREATE TABLE poem_atmospheres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE,
  name TEXT,  -- 意境名称（可选，用户可命名）
  description TEXT,  -- 意境描述（可选）
  
  -- 音效组合配置（JSONB 数组）
  sound_combination JSONB NOT NULL,  -- [{"sound_id": "uuid", "volume": 0.8, "loop": true}, ...]
  
  -- 背景配置
  background_config JSONB NOT NULL,  -- {"color_scheme": {...}, "abstract_elements": [...]}
  
  -- 元数据
  source TEXT DEFAULT 'system',  -- 'system'（系统预设）或 'user'（用户创作）
  created_by UUID REFERENCES auth.users(id),  -- 创建者（系统预设为 NULL）
  is_ai_generated BOOLEAN DEFAULT false,  -- 是否使用 AI 生成
  is_default BOOLEAN DEFAULT false,  -- 是否为该诗歌的默认意境
  
  -- 审核状态（仅用户创作需要）
  status TEXT DEFAULT 'approved',  -- 'draft'（草稿）, 'pending'（待审核）, 'approved'（已批准）, 'rejected'（已拒绝）
  -- 注意：如果只使用系统预设音效，status 直接为 'approved'，不需要审核
  admin_feedback TEXT,  -- 管理员反馈（拒绝时）
  reviewed_by UUID REFERENCES auth.users(id),  -- 审核者
  reviewed_at TIMESTAMP,  -- 审核时间
  
  -- 统计
  view_count INTEGER DEFAULT 0,  -- 查看次数
  like_count INTEGER DEFAULT 0,  -- 点赞次数
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `sound_combination`: JSON 数组，每个元素包含音效ID、音量、循环设置
  ```json
  [
    {"sound_id": "uuid1", "volume": 0.8, "loop": true},
    {"sound_id": "uuid2", "volume": 0.5, "loop": false}
  ]
  ```
- `background_config`: JSON 对象，包含颜色方案和抽象元素
  ```json
  {
    "color_scheme": {
      "colors": ["#1a1a2e", "#16213e"],
      "direction": "diagonal"
    },
    "abstract_elements": [
      {"type": "particles", "count": 50, "color": "#ffffff", "opacity": 0.3}
    ]
  }
  ```
- `source`: 区分系统预设和用户创作
- `status`: 
  - 如果声色意境只使用系统预设音效，`status` 直接为 `approved`，不需要审核
  - 如果声色意境使用了个人上传/录音音效，需要审核后才能公开
- 一首诗歌可以有多个声色意境（系统预设 + 多个用户创作）

#### 4. `atmosphere_sounds`（声色意境-音效关联表）

存储声色意境中使用的音效详情（用于查询和统计）。

```sql
CREATE TABLE atmosphere_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atmosphere_id UUID REFERENCES poem_atmospheres(id) ON DELETE CASCADE,
  sound_effect_id UUID REFERENCES sound_effects(id) ON DELETE CASCADE,
  volume DECIMAL DEFAULT 1.0,  -- 音量 0-1
  loop BOOLEAN DEFAULT true,  -- 是否循环
  order_index INTEGER DEFAULT 0,  -- 显示顺序
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(atmosphere_id, sound_effect_id, order_index)
);
```

**说明**：这个表用于快速查询和统计，主要数据仍在 `poem_atmospheres.sound_combination` JSONB 中。

#### 5. `atmosphere_likes`（声色意境点赞表）

存储用户对声色意境的点赞记录。

```sql
CREATE TABLE atmosphere_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atmosphere_id UUID REFERENCES poem_atmospheres(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(atmosphere_id, user_id)
);
```

**说明**：用于统计点赞数和防止重复点赞。

#### 6. `user_poem_creations`（用户创作诗句表 - 第二阶段）

存储用户自己输入的诗句（非系统预设诗歌）。

```sql
CREATE TABLE user_poem_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_content TEXT NOT NULL,  -- 用户输入的诗句
  title TEXT,  -- 标题（可选）
  author TEXT,  -- 作者（可选，用户可标注）
  status TEXT DEFAULT 'draft',  -- 'draft', 'pending_approval', 'approved', 'rejected'
  admin_feedback TEXT,  -- 管理员反馈
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**说明**：用户输入的诗句审核通过后，可以创建对应的 `poems` 记录和 `poem_atmospheres` 记录。

### RLS 策略

#### 公开读取
- `poems`: 所有用户可读
- `sound_effects`: 
  - `status = 'approved'` 的公开可读（已审核通过，加入音效库）
  - 用户可读自己上传的所有音效（包括 `private` 状态）
- `poem_atmospheres`: 
  - `status = 'approved'` 的公开可读（已审核通过）
  - 用户可读自己创建的所有声色意境（包括 `draft`、`pending` 和 `rejected` 状态）
  - 注意：即使 `status = 'rejected'`，创建者仍可欣赏自己的创作
- `atmosphere_likes`: 所有用户可读（用于统计）

#### 用户权限
- `sound_effects`: 
  - 用户可创建（上传文件或录音）
  - 用户只能修改自己上传的、状态为 `private` 或 `draft` 的音效
  - 用户不能修改已提交审核或已审核的音效
- `poem_atmospheres`: 
  - 用户可创建自己的声色意境
  - 用户只能修改自己创建的、状态为 `draft` 的声色意境
  - 用户不能修改已提交审核或已审核的声色意境
- `atmosphere_likes`: 用户可创建和删除自己的点赞
- `user_poem_creations`: 用户可创建和修改自己的创作

#### 管理员权限
- 所有表的完整权限（通过 Service Role Key 或管理员角色）
- 可以审核用户上传的音效和创作的声色意境
- 可以修改音效状态（`private` → `pending` → `approved`）
- 可以修改声色意境状态（`draft` → `pending` → `approved`）
- **注意**：暂时只有创建者一人为管理员，在学校小范围试用

---

## 实施阶段

### 阶段 1：基础框架（核心功能）

#### 1.1 项目结构搭建 ✅

**任务**：
- [x] 创建 `kongshan/` 目录结构
- [ ] 初始化 `index.html`
- [ ] 创建基础 CSS 文件
- [ ] 创建基础 JS 模块结构
- [ ] 配置 Supabase 客户端
- [ ] 添加应用切换器组件

**文件**：
- `kongshan/index.html`
- `kongshan/css/main.css`
- `kongshan/js/config.js`
- `kongshan/js/app.js`

#### 1.2 数据库设计

**任务**：
- [ ] 创建 Supabase 项目
- [ ] 编写数据库迁移脚本
- [ ] 配置 RLS 策略
- [ ] 设置 Supabase Storage（创建 `sound-effects` bucket）
- [ ] 测试数据插入

**文件**：
- `kongshan/supabase/migrations/001_initial_schema.sql`
- `kongshan/supabase/migrations/002_rls_policies.sql`
- `kongshan/supabase/migrations/003_storage_setup.sql`

#### 1.3 诗歌展示功能

**任务**：
- [ ] 实现竖排文字布局（CSS writing-mode）
- [ ] 诗歌数据管理（手动输入初始数据）
- [ ] 诗歌列表界面
- [ ] 诗歌详情页面
- [ ] 响应式设计

**文件**：
- `kongshan/js/core/poem-manager.js`
- `kongshan/js/features/poem-display.js`
- `kongshan/js/ui/poem-viewer.js`
- `kongshan/css/poem-display.css`

#### 1.4 基础音效播放

**任务**：
- [ ] Web Audio API 初始化
- [ ] 单音效播放功能
- [ ] 音频文件加载和缓存
- [ ] 播放/暂停控制
- [ ] 错误处理

**文件**：
- `kongshan/js/core/audio-engine.js`

#### 1.5 多音效混音

**任务**：
- [ ] 多音效同时播放实现
- [ ] 独立音量控制
- [ ] 循环播放支持
- [ ] 音效组合管理

**文件**：
- `kongshan/js/features/sound-mixer.js`

#### 1.6 预设声色意境

**任务**：
- [ ] 手动为初始诗歌创建系统预设的声色意境
- [ ] 声色意境保存到数据库（包含音效组合和背景配置）
- [ ] 加载和播放预设声色意境
- [ ] 音效控制面板 UI
- [ ] 背景预览功能

**文件**：
- `kongshan/js/ui/sound-controls.js`
- `kongshan/js/ui/atmosphere-viewer.js`

#### 1.7 用户创作声色意境

**任务**：
- [ ] 声色意境编辑器界面
- [ ] 音效选择器（从音效库中选择）
- [ ] 背景配置器（中国传统色预设 + 自定义调色）
- [ ] 实时预览功能
- [ ] 保存草稿功能
- [ ] **审核判断逻辑**：检测是否使用了个人音效
  - 如果只使用系统预设音效：直接发布（`status = 'approved'`）
  - 如果使用了个人音效：提交审核（`status = 'pending'`）
- [ ] 提交审核功能

**文件**：
- `kongshan/js/features/atmosphere-editor.js`
- `kongshan/js/ui/atmosphere-editor.js`

#### 1.8 UI 风格落地

**任务**：
- [ ] 设计现代、极简、冥想感的视觉风格（参考 Tide 等 soundscape 应用）
- [ ] 定义全局色板（含中国传统色预设 + 暗色模式）
- [ ] 选定字体组合（优雅衬线 + 现代无衬线）
- [ ] 设计沉浸式布局（单屏、留白、无干扰控件）
- [ ] 设计音效控制组件（圆形/滑块、柔和反馈）
- [ ] 定义缓慢的背景动效规范
- [ ] 在桌面与移动端验证响应式一致性

**文件**：
- `kongshan/css/main.css`
- `kongshan/css/poem-display.css`
- `kongshan/css/responsive.css`
- `kongshan/js/ui/atmosphere-viewer.js`

### 阶段 2：AI 智能生成

#### 2.1 DeepSeek Edge Function

**任务**：
- [ ] 创建 `poem-analyzer` Edge Function
- [ ] 实现诗歌分析（提取关键词、意境描述）
- [ ] 生成音效建议（关键词列表、描述）
- [ ] 生成背景色彩建议（颜色方案、抽象元素描述）
- [ ] 错误处理和降级方案

**文件**：
- `kongshan/supabase/functions/poem-analyzer/index.ts`

**API 接口**：
```typescript
POST /functions/v1/poem-analyzer
Body: { poem_content: string }
Response: {
  keywords: string[],
  sound_suggestions: Array<{
    name: string,
    description: string,
    tags: string[]
  }>,
  background_suggestion: {
    colors: string[],
    mood: string,
    elements: string[]
  }
}
```

#### 2.2 AI 背景生成

**任务**：
- [ ] Canvas 抽象背景渲染引擎
- [ ] 根据 AI 指令生成渐变背景
- [ ] **中国传统色预设**：预设中国传统色彩方案
- [ ] **用户调色功能**：支持用户自定义调色
- [ ] 抽象元素绘制（粒子、线条、形状等）
  - 注意：动态特效的具体类型待后续补充
- [ ] 预设背景风格库
- [ ] 背景预览功能

**文件**：
- `kongshan/js/core/background-renderer.js`

#### 2.3 前端 AI 集成

**任务**：
- [ ] 调用 Edge Function 获取 AI 建议
- [ ] 展示 AI 生成的音效建议
- [ ] 展示 AI 生成的背景预览
- [ ] 用户选择是否使用 AI 生成内容
- [ ] 手动调整 AI 建议

**文件**：
- `kongshan/js/features/ai-generator.js`

### 阶段 3：用户上传和审核

#### 3.1 用户认证

**任务**：
- [ ] Supabase 认证集成
- [ ] 登录/注册界面
- [ ] 用户状态管理
- [ ] 认证状态监听

**文件**：
- `kongshan/js/core/auth-manager.js`
- `kongshan/js/ui/login-screen.js`

#### 3.2 音效上传功能

**任务**：
- [ ] 文件上传界面
- [ ] **录音上传功能**（浏览器 MediaRecorder API）
  - 录音时长限制：最长 120 秒
  - 格式选择：优先使用手机最容易获得的格式（WebM/MP3）
  - 降噪处理（如果实现不复杂）
- [ ] Supabase Storage 上传
- [ ] 音效元数据输入（名称、描述、标签）
- [ ] 上传进度显示
- [ ] 文件格式验证
- [ ] 文件大小限制
- [ ] 音效状态管理（私有/待审核/已公开）

**文件**：
- `kongshan/js/features/upload-manager.js`
- `kongshan/js/features/audio-recorder.js`（新增）
- `kongshan/js/ui/upload-form.js`

#### 3.3 管理员审核界面

**任务**：
- [ ] 待审核音效列表
- [ ] 待审核声色意境列表（仅显示使用了个人音效的）
- [ ] 音效试听功能
- [ ] 声色意境预览功能（试听音效组合和查看背景）
- [ ] 查看详细信息（上传者、标签、描述、使用情况）
- [ ] 批准/拒绝操作
- [ ] **审核逻辑**：
  - 审核通过声色意境时，自动将其使用的 `private` 音效设为 `approved`
  - 如果音效被拒绝，声色意境保持 `rejected` 状态，创建者仍可欣赏
- [ ] 批量操作支持
- [ ] 审核历史记录
- [ ] 管理员权限检查（暂时只有创建者一人）

**文件**：
- `kongshan/js/ui/admin-panel.js`
- `kongshan/admin/index.html`（管理员后台页面）

#### 3.4 音效库管理

**任务**：
- [ ] 系统音效库浏览（仅显示 `status = 'approved'` 的音效）
- [ ] 用户个人音效库（显示自己上传的所有音效，包括私有状态）
- [ ] 按标签筛选
- [ ] 搜索功能
- [ ] 音效详情页面
- [ ] 音效预览播放
- [ ] 音效使用统计（在哪些声色意境中被使用）

**文件**：
- `kongshan/js/ui/sound-library.js`

#### 3.5 声色意境浏览和选择

**任务**：
- [ ] 诗歌详情页显示多个声色意境（系统预设 + 用户创作）
- [ ] **默认显示逻辑**：
  - 如有系统预设的，默认显示系统预设
  - 同时列出最受欢迎的（按点赞数排序）
  - 如果没有系统预设，默认使用最受欢迎的
- [ ] 用户可以选择不同的声色意境来欣赏
- [ ] 显示声色意境的基本信息（创建者、点赞数、查看数）
- [ ] 点赞功能
- [ ] 分享功能

**文件**：
- `kongshan/js/ui/atmosphere-selector.js`

### 阶段 4：声音库集成（可选）

#### 4.1 Pixabay API 集成

**任务**：
- [ ] 创建 Edge Function 调用 Pixabay API
- [ ] 搜索相关音效
- [ ] 下载和存储到 Supabase Storage
- [ ] 添加到系统音效库
- [ ] 管理员工具界面

**文件**：
- `kongshan/supabase/functions/sound-search/index.ts`

### 阶段 5：后期功能（用户输入诗句 - 暂不实施）

**注意**：用户输入诗句功能暂时不做，先做系统预设一些诗句。

#### 5.1 用户输入诗句（未来功能）

**任务**：
- [ ] 诗句输入界面
- [ ] 输入验证和格式化
- [ ] 保存草稿功能
- [ ] 为输入的诗句创建声色意境

#### 5.2 AI 自动生成声色意境（未来功能）

**任务**：
- [ ] 调用 AI 分析用户输入的诗句
- [ ] 自动生成音效组合建议
- [ ] 自动生成背景建议
- [ ] 一键应用 AI 建议创建声色意境

#### 5.3 用户创作诗句审核（未来功能）

**任务**：
- [ ] 用户提交创作的诗句
- [ ] 管理员审核界面（查看、试听、批准）
- [ ] 批准后创建对应的 `poems` 记录
- [ ] 批准后创建对应的 `poem_atmospheres` 记录
- [ ] 拒绝时提供反馈

---

## 文件结构

```
kongshan/
├── index.html                 # 主入口
├── README.md                  # 应用说明
│
├── js/
│   ├── app.js                # 应用入口
│   ├── config.js             # Supabase 配置
│   ├── core/
│   │   ├── poem-manager.js   # 诗歌管理
│   │   ├── audio-engine.js   # 音频引擎（Web Audio API）
│   │   ├── background-renderer.js  # 背景渲染引擎
│   │   ├── auth-manager.js   # 认证管理
│   │   └── atmosphere-manager.js  # 声色意境管理
│   ├── features/
│   │   ├── poem-display.js   # 诗歌展示（竖排）
│   │   ├── sound-mixer.js    # 音效混音器
│   │   ├── ai-generator.js   # AI 生成功能
│   │   ├── upload-manager.js # 音效上传管理
│   │   ├── audio-recorder.js # 录音功能
│   │   └── atmosphere-editor.js  # 声色意境编辑器
│   └── ui/
│       ├── screens.js        # 界面显示
│       ├── poem-viewer.js    # 诗歌查看器
│       ├── sound-controls.js # 音效控制面板
│       ├── atmosphere-viewer.js  # 声色意境查看器
│       ├── atmosphere-editor.js   # 声色意境编辑器 UI
│       ├── atmosphere-selector.js  # 声色意境选择器
│       ├── login-screen.js   # 登录界面
│       └── admin-panel.js   # 管理员面板
│
├── css/
│   ├── main.css              # 主样式（现代、极简、冥想感主题）
│   ├── variables.css         # CSS 变量（色板、字体、暗色模式）
│   ├── poem-display.css      # 诗歌展示样式
│   └── responsive.css        # 响应式样式（桌面/移动一致的沉浸体验）
│
├── assets/
│   ├── fonts/                # 字体文件
│   ├── audio/                # 预设音效（可选）
│   └── images/               # 图标等
│
├── admin/                    # 管理员后台
│   └── index.html            # 审核和管理界面
│
├── supabase/
│   ├── functions/
│   │   ├── poem-analyzer/    # AI 诗歌分析
│   │   └── sound-search/     # 声音库搜索（可选）
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_storage_setup.sql
│
└── docs/
    ├── DEVELOPMENT_PLAN.md   # 本文件
    └── DESIGN.md             # 设计文档（可选）
```

---

## 关键技术实现

### 1. 竖排文字显示

#### 方案 A：CSS writing-mode（推荐）

```css
.poem-container {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 3rem;
  line-height: 2;
  letter-spacing: 0.5em;
  font-family: '仓耳今楷', 'KaiTi', serif;
  text-align: right;
}

.poem-line {
  display: block;
  margin-bottom: 1em;
}
```

#### 方案 B：Canvas 绘制（更灵活）

```javascript
function drawVerticalPoem(ctx, poem, x, y, fontSize) {
  const lines = poem.split('\n');
  let currentX = x;
  
  lines.forEach(line => {
    const chars = line.split('');
    let currentY = y;
    
    chars.forEach(char => {
      ctx.fillText(char, currentX, currentY);
      currentY += fontSize * 1.2; // 行高
    });
    
    currentX -= fontSize * 1.5; // 列间距
  });
}
```

### 2. Web Audio API 混音

```javascript
class AudioEngine {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sources = new Map(); // 存储所有播放源
    this.buffers = new Map(); // 音频缓存
  }
  
  async loadSound(url) {
    if (this.buffers.has(url)) {
      return this.buffers.get(url);
    }
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.buffers.set(url, audioBuffer);
    return audioBuffer;
  }
  
  async playSound(soundId, url, volume = 1.0, loop = false) {
    try {
      const audioBuffer = await this.loadSound(url);
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      source.loop = loop;
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
      
      this.sources.set(soundId, { source, gainNode });
      
      // 播放结束时清理
      source.onended = () => {
        this.sources.delete(soundId);
      };
    } catch (error) {
      console.error('播放音效失败:', error);
    }
  }
  
  setVolume(soundId, volume) {
    const sound = this.sources.get(soundId);
    if (sound) {
      sound.gainNode.gain.value = volume;
    }
  }
  
  stopSound(soundId) {
    const sound = this.sources.get(soundId);
    if (sound) {
      sound.source.stop();
      this.sources.delete(soundId);
    }
  }
  
  stopAll() {
    this.sources.forEach((sound, id) => {
      sound.source.stop();
    });
    this.sources.clear();
  }
}
```

### 3. Canvas 抽象背景生成

```javascript
class BackgroundRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  renderGradient(colors, direction = 'diagonal') {
    let gradient;
    
    if (direction === 'diagonal') {
      gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    } else if (direction === 'vertical') {
      gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    } else {
      gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    }
    
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  renderParticles(count, color, opacity = 0.3) {
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = opacity;
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const radius = Math.random() * 3 + 1;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  renderAbstractLines(count, color, opacity = 0.2) {
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < count; i++) {
      const x1 = Math.random() * this.canvas.width;
      const y1 = Math.random() * this.canvas.height;
      const x2 = Math.random() * this.canvas.width;
      const y2 = Math.random() * this.canvas.height;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  render(config) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染渐变背景
    if (config.color_scheme) {
      this.renderGradient(
        config.color_scheme.colors,
        config.color_scheme.direction || 'diagonal'
      );
    }
    
    // 渲染抽象元素
    if (config.abstract_elements) {
      config.abstract_elements.forEach(element => {
        if (element.type === 'particles') {
          this.renderParticles(element.count || 50, element.color, element.opacity);
        } else if (element.type === 'lines') {
          this.renderAbstractLines(element.count || 20, element.color, element.opacity);
        }
      });
    }
  }
}
```

### 4. DeepSeek AI 分析

Edge Function 实现：

```typescript
// supabase/functions/poem-analyzer/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

serve(async (req) => {
  // CORS 处理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { poem_content } = await req.json();

    if (!poem_content) {
      return new Response(
        JSON.stringify({ error: '缺少 poem_content 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `你是一個中國古典詩歌分析專家。分析詩歌的意境、聲音元素和視覺元素。

請返回 JSON 格式，包含以下內容：
1. keywords: 詩歌的關鍵詞（數組）
2. sound_suggestions: 音效建議（數組，每個包含 name, description, tags）
3. background_suggestion: 背景建議（包含 colors, mood, elements）

格式示例：
{
  "keywords": ["雨", "夜", "思"],
  "sound_suggestions": [
    {
      "name": "夜雨聲",
      "description": "輕柔的雨聲，營造寧靜夜晚氛圍",
      "tags": ["雨聲", "夜晚", "自然"]
    }
  ],
  "background_suggestion": {
    "colors": ["#1a1a2e", "#16213e", "#0f3460"],
    "mood": "深沉、寧靜、沉思",
    "elements": ["particles", "subtle_lines"]
  }
}`;

    const userPrompt = `請分析以下詩歌：\n\n${poem_content}`;

    // 调用 DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 解析 JSON
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 开发优先级

### 必须实现（MVP）

1. ✅ **项目结构搭建**
   - 创建目录结构
   - 基础文件初始化

2. ⏳ **数据库设计**
   - 创建 Supabase 项目
   - 编写迁移脚本（包含 `poem_atmospheres` 表）
   - 配置 RLS 策略

3. ⏳ **诗歌展示功能**
   - 竖排文字布局
   - 诗歌列表和详情

4. ⏳ **基础音效播放**
   - Web Audio API 集成
   - 单音效播放

5. ⏳ **多音效混音**
   - 同时播放多个音效
   - 音量控制

6. ⏳ **预设声色意境**
   - 手动创建系统预设的声色意境
   - 包含音效组合和背景配置
   - 保存和加载

7. ⏳ **用户认证**
   - Supabase 认证集成
   - 登录界面

8. ⏳ **用户创作声色意境**
   - 声色意境编辑器
   - 音效选择器
   - 背景配置器
   - 保存草稿和提交审核

9. ⏳ **音效上传**
   - 文件上传功能
   - **录音上传功能**
   - 元数据输入
   - 音效状态管理（私有/待审核）

10. ⏳ **声色意境浏览和选择**
    - 显示多个声色意境
    - 用户选择功能
    - 点赞功能

11. ⏳ **管理员审核（基础）**
    - 审核列表（音效 + 声色意境）
    - 试听和预览功能
    - 批准/拒绝操作
    - 审核通过后自动公开

### 重要功能

10. ⏳ **AI 诗歌分析**
    - Edge Function 实现
    - 前端集成

11. ⏳ **AI 背景生成**
    - Canvas 渲染引擎
    - AI 指令解析

12. ⏳ **管理员审核（完整）**
    - 试听功能
    - 批量操作

### 增强功能

13. ⏳ **Pixabay 集成**（可选）
    - API 集成
    - 音效搜索和下载

14. ⏳ **用户创作功能**（暂不实施）
    - 诗句输入（未来功能）
    - AI 自动生成（未来功能）
    - 手动编辑（未来功能）
    - 创作审核（未来功能）

---

## 注意事项

### 1. 音频文件大小

- **问题**：音频文件可能较大，占用存储空间
- **解决方案**：
  - 使用音频压缩（MP3 128kbps）
  - 限制文件大小（如 5MB）
  - 录音上传时设置合适的采样率
  - 考虑使用 CDN 加速

### 1.5. 录音功能浏览器兼容性

- **问题**：MediaRecorder API 在不同浏览器支持不同
- **解决方案**：
  - 检测浏览器支持情况
  - 提供降级方案（提示用户使用文件上传）
  - 支持多种音频格式（优先使用手机最容易获得的格式：WebM/MP3）
  - 录音时长限制：最长 120 秒
  - 降噪处理（如果实现不复杂）

### 2. 浏览器兼容性

- **问题**：Web Audio API 需要现代浏览器
- **解决方案**：
  - 检测浏览器支持
  - 提供降级方案（使用 HTML5 Audio）
  - 显示浏览器兼容性提示

### 3. 性能优化

- **问题**：大量音效同时播放可能影响性能
- **解决方案**：
  - 限制同时播放数量（如最多 5 个）
  - 音频预加载和缓存
  - 使用 Web Workers 处理音频解码（如需要）

### 4. AI 成本控制

- **问题**：DeepSeek API 调用会产生成本
- **解决方案**：
  - 缓存 AI 分析结果（相同诗歌不重复分析）
  - 限制用户调用频率
  - 使用较短的 prompt 减少 token 消耗

### 5. 审核工作流

- **问题**：用户上传的音效和创作的声色意境可能积压，需要高效审核
- **重要规则**：
  - 如果用户只使用系统预设音效创建声色意境，**不需要审核**，直接发布
  - 只有使用了个人上传/录音音效的声色意境，才需要审核
  - 审核通过声色意境时，自动将其使用的 `private` 音效设为 `approved`
  - 如果音效被拒绝，声色意境保持 `rejected` 状态，但创建者仍可欣赏
- **解决方案**：
  - 设计清晰的审核界面（区分音效审核和声色意境审核）
  - 支持批量操作
  - 提供审核统计和提醒
  - 审核通过后自动更新状态和权限
  - 审核通过后自动将音效加入公共库

### 6. 用户体验

- **问题**：首次加载可能较慢
- **解决方案**：
  - 实现加载进度显示
  - 音频文件懒加载
  - 优化资源加载顺序

### 7. 声色意境数据一致性

- **问题**：声色意境中的音效可能被删除或状态变更
- **解决方案**：
  - 审核时检查音效状态
  - 显示音效状态（可用/不可用）
  - **如果音效被拒绝，提示用户要想发布给别人欣赏必须替换掉该音效**
  - 声色意境不失效，创建者仍可欣赏
  - 提供音效替换功能（仅草稿状态可编辑）
  - 定期清理无效的声色意境

---

## 集成到太虚幻境

### 1. 在主站注册应用

编辑 `index.html`，在 `apps` 数组中添加：

```javascript
{
  id: 'kongshan',
  name: '空山',
  url: '/kongshan/index.html',
  category: '千古堂',
  description: '诗歌声音意境欣赏'
}
```

### 2. 注册到应用切换器

编辑 `assets/js/taixu-app-switcher.js`，在 `apps` 数组中添加相同配置。

### 3. 添加应用切换器组件

在 `kongshan/index.html` 的 `</body>` 之前添加：

```html
<script src="/assets/js/taixu-app-switcher.js"></script>
```

### 4. 测试集成

- 从主站跳转到应用
- 从应用切换回主站
- 测试应用切换器功能

---

## 开发时间估算

### 阶段 1：基础框架（2-3 周）
- 项目搭建：1 天
- 数据库设计：2 天
- 诗歌展示：3 天
- 音效播放：3 天
- 预设组合：2 天
- 用户认证：2 天
- 音效上传：2 天
- 基础审核：2 天

### 阶段 2：AI 功能（1-2 周）
- Edge Function：2 天
- 背景渲染：3 天
- 前端集成：2 天
- 测试优化：2 天

### 阶段 3：完整审核（1 周）
- 审核界面完善：3 天
- 批量操作：2 天
- 测试：1 天

### 阶段 4：可选功能（1-2 周）
- Pixabay 集成：3-5 天
- 用户创作：5-7 天

**总计**：约 5-8 周（取决于功能范围）

---

## 后续优化方向

1. **性能优化**
   - 音频文件 CDN 加速
   - 懒加载和预加载策略
   - 代码分割和压缩

2. **用户体验**
   - 动画过渡效果
   - 更丰富的背景效果
   - 音效淡入淡出

3. **功能扩展**
   - 诗歌朗读（TTS）
   - 诗歌收藏和分享
   - 用户个人音效库

4. **数据分析**
   - 用户使用统计
   - 热门诗歌排行
   - 音效使用分析

---

**最后更新**：2025-01-XX  
**版本**：1.0.0  
**状态**：规划阶段

