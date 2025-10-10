# 词表系统实施文档

> **实施日期**：2025-10-10  
> **版本**：v1.0  
> **状态**：✅ 核心功能已完成，待测试

---

## 📋 实施概述

本次实施完成了**三种词表模式系统**的核心架构，包括：
- **模式一**：系统预设词表（HSK、教材等标准词表）
- **模式二**：自定义词表（老师/家长上传）
- **模式三**：AI智能推荐（已有，本次集成）

### 核心特点

1. **单一全局词库** - 所有词汇存储在一个 `vocabulary` 表中，全局唯一
2. **灵活层级系统** - 使用"第N层级"而非固定命名，完全由用户自定义
3. **萌典API集成** - 不存储拼音/释义，运行时查询萌典
4. **AI自动评级** - 基于150个黄金标准词，AI自动评估其他词汇难度
5. **完整管理工具** - 提供Admin工具管理校准词、导入系统词表、上传自定义词表

---

## 🏗️ 数据库架构

### 新增表

#### 1. `wordlists` - 词表定义表

存储系统预设词表和用户自定义词表的元信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | TEXT | 词表名称，如"HSK标准词表"、"李老师词表" |
| code | TEXT | 唯一代码，如"hsk_standard"、"custom_xxx" |
| type | TEXT | 'system' 或 'custom' |
| owner_id | UUID | 自定义词表的所有者 |
| hierarchy_config | JSONB | 层级配置：`{"level_2_label": "等级", "level_3_label": "单元"}` |
| description | TEXT | 词表描述 |
| is_public | BOOLEAN | 自定义词表是否公开 |
| total_words | INT | 词汇总数 |

#### 2. `wordlist_tags` - 词表标签表

存储第二/三层级的标签（如HSK等级、教材单元等）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| wordlist_id | UUID | 所属词表 |
| tag_level | INT | 2=第二层级，3=第三层级 |
| tag_code | TEXT | 标签代码，如"HSK3级"、"基础" |
| tag_display_name | TEXT | 显示名称 |
| parent_tag_id | UUID | 父标签（第三层级指向第二层级） |
| sort_order | INT | 排序 |

#### 3. `vocabulary_wordlist_mapping` - 词汇-词表关联表

多对多关系：同一个词可以属于多个词表。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| vocabulary_id | UUID | 词汇ID |
| wordlist_id | UUID | 词表ID |
| tag_path | JSONB | 标签路径：`["HSK3级"]` 或 `["四年级","第一单元"]` |
| level_2_tag | TEXT | 第二层级（冗余，提高查询性能） |
| level_3_tag | TEXT | 第三层级（冗余，提高查询性能） |

#### 4. `user_wordlist_preferences` - 用户词表偏好

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | UUID | 主键，用户ID |
| default_mode | TEXT | 'ai' 或 'wordlist' |
| default_wordlist_id | UUID | 默认词表ID |
| default_level_2_tag | TEXT | 默认第二层级 |
| default_level_3_tag | TEXT | 默认第三层级 |

### 修改表

#### `vocabulary` 表

**新增字段**：
- `difficulty_confidence` - AI评估置信度（high/medium/low）
- `difficulty_reasoning` - AI评估理由
- `difficulty_evaluated_at` - 评估时间
- `is_calibration` - 是否为黄金标准校准词
- `calibration_order` - 校准词顺序（1-150）

**移除字段**：
- `pinyin` - 改用萌典API查询
- `part_of_speech` - 改用萌典API查询
- `theme` - 用词表标签系统替代

---

## 🚀 Edge Functions

### 新增：`vocab-difficulty-evaluator`

**功能**：基于150个黄金标准词，AI自动评估词汇难度

**支持模式**：
- `single` - 评估单个词
- `batch` - 批量评估
- `recalibrate_all` - 重新评估所有词

**输入参数**：
```json
{
  "words": [{"word": "探險"}, ...],
  "mode": "batch"
}
```

**返回结果**：
```json
{
  "success": true,
  "evaluated_count": 100,
  "success_count": 98,
  "error_count": 2,
  "results": [
    {
      "word": "探險",
      "difficulty": 2,
      "confidence": "high",
      "reasoning": "常见儿童读物词汇，2字动词",
      "category": "動詞"
    }
  ]
}
```

### 修改：`vocab-recommender`

**新增参数**：
- `wordlistMode` - 'ai' 或 'wordlist'
- `wordlistId` - 指定词表ID
- `level2Tag` - 第二层级标签
- `level3Tag` - 第三层级标签

**推荐逻辑**：
1. 第一次游戏：始终使用校准词库
2. 已校准 + wordlist模式：从指定词表和层级查询
3. 已校准 + ai模式：AI智能推荐（原有逻辑）

---

## 🛠️ Admin工具

### 1. 校准词导入工具

**文件**：`admin/import-calibration-words.html`

**功能**：
- 从 `calibration-vocabulary.json` 导入150个校准词
- 标记为 `is_calibration=true`
- 设置 `calibration_order`

### 2. 校准词管理器

**文件**：`admin/calibration-manager.html`

**功能**：
- 可视化显示150个校准词（按L1-L6分组）
- 手动调整词汇难度等级（点击按钮）
- 添加/移除校准词
- 保存修改并重新排序
- 触发AI重新评估所有词汇
- 导出校准词库JSON

### 3. 系统词表导入工具

**文件**：`admin/import-system-wordlist.html`

**功能**：
- 导入CSV/JSON格式的系统词表
- 自动创建词表定义和层级标签
- 对新词汇调用AI评估难度
- 创建词汇-词表关联

### 4. 自定义词表上传工具

**文件**：`admin/upload-custom-wordlist.html`

**功能**：
- 上传用户自己的CSV词表（3列：词语、第二层级、第三层级）
- 自动检测层级结构
- AI自动评估新词汇难度
- 支持公开分享词表

---

## 📱 前端集成

### 新增组件

#### `js/ui/wordlist-selector.js`

词表选择器组件，集成到"开始创作"界面。

**功能**：
- 加载用户可用的词表（系统+自定义）
- 模式选择（AI/指定词表）
- 动态显示层级选择器（根据词表配置）
- 保存为默认设置

### 修改文件

#### `index.html`
- 在开始界面添加词表选择器容器

#### `js/app.js`
- 导入 `wordlistSelector`
- DOMContentLoaded 时初始化词表选择器
- `handleStartGame` 时获取词表选择并保存到 `gameState`

#### `js/core/game-state.js`
- 添加词表相关状态字段：
  - `wordlistMode`
  - `wordlistId`
  - `level2Tag`
  - `level3Tag`

#### `js/core/vocab-integration.js`
- `getRecommendedWords` 支持词表选项参数
- 传递词表参数到 Edge Function

#### `js/core/story-engine.js`
- 调用词汇推荐时传递 `wordlistOptions`

---

## 📄 模板文件

### CSV导入模板

**文件**：`admin/templates/词表导入模板.csv`

```csv
词语,第二层级,第三层级
高興,基礎,
朋友,基礎,
勇敢,進階,第一組
```

**说明文档**：`admin/templates/README.md`

---

## 🎯 使用流程

### 管理员：导入系统词表

1. 准备CSV文件（词语、第二层级、第三层级）
2. 打开 `admin/import-system-wordlist.html`
3. 填写词表信息（名称、代码、层级标签名称）
4. 上传CSV文件
5. 系统自动：
   - 创建词表和标签
   - 导入词汇（新词调用AI评估难度）
   - 创建关联

### 老师/家长：上传自定义词表

1. 下载CSV模板
2. 填写词语和可选的分类标签
3. 打开 `admin/upload-custom-wordlist.html`
4. 填写词表名称和描述
5. 上传CSV文件
6. 学生即可在游戏中使用

### 学生：选择词表开始游戏

1. 打开应用，点击"开始新故事"
2. 选择词表模式：
   - 🤖 AI智能推荐
   - 📖 指定词表
3. 如选择指定词表：
   - 选择词表（HSK、教材、老师词表等）
   - 选择层级（如"HSK3级"、"四年级第一单元"）
4. 选择故事主题
5. 开始创作

### 开发者：管理校准词

1. 首次：运行 `admin/import-calibration-words.html` 导入150个校准词
2. 打开 `admin/calibration-manager.html`
3. 逐个检查AI评估的难度是否合理
4. 点击按钮调整难度等级
5. 保存修改
6. 可选：触发重新评估所有词汇

---

## ⚙️ 数据库迁移

### 运行迁移

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io

# 复制函数到根目录
cp -r story-vocab/supabase/functions supabase/

# 连接项目
supabase link --project-ref bjykaipbeokbbykvseyr

# 运行迁移
supabase db push

# 部署Edge Functions
supabase functions deploy vocab-difficulty-evaluator
supabase functions deploy vocab-recommender
```

---

## 🧪 测试清单

### 数据库测试

- [ ] 迁移脚本执行成功
- [ ] 所有表和字段创建正确
- [ ] RLS策略正常工作
- [ ] 视图和函数可用

### 校准词系统

- [ ] 导入150个校准词成功
- [ ] 校准词管理器可以正常显示
- [ ] 调整难度等级并保存成功
- [ ] 添加/移除校准词功能正常
- [ ] 导出校准词库JSON正常

### AI评估系统

- [ ] AI评估单个词汇成功
- [ ] 批量评估功能正常
- [ ] 评估结果合理（与黄金标准一致）
- [ ] 置信度反映准确

### 系统词表

- [ ] 导入HSK词表成功
- [ ] 标签创建正确
- [ ] 层级关系正确
- [ ] 词汇-词表关联正确

### 自定义词表

- [ ] CSV模板可下载
- [ ] 上传CSV文件解析成功
- [ ] 层级自动检测正确
- [ ] AI自动评估新词成功
- [ ] 用户可以看到和使用自己的词表

### 前端集成

- [ ] 词表选择器正常显示
- [ ] 模式切换（AI/指定词表）正常
- [ ] 层级选择器动态显示
- [ ] 保存为默认功能正常
- [ ] 设置页面可以管理词表

### 游戏流程

- [ ] 选择AI模式：正常推荐词汇
- [ ] 选择指定词表：从词表推荐词汇
- [ ] 选择不同层级：推荐对应范围的词汇
- [ ] 第一次游戏：始终使用校准词库
- [ ] 词汇推荐不重复
- [ ] 三种模式可正常切换

---

## 📊 数据流程图

### 模式一：系统预设词表

```
CSV文件（HSK词表）
    ↓
import-system-wordlist.html
    ↓
创建 wordlists 记录（type='system'）
创建 wordlist_tags（第二层级：HSK1级、HSK2级...）
    ↓
对每个词汇：
  - 查找或创建 vocabulary 记录
  - 如是新词 → 调用 AI 评估难度
  - 创建 vocabulary_wordlist_mapping
    ↓
用户在游戏中可选择"HSK标准词表 → HSK3级"
```

### 模式二：自定义词表

```
老师准备CSV（词语、分类标签）
    ↓
upload-custom-wordlist.html
    ↓
创建 wordlists 记录（type='custom', owner_id=老师ID）
自动检测层级标签 → 创建 wordlist_tags
    ↓
对每个词汇：
  - 查找或创建 vocabulary 记录
  - 如是新词 → 调用 AI 评估难度
  - 创建 vocabulary_wordlist_mapping
    ↓
学生可以使用老师的词表创作故事
```

### 模式三：AI智能推荐

```
第一次游戏
    ↓
使用150个校准词 → 评估用户水平
    ↓
第二次及以后
    ↓
AI根据用户画像 → 从全局词库智能推荐
（不限词表，动态选择最合适的词）
```

---

## 🔑 关键设计决策

### 1. 为什么不存储拼音/释义？

**原因**：
- 萌典API提供权威、完整的词典信息
- 减少数据冗余和维护成本
- 运行时查询性能足够（有缓存）

### 2. 为什么使用"第N层级"而非固定命名？

**原因**：
- 不同词表有不同的组织方式
- HSK用"等级"，教材用"年级+单元"，用户自定义可能用其他分类
- 灵活的层级系统适应各种需求

### 3. 为什么校准词也存在全局词库中？

**原因**：
- 避免重复存储
- 校准词也可以在普通游戏中使用
- 通过 `is_calibration` 标记区分

### 4. 为什么需要 level_2_tag 和 level_3_tag 冗余字段？

**原因**：
- 提高查询性能（避免每次解析 JSON）
- 简化索引创建
- 方便SQL查询过滤

---

## 📝 后续工作

### 优先级高

- [ ] **端到端测试**：完整测试三种模式的游戏流程
- [ ] **导入HSK词表**：准备并导入完整的HSK 1-6级词表
- [ ] **校准词人工校对**：开发者检查并校准150个词的难度等级
- [ ] **性能优化**：测试大词表（5000+词）的查询性能

### 优先级中

- [ ] **批量导入工具优化**：支持进度显示、错误恢复
- [ ] **词表浏览器**：查看词表中的所有词汇
- [ ] **词表分享**：公开词表市场
- [ ] **导出功能完善**：支持导出词表为多种格式

### 优先级低

- [ ] **混合模式**：同时使用多个词表（设计文档中的模式四）
- [ ] **词表统计**：学习进度、掌握度等
- [ ] **协作功能**：老师-学生词表订阅
- [ ] **Excel支持**：直接解析.xlsx文件（目前只支持CSV）

---

## 🐛 已知问题

1. **词表查询性能**：大词表（5000+词）查询未优化，可能需要添加更多索引
2. **AI评估成本**：批量评估数千词汇会消耗较多API额度，需要控制频率
3. **Excel解析**：目前只支持CSV，需要额外库才能解析.xlsx
4. **层级验证**：没有验证层级标签的父子关系一致性

---

## 💡 使用建议

### 对于开发者

1. **先导入校准词**：运行 `import-calibration-words.html`
2. **人工校准**：使用 `calibration-manager.html` 检查和调整难度
3. **导入系统词表**：准备HSK或教材词表CSV，使用 `import-system-wordlist.html`
4. **批量评估**：触发AI评估所有词汇的难度

### 对于老师

1. **下载CSV模板**：从 `admin/templates/` 下载
2. **填写词汇列表**：词语 + 可选的分类标签
3. **上传词表**：使用 `upload-custom-wordlist.html`
4. **分享给学生**：告诉学生词表名称，或设为公开

### 对于学生

1. **默认使用AI模式**：无需选择，AI自动推荐
2. **使用老师词表**：在设置中或开始游戏时选择老师的词表
3. **选择学习范围**：如果词表有分级，选择合适的等级/单元

---

## 📚 相关文档

- [DESIGN.md](./DESIGN.md) - 完整设计文档
- [admin/templates/README.md](../admin/templates/README.md) - CSV模板使用说明
- [DATABASE_MIGRATION_EXPLAINED.md](./DATABASE_MIGRATION_EXPLAINED.md) - 数据库迁移说明

---

**实施人员**：AI Assistant  
**最后更新**：2025-10-10

