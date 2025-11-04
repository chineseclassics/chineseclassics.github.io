拼音拼拼樂 - 軟件開發計劃書 (MVP V6.1)

更新日期：2025-11-04（V6 → V6.1 聚焦 K3 內建詞庫方案）

1. 項目概述

項目名稱： 拼音拼拼樂 (暫定)
核心目標： 為幼兒園大班學生提供一個遊戲化、可探索的拼音學習工具。
核心用戶： 幼兒園學生 (學習者)、幼兒園教師及家長 (內容管理者)。
核心價值：

對學生： 在一個受控的（「專注模式」）或開放的（「自由模式」）環境中，通過拖拽、組合、即時反饋來主動探索和學習拼音、漢字與詞語。

對教師： 提供一個高度靈活、零技術門檻的教學工具，支持離線使用、批量備課和完全自定義的拼音標註，完美貼合教學大綱。

2. 核心架構 (V6.1 方案)

技術棧：純前端應用 (Client-Only)。

系統資料：
- 內建 K3 詞庫（靜態檔）→ 記憶體索引（Map）秒查。
- 路徑：`/pinyin-pinpinle/data/k3-pinyin-db.json`（繁體、帶調顯示 + 去調/數字調索引）。
- 載入器：`/pinyin-pinpinle/js/k3-db-loader.js`（提供統一查詢 API）。

自定義資料：
- 儲存於瀏覽器本地（預設 localStorage；若規模變大可切換 IndexedDB，對上層 API 無感）。
- 支援一鍵導出/導入（Excel/JSON），避免資料遺失。

優點：零服務器成本；首開小、響應快；離線可用；教師覆寫優先。

缺點：資料隨設備；需教師定期匯出備份（導出功能保障）。

未來擴展 (Deferred)：V2 可引入 IndexedDB + Web Worker（大詞庫）、PWA 完整殼、Supabase 同步或 AI 功能；但 V6.1 不依賴它們即可完成核心教學體驗。

3. 數據核心：離線優先（K3 內建詞庫 + 可覆寫）

本方案的關鍵是不依賴實時 API 來實現核心拼音標註功能，且以「K3 適配規模」內建詞庫達成秒查與離線可用。

3.1. 內建 K3 詞庫（Offline Built-in）

- 文件：`/pinyin-pinpinle/data/k3-pinyin-db.json`
- 規模：數百字 + 百餘至數千詞（可逐步擴展），覆蓋 K3 核心主題：家人、身體、學校、顏色、動物、食物、動作、天氣、形狀、場所、交通、時間、禮貌等。
- 結構：同時保存 pinyinMarked（帶調顯示）與 pinyinNumber/normalized（索引用），便於 tone 精準或忽略查詢。
- 載入：以 `k3-db-loader.js` 載入至記憶體 Map，O(1) 查詢；可配合瀏覽器快取/PWA CacheStorage。

3.2. 在線備選（Online Fallback）

- 觸發：僅當內建詞庫查不到時（生僻字、自創詞）。
- 行為：嘗試查詢「萌典 (MoeDict) API」取得建議；若離線或請求失敗則顯示「需手填」。
- 緩存：未來可加簡易快取（鍵值：詞→拼音），降低重複請求。

3.3. 教師覆寫（Override）優先

- 所有自動結果（內建/萌典）都可在審核界面被教師改寫；最終以教師版本保存並優先顯示。

4. 內容管理：內容包 (Content Pack)

4.1. 組織方式： 所有教學內容（系統內置除外）都以「內容包 (Pack)」的形式組織。

4.2. 內容包類型：

unit (主題單元)：例如 "交通工具"。

exercise (專項練習)：例如 "b p m f 練習"。

註： 這兩個類型僅為標籤區分，App 處理邏輯完全一致。

4.3. 自動推導範圍 (Auto-Inferred Scope)：

核心機制： 老師無需手動設置一個包的拼音範圍。

流程： 當老師創建/導入一個包並添加字詞（如 巴士(bā shì)、汽車(qì chē)）後，App 自動解析所有拼音，並生成一個 scope 對象（例如 scope: { shengmu: ["b", "sh", "q", "ch"], yunmu: ["a", "i", "e"] }）。

此 scope 將用於「專注模式」下的界面過濾。

5. 學習模式 (Learning Modes)

App 啟動後（界面二），學生可選擇兩種模式：

5.1. 自由模式 (Global Mode)：

觸發： 選擇固定的「自由模式」（或「拼音王國」）卡片。

界面： 「拼音組合器」顯示所有的聲母、韻母、整體認讀音節。

邏輯：拼出 mā 時，系統會搜索所有包（系統+自定義）中的「媽」。

5.2. 專注模式 (Focus Mode)：

觸發： 選擇一個老師創建的「內容包」（例如 "交通工具")。

界面： 「拼音組合器」的「拼音選擇區」被該包的 scope 自動過濾（例如只顯示 b, sh, q, ch 等）。

邏輯： 學生在此受控範圍內探索。拼出 qì 時，系統顯示 汽車。

6. 核心界面與交互 (UI/UX)

6.1. 界面一：拼音組合器 (學習界面)

佈局： 「工作台」（上半部分）+「拼音選擇區」（下半部分）。

工作台： 包含 [ 聲母卡槽 ] 和 [ 韻母卡槽 ]。

選擇區：

通過 [ 聲母 ] [ 韻母 ] [ 整體 ] 三個標籤 (Tabs) 切換。

內容區為水平滾動的「傳送帶」。

在「專注模式」下，「傳送帶」中的內容被 scope 過濾。

交互流程：

拖拽： 學生從「選擇區」拖拽 b 到 [ 聲母卡槽 ]。

吸附： 成功吸附，播放 b 音效，[ 韻母卡槽 ] 閃爍提示。

引導： 「選擇區」自動切換到 [ 韻母 ] 標籤。

組合： 學生拖拽 a 到 [ 韻母卡槽 ]，b 和 a 合併為 ba，播放 ba 音效。

選調： ba 上方彈出聲調按鈕（bā, bá, bǎ, bà）。

確認： 學生點擊 bà，播放 bà 標準音，並播放成功動畫（星星/煙花）。

出字： 系統查詢 Local Storage，[ 爸 (bà) ] 按鈕出現。

出詞： 學生點擊 [ 爸 ]，彈出詞語 [ 爸爸 (bà ba) ]。

預防式過濾：以「合法聲母×韻母對照表」驅動 UI，選了聲母後只顯示可搭配的韻母；整體認讀音節獨立一類，減少錯誤嘗試。

交互冗餘：拖拽與點擊皆可組合，卡槽支援點選自動吸附。

錯誤反饋：對少數錯誤情境保留「抖動」與音效，主流程以正向引導為主。

移動端兼容：用 PointerEvents 自訂拖拽（避免 iOS 原生 DnD 限制）；首次點擊解鎖 AudioContext 後音效即時播放。

6.2. 界面二：內容包選擇器 (啟動頁)

學生視圖 (默認)：

頂部為 App 標題和一個低調的 ⚙️ (設置) 圖標（「家長鎖」入口）。

內容區為大型圖形化卡片列表。

卡片 1 (固定)： 「自由模式」（彩虹/城堡圖標）。

卡片 2, 3... (自定義)： 老師創建的包（如 "交通工具"，帶 🚗 圖標）。

點擊卡片即進入「界面一」對應的模式。

教師視圖 (編輯模式)：

長按 ⚙️ 圖標 5 秒進入。

界面上出現 [ + 導入 Excel ] 和 [ + 手動創建新單元 ] 按鈕。

所有「自定義卡片」上出現 [ 編輯 ] [ 導出 ] [ 刪除 ] 按鈕。

7. 教師/編輯模式 (In-App CMS)

7.1. 拼音手動微調 (Pinyin Override)

核心需求： 老師必須擁有拼音的最終決定權。

流程： 無論是手動添加還是批量導入，系統自動填寫的拼音（gē ge）永遠出現在一個可編輯的輸入框中。

輔助： 系統需提供一個「拼音聲調鍵盤」（包含 ā á ǎ à 等）輔助老師修改。

保存： 系統最終保存的是老師微調後的版本。

7.2. 批量導入 (Batch Import) - (V6.1 流程)

模板 (極簡)： 老師在 Excel 中只需填寫 Pack_Info (包名稱, 類型), Characters (漢字), Words (詞語)。無需填寫拼音。

導入 (Import)： 老師在 App 內點擊「導入」，選擇 Excel 文件。

處理 (Process)：App 解析文件，先查「內建 K3 詞庫」獲取拼音（秒級）。

備選 (Fallback)： 對於內置詞庫查不到的詞，嘗試調用「萌典 API」獲取拼音。

審核 (Review)： App 彈出「導入審核」界面，顯示所有字詞和已自動填寫的拼音。

微調 (Override)： 老師在此界面手動修改任何不滿意的拼音（或為 API 失敗的詞手動填寫）。

確認 (Confirm)：老師點擊「確認導入」，App 將最終數據存入本地（預設 localStorage），並自動推導 scope（從 normalized pinyin 拆解）。

7.3. 批量導出 (Batch Export)

目的： 備份數據，防止 Local Storage 數據丟失。

功能：在「編輯模式」下，老師可將任意「內容包」導出為 Excel 與 JSON 檔，便於備份/分享。

8. 數據結構（本地 Schema 與內建詞庫）

8.1 內建詞庫（靜態檔，隨頁載入）

- 路徑：`/pinyin-pinpinle/data/k3-pinyin-db.json`
- 結構概要：
  - meta：版本/地區設定/計數
  - characters：[{ char, pinyinMarked[], pinyinNumber[], tags? }]
  - words：[{ word, pinyinMarked, pinyinNumber, baseChars[], tags? }]

8.2 自定義包（本地存儲）

{
  "custom_packs": [
    {
      "pack_id": "uuid-pack-1",
      "pack_name": "交通工具",
      "type": "unit",
      "scope": { "shengmu": ["b","q","ch"], "yunmu": ["a","e","i"], "zhengti": [] },
      "characters": [
        { "id": "uuid-c1", "char": "汽", "pinyinMarked": "qì", "pinyinNumber": "qi4", "source": "builtin|moedict|manual" }
      ],
      "words": [
        { "id": "uuid-w1", "word": "汽車", "pinyinMarked": "qì chē", "pinyinNumber": "qi4 che1", "baseChars": ["汽","車"], "source": "builtin|moedict|manual" }
      ]
    }
  ]
}


9. 導入/導出模板（V6.1）

文件： template.xlsx

工作表 1：Pack_Info (包信息)
| pack_name (包名稱) | type (類型) |
| :--- | :--- |
| 交通工具 | unit |

工作表 2：Characters (漢字表)
| character (漢字) |
| :--- |
| 汽 |
| 車 |
| 巴 |
| 士 |
| 火 |

工作表 3：Words (詞語表)
| base_char (關聯漢字) | word (詞語) |
| :--- | :--- |
| 汽 | 汽車 |
| 車 | 火車 |
| 巴 | 巴士 |

導出：
- Excel 與 JSON 皆可；JSON 另含 schemaVersion、導出時間、包範圍（scope）。

備註：
- 導入審核頁會標示來源（內建/萌典/手填），教師可逐條覆寫。

10. 平台整合與導航規範（太虛幻境）

- 每個應用頁面在 </body> 前引入：`<script src="/assets/js/taixu-app-switcher.js"></script>`
- 所有連結使用絕對路徑（例如：`/pinyin-pinpinle/index.html`）。
- 在根 `index.html` 的 apps 陣列及 `/assets/js/taixu-app-switcher.js` 註冊新應用（絕對路徑）。
- 子專案自包含：所有資源位於 `pinyin-pinpinle/` 之下；不將資源上拷至根目錄。

11. 輕量查詢 API（K3DbLoader）

- 檔案：`/pinyin-pinpinle/js/k3-db-loader.js`
- 方法：
  - `await K3DbLoader.loadK3Db(url?)` → 回傳 `db`
  - `db.searchWordsByPinyin(pinyin)` → 忽略聲調匹配詞（回傳 payload 陣列）
  - `db.searchCharsByPinyin(pinyin)` → 忽略聲調匹配字
  - `db.getWord(text)` / `db.getChar(ch)` → 直查
  - `K3DbLoader.normalizeToKey(pinyin)` → 去調/去數字，生成索引鍵

12. 非功能需求與品質

- 首開：在一般網路環境下載詞庫 < 1s（數百 KB 級）；首次互動到回饋 < 100ms。
- 兼容：iPad/Chrome/Edge/Safari；iOS 首次互動後音效連續播放。
- 保存：資料本地可持久；提供一鍵導出以防瀏覽器清理。

13. 下一步（2 週迭代建議）

- 第 1 週：
  - 接入 `k3-db-loader.js` 至 `pinyin-pinpinle/index.html` Demo（拼音 → 即時查字詞）。
  - 合法組合規則驅動 UI 過濾；點擊/拖拽雙交互。
  - 導入審核頁雛形（先支援 JSON，再接 Excel）。
- 第 2 週：
  - Excel 導入/導出（SheetJS）；教師覆寫優先。
  - 音訊解鎖與短音效；可選 PWA 殼與快取策略。
  - 多音字小選單與檢索對齊完善。

完成判準：
- 自由/專注模式可正常拼出、查到例字/詞；
- 非法組合不出現在可選集合；
- 能導入示例檔、審核後入庫並導出；
- 重載後資料仍在，離線可啟動（若啟用 PWA）。