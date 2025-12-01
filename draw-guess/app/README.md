# 你畫我猜 - Vue 應用

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 啟動開發服務器

```bash
npm run dev
```

開發服務器將在 `http://localhost:5174` 運行。

### 構建生產版本

```bash
npm run build
```

構建後的文件將輸出到 `../assets/` 目錄。

## 📦 已安裝的依賴

### 核心框架
- Vue 3 (`^3.5.24`)
- Pinia (`^3.0.4`) - 狀態管理
- Vue Router (`^4.6.3`) - 路由管理
- TypeScript (`^5.9.3`) - 類型安全
- Vite (`^7.2.4`) - 構建工具

### UI 和工具
- @headlessui/vue (`^1.7.23`) - 無樣式組件
- @heroicons/vue (`^2.2.0`) - 圖標庫
- @vueuse/core (`^14.1.0`) - Vue 工具庫
- Tailwind CSS (`^4.1.17`) - 樣式框架

### 後端服務
- @supabase/supabase-js (`^2.86.0`) - Supabase 客戶端

### 表單驗證
- zod (`^3.25.76`) - 驗證庫
- @vee-validate/zod (`^4.15.1`) - Vue 表單驗證

## 📁 項目結構

```
app/
├── src/
│   ├── components/      # Vue 組件
│   ├── views/           # 頁面組件
│   ├── stores/          # Pinia 狀態管理
│   ├── composables/     # 可復用邏輯
│   ├── router/          # Vue Router
│   ├── lib/             # 核心類庫
│   │   └── supabase.ts  # Supabase 客戶端
│   ├── assets/          # 資源文件
│   ├── App.vue          # 根組件
│   ├── main.ts          # 應用入口
│   └── style.css        # 全局樣式（Tailwind）
├── public/              # 靜態資源
├── vite.config.ts       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
└── package.json         # 依賴管理
```

## ⚙️ 配置

### Supabase 配置

1. 複製 `.env.example` 為 `.env`
2. 填入你的 Supabase 項目 URL 和 Anon Key：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Vite 配置

- 構建輸出：`../assets/`（用於 GitHub Pages）
- 開發端口：`5174`（5173 被句豆使用）
- 路徑別名：`@` 指向 `src/`

### Tailwind 配置

- 已配置極簡設計配色方案
- 自定義顏色：`bg-primary`, `text-primary`, `border-light` 等
- 自定義工具類：`btn-minimal`, `input-minimal`, `card-minimal`

## 🎨 設計系統

### 配色方案

- **背景**：`#FAFAFA` (bg-primary)
- **文字**：`#333333` (text-primary)
- **邊框**：`#E0E0E0` (border-light)
- **強調**：`#666666` (accent)

### 組件樣式

- **按鈕**：`.btn-minimal` - 極簡設計，細邊框
- **輸入框**：`.input-minimal` - 細線條邊框，低調焦點效果
- **卡片**：`.card-minimal` - 極簡設計，細邊框

## 📝 開發說明

### 添加新頁面

1. 在 `src/views/` 創建 Vue 組件
2. 在 `src/router/index.ts` 添加路由

### 添加新組件

在 `src/components/` 創建 Vue 組件

### 添加狀態管理

在 `src/stores/` 創建 Pinia store

### 添加可復用邏輯

在 `src/composables/` 創建 Composables

## 🔗 相關文檔

- [開發計劃](../docs/DEVELOPMENT_PLAN.md)
- [Vue 生態系統推薦](../docs/VUE_ECOSYSTEM.md)
- [OpenSpec 規範](../openspec/project.md)
