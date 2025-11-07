# 空山 - 诗歌声音意境欣赏

> 通过声音意境和抽象视觉，创造沉浸式的诗歌欣赏体验

## 📖 应用简介

「空山」是一款专注于中国古代诗歌沉浸式欣赏的应用。每首诗歌配有精心设计的声音意境和抽象视觉背景，让用户在宁静的氛围中感受诗歌的意境之美。

### 核心特色

- 🎵 **声音意境**：多音效组合，营造诗歌氛围
- 🎨 **抽象视觉**：现代色彩与抽象元素，不干扰文字阅读
- 🤖 **AI 智能**：自动分析诗歌，生成音效和背景建议
- 👥 **用户贡献**：用户可上传音效，管理员审核后加入系统
- ✍️ **用户创作**：支持用户输入任意诗句，AI 自动生成声音意境

## 🚀 快速开始

### 本地开发

```bash
# 进入项目目录
cd kongshan

# 启动本地服务器（在项目根目录）
python3 -m http.server 8000

# 访问应用
open http://localhost:8000/kongshan/index.html
```

### 前提条件

1. **Supabase 项目**
   - 创建 Supabase 项目
   - 运行数据库迁移脚本
   - 配置 Storage bucket

2. **DeepSeek API Key**
   - 在 Supabase Edge Functions 中配置环境变量

3. **浏览器要求**
   - 支持 Web Audio API 的现代浏览器
   - Chrome、Firefox、Safari、Edge（最新版本）

## 📁 项目结构

```
kongshan/
├── index.html                 # 主入口
├── README.md                  # 本文件
├── js/                        # JavaScript 代码
├── css/                       # 样式文件
├── assets/                    # 资源文件
├── admin/                     # 管理员后台
├── supabase/                  # Supabase 配置
└── docs/                      # 文档
    └── DEVELOPMENT_PLAN.md   # 开发计划
```

详细结构说明请参考 [开发计划文档](./docs/DEVELOPMENT_PLAN.md)。

## 🎯 功能概览

### 已实现功能

- [ ] 诗歌展示（竖排版）
- [ ] 音效播放和混音
- [ ] AI 智能分析
- [ ] 用户上传音效
- [ ] 管理员审核

### 计划功能

- [ ] 用户创作诗句
- [ ] Pixabay 音效集成
- [ ] 更多背景效果

## 📚 文档

- [开发计划](./docs/DEVELOPMENT_PLAN.md) - 详细的开发计划和实施步骤

## 🛠️ 技术栈

- **前端**：HTML5、CSS3、Vanilla JavaScript
- **音频**：Web Audio API
- **图形**：Canvas API
- **后端**：Supabase（数据库、认证、存储、Edge Functions）
- **AI**：DeepSeek API

## 📝 开发状态

**当前阶段**：规划阶段

详细开发进度请参考 [开发计划文档](./docs/DEVELOPMENT_PLAN.md)。

## 🙏 致谢

- **DeepSeek**：提供强大的中文 AI 模型
- **Supabase**：提供完整的后端服务
- **太虚幻境**：教育软件集成平台

---

**最后更新**：2025-01-XX  
**版本**：0.1.0（规划阶段）

