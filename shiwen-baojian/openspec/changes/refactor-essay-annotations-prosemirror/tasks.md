## 1. Implementation

- [x] 1.1 建立 ProseMirror 模組統一入口（pm-vendor.js）並鎖版本
- [x] 1.2 建立 TipTap/PM 編輯器封裝（tiptap-editor.js），修復 PluginKey 衝突
- [x] 1.3 補齊 PM 基礎樣式與白字元行為（pre-wrap）
- [x] 1.4 學生端初始化 PM 編輯器並支援 autosave（debounce）
- [x] 1.5 新作業自動建立 essays 記錄（ensureEssayRecord）
- [x] 1.6 老師端 PM 只讀檢視（無 JSON 時回退舊 paragraphs 渲染）
- [x] 1.7 移除學生端提交/撤回 UI 與邏輯，狀態視覺改為進行中/已批改
- [x] 1.8 老師端批改隊列包含草稿（draft/submitted 視為待批改）
- [x] 1.9 連接 Realtime：annotations 變更觸發前端刷新（師生端）
- [x] 1.10 修復學生端作業卡 JSON 解析錯誤（string/object 兼容）

## 2. Annotations（Decorations + Data）

- [x] 2.1 建立 pm-annotation-plugin 骨架，支援 `annotations:update` 觸發
 - [x] 2.2 連接實際 annotations 查詢（essay 級）：載入 → decorations 映射（師生端）
 - [x] 2.3 裝飾點擊 → 側欄卡片聯動與滾動對齊（學生端）
- [x] 2.4 裝飾點擊 → 側欄卡片聯動與滾動對齊（老師端）
 - [x] 2.5 去重與收斂（Realtime/樂觀回應合併，防重複渲染）

## 3. Anchoring（Re-anchoring）

- [x] 3.1 DB：新增錨點欄位（text_quote/prefix/suffix, text_start/text_end, anchor_version）
 - [x] 3.2 前端重錨定策略（offset → quote → context → fuzzy → orphan）
 - [x] 3.3 文字變更時的錨點更新與狀態標記（orphan 樣式）
 - [x] 3.4 後端 RPC：批量重錨定（reanchor_annotations_by_quote）

## 4. Essay Lifecycle（States & Access）

- [x] 4.1 簡化狀態：學生端移除提交與撤回操作
- [x] 4.2 老師可隨時查看與批註（無需提交門檻）
 - [x] 4.3 essays.status 最終語義改為 ['writing','graded']（資料遷移 + 檢查約束）
 - [x] 4.4 老師評分後將 essay 設為 graded 並只讀（前端）
- [x] 4.5 assignment.writing_mode 與 editor_layout_json 欄位（已新增 forward/rollback SQL；待 Dashboard 執行）
 - [x] 4.6 學生端開啟 editor 時套用相應模式 UI（essay-structured 恢復原有段落樣式/creative 留待後續）
 - [x] 4.7 老師端檢視尊重 mode（read-only overlay）

## 5. 雨村評點（Paragraph-level AI Feedback）

 - [x] 5.1 PM 段落 hover 顯示「雨村評點」按鈕
 - [x] 5.2 以 PM slice 取得段落文字並送入既有 AI 流程
 - [x] 5.3 AI 自動識別開頭/正文/結尾，提供段落級反饋（基於段落位置簡易判斷）
- [ ] 5.4 學生與老師端顯示與記錄段落級評點

## 6. Migrations & Rollback（Supabase MCP）

- [x] 6.1 新增 annotations 錨點欄位（已備 `20251028_add_annotation_anchor_columns.sql`）
- [x] 6.2 準備回滾腳本（`20251028_rollback_annotation_anchor_columns.sql`）
 - [x] 6.3 檢視並簡化 essays.status 檢查約束，遷移舊值（submitted→writing）
 - [x] 6.4 發布前先在測試數據庫驗證（MCP）

## 7. QA / 回歸測試

- [ ] 7.1 長文性能（>2500 字）輸入與滾動流暢度
- [x] 7.2 Annotations 裝飾佈局：不重疊、16px 間距、對齊原文（已驗證：`js/features/pm-annotation-overlay.js` 以 `_spacing=16` 並使用 occupied 區間避讓；定位基於 `.pm-annotation` 裝飾元素 `getBoundingClientRect()` 對齊）
- [ ] 7.3 Realtime 雙端同步：新增/刪除/更新
- [x] 7.3 Realtime 雙端同步：新增/刪除/更新（已實作：學生端 `pm-ann-student` 監聽 annotations、`pm-ann-comments-student` 監聽 annotation_comments；老師端 `pm-ann-teacher` 與 `pm-ann-comments-teacher`；並保留 5 秒輪詢後備。檔案：`js/student/essay-writer.js`、`js/teacher/grading-ui.js`）
- [ ] 7.4 舊數據兼容：無 JSON 僅 paragraphs 時教師端可讀
- [ ] 7.5 RLS：老師可見班級學生 essays（writing/graded 均可見）


## 8. 新增互動需求（2025-10-29 完成）

- Overlay 互動能力：
	- 顯示作者資訊（顯示名稱/角色），hover 動作列（回覆/刪除，僅作者可見刪除），回覆清單（預設顯示末 3 筆，支援展開/收起）
	- 樂觀更新：回覆送出暫存、刪除卡片半透明避免重複操作
- 樣式補強：
	- 動作列以透明度切換避免 hover 抖動；回覆列表與折疊控制；回覆數量徽章顯示
- 資料整合：
	- 學生端與老師端皆以 essay 維度批次查詢 annotations + annotation_comments + users，整合 author/replies/canDelete 資訊
- Realtime 擴充：
	- 新增 annotation_comments 訂閱（師生端），與既有 annotations 訂閱共同作用
- RLS 強化（已透過 Supabase 套用）：
	- annotations：參與者可讀；參與者可新增（且必須為作者欄位）；作者可改/可刪
	- annotation_comments：追加「參與者可讀」策略（保留既有本人 INSERT/UPDATE/DELETE）
- 影響檔案：
	- `shiwen-baojian/js/features/pm-annotation-overlay.js`
	- `shiwen-baojian/js/student/essay-writer.js`
	- `shiwen-baojian/js/teacher/grading-ui.js`
	- `shiwen-baojian/css/pm-annotation.css`


