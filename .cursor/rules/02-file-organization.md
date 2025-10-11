# 文件組織規範

## 核心原則
1. **兩層結構**：太虛幻境根目錄（平台級）+ 子項目目錄（應用級）
2. **完全自包含**：每個子項目是獨立單元，所有資源都在內部
3. **文檔集中**：所有詳細文檔必須在子項目的 `docs/` 文件夾內
4. **根目錄簡潔**：子項目根目錄只放 README.md、index.html 和工具腳本

## 太虛幻境根目錄（只放平台級內容）
```
/chineseclassics.github.io/
├── index.html                    # 平台入口
├── TAIXU_ARCHITECTURE.md         # 平台架構文檔
├── README.md                     # 平台說明
├── .cursorrules                  # 本文件
├── supabase/config.toml          # Supabase CLI 配置
├── package.json                  # 平台級配置
├── 各個獨立應用.html              # 未重構的舊應用
└── story-vocab/                  # 新結構子項目
```

**禁止在根目錄放置**：
- ❌ 子項目專屬的文檔
- ❌ 子項目專屬的工具腳本
- ❌ 子項目專屬的資源文件

## 子項目標準結構（以 story-vocab 為典範）
```
story-vocab/
├── README.md                     # 項目說明（快速開始）
├── index.html                    # 應用入口
├── *.sh                         # 工具腳本（可執行）
├── js/                          # JavaScript 代碼
├── css/                         # 樣式文件
├── data/                        # 數據文件
├── assets/                      # 資源文件（字體、圖片、音頻）
├── admin/                       # 管理工具
├── supabase/                    # Edge Functions & Migrations
└── docs/                        # 所有詳細文檔
    ├── README.md                # 文檔索引
    ├── DESIGN.md                # 設計文檔
    ├── DEPLOYMENT*.md           # 部署相關
    └── ...其他所有 .md 文檔
```

## 文件放置決策
創建新文件時問自己：
1. 這是哪個項目的文件？
2. 這是什麼類型？（代碼/文檔/腳本/數據）
3. 如果是文檔，是項目說明（README.md）還是詳細文檔（docs/）？

**黃金規則**：
- 📄 除了 README.md，所有 .md 文檔都放在 `docs/` 內
- 🔧 工具腳本放在項目根目錄（方便執行）
- 🚫 絕不在太虛幻境根目錄放子項目的文件

