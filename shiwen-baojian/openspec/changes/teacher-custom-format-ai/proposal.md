# 老师自定义格式 + AI 辅助生成

## Why

### 当前痛点

老师在创建写作任务时面临两难选择：

1. **使用系统模板**：格式标准化，但无法体现具体任务的内容要求
   - 例如：红楼梦论文模板只定义结构，但老师想要求"详细分析人物外貌描写"
   - 不同任务的字数要求、段落数量要求不同，但模板是固定的

2. **完全自定义**：需要手动编写复杂的 JSON 格式规范
   - 大多数老师不懂 JSON 语法
   - 老师已经有 Word 格式的论文指引，但无法直接使用

### 核心需求

**老师希望**：
- 用自然语言写作任务要求（就像平时写论文指引一样）
- 系统自动理解并转化为 AI 可识别的格式
- 可以基于系统模板添加要求，也可以完全自定义
- 可以导出为 Word/Markdown，用于其他场景
- 可以重复使用、分享给同事

### 解决方案

利用 AI（DeepSeek）自动解析老师的自然语言要求，智能转化为结构化 JSON 格式规范：

1. **在线编辑器输入**：老师用 Quill.js 编辑器写要求（支持富文本）
2. **AI 智能解析**：Edge Function 调用 DeepSeek 理解要求
3. **可视化确认**：展示 AI 的理解结果，老师确认或修改
4. **智能合并**：自动合并到系统模板（如有），冲突时老师要求优先
5. **保存和重用**：保存为自定义模板，可命名、分享、导出

---

## What Changes

### 新增功能

1. **AI 格式规范生成器**（新 Edge Function）
   - Edge Function: `format-spec-generator`
   - 输入：老师的自然语言要求 + 可选的系统模板 ID
   - 输出：结构化 JSON 格式规范 + 理解确认信息
   - AI：DeepSeek API

2. **老师端 - 自定义格式编辑器**
   - 基于 Quill.js 的富文本编辑器
   - 支持从系统模板开始或从零开始
   - 实时预览 AI 理解结果
   - 支持导出为 Word/Markdown 格式

3. **老师端 - 自定义格式管理**
   - 查看、编辑、删除自定义模板
   - 模板命名和描述
   - 分享给其他老师（可选）
   - 防止删除正在使用的模板

4. **扩展格式规范系统**
   - 新增字段：`constraints`（字数、段落数）
   - 新增字段：`content_requirements`（内容要求）
   - 动态模板引用（任务使用最新版模板）

5. **AI 评分代理**（新 Edge Function）
   - Edge Function: `grading-agent`
   - 输入：学生论文 + 评分标准 JSON
   - 输出：四个标准的评分建议（0-8 分）+ 理由
   - 仅供老师参考，学生不可见

6. **评分标准系统**
   - 系统内置：「中國古典文學」IB MYP 评分标准（A/B/C/D）
   - 支持老师上传自定义评分标准（第二阶段）
   - 评分标准与格式要求分离

---

## Impact

### Affected Specs

**修改现有规格**：
1. `teacher-assignment-management` - 任务创建流程新增自定义格式步骤
2. `format-specification-system` - 扩展格式规范数据结构
3. `teacher-grading` - 新增 AI 评分建议功能

**新增规格**：
4. `ai-format-generator` - AI 格式规范生成器
5. `custom-format-management` - 自定义格式管理
6. `grading-rubric-system` - 评分标准系统

### Affected Code

**新增文件**：
```
shiwen-baojian/
├── js/
│   ├── teacher/
│   │   ├── format-editor.js              # 格式编辑器
│   │   ├── format-manager.js             # 格式管理
│   │   ├── format-exporter.js            # 导出功能
│   │   └── ai-format-requester.js        # AI 解析请求
│   └── data/
│       └── grading-rubrics/
│           └── ib-myp-chinese.json       # 中国古典文学评分标准
├── supabase/
│   └── functions/
│       ├── format-spec-generator/
│       │   └── index.ts                  # AI 格式生成
│       └── grading-agent/
│           └── index.ts                  # AI 评分代理
└── assets/
    └── data/
        └── grading-rubrics/
            └── ib-myp-chinese-literature.json
```

**修改文件**：
```
shiwen-baojian/
├── supabase/migrations/
│   ├── 015_extend_format_specifications.sql  # 扩展格式表字段
│   └── 016_create_grading_rubrics.sql        # 评分标准表
└── js/teacher/assignment-creator.js          # 任务创建流程
```

### Database Changes

**扩展表**：`format_specifications`
```sql
ALTER TABLE format_specifications ADD COLUMN IF NOT EXISTS
  constraints JSONB,              -- 字数、段落数限制
  content_requirements JSONB,     -- 内容要求
  is_shared BOOLEAN DEFAULT false,-- 是否分享给其他老师
  shared_with TEXT[];             -- 分享给哪些老师（email 列表）
```

**新增表**：`grading_rubrics`
```sql
CREATE TABLE grading_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  created_by UUID REFERENCES auth.users(id),
  criteria JSONB NOT NULL,        -- A/B/C/D 标准定义
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**新增表**：`ai_grading_suggestions`
```sql
CREATE TABLE ai_grading_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID REFERENCES essays(id) ON DELETE CASCADE,
  grading_rubric_id UUID REFERENCES grading_rubrics(id),
  criterion_a_score INTEGER CHECK (criterion_a_score >= 0 AND criterion_a_score <= 8),
  criterion_b_score INTEGER CHECK (criterion_b_score >= 0 AND criterion_b_score <= 8),
  criterion_c_score INTEGER CHECK (criterion_c_score >= 0 AND criterion_c_score <= 8),
  criterion_d_score INTEGER CHECK (criterion_d_score >= 0 AND criterion_d_score <= 8),
  reasoning JSONB NOT NULL,       -- 每个标准的评分理由
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Integration with Existing System

**与现有功能的关系**：
1. **格式规范系统**：扩展现有两层架构，增强老师自定义能力
2. **AI 反馈引擎**：继续使用格式规范进行段落级反馈
3. **任务管理**：任务创建流程新增"自定义格式"步骤
4. **老师批改**：新增"AI 评分建议"参考

---

## Success Criteria

### 用户体验目标
- 老师能在 5 分钟内创建自定义格式（基于系统模板）
- AI 理解准确率 > 85%（基于老师确认率）
- 老师满意度 > 4/5（问卷调查）

### 技术目标
- AI 格式生成时间 < 10 秒
- 导出 Word 文档格式正确（支持富文本）
- 动态模板更新实时生效（无缓存延迟）

### 教育目标
- 老师能轻松表达具体任务的内容要求
- 学生收到的 AI 反馈更贴近老师的教学意图
- 减少老师手动配置格式的时间成本

---

## Scope

### ✅ MVP 必须包含

1. **AI 格式生成器**
   - Edge Function 实现
   - 单次解析 + 确认流程
   - 智能合并系统模板 + 老师要求
   - 冲突解决（老师优先）

2. **老师端格式编辑器**
   - Quill.js 富文本编辑器
   - AI 理解结果可视化
   - 导出为 Markdown 格式

3. **自定义格式管理**
   - 保存、命名、重用
   - 查看和编辑
   - 防止删除正在使用的模板

4. **动态模板引用**
   - 任务引用模板 ID（不快照）
   - 模板更新实时生效

5. **评分标准系统**
   - 系统内置「中國古典文學」IB MYP 标准
   - 选择评分标准（任务创建时）

6. **AI 评分代理**
   - Edge Function 实现
   - 仅供老师参考
   - 基于评分标准的四个维度

### ⏸️ 第二阶段

1. 导出为 Word 格式（.docx）
2. 模板分享功能（老师之间）
3. 老师上传自定义评分标准
4. AI 对话式澄清（多轮交互）

### 🔮 第三阶段

1. 导出为 PDF 格式
2. 格式模板市场（公开分享）
3. AI 学习老师偏好（个性化建议）

---

## Non-Goals

- ❌ 不支持学生自定义格式
- ❌ 不支持 AI 直接修改老师的要求（只理解，不改写）
- ❌ 不支持历史版本回滚（MVP 阶段）
- ❌ 不支持导入 Word 文档（只支持导出）

---

## Open Questions

1. **导出格式优先级**：Markdown 优先还是 Word 优先？
   - 建议：MVP 先做 Markdown（简单），第二阶段做 Word

2. **AI 理解失败的兜底方案**？
   - 建议：允许老师手动调整 JSON（提供简化的表单界面）

3. **模板分享的权限控制**？
   - 建议：MVP 阶段只支持同校老师分享（基于 email 域名）

4. **评分标准与格式要求的权重**？
   - 建议：段落反馈主要看格式（80%），论文评分主要看标准（80%）

