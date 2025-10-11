# 📂 Story-Vocab 文件組織規範

> **創建日期**: 2025-10-11  
> **目的**: 確保文件結構清晰，符合太虛幻境架構原則

---

## 🎯 核心原則

Story-Vocab 作為太虛幻境的典範子項目，採用完全自包含的文件組織結構。

### 原則 1: 完全自包含

所有文件、文檔、工具都應該在 `story-vocab/` 目錄內，不依賴太虛幻境根目錄的資源（除 CDN）。

### 原則 2: 文檔集中管理

所有 `.md` 文檔（除 README.md）都必須放在 `docs/` 文件夾內，保持項目根目錄的簡潔。

### 原則 3: 工具腳本在根目錄

可執行的工具腳本（`.sh`）放在項目根目錄，方便直接運行。

---

## 📁 標準文件結構

```
story-vocab/
├── README.md                    ✅ 項目說明（唯一允許在根目錄的文檔）
├── index.html                   ✅ 應用入口
├── start-server.sh             ✅ 開發服務器腳本
├── supabase-utils.sh           ✅ Supabase 管理工具
├── query-table-structure.sh    ✅ 數據庫查詢工具
│
├── js/                         ✅ JavaScript 代碼
│   ├── app.js
│   ├── config.js
│   ├── core/
│   ├── features/
│   ├── ui/
│   └── utils/
│
├── css/                        ✅ 樣式文件
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── responsive.css
│   ├── screens.css
│   └── variables.css
│
├── data/                       ✅ 數據文件
│   └── calibration-vocabulary.json
│
├── admin/                      ✅ 管理後台
│   ├── index.html
│   └── ...
│
├── supabase/                   ✅ Supabase 相關
│   ├── functions/
│   │   ├── story-agent/
│   │   ├── vocab-recommender/
│   │   └── vocab-difficulty-evaluator/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── ...
│
└── docs/                       ✅ 所有詳細文檔（18個）
    ├── README.md               # 文檔索引
    │
    ├── DESIGN.md               # 設計文檔
    │
    ├── DEPLOYMENT.md           # 部署指南
    ├── DEPLOYMENT_CHECKLIST.md
    ├── DEPLOYMENT_COMPLETE.md
    ├── EDGE_FUNCTION_DEPLOY.md
    │
    ├── DATABASE_MIGRATION_EXPLAINED.md
    ├── WORDLIST_DEPLOYMENT_GUIDE.md
    ├── WORDLIST_SYSTEM_IMPLEMENTATION.md
    ├── WORDLIST_SYSTEM_SUMMARY.md
    ├── CALIBRATION_VOCABULARY_UPDATE.md
    │
    ├── SUPABASE_CLI_GUIDE.md
    ├── SUPABASE_CLI_REFERENCE.md
    ├── SUPABASE_QUICK_REFERENCE.md
    │
    ├── SECURITY_CHECKLIST.md
    ├── FINAL_TEST_GUIDE.md
    │
    ├── IMPLEMENTATION_SUMMARY.md
    ├── SETTINGS_REFACTOR_SUMMARY.md
    │
    └── FILE_ORGANIZATION_RULES.md  # 本文件
```

---

## 🚫 常見錯誤

### ❌ 錯誤 1: 在根目錄堆積文檔

```
story-vocab/
├── README.md
├── DEPLOYMENT.md              ❌ 應該在 docs/
├── DESIGN.md                  ❌ 應該在 docs/
├── SOME_SUMMARY.md            ❌ 應該在 docs/
└── ...
```

**正確做法**: 所有詳細文檔都應該在 `docs/` 內。

---

### ❌ 錯誤 2: 將子項目文件放在太虛幻境根目錄

```
/chineseclassics.github.io/
├── supabase-utils.sh          ❌ 應該在 story-vocab/
├── SUPABASE_CLI_GUIDE.md      ❌ 應該在 story-vocab/docs/
└── story-vocab/
```

**正確做法**: 子項目的所有文件都應該在子項目目錄內。

---

### ❌ 錯誤 3: Git commit 消息保存為文檔

```
story-vocab/
├── GIT_COMMIT_MESSAGE.md      ❌ 不需要保存
├── GIT_COMMIT_MESSAGE.txt     ❌ 不需要保存
```

**正確做法**: Git commit 消息不需要保存為文件，直接提交即可。

---

## ✅ 文件放置決策樹

當創建新文件時，按照以下決策流程：

```
新文件
  │
  ├─ 是代碼文件？
  │   ├─ JavaScript → js/
  │   ├─ CSS → css/
  │   └─ HTML → 根目錄（如果是頁面）或 admin/（如果是管理頁面）
  │
  ├─ 是數據文件？
  │   └─ JSON/CSV → data/
  │
  ├─ 是文檔文件？
  │   ├─ 項目說明 → README.md（根目錄）
  │   └─ 其他所有文檔 → docs/
  │
  ├─ 是工具腳本？
  │   └─ .sh 文件 → 根目錄
  │
  ├─ 是 Supabase 相關？
  │   ├─ Edge Functions → supabase/functions/
  │   └─ Migrations → supabase/migrations/
  │
  └─ 是管理工具？
      └─ admin/
```

---

## 📝 文檔命名規範

### 文檔類型前綴

- `DESIGN_` - 設計相關文檔
- `DEPLOYMENT_` - 部署相關文檔
- `IMPLEMENTATION_` - 實現相關文檔
- `SECURITY_` - 安全相關文檔
- 無前綴 - 通用文檔（如 README.md）

### 命名風格

- 使用大寫字母和下劃線：`DEPLOYMENT_GUIDE.md`
- 使用描述性名稱：`SUPABASE_CLI_REFERENCE.md`（而非 `CLI_REF.md`）
- 避免縮寫：`IMPLEMENTATION_SUMMARY.md`（而非 `IMPL_SUM.md`）

---

## 🔄 文件整理檢查清單

當進行文件整理時，按照以下步驟檢查：

### 1. 檢查根目錄

```bash
cd story-vocab
ls -1 *.md *.sh
```

**應該只看到**：
- ✅ `README.md`
- ✅ `start-server.sh`
- ✅ `supabase-utils.sh`
- ✅ `query-table-structure.sh`

### 2. 檢查 docs/ 目錄

```bash
ls -1 docs/*.md | wc -l
```

**應該看到**: 18 個文檔

### 3. 檢查太虛幻境根目錄

```bash
cd ..
ls -1 *.sh | grep -v node_modules
```

**不應該看到**: 任何 story-vocab 相關的腳本

---

## 🎯 與太虛幻境架構的關係

Story-Vocab 的文件組織遵循 [TAIXU_ARCHITECTURE.md](../../TAIXU_ARCHITECTURE.md) 中定義的原則：

1. **應用獨立性**: 所有依賴資源都在應用文件夾內
2. **自包含結構**: 可以直接打包整個文件夾分發
3. **典範應用**: 作為其他應用重構的參考模板

---

## 📊 整理歷史

### 2025-10-11: 大規模文件整理

**問題**:
- Supabase CLI 文檔和腳本被錯誤放在太虛幻境根目錄
- story-vocab 根目錄堆積了 8 個文檔文件
- 文檔結構混亂，違反架構原則

**解決方案**:
1. 移動 5 個文件從根目錄到 story-vocab/
2. 移動 6 個文件從 story-vocab/ 到 story-vocab/docs/
3. 刪除 2 個冗餘文件
4. 更新 README.md 和 docs/README.md 中的鏈接
5. 創建本規範文檔

**結果**:
- ✅ 根目錄清理完畢
- ✅ story-vocab 結構規範
- ✅ 文檔索引更新
- ✅ 規範文檔建立

---

## 🔮 未來維護

### 創建新文檔時

1. **立即放在正確位置**: 不要先創建在根目錄再移動
2. **更新文檔索引**: 在 `docs/README.md` 中添加新文檔的鏈接
3. **檢查命名規範**: 確保文件名符合規範
4. **避免重複**: 檢查是否已有類似文檔

### 定期檢查

每月進行一次文件結構檢查：
```bash
cd story-vocab
./docs/FILE_ORGANIZATION_RULES.md  # 查看本規範
ls -1 *.md | grep -v README.md     # 應該為空
```

---

## 📖 相關文檔

- [太虛幻境架構指南](../../TAIXU_ARCHITECTURE.md)
- [Story-Vocab 主 README](../README.md)
- [文檔索引](./README.md)

---

**維護者**: Story-Vocab 開發團隊  
**最後更新**: 2025-10-11

