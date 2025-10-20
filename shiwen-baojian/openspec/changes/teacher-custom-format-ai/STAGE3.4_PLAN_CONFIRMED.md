# 阶段 3.4 集成计划（最终确认版）

**确认时间**：2025-10-20  
**状态**：✅ 用户已确认，准备实施

---

## ✅ 用户确认的设计方案

### 1. 导航栏命名（方案 A）
```
班級管理 / 作業管理 / 模板庫
```
- ✅ 结构统一
- ✅ 信息清晰
- ✅ 减少歧义

### 2. 默认页面
- ✅ 老师登录后默认显示：**作業管理**

### 3. 模板类型区分（方案 C：混合模式）
- ✅ **通用模板**（is_template = true）：可复用，显示在模板库
- ✅ **任务专属**（is_template = false）：一次性，不显示在模板库

### 4. 编辑器形式
- ✅ **模板库**：整页切换（列表模式 ↔ 编辑模式）
- ✅ **任务创建**：展开式（内联编辑器，展开/折叠）

### 5. 草稿保存
- ✅ 使用 **localStorage** 方案
- ✅ 自动保存编辑内容
- ✅ 页面加载时询问恢复
- ✅ 防止意外丢失

### 6. 数据库迁移
- ✅ 添加 `is_template` 字段
- ✅ **自动更新**：`UPDATE ... SET is_template = true WHERE is_system = true`

### 7. 交互细节
- ✅ 已选格式时点击"创建新" → **清空选择，开启空白编辑器**
- ✅ 编辑到一半点击"取消" → **直接取消**（localStorage 保护）
- ✅ 保存对话框默认选择：**仅用于本次任务**

### 8. 实施顺序
- ✅ 同意优化后的顺序（先提取共享组件）

---

## 📋 最终任务清单（28 个任务）

### 步骤 1：数据库 + 默认页面（2 个任务）
```
3.4.1.1 创建迁移（is_template 字段 + 自动更新）
3.4.1.2 修改默认页面（作業管理）
```

### 步骤 2：提取共享组件（5 个任务）⭐ 核心
```
3.4.2.1 创建 format-editor-core.js 类
3.4.2.2 实现 AI 优化逻辑
3.4.2.3 实现格式保存逻辑
3.4.2.4 实现草稿自动保存（localStorage）← 新增功能
3.4.2.5 测试共享组件
```

### 步骤 3：添加导航和路由（3 个任务）
```
3.4.3.1 修改 index.html（添加"模板庫"按钮）
3.4.3.2 修改 teacher-dashboard.js（添加路由）
3.4.3.3 测试导航切换
```

### 步骤 4：模板库页面（5 个任务）
```
3.4.4.1 创建 format-template-page.js
3.4.4.2 列表模式（复用 format-manager）
3.4.4.3 编辑模式（使用 FormatEditorCore）
3.4.4.4 模式切换
3.4.4.5 测试模板库页面
```

### 步骤 5：任务创建集成（7 个任务）
```
3.4.5.1 修改 HTML 模板（添加展开区域）
3.4.5.2 展开/折叠逻辑
3.4.5.3 集成 Quill（使用 FormatEditorCore）
3.4.5.4 AI 优化
3.4.5.5 保存对话框（询问类型）
3.4.5.6 保存并使用流程
3.4.5.7 测试任务创建集成
```

### 步骤 6：UI 统一（3 个任务）
```
3.4.6.1 统一主题和样式
3.4.6.2 响应式设计
3.4.6.3 测试 UI 一致性
```

### 步骤 7：完整测试（2 个任务）
```
3.4.7.1 测试完整用户流程
3.4.7.2 验证所有核心功能
```

### 步骤 8：清理文档（2 个任务）
```
3.4.8.1 决定独立页面处理
3.4.8.2 更新文档
```

---

## 🔧 技术实施要点

### 关键代码复用

**从 format-editor.js 提取**：
```javascript
// Quill 初始化
const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: '輸入寫作要求...',
  modules: { toolbar: false }
});

// AI 优化调用
const response = await fetch(functionUrl, {
  method: 'POST',
  body: JSON.stringify({ text, mode, base_format_id })
});

// 草稿保存（新增）
quill.on('text-change', () => {
  localStorage.setItem('format-editor-draft', quill.getText());
});
```

**从 format-manager.js 提取**：
```javascript
// 查询模板列表
const { data } = await supabase
  .from('format_specifications')
  .select('*')
  .or('is_template.eq.true,is_system.eq.true')
  .order('created_at', { ascending: false });

// 卡片渲染
formats.map(f => `
  <div class="format-card">
    <h3>${f.name}</h3>
    <p>${f.description}</p>
    <button onclick="edit('${f.id}')">编辑</button>
  </div>
`);
```

---

## 🎨 UI 风格规范

**颜色系统**：
```css
--primary-blue: #3498db
--secondary-gray: #95a5a6
--gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
```

**组件样式**：
```css
/* 卡片 */
background: white;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
padding: 1.5rem;

/* 按钮 - 主要 */
background: #3498db;
color: white;
padding: 0.75rem 1.5rem;
border-radius: 6px;

/* 导航标签 */
padding: 0.75rem 1.5rem;
border-bottom: 2px solid transparent;
&.active { border-bottom-color: #3498db; }
```

---

## 📊 预计工作量

| 步骤 | 任务数 | 预计时间 | 复杂度 |
|------|--------|---------|--------|
| 1 | 2 | 30分钟 | 低 |
| 2 | 5 | 2小时 | 高⭐ |
| 3 | 3 | 30分钟 | 低 |
| 4 | 5 | 2小时 | 中 |
| 5 | 7 | 2小时 | 高⭐ |
| 6 | 3 | 30分钟 | 低 |
| 7 | 2 | 30分钟 | 低 |
| 8 | 2 | 30分钟 | 低 |
| **总计** | **28** | **约 8.5 小时** | |

**说明**：
- 步骤 2（提取共享组件）是核心，做好后面会很快
- 步骤 5（展开式编辑器）是最复杂的部分
- 其他步骤相对简单

---

## 🎯 成功标准

**集成完成后，系统应该**：

### 导航和页面
- [x] 三个导航按钮：班級管理 / 作業管理 / 模板庫
- [x] 默认页面：作業管理
- [x] 页面切换流畅，无卡顿

### 模板库功能
- [x] 只显示通用模板（is_template = true）和系统模板
- [x] 可以创建新模板（整页编辑）
- [x] 可以编辑现有模板
- [x] 可以删除自定义模板（系统模板不可删）
- [x] 编辑完成返回列表

### 任务创建集成
- [x] 下拉菜单显示所有可用写作要求
- [x] 点击"+ 创建新"展开编辑器
- [x] AI 优化正常工作
- [x] 保存对话框询问类型
- [x] 保存后自动选中并折叠

### 数据正确性
- [x] 通用模板：显示在模板库
- [x] 任务专属：不显示在模板库
- [x] 系统格式：自动标记为通用模板

### 用户体验
- [x] UI 完美融入 index.html
- [x] 草稿自动保存，不丢失内容
- [x] 所有交互符合预期

---

## 📝 实施准备

### 需要的文件（参考）
- ✅ `format-editor.js` - 提取逻辑
- ✅ `format-manager.js` - 提取逻辑
- ✅ `index.html` - 参考 UI 风格
- ✅ `teacher-dashboard.js` - 了解路由机制
- ✅ `assignment-creator.js` - 集成展开式编辑器

### 新建的文件
- ⭐ `supabase/migrations/019_add_is_template_field.sql`
- ⭐ `js/teacher/format-editor-core.js`
- ⭐ `js/teacher/format-template-page.js`

### 修改的文件
- ⭐ `index.html`（添加导航）
- ⭐ `teacher-dashboard.js`（添加路由 + 默认页面）
- ⭐ `assignment-creator.js`（添加展开式编辑器）

---

## 🚀 准备开始

**所有规划文档已更新**：
- ✅ proposal.md - 添加第 8 条决策和草稿保存
- ✅ tasks.md - 28 个详细任务，优化后的顺序
- ✅ INTEGRATION_PLAN.md - 详细架构设计
- ✅ STAGE3.4_PLAN_CONFIRMED.md - 最终确认

**等待您的指令**：
- 选项 1：立即开始实施第一步（数据库迁移）
- 选项 2：先休息，稍后继续
- 选项 3：其他建议或问题

---

**准备就绪！** 🎯

