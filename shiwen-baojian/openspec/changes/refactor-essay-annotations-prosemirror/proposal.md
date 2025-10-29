## Why
現有系統以多段落編輯框（Quill）為核心，批註綁定段落與偏移，導致：
- 狀態切換（draft/submitted）造成教師端與學生端的批註重複、錯位與佈局衝突
- 自然分段（Enter）難以支援，段落結構與真實文本不同步
- 內容來源分裂（paragraphs vs essays.content_json），難以維護

本次重構旨在：統一為單一 ProseMirror JSON 文檔作為唯一真相，改用文字錨點（offset + quote + prefix/suffix）管理批註，簡化狀態為 writing/graded，老師可隨時查看與批註，最終評分後歸檔。

## What Changes
- 使用 ProseMirror（TipTap 路徑）作為唯一內容來源（essays.content_json）
- 批註系統改為文字錨點（text_start/text_end + text_quote/prefix/suffix），提供重錨定策略
- 取消「提交/撤回」流程；狀態簡化為 writing、graded（歸檔後只讀）
- 老師可在學生寫作過程中即時查看與批註（Realtime 同步）
- 學生與老師端裝飾（decorations）雙向聯動與滾動對齊，模仿 Google Docs 行為
- 保留舊數據回退渲染（教師端）：content_json 缺失時用 paragraphs 後備渲染
- 自動保存：編輯變更防抖持久化 PM JSON
- 後續提供段落 hover「雨村評點」動作（AI 分段識別與段落級反饋）
- 新增「編輯器模式」：assignment 決定 editor layout（essay-structured｜creative），UI 以插件疊加方式呈現，不改變 PM JSON 結構；essay-structured 模式恢復原有論文段落樣式（分論點/段落新增按鈕與每段「雨村評點」），creative 模式留待後續完善

## Impact
- Affected specs:
  - essay-editor（MODIFIED）
  - paragraph-structure（MODIFIED）
  - student-assignment-view（MODIFIED）
  - teacher-grading（MODIFIED）
  - database-schema（MODIFIED：annotations 文本錨點欄位；essays 狀態語義）
  - auto-save-and-versioning（MODIFIED）
  - annotation-anchoring（ADDED）
  - editor-layout-modes（ADDED：essay-structured + creative）
- Affected code（關鍵文件/模組）：
  - js/editor/pm-vendor.js、js/editor/tiptap-editor.js
  - js/features/pm-annotation-plugin.js、js/features/annotation-manager.js
  - js/student/essay-writer.js、js/student/assignment-viewer.js
  - js/teacher/grading-ui.js、js/teacher/grading-queue.js
  - supabase/migrations/*（annotations 錨點欄位、新舊狀態兼容）


