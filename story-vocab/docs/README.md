# 📚 Story-Vocab 文檔中心

> 本文件夾包含 Story-Vocab 項目的完整文檔和規劃資料

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

## 🚀 部署與運維

### [DEPLOYMENT.md](./DEPLOYMENT.md)
完整的部署指南

### [EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)
Edge Functions 部署步驟

### [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
部署前檢查清單

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

## 🎯 快速導航

### 我想...

**開始使用項目**
→ 查看 [主 README](../README.md)

**部署到生產環境**
→ 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 和 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

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

**最後更新**: 2025-10-11  
**維護**: Story-Vocab 開發團隊
