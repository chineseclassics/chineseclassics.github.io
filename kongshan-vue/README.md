# 空山 Vue 重構版

這是空山應用的 Vue 3 重構版本，採用現代化的前端開發架構。**在視覺和功能上與原版完全一致**，同時提供了更好的代碼結構和開發體驗。

## 技術棧

- **Vue 3** - 漸進式 JavaScript 框架
- **Vite** - 下一代前端構建工具（極速熱更新）
- **Vue Router** - 官方路由管理器
- **Pinia** - 官方狀態管理庫
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Supabase** - 開源 Firebase 替代方案

## 開發環境設置

### 安裝依賴

```bash
npm install
```

### 啟動開發服務器

```bash
npm run dev
```

開發服務器將在 `http://localhost:3000` 運行，支持熱模塊替換（HMR）。

### 構建生產版本

```bash
npm run build
```

構建後的文件將輸出到 `dist/` 目錄。

### 預覽生產構建

```bash
npm run preview
```

## 項目結構

```
kongshan-vue/
├── public/              # 靜態資源（不經過編譯）
│   └── assets/         # 從原 kongshan 遷移的音效、圖片等
├── src/
│   ├── assets/         # 需要編譯的資源
│   ├── components/     # Vue 組件
│   ├── views/          # 頁面級組件
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 狀態管理
│   ├── App.vue         # 根組件
│   ├── main.js         # 入口文件
│   └── style.css       # 全局樣式（Tailwind）
├── index.html          # HTML 入口
├── vite.config.js      # Vite 配置
├── tailwind.config.js  # Tailwind CSS 配置
└── package.json        # 依賴管理
```

## 開發說明

### 與原版空山的關係

- **獨立開發**：`kongshan-vue/` 是完全獨立的項目，不會影響原版 `kongshan/`
- **資源共享**：音效、圖片等資源已從原版複製到 `public/assets/`
- **漸進遷移**：可以逐步將原版功能遷移到 Vue 版本

### ✅ 已完成功能

### 核心頁面
- ✅ 登入頁面（Google OAuth）
- ✅ 詩歌列表頁（搜索、智能排序）
- ✅ 詩歌詳情頁（豎排版、呼吸動畫）

### 核心功能
- ✅ Supabase 認證集成
- ✅ 音頻引擎（AudioEngine + SoundMixer）
- ✅ Canvas 背景渲染（BackgroundRenderer）
- ✅ 聲色意境管理（加載、切換、點讚）
- ✅ 音效和背景自動應用

### 視覺系統
- ✅ 原版樣式 100% 遷移（苔痕松影配色）
- ✅ 毛玻璃效果
- ✅ 呼吸動畫
- ✅ 所有 CSS 類名對齊

## ⏸️ 待開發功能

- ⏸️ 聲色意境編輯器（大功能）
- ⏸️ 管理後台（音效審核、詩句管理等）
- ⏸️ 用戶面板（通知系統）

## 部署

構建後可以部署到 GitHub Pages 或任何靜態網站託管服務。

---

**原版空山**：`/kongshan/`  
**Vue 重構版**：`/kongshan-vue/`

