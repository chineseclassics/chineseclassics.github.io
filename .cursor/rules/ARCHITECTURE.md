# 太虛幻境 Cursor Rules 架構總覽

> 兩層項目架構的規則系統設計

## 🏗️ 完整架構圖

```
chineseclassics.github.io/                    [太虛幻境平台]
│
├── .cursor/rules/                            [🌏 平台級規則 - 所有子項目共享]
│   ├── README.md                            # 規則索引
│   ├── ARCHITECTURE.md                      # 本文件
│   │
│   ├── language.mdc                         # ✅ Always
│   ├── file-organization.mdc                # ✅ Always  
│   ├── coding-standards.mdc                 # ✅ Always
│   │
│   ├── supabase-architecture.mdc            # 🔄 Auto (platform-level)
│   │
│   ├── git-workflow.mdc                     # 📖 Manual
│   ├── how-to-create-rules.mdc              # 📖 Manual (Meta)
│   └── nested-rules-architecture.mdc        # 📖 Manual (Meta)
│
├── AGENTS.md                                 # 簡化的 Agent 指令
├── .cursorrules                              # ⚠️ 舊版（已淘汰）
│
├── story-vocab/                              [📚 詞游記子項目]
│   ├── .cursor/rules/                        [子項目專屬規則]
│   │   ├── README.md
│   │   └── supabase-deployment.mdc          # 🔄 Auto (story-vocab 專屬)
│   └── ...
│
├── wanwuxiaoyao/                             [🎮 莊子遊戲子項目]
│   ├── .cursor/rules/                        [未來：子項目專屬規則]
│   │   ├── game-mechanics.mdc               # 遊戲機制規範
│   │   └── scene-structure.mdc              # 場景結構規範
│   └── ...
│
└── cilong/                                   [🐉 字龍子項目]
    ├── .cursor/rules/                        [未來：子項目專屬規則]
    │   └── character-animation.mdc          # 字符動畫規範
    └── ...
```

## 📐 規則繼承邏輯

### 在 story-vocab 工作時

```
啟用的規則：
┌─────────────────────────────────────────┐
│  平台級 Always 規則                      │
│  ✅ language.mdc                        │
│  ✅ file-organization.mdc               │
│  ✅ coding-standards.mdc                │
└─────────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────────┐
│  平台級 Auto 規則（匹配路徑時）          │
│  🔄 supabase-architecture.mdc           │
│     (當處理 **/supabase/** 文件時)       │
└─────────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────────┐
│  Story-Vocab 專屬 Auto 規則             │
│  🔄 supabase-deployment.mdc             │
│     (當處理 story-vocab/supabase/** 時)  │
└─────────────────────────────────────────┘
```

### 在 wanwuxiaoyao 工作時

```
啟用的規則：
┌─────────────────────────────────────────┐
│  平台級 Always 規則                      │
│  ✅ language.mdc                        │
│  ✅ file-organization.mdc               │
│  ✅ coding-standards.mdc                │
└─────────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────────┐
│  WanWuXiaoYao 專屬規則（未來）          │
│  🔄 game-mechanics.mdc                  │
│  🔄 scene-structure.mdc                 │
└─────────────────────────────────────────┘

❌ Story-Vocab 的規則不會啟用
```

## 🎯 規則類型說明

### ✅ Always（一律套用）
- **作用範圍**：整個項目（包括所有子項目）
- **適用於**：核心規範、架構原則
- **範例**：語言規範、文件組織

### 🔄 Auto Attached（自動附加）
- **作用範圍**：匹配 globs 路徑時自動啟用
- **適用於**：特定技術棧、文件類型
- **範例**：Supabase 部署規則

### 📖 Manual（手動引用）
- **作用範圍**：使用 `@ruleName` 時才啟用
- **適用於**：特殊工作流程、Meta 規則
- **範例**：Git 工作流程、創建規則指南

## 📊 當前統計

### 平台級規則（根目錄）
```
總計：7 個規則

Always 規則（3）：
├── language.mdc              # 語言規範
├── file-organization.mdc     # 文件組織
└── coding-standards.mdc      # 代碼規範

Auto Attached 規則（1）：
└── supabase-architecture.mdc # Supabase 架構

Manual 規則（3）：
├── git-workflow.mdc          # Git 工作流程
├── how-to-create-rules.mdc   # 創建規則指南 (Meta)
└── nested-rules-architecture.mdc # 巢狀規則架構 (Meta)
```

### 子項目規則

```
Story-Vocab（1 個規則）：
└── supabase-deployment.mdc   # Supabase 部署（Auto）

WanWuXiaoYao（待創建）：
└── [未來規則]

Cilong（待創建）：
└── [未來規則]
```

## 🚀 使用場景示例

### 場景 1：創建新的子項目規則

```bash
# 1. 創建規則目錄
cd wanwuxiaoyao
mkdir -p .cursor/rules

# 2. 參考架構指南
# 在對話中使用：@nested-rules-architecture

# 3. 創建規則文件
# 創建 .mdc 格式文件，參考 @how-to-create-rules
```

### 場景 2：部署 Story-Vocab

```bash
# 相關規則自動啟用：
# ✅ language.mdc (Always)
# ✅ file-organization.mdc (Always)
# 🔄 supabase-architecture.mdc (Auto - 匹配 supabase/)
# 🔄 story-vocab/.cursor/rules/supabase-deployment.mdc (Auto)

cd story-vocab
supabase functions deploy vocab-recommender
```

### 場景 3：手動引用 Git 工作流程

```
在對話中：
@git-workflow 請幫我創建一個 feature 分支
```

## 🎓 最佳實踐總結

### ✅ 應該做的

1. **平台級規則保持通用**
   - 只包含所有子項目都需要的規則
   - 專注於架構原則和標準

2. **子項目規則應該具體**
   - 包含項目特定的實現細節
   - 提供具體的代碼範例

3. **使用正確的 globs**
   - 子項目規則限定路徑：`story-vocab/**`
   - 避免過於寬泛的匹配

4. **規則互補不衝突**
   - 子項目規則是補充而非替代
   - 保持與平台級規則一致

### ❌ 不應該做的

1. **不要重複平台級規則**
   - 已經在平台級定義的不要重複

2. **不要在平台級包含子項目細節**
   - 子項目專屬內容應該在子項目規則中

3. **不要使用衝突的設定**
   - 確保規則之間不會產生矛盾

## 📚 相關文檔

### 必讀文檔
- [Cursor Rules 官方文檔](https://cursor.com/zh-Hant/docs/context/rules)
- [巢狀規則架構](@nested-rules-architecture)
- [如何創建規則](@how-to-create-rules)

### 太虛幻境文檔
- [太虛幻境架構文檔](../../TAIXU_ARCHITECTURE.md)
- [AGENTS.md](../../AGENTS.md)
- [Story-Vocab 規則](../../story-vocab/.cursor/rules/README.md)

## 🔄 更新記錄

### 2025-10-11
- ✅ 創建 MDC 格式的專案規則系統
- ✅ 從 `.cursorrules` 遷移到 `.cursor/rules/`
- ✅ 創建 7 個平台級規則（含 2 個 meta-rule）
- ✅ 添加 `AGENTS.md` 作為簡化替代方案
- ✅ 為 story-vocab 創建巢狀規則示例
- ✅ 建立兩層規則架構體系

---

**維護**：太虛幻境開發團隊  
**最後更新**：2025-10-11

