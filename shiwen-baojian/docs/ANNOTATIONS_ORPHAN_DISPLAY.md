# 批註系統「原文已改」顯示驗證指南

此文檔用於驗證 ProseMirror（TipTap）批註系統中，當批註錨點對齊失敗（孤立）時的顯示與行為是否正確。

## 名詞與文案
- 對外顯示：原文已改（取代「孤兒」術語）
- Tooltip：原文已改：此批註暫未對齊原文
- 來源：
  - 正文內：`.pm-annotation-orphan` class（裝飾）
  - 右側卡片：`.pm-ann-card.orphan` + 徽章 `.pm-ann-badge.pm-ann-badge-orphan`

## 验證範圍
- 學生端 TipTap 編輯器與查看器
- 老師端批改頁只讀查看器（右側疊加層）

## 快速檢查步驟（老師端）
1. 打開某篇學生作業的批改頁（需為 TipTap 內容，`essays.content_json` 存在）
2. 在右側看到批註卡片與正文高亮對齊（非重疊，間距約 16px）
3. 編輯學生正文，使某條批註對應的原文被刪除或明顯變更
4. 觀察：
   - 正文該批註範圍變為灰色虛線下劃線（`.pm-annotation-orphan`）
   - 右側對應卡片：
     - 卡片容器有 `.orphan` 樣式（淡灰虛線邊框）
     - 標題區域顯示徽章「原文已改」，懸浮有 Tooltip 說明
5. 刷新頁面後狀態保持一致（Realtime 推送或輪詢刷新後仍一致）

## 快速檢查步驟（學生端）
1. 在學生編輯器中選擇文字 → 透過浮動「添加批註」按鈕新增批註
2. 新增成功後刪除該批註對應文字或更改到無法匹配
3. 觀察與老師端一致的「原文已改」顯示

## 對齊/狀態切換準則簡述
- 裝飾類型：
  - 精準對齊：正常黃色（或設計色）高亮
  - 近似對齊（approx）：次級樣式
  - 無法對齊：標記 `.pm-annotation-orphan`
- 右側卡片透過查找正文 `.pm-annotation[data-id]` 的 DOM 狀態來同步徽章與卡片樣式。

## 源碼位置
- 裝飾與狀態：`shiwen-baojian/js/features/pm-annotation-plugin.js`
- 卡片與疊加層：`shiwen-baojian/js/features/pm-annotation-overlay.js`
- 樣式：`shiwen-baojian/css/pm-annotation.css`
- 老師端整合：`shiwen-baojian/js/teacher/grading-ui.js`

## 已知邊界情況
- 大段落被大幅修改時，近似匹配可能退化為「原文已改」狀態
- 內容尚未從後端刷新時（極短暫），疊加層可能先顯示樂觀臨時 ID；隨後會自動替換為最終 ID

## 期望結果
- 正文與卡片的狀態表現一致且明確
- 文案用語清晰，不暴露內部術語
- 重新整理頁面後狀態保持一致
