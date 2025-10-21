# 🛠️ Alice in Birthdayland - 開發指南

## 📋 目錄

- [開發環境設置](#開發環境設置)
- [項目結構說明](#項目結構說明)
- [開發流程](#開發流程)
- [代碼規範](#代碼規範)
- [部署指南](#部署指南)

## 🚀 開發環境設置

### 必需工具

- 現代瀏覽器（Chrome、Firefox、Safari、Edge）
- 文本編輯器（VS Code、Cursor 等）
- 本地 HTTP 服務器

### 啟動開發服務器

```bash
# 方法 1：使用 Python
python3 -m http.server 8000

# 方法 2：使用 Node.js
npx http-server -p 8000

# 方法 3：使用 VS Code Live Server 插件
# 右鍵點擊 index.html -> "Open with Live Server"
```

然後訪問：`http://localhost:8000/alice-in-birthdayland/`

## 📁 項目結構說明

### 核心文件

```
alice-in-birthdayland/
├── index.html              # 應用主入口
│   └── 包含：HTML 結構、CDN 引用、腳本加載
│
├── README.md               # 項目說明文件
│   └── 包含：簡介、功能、快速開始
│
└── docs/                   # 詳細文檔目錄
    └── DEVELOPMENT.md      # 本開發指南
```

### JavaScript 模組

```
js/
├── core/                   # 核心功能
│   └── app.js             # 主應用邏輯、狀態管理、初始化
│
├── features/              # 功能模組（待開發）
│   ├── games.js          # 遊戲邏輯
│   ├── music.js          # 音樂播放器
│   └── gallery.js        # 照片畫廊
│
├── ui/                    # UI 組件（待開發）
│   ├── modal.js          # 模態框組件
│   ├── card.js           # 卡片組件
│   └── animation.js      # 動畫效果
│
└── utils/                 # 工具函數（待開發）
    ├── helpers.js        # 通用輔助函數
    └── storage.js        # 本地存儲管理
```

### 樣式文件

```
css/
├── variables.css          # CSS 變量定義
│   └── 包含：顏色、間距、字體、動畫時間等
│
├── base.css              # 基礎樣式
│   └── 包含：全局重置、基本元素樣式
│
├── components.css        # 組件樣式
│   └── 包含：按鈕、卡片、動畫等
│
└── layout.css            # 佈局樣式
    └── 包含：容器、網格、響應式斷點
```

### 資源文件

```
assets/
├── fonts/                # 字體文件
│   └── 自定義字體（如需要）
│
├── audio/                # 音頻文件
│   ├── bgm/             # 背景音樂
│   └── sfx/             # 音效
│
├── images/               # 圖片資源
│   ├── backgrounds/     # 背景圖
│   ├── icons/          # 圖標
│   └── photos/         # 照片
│
└── data/                 # 數據文件
    └── *.json           # JSON 數據
```

## 🔧 開發流程

### 1. 添加新功能

**步驟**：

1. 在 `js/features/` 創建新模組文件
2. 實現功能邏輯
3. 在 `js/core/app.js` 中引入並初始化
4. 添加相應的 CSS 樣式
5. 測試功能

**示例**：添加一個簡單遊戲

```javascript
// js/features/simple-game.js
export class SimpleGame {
    constructor() {
        this.score = 0;
    }
    
    init() {
        console.log('遊戲初始化');
        this.render();
    }
    
    render() {
        // 渲染遊戲界面
    }
}

// 在 app.js 中引入
import { SimpleGame } from '../features/simple-game.js';

function initGameContent() {
    const game = new SimpleGame();
    game.init();
}
```

### 2. 添加音頻

**步驟**：

1. 將音頻文件放入 `assets/audio/`
2. 創建音頻管理模組
3. 實現播放控制

**示例**：

```javascript
// js/features/music.js
export class MusicPlayer {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
    }
    
    async loadMusic(src) {
        this.audio = new Audio(src);
        await this.audio.load();
    }
    
    play() {
        if (this.audio) {
            this.audio.play();
            this.isPlaying = true;
        }
    }
    
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
        }
    }
}
```

### 3. 添加圖片

**步驟**：

1. 優化圖片（建議使用 WebP 格式）
2. 放入 `assets/images/` 對應子目錄
3. 在 HTML 或 JavaScript 中引用

**最佳實踐**：

```html
<!-- 使用相對路徑 -->
<img src="assets/images/photos/birthday-2024.jpg" alt="生日照片">

<!-- 響應式圖片 -->
<img 
    src="assets/images/photo.jpg" 
    srcset="assets/images/photo-small.jpg 640w,
            assets/images/photo-large.jpg 1280w"
    sizes="(max-width: 640px) 100vw, 50vw"
    alt="描述">
```

### 4. 創建動畫效果

使用 CSS 動畫或 JavaScript：

```css
/* CSS 動畫 */
@keyframes custom-animation {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.animated-element {
    animation: custom-animation 2s ease-in-out infinite;
}
```

```javascript
// JavaScript 動畫（使用 GSAP 或原生 API）
element.animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(1.2)', opacity: 0.8 },
    { transform: 'scale(1)', opacity: 1 }
], {
    duration: 1000,
    iterations: Infinity
});
```

## 📝 代碼規範

### JavaScript

- 使用 ES6+ 語法
- 使用 `const` 和 `let`，避免 `var`
- 函數和變量使用駝峰命名法
- 常量使用大寫蛇形命名法
- 添加 JSDoc 註釋

```javascript
/**
 * 計算兩數之和
 * @param {number} a - 第一個數字
 * @param {number} b - 第二個數字
 * @returns {number} 兩數之和
 */
function add(a, b) {
    return a + b;
}
```

### CSS

- 使用 BEM 命名法（可選）
- 優先使用 CSS 變量
- 移動端優先設計
- 避免過深的選擇器嵌套

```css
/* 使用 CSS 變量 */
.button {
    background: var(--color-primary);
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
}

/* BEM 命名 */
.card { }
.card__title { }
.card__body { }
.card--featured { }
```

### HTML

- 語義化標籤
- 合理的標題層級
- 添加 `alt` 屬性到圖片
- 使用 `aria-` 屬性提升無障礙性

## 🌐 部署指南

### 部署到太虛幻境

#### 1. 在主頁註冊應用

編輯 `/index.html`，在 `apps` 數組中添加：

```javascript
{
    id: 'alice-birthday',
    category: 'jinxiu',  // 或其他境地
    name: 'Alice in Birthdayland',
    icon: '🎂',
    gradient: 'from-pink-500 to-purple-600',
    url: '/alice-in-birthdayland/index.html',  // ⭐ 絕對路徑
    description: '專為 Alice 生日設計的奇幻互動體驗'
}
```

#### 2. 在應用切換器註冊

編輯 `/assets/js/taixu-app-switcher.js`，添加相同配置。

#### 3. 測試

- 本地測試：確保所有功能正常
- 推送到 GitHub：`git add .` → `git commit` → `git push`
- GitHub Pages 會自動部署
- 訪問：`https://chineseclassics.github.io/alice-in-birthdayland/`

### 性能優化

1. **圖片優化**：使用 WebP 格式，壓縮大小
2. **延遲加載**：使用 `loading="lazy"` 屬性
3. **代碼分割**：按需載入模組
4. **緩存策略**：使用瀏覽器緩存

## 🐛 調試技巧

### 瀏覽器控制台

```javascript
// 在代碼中添加調試信息
console.log('當前狀態：', AppState);
console.warn('警告信息');
console.error('錯誤信息');
console.table(data);  // 表格形式顯示數據
```

### 斷點調試

在瀏覽器開發者工具的 Sources 面板設置斷點，逐步執行代碼。

### 性能分析

使用瀏覽器的 Performance 面板分析性能瓶頸。

## 📚 參考資源

- [MDN Web Docs](https://developer.mozilla.org/)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Font Awesome 圖標](https://fontawesome.com/icons)
- [太虛幻境應用開發規範](../../.cursor/rules/app-development.mdc)

## 🎯 開發路線圖

### 第一階段（已完成）
- [x] 建立項目結構
- [x] 創建基本框架
- [x] 設計視覺風格

### 第二階段（進行中）
- [ ] 開發互動遊戲
- [ ] 添加音樂播放器
- [ ] 創建照片畫廊
- [ ] 實現生日祝福卡片

### 第三階段（計劃中）
- [ ] 添加彩蛋和驚喜
- [ ] 優化動畫效果
- [ ] 完善響應式設計
- [ ] 性能優化

---

**最後更新**：2025-10-21  
**維護者**：爸爸 ❤️

