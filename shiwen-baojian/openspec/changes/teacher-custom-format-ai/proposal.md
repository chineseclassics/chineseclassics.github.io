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

### 教学场景的多样性

真实教学中，写作任务类型差异很大：
- **大论文**：1500-2500 字，完整结构（引言-正文-结论）
- **短写练习**：400-600 字，简化结构（开头-分析-结尾）
- **片段分析**：两段话，无需完整结构
- **比较研习**：相似点-不同点-原因的对比格式
- **开放选题**：学生自选角度和范围

→ 需要一个能**适应所有场景**的格式生成工具

### 核心需求

**老师希望**：
- 用自然语言写作任务要求（就像平时写论文指引一样）
- 系统自动理解并转化为 AI 可识别的格式
- 可以基于系统模板添加要求，也可以完全自定义
- 可以导出为 Word/Markdown，用于其他场景
- 可以重复使用、分享给同事

### 解决方案

**统一 Quill 编辑器界面** + **AI 智能优化**：

1. **统一界面**：所有格式操作都在一个 Quill 编辑器中完成
2. **三种模式自然流转**：
   - 模式 A：直接使用系统格式（无需 AI）
   - 模式 B：基于系统格式添加要求（AI 增量优化）
   - 模式 C：从零开始自定义（AI 完整生成）
3. **AI 双重输出**：一次调用生成人类可读版本 + JSON 格式
4. **强制优化逻辑**：确保所有自定义格式都经过 AI 优化
5. **保存和重用**：保存为自定义模板，可命名、查看、编辑

### AI 职责边界（核心原则）

⚠️ **AI 只做客观检查，不做主观判断**：
- ✅ 检查格式结构、组织逻辑、分析充分性、引用完整性
- ❌ 不评判观点质量、不建议思考方向、不纠正文学理解
- 📌 主观判断留给老师人工批改，避免 AI 误导学生

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
   - 格式 JSON 新增頂層字段：`constraints`（字數、段落數限制）
   - 格式 JSON 新增頂層字段：`content_requirements`（內容焦點要求）
   - 格式模板庫（可重用、可編輯，影響未來任務）
   - 創建任務時保存格式快照（任務要求固定）

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

**不需要修改表結構** - `format_specifications` 表的 `spec_json` 字段已足夠

**格式 JSON 擴展結構**：
```json
{
  "metadata": {...},
  "structure": {...},
  "paragraph_types": {...},
  "constraints": {              // ← AI 解析生成
    "total_word_count": { "min": 1800, "max": 2000 },
    "body_paragraphs": 3
  },
  "content_requirements": [...], // ← AI 解析生成
  "sentence_level_rules": {...},
  "weights_and_scoring": {...}
}
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

1. **AI 格式生成器**（双重输出）
   - Edge Function 实现
   - 一次调用生成两种输出：
     - human_readable：显示在 Quill 编辑器
     - format_json：缓存并保存到数据库
   - 支持两种模式：
     - 增量模式：合并系统模板 + 老师要求
     - 自定义模式：生成完整格式 JSON
   - 遵循 AI 职责边界：只生成客观检查点

2. **老师端格式编辑器**（统一 Quill 界面）
   - 所有格式操作都在一个 Quill 编辑器中完成
   - 系统格式预览也显示在 Quill 中（人类可读）
   - 三种使用模式自然流转：
     - 模式 A：直接使用系统格式（无需 AI）
     - 模式 B：基于系统格式修改（AI 增量优化）
     - 模式 C：从零开始自定义（AI 完整生成）
   - AI 优化一次生成双重输出（人类可读 + JSON）
   - 老师可直接从 Quill 复制内容（无需导出功能）

3. **自定义格式管理**
   - 保存、命名、重用
   - 查看和编辑（加载到 Quill 编辑器）
   - 格式预览（系统格式和自定义格式统一展示）
   - 简化删除逻辑（只能删除自己创建的，不检查使用情况）

4. **格式模板管理**
   - 創建/編輯格式模板（系統內置 + 老師自定義）
   - 創建任務時選擇模板，保存快照到任務
   - 編輯模板只影響未來創建的任務

5. **评分标准系统**
   - 系统内置：「中國古典文學」IB MYP 评分标准（A/B/C/D）
   - 任务创建时选择使用哪些标准
   - AI 反馈时只参考选定的标准

6. **AI 评分代理**
   - Edge Function 实现
   - 仅供老师参考
   - 基于评分标准的四个维度

### ⏸️ 第二阶段

1. 导出为 Word 格式（.docx）- MVP 阶段可从 Quill 直接复制
2. 模板分享功能（老师之间）
3. 老师上传自定义评分标准
4. 格式版本历史（允许回退到之前的版本）

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

## 系统内置格式范围（MVP）

**MVP 阶段**：只提供 1 个系统格式
- ✅ **红楼梦论文格式**（1500-2500 字，完整学术论文结构）
  - 已实现：`assets/data/honglou-essay-format.json`（633 行）
  - 适用于：标准的文学分析大论文
  - 立即用于：十年级红楼梦单元教学

**理由**：
- 先验证核心功能（AI 生成、三种模式、双重输出）
- 红楼梦格式将立即用于实际教学（用户测试）
- 格式库扩展留待后续迭代

**未来扩展**（根据教学需求逐步添加）：
- 三段式短写格式（400-600 字）
- 比较分析格式（相似-不同-原因）
- 开放选题格式（学生自选角度）
- 片段分析格式（无完整结构）
- 更多文学类型专用格式

---

## Open Questions（已解决）

1. ✅ **导出功能**：MVP 不做导出，老师可从 Quill 直接复制内容
2. ✅ **AI 理解失败兜底**：允许老师修改后重新优化
3. ⏸️ **模板分享功能**：第二阶段再做
4. ✅ **AI 职责边界**：只做客观检查（格式、结构、充分性），主观判断（观点质量、思考方向）留给老师

