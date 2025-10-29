## 1. Implementation

- [ ] 1.1 學生端 TipTap 編輯器啟用 MVP 工具
  - History（撤銷/重做，Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z）
  - Bold（Cmd/Ctrl+B）、Italic（Cmd/Ctrl+I）、Underline（Cmd/Ctrl+U）
  - Paragraph（預設）、HardBreak（Shift+Enter）
  - Bubble Menu（選區工具條，精簡常用項）

- [ ] 1.2 雙語統計（CharacterCount 自訂策略）
  - 中文字數 zh_chars：只計漢字（排除空白與標點）
  - 英文單詞 en_words：以字母序列為 1 詞（排除純數字與標點）
  - 段落數：以 Paragraph 節點數統計
  - UI：即時更新、節流 150–250ms；只做提示，不限制輸入

- [ ] 1.3 乾淨貼上（Paste as plain text + 安全清理）
  - 預設去除行內樣式/顏色/外部字體，禁止圖片/表格
  - 保留基本段落與換行；以 DOMPurify 白名單 + 自訂 paste handler 實作

- [ ] 1.4 老師端字數區間設定（最簡）
  - 欄位：metric（zh_chars|en_words）、min（可空）、max（可空）
  - 驗證：整數非負；若同填則 min ≤ max；不做合理上限驗證
  - 欄位位置在「寫作指引」之前；不在指引中重複字數
  - 儲存：寫入 `assignments.editor_layout_json.targets`（primaryMetric=metric；targets[metric]={min,max}）；兩者皆空則不寫入 targets
  
- [ ] 1.5 學生端讀取並顯示
  - 有 targets：顯示主度量區間與達標狀態；同時顯示三項統計
  - 無 targets：只顯示統計，不顯示區間

- [ ] 1.6（選做）Essay 快照
  - essay 建立時將 targets 快照至 `essays.settings_snapshot_json`，後續評分以快照為準

## 2. Validation / QA
- [ ] 2.1 快捷鍵驗證：Undo/Redo、B/I/U、Shift+Enter
- [ ] 2.2 中文 IME 流暢度：輸入時不卡頓（計數節流）
- [ ] 2.3 錨點安全：不因貼上清理或樣式變更改變字面文本
- [ ] 2.4 無區間時只顯示統計；有區間時正確提示達標/未達/超出
- [ ] 2.5 老師端：可只填最小、或只填最大、或兩者皆空；無合理上限驗證

## 3. Rollout
- [ ] 3.1 師生端 UI 每次改動後小規模試用
- [ ] 3.2 文案與顏色規範審核（提示不刺眼、不中斷輸入）
- [ ] 3.3 文件：README/使用說明補充（雙語統計口徑）
