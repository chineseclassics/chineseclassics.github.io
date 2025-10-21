# 🎂 Alice in Birthdayland

> 專為張思味（枸杞/Goji）7歲生日設計的魔幻甜品樂園

## 📖 應用簡介

Alice in Birthdayland 是一個充滿驚喜和互動的生日主題應用，將蛋糕、甜品和烹飪元素融入趣味遊戲，為 Alice 的 7 歲生日創造一個獨特的數位冒險體驗。

## 🎯 功能特色

- 🗺️ **Birthdayland 地圖**：2D 插畫風格的魔幻地圖，糖果主題設計
- 🧩 **記憶拼圖屋**：3x3 照片拼圖遊戲，完成後解鎖生日祝福影片
- 🍰 **好味道食品屋**：互動式蛋糕製作遊戲，自定義蛋糕設計
- 🎨 **甜品主題視覺**：基於 Alice 喜愛的蛋糕和甜品設計
- ✨ **粒子動畫效果**：漂浮的星星、愛心和蛋糕
- 📱 **iPad 優化**：專為 iPad 觸摸操作優化
- 👨‍👩‍👧‍👦 **家庭元素**：融入 Alice、Amos（毛豆）和家人的元素

## 🚀 快速開始

### 在太虛幻境中運行

1. 直接訪問：`https://chineseclassics.github.io/alice-in-birthdayland/`
2. 或從太虛幻境主頁點擊應用圖標

### 本地開發

```bash
# 使用簡單的 HTTP 服務器
python3 -m http.server 8000

# 或使用 Node.js 的 http-server
npx http-server -p 8000

# 訪問 http://localhost:8000
```

## 📁 項目結構

```
alice-in-birthdayland/
├── index.html              # 主頁地圖
├── puzzle-house.html       # 記憶拼圖屋遊戲
├── cake-studio.html        # 好味道食品屋遊戲
├── README.md               # 本文件
│
├── js/                     # JavaScript 代碼
│   ├── core/              
│   │   └── app.js         # 核心應用邏輯
│   ├── features/          
│   │   ├── particles-effect.js    # 粒子效果
│   │   ├── map-navigation.js      # 地圖導航
│   │   ├── puzzle-engine.js       # 拼圖引擎
│   │   ├── puzzle-ui.js           # 拼圖 UI
│   │   ├── cake-builder.js        # 蛋糕製作
│   │   └── cake-ui.js             # 蛋糕 UI
│   └── utils/             
│       ├── audio-manager.js       # 音效管理
│       └── timer.js               # 計時器
│
├── css/                    # 樣式文件
│   ├── variables.css       # CSS 變量
│   ├── base.css            # 基礎樣式
│   ├── components.css      # 組件樣式
│   ├── layout.css          # 佈局樣式
│   ├── home.css            # 主頁樣式
│   ├── puzzle-game.css     # 拼圖遊戲樣式
│   ├── cake-game.css       # 蛋糕遊戲樣式
│   └── ipad-optimization.css  # iPad 優化
│
├── assets/                 # 資源文件
│   ├── audio/              # 音頻文件（音效佔位）
│   └── images/             # 圖片資源
│       └── photo-*.jpg     # 拼圖照片 (8 張)
│
└── docs/                   # 詳細文檔
    ├── IPAD_TESTING_GUIDE.md      # iPad 測試指南
    └── DEPLOYMENT_CHECKLIST.md     # 部署檢查清單
```

## 🎨 設計理念

- **色彩**：糖果色系 - 草莓粉、奶油黃、薄荷綠、藍莓紫、天藍
- **風格**：甜品童話風格，2D 插畫建築
- **互動**：直觀的拖拽操作，觸摸友好
- **個性化**：融入 Alice 的興趣（蛋糕、甜品、烹飪、畫畫）和家庭元素

## 🛠️ 技術棧

- **前端框架**：Vanilla JavaScript (ES6+ 模組化)
- **樣式**：Tailwind CSS + 自定義 CSS
- **圖標**：Font Awesome 6
- **字體**：Fredoka One, Bubblegum Sans
- **粒子效果**：Particles.js
- **動畫**：CSS Animations + JavaScript
- **音頻**：Web Audio API
- **響應式**：專為 iPad 優化

## 📝 開發狀態

### ✅ 已完成功能

#### 主頁地圖
- [x] 2D 插畫風格地圖設計
- [x] 糖果主題背景和粒子動畫
- [x] 4 個建築位置（2 個可進入，2 個預留）
- [x] 建築懸停和點擊效果
- [x] "即將推出"模態框

#### 記憶拼圖屋
- [x] 照片選擇界面
- [x] 照片切割系統（Canvas API）
- [x] 3x3 拼圖遊戲（27 片混合）
- [x] 拖拽操作（HTML5 Drag & Drop）
- [x] 正確位置檢測
- [x] 完成檢測
- [x] 計時器功能
- [x] 提示系統（3 次）
- [x] 慶祝動畫（彩帶效果）
- [x] 生日祝福文字
- [x] YouTube 影片播放器

#### 好味道食品屋
- [x] 蛋糕製作界面
- [x] 多種蛋糕底座和顏色
- [x] 豐富的裝飾元素
- [x] 文字添加功能
- [x] 拖拽和編輯
- [x] 撤銷和清空功能
- [x] 完成保存流程

#### 技術實現
- [x] 模組化 JavaScript 架構
- [x] 音效管理系統
- [x] iPad 響應式優化
- [x] 觸摸操作優化
- [x] 整合到太虛幻境

### 🔄 待完善功能

#### 高優先級（生日前完成）
- [ ] 設置 YouTube 影片 ID（5 分鐘）
- [ ] 實際 iPad 設備測試（30 分鐘）

#### 可選優化
- [ ] 音效文件添加（使用 Freesound.org 或自錄）
- [ ] 蛋糕下載功能
- [ ] 照片選擇優化（讓玩家自己選擇）

#### 未來擴展
- [ ] 史萊姆實驗室遊戲
- [ ] 夢幻廁所設計室遊戲
- [ ] 更多拼圖難度選項

## 🎁 特別說明

這是一個充滿愛的專屬應用，每個細節都是為 Alice 精心設計的。希望這個數位生日禮物能帶來歡樂和美好的回憶！

## 📜 版本歷史

- **v1.0.0** (2025-10-21) - 初始版本，建立基礎框架

## 💝 致謝

獻給親愛的 Alice，祝你生日快樂！

---

**創建日期**：2025-10-21  
**所屬平台**：太虛幻境（Chinese Classics Learning Platform）  
**作者**：爸爸 ❤️

