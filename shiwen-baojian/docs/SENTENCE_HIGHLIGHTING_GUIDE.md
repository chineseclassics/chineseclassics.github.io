# 句子級聯動功能使用指南

> **時文寶鑑** - AI 反饋句子級精準定位

**版本**：1.0  
**創建日期**：2025-10-19  
**核心功能**：點擊問題 → 查看原句 → 精準修改

---

## 🎯 功能概述

當 AI 反饋指出"第 X 句有問題"時，學生可以**點擊問題條目**，系統會：

1. ✅ **顯示句子提示條** - 在頁面頂部顯示完整的句子內容
2. ✅ **高亮原文句子** - 在編輯器中用黃色背景高亮該句
3. ✅ **自動滾動定位** - 滾動到該段落並居中顯示
4. ✅ **臨時顯示** - 5 秒後提示條和高亮自動消失

---

## 🖱️ 使用方法

### 桌面端（側邊欄）

```
步驟 1：撰寫並獲取 AI 反饋
  在引言編輯器輸入內容
  點擊 [AI 反饋] 按鈕
  右側「賈雨村」顯示反饋

步驟 2：查看具體問題
  側邊欄顯示：
  ┌─ 具體問題 (3) ────┐
  │ 1 第1句：... [👁️] │ ← hover 顯示眼睛圖標
  │ 2 第2句：... [👁️] │
  │ 3 第3句：... [👁️] │
  └────────────────────┘

步驟 3：點擊問題定位原句
  點擊"2 第2句：..."
    ↓
  頁面頂部出現黃色提示條：
  ┌─────────────────────────────┐
  │ 2 第2句：「作為書中核心角色...」│
  │                      [✕ 關閉] │
  └─────────────────────────────┘
    ↓
  編輯器中該句黃色高亮：
  ┌─ 引言 ────────────┐
  │ 句1: xxx          │
  │ 🟡 句2高亮 🟡     │ ← 黃色背景
  │ 句3: xxx          │
  └───────────────────┘

步驟 4：修改內容
  對照提示條和高亮，修改句子
  5 秒後提示條和高亮自動消失
```

---

### 移動端（內聯反饋）

```
步驟 1：撰寫並獲取 AI 反饋
  在引言編輯器輸入內容
  點擊 [AI 反饋] 按鈕
  引言下方展開反饋區域

步驟 2：查看具體問題
  ┌─ 針對上方「引言」的 AI 反饋 ─┐
  │ 具體問題 (3)                 │
  │ 2 第2句：缺少論文主張         │ ← 點擊
  └──────────────────────────────┘

步驟 3：定位原句
  向上滾動到引言編輯器
  看到該句黃色高亮
  對照修改
```

---

## 🎨 視覺效果

### 句子提示條

**位置**：頁面頂部中央（fixed）  
**樣式**：黃色背景 + 黃色邊框 + 陰影  
**內容**：
- 句子編號圓圈（黃色）
- "第 X 句："標籤
- 完整句子內容
- 關閉按鈕

**動畫**：
- 出現：下滑淡入
- 消失：淡出

---

### 編輯器句子高亮

**效果**：黃色背景（`#fef08a`）  
**持續**：3 秒自動消失  
**方式**：
- 優先：Quill 格式化（`background` 屬性）
- 備用：DOM 樣式（如果 Quill 不可用）

---

### 側邊欄問題條目

**默認狀態**：
- 灰色背景
- 灰色邊框

**Hover 狀態**：
- 黃色淡背景
- 黃色邊框
- 左側黃色豎線（動畫）
- 右側眼睛圖標（淡入）
- 輕微右移 2px

**點擊效果**：
- 觸發句子定位
- 顯示提示條
- 高亮原句

---

## 🔧 技術實現

### 句子解析

```javascript
function parseSentences(htmlContent) {
    // 移除 HTML 標籤
    const plainText = stripHTML(htmlContent);
    
    // 按句號、問號、感嘆號分割
    const sentences = plainText
        .split(/[。！？；]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    return sentences;
}
```

**支持的句子分隔符**：
- `。` - 中文句號
- `！` - 感嘆號
- `？` - 問號
- `；` - 分號

---

### Quill 編輯器高亮

```javascript
function highlightInEditor(editorInstance, sentenceText) {
    const quill = editorInstance.quill;
    
    // 查找句子位置
    const position = findSentenceInEditor(quill, sentenceText);
    
    // 應用黃色背景
    quill.formatText(position.index, position.length, {
        'background': '#fef08a'  // yellow-200
    });
    
    // 3 秒後移除
    setTimeout(() => {
        quill.removeFormat(position.index, position.length);
    }, 3000);
}
```

---

### 提示條顯示

```javascript
function showSentenceTooltip(paragraphId, sentenceNumber, sentenceText) {
    const tooltip = document.createElement('div');
    tooltip.id = 'sentence-tooltip';
    tooltip.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-40';
    
    tooltip.innerHTML = `
        <div class="bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-lg px-4 py-3">
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                    ${sentenceNumber}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-yellow-900">第 ${sentenceNumber} 句：</p>
                    <p class="text-sm text-yellow-800">${sentenceText}</p>
                </div>
                <button onclick="this.closest('#sentence-tooltip').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // 5 秒後自動移除
    setTimeout(() => tooltip.remove(), 5000);
}
```

---

## ✅ 功能清單

### 已實現 ✅

- [x] 句子解析（按句號分割）
- [x] 句子提示條（頁面頂部）
- [x] 問題條目可點擊
- [x] Hover 顯示眼睛圖標
- [x] 自動滾動到段落
- [x] Quill 編輯器高亮
- [x] 備用 DOM 高亮方案
- [x] 臨時顯示（5 秒自動消失）
- [x] 手動關閉提示條
- [x] 響應式適配（桌面 + 移動端）

### 待優化 📝

- [ ] 句子級精確高亮（當前整句高亮）
- [ ] 支持多句子同時高亮
- [ ] 句子編號永久顯示（可選）
- [ ] 更複雜的句子邊界檢測（引號、括號內的句號）

---

## 🧪 測試步驟

### 測試 1：基本聯動

1. 在引言編輯器輸入：
   ```
   《紅樓夢》的藝術成就，主要體現在其生動立體的人物塑造上。
   作為書中核心角色，林黛玉的形象更是作者傾盡筆墨。
   ```

2. 點擊 [AI 反饋]

3. 在側邊欄看到問題列表（假設有"第 2 句"的問題）

4. **Hover 問題條目** - 應該看到：
   - 背景變黃色
   - 左側黃色豎線
   - 右側眼睛圖標

5. **點擊問題條目** - 應該看到：
   - 頁面頂部出現黃色提示條
   - 提示條顯示："第 2 句：作為書中核心角色..."
   - 編輯器滾動到引言位置
   - 第 2 句黃色高亮（如果成功）

6. **5 秒後** - 提示條和高亮自動消失

---

### 測試 2：移動端

1. 縮小瀏覽器窗口（< 1024px）
2. 重複上述步驟
3. 反饋應該在段落下方內聯展開
4. 點擊問題仍然有聯動效果

---

## 🐛 可能的問題

### 問題 1：句子沒有高亮

**原因**：Quill 編輯器實例未正確獲取

**檢查**：
- 打開控制台，查看是否有錯誤
- 看是否有"無法獲取編輯器實例"的警告

**備用方案**：
- 系統會自動使用 DOM 方式
- 整個段落變黃色（不是精確到句子）

---

### 問題 2：提示條沒有顯示

**原因**：句子解析失敗

**檢查**：
- 控制台是否有"句子編號超出範圍"錯誤
- 確認內容確實有句號分隔

---

### 問題 3：句子編號不匹配

**原因**：分割邏輯與 AI 的分割不一致

**解決**：
- AI 和前端使用相同的分割邏輯
- 都按 `。！？；` 分割

---

## 🎓 設計理念

### 為什麼選擇這個方案？

1. **不干擾編輯** ✅
   - 高亮是臨時的
   - 不會留下永久標記
   - 不影響正常寫作

2. **清晰直觀** ✅
   - 提示條顯示完整句子
   - 黃色高亮一眼看到
   - 視覺聯繫強

3. **實現可行** ✅
   - 不需要修改 Quill 內核
   - 利用現有 API
   - 有備用方案

4. **用戶友好** ✅
   - 點擊即可，無需手動數句子
   - 自動滾動，無需尋找
   - 自動消失，無需手動關閉

---

**開發者**：時文寶鑑開發團隊  
**最後更新**：2025-10-19

