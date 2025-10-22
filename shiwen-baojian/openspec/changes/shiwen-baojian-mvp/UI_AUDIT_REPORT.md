# 時文寶鑑 UI 現狀審計報告

> **審計日期**：2025-10-22  
> **審計範圍**：全部 7 個 CSS 文件 + 12 個 JS 文件  
> **目的**：識別配色、樣式、動畫的不統一問題

---

## 📊 文件概覽

### CSS 文件（7 個）
1. `base.css` - 全局樣式（307 行）
2. `editor.css` - 編輯器樣式（398 行）
3. `sidebar.css` - 側邊欄樣式（263 行）
4. `dashboard.css` - 儀表板樣式（286 行）
5. `class-management.css` - 班級管理（687 行）
6. `assignment-management.css` - 任務管理（1,563 行）
7. `format-editor.css` - 格式編輯器（72 行）

### JS 動態樣式文件（4 個）
1. `js/ui/dialog.js` - 對話框（內聯樣式）
2. `js/ui/toast.js` - Toast 通知（內聯樣式）
3. `js/ui/tooltip.js` - 工具提示（內聯樣式）
4. `js/teacher/format-template-page.js` - 模板卡片（內聯樣式）

**總顏色使用量**：463 處顏色定義（CSS 中）

---

## 🎨 配色系統分析

### 問題 1：藍色系統混亂 🚨

發現 **12 種不同的藍色**：

| 用途 | 顏色值 | 位置 | 問題 |
|------|--------|------|------|
| 主色（base.css） | `#3498db` | 按鈕、漸變 | ✅ 最常用 |
| 主色暗版 | `#2980b9` | 漸變、懸停 | ✅ 配套使用 |
| 輸入框焦點 | `#3b82f6` | editor.css | ❌ 應統一為 #3498db |
| 狀態標籤 | `#1976d2` | assignment-management.css | ❌ 應統一 |
| 狀態標籤 | `#2196f3` | assignment-management.css | ❌ 應統一 |
| Dialog 按鈕 | `#3b82f6`, `#2563eb` | dialog.js | ❌ 不一致 |
| 登入頁漸變 | `from-blue-600 to-indigo-600` | index.html | ❌ 混入靛藍色 |
| AI 反饋區 | `from-blue-50 to-transparent` | index.html | ✅ 背景可用 |
| 提示條 | `#60a5fa` | sidebar.css | ❌ 應統一 |

**建議**：
```css
/* 統一藍色系統 */
--primary-50: #e3f2fd;
--primary-100: #bbdefb;
--primary-500: #3498db;  /* 主色 */
--primary-600: #2980b9;  /* 深色 */
--primary-700: #1e6fa8;  /* 更深 */
```

---

### 問題 2：綠色系統不統一 🚨

發現 **8 種不同的綠色**：

| 用途 | 顏色值 | 位置 |
|------|--------|------|
| 成功狀態 | `#28a745` | class-management.css |
| 成功狀態 | `#4caf50` | assignment-management.css |
| 成功狀態 | `#27ae60` | assignment-management.css |
| Toast 成功 | `#4ade80` | toast.js |
| 按鈕漸變 | `#27ae60 → #229954` | 多處 |
| 按鈕漸變 | `#4caf50 → #388e3c` | 多處 |
| 按鈕漸變 | `#4caf50 → #66bb6a` | 多處 |

**建議**：
```css
/* 統一綠色系統（成功） */
--success-400: #4ade80;
--success-500: #10b981;  /* 主色 */
--success-600: #059669;  /* 深色 */
```

---

### 問題 3：紫色系統混亂 🚨

發現 **6 種不同的紫色漸變**：

| 用途 | 顏色值 | 位置 |
|------|--------|------|
| AI 評分按鈕 | `#9b59b6 → #8e44ad` | assignment-management.css |
| AI 評分按鈕 hover | `#8e44ad → #7d3c98` | assignment-management.css |
| Toast success | `#667eea → #764ba2` | toast.js |
| Dialog success | `#667eea → #764ba2` | 多處 |

**問題**：紫色用於兩個不同場景：
- AI 評分（`#9b59b6`）
- Toast 成功（`#667eea`）

**建議**：
```css
/* AI 相關專用紫色 */
--ai-purple-500: #9b59b6;
--ai-purple-600: #8e44ad;

/* Toast 統一使用藍綠漸變 */
--toast-gradient: linear-gradient(135deg, #667eea, #764ba2);
```

---

### 問題 4：紅色和橙色混用 🚨

| 用途 | 顏色值 | 位置 |
|------|--------|------|
| 錯誤/危險 | `#e74c3c` | 多處 |
| 錯誤/危險 | `#ef4444` | dialog.js |
| 警告 | `#f39c12` | 多處 |
| 警告 | `#f59e0b` | dialog.js |
| 警告 | `#ffc107` | 多處 |
| 警告 | `#ff9800` | 多處 |

**建議**：
```css
/* 統一錯誤色 */
--error-500: #ef4444;
--error-600: #dc2626;

/* 統一警告色 */
--warning-500: #f59e0b;
--warning-600: #d97706;
```

---

### 問題 5：灰色階不統一 🚨

發現至少 **15 種不同的灰色**：

| 顏色值 | 使用次數 | 用途 |
|--------|----------|------|
| `#f9fafb` | 多次 | 背景 |
| `#f8f9fa` | 多次 | 背景 |
| `#f3f4f6` | 多次 | 背景 |
| `#fafafa` | 多次 | 背景 |
| `#e5e7eb` | 多次 | 邊框 |
| `#ecf0f1` | 多次 | 邊框 |
| `#e0e0e0` | 多次 | 邊框 |
| `#ddd` | 多次 | 邊框 |
| `#7f8c8d` | 多次 | 文字 |
| `#95a5a6` | 多次 | 文字 |
| `#666` | 多次 | 文字 |
| `#2c3e50` | 多次 | 標題 |

**問題**：灰色階缺乏系統性，隨意使用

**建議**：
```css
/* 統一灰色階 */
--gray-50: #f9fafb;   /* 淺背景 */
--gray-100: #f3f4f6;  /* 背景 */
--gray-200: #e5e7eb;  /* 邊框淺 */
--gray-300: #d1d5db;  /* 邊框 */
--gray-400: #9ca3af;  /* 禁用 */
--gray-500: #6b7280;  /* 次要文字 */
--gray-600: #4b5563;  /* 文字 */
--gray-700: #374151;  /* 深文字 */
--gray-800: #1f2937;  /* 主文字 */
--gray-900: #111827;  /* 標題 */
```

---

## 🔘 按鈕樣式分析

### 問題 6：按鈕樣式高度不統一 🚨🚨🚨

#### CSS 中定義的按鈕：

1. **base.css**：
```css
.bg-blue-600 {
    background: #3498db !important;  /* 純色 */
}
.premium-blue-gradient {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);  /* 漸變 */
}
```

2. **assignment-management.css**：
```css
/* AI 評分按鈕 */
background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);  /* 紫色漸變 */

/* 提交按鈕 */
background: linear-gradient(135deg, #27ae60, #229954);  /* 綠色漸變 */

/* 警告按鈕 */
background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);  /* 橙色漸變 */

/* 刪除按鈕 */
background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);  /* 紅色漸變 */
```

3. **class-management.css**：
```css
background: #3498db;  /* 純色藍 */
background: #28a745;  /* 純色綠 */
```

#### JS 中動態生成的按鈕：

1. **dialog.js**：
```javascript
// 確認按鈕
background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);  /* 不同的藍！ */

// 危險按鈕
background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);  /* 不同的紅！ */

// 警告按鈕
background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);  /* 不同的橙！ */
```

2. **format-template-page.js**：
```javascript
// 查看按鈕
from-green-500 to-green-600  /* Tailwind 類名 */

// 編輯按鈕
from-blue-500 to-blue-600  /* Tailwind 類名 */
```

3. **index.html**：
```html
<!-- Google 登入按鈕 -->
border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50

<!-- Logo 區域 -->
bg-gradient-to-r from-blue-600 to-indigo-600  /* 混入靛藍！ */
```

### 統計：按鈕顏色變體

| 顏色 | 變體數量 | 位置 |
|------|----------|------|
| 藍色 | 8 種 | base.css, dialog.js, format-template-page.js, index.html |
| 綠色 | 6 種 | assignment-management.css, class-management.css |
| 紅色 | 4 種 | assignment-management.css, dialog.js |
| 橙色/黃色 | 5 種 | assignment-management.css, dialog.js |
| 紫色 | 4 種 | assignment-management.css, toast.js |

---

## ⚡ 動畫系統分析

### 問題 7：動畫時長不統一 🚨

| 時長 | 使用次數 | 位置 |
|------|----------|------|
| `0.15s` | 少量 | 某些懸停效果 |
| `0.2s` | 大量 | base.css, sidebar.css |
| `0.3s` | 大量 | sidebar.css, dialog.js |
| `0.5s` | 少量 | 某些過渡 |

**問題**：缺乏統一標準

**建議**：
```css
--duration-instant: 150ms;  /* 按鈕反饋 */
--duration-fast: 200ms;     /* 簡單過渡 */
--duration-normal: 300ms;   /* 標準動畫 */
--duration-slow: 500ms;     /* 複雜動畫 */
```

---

### 問題 8：動畫緩動函數不統一

| 緩動函數 | 使用頻率 |
|----------|----------|
| `ease` | 最常用 |
| `ease-out` | 常用 |
| `ease-in-out` | 少用 |
| `cubic-bezier()` | 少用 |

**建議**：統一使用 `ease` 或 `ease-out`

---

## 📐 布局系統分析

### 問題 9：間距系統不統一

**發現的間距值**：
- `4px`, `6px`, `8px`, `10px`, `12px`, `16px`, `24px`, `32px`
- 但使用隨意，無明確規律

**建議設計令牌**：
```css
--spacing-0: 0;
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
```

---

### 問題 10：圓角大小不統一

**發現的圓角值**：
- `4px`, `6px`, `8px`, `12px`, `16px`
- 使用混亂，無統一標準

**建議**：
```css
--radius-sm: 6px;   /* 小元素（按鈕、標籤） */
--radius-md: 8px;   /* 卡片、輸入框 */
--radius-lg: 12px;  /* 模態框、大卡片 */
--radius-xl: 16px;  /* 特殊用途 */
--radius-full: 9999px;  /* 圓形 */
```

---

## 🔍 詳細問題清單

### 🚨 高嚴重性問題（必須修復）

1. **藍色主色不統一**
   - 位置：base.css (#3498db) vs dialog.js (#3b82f6) vs editor.css (#3b82f6)
   - 影響：視覺不連貫
   - 修復：統一為 `#3498db`

2. **按鈕樣式混亂**
   - 位置：CSS 文件 vs JS 動態生成
   - 問題：有些用漸變，有些用純色，顏色值不同
   - 修復：建立統一的按鈕組件庫

3. **灰色階混亂**
   - 位置：所有文件
   - 問題：15+ 種不同的灰色，隨意使用
   - 修復：建立灰色階系統（50-900）

4. **綠色不統一**
   - 位置：class-management.css vs assignment-management.css
   - 問題：#28a745 vs #4caf50 vs #27ae60
   - 修復：統一為一種綠色

---

### ⚠️ 中嚴重性問題（建議修復）

5. **動畫時長不統一**
   - 0.15s, 0.2s, 0.3s, 0.5s 混用
   - 建議：統一為 150ms, 200ms, 300ms

6. **圓角大小隨意**
   - 4px, 6px, 8px, 12px, 16px
   - 建議：統一為 6px, 8px, 12px

7. **間距不成系統**
   - 隨意使用各種值
   - 建議：4px 倍數系統

8. **Toast 顏色過於鮮艷**
   - 當前：漸變渐變色（#667eea → #764ba2）
   - 建議：更柔和的漸變

---

### ℹ️ 低嚴重性問題（可選修復）

9. **陰影使用不一致**
   - base.css 中移除所有陰影
   - 但 toast.js 和 dialog.js 中使用陰影
   - 建議：統一陰影策略

10. **hover 效果不統一**
    - 有些用 `translateY(-1px)`
    - 有些用 `translateX(2px)`
    - 建議：統一使用 `translateY(-2px)` 或純色變化

---

## 📋 具體修復建議

### 階段 1：建立設計令牌系統（0.5-1 天）

創建 `css/design-tokens.css`：

```css
:root {
  /* ========== 主色調：藍色系統 ========== */
  --primary-50: #e3f2fd;
  --primary-100: #bbdefb;
  --primary-200: #90caf9;
  --primary-300: #64b5f6;
  --primary-400: #42a5f5;
  --primary-500: #3498db;   /* 主色 ⭐ */
  --primary-600: #2980b9;   /* 深色 */
  --primary-700: #1e6fa8;
  --primary-800: #1565c0;
  --primary-900: #0d47a1;
  
  /* ========== 語義色彩 ========== */
  --success-50: #ecfdf5;
  --success-500: #10b981;   /* 成功 */
  --success-600: #059669;
  
  --warning-50: #fef3c7;
  --warning-500: #f59e0b;   /* 警告 */
  --warning-600: #d97706;
  
  --error-50: #fef2f2;
  --error-500: #ef4444;     /* 錯誤 */
  --error-600: #dc2626;
  
  --info-50: #eff6ff;
  --info-500: #3b82f6;      /* 信息 */
  --info-600: #2563eb;
  
  /* ========== AI 專用紫色 ========== */
  --ai-purple-50: #f5f3ff;
  --ai-purple-500: #9b59b6;  /* AI 評分 */
  --ai-purple-600: #8e44ad;
  --ai-purple-700: #7d3c98;
  
  /* ========== 中性色階 ========== */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* ========== 間距系統（4px 倍數） ========== */
  --spacing-0: 0;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  
  /* ========== 圓角系統 ========== */
  --radius-sm: 6px;    /* 按鈕、標籤 */
  --radius-md: 8px;    /* 卡片、輸入框 */
  --radius-lg: 12px;   /* 模態框 */
  --radius-xl: 16px;   /* 大卡片 */
  --radius-full: 9999px;  /* 圓形 */
  
  /* ========== 動畫時長 ========== */
  --duration-instant: 150ms;  /* 按鈕反饋 */
  --duration-fast: 200ms;     /* 簡單過渡 */
  --duration-normal: 300ms;   /* 標準動畫 */
  --duration-slow: 500ms;     /* 複雜動畫 */
  
  /* ========== 動畫緩動 ========== */
  --ease-default: ease;
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* ========== 陰影系統（可選） ========== */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  
  /* ========== 字體大小 ========== */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  
  /* ========== 字體粗細 ========== */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

### 階段 2：統一按鈕組件庫（1 天）

創建 `css/components.css`：

```css
/* ========== 按鈕基礎樣式 ========== */
.btn {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  transition: all var(--duration-fast);
  cursor: pointer;
  border: none;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 主要按鈕（藍色） ========== */
.btn-primary {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

/* ========== 成功按鈕（綠色） ========== */
.btn-success {
  background: linear-gradient(135deg, var(--success-500), var(--success-600));
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--success-600), var(--success-700));
  transform: translateY(-1px);
}

/* ========== 危險按鈕（紅色） ========== */
.btn-danger {
  background: linear-gradient(135deg, var(--error-500), var(--error-600));
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--error-600), var(--error-700));
  transform: translateY(-1px);
}

/* ========== 警告按鈕（橙色） ========== */
.btn-warning {
  background: linear-gradient(135deg, var(--warning-500), var(--warning-600));
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--warning-600), var(--warning-700));
  transform: translateY(-1px);
}

/* ========== AI 專用按鈕（紫色） ========== */
.btn-ai {
  background: linear-gradient(135deg, var(--ai-purple-500), var(--ai-purple-600));
  color: white;
}

.btn-ai:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--ai-purple-600), var(--ai-purple-700));
  transform: translateY(-1px);
}

/* ========== 次要按鈕（灰色） ========== */
.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-200);
}

/* ========== 文本按鈕（無背景） ========== */
.btn-text {
  background: transparent;
  color: var(--primary-500);
  padding: var(--spacing-2) var(--spacing-3);
}

.btn-text:hover:not(:disabled) {
  background: var(--primary-50);
}

/* ========== 按鈕尺寸 ========== */
.btn-sm {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--text-sm);
}

.btn-md {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-base);
}

.btn-lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--text-lg);
}
```

---

### 階段 3：統一動畫效果（0.5-1 天）

創建 `css/animations.css`：

```css
/* ========== 淡入淡出 ========== */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.animate-fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-default);
}

/* ========== 滑入滑出 ========== */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slideUp var(--duration-normal) var(--ease-out);
}

.animate-slide-down {
  animation: slideDown var(--duration-normal) var(--ease-out);
}

/* ========== 彈性彈入 ========== */
@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounceIn var(--duration-normal) var(--ease-bounce);
}

/* ========== 加載動畫 ========== */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* ========== Ripple 點擊效果 ========== */
@keyframes ripple {
  from {
    opacity: 0.6;
    transform: scale(0);
  }
  to {
    opacity: 0;
    transform: scale(2);
  }
}

/* ========== Hover 效果 ========== */
.hover-lift {
  transition: transform var(--duration-fast);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-scale {
  transition: transform var(--duration-fast);
}

.hover-scale:hover {
  transform: scale(1.05);
}
```

---

### 階段 4：替換所有文件中的硬編碼顏色（1-2 天）

**需要修改的文件**：

1. ✅ `css/base.css` - 替換所有顏色為 CSS 變量
2. ✅ `css/editor.css` - 替換所有顏色
3. ✅ `css/sidebar.css` - 替換所有顏色
4. ✅ `css/dashboard.css` - 替換所有顏色
5. ✅ `css/class-management.css` - 替換所有顏色（88 處）
6. ✅ `css/assignment-management.css` - 替換所有顏色（260 處）
7. ✅ `css/format-editor.css` - 替換所有顏色
8. ✅ `js/ui/dialog.js` - 更新內聯樣式
9. ✅ `js/ui/toast.js` - 更新內聯樣式
10. ✅ `js/teacher/format-template-page.js` - 更新按鈕類名

---

## 🎯 設計系統文檔大綱

創建 `docs/DESIGN_SYSTEM.md`：

```markdown
# 時文寶鑑 - 設計系統規範

## 核心理念
- **扁平化**：無陰影，純邊框設計
- **簡約**：留白充足，信息層次清晰
- **優雅**：柔和配色，流暢動畫
- **專業**：符合教育場景的嚴謹風格

## 配色系統
[詳細配色卡片和使用場景]

## 按鈕系統
[所有按鈕類型的視覺展示和代碼]

## 動畫規範
[動畫時長、緩動函數標準]

## 間距和圓角
[設計令牌使用指南]

## 組件庫
[所有可重用組件]
```

---

## 📊 修復優先級和時間估算

| 階段 | 任務 | 嚴重性 | 預計時間 | 累計時間 |
|------|------|--------|----------|----------|
| 1 | 創建設計令牌 | 🚨 高 | 0.5-1 天 | 1 天 |
| 2 | 統一按鈕組件庫 | 🚨 高 | 1 天 | 2 天 |
| 3 | 創建動畫系統 | ⚠️ 中 | 0.5-1 天 | 3 天 |
| 4 | 替換硬編碼顏色 | 🚨 高 | 1-2 天 | 5 天 |
| 5 | 創建設計系統文檔 | ℹ️ 低 | 0.5 天 | 5.5 天 |
| 6 | 全面測試和微調 | ⚠️ 中 | 0.5-1 天 | 6.5 天 |

**總計時間**：5-6.5 天（約 1-1.5 週）

---

## 🎨 建議的配色方案

### 方案 A：保持藍色主調（推薦）

**主色**：`#3498db` （清新的天藍色）  
**輔助色**：
- 成功：`#10b981`（翠綠）
- 警告：`#f59e0b`（琥珀）
- 錯誤：`#ef4444`（珊瑚紅）
- AI：`#9b59b6`（優雅紫）

**優點**：
- 符合"時文"的清新文雅氣質
- 已有大量代碼使用此色系
- 視覺舒適，適合長時間使用

---

### 方案 B：改為靛藍主調（備選）

**主色**：`#667eea` （深邃的靛藍）  
**優點**：更沉穩、更專業
**缺點**：需要調整大量代碼

---

### 方案 C：改為紫色主調（備選）

**主色**：`#8b5cf6` （優雅的紫色）  
**優點**：更有文化氣息
**缺點**：與 AI 功能的紫色衝突

---

## ✅ 推薦行動計劃

### 第 1 步：確認設計方向（今天）
- 選擇配色方案（A/B/C）
- 確認按鈕風格（漸變 vs 純色）
- 確認動畫風格（subtle vs 明顯）

### 第 2 步：建立設計基礎（1-2 天）
- 創建 `design-tokens.css`
- 創建 `components.css`
- 創建 `animations.css`

### 第 3 步：逐文件替換（2-3 天）
- 從小文件開始（format-editor.css）
- 逐步替換大文件（assignment-management.css）
- 更新 JS 動態樣式

### 第 4 步：測試和調優（1 天）
- 全面視覺檢查
- 動畫流暢度測試
- 跨瀏覽器驗證

---

## 🎬 下一步

**需要您決定**：

1. **配色方案**：保持藍色（A）？改為靛藍（B）？改為紫色（C）？
2. **按鈕風格**：全部用漸變？還是主要按鈕用漸變，次要用純色？
3. **動畫風格**：subtle（輕微）？moderate（適中）？prominent（明顯）？
4. **是否保留扁平化**：繼續無陰影設計？還是加入輕微陰影？

**我可以幫您**：
- 立即創建設計令牌文件
- 生成完整的配色樣本
- 設計統一的按鈕組件庫
- 創建流暢的動畫系統

請告訴我您的偏好，我會馬上開始實施！🎨

---

**最後更新**：2025-10-22  
**審計者**：AI Assistant

