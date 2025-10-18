# AI 反饋界面設計文檔

> **時文寶鑑** - 響應式 AI 反饋顯示方案

**版本**：2.0  
**更新日期**：2025-10-19  
**設計原則**：對照修改方便、段落對應清晰、不打斷論文流程

---

## 🎯 核心需求

1. **對照修改方便** - 學生能同時看到原文和反饋
2. **段落對應清晰** - 一眼看出反饋針對哪個段落
3. **不打斷流程** - 論文編輯區保持連貫

---

## 🖼️ 設計方案

### 桌面端（>= 1024px）：固定側邊欄

```
┌─────────────────────────────┬─────────────────────┐
│  論文編輯區 (65%)           │  AI 反饋側邊欄 (35%) │
│                             │  ↓ sticky 固定      │
│  ┌─ 引言 [5個問題] ──────┐  │  ┌─ 當前: 引言 ──┐ │
│  │ 🟦 內容... 🟦 高亮    │  │  │ 🔵 正在分析   │ │
│  │ [AI 反饋] ────────────┼──┼─▶│               │ │
│  └─────────────────────────┘  │  │ 結構: 40%     │ │
│  ↓ 滾動編輯                   │  │               │ │
│  ┌─ 分論點 1 [3個問題] ──┐  │  │ 問題 (5):     │ │
│  │ 段落 1...             │  │  │ 1 第1句... ←──┼─┤
│  │ [AI 反饋]             │  │  │   [點擊定位]  │ │
│  └─────────────────────────┘  │  │ 2 第2句...    │ │
│  ↓                            │  │               │ │
│  ┌─ 結論 [✅ 無問題] ────┐  │  └───────────────┘ │
│  │ 內容...               │  │    ↑ 始終可見      │
│  └─────────────────────────┘  │    ↑ 可滾動      │
└─────────────────────────────┴─────────────────────┘
```

**特點**：
- ✅ 左側 65%：論文編輯區（連貫不中斷）
- ✅ 右側 35%：AI 反饋側邊欄（固定在視窗中）
- ✅ 當前分析的段落：藍色高亮邊框
- ✅ 段落標題：顯示問題數量徽章
- ✅ 側邊欄：始終可見，無需滾動
- ✅ 雙向定位：點擊問題 → 跳轉到段落並高亮

---

### 移動端（< 1024px）：內聯展開

```
┌──────────────────────────────┐
│  ┌─ 引言 ─── [🤖 5個問題] ─┐│
│  │ 內容...                 ││
│  │ [AI 反饋] ──────────┐   ││
│  └─────────────────────┼───┘│
│                        │     │
│    ┌───────────────────▼──┐  │ ← 視覺連接線
│    │ ✕                    │  │
│    │ 🔵 針對上方「引言」   │  │
│    │ ══════════════       │  │
│    │ 結構: 40%  ████░░░   │  │
│    │                      │  │
│    │ 問題 (5):            │  │
│    │ ! 缺少關鍵詞定義      │  │
│    │ 1 第1句: 背景...     │  │
│    │ 2 第2句: 缺少...     │  │
│    │                      │  │
│    │ [查看詳細分析]        │  │
│    └──────────────────────┘  │
│                              │
│  ┌─ 分論點 1 ──────────────┐│
│  │ 段落 1...               ││
└──────────────────────────────┘
```

**特點**：
- ✅ 反饋緊貼段落正下方（位置關聯明確）
- ✅ 視覺連接線（頂部藍色細線）
- ✅ 標題明確說明"針對上方XXX"
- ✅ 可以點擊 ✕ 收起
- ✅ 下滑動畫（smooth 展開）

---

## 🔧 技術實現

### HTML 結構

```html
<!-- 桌面端：左右分欄 -->
<main>
    <div class="flex flex-col lg:flex-row gap-6">
        <!-- 左側：編輯區 (65%) -->
        <div class="w-full lg:w-2/3">
            <div id="intro" class="transition-all">  ← 添加 ID 用於高亮
                <!-- 引言編輯器 -->
                <!-- 移動端反饋容器（動態添加） -->
            </div>
        </div>
        
        <!-- 右側：側邊欄 (35%) -->
        <aside class="hidden lg:block lg:w-1/3">
            <div class="sticky top-24">
                <div id="ai-feedback-sidebar">
                    <div id="sidebar-feedback-content">
                        <!-- 反饋內容動態加載 -->
                    </div>
                </div>
            </div>
        </aside>
    </div>
</main>
```

### 響應式邏輯

```javascript
// 判斷設備類型
const isMobile = window.innerWidth < 1024;

if (isMobile) {
    // 移動端：內聯展開
    renderMobileInlineFeedback(paragraphId, feedback);
} else {
    // 桌面端：側邊欄
    renderDesktopFeedbackSidebar(paragraphId, feedback);
}
```

### 段落高亮

```javascript
// 高亮當前分析的段落
function highlightCurrentParagraph(paragraphId) {
    // 移除舊高亮
    document.querySelectorAll('.paragraph-highlighted').forEach(el => {
        el.classList.remove('paragraph-highlighted', 'ring-2', 'ring-blue-400');
    });
    
    // 添加新高亮
    const element = document.getElementById(paragraphId);
    element.classList.add('paragraph-highlighted', 'ring-2', 'ring-blue-400', 'bg-blue-50');
}
```

### 問題徽章

```javascript
// 在段落標題旁顯示問題數量
function updateParagraphBadge(paragraphId, feedback) {
    const issueCount = feedback.sentence_level_issues?.length || 0;
    
    if (issueCount > 0) {
        // 🟠 X個問題
    } else {
        // ✅ 無問題
    }
}
```

### 雙向定位

```javascript
// 點擊側邊欄中的問題 → 跳轉到段落
function scrollToParagraph(paragraphId) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 臨時閃爍高亮
    element.classList.add('ring-4', 'ring-yellow-300');
    setTimeout(() => {
        element.classList.remove('ring-4', 'ring-yellow-300');
    }, 2000);
}
```

---

## 📊 交互流程

### 桌面端流程

```
用戶點擊"引言"的 [AI 反饋] 按鈕
    ↓
1. 引言段落：藍色邊框高亮
2. 右側邊欄：顯示加載動畫
3. 3-5 秒後：側邊欄顯示反饋內容
    ↓
用戶閱讀反饋（側邊欄固定可見）
    ↓
用戶點擊側邊欄中的"第 2 句問題"
    ↓
頁面自動滾動到引言段落
引言第 2 句：黃色閃爍高亮 2 秒
    ↓
用戶修改內容
    ↓
側邊欄反饋仍然可見，可以對照修改
```

---

### 移動端流程

```
用戶點擊"引言"的 [AI 反饋] 按鈕
    ↓
1. 引言下方：展開反饋區域（下滑動畫）
2. 頂部：視覺連接線（指向上方引言）
3. 標題：「針對上方「引言」的 AI 反饋」
4. 顯示加載動畫
    ↓
3-5 秒後：顯示反饋內容
    ↓
用戶閱讀反饋
    ↓
選項 A：向上滾動，回到編輯器修改
選項 B：點擊 ✕ 收起反饋
    ↓
用戶修改內容
```

---

## 🎨 視覺設計細節

### 側邊欄（桌面端）

**尺寸**：
- 寬度：35%（最小 320px，最大 450px）
- 位置：sticky top-24
- 最大高度：calc(100vh - 200px)

**樣式**：
- 標題：藍色到靛藍漸變背景
- 內容：白色卡片，圓角陰影
- 滾動條：自定義細滾動條

**初始狀態**：
- 顯示提示："點擊段落的 AI 反饋按鈕"
- 灰色人物圖標（半透明）

---

### 內聯反饋（移動端）

**結構**：
```html
<div class="inline-feedback-container">
    <!-- 視覺連接線 -->
    <div class="連接線"></div>
    
    <!-- 反饋卡片 -->
    <div class="藍色漸變邊框">
        <div class="標題欄">
            針對上方「XXX」的 AI 反饋
            [✕ 關閉]
        </div>
        <div class="內容">
            <!-- 反饋內容 -->
        </div>
    </div>
</div>
```

**動畫**：
- 展開：下滑淡入（slide-down）
- 收起：淡出移除
- 視覺連接線：始終指向上方段落

---

### 段落高亮

**高亮狀態**：
- 藍色邊框：`ring-2 ring-blue-400`
- 淺藍背景：`bg-blue-50`
- 過渡動畫：`transition-all 0.3s`

**點擊定位高亮**：
- 黃色邊框：`ring-4 ring-yellow-300`
- 持續 2 秒後自動消失

---

### 問題徽章

**有問題**：
```html
<span class="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
    <i class="fas fa-exclamation-triangle"></i>
    5個問題
</span>
```

**無問題**：
```html
<span class="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
    <i class="fas fa-check-circle"></i>
    無問題
</span>
```

**動畫**：`badge-appear`（縮放淡入）

---

## 📱 響應式斷點

| 螢幕寬度 | 布局 | 反饋顯示 |
|---------|------|----------|
| < 1024px | 單欄 | 內聯展開（段落下方） |
| >= 1024px | 左右分欄 | 固定側邊欄 |
| >= 1536px | 左右分欄 | 側邊欄最大 500px |

**編輯區寬度**：
- 移動端：100%
- 桌面端：65-70%
- 超寬屏：固定最大寬度

**側邊欄寬度**：
- 移動端：隱藏
- 桌面端：30-35%
- 最小：320px
- 最大：500px

---

## ✨ 交互增強功能

### 1. 段落高亮 ✅

**觸發時機**：
- 點擊"AI 反饋"按鈕時
- 側邊欄切換到該段落時

**效果**：
- 藍色邊框 + 淺藍背景
- 其他段落高亮自動移除
- 過渡動畫 0.3s

---

### 2. 問題徽章 ✅

**顯示位置**：
- 引言標題旁
- 分論點標題旁
- 段落標題旁
- 結論標題旁

**內容**：
- 🟠 X個問題（有問題時）
- ✅ 無問題（無問題時）

**動畫**：縮放淡入

---

### 3. 雙向定位 ✅

**從側邊欄到段落**：
- 點擊問題卡片
- 頁面滾動到對應段落
- 段落黃色閃爍高亮 2 秒

**從段落到側邊欄**：
- 點擊"AI 反饋"按鈕
- 側邊欄內容切換
- 側邊欄滾動到頂部

---

### 4. 視覺連接（移動端） ✅

**連接線**：
- 位置：反饋卡片頂部中央
- 樣式：藍色細線，漸變效果
- 作用：視覺上連接段落和反饋

**標題說明**：
- "針對上方「引言」的 AI 反饋"
- 明確說明對應關係

---

## 🎨 UI 組件

### 側邊欄組件

```javascript
<aside class="hidden lg:block lg:w-1/3">
    <div class="sticky top-24">
        <div id="ai-feedback-sidebar">
            <!-- 標題欄（藍色漸變） -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600">
                🤖 AI 反饋助手
            </div>
            
            <!-- 內容區（可滾動） -->
            <div id="sidebar-feedback-content" class="overflow-y-auto">
                <!-- 動態內容 -->
            </div>
        </div>
    </div>
</aside>
```

---

### 內聯反饋組件（移動端）

```javascript
<div class="inline-feedback-container">
    <!-- 視覺連接線 -->
    <div class="flex justify-center -mt-3">
        <div class="w-0.5 h-3 bg-blue-400"></div>
    </div>
    
    <!-- 反饋卡片 -->
    <div class="border-2 border-blue-300 rounded-lg animate-slide-down">
        <!-- 標題欄 -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600">
            針對上方「XXX」的 AI 反饋
            [✕ 關閉]
        </div>
        
        <!-- 內容 -->
        <div class="bg-white p-4">
            <!-- 簡化的反饋內容 -->
        </div>
    </div>
</div>
```

---

## 📋 相關文件

### 新增文件

- `css/sidebar.css` - 側邊欄和響應式樣式

### 修改文件

- `index.html` - 左右分欄布局
- `js/ai/feedback-renderer.js` - 響應式渲染邏輯
- `js/ai/feedback-requester.js` - 響應式加載狀態
- `js/student/essay-writer.js` - 段落容器支持

---

## ✅ 優勢總結

### 桌面端優勢

1. **對照方便** ✅
   - 左邊編輯，右邊看反饋
   - 側邊欄固定，無需滾動
   - 一屏掌握全部信息

2. **段落對應清晰** ✅
   - 高亮顯示當前段落
   - 側邊欄標題顯示段落名稱
   - 徽章顯示問題數量

3. **不打斷流程** ✅
   - 論文連貫排列
   - 反馈在側邊，不插入中間
   - 編輯流暢

### 移動端優勢

1. **位置對應清晰** ✅
   - 反饋緊貼段落下方
   - 視覺連接線
   - 標題明確說明

2. **不占用編輯空間** ✅
   - 編輯器全屏
   - 查看反饋時才展開
   - 可以收起

3. **無需切換頁面** ✅
   - 內聯展開，不離開當前頁
   - 上下滑動即可對照
   - 體驗流暢

---

## 🚀 使用體驗

### 典型工作流程

1. **學生撰寫引言**
2. **點擊 [AI 反饋] 按鈕**
   - 桌面端：右側邊欄顯示反饋
   - 移動端：引言下方展開反饋
3. **查看反饋**
   - 看到缺少：關鍵詞定義、研究缺口...
4. **對照修改**
   - 桌面端：左邊編輯，右邊看反饋
   - 移動端：上滑到編輯器，下滑看反饋
5. **繼續寫作**
   - 反饋保持可見（桌面端）
   - 或收起反饋（移動端）

---

**設計者**：時文寶鑑開發團隊  
**最後更新**：2025-10-19

