# Story-Vocab 專案規則

> 本目錄包含 Story-Vocab 項目專屬的 Cursor Rules

## 📋 規則列表

| 規則文件 | 描述 | 類型 | 觸發條件 |
|---------|------|------|---------|
| `supabase-deployment.mdc` | Supabase 部署規範 | Auto | `supabase/**` |

## 🏗️ 規則繼承

### 從平台級繼承的規則

當在 story-vocab 工作時，以下平台級規則**自動啟用**：

1. ✅ **語言規範** - 始終使用繁體中文
2. ✅ **文件組織規範** - 兩層架構原則
3. ✅ **代碼規範** - 通用編碼標準

### Story-Vocab 專屬規則

本目錄的規則是對平台級規則的**補充**，提供：
- Story-Vocab 具體的技術棧實現
- Supabase 部署的詳細步驟
- 項目特定的最佳實踐

## 🎯 規則作用範圍

本目錄的規則**僅在**以下情況啟用：
- 處理 `story-vocab/` 目錄下的文件
- 通過 globs 模式匹配到相關文件路徑
- 手動使用 `@ruleName` 引用

**不會影響**其他子項目（如 wanwuxiaoyao、cilong 等）

## 📐 設計原則

### 1. 補充而非替代
- 不重複平台級規則內容
- 專注於 story-vocab 特定的實現細節
- 與平台級規則保持一致性

### 2. 具體且可執行
- 提供完整的命令範例
- 包含常見錯誤排查
- 引用具體的文檔路徑

### 3. 限定作用範圍
- 使用 globs 限定在 story-vocab 路徑
- `alwaysApply: false` 避免全局啟用
- 明確說明觸發條件

## 🛠️ 添加新規則

當需要為 story-vocab 添加新規則時：

### 1. 確定是否真的需要
問自己：
- 這是 story-vocab **專屬**的規則嗎？
- 還是應該放在平台級規則中？
- 是否已經在其他規則中涵蓋？

### 2. 創建規則文件
```bash
cd story-vocab/.cursor/rules
# 創建新的 .mdc 文件
```

### 3. 設置正確的 globs
確保路徑限定在 story-vocab：
```yaml
globs: ["story-vocab/**/*.ts", "story-vocab/docs/**"]
```

### 4. 參考現有規則
參考 `@how-to-create-rules` 和 `@nested-rules-architecture`

## 📊 統計

- **總規則數**：1
- **Auto Attached 規則**：1
- **Manual 規則**：0
- **Always 規則**：0（應該在平台級）

## 🔗 相關資源

- **平台級規則**：[../../.cursor/rules/](../../.cursor/rules/)
- **巢狀規則架構**：`@nested-rules-architecture`
- **創建規則指南**：`@how-to-create-rules`
- **Story-Vocab 文檔**：[../docs/README.md](../docs/README.md)

---

**維護**：Story-Vocab 開發團隊  
**最後更新**：2025-10-11

