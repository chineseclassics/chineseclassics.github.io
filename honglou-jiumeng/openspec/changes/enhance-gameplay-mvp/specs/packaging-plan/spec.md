## ADDED Requirements

### Requirement: 模組化與資源自包含
將現有 `js/main.js` 拆分為多個 ES 模組；資源使用相對路徑，集中於應用內部 `assets/`。

#### Scenario: 模組邊界
- `state.js / garden.js / flowers.js / memories.js / ui-dialogs.js / ai-integration.js` 最小落地。
- 以命名匯出；入口 `index.html` 以 `<script type="module">` 引用匯總檔。

### Requirement: 打包預留（iOS / 桌面）
保持單一入口頁可獨立運行，避免必須外部 CDN；未來可用 Capacitor（iOS）或 Electron（桌面）直接包殼。

#### Scenario: README 筆記
- 在應用 README 補充 iOS/桌面打包簡要步驟與注意事項（觸控、全螢幕、離線資源）。

