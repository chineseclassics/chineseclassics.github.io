# 太虛幻境專案規則

> 本目錄包含太虛幻境項目的所有 Cursor Rules（MDC 格式）

## 📋 規則列表

### Always Rules（一律套用）

| 規則文件 | 描述 | 狀態 |
|---------|------|------|
| `language.mdc` | 語言規範 - 始終使用繁體中文 | ✅ Always |
| `file-organization.mdc` | 文件組織規範 - 兩層架構原則 | ✅ Always |
| `coding-standards.mdc` | 代碼規範 | ✅ Always |
| `documentation-standards.mdc` | 文檔創建規範 - 少而精，避免過度記錄 | ✅ Always |

### Auto Attached Rules（自動附加）

| 規則文件 | 描述 | 觸發條件 | 狀態 |
|---------|------|---------|------|
| `supabase-architecture.mdc` | Supabase 架構管理 | `**/supabase/**`, `**/*deploy*.md` | 🔄 Auto |
| `dual-mode-architecture.mdc` | 雙模式架構規範 | 應用開發時手動引用 | 🔄 Auto |

### Manual Rules（手動引用）

| 規則文件 | 描述 | 引用方式 | 狀態 |
|---------|------|---------|------|
| `git-workflow.mdc` | Git 工作流程規範 | `@git-workflow` | 📖 Manual |
| `how-to-create-rules.mdc` | 如何創建規則 (Meta Rule) | `@how-to-create-rules` | 📖 Manual |
| `nested-rules-architecture.mdc` | 巢狀規則架構指南 | `@nested-rules-architecture` | 📖 Manual |

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

## 🛠️ 如何使用規則

### 查看所有規則
在 Cursor 中：
```
Settings → Rules → Project Rules
```

### 手動引用規則
在對話中使用：
```
@git-workflow 請幫我創建一個 feature 分支
@how-to-create-rules 我想創建一個新的規則
```

### 創建新規則
1. 使用指令：`New Cursor Rule`
2. 手動創建：在本目錄創建新的 `.mdc` 文件
3. 生成指令：`/Generate Cursor Rules`
4. 參考：`@how-to-create-rules`

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

## 🔗 相關資源

- **官方文檔**：[Cursor Rules](https://cursor.com/zh-Hant/docs/context/rules)
- **架構文檔**：[TAIXU_ARCHITECTURE.md](../../TAIXU_ARCHITECTURE.md)
- **簡化指令**：[AGENTS.md](../../AGENTS.md)
- **舊版規則**：[.cursorrules](../../.cursorrules)（已淘汰）

## 🌲 巢狀規則（子項目專屬）

根據 Cursor 的巢狀規則功能，子項目可以有各自的 `.cursor/rules/` 目錄：

### Story-Vocab 規則
位置：`story-vocab/.cursor/rules/`

| 規則文件 | 描述 | 類型 |
|---------|------|------|
| `auth.mdc` | 雙模式認證架構規範 | Auto |
| `supabase-deployment.mdc` | Supabase 部署規範 | Auto |

詳見：[story-vocab/.cursor/rules/README.md](../../story-vocab/.cursor/rules/README.md)

### 未來子項目
- `wanwuxiaoyao/.cursor/rules/` - 莊子遊戲專屬規則（待創建）
- `cilong/.cursor/rules/` - 字龍專屬規則（待創建）

## 📊 規則統計

### 平台級規則（本目錄）
- **總規則數**：8
- **Always 規則**：4
- **Auto Attached 規則**：2
- **Manual 規則**：3
- **Meta 規則**：2

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

- **2025-10-12**：添加文檔創建規範
  - 新增 `documentation-standards.mdc` - 文檔創建規範（Always）
  - 規範何時創建文檔、何時不創建
  - 強調"少而精"原則，避免過度記錄

- **2025-10-11**：創建 MDC 格式的專案規則系統
  - 從 `.cursorrules` 遷移到 `.cursor/rules/`
  - 創建 7 個平台級規則文件
  - 添加 `AGENTS.md` 作為簡化替代方案
  - 創建 `story-vocab/.cursor/rules/` 子項目規則目錄
  - 添加 `dual-mode-architecture.mdc` - 雙模式架構通用規範
  - 將 story-vocab 專屬規則移至子項目目錄（2 個規則）

---

**維護**：太虛幻境開發團隊  
**最後更新**：2025-10-12

