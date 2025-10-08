# 太虛幻境項目架構指南

> **最後更新**：2025年10月8日  
> **項目名稱**：太虛幻境 - 書院中文經典數字體驗學習  
> **項目定位**：個人教育軟件 App Store / 教學軟件集成平台

---

## 📋 目錄

1. [項目概述](#項目概述)
2. [核心理念](#核心理念)
3. [應用分類體系](#應用分類體系)
4. [當前架構](#當前架構)
5. [資源管理策略](#資源管理策略)
6. [標準應用結構](#標準應用結構)
7. [開發工作流程](#開發工作流程)
8. [過渡與重構計劃](#過渡與重構計劃)
9. [獨立分發準備](#獨立分發準備)
10. [後端架構策略](#後端架構策略)
11. [技術棧概覽](#技術棧概覽)

---

## 項目概述

### 什麼是太虛幻境？

太虛幻境是一個以網站形式存在的教育軟件集成平台，模仿 App Launcher 的形式，使用全屏 iframe 打開一系列不同內容和功能的學習軟件。這些軟件隨著教學實踐和思考不斷更新。

### 開發者背景

- **身份**：中學中文和古代經典教師
- **技術背景**：無編程基礎，使用 Cursor Coding 方式進行教育軟件開發
- **開發方式**：業餘時間開發，以教學需求驅動

### 項目目標

**現階段目標**：
- 集成展示所有教學軟件
- 方便學生、教師、家長、社會大眾訪問和嘗試
- 持續迭代和改進各個應用

**長期目標**：
- 每個軟件保持獨立性，可以獨立分發
- 將來可能轉換為 App Store 應用或微信小程序
- 面向社會大眾分發和使用

---

## 核心理念

### 設計原則

1. **獨立自包含**
   - 每個應用是完整獨立的單元
   - 所有依賴資源都在應用自己的文件夾內
   - 方便將來進行不同形式的改造和分發

2. **簡單直接**
   - 避免過度複雜的架構設計
   - 優先考慮可維護性而非技術複雜度
   - 適合非專業程序員維護和更新

3. **漸進式改進**
   - 不追求一次性重構所有內容
   - 新應用採用最佳實踐
   - 老應用按需逐步重構

4. **教學優先**
   - 技術服務於教學目標
   - 功能開發以學生學習體驗為中心
   - 保持內容的學術性和教育價值

---

## 應用分類體系

### 太虛幻境四境分類

太虛幻境的應用分類採用《紅樓夢》太虛幻境的意象，以四個不同的「境地」來組織各類數字體驗。每個境地都是太虛幻境中的一個獨特場所，對應不同的學習領域。

這些不是傳統意義上的「教育軟件」或「學習遊戲」，而是 AI 數字時代學生可以互動體驗的**教育數字體驗**。

---

### 📝 翰墨齋
**現代中文體驗**

> 翰墨飄香的書齋，掌管現代文字之地

**包含應用**（4個）：
1. **漢字樹** - 漢字書寫與結構學習
2. **貪吃龍** - 詞彙組合遊戲
3. **故事詞彙接龍** - 詞彙積累與造句 `NEW`
4. **《雷雨》閃電** - 現代文學體驗

**體驗特點**：聚焦現代漢語的聽說讀寫，從漢字學習到現代文學作品體驗。

**視覺意象**：清新雅致的書齋，水墨淡彩，文房四寶陳列，江南園林式空間。

---

### 🏛️ 千古堂
**古代經典體驗**

> 匯聚千古經典的寶堂，藏有歷代典籍

**包含應用**（12個）：
1. **萬物逍遙** - 莊子哲學體驗 `FEATURED`
2. **長干行旅** - 李白詩歌角色扮演
3. **《長干行》時光拼圖** - 詩歌時序理解
4. **《長恨歌》記憶卡牌** - 白居易詩歌記憶
5. **南風填詞** - 古典詞創作工具
6. **南風作詩** - 古典詞創作工具
7. **詩詞組句遊戲** - 古詩詞拼組
8. **意moji** - 詩詞意象配對
9. **刺客之道** - 史記刺客列傳
10. **月下獨酌** - 古代詩人群聊
11. **紅樓夢人物圖譜** - 人物關係可視化
12. **太虛幻聊** - 與經典人物對話

**體驗特點**：涵蓋詩詞、古文、經典著作，從先秦諸子到明清小說。

**視覺意象**：莊重的殿堂，朱紅金黃色調，藏經樓般的空間，古籍羅列。

---

### 🎨 錦繡坊
**中華文化體驗**

> 錦繡河山風華的工坊，薈萃文化精粹

**包含應用**（4個）：
1. **迷失江南春** - 江南文化探索
2. **江南落花** - 江南文化街機遊戲
3. **印章設計** - 傳統印章藝術工具
4. **長安108坊** - 唐代長安城3D模型 `開發中`

**體驗特點**：歷史場景、傳統藝術、地域文化的沉浸式探索。

**視覺意象**：華麗的工坊樓閣，彩繪雕梁，錦繡河山的繁華景象。

---

### ☁️ 雲外樓
**實驗與跨界體驗**

> 雲外有樓，超越想象的創意空間

**包含應用**（3個）：
1. **神秘數字盒** - 邏輯推理遊戲
2. **雙蛇大戰** - 雙人對戰遊戲
3. **All Things Wander Free** - 萬物逍遙英文版

**體驗特點**：實驗性質、跨學科、跨語言的創新嘗試。

**視覺意象**：高遠開闊的雲中樓閣，虛實交融，超越常規的想象空間。

---

### 分類統計

- **翰墨齋**：4個應用（17%）
- **千古堂**：12個應用（52%）- 核心領域
- **錦繡坊**：4個應用（17%）
- **雲外樓**：3個應用（13%）

**總計**：23個應用（含1個開發中）

### 分類原則

**「數字體驗」理念**：
- 模糊學習與遊戲的界限
- 強調互動、沉浸、探索
- 尊重學習者的主體性和個性化路徑

**新應用歸類決策**：
1. 內容為現代中文？→ 翰墨齋
2. 內容為古代經典？→ 千古堂
3. 內容為文化場景/藝術？→ 錦繡坊
4. 實驗性質或跨界？→ 雲外樓

**將來視覺化**：
每個境地將對應太虛幻境中的一個獨特建築或場所，用戶可以在虛擬空間中遊歷不同的境地，選擇不同的體驗。

---

## 當前架構

### 部署方式

**雙平台部署**：
- **GitHub Pages**：主要托管平台，原生支持，適合開發和測試
- **Cloudflare Pages**：鏡像部署，訪問速度更快，在中國大陸訪問更穩定

**部署流程**：
- GitHub 作為主倉庫，所有開發在這裡進行
- 推送到 `main` 分支後自動部署到兩個平台
- 建議使用分支管理：`main`（穩定版）和 `dev`（開發版）

### 主入口結構

```
index.html          # 太虛幻境主頁
├── 應用網格展示
├── iframe 全屏加載
├── 應用切換器
└── 浮動 logo 導航
```

**特點**：
- 所有應用通過 iframe 加載，確保隔離性
- 響應式設計，支持桌面端和移動端
- 暗黑模式支持
- 優雅的加載和錯誤處理

---

## 資源管理策略

### 核心決策

**✅ 採用應用獨立資源管理**

每個應用將所需的所有資源（字體、音效、圖片等）放在自己的 `assets/` 文件夾中，不再依賴全局共享資源文件夾。

### 原因說明

1. **獨立性**：每個應用成為完全自包含的單元
2. **便於分發**：打包應用時不需要追蹤外部依賴
3. **簡單直接**：不需要維護複雜的依賴關係清單
4. **空間可接受**：常用字體和音效文件不會佔用太多空間
5. **未來友好**：轉換成 App 或小程序時，所有資源都在一起

### 資源分類

**應用專屬資源**（必須放在應用文件夾內）：
- 應用特有的音效、圖片、動畫
- 應用專屬的數據文件（如詞彙庫）
- 應用特定的 JavaScript 和 CSS

**通用資源**（從共享資源庫複製）：
- 古典字體文件（如仓耳今楷、華康古籍系列）
- 通用音效（點擊、成功、失敗等）
- 共用的圖標和素材

**外部依賴**（CDN 引用）：
- Tailwind CSS
- Font Awesome
- Supabase SDK
- 其他第三方庫

### 共享資源文件夾 `/files/` 的未來

- **保留但不再擴充**：作為"資源庫"存在
- **作用**：新應用開發時，從這裡複製需要的資源
- **歷史應用**：未重構的老應用仍然可以使用
- **逐步淘汰**：隨著應用重構，依賴逐漸減少

---

## 標準應用結構

### 推薦的文件夾組織

```
應用名稱/
├── index.html                 # 主入口文件
├── README.md                  # 應用說明文檔
│
├── js/                        # JavaScript 代碼
│   ├── app.js                # 主應用邏輯
│   ├── config.js             # 配置文件
│   ├── core/                 # 核心功能模塊
│   ├── features/             # 特定功能模塊
│   ├── ui/                   # UI 相關代碼
│   └── utils/                # 工具函數
│
├── css/                       # 樣式文件
│   ├── main.css              # 主樣式
│   ├── variables.css         # CSS 變量
│   ├── components.css        # 組件樣式
│   ├── layout.css            # 布局樣式
│   └── responsive.css        # 響應式樣式
│
├── assets/                    # 所有資源文件
│   ├── fonts/                # 字體文件
│   │   ├── 仓耳今楷01 W04.ttf
│   │   └── 华康古籍木兰GBK.TTF
│   │
│   ├── audio/                # 音頻文件
│   │   ├── click.mp3
│   │   ├── success.mp3
│   │   └── gameover.mp3
│   │
│   ├── images/               # 圖片文件
│   │   ├── icon.png
│   │   ├── background.jpg
│   │   └── sprites/          # 精靈圖
│   │
│   └── data/                 # 數據文件
│       ├── vocabulary.json
│       └── config.json
│
├── docs/                      # 文檔（可選）
│   ├── DESIGN.md             # 設計文檔
│   └── USER_GUIDE.md         # 使用指南
│
└── supabase/                  # Supabase 相關（如需要）
    ├── functions/            # Edge Functions
    └── migrations/           # 數據庫遷移
```

### 典範應用：story-vocab

`story-vocab` 目前已經是一個結構良好的獨立應用：
- ✅ 完整的文件夾結構
- ✅ 代碼按功能模塊化組織
- ✅ 只使用系統字體，無外部字體依賴
- ✅ 數據文件在應用內部
- ✅ 完全不依賴 `/files/` 共享資源
- ✅ 有詳細的設計文檔

**可以作為新應用的參考模板**。

---

## 開發工作流程

### 新應用開發流程

1. **創建應用文件夾結構**
   ```bash
   mkdir -p 新應用名/{js,css,assets/{fonts,audio,images,data},docs}
   ```

2. **從資源庫複製需要的資源**
   ```bash
   # 如果需要特定字體
   cp files/fonts/仓耳今楷01\ W04.ttf 新應用名/assets/fonts/
   
   # 如果需要音效
   cp files/audio/cilong/*.mp3 新應用名/assets/audio/
   ```

3. **開發應用功能**
   - 在 `index.html` 中構建基本結構
   - 將樣式寫入 `css/` 文件夾
   - 將邏輯寫入 `js/` 文件夾
   - 所有路徑使用相對路徑

4. **測試應用**
   - 在瀏覽器中直接打開 `index.html` 測試
   - 確保所有資源正確加載
   - 測試響應式布局

5. **集成到太虛幻境**
   - 在主 `index.html` 的 `apps` 數組中添加應用信息
   - 測試從主頁啟動應用
   - 測試 iframe 加載和全屏顯示

6. **提交和部署**
   ```bash
   git add 新應用名/
   git commit -m "添加新應用：[應用名稱]"
   git push origin main
   ```

### 應用更新流程

1. 在應用文件夾內進行修改
2. 在瀏覽器中測試變更
3. 提交並推送到 GitHub
4. 自動部署到 GitHub Pages 和 Cloudflare Pages

---

## 過渡與重構計劃

### 當前項目狀態

**已採用新結構的應用**：
- ✅ `story-vocab/` - 故事詞彙接龍（典範應用）

**待重構的應用（按優先級）**：

**高優先級**（活躍維護、使用頻繁）：
1. `wanwuxiaoyao.html` → `wanwuxiaoyao/`
2. `cilong.html` → `cilong/`
3. `honglourenwu.html` → `honglourenwu/`

**中優先級**（等需要更新時重構）：
4. `leiyushandian.html` → `leiyushandian/`
5. `changganxinglv.html` → `changganxinglv/`
6. `changhengejiyi.html` → `changhengejiyi/`
7. 其他複雜互動應用

**低優先級**（簡單應用可保持單文件）：
- `yimoji.html` - 簡單配對遊戲
- `caishuzi.html` - 簡單猜數字遊戲
- 其他功能單一的小工具

### 重構步驟範本

以 `wanwuxiaoyao.html` 為例：

1. **創建文件夾結構**
   ```bash
   mkdir -p wanwuxiaoyao/{js,css,assets/{fonts,audio,images}}
   ```

2. **拆分現有單文件**
   - HTML 結構 → `wanwuxiaoyao/index.html`
   - `<style>` 內容 → `wanwuxiaoyao/css/main.css`
   - `<script>` 內容 → `wanwuxiaoyao/js/app.js`

3. **複製依賴資源**
   - 檢查原文件引用的 `/files/` 資源
   - 將需要的字體、音效複製到 `assets/` 對應文件夾

4. **更新資源路徑**
   - 所有 `/files/...` 路徑改為 `assets/...`
   - 確保使用相對路徑

5. **更新主頁引用**
   - `index.html` 的 `apps` 數組中
   - 將 `url: 'wanwuxiaoyao.html'` 改為 `url: 'wanwuxiaoyao/index.html'`

6. **測試和調試**
   - 直接打開應用測試
   - 從主頁啟動測試
   - 檢查所有功能正常

7. **清理舊文件**
   - 刪除或重命名舊的 `wanwuxiaoyao.html`
   - 提交變更到 Git

### 簡單應用的處理

對於非常簡單的單文件應用（如 `yimoji.html`）：
- **可以保持單文件形式**，不強制重構
- 但建議至少創建同名文件夾，把資源放進去
- 這樣未來打包時至少資源是分離的

---

## 獨立分發準備

### 分發目標平台

將來可能的分發形式：
- **App Store** 應用（iOS/macOS）
- **微信小程序**
- **獨立網站**部署
- **離線 HTML 包**（打包成 ZIP 分發）

### 分發對象

- 社會大眾（學生、教師、家長）
- 教育機構和學校
- 出版社或教育科技公司

### 準備要點

1. **完整的自包含結構**
   - 所有資源都在應用文件夾內
   - 沒有外部路徑依賴（除 CDN）
   - 可以直接打包整個文件夾

2. **清晰的文檔**
   - `README.md` 說明應用用途和使用方法
   - 註明適用年級、學習目標
   - 技術依賴說明（如需要網絡連接）

3. **適配考慮**
   - **微信小程序**：代碼包大小限制 2MB（單個分包）
   - **App Store**：需要考慮 App 審核標準
   - **離線使用**：CDN 資源需要本地化

4. **配置靈活性**
   - API 密鑰等敏感信息使用環境變量
   - 功能開關通過配置文件控制
   - 方便適配不同平台的限制

### 打包策略（未來實施）

可以考慮編寫簡單的打包腳本：
1. 讀取應用文件夾
2. 檢查依賴完整性
3. 可選：下載 CDN 資源到本地
4. 壓縮和優化資源
5. 生成分發包

---

## 後端架構策略

### 核心決策：獨立後端 + 統一用戶中心

**架構原則**：每個應用有獨立的 Supabase 後端，同時通過太虛幻境統一用戶中心實現跨應用的教育追蹤。

### 為什麼採用這個架構？

1. **保持應用獨立性**
   - 每個應用可以完全獨立運行和分發
   - 應用專屬數據存儲在各自的後端
   - 獨立分發為 App 或小程序時不受影響

2. **支持教育追蹤**
   - 太虛幻境作為教育平台需要統一的用戶學習數據
   - 跨應用的學習進度、詞彙累積等有教育價值
   - 支持因材施教和個性化學習

3. **靈活性最大化**
   - 應用既可以在平台內運行（集成模式）
   - 也可以完全獨立運行（獨立模式）
   - 同一套代碼支持兩種運行模式

---

### 三層後端架構

```
┌─────────────────────────────────────────────────────┐
│         太虛幻境統一用戶中心（Platform Hub）           │
│               獨立 Supabase 項目                      │
├─────────────────────────────────────────────────────┤
│  第一層：平台核心用戶數據                              │
│  - platform_users（用戶身份、年級、學習偏好）          │
│  - learning_metrics（跨應用學習指標）                 │
│  - unified_vocabulary（統一生詞本）                   │
│  - daily_learning_summary（每日學習摘要）             │
└─────────────────────────────────────────────────────┘
                          ↕ API 通信
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ story-vocab  │  │   cilong     │  │  shicizuju   │
│ (Supabase B) │  │ (Supabase C) │  │ (Supabase D) │
├──────────────┤  ├──────────────┤  ├──────────────┤
│第二層：應用私有│  │第二層：應用私有│  │第二層：應用私有│
│- story_sessions│ │- game_scores │  │- poem_progress│
│- ai_feedback  │  │- snake_state │  │- puzzle_data  │
│- vocab_usage  │  │- power_ups   │  │- timing_stats │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

### 數據分類：三層模型

#### 第一層：平台核心用戶數據

**存儲位置**：太虛幻境統一用戶中心

**包含內容**：
- ✅ 用戶身份識別（email, username, avatar）
- ✅ 教育背景（grade_level, school）
- ✅ 跨應用學習指標（總學習時長、總詞彙量、學習連續天數）
- ✅ 統一生詞本（跨應用的詞彙掌握情況）
- ✅ 教育分析數據（每日學習摘要、學習趨勢）

**數據庫架構示例**：
```sql
-- 統一用戶表
CREATE TABLE platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  grade_level TEXT,              -- '2A', '3B', '4A' 等
  total_study_time INT DEFAULT 0,
  total_vocabulary_learned INT DEFAULT 0,
  member_since TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- 跨應用學習進度
CREATE TABLE learning_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES platform_users(id),
  app_id TEXT NOT NULL,          -- 'story-vocab', 'cilong'
  level_completed INT,
  achievements JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 統一生詞本
CREATE TABLE unified_vocabulary (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES platform_users(id),
  word TEXT NOT NULL,
  first_learned_in TEXT,         -- 在哪個應用首次學習
  also_seen_in TEXT[],           -- 在其他哪些應用見過
  mastery_level INT DEFAULT 1,   -- 1-5
  total_encounters INT DEFAULT 1,
  last_reviewed TIMESTAMP,
  UNIQUE(user_id, word)
);

-- 每日學習摘要
CREATE TABLE daily_learning_summary (
  user_id UUID REFERENCES platform_users(id),
  date DATE NOT NULL,
  apps_used TEXT[],
  total_time_minutes INT,
  new_words_learned INT,
  activities_completed INT,
  UNIQUE(user_id, date)
);
```

#### 第二層：應用共享數據（可選）

**存儲位置**：特定應用的後端或獨立的數據服務

**包含內容**：
- 詞語庫主數據（可以作為靜態 JSON 文件）
- 詩詞數據庫
- 通用的教學內容

**處理方式**：
- 優先使用靜態 JSON 文件，每個應用複製一份
- 如需動態更新，可通過 API 提供

#### 第三層：應用私有數據

**存儲位置**：每個應用自己的 Supabase 項目

**包含內容**（以 story-vocab 為例）：
- ❌ 完整的故事內容和對話歷史
- ❌ AI 反饋的詳細記錄
- ❌ 每輪提供的詞語選項
- ❌ 應用內部狀態和緩存
- ❌ 遊戲機制相關的技術數據

**決策標準**：
- 只對該應用的業務邏輯有意義
- 其他應用不需要知道這些細節
- 數據量大且變化頻繁

---

### 雙模式架構：應用如何支持兩種運行模式

每個應用通過「用戶服務抽象層」支持兩種運行模式：

#### 模式 A：平台集成模式（在太虛幻境內）
- 使用太虛幻境的統一用戶系統
- 學習數據同步到平台用戶中心
- 支持跨應用的學習追蹤

#### 模式 B：獨立運行模式（獨立分發）
- 使用應用自己的用戶系統
- 數據只存儲在應用自己的後端
- 完全獨立運行

#### 實現方式：用戶服務抽象層

**文件結構**：
```
story-vocab/
├── js/
│   ├── services/
│   │   ├── user-service.js              # 抽象接口
│   │   ├── user-service-platform.js     # 平台模式實現
│   │   └── user-service-standalone.js   # 獨立模式實現
│   ├── config.js                        # 運行模式檢測
│   └── app.js                           # 應用初始化
```

**config.js - 運行模式檢測**：
```javascript
// 檢測當前運行環境
function detectRunMode() {
  // 方法1：通過 URL 判斷
  const isInPlatform = window.location.hostname === 'chineseclassics.github.io';
  
  // 方法2：通過 iframe 判斷
  const isInIframe = window.self !== window.top;
  
  // 方法3：通過配置覆蓋（用於測試）
  const forceMode = localStorage.getItem('run_mode');
  
  if (forceMode === 'standalone') return 'standalone';
  if (isInPlatform || isInIframe) return 'platform';
  return 'standalone';
}

export const RUN_MODE = detectRunMode();

export const CONFIG = {
  // 應用自己的後端（總是需要）
  appSupabase: {
    url: 'https://app-specific.supabase.co',
    anonKey: '...'
  },
  
  // 平台用戶中心（僅平台模式需要）
  platformSupabase: {
    url: 'https://platform-hub.supabase.co',
    anonKey: '...'
  }
};
```

**user-service.js - 抽象接口**：
```javascript
// 用戶服務抽象類
export class UserService {
  async getCurrentUser() { /* 子類實現 */ }
  async updateProgress(data) { /* 子類實現 */ }
  async saveWordToWordbook(word) { /* 子類實現 */ }
  async getWordbook() { /* 子類實現 */ }
}
```

**user-service-platform.js - 平台集成模式**：
```javascript
export class PlatformUserService extends UserService {
  constructor(platformAPI, appAPI) {
    super();
    this.platformAPI = platformAPI; // 平台用戶中心
    this.appAPI = appAPI;           // 應用後端
  }
  
  async saveWordToWordbook(word) {
    // 雙寫策略：
    // 1. 詳細數據保存到應用後端
    await this.appAPI.from('app_wordbook').insert({
      word,
      context: '具體的上下文信息',
      session_id: '...'
    });
    
    // 2. 聚合數據同步到平台
    await this.platformAPI.from('unified_vocabulary').upsert({
      word,
      first_learned_in: 'story-vocab',
      total_encounters: increment(1)
    });
  }
}
```

**user-service-standalone.js - 獨立運行模式**：
```javascript
export class StandaloneUserService extends UserService {
  constructor(appAPI) {
    super();
    this.appAPI = appAPI; // 只使用應用自己的後端
  }
  
  async saveWordToWordbook(word) {
    // 只保存到應用本地
    await this.appAPI.from('app_wordbook').insert({ word });
  }
}
```

**app.js - 應用初始化**：
```javascript
import { RUN_MODE, CONFIG } from './config.js';
import { PlatformUserService } from './services/user-service-platform.js';
import { StandaloneUserService } from './services/user-service-standalone.js';

let userService;

async function initializeApp() {
  if (RUN_MODE === 'platform') {
    console.log('🌐 平台集成模式');
    const appSupabase = createClient(CONFIG.appSupabase.url, CONFIG.appSupabase.anonKey);
    const platformSupabase = createClient(CONFIG.platformSupabase.url, CONFIG.platformSupabase.anonKey);
    userService = new PlatformUserService(platformSupabase, appSupabase);
  } else {
    console.log('📱 獨立運行模式');
    const appSupabase = createClient(CONFIG.appSupabase.url, CONFIG.appSupabase.anonKey);
    userService = new StandaloneUserService(appSupabase);
  }
  
  // 應用其他邏輯使用統一的 userService 接口
  // 無需關心當前是哪種模式
}
```

---

### 數據同步策略

#### 核心原則

> **詳細數據在應用，聚合數據在平台**

不是把所有數據都複製到平台，而是提取有教育意義的聚合指標。

#### 同步時機

**實時同步**（推薦）：
```javascript
// 每次關鍵操作後立即同步
async function completeActivity(data) {
  // 1. 保存詳細數據到應用後端
  await appSupabase.from('activities').insert(data);
  
  // 2. 如果在平台模式，同步聚合指標
  if (RUN_MODE === 'platform') {
    await platformSupabase.from('daily_learning_summary').upsert({
      user_id: userId,
      date: today,
      activities_completed: increment(1),
      total_time_minutes: increment(data.duration)
    });
  }
}
```

**批量同步**（備選）：
- 應用關閉時批量同步
- 或定時（每5分鐘）同步一次
- 適合減少 API 調用次數

#### 同步內容決策

使用「三問決策法」：

1. **跨應用問**：這個數據其他應用需要嗎？
2. **教育問**：這個數據對了解學生整體學習情況重要嗎？
3. **隱私問**：這個數據涉及用戶隱私或敏感信息嗎？

**同步到平台的數據**：
- ✅ 用戶基本資料
- ✅ 總學習時長（聚合）
- ✅ 新學詞彙（詞語本身，不是學習過程）
- ✅ 完成活動數（聚合）
- ✅ 成就解鎖（關鍵里程碑）

**保留在應用的數據**：
- ❌ 完整的遊戲記錄
- ❌ AI 對話詳情
- ❌ 遊戲狀態快照
- ❌ 技術性的臨時數據

---

### 太虛幻境主站的職責

#### 統一登入和用戶管理

**主站負責**：
- 用戶註冊和登入
- 用戶資料管理
- 統一的學習儀表板

#### iframe 通信機制

```javascript
// index.html（主站）
function openApp(appId) {
  const app = apps.find(a => a.id === appId);
  appFrame.src = app.url;
  
  appFrame.onload = () => {
    // 將平台用戶 token 傳遞給應用
    appFrame.contentWindow.postMessage({
      type: 'PLATFORM_AUTH',
      token: platformUserToken,
      user: currentPlatformUser
    }, '*');
  };
}

// 應用內（app.js）
window.addEventListener('message', (event) => {
  if (event.data.type === 'PLATFORM_AUTH') {
    // 接收平台傳來的用戶信息
    initPlatformMode(event.data.token, event.data.user);
  }
});
```

#### 教育分析儀表板

在主站創建學習分析頁面：
- 展示學生在所有應用的學習時長
- 跨應用的詞彙累積
- 不同應用的強弱項分析
- 學習軌跡和成長曲線

---

### 實施優先級

#### 階段1：基礎架構（近期）
1. ✅ 確認各應用保持獨立後端
2. 🆕 創建太虛幻境統一用戶中心 Supabase 項目
3. 🆕 設計平台核心用戶數據架構
4. 🆕 在主站實現統一登入

#### 階段2：應用適配（逐步）
5. 為 story-vocab 添加雙模式支持
6. 測試平台集成模式和獨立模式
7. 其他應用逐步適配

#### 階段3：平台功能（未來）
8. 開發學習分析儀表板
9. 實現跨應用生詞本
10. 添加教師/家長門戶

#### 階段4：優化（持續）
11. 優化數據同步效率
12. 完善教育分析算法
13. 添加個性化推薦

---

### 架構優勢總結

這個「獨立後端 + 統一用戶中心」的架構提供了：

1. ✅ **應用獨立性**：每個應用可以完全獨立運行和分發
2. ✅ **教育統一性**：平台層面有完整的學習數據追蹤
3. ✅ **靈活性**：應用可以在平台模式和獨立模式間切換
4. ✅ **可擴展性**：新應用可以輕鬆加入或退出平台
5. ✅ **數據完整性**：詳細數據不丟失，聚合數據可分析
6. ✅ **用戶控制**：用戶可以選擇是否同步到平台

**核心哲學**：
> 應用是專家，平台是協調者。應用知道細節，平台知道全局。

---

## 技術棧概覽

### 前端技術

**核心技術**：
- HTML5
- CSS3（部分應用使用 Tailwind CSS）
- Vanilla JavaScript（ES6+）

**常用庫（通過 CDN）**：
- Tailwind CSS - 實用優先的 CSS 框架
- Font Awesome - 圖標庫
- d3.js - 數據可視化（用於特定應用如紅樓夢人物圖譜）

### 後端服務

**Supabase**：
- 數據庫（PostgreSQL）
- 身份認證
- Edge Functions（部署 AI Agent 等）
- 實時數據同步

**AI 服務**：
- DeepSeek API - 用於 AI 生成內容（如故事接龍）
- 通過 Supabase Edge Functions 代理調用

### 開發工具

**主要工具**：
- Cursor - AI 輔助編程
- Git / GitHub - 版本控制
- GitHub Pages - 托管
- Cloudflare Pages - 鏡像部署

**Supabase 相關**：
- Supabase CLI - 管理 Edge Functions 和數據庫
- 部署流程見各項目的 `EDGE_FUNCTION_DEPLOY.md`

---

## 常見問題

### Q: 為什麼使用 iframe 而不是 SPA 路由？

**A**: iframe 提供了完美的隔離性：
- 每個應用的樣式和腳本不會互相干擾
- 應用可以獨立開發和測試
- 符合"每個應用獨立"的理念
- 將來轉換為獨立應用時工作量最小

### Q: 資源重複會不會太浪費空間？

**A**: 實際上不會：
- 常用字體文件 5-10MB，10 個應用共 50-100MB
- 音效文件通常幾十 KB
- GitHub 倉庫大小限制是 100GB
- 現代網絡速度和存儲成本都很便宜
- 獨立性帶來的好處遠超過空間成本

### Q: 如何處理多個應用共用的代碼邏輯？

**A**: 現階段策略：
- 如果代碼不多，可以在各應用中複製
- 如果是複雜的共用邏輯，可以抽取為獨立的 JS 庫
- 放在應用的 `js/lib/` 或 `js/utils/` 中
- 或者創建一個 `shared-utils/` 文件夾，打包時複製進應用

### Q: 應用之間需要共享數據怎麼辦？

**A**: 採用三層數據架構：
- **平台層**：跨應用的用戶數據（身份、學習指標）存儲在統一用戶中心
- **應用層**：應用專屬數據存儲在各自的後端
- **共享資源**：詞語庫等靜態資源作為 JSON 文件，各應用複製使用
- 詳見「後端架構策略」章節

### Q: 如何在保持應用獨立性的同時追蹤整體學習進度？

**A**: 採用「雙模式架構」：
- 應用通過用戶服務抽象層支持兩種模式
- **平台模式**：在太虛幻境內運行時，數據同步到統一用戶中心
- **獨立模式**：單獨分發時，數據只存在應用自己的後端
- 同一套代碼自動適配不同運行環境

---

## 版本歷史

### 2025-10-08
- 確立"應用獨立資源管理"策略
- 定義標準應用結構
- 制定過渡和重構計劃
- 明確獨立分發準備方向
- **新增**：確立"獨立後端 + 統一用戶中心"架構策略
- **新增**：設計雙模式架構（平台集成模式 vs 獨立運行模式）
- **新增**：制定數據分類和同步策略（三層數據模型）
- **新增**：定義用戶服務抽象層實現方案
- **新增**：建立太虛幻境四境應用分類體系（翰墨齋、千古堂、錦繡坊、雲外樓）
- **新增**：確立「數字體驗」核心理念，超越傳統學習軟件和遊戲的分類

---

## 參考資源

### 項目文檔
- [Supabase Edge Function 部署指南](story-vocab/EDGE_FUNCTION_DEPLOY.md)
- [Story-Vocab 設計文檔](story-vocab/docs/DESIGN.md)
- [Tailwind 遷移指南](TAILWIND_MIGRATION_GUIDE.md)

### 外部資源
- [GitHub Pages 文檔](https://docs.github.com/en/pages)
- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Supabase 文檔](https://supabase.com/docs)
- [Cursor 文檔](https://cursor.sh/docs)

---

## 聯繫與貢獻

**開發者**：書院中文經典 張老師  
**項目主頁**：https://chineseclassics.github.io  
**GitHub 倉庫**：https://github.com/chineseclassics/chineseclassics.github.io

歡迎教育同行交流和合作！

