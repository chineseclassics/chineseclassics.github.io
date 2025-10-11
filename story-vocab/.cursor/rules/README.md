# Story-Vocab 專案規則

> 本目錄包含詞遊記專屬的 Cursor Rules

---

## 📋 規則列表

### Auto Attached Rules（自動附加）

| 規則文件 | 描述 | 觸發條件 |
|---------|------|---------|
| `auth.mdc` | 雙模式認證架構規範 | `js/auth/**`, `js/app.js`, `docs/AUTH*.md` |
| `supabase-deployment.mdc` | Supabase 部署規範 | `supabase/**`, `docs/*Deploy*.md` |

---

## 🏗️ 規則繼承關係

當處理 story-vocab 的文件時，會啟用以下規則：

### 平台級規則（來自根目錄）
1. ✅ `language.mdc` - 語言規範（Always）
2. ✅ `file-organization.mdc` - 文件組織（Always）
3. ✅ `coding-standards.mdc` - 代碼規範（Always）
4. ✅ `dual-mode-architecture.mdc` - 雙模式架構原則（通用）
5. ✅ `supabase-architecture.mdc` - Supabase 通用原則（Auto）

### 子項目規則（本目錄）
6. ✅ `auth.mdc` - 詞遊記認證架構（Auto）
7. ✅ `supabase-deployment.mdc` - 詞遊記 Supabase 部署（Auto）

---

## 🎯 規則組織原則

### 什麼應該放在這裡？

**✅ 應該包含**：
- 詞遊記專屬的設計原則
- 認證系統實現細節
- Supabase 具體部署步驟
- AI Agent 提示詞規範
- 詞彙推薦算法細節

**❌ 不應該包含**：
- 通用的語言規範（已在平台級）
- 通用的文件組織（已在平台級）
- 太虛幻境整體架構（應在根目錄）

### globs 路徑注意事項

在子項目規則中，globs 應相對於 **story-vocab/** 根目錄：

```yaml
# ✅ 正確（相對於 story-vocab/）
globs:
  - js/auth/**
  - supabase/**
  - docs/AUTH*.md

# ❌ 錯誤（包含子項目前綴會導致不匹配）
globs:
  - story-vocab/js/auth/**
```

---

## 📚 相關文檔

- [巢狀規則架構指南](@nested-rules-architecture) - 平台級規範
- [如何創建規則](@how-to-create-rules) - Meta Rule
- [Story-Vocab 文檔中心](../docs/README.md)

---

## 🔄 更新記錄

- **2025-10-11**：創建子項目規則目錄
  - 添加 `auth.mdc` - 認證架構規範
  - 添加 `supabase-deployment.mdc` - 部署規範
  - 從根目錄移動專屬規則到子項目

---

**維護**：Story-Vocab 開發團隊  
**最後更新**：2025-10-11
