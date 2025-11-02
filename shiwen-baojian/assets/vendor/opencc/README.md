# OpenCC 本地資源（前端）

本目錄用於存放前端可用的 OpenCC 轉換資源。為了在離線或受限網路環境下正常使用，請將對應的 JS/WASM/規則檔放到此處，並確保能在瀏覽器端載入。

## 介面約定（Adapter）

本專案期望本目錄中的資源在瀏覽器端掛載全域 `window.opencc` 物件，並提供兩個方法：

- `opencc.toSimplified(text: string): string`  // 繁→簡（轉為簡體）
- `opencc.toTraditional(text: string): string` // 簡→繁（轉為繁體）

若你採用的 OpenCC 套件 API 不同，請自行撰寫一個薄封裝（adapter）以符合上述介面，或直接修改 `wenfang-converter.js` 中 `candidates` 陣列的檔名與初始化流程。

## 先行內置的 shim（測試用）

我們預先提供了 `shim.js`，它只包含少量常見字的替換映射，僅供開發測試使用，效果極其有限，不可作為正式轉換。

## 推薦做法（兩選一）

1. 直接放置可用的 UMD/全域版檔案（例如 `opencc.min.js`），初始化後在全域提供 `window.opencc` 介面。
2. 使用任意 OpenCC 前端庫（如 opencc-js / opencc-wasm），並新增一個 `adapter.js`，將其 API 對接到 `window.opencc.{toSimplified,toTraditional}`。

放置後，`wenfang-converter.js` 會依序嘗試載入：

- `/shiwen-baojian/assets/vendor/opencc/opencc.min.js`
- `/shiwen-baojian/assets/vendor/opencc/index.js`
- `/shiwen-baojian/assets/vendor/opencc/shim.js`（最後退回）

可依實際檔名自行調整 `wenfang-converter.js` 內的 `candidates` 陣列。

## 檔案結構範例

```
shiwen-baojian/
  assets/
    vendor/
      opencc/
        opencc.min.js        # 真正可用的 OpenCC 前端版（UMD/全域）
        opencc.wasm          # 若需要 WASM 的話
        data/                # 規則/詞典資料
        adapter.js           # （可選）把第三方 API 對接到 window.opencc
        shim.js              # 簡易替換表（開發測試用）
        README.md
```

## 注意

- 請勿將其他子專案的資源複製到根目錄；保持子專案自包含（參見 AGENTS.md）。
- URL 請使用絕對路徑（本專案已在 loader 中採用絕對路徑）。
- 若你需要協助封裝 adapter，可告知你選用的庫與版本，我們將補齊示例。
