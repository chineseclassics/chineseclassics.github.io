# 格式规范系统架构文档

> **时文宝鉴** - 两层格式规范架构设计

**版本**：1.0  
**创建日期**：2025-10-19  
**状态**：已实现（阶段 2）

---

## 🎯 架构概述

### 两层系统

```
┌─────────────────────────────────────────┐
│  第一层：系统内置格式                    │
│  ────────────────────────────────────   │
│  存储位置：assets/data/format-specs/    │
│  管理方式：Git 版本控制                  │
│  加载方式：本地文件 / CDN                │
│  适用场景：通用论文格式                  │
│                                         │
│  - 红楼梦论文格式 ✅ 已实现              │
│  - IB EE 论文格式 📝 待创建              │
│  - 议论文格式 📝 待创建                  │
│  - 说明文格式 📝 待创建                  │
│  - 记叙文格式 📝 待创建                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  第二层：老师自定义格式                  │
│  ────────────────────────────────────   │
│  存储位置：Supabase 数据库               │
│  管理方式：Web UI + API                  │
│  加载方式：数据库查询                    │
│  适用场景：个性化教学需求                │
│                                         │
│  选项 A：基于系统格式修改 📝 阶段 3       │
│  选项 B：完全自定义 📝 阶段 3            │
└─────────────────────────────────────────┘
```

---

## 📋 JSON Schema 设计

### 完整的格式规范结构

```json
{
  "metadata": {
    "id": "honglou-essay",           // 唯一标识符
    "name": "红楼梦论文格式规范",     // 显示名称
    "version": "1.0",                 // 版本号
    "type": "system",                 // system 或 custom
    "category": "文学分析",           // 分类
    "target_audience": "十年级学生",  // 目标用户
    "essay_type": "学术论文（文学分析）",
    "word_count": "1500-2500字",
    "description": "..."
  },
  
  "paragraph_types": {
    "introduction": {
      "name": "引言段",
      "purpose": "吸引读者、确立主题、概述论点",
      
      // ✨ 核心：分析维度（驱动 AI 反馈）
      "analysis_dimensions": [
        {
          "id": "structure_completeness",   // 维度 ID
          "name": "结构完整性",              // 显示名称
          "weight": 0.4,                    // 权重（0-1）
          "description": "检查是否包含所有必需元素",
          "checks": [                       // 检查项列表
            "是否包含背景引入（Hook）？",
            "是否定义了关键概念？",
            "是否指出研究缺口？"
          ]
        },
        {
          "id": "thesis_clarity",
          "name": "论文主张清晰度",
          "weight": 0.4,
          "checks": [...]
        },
        {
          "id": "roadmap",
          "name": "结构预告",
          "weight": 0.2,
          "checks": [...]
        }
      ],
      
      // 必需元素（结构检查）
      "required_elements": [
        {
          "id": "hook",
          "name": "背景引入 (Hook)",
          "required": true,
          "position": "开头 1-2 句",
          "description": "从较广泛的背景切入...",
          "keywords": ["《红楼梦》", "艺术成就"],
          "markers": [],
          "check_points": [...]
        }
      ],
      
      // 常见错误
      "common_errors": [...]
    },
    
    "body_paragraph": {
      "analysis_dimensions": [
        {
          "id": "topic_sentence",
          "name": "主题句",
          "weight": 0.2
        },
        {
          "id": "textual_evidence",
          "name": "文本证据",
          "weight": 0.3
        },
        {
          "id": "close_reading",
          "name": "文本细读",
          "weight": 0.5
        }
      ]
    },
    
    "conclusion": {
      "analysis_dimensions": [
        {
          "id": "restate_thesis",
          "name": "重申主张",
          "weight": 0.3
        },
        {
          "id": "summarize_points",
          "name": "总结分论点",
          "weight": 0.3
        },
        {
          "id": "broader_implications",
          "name": "引申思考",
          "weight": 0.4
        }
      ]
    }
  }
}
```

---

## 🔄 工作流程

### 学生获取 AI 反馈的完整流程

```
1. 学生点击"AI 反馈"按钮
   ↓
2. 前端：加载格式规范
   - 调用 loadHonglouFormatSpec()
   - 从 assets/data/honglou-essay-format.json 加载
   - 缓存到内存
   ↓
3. 前端：调用 Edge Function
   - 传递参数：
     * paragraph_id: "intro"
     * paragraph_content: "<p>...</p>"
     * paragraph_type: "introduction"
     * format_spec: { 完整的 JSON }
   ↓
4. Edge Function：处理请求
   
   4.1 识别段落类型
       paragraphRules = identifyParagraphRules("introduction", formatSpec)
       → 得到 introduction 的完整定义
   
   4.2 结构检查
       structuralFeedback = performStructuralCheck(content, type, paragraphRules)
       → 检查 required_elements
       → 计算完整度
       → 返回：{completeness: 40%, missing_elements: [...]}
   
   4.3 构建 AI 提示词（✅ 基于 JSON）
       prompt = buildAnalysisPrompt(content, type, paragraphRules, structural)
       → 从 paragraphRules.analysis_dimensions 读取维度
       → 为每个维度构建检查项
       → 生成动态的 JSON 格式要求
   
   4.4 调用 DeepSeek API
       → 传递提示词
       → AI 按照 JSON 定义的维度分析
       → 返回：{
           structure_completeness: {score: 6, issues: [...]},
           thesis_clarity: {score: 4, issues: [...]},
           roadmap: {score: 0, issues: [...]}
         }
   
   4.5 句子级问题定位
       → 动态处理所有维度的 issues
       → 合并成统一的问题列表
   
   4.6 生成改进建议
       → 根据维度 ID 匹配建议模板
       → 返回具体的改进方向
   
   4.7 评分预估
       → 基于所有维度的平均分
       → 计算 IB 标准 A/B/C/D
   ↓
5. 前端：渲染反馈
   - 显示结构完整度进度条
   - 显示句子级问题列表
   - 显示改进建议
   - （可选）显示详细分析
```

---

## 📊 不同段落类型的分析维度

### 引言段（Introduction）

| 维度 ID | 名称 | 权重 | 检查内容 |
|---------|------|------|----------|
| `structure_completeness` | 结构完整性 | 40% | Hook、定义、研究缺口 |
| `thesis_clarity` | 论文主张清晰度 | 40% | 核心问题、论文主张 |
| `roadmap` | 结构预告 | 20% | 分论点预告、序数词 |

**不检查**：文本证据、文本细读（那是正文段的要求）

### 正文段（Body Paragraph）

| 维度 ID | 名称 | 权重 | 检查内容 |
|---------|------|------|----------|
| `topic_sentence` | 主题句 | 20% | 位置、清晰度、连接词 |
| `textual_evidence` | 文本证据 | 30% | 引用原文、准确性、充分性 |
| `close_reading` | 文本细读 | 50% | 字词句分析、深度、避免空泛 |

**不检查**：结构预告、研究缺口（那是引言段的要求）

### 结论段（Conclusion）

| 维度 ID | 名称 | 权重 | 检查内容 |
|---------|------|------|----------|
| `restate_thesis` | 重申主张 | 30% | 重申、不同措辞 |
| `summarize_points` | 总结分论点 | 30% | 回顾、简洁 |
| `broader_implications` | 引申思考 | 40% | So What、格局提升 |

**不检查**：文本证据、主题句（那是其他段落的要求）

---

## ✅ 关键改进

### 改进 1：完全基于 JSON ✅

**之前**（阶段 2 初版）：
```typescript
// ❌ 硬编码的分析维度
if (paragraphType === 'introduction') {
  return {
    description: `1. structure_completeness...`  // 写死的
  }
}
```

**现在**：
```typescript
// ✅ 从 JSON 读取分析维度
const analysisDimensions = rules.analysis_dimensions || []

const dimensionsDesc = analysisDimensions
  .map(dim => `${dim.id}（${dim.name}）
    ${dim.checks.map(c => `- ${c}`).join('\n')}
  `)
```

### 改进 2：动态提示词生成 ✅

AI 提示词现在包含：
- ✅ 维度数量（从 JSON 读取）
- ✅ 每个维度的检查项（从 JSON 读取）
- ✅ 权重信息（从 JSON 读取）
- ✅ 返回的 JSON 格式（动态生成）

### 改进 3：维度名称灵活 ✅

**支持任何维度名称**：
- `structure_completeness`（引言）
- `topic_sentence`（正文）
- `restate_thesis`（结论）
- 将来老师自定义的任何维度

---

## 🚀 部署和测试

### 步骤 1：重新部署 Edge Function

```bash
supabase functions deploy ai-feedback-agent
```

或在 Dashboard 中粘贴更新后的代码。

### 步骤 2：测试引言段反馈

输入内容：
```
《紅樓夢》是中國古典小說的巔峰之作。林黛玉是書中的重要人物。
```

**预期反馈**（现在应该精准了）：

✅ **结构完整性** (structure_completeness)：
- 缺少：关键词定义
- 缺少：研究缺口
- 缺少：核心问题与论文主张

✅ **论文主张清晰度** (thesis_clarity)：
- 未明确提出核心问题
- 未用一句话陈述论文主张

✅ **结构预告** (roadmap)：
- 未预告正文结构

❌ **不应该出现**：
- ~~文本证据~~
- ~~文本细读~~
- ~~引用原文~~

---

## 📂 相关文件清单

### 已更新的文件

1. **格式规范 JSON**：
   - `assets/data/honglou-essay-format.json` ✅
   - 添加了 `analysis_dimensions` 到三种段落类型

2. **Edge Function**：
   - `supabase/functions/ai-feedback-agent/index.ts` ✅
   - 完全基于 JSON 的 `analysis_dimensions`
   - 动态生成 AI 提示词
   - 动态处理反馈结果

3. **前端加载器**：
   - `js/data/format-spec-loader.js` ✅
   - 加载并缓存格式规范

4. **OpenSpec 文档**：
   - `openspec/changes/shiwen-baojian-mvp/proposal.md` ✅
   - `openspec/specs/format-specification-system/spec.md` ✅
   - `openspec/specs/format-specification-system/design.md` ✅

---

## 🎓 设计原则

### 1. 完整独立 ✅

每个系统格式都是完整的 JSON，不依赖继承：
- 红楼梦论文格式 = 完整独立
- IB EE 论文格式 = 完整独立
- 议论文格式 = 完整独立

**原因**：
- 简单易懂
- 易于调试
- 不同格式差异大，继承复用价值有限

### 2. AI 驱动 ✅

`analysis_dimensions` 直接驱动 AI 分析：
- 维度 ID → AI 分析的方面
- 检查项 → AI 分析的具体问题
- 权重 → AI 评分的权重

### 3. 灵活扩展 ✅

**添加新的系统格式**：
1. 创建新的 JSON 文件
2. 定义 `analysis_dimensions`
3. 无需修改代码

**老师自定义**（阶段 3）：
1. 基于系统格式
2. 添加/修改/删除维度或检查项
3. 保存到数据库

---

## 🔧 技术实现细节

### 分析维度权重

每个段落类型的所有 `analysis_dimensions` 的 `weight` 之和应该为 1.0：

**引言段**：
- structure_completeness: 0.4
- thesis_clarity: 0.4
- roadmap: 0.2
- **总和**: 1.0 ✅

**正文段**：
- topic_sentence: 0.2
- textual_evidence: 0.3
- close_reading: 0.5
- **总和**: 1.0 ✅

### AI 返回格式

AI 根据 JSON 中定义的维度返回：

```json
{
  "structure_completeness": {
    "score": 6,
    "issues": ["缺少关键词定义", "缺少研究缺口"],
    "sentence_numbers": [1, 2]
  },
  "thesis_clarity": {
    "score": 2,
    "issues": ["未明确提出核心问题"],
    "sentence_numbers": [1]
  },
  "roadmap": {
    "score": 0,
    "issues": ["未预告正文结构"],
    "sentence_numbers": []
  }
}
```

### 动态处理逻辑

Edge Function 使用 `Object.entries()` 动态处理：
- ✅ 支持任意数量的维度
- ✅ 支持任意维度名称
- ✅ 自动聚合所有问题
- ✅ 自动计算平均分

---

## 🎯 阶段 3 的扩展计划

### 数据库表：format_specifications

```sql
CREATE TABLE format_specifications (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    type TEXT DEFAULT 'custom',
    
    -- 两种自定义方式
    based_on TEXT,              -- 基于哪个系统格式（可为 NULL）
    modifications JSONB,         -- 修改内容（based_on 不为 NULL）
    spec_json JSONB,            -- 完整规范（based_on 为 NULL）
    
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 老师自定义示例

**基于系统格式修改**：
```json
{
  "based_on": "honglou-essay",
  "modifications": {
    "paragraph_types": {
      "introduction": {
        "analysis_dimensions_modify": [
          {
            "id": "thesis_clarity",
            "weight": 0.6,  // 提高权重
            "checks": [
              "核心问题是否明确？",
              "论文主张是否 ≤ 30 字？"  // 新增检查
            ]
          }
        ],
        "required_elements_add": [
          {
            "id": "historical_context",
            "name": "历史背景",
            "required": true,
            "description": "必须包含清代社会背景"
          }
        ]
      }
    }
  }
}
```

---

## 📚 参考文档

- **格式规范示例**：`assets/data/honglou-essay-format.json`
- **OpenSpec 需求**：`openspec/specs/format-specification-system/spec.md`
- **设计文档**：`openspec/specs/format-specification-system/design.md`
- **原始需求**：`docs/論文格式寶典 - 副本.md`

---

**维护者**：时文宝鉴开发团队  
**最后更新**：2025-10-19

