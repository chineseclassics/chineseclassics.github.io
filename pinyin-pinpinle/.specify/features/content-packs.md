# 內容包管理系統

## 需求摘要

提供一個靈活的內容包（Content Pack）管理系統，支持創建、導入、導出、編輯教學內容，並自動推導拼音範圍用於專注模式過濾。

## 用戶故事

作為一名幼兒園教師，我希望能夠輕鬆創建和管理拼音學習內容包，批量導入字詞，修改拼音標註，並將內容打包備份，這樣我就可以為不同班級和教學主題定制學習內容，同時避免數據丟失。

## 核心功能

### 1. 內容包數據結構

```javascript
{
  pack_id: "uuid-pack-1",
  pack_name: "交通工具",
  type: "unit", // "unit" (主題單元) 或 "exercise" (專項練習)
  
  // 自動推導的範圍（用於專注模式過濾）
  scope: {
    shengmu: ["b", "sh", "q", "ch", "h"],
    yunmu: ["a", "i", "e", "uo"],
    zhengti: ["shi"]
  },
  
  // 字列表
  characters: [
    {
      id: "uuid-c1",
      pinyin: "qì",
      char: "汽"
    }
  ],
  
  // 詞列表
  words: [
    {
      id: "uuid-w1",
      base_char: "汽",
      word: "汽車",
      pinyin: "qì chē"
    }
  ]
}
```

### 2. 自動推導機制

#### 2.1 推導時機
- 創建新包時
- 導入 Excel 後
- 手動添加字詞後
- 編輯拼音後

#### 2.2 推導邏輯

```javascript
function deriveScope(characters, words) {
  const scope = {
    shengmu: new Set(),
    yunmu: new Set(),
    zhengti: new Set()
  };
  
  // 從字符中提取拼音
  characters.forEach(char => {
    const pinyinParts = parsePinyin(char.pinyin);
    scope.shengmu.add(pinyinParts.initial);
    scope.yunmu.add(pinyinParts.final);
  });
  
  // 從詞語中提取拼音
  words.forEach(word => {
    const syllables = word.pinyin.split(' ');
    syllables.forEach(syllable => {
      const pinyinParts = parsePinyin(syllable);
      scope.shengmu.add(pinyinParts.initial);
      scope.yunmu.add(pinyinParts.final);
    });
  });
  
  return {
    shengmu: Array.from(scope.shengmu).sort(),
    yunmu: Array.from(scope.yunmu).sort(),
    zhengti: Array.from(scope.zhengti).sort()
  };
}
```

### 3. 編輯模式

#### 3.1 進入編輯模式

**觸發方式**：長按設置圖標 5 秒

**界面變化**：
- 顯示 [ + 導入 Excel ] 按鈕
- 顯示 [ + 手動創建新單元 ] 按鈕
- 所有自定義包卡片上顯示 [編輯] [導出] [刪除] 按鈕

#### 3.2 手動創建內容包

1. 點擊 [ + 手動創建新單元 ]
2. 彈出創建表單：
   - 包名稱（必填）
   - 類型（unit / exercise）
3. 進入包編輯界面
4. 手動添加字詞（參見 3.3 節）

#### 3.3 手動添加字詞

**添加字**：
1. 輸入漢字
2. 系統自動查詢拼音（離線詞庫）
3. 顯示可編輯的拼音輸入框
4. 提供拼音聲調鍵盤輔助輸入
5. 保存

**添加詞**：
1. 選擇基礎漢字（從已添加的字中選擇）
2. 輸入詞語
3. 系統自動查詢拼音
4. 顯示可編輯的拼音輸入框
5. 保存

**拼音聲調鍵盤**：
```
ā á ǎ à ē é ě è ī í ǐ ì
ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ
```

### 4. Excel 批量導入

#### 4.1 模板結構

**工作表 1：Pack_Info**
| pack_name | type |
|-----------|------|
| 交通工具 | unit |

**工作表 2：Characters**
| character |
|-----------|
| 汽       |
| 車       |
| 巴       |

**工作表 3：Words**
| base_char | word |
|-----------|------|
| 汽       | 汽車  |
| 車       | 火車  |

#### 4.2 導入流程

1. **上傳文件**
   - 點擊 [ + 導入 Excel ]
   - 選擇 Excel 文件

2. **解析文件**
   - 讀取 Pack_Info 工作表
   - 讀取 Characters 工作表
   - 讀取 Words 工作表

3. **查詢拼音**
   - 首先查詢內置離線詞庫
   - 匹配結果：直接使用
   - 未匹配：嘗試萌典 API
   - API 失敗：標記為需要手動輸入

4. **審核界面**
   ```javascript
   {
     packInfo: { name: "交通工具", type: "unit" },
     characters: [
       { char: "汽", pinyin: "qì", source: "offline" },
       { char: "𠳐", pinyin: "", source: "failed" }  // 需要手動輸入
     ],
     words: [
       { base_char: "汽", word: "汽車", pinyin: "qì chē", source: "offline" }
     ]
   }
   ```

5. **手動微調**
   - 所有拼音都顯示在可編輯輸入框
   - 失敗的項目高亮顯示
   - 提供拼音聲調鍵盤輔助

6. **確認導入**
   - 點擊 [確認導入]
   - 自動推導 scope
   - 保存到 Local Storage
   - 返回到包選擇器

### 5. 批量導出

#### 5.1 導出功能

**觸發**：編輯模式下點擊包的 [導出] 按鈕

**導出內容**：
- 包信息（名稱、類型）
- 所有字符及其拼音
- 所有詞語及其拼音

**導出格式**：Excel 文件（與導入模板兼容）

#### 5.2 備份用途

- 防止 Local Storage 數據丟失
- 跨設備同步
- 分享給其他教師
- 版本控制

### 6. 內容包選擇器

#### 6.1 界面結構

**頂部**：
- App 標題
- 設置圖標（長按進入編輯模式）

**內容區**：
- 大型圖形化卡片列表
- 卡片 1（固定）：自由模式
- 卡片 2+（動態）：自定義內容包

#### 6.2 卡片設計

**自由模式卡片**：
- 彩虹/城堡圖標
- 標題：「自由模式」或「拼音王國」
- 點擊進入自由學習模式

**內容包卡片**：
- 自定義圖標（emoji）
- 標題：包名稱
- 副標題：類型（主題單元 / 專項練習）
- 點擊進入專注模式

### 7. 拼音查詢系統

#### 7.1 內置離線詞庫

**數據源**：`our-app-pinyin-db.json`（基於 pinyin-pro-data）

**特點**：
- 數萬條常用字詞
- 基於《現代漢語詞典》第7版
- 100% 離線可用
- 查詢速度 < 5ms

#### 7.2 在線備選（萌典 API）

**觸發條件**：離線詞庫查詢失敗

**API**：萌典 (MoeDict)

**注意事項**：
- 需要網絡連接
- 僅作為輔助手段
- 失敗時允許手動輸入

### 8. 技術規範

#### 8.1 Local Storage 結構

```javascript
{
  system_data: {
    characters: [...],
    words: [...]
  },
  custom_packs: [
    {...} // 內容包對象
  ]
}
```

#### 8.2 文件組織

**音效文件**：`assets/audio/`

**數據文件**：
- `assets/data/our-app-pinyin-db.json` - 離線詞庫
- Local Storage - 用戶數據

**Excel 處理**：使用 SheetJS 庫（xlsx.js）

#### 8.3 JavaScript 模塊

**核心類**：
- `ContentPackManager` - 內容包管理器
- `ExcelImporter` - Excel 導入器
- `ExcelExporter` - Excel 導出器
- `PinyinQueryService` - 拼音查詢服務
- `ScopeDeriver` - 範圍推導器
- `PackEditor` - 包編輯器組件
- `ToneKeyboard` - 拼音聲調鍵盤組件

### 9. 驗收標準

- [ ] 可以手動創建新的內容包
- [ ] 可以通過 Excel 批量導入內容
- [ ] 系統能夠自動推導內容包範圍
- [ ] 拼音查詢能夠正確工作（離線 + 在線）
- [ ] 可以導出內容包為 Excel 文件
- [ ] 編輯模式能夠正常進入和退出
- [ ] 拼音聲調鍵盤能夠正常使用
- [ ] 所有拼音都可以手動修改

## 相關文件

- 設計文檔：`docs/DESIGN.md` 第 4、7、8 節
- 核心學習界面：`features/core-learning-interface.md`
