# 太虛幻境專案規則

> 本目錄包含太虛幻境項目的所有 Cursor Rules（MDC 格式）

## 📋 規則列表

### Always Rules（一律套用）

| 規則文件 | 描述 | 狀態 |
|---------|------|------|
| `development-standards.mdc` | 開發標準 - 語言、代碼、文件組織、應用開發、項目初始化、代碼審查 | ✅ Always |
| `documentation-standards.mdc` | 文檔創建規範 - 少而精，避免過度記錄 | ✅ Always |
| `problem-solving-principles.mdc` | 問題解決原則 - 避免過度複雜化，追求簡單有效 | ✅ Always |

### Auto Attached Rules（自動附加）

| 規則文件 | 描述 | 觸發條件 | 狀態 |
|---------|------|---------|------|
| `supabase-architecture.mdc` | Supabase 架構管理 - 子項目獨立部署 | `**/supabase/**`, `**/*[Ss]upabase*.md`, `**/*[Dd]eploy*.md` | 🔄 Auto |

### Manual Rules（手動引用）

| 規則文件 | 描述 | 引用方式 | 狀態 |
|---------|------|---------|------|
| `rules-management.mdc` | 規則管理指南 - 如何創建和管理規則 | `@rules-management` | 📖 Manual |
| `git-workflow.mdc` | Git 工作流程規範 - 提交和分支管理 | `@git-workflow` | 📖 Manual |
| `dual-mode-architecture.mdc` | 雙模式架構規範 - 應用獨立性與平台協作 | `@dual-mode-architecture` | 📖 Manual |
| `tailwind-ui-system.mdc` | Tailwind CSS 統一 UI 和配色系統規範 | `@tailwind-ui-system` | 📖 Manual |
| `supabase-client-init.mdc` | Supabase 客戶端初始化最佳實踐 | `@supabase-client-init` | 📖 Manual |

## 🎯 規則類型說明

### Always（一律套用）
這些規則**始終包含**在 AI 的上下文中，無需明確引用。適用於：
- 核心架構原則
- 必須遵守的規範
- 語言和編碼標準

### Auto Attached（自動附加）
當處理**特定路徑或文件類型**時自動啟用。適用於：
- 特定技術棧的最佳實踐
- 子系統專屬規則
- 文件類型特定規範

### Manual（手動引用）
僅在使用 `@ruleName` 明確提及時才會包含。適用於：
- 特殊工作流程
- 範本和腳手架
- Meta 規則（關於規則的規則）
- 專業技術棧規範

## 🛠️ 如何使用規則

### 手動引用規則
在對話中使用：
```
@rules-management 我想創建一個新的規則
@git-workflow 請幫我創建一個 feature 分支
@dual-mode-architecture 請幫我設計雙模式架構
@tailwind-ui-system 請幫我設計統一的 UI 配色方案
@supabase-client-init 請幫我配置 Supabase 客戶端初始化
```

### 創建新規則
1. 使用指令：`New Cursor Rule`
2. 手動創建：在本目錄創建新的 `.mdc` 文件
3. 生成指令：`/Generate Cursor Rules`
4. 參考：`@rules-management`

## 📐 規則結構

所有規則使用 **MDC 格式**（.mdc 文件）：

```mdc
---
description: 規則描述
globs: ["路徑模式"]  # 可選
alwaysApply: true    # 或 false
---

# 規則內容（Markdown 格式）
```

## 🌲 巢狀規則（子項目專屬）

根據 Cursor 的巢狀規則功能，子項目可以有各自的 `.cursor/rules/` 目錄：

### Story-Vocab 規則
位置：`story-vocab/.cursor/rules/`

| 規則文件 | 描述 | 類型 |
|---------|------|------|
| `auth.mdc` | 雙模式認證架構規範 | Auto |
| `supabase-deployment.mdc` | Supabase 部署規範 | Auto |

詳見：[story-vocab/.cursor/rules/README.md](../../story-vocab/.cursor/rules/README.md)

## 📊 規則統計

### 平台級規則（本目錄）
- **總規則數**：8
- **Always 規則**：3
- **Auto Attached 規則**：1
- **Manual 規則**：5

### 子項目規則
- **Story-Vocab**：2 個規則（`auth.mdc`, `supabase-deployment.mdc`）

## 🎓 最佳實踐

根據 Cursor 文檔和太虛幻境項目經驗：

1. **聚焦且可執行** - 每個規則專注單一主題
2. **控制篇幅** - 規則控制在 500 行以內
3. **提供範例** - 包含 ✅ 正確和 ❌ 錯誤範例
4. **使用繁體中文** - 所有內容使用繁體中文
5. **描述性命名** - 文件名清晰描述規則內容

## 🔄 更新記錄

- **2025-01-20**：精簡規則結構
  - **合併規則**：將 `self-code-review` 和 `project-setup` 合併到 `development-standards`
  - **合併規則**：將 `nested-rules-architecture` 和 `how-to-create-rules` 合併為 `rules-management`
  - **簡化規則**：`git-workflow` 只保留核心提交規範
  - **簡化規則**：`dual-mode-architecture` 精簡為核心要點
  - **結果**：從 14 個規則減少到 8 個核心規則，提升效率

- **2025-10-19**：深度優化規則結構
  - 將大型規則改為手動引用
  - 合併小型規則
  - 上下文從 3,223 行減少到約 1,000 行

- **2025-10-15**：添加 Supabase 客戶端初始化最佳實踐

- **2025-10-14**：添加應用開發規範

- **2025-10-12**：添加文檔創建規範

- **2025-10-11**：創建 MDC 格式的專案規則系統

## 🔗 相關資源

- **官方文檔**：[Cursor Rules](https://cursor.com/zh-Hant/docs/context/rules)
- **架構文檔**：[TAIXU_ARCHITECTURE.md](../../TAIXU_ARCHITECTURE.md)
- **簡化指令**：[AGENTS.md](../../AGENTS.md)

---

**維護**：太虛幻境開發團隊  
**最後更新**：2025-01-20
