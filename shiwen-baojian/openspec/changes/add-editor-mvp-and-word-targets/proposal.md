## Why
學生端目前已從 Quill 過渡到 TipTap/ProseMirror，但缺少最基本、適合中文/英文作文的安全工具列；同時，老師端需要一個最簡單的字數區間設定（最低/最高，任一可空，兩者皆空表示無要求），以便學生端僅做達標提示而不干擾輸入或註解錨點。

## What Changes
- Editor（學生端）
  - 採用 TipTap/ProseMirror 的 MVP 工具：History（撤銷/重做）、Bold、Italic、Underline、Paragraph、HardBreak、Bubble Menu、CharacterCount（自訂雙語策略：中文漢字數/英文單詞數/段落數）。
  - 乾淨貼上：預設貼為純文本與安全清理（去除行內樣式/顏色/外部字體，禁止圖片/表格，保留基本段落與換行）。
  - 雙語統計展示：顯示中文字數（排除空白與標點）、英文單詞數、段落數；如有字數區間，僅做 UI 提示（達標/未達/超出），不阻擋輸入。
- Assignment（老師端）
  - 新增「字數度量類型（zh_chars/en_words）」「最低字數」「最高字數」三個欄位（任一可空；兩者皆空＝無字數要求）。
  - 欄位位置在「寫作指引」之前；不需在指引文字中重複字數要求。
  - 無「合理上限」驗證；僅檢查整數非負與 min ≤ max（若兩者皆填）。
- 規格更新（Specs Deltas）
  - essay-editor：將「Quill.js Rich Text Editor Integration」更名為「TipTap/ProseMirror Editor Integration」並更新內容；修訂「Word Count Display」以雙語與可選區間為主；新增「Paste Sanitization」要求。
  - teacher-assignment-management：「Set assignment details」改為可選度量與字數區間欄位；明確驗證規則與欄位出現順序。
  - student-assignment-view：列表與詳情中的「字數要求」僅在有設定時顯示；否則不顯示區間，學生端編輯器只顯示統計。

## Impact
- Affected specs: 
  - `essay-editor/spec.md`
  - `teacher-assignment-management/spec.md`
  - `student-assignment-view/spec.md`
- Affected code (參考)：
  - 學生端：`shiwen-baojian/js/student/essay-writer.js`（TipTap 擴充、計數策略、貼上清理、UI 提示）
  - 老師端：佈置作業頁面（新增三欄位；寫入 editor_layout_json.targets；可選快照至 essays）
  - 後端/資料：沿用 `assignments.editor_layout_json`，essay 建立時可寫入 `essays.settings_snapshot_json`（選做）
