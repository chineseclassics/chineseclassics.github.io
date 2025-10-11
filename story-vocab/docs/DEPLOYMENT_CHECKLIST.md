# 词表系统部署检查清单

> **部署日期**：_______  
> **部署人员**：_______  
> **Supabase项目**：bjykaipbeokbbykvseyr

---

## ✅ 部署前准备

- [ ] 代码已提交到Git
- [ ] 已阅读 `docs/WORDLIST_DEPLOYMENT_GUIDE.md`
- [ ] Supabase CLI 已安装并登录
- [ ] DeepSeek API Key 已准备

---

## 📦 第一阶段：数据库部署

### 1.1 运行迁移

```bash
cd /Users/ylzhang/Documents/GitHub/chineseclassics.github.io
supabase link --project-ref bjykaipbeokbbykvseyr
supabase db push
```

**检查点**：
- [ ] 迁移执行无错误
- [ ] 在Supabase Dashboard → Database → Tables中看到新表：
  - [ ] wordlists
  - [ ] wordlist_tags
  - [ ] vocabulary_wordlist_mapping
  - [ ] user_wordlist_preferences

### 1.2 验证vocabulary表修改

在SQL Editor执行：
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'vocabulary';
```

**检查点**：
- [ ] 有 `difficulty_confidence` 字段
- [ ] 有 `is_calibration` 字段
- [ ] 有 `calibration_order` 字段
- [ ] 没有 `pinyin` 字段（已移除）

---

## 🚀 第二阶段：Edge Functions部署

### 2.1 复制functions到根目录

```bash
cp -r story-vocab/supabase/functions supabase/
```

### 2.2 部署新函数

```bash
supabase functions deploy vocab-difficulty-evaluator
```

**检查点**：
- [ ] 部署成功，无错误
- [ ] 在Dashboard → Edge Functions中看到 `vocab-difficulty-evaluator`
- [ ] 状态显示为 "Active"

### 2.3 重新部署修改的函数

```bash
supabase functions deploy vocab-recommender
```

**检查点**：
- [ ] 部署成功
- [ ] 在Dashboard中看到新的版本号

### 2.4 配置环境变量

确认在 Dashboard → Edge Functions → Secrets 中有：
- [ ] `DEEPSEEK_API_KEY`
- [ ] `SUPABASE_URL`（自动）
- [ ] `SUPABASE_ANON_KEY`（自动）
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（vocab-difficulty-evaluator需要）

---

## 📚 第三阶段：导入校准词库

### 3.1 启动本地服务器

```bash
cd story-vocab
python3 -m http.server 8000
```

### 3.2 导入校准词

访问：http://localhost:8000/admin/import-calibration-words.html

**操作步骤**：
- [ ] 点击"📥 1. 加载校准词库JSON"
- [ ] 确认显示"150个词汇"
- [ ] 点击"🚀 2. 导入到数据库"
- [ ] 等待导入完成（约1-2分钟）
- [ ] 确认显示"✅ 导入完成"

### 3.3 验证导入

在SQL Editor执行：
```sql
SELECT difficulty_level, COUNT(*) 
FROM vocabulary 
WHERE is_calibration = true 
GROUP BY difficulty_level 
ORDER BY difficulty_level;
```

**检查点**：
- [ ] 总数：150个
- [ ] L1-L6 各有词汇（约25个/级）

---

## ⭐ 第四阶段：校准词人工校对

### 4.1 打开校准词管理器

访问：http://localhost:8000/admin/calibration-manager.html

**检查点**：
- [ ] 页面加载成功
- [ ] 显示150个词汇，按L1-L6分组
- [ ] 每个词显示难度按钮（1-6）

### 4.2 人工校准（重要！）

**建议流程**：
1. 从L1开始，逐个检查每个词
2. 思考：这个词适合几岁的孩子？
3. 如不合适，点击对应的难度按钮
4. 继续检查下一个词

**检查点**：
- [ ] L1词汇都非常简单（高兴、朋友、吃等）
- [ ] L2词汇是小学中高年级水平（探险、勇敢等）
- [ ] L3词汇有一定文学性（寧靜、凝視等）
- [ ] L4词汇较抽象（滄桑、蛻變等）
- [ ] L5-L6词汇文言色彩强（悠然、婉約等）

### 4.3 保存修改

- [ ] 点击"💾 保存所有修改"
- [ ] 确认保存成功
- [ ] 暂时选择"否"（不重新评估，等后续步骤）

---

## 📖 第五阶段：导入系统词表（推荐）

### 5.1 准备HSK词表CSV

**最简示例**（用于测试）：
创建文件 `hsk-test.csv`：
```csv
词语,第二层级,第三层级
你,HSK1级,
我,HSK1级,
他,HSK1级,
好,HSK1级,
是,HSK1级,
```

### 5.2 导入

访问：http://localhost:8000/admin/import-system-wordlist.html

**操作**：
- [ ] 填写词表名称："HSK标准词表"
- [ ] 填写词表代码："hsk_standard"
- [ ] 第二层级标签名称："等级"
- [ ] 第三层级标签名称：（留空）
- [ ] 上传CSV文件
- [ ] 点击"🚀 开始导入"
- [ ] 等待完成

**检查点**：
- [ ] 导入成功
- [ ] 新词调用了AI评估
- [ ] 词表在数据库中可见

### 5.3 验证

```sql
SELECT * FROM wordlists WHERE code = 'hsk_standard';
SELECT * FROM wordlist_tags WHERE wordlist_id = (SELECT id FROM wordlists WHERE code = 'hsk_standard');
```

---

## 🧪 第六阶段：前端测试

### 6.1 启动游戏

访问：http://localhost:8000/

**检查点**：
- [ ] 页面加载成功
- [ ] 看到词表选择器（🤖 AI智能推荐 / 📖 指定词表）

### 6.2 测试AI模式

- [ ] 选择"🤖 AI智能推荐"
- [ ] 选择故事主题
- [ ] 点击"开始创作"
- [ ] 游戏正常启动
- [ ] 词汇推荐正常

### 6.3 测试指定词表模式

- [ ] 返回开始页面
- [ ] 选择"📖 指定词表"
- [ ] 在下拉框中看到"HSK标准词表"
- [ ] 选择"HSK1级"
- [ ] 选择故事主题
- [ ] 点击"开始创作"
- [ ] 词汇推荐来自HSK1级

### 6.4 测试设置页面

访问：http://localhost:8000/settings.html

**检查点**：
- [ ] 页面加载成功
- [ ] 可以选择默认模式
- [ ] 可以看到"我的自定义词表"（如果有）
- [ ] 保存设置功能正常

---

## 🎨 第七阶段：测试自定义词表

### 7.1 下载模板

访问：http://localhost:8000/admin/templates/词表导入模板.csv

- [ ] 文件下载成功
- [ ] 查看文件内容正确

### 7.2 准备测试词表

创建文件 `test-custom.csv`：
```csv
词语,第二层级,第三层级
堅持,基礎詞彙,
努力,基礎詞彙,
勇敢,進階詞彙,
智慧,進階詞彙,
```

### 7.3 上传

访问：http://localhost:8000/admin/upload-custom-wordlist.html

**操作**：
- [ ] 填写词表名称："测试自定义词表"
- [ ] 上传CSV文件
- [ ] 检测到层级（显示"基礎詞彙"、"進階詞彙"）
- [ ] 确认层级标签名称
- [ ] 点击导入
- [ ] 导入成功

### 7.4 使用自定义词表

- [ ] 返回游戏首页
- [ ] 选择"📖 指定词表"
- [ ] 在列表中看到"✏️ 测试自定义词表"
- [ ] 选择"基礎詞彙"
- [ ] 开始游戏
- [ ] 词汇来自自定义词表

---

## 🔍 第八阶段：AI评估测试

### 8.1 测试单个词评估

在浏览器控制台执行：

```javascript
const response = await fetch('https://bjykaipbeokbbykvseyr.supabase.co/functions/v1/vocab-difficulty-evaluator', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    words: [{word: '測試'}],
    mode: 'single'
  })
})
const data = await response.json()
console.log(data)
```

**检查点**：
- [ ] API调用成功
- [ ] 返回评估结果（difficulty, confidence, reasoning）
- [ ] 结果合理

### 8.2 在校准词管理器测试批量评估

- [ ] 打开校准词管理器
- [ ] 点击"🤖 重新评估所有词汇"
- [ ] 确认（会消耗API额度）
- [ ] 等待评估完成（可能需要几分钟）
- [ ] 检查评估结果是否合理

---

## ✅ 部署完成确认

所有检查点都通过后，词表系统部署成功！

### 最终验证

- [ ] 数据库表结构正确
- [ ] Edge Functions正常工作
- [ ] 150个校准词已导入并人工校对
- [ ] 至少1个系统词表可用
- [ ] 可以上传和使用自定义词表
- [ ] 前端三种模式都能正常游戏
- [ ] AI评估系统工作正常

---

## 📋 后续任务

### 短期（1周内）

- [ ] 导入完整HSK词表（HSK 1-6级）
- [ ] 创建2-3个示例自定义词表（供演示）
- [ ] 性能测试（大词表查询）
- [ ] 用户测试（邀请5-10人试用）

### 中期（1月内）

- [ ] 导入教材词表（人教版或台湾课纲）
- [ ] 优化AI评估算法
- [ ] 添加词表浏览器
- [ ] 实施词表分享功能

---

## 📞 支持

如遇问题：
1. 查看 `docs/WORDLIST_DEPLOYMENT_GUIDE.md` 故障排查部分
2. 检查Supabase Dashboard的日志
3. 查看浏览器控制台错误
4. 参考 `docs/WORDLIST_SYSTEM_IMPLEMENTATION.md`

---

**祝部署顺利！** 🚀

