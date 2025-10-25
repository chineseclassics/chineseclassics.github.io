# 核心學習界面：拼音組合器

## 需求摘要

為幼兒園大班學生提供一個視覺化、互動式的拼音組合學習界面，支持拖拽、音效反饋、即時出字出詞功能。

## 用戶故事

作為一名幼兒園學生，我希望通過拖拽聲母和韻母來組合拼音，看到即時的視覺和音效反饋，並能夠看到對應的漢字和詞語，這樣我可以在遊戲化的環境中主動探索和學習拼音。

## 核心功能

### 1. 界面佈局

#### 1.1 工作台（上半部分）
- **聲母卡槽**：可拖拽聲母到此位置
- **韻母卡槽**：可拖拽韻母到此位置
- **組合結果區**：顯示當前組合的拼音和聲調選項

#### 1.2 拼音選擇區（下半部分）
- **標籤切換**：包含 [聲母] [韻母] [整體認讀] 三個標籤
- **傳送帶**：水平滾動的拼音卡片列表
- **過濾機制**：在專注模式下自動根據內容包範圍過濾

### 2. 核心交互流程

#### 2.1 拖拽組合流程

1. **初始狀態**
   - 學生點擊選擇區的聲母（如 `b`）
   - 聲母卡張開觸摸反饋

2. **拖拽聲母**
   - 學生從選擇區拖拽 `b` 到 [聲母卡槽]
   - 卡片被吸附到卡槽
   - 播放 `b` 的音效
   - [韻母卡槽] 閃爍提示下一步

3. **切換選擇區**
   - 自動切換到 [韻母] 標籤
   - 韻母傳送帶展開

4. **拖拽韻母**
   - 學生拖拽 `a` 到 [韻母卡槽]
   - `b` 和 `a` 合併為 `ba`
   - 播放 `ba` 的音效

5. **選擇聲調**
   - `ba` 上方彈出聲調按鈕（`bā, bá, bǎ, bà`）
   - 每個按鈕可點擊預覽音效

6. **確認組合**
   - 學生點擊 `bà`
   - 播放標準發音
   - 播放成功動畫（星星/煙花特效）

7. **出字**
   - 系統查詢 Local Storage
   - 對應的漢字按鈕出現（如 [爸]）

8. **出詞**
   - 學生點擊 [爸]
   - 彈出詞語（如 [爸爸 (bà ba)]）
   - 可播放詞語發音

#### 2.2 錯誤反饋

- **無效組合**：如拖拽 `b` + `m` 等無效拼音
- **錯誤卡槽**：如拖到非目標卡槽
- **反饋效果**：
  - 卡片抖動動畫
  - 播放錯誤音效
  - 卡片自動彈回原位

### 3. 音效系統

#### 3.1 音效類型
- **聲母音效**：播放單個聲母的標準發音
- **韻母音效**：播放單個韻母的標準發音
- **拼音音效**：播放完整拼音的標準發音
- **聲調預覽**：點擊聲調按鈕時播放帶聲調的拼音
- **確認音效**：成功組合時的確認音
- **成功動畫音效**：星星/煙花特效時的音效
- **錯誤音效**：組合無效時的提示音
- **詞語音效**：出詞時播放詞語的標準發音

#### 3.2 音效存儲
- 所有音效文件存儲在 `assets/audio/` 目錄
- 使用 Web Audio API 或 HTML5 Audio 播放
- 支持預加載常用音效，確保即時播放

### 4. 動畫效果

#### 4.1 吸附動畫
- 拖拽卡片靠近卡槽時自動吸附
- 使用彈性動畫效果

#### 4.2 閃爍提示
- 韻母卡槽在聲母就位後閃爍
- 使用淡入淡出循環動畫

#### 4.3 合併動畫
- 聲母和韻母合併為完整拼音
- 使用縮放和位置插值動畫

#### 4.4 成功動畫
- 星星從卡槽飛出
- 煙花在卡槽位置綻放
- 持續 1-2 秒後自動消失

#### 4.5 錯誤動畫
- 卡片快速左右抖動 3 次
- 使用物理彈簧動畫

### 5. 技術規範

#### 5.1 HTML 結構
```html
<div class="learning-interface">
  <!-- 工作台 -->
  <div class="workspace">
    <div class="slot shengmu-slot" data-slot="shengmu">
      <span class="slot-label">聲母</span>
      <div class="card-placeholder"></div>
    </div>
    <div class="slot yunmu-slot" data-slot="yunmu">
      <span class="slot-label">韻母</span>
      <div class="card-placeholder"></div>
    </div>
  </div>
  
  <!-- 拼音選擇區 -->
  <div class="pinyin-selector">
    <div class="tabs">
      <button class="tab active" data-tab="shengmu">聲母</button>
      <button class="tab" data-tab="yunmu">韻母</button>
      <button class="tab" data-tab="zhengti">整體認讀</button>
    </div>
    
    <div class="carousel-container">
      <div class="carousel-track" id="carousel-track">
        <!-- 動態生成拼音卡片 -->
      </div>
    </div>
  </div>
  
  <!-- 聲調選擇器（動態顯示） -->
  <div class="tone-selector" id="tone-selector" style="display: none;">
    <!-- 動態生成聲調按鈕 -->
  </div>
</div>
```

#### 5.2 CSS 類名規範
- `.learning-interface` - 主容器
- `.workspace` - 工作台容器
- `.slot` - 卡槽基類
- `.shengmu-slot` / `.yunmu-slot` - 具體卡槽
- `.card-placeholder` - 卡槽占位符
- `.pinyin-selector` - 選擇區容器
- `.tabs` - 標籤容器
- `.tab` - 單個標籤
- `.carousel-container` - 傳送帶容器
- `.carousel-track` - 傳送帶軌道
- `.tone-selector` - 聲調選擇器
- `.card` - 拼音卡片
- `.char-button` - 漢字按鈕
- `.word-popup` - 詞語彈窗

#### 5.3 JavaScript 模塊

**核心類**：
- `LearningInterface` - 主界面控制器
- `DragDropManager` - 拖拽交互管理器
- `SoundManager` - 音效播放管理器
- `AnimationManager` - 動畫效果管理器
- `DataQueryService` - 數據查詢服務（Local Storage）
- `ToneSelector` - 聲調選擇器組件
- `CharacterDisplay` - 漢字展示組件
- `WordPopup` - 詞語彈窗組件

**數據流**：
```
拖拽輸入 → DragDropManager → LearningInterface → DataQueryService → Local Storage
                                                            ↓
                                                    音效/動畫反饋
```

#### 5.4 數據查詢接口

```javascript
// 查詢對應拼音的漢字
async function queryCharacters(pinyin) {
  // 查詢 Local Storage 中的 system_data.characters 和 custom_packs
  // 返回匹配的字列表
}

// 查詢對應漢字的詞語
async function queryWords(baseChar) {
  // 查詢 Local Storage 中的詞語數據
  // 返回匹配的詞列表
}
```

### 6. 響應式設計

- **桌面端**：卡片大小 80px × 80px，卡槽寬度 200px
- **平板端**：卡片大小 100px × 100px，卡槽寬度 250px
- **手機端**：卡片大小 60px × 60px，卡槽寬度 150px
- 傳送帶在手機端需要支持觸摸滑動

### 7. 可訪問性

- 所有拖拽操作必須支持鍵盤導航
- 音效播放必須提供視覺提示（如圖標閃爍）
- 組合結果必須提供語音朗讀選項
- 所有按鈕必須有明確的 aria-label

### 8. 性能要求

- 界面渲染時間 < 100ms
- 音效延遲 < 50ms
- 動畫幀率 ≥ 60fps
- 數據查詢響應時間 < 10ms

## 驗收標準

- [ ] 用戶可以成功拖拽聲母和韻母到對應卡槽
- [ ] 系統能夠正確組合拼音並顯示聲調選項
- [ ] 所有音效都能正常播放
- [ ] 成功動畫和錯誤反饋都能正確觸發
- [ ] 系統能夠正確查詢並顯示對應的漢字和詞語
- [ ] 界面在不同設備上都能正常顯示
- [ ] 無效組合能被正確識別並給出錯誤反饋

## 技術依賴

- 拖拽 API：HTML5 Drag and Drop API 或 Pointer Events API
- 音效播放：Web Audio API 或 HTML5 Audio API
- 動畫：CSS Animations + JavaScript 動畫庫（如 GSAP 或 Anime.js）
- 數據存儲：Local Storage API

## 相關文件

- 設計文檔：`docs/DESIGN.md` 第 6.1 節
- 項目憲法：`.specify/memory/constitution.md`
