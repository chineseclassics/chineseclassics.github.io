# Format Specification System - Design Document

## Context

时文宝鉴需要一个灵活的格式规范系统，既要提供标准化的论文格式（如红楼梦论文、IB EE 论文），又要允许老师根据具体教学需求自定义格式要求。

**关键约束**：
- AI 反馈必须基于明确的格式规范
- 不同类型的论文有不同的评价维度（引言 vs 正文 vs 结论）
- 老师需要简单易用的自定义界面
- 系统内置格式需要版本控制和快速加载

**利益相关者**：
- 学生：需要清晰、精准的 AI 反馈
- 老师：需要灵活的格式定制能力
- 系统维护者：需要易于扩展的架构

---

## Goals / Non-Goals

### Goals ✅

1. **两层架构**：系统内置格式（本地 JSON）+ 老师自定义格式（数据库）
2. **完整独立**：每个系统格式都是完整的 JSON，不依赖继承
3. **AI 驱动**：格式规范直接驱动 AI 分析维度
4. **灵活自定义**：老师可以基于系统格式修改或完全自定义
5. **高性能**：系统格式通过 CDN 分发，自定义格式缓存优化

### Non-Goals ❌

1. **不支持**：格式之间的继承链（避免复杂性）
2. **不支持**：运行时动态修改系统格式（系统格式是静态的）
3. **不包含**：在阶段 2 实现完整的格式编辑器（阶段 3 功能）

---

## Decisions

### Decision 1: 两层架构 vs 统一数据库存储

**选择**：两层架构（系统本地 + 自定义数据库）✅

**理由**：
- **性能**：系统格式通过 CDN 分发，加载快速，不占用数据库资源
- **版本控制**：本地 JSON 文件通过 Git 管理，可追踪历史
- **稳定性**：系统格式不会因数据库问题而不可用
- **成本**：不占用数据库存储配额，节省成本

**替代方案**：所有格式存数据库
- ❌ 性能较差（每次都要查询数据库）
- ❌ 无法利用 CDN 和浏览器缓存
- ❌ 增加数据库负载

---

### Decision 2: 完整独立 JSON vs 继承式 JSON

**选择**：完整独立 JSON ✅

**理由**：
- **简单**：每个格式都是自包含的，易于理解
- **灵活**：系统格式之间完全独立，互不影响
- **调试**：出问题时容易定位，不需要追踪继承链
- **通用性**：红楼梦、IB EE、议论文的要求差异较大，继承复用价值有限

**替代方案**：继承式（base → specialized）
- ❌ 增加复杂度（需要实现继承合并逻辑）
- ❌ 调试困难（需要理解继承链）
- ❌ 通用基础模板很难定义（不同格式差异大）

---

### Decision 3: JSON Schema - 分析维度定义

**选择**：在 JSON 中定义 `analysis_dimensions` ✅

**结构**：
```json
{
  "analysis_dimensions": [
    {
      "id": "structure_completeness",
      "name": "结构完整性",
      "weight": 0.4,
      "checks": ["检查问题1", "检查问题2"]
    }
  ]
}
```

**理由**：
- **灵活**：每种格式可以定义不同的分析维度
- **AI 驱动**：直接传给 AI，生成精准的提示词
- **可扩展**：老师自定义时可以调整维度权重和检查项

**替代方案**：硬编码分析维度
- ❌ 不够灵活（无法针对不同格式调整）
- ❌ 老师无法自定义检查维度

---

### Decision 4: 自定义格式 - 修改方式

**选择**：基于操作的修改（add/modify/remove）✅

**结构**：
```json
{
  "based_on": "honglou-essay",
  "modifications": {
    "paragraph_types": {
      "introduction": {
        "required_elements_add": [...],
        "analysis_dimensions_modify": [...]
      }
    }
  }
}
```

**理由**：
- **节省空间**：只存储修改的部分，不重复存储整个格式
- **清晰**：明确显示哪些是新增、修改、删除
- **可追踪**：容易看出老师做了哪些自定义

**替代方案**：存储完整格式
- ❌ 数据冗余（大部分内容与基础格式重复）
- ❌ 难以维护（基础格式更新后，自定义格式不同步）

---

### Decision 5: Edge Function - 格式加载逻辑

**选择**：前端加载和合并，Edge Function 接收完整格式 ✅

**流程**：
```
前端：
1. 加载基础格式（从本地或数据库）
2. 应用自定义修改（如果有）
3. 传递完整格式给 Edge Function

Edge Function：
4. 直接使用完整格式
5. 不需要知道格式来源
```

**理由**：
- **简化 Edge Function**：只需处理完整格式，不需要加载逻辑
- **灵活**：前端可以缓存合并结果
- **测试容易**：Edge Function 输入是完整 JSON，易于测试

**替代方案**：Edge Function 自己加载和合并
- ❌ 增加 Edge Function 复杂度
- ❌ Edge Function 无法访问本地文件（需要 HTTP 请求）
- ❌ 难以缓存

---

## Technical Implementation

### File Structure

```
shiwen-baojian/
├── assets/data/format-specs/
│   ├── honglou-essay.json           # 红楼梦论文格式
│   ├── ib-ee-essay.json             # IB EE 格式
│   ├── argumentative-essay.json     # 议论文格式
│   ├── expository-essay.json        # 说明文格式
│   └── narrative-essay.json         # 记叙文格式
├── js/data/
│   └── format-spec-loader.js        # 格式加载器
└── supabase/migrations/
    └── 013_create_format_specifications_table.sql
```

### Database Schema

```sql
CREATE TABLE format_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    type TEXT DEFAULT 'custom',
    based_on TEXT,              -- NULL 或系统格式 ID
    modifications JSONB,         -- 修改内容（based_on 不为 NULL 时）
    spec_json JSONB,            -- 完整规范（based_on 为 NULL 时）
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Format Loading Logic

```javascript
// 前端加载逻辑
async function loadFormatSpec(source) {
    if (source.startsWith('system:')) {
        // 从本地加载系统格式
        const id = source.replace('system:', '');
        return await loadLocalFormat(id);
    } else if (source.startsWith('custom:')) {
        // 从数据库加载自定义格式
        const id = source.replace('custom:', '');
        const custom = await loadCustomFormat(id);
        
        if (custom.based_on) {
            // 加载基础格式并合并
            const base = await loadLocalFormat(custom.based_on);
            return mergeModifications(base, custom.modifications);
        } else {
            // 完全自定义
            return custom.spec_json;
        }
    }
}

// 合并修改
function mergeModifications(base, modifications) {
    const result = JSON.parse(JSON.stringify(base)); // 深拷贝
    
    // 遍历修改
    for (const [paraType, mods] of Object.entries(modifications.paragraph_types)) {
        // 处理 required_elements_add
        if (mods.required_elements_add) {
            result.paragraph_types[paraType].required_elements.push(
                ...mods.required_elements_add
            );
        }
        
        // 处理 analysis_dimensions_modify
        if (mods.analysis_dimensions_modify) {
            for (const mod of mods.analysis_dimensions_modify) {
                const index = result.paragraph_types[paraType]
                    .analysis_dimensions.findIndex(d => d.id === mod.id);
                if (index !== -1) {
                    result.paragraph_types[paraType].analysis_dimensions[index] = {
                        ...result.paragraph_types[paraType].analysis_dimensions[index],
                        ...mod
                    };
                }
            }
        }
    }
    
    return result;
}
```

### Edge Function Integration

```typescript
// Edge Function 使用格式规范
function buildAnalysisPrompt(content, type, formatSpec, structural) {
    const paragraphType = identifyParagraphType(type, formatSpec);
    const dimensions = paragraphType.analysis_dimensions || [];
    
    // 根据 JSON 中的 dimensions 构建提示词
    const dimensionPrompts = dimensions.map(dim => `
${dim.id} (${dim.name}):
${dim.checks.map(c => `- ${c}`).join('\n')}
    `).join('\n\n');
    
    return `
分析维度：
${dimensionPrompts}

返回格式：
{
  ${dimensions.map(d => `"${d.id}": { "score": 0-10, "issues": [...], "sentence_numbers": [...] }`).join(',\n  ')}
}
    `;
}
```

---

## Risks / Trade-offs

### Risk 1: JSON Schema 变更

**风险**：如果未来需要添加新字段，旧的 JSON 文件可能不兼容

**缓解**：
- 使用版本字段（`"version": "1.0"`）
- 向后兼容（新字段都是可选的）
- 加载时验证 schema，提供默认值

---

### Risk 2: 自定义格式质量

**风险**：老师可能创建质量不高的自定义格式

**缓解**：
- 提供格式验证（检查必需字段、权重总和等）
- 提供预览功能（让老师看到 AI 会如何分析）
- 推荐使用系统格式或基于系统格式修改

---

### Risk 3: 性能问题

**风险**：复杂的格式合并逻辑可能影响性能

**缓解**：
- 前端缓存合并结果
- 使用 `localStorage` 缓存系统格式
- Edge Function 不参与加载和合并

---

## Migration Plan

### Phase 1: 阶段 2（当前）
- ✅ 实现基本的格式加载（本地 JSON）
- ✅ Edge Function 使用 `analysis_dimensions`
- ✅ 支持红楼梦论文格式

### Phase 2: 阶段 3（老师端）
- 📝 实现 `format_specifications` 表和 RLS
- 📝 实现格式选择器 UI
- 📝 实现基于系统格式修改的逻辑
- 📝 实现格式预览功能

### Phase 3: 未来增强
- 📝 实现完整的格式编辑器（可视化）
- 📝 格式分享和复用
- 📝 格式版本管理
- 📝 格式导入导出

---

## Open Questions

1. **是否需要格式验证 API？**
   - 让老师在保存前验证自定义格式的正确性
   - 可以在前端验证，也可以提供 Edge Function

2. **是否支持格式分享？**
   - 老师之间分享优质的自定义格式
   - 需要评审机制吗？

3. **是否需要格式市场？**
   - 系统推荐的优质自定义格式
   - 下载量、评分等

---

**决策日期**：2025-10-19  
**文档版本**：1.0  
**维护者**：时文宝鉴开发团队

