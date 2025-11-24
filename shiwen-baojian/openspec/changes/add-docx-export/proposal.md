## Why
學生需要將包含老師批註與總評的文章帶到 Google Docs/Word 進一步整理，目前系統只有線上瀏覽，無法離線保存或提交給其他老師。

## What Changes
- 提供 DOCX 導出按鈕，僅在作業已批改後顯示
- 匯出結果需保留段落層次、老師批註（Word Comment）與總評＋分數
- 失敗時提供錯誤提示與重試指引

## Impact
- Specs: student-assignment-view (新增導出需求)
- Code: student視圖（app.js / assignment-viewer.js）、新增匯出模組、docx.js 依賴、資料聚合（essays/annotations/grades）
