# 📚 Story-Vocab 文檔中心

> 本文件夾包含 Story-Vocab 項目的完整文檔和規劃資料

## ⚠️ 文檔原則

**少而精**：只記錄重要的架構決策、複雜功能和會話總結。小型修復寫在代碼註釋或會話總結中。

---

## 📖 核心文檔

### [DESIGN.md](./DESIGN.md)
**完整設計文檔** - 包含以下內容：
- 🎯 產品規劃與設計理念
- 🎮 遊戲玩法設計
- 🏗️ 技術架構與數據庫設計
- 🤖 AI Agent 設計
- 📊 市場調研與競品分析
- 📅 MVP 實施計劃

---

## 🔐 認證系統

### [AUTH_FINAL_DESIGN.md](./AUTH_FINAL_DESIGN.md) ⭐
**最終設計方案** - UUID + 多重身份系統（Google + 匿名）

### [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)
**認證架構設計** - 雙模式認證系統詳細技術文檔

### [MULTI_IDENTITY_SYSTEM.md](./MULTI_IDENTITY_SYSTEM.md)
**多重身份系統設計** - 數據庫設計和實施細節

### [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**實施計劃** - 分階段實施步驟和測試清單

### [AUTH_DECISIONS_SUMMARY.md](./AUTH_DECISIONS_SUMMARY.md)
**架構決策總結** - 討論過程和關鍵決策理由

### [GOOGLE_ID_AS_PRIMARY_KEY.md](./GOOGLE_ID_AS_PRIMARY_KEY.md)
~~Google ID 主鍵方案~~（已棄用，參考用）

### [GOOGLE_AUTH_INTEGRATION.md](./GOOGLE_AUTH_INTEGRATION.md)
~~Google 認證集成指南~~（舊方案，參考用）

---

## 🚀 部署與運維

### [DEPLOYMENT.md](./DEPLOYMENT.md)
完整的部署指南

### [EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)
Edge Functions 部署步驟

### [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)
部署完成報告

---

## 🗄️ 數據庫與系統

### [DATABASE_MIGRATION_EXPLAINED.md](./DATABASE_MIGRATION_EXPLAINED.md)
數據庫遷移說明

### [WORDLIST_DEPLOYMENT_GUIDE.md](./WORDLIST_DEPLOYMENT_GUIDE.md)
詞表系統部署指南

### [WORDLIST_SYSTEM_IMPLEMENTATION.md](./WORDLIST_SYSTEM_IMPLEMENTATION.md)
詞表系統實現文檔

### [WORDLIST_SYSTEM_SUMMARY.md](./WORDLIST_SYSTEM_SUMMARY.md)
詞表系統總結

### [CALIBRATION_VOCABULARY_UPDATE.md](./CALIBRATION_VOCABULARY_UPDATE.md)
校準詞彙更新記錄

---

## 🛠️ Supabase CLI 工具

### [SUPABASE_CLI_GUIDE.md](./SUPABASE_CLI_GUIDE.md)
**快速開始指南** - Supabase CLI 在 Cursor 中的使用指南

### [SUPABASE_CLI_REFERENCE.md](./SUPABASE_CLI_REFERENCE.md)
**完整參考手冊** - 所有 Supabase CLI 命令和功能的詳細說明

### [SUPABASE_QUICK_REFERENCE.md](./SUPABASE_QUICK_REFERENCE.md)
**快速參考卡片** - 最常用命令速查表

**相關工具腳本**（在項目根目錄）：
- `../supabase-utils.sh` - Supabase 管理工具腳本
- `../query-table-structure.sh` - 數據庫表結構查詢工具

---

## 🔒 安全與測試

### [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
安全檢查清單

### [FINAL_TEST_GUIDE.md](./FINAL_TEST_GUIDE.md)
最終測試指南

---

## 📝 開發總結

### [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
實現總結

### [SETTINGS_REFACTOR_SUMMARY.md](./SETTINGS_REFACTOR_SUMMARY.md)
設置重構總結

---

## 🐛 問題修復記錄

### [SESSION_FIX_SUMMARY_2025-10-12.md](./SESSION_FIX_SUMMARY_2025-10-12.md)
**生詞本優化總結** - 修復 4 個相關問題：
1. 詞語卡顯示問題（DOM 重試機制）
2. 查詢超時問題（異步優先策略）
3. 頻繁插入超時（請求隊列化）
4. 生詞本顯示為空（等待同步完成）

其他修復記錄：
- [CALIBRATION_VOCAB_FIX.md](./CALIBRATION_VOCAB_FIX.md) - 校準詞彙修復
- [DATA_CLOUD_SYNC_FIX.md](./DATA_CLOUD_SYNC_FIX.md) - 雲端同步修復
- [FEEDBACK_FLOW_AND_FIX.md](./FEEDBACK_FLOW_AND_FIX.md) - 反饋流程修復
- [MULTI_IDENTITY_FIX_SUMMARY.md](./MULTI_IDENTITY_FIX_SUMMARY.md) - 多重身份系統修復
- [SKIP_FEEDBACK_OPTIMIZATION.md](./SKIP_FEEDBACK_OPTIMIZATION.md) - 跳過反饋優化
- [STORY_AGENT_OPTIMIZATION.md](./STORY_AGENT_OPTIMIZATION.md) - Story Agent 優化
- [THREE_STEP_EVALUATION.md](./THREE_STEP_EVALUATION.md) - 三步評估
- [WORDBOOK_SMART_LOOKUP.md](./WORDBOOK_SMART_LOOKUP.md) - 智能查詢

---

## 🎯 快速導航

### 我想...

**開始使用項目**
→ 查看 [主 README](../README.md)

**實施 Google 登入**
→ 查看 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) 和 [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)

**部署到生產環境**
→ 查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

**部署 Edge Functions**
→ 查看 [EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)

**使用 Supabase CLI 管理數據庫**
→ 查看 [SUPABASE_CLI_GUIDE.md](./SUPABASE_CLI_GUIDE.md)

**了解項目設計思路**
→ 查看 [DESIGN.md](./DESIGN.md)

**查詢數據庫表結構**
→ 運行 `../query-table-structure.sh [table_name]`

**查看數據庫統計**
→ 運行 `../supabase-utils.sh tables`

---

## 📂 文檔組織原則

根據 [TAIXU_ARCHITECTURE.md](../../TAIXU_ARCHITECTURE.md)，Story-Vocab 作為太虛幻境的子項目，採用以下文檔組織結構：

```
story-vocab/
├── README.md                    # 項目主文檔（快速開始）
├── *.sh                        # 工具腳本
├── docs/                       # 所有詳細文檔
│   ├── README.md              # 本文件（文檔索引）
│   ├── DESIGN.md              # 設計文檔
│   ├── DEPLOYMENT*.md         # 部署相關
│   ├── SUPABASE*.md           # Supabase 相關
│   └── ...其他文檔
├── js/                        # 代碼
├── css/                       # 樣式
└── supabase/                  # Edge Functions & Migrations
```

### 文檔分類規則

- **項目根目錄**：只放 README.md 和工具腳本
- **docs/**：所有 .md 文檔都應該放在這裡
- **按主題分類**：部署、數據庫、工具、安全等

---

## 🏗️ Supabase 架構原則

Story-Vocab 採用**完全獨立的 Supabase 架構**：

### 架構特點

```
story-vocab/
└── supabase/                  # 完全自包含的 Supabase 配置
    ├── config.toml           # 獨立配置文件
    ├── functions/            # Edge Functions
    │   ├── story-agent/
    │   ├── vocab-recommender/
    │   └── vocab-difficulty-evaluator/
    └── migrations/           # 數據庫遷移腳本
```

### 部署方式

**✅ 正確做法**：在 story-vocab 目錄內直接部署
```bash
cd story-vocab
supabase link --project-ref bjykaipbeokbbykvseyr
supabase db push
supabase functions deploy [function-name]
```

**❌ 錯誤做法**：複製到太虛幻境根目錄
```bash
# 不要這樣做！
cp -r story-vocab/supabase/functions /supabase/
```

### 為什麼採用獨立架構？

1. **符合兩層原則**：子項目完全自包含
2. **避免混亂**：多個子項目不會互相干擾
3. **易於維護**：每個項目獨立管理自己的資源
4. **可移植性**：story-vocab 可以完整遷移到其他倉庫

### 與太虛幻境根目錄的關係

太虛幻境根目錄的 `/supabase/` 是平台級預留位置，用於未來可能的跨應用共享服務（如統一用戶認證）。目前各子項目都使用各自獨立的 Supabase 資源。

相關文檔：
- [太虛幻境架構文檔](../../TAIXU_ARCHITECTURE.md)
- [根目錄 Supabase 說明](../../supabase/README.md)

---

**最後更新**: 2025-10-11  
**維護**: Story-Vocab 開發團隊
