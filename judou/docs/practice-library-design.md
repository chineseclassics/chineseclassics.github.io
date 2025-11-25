# Practice Library Design (三级分類規劃)

## 1. Supabase Schema（草案）

### 1.1 practice_categories
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid (PK) | 自動產生 |
| `name` | text | 顯示名稱（例：七年級、戰國文章） |
| `slug` | text | URL / key 用，唯一索引 |
| `parent_id` | uuid, nullable | 指向上一層分類，`null` 代表根節點 |
| `level` | smallint | 快速判斷第幾層（1/2/3…) |
| `type` | text | 可填 `grade` / `module` / `theme` 等，供 UI 標示 |
| `description` | text | 說明文字、學習提示 |
| `order_index` | int | 手動排序 |
| `created_at` / `updated_at` | timestamptz | 系統欄位 |

索引：`(parent_id, order_index)`, `slug unique`

### 1.2 practice_texts
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid (PK) | 自動產生 |
| `title` | text | 作品名 |
| `author` | text | 作者（可用 `Unknown`） |
| `source` | text | 出處，如《古文觀止》 |
| `category_id` | uuid FK | 關聯到第三層或任何節點 |
| `difficulty` | smallint | 1=初級, 2=中級, 3=高級 |
| `word_count` | int | 自動計算或手填 |
| `content` | text | 含 `|` 的處理後文本 |
| `raw_content` | text | （選填）原文備存 |
| `keywords` | text[] | 用於搜尋 |
| `created_at` / `updated_at` | timestamptz | 系統欄位 |

索引：`category_id`, `difficulty`, `to_tsvector(title || author || keywords)`

### 1.3 TypeScript 型別（共用）
```ts
export interface PracticeCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  level: number
  type: 'grade' | 'module' | 'theme' | 'custom'
  description: string | null
  order_index: number
}

export interface PracticeTextMeta {
  id: string
  title: string
  author: string | null
  source: string | null
  category_id: string
  difficulty: 1 | 2 | 3
  word_count: number | null
  keywords: string[]
  created_at: string
}
```

## 2. Pinia Store：`usePracticeLibraryStore`

### 2.1 State
- `categories: PracticeCategory[]`
- `texts: PracticeTextMeta[]`
- `tree: Record<string, PracticeCategory[]>`（parent_id => children）
- `leafTexts: Record<string, PracticeTextMeta[]>`（category_id => texts）
- `selectedGradeId`, `selectedModuleId`, `selectedTextId`
- `recentSelections: string[]`（text ids）
- `status: 'idle' | 'loading' | 'error'`

### 2.2 Actions
1. `fetchCategories()` / `fetchTexts()`：以 Supabase RPC or Rest 拉資料，可支援 cache。
2. `buildTree()`：整理成 parent-child map，計算 level。
3. `getChildren(parentId)`：回傳子節點（依 order 排）。
4. `getBreadcrumb(categoryId)`：回朔至 root，供 UI 顯示路徑。
5. `filterTexts({ keyword, difficulty, categoryId })`：提供搜尋與篩選。
6. `selectCategory(level, id)`：更新 selected 狀態並自動重置下層。
7. `selectText(id)`：寫入 `selectedTextId`、更新 `recentSelections`，並可同步到 `useTextsStore`.

### 2.3 Getters
- `rootCategories`：level = 1。
- `modulesByGrade`：根據 `selectedGradeId` 回傳第二層。
- `textsByModule`：`selectedModuleId` 對應的作品列表。
- `selectedTextDetail`：組合分類 breadcrumb + text meta。

## 3. PracticePicker UI/流程

### 3.1 入口與互動
- **主入口**：`PracticePage` Hero 區塊增加「選擇練習素材」按鈕，開啟全螢幕（或右側 Drawer）挑選器。
- **側邊欄快捷**：保留「自選練習」鋼筆圖示，點擊時導向 `PracticePage` 並自動開啟挑選器，維持簡潔。
- **URL 同步**：可使用 query（`?category=...&text=...`）或 store state，方便分享與重新整理。

### 3.2 Layout 建議
```
┌───────────┬────────────┬────────────────┐
│ 第 1 層   │ 第 2 層     │ 第 3 層（作品） │
│ 年級/系列 │ 單元/主題   │ 作品列表 + 作者 │
└───────────┴────────────┴────────────────┘
```
- 第 1/2 層以 list/card 呈現，可支援描述、進度計數（如 12 篇）。
- 第 3 層提供排序（最新 / 難度）與搜尋列，點作品顯示右側詳細資訊（字數、作者、難度、預覽節錄）。
- Mobile：改為階段式（Step wizard），利用 `Bottom Sheet` 逐層挑選。

### 3.3 選擇與回饋
- 選到作品後顯示「開始練習」按鈕，帶出 PracticePage 主區換文案並自動載入 `useTextsStore`.
- 可提供「收藏」按鈕／「最近使用」區塊，加速常用素材。

## 4. Admin Texts / 分類管理

### 4.1 新增分類管理
- 在 `judou-vue/app/src/pages/AdminTextsPage.vue` 加入「分類管理」面板：
  - 列出階層樹、提供拖曳排序或上下移動。
  - Modal 表單：名稱、父層、type、描述、slug。
  - 刪除時需檢查是否仍有子節點或作品，提供提示。

### 4.2 文章表單欄位調整
- 新增 `作者 (author)`、`出處 (source)` 欄位。
- `category_id` 使用樹狀選擇器（3 層下拉）。
- 儲存時自動計算 `word_count` 與 difficulty（可沿用現有估算函式，或手動覆寫）。
- 顯示 `用於挑選器的分類路徑`，方便檢查。

### 4.3 API / Store 影響
- 目前 `useTextsStore` 以 `texts` 表為主；需新增 `fetchCategories` or 共用 `usePracticeLibraryStore`.
- Admin CRUD 完成後，可透過 Supabase Trigger/Function 自動更新 `updated_at`、維持排序。

## 5. 後續實作順序建議
1. **資料層**：建表 / migration、填充範例資料、建立 Supabase RLS（匿名可讀、Admin 可寫）。
2. **Pinia Store**：`usePracticeLibraryStore` + 假資料單元測試。
3. **UI**：PracticePicker component + modal/drawer + mobile 版；PracticePage 接 store。
4. **Admin**：新增分類管理 + 表單欄位；與 Supabase API 串接。
5. **增強**：收藏、最近使用、搜尋/標籤、任務化（保留擴充空間）。

---

這份設計先定義資料與狀態結構，下階段即可開始撰寫 migration / store / UI。若需先實作其中一部分（例如只完成資料層或草模 UI），再告訴我即可。

