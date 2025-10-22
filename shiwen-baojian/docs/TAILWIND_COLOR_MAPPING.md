# Tailwind CSS 配色映射表 - 青灰雅士方案

> 將所有亮色 Tailwind 類名替換為青灰雅士配色系統

## 🎨 核心原則

- **主色（藍色）** → **青灰色**
- **成功（綠色）** → **青松色**  
- **錯誤（紅色）** → **緋紅色**
- **警告（黃色/橙色）** → **秋香色**
- **中性色** → **墨分五色**

---

## 📋 詳細映射表

### 主色系統（藍色 → 青灰色）

| 原 Tailwind 類名 | 新類名（使用設計令牌） | 說明 |
|-----------------|---------------------|------|
| `bg-blue-50` | `bg-stone-50` | 最淺背景 |
| `bg-blue-100` | `bg-stone-100` | 淺背景 |
| `bg-blue-500` | `bg-stone-500` | 主色 |
| `bg-blue-600` | `bg-stone-600` | 主色（深） |
| `bg-blue-700` | `bg-stone-700` | 更深 |
| `text-blue-500` | `text-stone-600` | 主色文字 |
| `text-blue-600` | `text-stone-700` | 深色文字 |
| `border-blue-500` | `border-stone-500` | 主色邊框 |
| `hover:bg-blue-50` | `hover:bg-stone-100` | hover 背景 |
| `hover:text-blue-600` | `hover:text-stone-700` | hover 文字 |
| `hover:border-blue-500` | `hover:border-stone-600` | hover 邊框 |

### 成功色系統（綠色 → 青松色）

| 原 Tailwind 類名 | 新類名 | 說明 |
|-----------------|-------|------|
| `bg-green-50` | `bg-emerald-50` | 最淺背景 |
| `bg-green-100` | `bg-emerald-100` | 淺背景 |
| `bg-green-500` | `bg-emerald-600` | 成功主色 |
| `bg-green-600` | `bg-emerald-700` | 成功深色 |
| `text-green-500` | `text-emerald-600` | 成功文字 |
| `text-green-600` | `text-emerald-700` | 成功深文字 |
| `border-green-500` | `border-emerald-600` | 成功邊框 |
| `hover:bg-green-50` | `hover:bg-emerald-100` | hover 背景 |
| `hover:text-green-600` | `hover:text-emerald-700` | hover 文字 |

### 錯誤色系統（紅色 → 緋紅色）

| 原 Tailwind 類名 | 新類名 | 說明 |
|-----------------|-------|------|
| `bg-red-50` | `bg-rose-50` | 最淺背景 |
| `bg-red-100` | `bg-rose-100` | 淺背景 |
| `bg-red-500` | `bg-rose-600` | 錯誤主色 |
| `bg-red-600` | `bg-rose-700` | 錯誤深色 |
| `text-red-500` | `text-rose-600` | 錯誤文字 |
| `text-red-600` | `text-rose-700` | 錯誤深文字 |
| `border-red-500` | `border-rose-600` | 錯誤邊框 |

### 警告色系統（黃色/橙色 → 秋香色）

| 原 Tailwind 類名 | 新類名 | 說明 |
|-----------------|-------|------|
| `bg-yellow-50` | `bg-amber-50` | 最淺背景 |
| `bg-yellow-100` | `bg-amber-100` | 淺背景 |
| `bg-yellow-500` | `bg-amber-600` | 警告主色 |
| `text-yellow-50` | `text-amber-50` | 淺色文字 |
| `text-yellow-100` | `text-amber-100` | 淺色文字 |
| `text-yellow-500` | `text-amber-600` | 警告文字 |

### AI 專用色（賈雨村 - 栗褐色）

| 用途 | Tailwind 類名 | 說明 |
|------|-------------|------|
| AI 背景 | `bg-amber-700` | 栗褐色背景 |
| AI 文字 | `text-amber-50` | 淺色文字（高對比） |
| AI 圖標 | `text-amber-200` | 圖標顏色 |

---

## 🔄 批量替換指令

### 主色（藍色 → 青灰色）

```bash
# 背景色
bg-blue-50 → bg-stone-50
bg-blue-100 → bg-stone-100
bg-blue-500 → bg-stone-500
bg-blue-600 → bg-stone-600
bg-blue-700 → bg-stone-700

# 文字色
text-blue-500 → text-stone-600
text-blue-600 → text-stone-700

# 邊框色
border-blue-500 → border-stone-500
border-blue-600 → border-stone-600
```

### 成功色（綠色 → 青松色）

```bash
bg-green-50 → bg-emerald-50
bg-green-500 → bg-emerald-600
bg-green-600 → bg-emerald-700
text-green-500 → text-emerald-600
text-green-600 → text-emerald-700
border-green-500 → border-emerald-600
```

### 錯誤色（紅色 → 緋紅色）

```bash
bg-red-50 → bg-rose-50
bg-red-500 → bg-rose-600
text-red-500 → text-rose-600
border-red-500 → border-rose-600
```

### 警告色（黃色 → 秋香色）

```bash
bg-yellow-50 → bg-amber-50
bg-yellow-100 → bg-amber-100
bg-yellow-500 → bg-amber-600
text-yellow-50 → text-amber-50
text-yellow-100 → text-amber-100
text-yellow-500 → text-amber-600
```

---

## 📝 特殊場景處理

### Google 登入按鈕

```html
<!-- ❌ 原樣式 -->
<i class="fab fa-google text-xl text-red-500"></i>

<!-- ✅ 新樣式（保留 Google 紅色） -->
<i class="fab fa-google text-xl text-rose-600"></i>
```

### 賈雨村 AI 面板

```html
<!-- ✅ 使用栗褐色 -->
<div class="bg-amber-700">
  <i class="fas fa-user-tie text-xl text-amber-100"></i>
  <h3 class="font-bold text-xl text-amber-50">賈雨村說</h3>
</div>
```

### 成功提示

```html
<!-- ❌ 原樣式 -->
<i class="fas fa-check-circle text-green-500"></i>

<!-- ✅ 新樣式 -->
<i class="fas fa-check-circle text-emerald-600"></i>
```

---

## 🎯 需要替換的文件清單

### HTML 文件
- [ ] `index.html`
- [ ] `test-format-spec-generator.html`
- [ ] `test-google-auth.html`
- [ ] `test-layout.html`

### JavaScript 文件
- [ ] `js/app.js`
- [ ] `js/teacher/format-template-page.js`
- [ ] `js/teacher/assignment-creator.js`
- [ ] `js/teacher/teacher-dashboard.js`
- [ ] `js/teacher/grading-ui.js`
- [ ] `js/teacher/grading-queue.js`
- [ ] `js/student/essay-writer.js`
- [ ] `js/ai/feedback-requester.js`
- [ ] `js/ai/feedback-renderer.js`
- [ ] `js/ai/sentence-highlighter.js`
- [ ] `js/features/anti-cheat.js`

---

## ✅ 驗證清單

替換完成後，檢查：

- [ ] 所有按鈕使用青灰色系統
- [ ] 成功提示使用青松色
- [ ] 錯誤提示使用緋紅色
- [ ] 警告提示使用秋香色
- [ ] AI 面板使用栗褐色
- [ ] Google 圖標保留適當的紅色調

---

**更新時間**：2025-10-22  
**配色方案**：青灰雅士  
**設計令牌**：`design-tokens.css`

