# 老師自定義格式 + AI 輔助生成 - 設計總結

## 🎯 核心設計理念

**統一 Quill 編輯器界面**：所有格式操作都在一個 Quill 編輯器中完成

---

## 📋 三種使用模式

### 模式 A：直接使用系統格式（最簡單）

```
老師操作：
1. 選擇「紅樓夢論文格式」
2. 點擊「加載預覽」
3. Quill 顯示人類可讀版本
4. 點擊「直接保存使用」

後台處理：
- 不調用 AI
- 直接使用系統格式 JSON
- 保存到 format_specifications 表
```

---

### 模式 B：基於系統格式增量修改（最常用）

```
老師操作：
1. 選擇「紅樓夢論文格式」
2. 點擊「加載預覽」
3. Quill 顯示完整格式說明
4. 老師直接在 Quill 中添加/修改：
   "總字數 1800-2000 字
    必須分析林黛玉和薛寶釵外貌"
5. 點擊「AI 優化」
6. AI 優化後替換 Quill 內容（結構化、條理化）
7. 老師確認或繼續修改
8. 點擊「保存」

後台處理：
- AI 調用一次，生成雙重輸出：
  - human_readable：顯示在 Quill
  - format_json（增量）：只包含新增部分
- 前端合併：系統格式 + AI 增量 = 完整 JSON
- 保存完整 JSON 到數據庫
```

---

### 模式 C：從零開始（完全自定義）

```
老師操作：
1. 選擇「從零開始」
2. Quill 為空，老師輸入完整要求：
   "我要求學生寫得真誠、有深度
    論點清晰，論證充分
    聯繫生活經驗
    1000-1500 字"
3. 點擊「AI 優化」
4. AI 優化後替換 Quill 內容（結構化）
5. 老師確認或繼續修改
6. 點擊「保存」

後台處理：
- AI 調用一次，生成雙重輸出：
  - human_readable：顯示在 Quill
  - format_json（完整）：包含所有必需字段
- 保存完整 JSON 到數據庫
```

---

## 🔄 AI 雙重輸出機制

### Edge Function 輸出結構

```json
{
  "human_readable": "【段落結構】\n一、引言段\n...",
  "format_json": {
    "metadata": {...},
    "paragraph_types": {...},
    "constraints": {...},
    "content_requirements": [...]
  },
  "mode": "incremental",
  "understanding_summary": "我理解您要求：..."
}
```

### 前端處理流程

```javascript
// 1. AI 優化
const result = await callFormatSpecGenerator({...});

// 2. 顯示人類可讀版本
quill.setText(result.human_readable);

// 3. 緩存 JSON（關鍵！）
cachedFormatJSON = result.format_json;

// 4. 保存時直接使用緩存
await saveFormat(cachedFormatJSON);
```

**優點**：
- ✅ 一次 AI 調用（快速、省錢）
- ✅ 確保一致性（看到的就是保存的）
- ✅ 避免重複調用

---

## 🔒 強制優化邏輯

### 規則

```
模式 A（直接使用系統格式）
  → 不需要 AI 優化
  → 「保存」按鈕始終可用

模式 B/C（有修改/自定義）
  → 必須經過 AI 優化才能保存
  → 修改後「保存」按鈕變灰
  → 優化後「保存」按鈕可用
```

### 用戶體驗

```
老師修改了內容
  ↓
Quill 內容變化 → hasUserEdited = true
  ↓
切換到增量/自定義模式
  ↓
禁用「保存」按鈕，顯示「AI 優化」按鈕
  ↓
老師點擊「AI 優化」
  ↓
AI 生成雙重輸出（3-5 秒）
  ↓
Quill 顯示優化結果，JSON 緩存
  ↓
啟用「保存」按鈕
  ↓
老師確認後點擊「保存」
  ↓
使用緩存的 JSON 保存
```

### 自動優化（可選）

```javascript
// 點擊「保存」時自動觸發優化
async function saveFormat() {
  if (!hasBeenOptimized && currentMode !== 'direct') {
    const confirm = await showDialog({
      title: '需要優化格式',
      message: '是否立即優化並保存？'
    });
    
    if (confirm) {
      await optimizeWithAI();  // 自動優化
      await actualSave();      // 使用緩存的 JSON
    }
  }
}
```

---

## 🎨 用戶界面設計

### 格式選擇頁面（卡片式）

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📚 紅樓夢論文   │  │ 📝 議論文格式   │  │ 🎯 從零開始     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ 文學分析論文     │  │ 說理論證        │  │ 完全自定義      │
│ • 引言 5 要素   │  │ • 引言 3 要素   │  │ AI 協助創建     │
│ • 正文細讀分析   │  │ • 正文分論點    │  │                 │
│                 │  │                 │  │                 │
│ 👁️ 加載預覽    │  │ 👁️ 加載預覽    │  │ ✓ 選擇此項      │
│ ✓ 選擇此格式    │  │ ✓ 選擇此格式    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 編輯器頁面

```
┌────────────────────────────────────────────┐
│ 📝 格式編輯器                               │
├────────────────────────────────────────────┤
│ 1. 選擇格式：                               │
│    [紅樓夢論文格式 ▼]  [👁️ 加載預覽]      │
│    或 [ 從零開始 ]                          │
├────────────────────────────────────────────┤
│ 2. Quill 編輯器：                           │
│ ┌────────────────────────────────────────┐ │
│ │ 【段落結構】                           │ │
│ │ 一、引言段                             │ │
│ │ ...                                    │ │
│ │                                        │ │
│ │ （老師可在此修改/添加）                 │ │
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ 3. 操作：                                   │
│    [🤖 AI 優化]  [✓ 保存]  [🔄 重新開始]  │
│                                            │
│ 💡 提示：內容修改後，需先 AI 優化才能保存   │
└────────────────────────────────────────────┘
```

---

## 📊 數據流圖

```
┌─────────────────────────────────────────────┐
│ 老師選擇系統格式 / 從零開始                  │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 加載預覽 → Quill 顯示人類可讀版本            │
│ （系統格式）或空白（從零開始）               │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 老師編輯內容（直接在 Quill 中）              │
│ hasUserEdited = true                         │
│ currentMode = 'incremental' 或 'custom'      │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 點擊「AI 優化」                              │
│ → Edge Function: format-spec-generator       │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ AI 生成雙重輸出：                            │
│ • human_readable → 顯示在 Quill             │
│ • format_json → 緩存到前端變量              │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 老師確認後點擊「保存」                       │
│ → 使用 cachedFormatJSON                      │
│ → 保存到 format_specifications 表            │
└─────────────────────────────────────────────┘
```

---

## ✅ 關鍵技術點

### 1. 模式識別

```javascript
let currentMode = null;  // 'direct' | 'incremental' | 'custom'

// 加載預覽
function loadPreview(templateId) {
  currentMode = 'direct';
  quill.setText(humanReadableFormat);
}

// 內容變化
quill.on('text-change', () => {
  if (currentMode === 'direct') {
    currentMode = 'incremental';  // 變成增量模式
  }
  hasBeenOptimized = false;
});

// 從零開始
function startFromScratch() {
  currentMode = 'custom';
  quill.setText('');
}
```

### 2. JSON 緩存

```javascript
let cachedFormatJSON = null;

// AI 優化後緩存
async function optimizeWithAI() {
  const result = await callAI();
  quill.setText(result.human_readable);
  cachedFormatJSON = result.format_json;  // ← 緩存
  hasBeenOptimized = true;
}

// 內容修改後清除緩存
quill.on('text-change', () => {
  if (hasBeenOptimized) {
    cachedFormatJSON = null;  // ← 清除
    hasBeenOptimized = false;
  }
});

// 保存時使用緩存
async function saveFormat() {
  const formatToSave = currentMode === 'direct'
    ? systemFormatJSON
    : cachedFormatJSON;  // ← 使用緩存
  
  await supabase.from('format_specifications').insert({
    spec_json: formatToSave
  });
}
```

### 3. 格式轉換函數

```javascript
// JSON → 人類可讀
function formatJSONToHumanReadable(json) {
  let text = '【段落結構】\n\n';
  text += '一、引言段\n';
  text += '必須包含 5 個要素：\n';
  json.paragraph_types.introduction.required_elements.forEach((elem, i) => {
    text += `  ${i+1}. ${elem.name}\n`;
  });
  // ...
  return text;
}
```

---

## 📝 MVP 範圍

### ✅ 必須實現

1. 統一 Quill 編輯器界面
2. 三種模式支持（A/B/C）
3. AI 雙重輸出機制
4. 強制優化邏輯
5. JSON 緩存機制
6. 格式 JSON ↔ 人類可讀轉換
7. 系統格式預覽
8. 格式保存和管理

### ⏸️ 第二階段

1. Word 導出功能（MVP 可直接從 Quill 複製）
2. 格式分享功能
3. 格式版本歷史
4. 更多系統內置格式

---

## 🎯 成功標準

1. ✅ 老師能在 5 分鐘內創建自定義格式
2. ✅ 三種模式流轉自然，無需學習
3. ✅ AI 優化準確率 > 85%
4. ✅ AI 響應時間 < 5 秒
5. ✅ 老師滿意度 > 4/5

---

**最後更新**：2025-10-19  
**版本**：1.0  
**狀態**：設計定稿，準備開發

