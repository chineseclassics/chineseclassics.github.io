# CEDICT 分片方案（EN→ZH）

本文件說明如何將完整版 CEDICT 生成「英→中」倒排索引分片，並於前端動態載入，兼顧完整度與性能。

## 為何分片？

- 完整 CEDICT 體量較大，若一次性載入會拖慢頁面與佔用記憶體。
- 我們按英文字首分成 27 片（a…z + other），查詢時只載入需要的片段，並快取到記憶體。

## 生成步驟

1) 下載官方 CEDICT 資料（UTF-8）：
   - 檔名一般為 `cedict_ts.u8`（繁簡含並列，行格式：傳統 簡體 [pinyin] /def1/def2/.../）

2) 放置到工具資料夾：

```
shiwen-baojian/
  tools/
    data/
      cedict_ts.u8
```

3) 在本機執行生成腳本（需 Node.js 18+）：

```
cd shiwen-baojian/tools
node build-cedict-shards.js
```

4) 生成輸出位置：

```
shiwen-baojian/js/data/cedict-en/
  en_a.json
  en_b.json
  ...
  en_z.json
  en_other.json
```

每個分片是一個物件：`{ [english_word]: Array<{ hanzi, pinyin?, senses? } > }`

5) 推送到網站靜態檔目錄，前端即可按需載入。

## 前端載入規則

- 請求 `/shiwen-baojian/js/data/cedict-en/en_{letter}.json`；非 a~z 首字歸入 `en_other.json`。
- 內存快取避免重複請求；簡單詞形回退（去尾標點、-s/-es/-ed/-ing）。

## 授權與致謝

- CEDICT 版權與授權：Creative Commons Attribution-ShareAlike (CC BY-SA)。
- 使用時請於專案致謝與說明頁保留來源與授權資訊。

## 擴展建議（可選）

- 進一步壓縮：
  - 透過 JSON 迷你化或壓縮（gzip/brotli）由 CDN/伺服器自動壓縮傳輸。
- 兩段索引：
  - 常用詞單獨小片，長尾詞維持字首大片，提升常見查詢首屏速度。
- ZH→EN：
  - 目前中→英仍用萌典；若需 CEDICT 方向可另建 `zh_*` 分片（建議按第一字 Unicode 區段或拼音首字母分片）。
