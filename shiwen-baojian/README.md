# 時文寶鑑

AI 論文寫作指導系統 - 基於太虛幻境平台的教育應用

## 📖 項目簡介

時文寶鑑是一個創新的論文寫作教學工具，旨在幫助中學生掌握學術論文的標準格式和寫作技巧。通過 AI 技術提供**段落級即時反饋**，讓老師的教學標準真正落實到學生的寫作過程中。

### 核心特色

- 🤖 **AI 段落反饋**：寫作過程中獲得即時、精準的格式指導
- 📝 **分層段落編輯器**：支持複雜論文結構（引言 → 分論點 → 結論）
- 👨‍🏫 **老師端管理**：創建任務、設定格式要求、批改論文
- 👨‍🎓 **學生端寫作**：結構化編輯器、自動保存、版本管理
- 🔍 **句子級定位**：AI 反饋精確到第幾句存在問題
- 🚫 **防作弊系統**：粘貼監測、寫作行為分析、誠信報告

## 🎯 目標用戶

- **學生**：高中生（以十年級為例），需要完成學術論文寫作任務
- **老師**：中文或文學老師，需要指導學生論文寫作並批改論文
- **學校**：ISF（弘立書院），所有師生使用 Google 賬號

## 🏗️ 技術架構

### 前端技術
- **核心**：HTML5, CSS3, Vanilla JavaScript（ES6 Modules）
- **樣式**：Tailwind CSS (CDN)
- **編輯器**：Quill.js (CDN)
- **圖標**：Font Awesome (CDN)

### 後端服務
- **數據庫**：Supabase PostgreSQL
- **認證**：Supabase Auth（Google OAuth + 匿名登入）
- **AI**：DeepSeek API（通過 Supabase Edge Functions 代理）
- **邊緣函數**：Supabase Edge Functions (Deno)

### 部署平台
- **主站**：GitHub Pages
- **鏡像**：Cloudflare Pages
- **平台集成**：太虛幻境應用切換器

## 📁 項目結構

```
shiwen-baojian/
├── index.html                   # 主入口
├── README.md                    # 項目說明
│
├── js/                          # JavaScript 模組
│   ├── app.js                   # 應用初始化
│   ├── router.js                # 前端路由
│   ├── config/
│   │   └── supabase-config.js   # Supabase 配置
│   ├── auth/
│   │   ├── google-auth.js       # Google OAuth
│   │   ├── role-detector.js     # 角色識別
│   │   └── session-manager.js   # 會話管理
│   ├── editor/
│   │   ├── rich-text-editor.js  # 富文本編輯器
│   │   ├── paragraph-manager.js # 段落管理
│   │   └── auto-save.js         # 自動保存
│   ├── teacher/
│   │   ├── class-manager.js     # 班級管理（待開發）
│   │   ├── assignment-creator.js # 任務創建（待開發）
│   │   └── grading.js           # 批改功能（待開發）
│   ├── student/
│   │   ├── assignment-list.js   # 任務列表（待開發）
│   │   └── essay-writer.js      # 論文寫作（待開發）
│   └── ai/
│       ├── feedback-requester.js # 反饋請求（待開發）
│       └── feedback-renderer.js  # 反饋展示（待開發）
│
├── css/                         # 樣式文件
│   ├── base.css                 # 基礎樣式
│   ├── editor.css               # 編輯器樣式
│   └── dashboard.css            # 儀表板樣式
│
├── assets/                      # 資源文件
│   └── data/
│       ├── honglou-essay-format.json  # 紅樓夢論文格式模板
│       └── grading-rubric.json        # 評分標準（待創建）
│
├── supabase/                    # Supabase 配置
│   ├── config.toml              # 項目配置
│   ├── functions/
│   │   └── ai-feedback-agent/
│   │       └── index.ts         # AI 反饋 Edge Function
│   └── migrations/
│       ├── 001_create_users_and_classes.sql
│       ├── 002_create_assignments.sql
│       ├── 003_create_essays_and_paragraphs.sql
│       ├── 004_create_feedback_and_behavior.sql
│       ├── 005_create_grading.sql
│       ├── 006_fix_view_rls.sql
│       └── 007_add_anonymous_login_support.sql
│
├── docs/                        # 文檔資料
│   ├── 哈佛引文註釋弘立指南.pdf
│   ├── 論文格式寶典.md
│   ├── 紫荊花中文撰稿格式.md
│   └── 紅樓夢研習論文指引.md
│
└── openspec/                    # 開發規範
    ├── project.md               # 項目約定
    └── changes/
        └── shiwen-baojian-mvp/
            ├── proposal.md      # MVP 提案
            └── tasks.md         # 任務清單
```

## 🚀 快速開始

### 前提條件

- 現代瀏覽器（Chrome, Safari, Firefox, Edge）
- Supabase 賬號（用於數據庫和認證）
- DeepSeek API Key（用於 AI 反饋）

### 本地開發

1. **克隆項目**
   ```bash
   cd chineseclassics.github.io/shiwen-baojian
   ```

2. **啟動本地服務器**
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # 或使用 Node.js
   npx http-server -p 8000
   ```

3. **訪問應用**
   ```
   http://localhost:8000/shiwen-baojian/index.html
   ```

### Supabase 配置

1. **創建 Supabase 項目**
   - 訪問 [Supabase Dashboard](https://app.supabase.com)
   - 創建新項目：`shiwen-baojian`
   - 獲取項目 URL 和 Anon Key

2. **更新配置**
   - 編輯 `js/config/supabase-config.js`
   - 填入您的項目 URL 和 Anon Key

3. **執行數據庫遷移**
   - 在 Supabase Dashboard 的 SQL Editor 中
   - 依次執行 `supabase/migrations/` 下的 SQL 文件

4. **配置 Google OAuth**
   - 在 Supabase Dashboard → Authentication → Providers
   - 啟用 Google 提供商
   - 配置重定向 URL

5. **部署 Edge Function**
   ```bash
   cd chineseclassics.github.io/shiwen-baojian
   supabase link --project-ref [your-project-id]
   supabase functions deploy ai-feedback-agent
   ```

## 📋 開發進度

### ✅ 阶段 1：核心基础（已完成）

- [x] 数据库和 Supabase 配置
- [x] 应用基础结构（HTML, CSS, JS）
- [x] 用户认证系统（Google OAuth + 匿名登录）
- [x] 路由和导航（Hash-based routing）
- [x] 分层段落编辑器（Quill.js）
- [x] 自动保存与版本管理

### 🔄 阶段 2：AI 反馈系统（进行中）

- [ ] AI 反馈 Edge Function
- [ ] 学生端 - AI 反馈界面
- [ ] 防作弊系统

### ⏸️ 阶段 3：老师端完整功能（待开始）

- [ ] 老师端 - 班级管理
- [ ] 老师端 - 任务管理
- [ ] 学生端 - 任务列表
- [ ] 老师端 - 批改功能

### ⏸️ 阶段 4：优化和部署（待开始）

- [ ] UI/UX 优化
- [ ] 太虚幻境集成
- [ ] 测试与部署
- [ ] 文档

## 🎓 使用指南

### 老師端

1. **Google 登入**：使用 `*@isf.edu.hk` 郵箱登入
2. **創建班級**：添加學生郵箱列表
3. **創建任務**：選擇模板或自定義格式要求
4. **設定評分標準**：使用 IB MYP/DP 標準或自定義
5. **批改論文**：查看學生提交、添加批注、評分

### 學生端

1. **Google 登入**：使用 `*@student.isf.edu.hk` 郵箱登入
2. **查看任務**：瀏覽老師分配的寫作任務
3. **開始寫作**：使用分層段落編輯器撰寫論文
4. **獲取反饋**：提交段落後獲得 AI 即時反饋
5. **提交論文**：完成後提交給老師批改

### 匿名測試

1. **匿名登入**：點擊「匿名測試」按鈕
2. **體驗功能**：測試編輯器和基本功能
3. **限制**：無法訪問完整的任務和批改功能

## 🔒 角色權限

### 老師 (`*@isf.edu.hk`)
- ✅ 創建和管理班級
- ✅ 創建和管理任務
- ✅ 批改學生論文
- ✅ 查看學生寫作歷史和誠信報告
- ✅ 查看數據分析

### 學生 (`*@student.isf.edu.hk`)
- ✅ 查看任務列表
- ✅ 撰寫和提交論文
- ✅ 獲得 AI 反饋
- ✅ 查看成績和批注
- ❌ 無法看到 AI 評分預估（避免與老師評分衝突）

### 匿名用戶
- ✅ 體驗編輯器
- ✅ 獲得 AI 反饋
- ❌ 無法保存到雲端
- ❌ 無法訪問任務系統

## 🛠️ 開發規範

### 代碼風格

- **命名**：文件 `kebab-case`，變量 `camelCase`，常量 `UPPER_SNAKE_CASE`
- **縮進**：4 空格
- **註釋**：繁體中文，關鍵邏輯必須註釋
- **模組化**：使用 ES6 Modules

### Git 工作流

- **分支**：主要在 `main` 分支開發
- **提交格式**：
  ```
  feat(shiwen-baojian): 添加 Google 登入支持
  fix(shiwen-baojian): 修復自動保存問題
  docs(shiwen-baojian): 更新 README
  ```
- **推送**：用戶在 GitHub Desktop 手動管理

### 測試

- **功能測試**：手動測試各項功能
- **兼容性測試**：桌面和移動端
- **集成測試**：在太虛幻境主頁測試應用切換器

## 🔗 相關資源

- [太虛幻境主頁](https://chineseclassics.github.io)
- [Supabase 文檔](https://supabase.com/docs)
- [Quill.js 文檔](https://quilljs.com/docs)
- [DeepSeek API](https://platform.deepseek.com)

## � 字典資料與授權

- 英→中查詢採用 CEDICT（CC BY-SA 3.0）。我們以英文字首分片的方式在前端動態載入，生成與部署流程見 `docs/cedict-sharding.md`。請在對外發佈時保留 CEDICT 來源與授權聲明。

## �📄 授權

MIT License - 詳見 [LICENSE](../LICENSE) 文件

## 👥 開發團隊

**太虛幻境開發團隊**

如有問題或建議，請聯繫項目維護者。

---

**時文寶鑑** - 讓論文寫作教學更高效、更有針對性 ✨

---

## 📊 項目狀態

### ✅ MVP 完成狀態
- **總進度**：180/180 任務（100%）
- **核心功能**：✅ 完全完成
- **設計系統**：✅ 青灰雅士配色方案完成
- **平台集成**：✅ 太虛幻境集成完成
- **測試狀態**：✅ 基礎功能測試通過

### 🎨 設計系統
- **配色方案**：青灰雅士（青灰石、青苔綠、秋香色、豆沙紅、栗褐色）
- **組件庫**：統一的按鈕、表單、卡片組件
- **動畫系統**：流暢的過渡和交互動畫
- **文化內涵**：體現中文教學特色的配色設計

### 🚀 可用性
- **MVP 狀態**：✅ 完全可用
- **部署狀態**：✅ 已部署到 GitHub Pages
- **平台集成**：✅ 已集成到太虛幻境平台
- **用戶體驗**：✅ 完整的師生端功能

