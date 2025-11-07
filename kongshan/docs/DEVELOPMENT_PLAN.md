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
- 🤖 **AI 智能**：自动分析诗歌，生成音效和背景建议
- 👥 **用户贡献**：用户可上传音效，管理员审核后加入系统
- ✍️ **用户创作**：后期支持用户输入任意诗句，AI 自动生成声音意境

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

### 2. 声音意境系统

**功能描述**：
- 多音效组合播放（同时播放，支持独立音量控制）
- 音效与诗歌意境的关联
- 循环播放支持
- 播放/暂停控制
- 音量独立调节

**技术要求**：
- Web Audio API 实现混音
- 支持多个音频源同时播放
- 实时音量控制
- 音频预加载和缓存

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
- 用户上传音效文件（MP3、WAV 等格式）
- 填写音效元数据（名称、描述、标签）
- 管理员审核（试听、查看信息、批量操作）
- 审核通过后加入系统音效库
- 审核拒绝时提供反馈

**技术要求**：
- Supabase Storage 存储音效文件
- 文件上传进度显示
- 音频预览功能
- 管理员权限控制（RLS 策略）

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
  source TEXT DEFAULT 'system',  -- 'system' 或 'user'
  uploaded_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'approved',  -- 'pending', 'approved', 'rejected'
  rejected_reason TEXT,  -- 拒绝原因
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `file_url`: Supabase Storage 中的文件路径
- `tags`: 用于搜索和分类
- `status`: 审核状态（用户上传的需要审核）

#### 3. `poem_sound_mappings`（诗歌-音效关联表）

存储每首诗歌的音效组合配置。

```sql
CREATE TABLE poem_sound_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE,
  sound_effect_id UUID REFERENCES sound_effects(id) ON DELETE CASCADE,
  volume DECIMAL DEFAULT 1.0,  -- 音量 0-1
  loop BOOLEAN DEFAULT true,  -- 是否循环
  order_index INTEGER DEFAULT 0,  -- 播放顺序
  is_ai_generated BOOLEAN DEFAULT false,  -- 是否AI生成
  created_by UUID REFERENCES auth.users(id),  -- 创建者（系统或用户）
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(poem_id, sound_effect_id, order_index)
);
```

**字段说明**：
- 一首诗歌可以有多个音效
- `order_index` 用于排序（虽然同时播放，但用于界面显示顺序）
- `is_ai_generated` 标记是否为 AI 建议

#### 4. `poem_backgrounds`（诗歌背景配置表）

存储每首诗歌的背景配置。

```sql
CREATE TABLE poem_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE UNIQUE,
  background_type TEXT DEFAULT 'preset',  -- 'preset' 或 'ai_generated'
  color_scheme JSONB,  -- 色彩方案：{"colors": ["#hex1", "#hex2"], "direction": "diagonal"}
  abstract_elements JSONB,  -- 抽象元素：{"type": "particles", "count": 50, "color": "#hex"}
  ai_instructions TEXT,  -- AI 生成指令（如果使用AI）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `color_scheme`: JSON 格式存储颜色配置
- `abstract_elements`: JSON 格式存储抽象元素配置
- 每首诗歌只有一个背景配置

#### 5. `user_poem_creations`（用户创作表 - 第二阶段）

存储用户自己创作的诗句和音效组合。

```sql
CREATE TABLE user_poem_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_content TEXT NOT NULL,  -- 用户输入的诗句
  sound_combination JSONB,  -- 音效组合配置
  background_config JSONB,  -- 背景配置
  status TEXT DEFAULT 'draft',  -- 'draft', 'pending_approval', 'approved', 'rejected'
  admin_feedback TEXT,  -- 管理员反馈
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `sound_combination`: 存储音效ID和配置的 JSON
- `status`: 创作状态（草稿、待审核、已批准、已拒绝）

### RLS 策略

#### 公开读取
- `poems`: 所有用户可读
- `sound_effects`: 仅 `status = 'approved'` 的可读
- `poem_sound_mappings`: 所有用户可读
- `poem_backgrounds`: 所有用户可读

#### 用户权限
- `sound_effects`: 用户可创建（上传），只能修改自己上传的
- `user_poem_creations`: 用户可创建和修改自己的创作

#### 管理员权限
- 所有表的完整权限（通过 Service Role Key 或管理员角色）

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

#### 1.6 预设音效组合

**任务**：
- [ ] 手动为初始诗歌配置音效组合
- [ ] 音效组合保存到数据库
- [ ] 加载和播放预设组合
- [ ] 音效控制面板 UI

**文件**：
- `kongshan/js/ui/sound-controls.js`

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
- [ ] 抽象元素绘制（粒子、线条、形状等）
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
- [ ] Supabase Storage 上传
- [ ] 音效元数据输入（名称、描述、标签）
- [ ] 上传进度显示
- [ ] 文件格式验证
- [ ] 文件大小限制

**文件**：
- `kongshan/js/features/upload-manager.js`
- `kongshan/js/ui/upload-form.js`

#### 3.3 管理员审核界面

**任务**：
- [ ] 待审核音效列表
- [ ] 音效试听功能
- [ ] 查看详细信息（上传者、标签、描述）
- [ ] 批准/拒绝操作
- [ ] 批量操作支持
- [ ] 审核历史记录
- [ ] 管理员权限检查

**文件**：
- `kongshan/js/ui/admin-panel.js`
- `kongshan/admin/index.html`（管理员后台页面）

#### 3.4 音效库管理

**任务**：
- [ ] 系统音效库浏览
- [ ] 按标签筛选
- [ ] 搜索功能
- [ ] 音效详情页面
- [ ] 音效预览播放

**文件**：
- `kongshan/js/ui/sound-library.js`

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

### 阶段 5：后期功能（用户创作）

#### 5.1 用户输入诗句

**任务**：
- [ ] 诗句输入界面
- [ ] 输入验证和格式化
- [ ] 保存草稿功能

#### 5.2 AI 自动生成声音意境

**任务**：
- [ ] 调用 AI 分析用户输入
- [ ] 自动生成音效组合建议
- [ ] 自动生成背景建议
- [ ] 一键应用 AI 建议

#### 5.3 手动编辑功能

**任务**：
- [ ] 音效组合编辑器
- [ ] 添加/删除音效
- [ ] 调整音量和循环设置
- [ ] 背景配置编辑器
- [ ] 实时预览

#### 5.4 用户创作审核

**任务**：
- [ ] 用户提交创作
- [ ] 管理员审核界面（查看、试听、批准）
- [ ] 批准后加入系统诗歌库
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
│   │   └── auth-manager.js   # 认证管理
│   ├── features/
│   │   ├── poem-display.js   # 诗歌展示（竖排）
│   │   ├── sound-mixer.js    # 音效混音器
│   │   ├── ai-generator.js   # AI 生成功能
│   │   └── upload-manager.js # 音效上传管理
│   └── ui/
│       ├── screens.js        # 界面显示
│       ├── poem-viewer.js    # 诗歌查看器
│       ├── sound-controls.js # 音效控制面板
│       ├── login-screen.js   # 登录界面
│       └── admin-panel.js    # 管理员面板
│
├── css/
│   ├── main.css              # 主样式
│   ├── variables.css         # CSS 变量
│   ├── poem-display.css      # 诗歌展示样式
│   └── responsive.css        # 响应式样式
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
   - 编写迁移脚本
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

6. ⏳ **预设音效组合**
   - 手动配置音效组合
   - 保存和加载

7. ⏳ **用户认证**
   - Supabase 认证集成
   - 登录界面

8. ⏳ **音效上传**
   - 文件上传功能
   - 元数据输入

9. ⏳ **管理员审核（基础）**
   - 审核列表
   - 批准/拒绝操作

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

14. ⏳ **用户创作功能**（第二阶段）
    - 诗句输入
    - AI 自动生成
    - 手动编辑
    - 创作审核

---

## 注意事项

### 1. 音频文件大小

- **问题**：音频文件可能较大，占用存储空间
- **解决方案**：
  - 使用音频压缩（MP3 128kbps）
  - 限制文件大小（如 5MB）
  - 考虑使用 CDN 加速

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

- **问题**：用户上传可能积压，需要高效审核
- **解决方案**：
  - 设计清晰的审核界面
  - 支持批量操作
  - 提供审核统计和提醒

### 6. 用户体验

- **问题**：首次加载可能较慢
- **解决方案**：
  - 实现加载进度显示
  - 音频文件懒加载
  - 优化资源加载顺序

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

