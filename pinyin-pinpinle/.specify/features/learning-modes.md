# 學習模式系統

## 需求摘要

提供兩種學習模式：自由模式和專注模式，讓學生可以在開放探索或受控環境中學習拼音，支持不同的教學場景和學習需求。

## 用戶故事

作為一名幼兒園學生，我希望能夠選擇不同的學習模式——自由探索所有拼音或專注學習特定主題，這樣我可以根據自己的學習階段和興趣選擇合適的學習方式。

作為一名幼兒園教師，我希望能夠創建主題化的內容包，讓學生在受控範圍內學習特定拼音和詞彙，這樣我可以更好地配合教學進度和主題教學。

## 核心功能

### 1. 模式選擇

#### 1.1 啟動界面

**進入方式**：App 啟動時顯示內容包選擇器

**界面元素**：
- App 標題：「拼音拼拼樂」
- 設置圖標：點擊進入設置，長按進入編輯模式
- 卡片列表：可選擇的學習模式

#### 1.2 卡片類型

**卡片 1 - 自由模式（固定）**
- 圖標：🌈 彩虹或 🏰 城堡
- 標題：「自由模式」或「拼音王國」
- 描述：「探索所有拼音組合」
- 點擊行為：進入自由學習模式

**卡片 2+ - 專注模式（動態）**
- 圖標：自定義 emoji（如 🚗 交通工具）
- 標題：內容包名稱
- 副標題：類型標籤（主題單元 / 專項練習）
- 點擊行為：進入專注學習模式

### 2. 自由模式

#### 2.1 模式特點

**拼音範圍**：所有聲母、韻母、整體認讀音節

**詞彙來源**：系統內置詞彙 + 所有自定義內容包

**學習目標**：開放探索，培養興趣

**適用場景**：
- 拼音學習初期探索階段
- 複習已學拼音
- 自由探索學習

#### 2.2 拼音選擇區顯示

**標籤結構**：
- [聲母]：23 個聲母全部顯示
- [韻母]：24 個韻母全部顯示
- [整體認讀]：16 個整體認讀音節全部顯示

**傳送帶內容**：無過濾，顯示所有拼音

#### 2.3 出字出詞邏輯

**查詢範圍**：
```javascript
// 偽代碼
function queryCharacters(pinyin, mode = 'free') {
  if (mode === 'free') {
    // 查詢所有數據
    return [
      ...system_data.characters,
      ...custom_packs.flatMap(pack => pack.characters)
    ].filter(char => char.pinyin === pinyin);
  }
}
```

**顯示結果**：所有匹配的漢字（來自系統和所有自定義包）

### 3. 專注模式

#### 3.1 模式特點

**拼音範圍**：僅顯示內容包的 scope 範圍

**詞彙來源**：僅限於選定的內容包

**學習目標**：受控學習，配合教學進度

**適用場景**：
- 主題教學（如「交通工具」）
- 專項練習（如「b p m f 練習」）
- 跟隨教學大綱進度

#### 3.2 拼音選擇區過濾

**範圍來源**：內容包的 `scope` 對象

**示例數據**：
```javascript
{
  pack_name: "交通工具",
  scope: {
    shengmu: ["b", "sh", "q", "ch", "h"],
    yunmu: ["a", "i", "e", "uo"],
    zhengti: ["shi"]
  }
}
```

**傳送帶內容**：
- [聲母] 標籤：僅顯示 `["b", "sh", "q", "ch", "h"]`
- [韻母] 標籤：僅顯示 `["a", "i", "e", "uo"]`
- [整體認讀] 標籤：僅顯示 `["shi"]`

#### 3.3 範圍推導機制

**推導時機**：
- 創建新內容包時
- 導入 Excel 後
- 手動添加字詞後
- 編輯拼音後

**推導算法**：
```javascript
function deriveScope(characters, words) {
  const scope = {
    shengmu: new Set(),
    yunmu: new Set(),
    zhengti: new Set()
  };
  
  // 從字符中提取拼音
  characters.forEach(char => {
    const { initial, final } = parsePinyin(char.pinyin);
    if (initial) scope.shengmu.add(initial);
    if (final) scope.yunmu.add(final);
  });
  
  // 從詞語中提取拼音
  words.forEach(word => {
    const syllables = word.pinyin.split(' ');
    syllables.forEach(syllable => {
      const { initial, final } = parsePinyin(syllable);
      if (initial) scope.shengmu.add(initial);
      if (final) scope.yunmu.add(final);
    });
  });
  
  return {
    shengmu: Array.from(scope.shengmu).sort(),
    yunmu: Array.from(scope.yunmu).sort(),
    zhengti: Array.from(scope.zhengti).sort()
  };
}
```

**拼音解析示例**：
```javascript
parsePinyin("qì") 
// → { initial: "q", final: "i", tone: "4" }

parsePinyin("bā shì") 
// → [{ initial: "b", final: "a", tone: "1" }, { initial: "sh", final: "i", tone: "4" }]
```

#### 3.4 出字出詞邏輯

**查詢範圍**：
```javascript
// 偽代碼
function queryCharacters(pinyin, packId) {
  // 僅查詢選定包的數據
  const pack = custom_packs.find(p => p.pack_id === packId);
  if (!pack) return [];
  
  return pack.characters.filter(char => char.pinyin === pinyin);
}

function queryWords(baseChar, packId) {
  const pack = custom_packs.find(p => p.pack_id === packId);
  if (!pack) return [];
  
  return pack.words.filter(word => word.base_char === baseChar);
}
```

**顯示結果**：僅顯示來自選定內容包的漢字和詞語

### 4. 界面切換

#### 4.1 模式狀態管理

**狀態對象**：
```javascript
{
  currentMode: 'free' | 'focus',
  selectedPackId: null | 'uuid-pack-1',
  scope: null | { shengmu: [...], yunmu: [...], zhengti: [...] }
}
```

**進入自由模式**：
```javascript
function enterFreeMode() {
  state.currentMode = 'free';
  state.selectedPackId = null;
  state.scope = null;
  // 重新渲染拼音選擇區（無過濾）
  renderPinyinSelector(null);
}
```

**進入專注模式**：
```javascript
function enterFocusMode(packId) {
  state.currentMode = 'focus';
  state.selectedPackId = packId;
  const pack = getPackById(packId);
  state.scope = pack.scope;
  // 重新渲染拼音選擇區（應用過濾）
  renderPinyinSelector(pack.scope);
}
```

#### 4.2 導航邏輯

**返回包選擇器**：
- 點擊頂部返回按鈕
- 顯示內容包選擇器界面
- 保留當前選擇狀態（可選）

**切換內容包**：
- 在學習界面中提供切換按鈕（可選）
- 或返回包選擇器重新選擇

### 5. 視覺差異

#### 5.1 模式指示

**自由模式**：
- 頂部顯示：🏰「拼音王國」或「自由模式」
- 背景色：彩虹漸變或明亮色調
- 圖標：彩虹、城堡等開放性元素

**專注模式**：
- 頂部顯示：內容包圖標 + 名稱
- 背景色：主題色（如藍色「交通工具」）
- 圖標：內容包指定 emoji

#### 5.2 拼音卡片狀態

**正常卡片**：
- 完整顏色
- 正常大小

**已用卡片**（可選）：
- 半透明效果
- 提示學生已用過

**不可用卡片**（專注模式下）：
- 灰色顯示
- 不顯示或禁用

### 6. 技術規範

#### 6.1 狀態管理模塊

**類名**：`LearningModeManager`

**職責**：
- 管理當前模式狀態
- 處理模式切換邏輯
- 提供範圍過濾接口

**接口**：
```javascript
class LearningModeManager {
  constructor() {
    this.state = {
      currentMode: 'free',
      selectedPackId: null,
      scope: null
    };
  }
  
  enterFreeMode() { }
  enterFocusMode(packId) { }
  getCurrentScope() { }
  isPinyinAvailable(pinyin) { }
}
```

#### 6.2 拼音選擇區渲染

**過濾邏輯**：
```javascript
function filterPinyin(pinyinList, scope) {
  if (!scope) {
    // 自由模式：不過濾
    return pinyinList;
  }
  
  // 專注模式：應用過濾
  return pinyinList.filter(pinyin => {
    const { type, value } = categorizePinyin(pinyin);
    if (type === 'shengmu') return scope.shengmu.includes(value);
    if (type === 'yunmu') return scope.yunmu.includes(value);
    if (type === 'zhengti') return scope.zhengti.includes(value);
    return false;
  });
}
```

### 7. 驗收標準

- [ ] 可以選擇進入自由模式或專注模式
- [ ] 自由模式顯示所有拼音
- [ ] 專注模式只顯示包範圍內的拼音
- [ ] 出字出詞邏輯在兩種模式下都正確工作
- [ ] 可以正確推導內容包範圍
- [ ] 模式切換時界面正確更新
- [ ] 視覺上能夠清晰區分兩種模式

## 相關文件

- 設計文檔：`docs/DESIGN.md` 第 5 節
- 核心學習界面：`features/core-learning-interface.md`
- 內容包管理：`features/content-packs.md`
