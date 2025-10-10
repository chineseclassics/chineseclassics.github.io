# 词表系统部署指南

> **更新日期**：2025-10-10  
> **适用版本**：词表系统 v1.0

---

## 🚀 快速部署步骤

### 前提条件

- ✅ Supabase项目已创建（项目ID：bjykaipbeokbbykvseyr）
- ✅ DeepSeek API Key已配置
- ✅ Supabase CLI已安装

---

## 第一步：运行数据库迁移

### 1.1 切换到项目根目录

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io
```

### 1.2 复制functions到根目录

```bash
cp -r story-vocab/supabase/functions supabase/
```

### 1.3 连接Supabase项目

```bash
supabase link --project-ref bjykaipbeokbbykvseyr
```

### 1.4 运行迁移

```bash
supabase db push
```

这将执行 `007_wordlist_system.sql` 迁移脚本，创建：
- ✅ `wordlists` 表
- ✅ `wordlist_tags` 表
- ✅ `vocabulary_wordlist_mapping` 表
- ✅ `user_wordlist_preferences` 表
- ✅ 修改 `vocabulary` 表（添加AI评估字段）
- ✅ 创建数据库函数和视图

---

## 第二步：部署Edge Functions

### 2.1 部署词汇难度评估函数

```bash
supabase functions deploy vocab-difficulty-evaluator
```

### 2.2 重新部署词汇推荐函数（已修改）

```bash
supabase functions deploy vocab-recommender
```

### 2.3 验证部署

访问 Supabase Dashboard → Edge Functions，确认两个函数都显示为"Active"。

---

## 第三步：导入校准词库

### 3.1 启动本地服务器

```bash
cd story-vocab
./start-server.sh
```

或：
```bash
python3 -m http.server 8000
```

### 3.2 运行导入工具

1. 访问：http://localhost:8000/admin/import-calibration-words.html
2. 点击"📥 1. 加载校准词库JSON"
3. 确认加载成功（显示150个词汇）
4. 点击"🚀 2. 导入到数据库"
5. 等待导入完成

**预期结果**：
- 成功导入150个词汇
- 每个词标记为 `is_calibration=true`
- 设置 `calibration_order` (1-150)

---

## 第四步：校准词人工校对（重要！）

### 4.1 打开校准词管理器

访问：http://localhost:8000/admin/calibration-manager.html

### 4.2 检查每个词的难度等级

- 按L1-L6分组显示所有150个词
- 逐个检查AI评估的难度是否合理
- 点击数字按钮调整难度等级
- 修改的词会高亮显示（橙色边框）

### 4.3 保存修改

1. 检查完成后，点击"💾 保存所有修改"
2. 确认保存
3. 系统会询问是否重新评估其他词汇
   - **建议：暂时不要**（等完成初步校准后再统一评估）

---

## 第五步：导入系统词表（可选）

### 5.1 准备HSK词表CSV

创建CSV文件（例如：`hsk-wordlist.csv`）：

```csv
词语,第二层级,第三层级
你,HSK1级,
我,HSK1级,
他,HSK1级,
高興,HSK1级,
朋友,HSK1级,
學校,HSK2级,
```

### 5.2 导入词表

1. 访问：http://localhost:8000/admin/import-system-wordlist.html
2. 填写词表信息：
   - 词表名称：HSK标准词表
   - 词表代码：hsk_standard
   - 第二层级标签名称：等级
   - 第三层级标签名称：（留空）
3. 上传CSV文件
4. 点击"🚀 开始导入"
5. 等待导入完成（新词会自动调用AI评估难度）

---

## 第六步：测试词表系统

### 6.1 测试AI智能推荐模式

1. 访问：http://localhost:8000/
2. 选择"🤖 AI智能推荐"模式
3. 选择故事主题
4. 开始创作
5. 确认词汇推荐正常

### 6.2 测试系统词表模式

1. 访问：http://localhost:8000/
2. 选择"📖 指定词表"模式
3. 选择"HSK标准词表"
4. 选择"HSK1级"（或其他等级）
5. 选择故事主题
6. 开始创作
7. 确认推荐的词汇都来自HSK1级

### 6.3 测试自定义词表上传

1. 下载CSV模板：http://localhost:8000/admin/templates/词表导入模板.csv
2. 编辑CSV，填写5-10个测试词汇
3. 访问：http://localhost:8000/admin/upload-custom-wordlist.html
4. 填写词表名称（如："测试词表"）
5. 上传CSV
6. 导入成功后，回到游戏
7. 选择"指定词表" → "测试词表"
8. 确认可以使用自定义词表创作

---

## 🧪 验证清单

### 数据库验证

在 Supabase Dashboard → SQL Editor 执行：

```sql
-- 检查表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wordlists', 'wordlist_tags', 'vocabulary_wordlist_mapping', 'user_wordlist_preferences');

-- 检查校准词数量
SELECT COUNT(*) as calibration_count 
FROM vocabulary 
WHERE is_calibration = true;

-- 检查校准词分布
SELECT difficulty_level, COUNT(*) 
FROM vocabulary 
WHERE is_calibration = true 
GROUP BY difficulty_level 
ORDER BY difficulty_level;

-- 检查词表数量
SELECT type, COUNT(*) 
FROM wordlists 
GROUP BY type;
```

**预期结果**：
- 4个新表都存在
- 校准词数量：150
- 校准词分布：L1-L6 各约25个
- 词表：至少1个（如果已导入HSK）

### Edge Function验证

```bash
# 查看函数日志
supabase functions logs vocab-difficulty-evaluator --tail
supabase functions logs vocab-recommender --tail
```

### 前端验证

1. ✅ 词表选择器正常显示
2. ✅ 可以切换AI/指定词表模式
3. ✅ 指定词表时，层级选择器动态显示
4. ✅ 游戏中词汇推荐正常
5. ✅ 三种模式都能正常创作故事

---

## 🐛 常见问题

### 问题1：迁移失败 - "column already exists"

**原因**：之前已运行过迁移

**解决**：
```sql
-- 在 SQL Editor 中手动检查字段是否存在
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vocabulary';
```

如果字段已存在，迁移脚本会自动跳过（使用 `IF NOT EXISTS`）。

### 问题2：函数部署失败 - "service_role key required"

**原因**：`vocab-difficulty-evaluator` 需要 service role key

**解决**：
在 Supabase Dashboard → Settings → API → Service Role Key
复制 key，然后：

```bash
# 设置环境变量
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 重新部署
supabase functions deploy vocab-difficulty-evaluator
```

### 问题3：AI评估失败

**原因**：DeepSeek API Key未配置或额度不足

**解决**：
1. 检查 Supabase Dashboard → Edge Functions → Secrets
2. 确认 `DEEPSEEK_API_KEY` 已配置
3. 测试API：访问 https://api.deepseek.com
4. 检查API额度

### 问题4：词表选择器不显示

**原因**：前端模块加载失败

**解决**：
1. 打开浏览器控制台查看错误
2. 确认 `js/ui/wordlist-selector.js` 文件存在
3. 检查 `app.js` 中的import语句
4. 清除浏览器缓存重试

### 问题5：从词表推荐的词汇为空

**原因**：词表中没有词汇，或层级过滤太严格

**解决**：
1. 检查词表是否有词汇：
   ```sql
   SELECT COUNT(*) 
   FROM vocabulary_wordlist_mapping 
   WHERE wordlist_id = 'your-wordlist-id';
   ```
2. 检查层级过滤：尝试选择"全部"而非特定层级
3. 查看Edge Function日志排查

---

## 📋 后续配置（可选）

### 导入更多系统词表

- **人教版小学语文**：按年级和单元组织
- **台湾国语课纲**：按年级组织
- **成语专项**：按主题分类
- **古诗词专项**：按难度和朝代分类

### 批量AI评估

当导入大量词汇后，运行：

```bash
# 在校准词管理器中点击"🤖 重新评估所有词汇"
# 或通过API调用
```

**注意**：批量评估会消耗DeepSeek API额度，建议：
- 分批次评估（每次500词）
- 在非高峰时段运行
- 监控API消耗

---

## ✅ 部署完成确认

当以下所有项都完成时，词表系统部署成功：

- [x] 数据库迁移成功
- [x] Edge Functions部署成功
- [x] 150个校准词导入成功
- [x] 校准词人工校对完成
- [x] 至少1个系统词表导入成功
- [x] 前端词表选择器正常显示
- [x] 三种模式都能正常游戏

---

## 📚 相关文档

- [WORDLIST_SYSTEM_IMPLEMENTATION.md](./WORDLIST_SYSTEM_IMPLEMENTATION.md) - 词表系统实施文档
- [DESIGN.md](./DESIGN.md) - 完整设计文档
- [DATABASE_MIGRATION_EXPLAINED.md](./DATABASE_MIGRATION_EXPLAINED.md) - 数据库迁移说明

---

**部署支持**：如遇问题，请查看Supabase Dashboard的日志和浏览器控制台的错误信息。

