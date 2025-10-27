# 學生端批註顯示與編輯一體化重構方案

**創建日期**：2025-01-27  
**更新日期**：2025-10-27  
**目標**：
- 修復學生端無法顯示老師批註的問題，並使顯示方式與老師端一致（浮動批註 + 原文高亮 + 順序避讓）。
- 支援學生在有老師批註的情況下「可編輯」論文，並在編輯過程中保持批註對齊、可視與可導航（含孤立批註標記與重定位）。

## 問題分析

### 當前問題
1. 初始化錯誤：`app.js` 目前對每個段落迭代呼叫 `StudentAnnotationViewer.init(...)`，狀態互相覆蓋（參考 js/app.js:950 一段）。
2. 架構不一致：學生端集中於側欄 `#annotationsContainer` 列表，老師端為浮動卡片，右側絕對定位、靠原文高亮對齊與避讓。
3. 缺少 DOM 錨點：學生端編輯器（Quill）未提供 `data-paragraph-id` / `data-order-index` 與 `#essayViewer` / `.grading-content-wrapper` 等定位容器，無法準確高亮與定位浮動批註。
4. 回覆/學生自建批註：現有學生端代碼包含回覆/建立批註 UI，但資料庫未見 `annotation_comments` 遷移，且 RLS 設計以老師為批註作者，短期不可用（暫時移除，後續再加）。

### 老師端架構（目標對齊）
- 使用 `grading-content-wrapper`（統一滾動容器）包含論文內容和浮動批註
- 批註是 `position: absolute` 定位的浮動元素
- 批註通過 `AnnotationManager.renderAnnotation()` 方法渲染，自動計算位置
- 批註按段落順序和原文位置排序，自動避讓不重疊
- 連接線：學生端不顯示；老師端目前仍存在，後續再統一策略（先不在本次變更中移除老師端連接線）。

### 學生端 HTML 結構分析
學生端的論文編輯器在 `#essay-editor-template` 模板中：
- 左側：論文編輯區（`.w-full.lg:w-2/3`）包含編輯器容器
- 編輯器容器（`.bg-white.rounded-lg.shadow-sm`）包含：
  - 標題區
  - 引言區（`#intro`）
  - 分論點區域（`#arguments-container`）
  - 結論區（`#conclusion`）
- 右側：AI 反饋側邊欄（`#ai-feedback-sidebar`），包含論文統計信息和反饋區域

**關鍵差異**：
- 學生端目前沒有 `essay-content-section`/`essayViewer`/`.grading-content-wrapper` 之類的容器與段落錨點。
- 若不補齊容器與錨點，即使改為浮動批註也無法對齊原文或正確避讓。

## 實施方案（補齊缺口，支援「邊看批註邊編輯」）

本方案在學生端建立與老師端一致的容器/錨點與批註渲染邏輯，並引入「可編輯流程」：
- 已提交未評分：學生可「撤回並編輯」，編輯時保留批註顯示與錨定；文字變動時透過重定位標註，必要時標記為孤立批註（orphaned）。
- 草稿編輯：可選擇顯示批註以便即時修訂；批註隨變動重定位。
- 已評分（graded）：只讀檢視。

### 階段一：補齊 DOM 容器與段落錨點（學生端）

目的：讓學生端也具備可被批註系統使用的定位基準，對齊老師端的 DOM 結構與 CSS 能力。

變更要點：
1. 在學生端左側內容（編輯區塊）外層新增一層統一滾動容器 `.grading-content-wrapper`，其內含：
   - `.main-content-area`：承載論文標題與各段落內容；
   - 無需側邊批註容器，浮動批註 `.floating-annotation` 直接絕對定位在右側（樣式已存在於 `css/assignment-management.css`）。
2. 為各段落容器加上錨點屬性：
   - `data-paragraph-id`：段落 ID（對應資料庫 `paragraphs.id` 或本地映射 ID）；
   - `data-order-index`：段落順序索引（與資料庫 `order_index` 對齊）。
3. 題頭/副標題、引言、正文各段、結論需一致化加上上述錨點，內容容器為 Quill 的 `.ql-editor` 內部；外層段落卡片（現有每段落外層 div）加錨點即可。
4. CSS：確保 `.grading-content-wrapper` 有 `position: relative; overflow-y: auto;`，且頁面已載入 `css/assignment-management.css`（學生端已載入）。

實作位置（參考）：
- `shiwen-baojian/index.html`：在編輯器左側主體內包一層 `.grading-content-wrapper` + `.main-content-area` 容器。
- `shiwen-baojian/js/student/essay-writer.js`：
  - 建立段落時，外層段落卡片 div（目前 id 為 `${paragraphId}`）同時設定 `data-paragraph-id` 與動態 `data-order-index`。
  - 在 `restoreEssayContent(...)` 後也要補齊這些屬性，確保刷新/還原後依然可用（參考 `js/app.js:1426` 後的內容恢復流程）。

注意：學生端仍使用 Quill 編輯，但批註高亮會作用於實際的文字節點；此處需與下一階段的高亮/重定位策略配合。

### 階段二：共用批註工具抽取（避免雙邊邏輯飄移）

目的：最大化復用老師端穩定邏輯，減少複製貼上。

抽取方法到新模組（建議：`js/features/annotation-utils.js`）：
- 文字節點遍歷：`getTextNodes(container)`；
- 錨定文本查找：`findTextByAnchor(paragraphElement, anchorText)`；
- 偏移到 Range：由段落全域偏移（highlight_start/end）對應到具體 text node 的 `Range`；
- 高亮渲染：`highlightWithRange(annotationId, range)`；
- 位置計算與避讓：`getIdealTop(element)`、`adjustAllAnnotations()`；

來源參考：`shiwen-baojian/js/features/annotation-manager.js`（老師端已實作）。

### 階段三：重構 StudentAnnotationViewer 類

**文件**：`shiwen-baojian/js/student/student-annotation-viewer.js`

**核心修改**：

1. 修改 `init()` 介面：
   - 從 `init(essayId, paragraphId, isReadOnly)` 改為 `init(essayId, paragraphs, mode)`；
   - `paragraphs`：整篇段落（含 `id`、`order_index`）；
   - `mode`：`'view' | 'edit' | 'readonly'`，其中：
     - `view`：已提交但未評分狀態下的檢視；
     - `edit`：學生撤回或草稿狀態，允許編輯，並保持批註顯示與重定位；
     - `readonly`：已評分鎖定。

2. 新增 `loadAllAnnotations()`：
   - 以 RPC `get_essay_annotations(p_essay_id)` 一次性取得整篇批註（已存在，見 `supabase/migrations/20250119_create_get_essay_annotations_function.sql`）。
   - 承載 `paragraph_order_index`，排序依據為 `(paragraph_order_index, highlight_start)`。

3. 重構渲染：
   - 廢除 `#annotationsContainer` 集中渲染；
   - 針對每筆批註：
     - 先在對應段落內建立原文高亮（優先用 `anchor_text`，找不到時回退 `highlight_start/end`）；
     - 再建立 `.floating-annotation` 卡片（絕對定位於 `.grading-content-wrapper` 右側）。

4. 位置計算與避讓（復用共用工具）：
   - `getIdealTop(annotationElement)` 對齊原文高亮；
   - `adjustAllAnnotations()` 依段落順序與段內 offset 排列與避讓；
   - 支援滾動/視窗 resize 後的重新計算。

5. 高亮渲染：
   - `renderHighlights()`：為所有批註建立 `.annotation-highlight`，含 `data-annotation-id`。
   - 適配 Quill：在「edit」模式中，避免破壞使用者編輯體驗，建議：
     - 進入「批註檢視」時段落暫時設為只讀以安全注入高亮；
     - 或採用重定位模組監聽內容變更後重新生成高亮（見下一點）。

6. 編輯與重定位（關鍵）：
   - 「edit」模式下，整合「批註重定位管理器」（`js/features/annotation-repositioning.js`）：
     - 監聽段落內容變化（Quill change 事件或保存點）後，嘗試依 `anchor_text`/上下文重新定位原文範圍；
     - 若無法定位，將批註標記為 `is_orphaned` 並以 UI 呈現孤立狀態（學生端已有孤立通知樣式，可沿用）。
   - 回覆/學生自建批註暫不开放（待資料表與 RLS 完備後再啟用）。

7. Realtime：
   - 監聽層級調整為「整篇文章」：使用 `essay_id` 或 `paragraph_id in (...)` 的過濾器（參考老師端 `annotation-manager.js` 的 `setupRealtimeListener()`）。
   - 新批註/更新/刪除事件即時反映（插入與更新時刷新高亮與卡片；刪除時移除標記）。

### 階段四：修改 app.js 初始化與狀態流

**文件**：`shiwen-baojian/js/app.js`

1. 單一實例初始化（修正覆蓋 Bug）：

```javascript
async function initializeStudentAnnotationSystem(assignmentId) {
    try {
        console.log('🚀 初始化學生端批注系統:', assignmentId);
        
        // 動態導入學生端批注查看器
        const { default: StudentAnnotationViewer } = await import('./student/student-annotation-viewer.js');
        
        // 獲取當前作業的完整信息（含段落）
        const { data: essay, error: essayError } = await AppState.supabase
            .from('essays')
            .select(`
                id,
                paragraphs (
                    id,
                    order_index
                )
            `)
            .eq('assignment_id', assignmentId)
            .eq('student_id', AppState.currentUser.id)
            .single();
            
        if (essayError) {
            console.error('❌ 獲取作業信息失敗:', essayError);
            return;
        }
        
        if (!essay || !essay.paragraphs || essay.paragraphs.length === 0) {
            console.log('ℹ️ 沒有找到段落，跳過批注系統初始化');
            return;
        }
        
        // ✅ 創建唯一的批注查看器實例
        const annotationViewer = new StudentAnnotationViewer(AppState.supabase);
        
        // ✅ 判定模式：
        // submitted 未評分：'view'（提供「撤回並編輯」入口）；
        // draft：'edit'（可編輯、顯示批註並重定位）；
        // graded：'readonly'
        const mode = resolveStudentAnnotationMode(essay.id); // 需在 app.js 實作此輔助函式
        await annotationViewer.init(essay.id, essay.paragraphs, mode);
        
        // 將批注查看器保存到全局狀態
        window.studentAnnotationViewer = annotationViewer;
        
        console.log('✅ 學生端批注系統初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化學生端批注系統失敗:', error);
    }
}
```

2. 狀態流與 UI：
   - submitted（未評分）：側邊欄仍可展示「老師評分」占位或提示，主視圖顯示浮動批註；提供「撤回並編輯」按鈕，點擊後更新 essay 狀態為 draft 並切換 `mode='edit'`，保留批註。
   - draft：可編輯、展示浮動批註，啟用重定位管理器；
   - graded：維持只讀檢視，展示批註與老師最終評分（`displayTeacherGrading`，參考 js/app.js:1590 附近）。

### 階段五：HTML 結構調整（學生端）

**文件**：`shiwen-baojian/index.html`

**需要的調整**：

1. 在學生端左側主區塊（編輯器區）外包 `.grading-content-wrapper`，內含 `.main-content-area`，供浮動批註定位；
2. 各段落外層卡片加上 `data-paragraph-id`、`data-order-index`；
3. 保留舊的 `#annotations-display-area`、`#annotationsContainer`（標註為 deprecated 但暫不移除，以免影響其他功能）。

備註：命名可與老師端保持一致（`#essayViewer`）或用學生端專屬 ID，但共用工具需知道容器選擇器。

### 階段六：CSS 樣式確認

**文件**：查找並確認相關 CSS 文件（可能在 `shiwen-baojian/css/` 目錄）

**樣式調整**：

1. **確保編輯器容器支持浮動批註**：
```css
/* 為編輯器容器添加相對定位 */
.essay-editor-wrapper {
    position: relative;
}
```

2. **復用老師端的浮動批註樣式**：
   - `.floating-annotation`：浮動批註容器
   - `.annotation-highlight`：原文高亮
   - 確保這些樣式在學生端也可用

3. **學生端不顯示連接線**（`.annotation-connection`）；老師端暫不變。

4. **調整批註在學生端的顯示位置**：
   - 學生端編輯器較窄，批註可能需要調整寬度或位置
   - 考慮在移動端隱藏或調整批註顯示方式

### 階段七：測試與驗證

**測試項目**：

1. **基本顯示測試**：
   - 打開已有老師批註的論文
   - 驗證批註正確顯示為浮動元素
   - 驗證批註按原文順序排列

2. **位置計算測試**：
   - 驗證批註位置與原文高亮對齊
   - 驗證批註不重疊，自動避讓
   - 滾動頁面時批註位置保持正確

3. **多批註測試**：
   - 測試有多個批註的段落
   - 驗證所有批註都能正確顯示

4. **響應式測試**：
   - 測試桌面端和移動端顯示
   - 驗證批註在不同屏幕尺寸下的表現

5. **功能完整性測試**：
   - 驗證右側側邊欄的統計信息正常工作
   - 驗證 AI 反饋區域正常工作
   - 驗證批註與其他功能不衝突
   - 草稿/撤回編輯：文字修改後批註重定位正常；無法定位時標記孤立並顯示提示。

## 關鍵設計決策

### 保留學生端特色
- 右側側邊欄頂部的論文統計信息區域（老師端沒有）
- AI 反饋顯示區域（「賈雨村說」，老師端沒有）
- 這些區域與批註系統並行存在，互不干擾

### 批註顯示與編輯並存
- 採用老師端的浮動批註方式 + 原文高亮，並以 RPC 一次性載入整篇批註。
- 學生端在「submitted 未評分」與「draft」皆可顯示批註；在「draft/撤回」狀態可編輯。
- 編輯時啟用重定位：優先依 `anchor_text`，回退 `highlight_start/end`，失敗則標記孤立（提供 UI 提示與列表）。
- 回覆與學生自建批註暫緩，待 `annotation_comments` 結構與 RLS 策略補齊後再開啟。

### 代碼復用
- 抽取共用工具，避免雙邊邏輯飄移。
- 使用相同的 CSS 類名與 DOM 結構，以減少樣式與行為分歧。

### 容器選擇
學生端在左側編輯器外包 `.grading-content-wrapper` + `.main-content-area`，浮動批註直接附著於該容器（與老師端一致）。

## 預期效果

修復後，學生打開已提交的論文時：

1. 所有老師添加的批註正確顯示在論文內容旁，作為獨立浮動元素
2. 批註按原文順序排列，自動避讓不重疊
3. 批註與原文高亮對應，位置準確
4. 右側側邊欄的統計信息和 AI 反饋區域正常工作
5. 批註顯示方式與老師端視覺效果一致（學生端不顯示連接線）
6. 在「撤回/草稿」狀態，學生可直接在有批註的前提下編輯，批註跟隨文字自動重定位；無法定位的批註會標記為孤立並提示處理。

## 待執行的任務清單

- [ ] 階段一：補齊 DOM 容器與段落錨點（學生端）
  - [ ] 在左側內容包 `.grading-content-wrapper` + `.main-content-area`
  - [ ] 段落外層加 `data-paragraph-id`、`data-order-index`
  - [ ] `restoreEssayContent(...)` 完成後補齊錨點
- [ ] 階段二：抽取共用批註工具（`js/features/annotation-utils.js`）
  - [ ] getTextNodes / findTextByAnchor / 偏移轉 Range / highlightWithRange
  - [ ] getIdealTop / adjustAllAnnotations
- [ ] 階段三：重構 StudentAnnotationViewer 類
  - [ ] 修改 init(essayId, paragraphs, mode)
  - [ ] 實作 loadAllAnnotations()（RPC）
  - [ ] 高亮渲染與浮動卡片渲染
  - [ ] 位置計算與避讓
  - [ ] 「edit」模式整合重定位管理器（監聽內容變動 → 重新錨定/標孤）
- [ ] 階段四：修改 app.js 初始化與模式決策
  - [ ] 單一實例初始化，傳入整篇段落與 mode
  - [ ] 提供「撤回並編輯」流程，切到 draft 與 `mode='edit'`
- [ ] 階段五：Realtime 監聽（essay 級）
- [ ] 階段六：CSS 確認（學生端不顯示連接線）
- [ ] 階段七：測試與驗證（含重定位與孤立流程）

## 參考文檔

- 老師端批註系統：`shiwen-baojian/js/features/annotation-manager.js`
- 老師端批改 UI：`shiwen-baojian/js/teacher/grading-ui.js`
- 當前學生端批註查看器：`shiwen-baojian/js/student/student-annotation-viewer.js`
- 學生端初始化位置（待改）：`shiwen-baojian/js/app.js:950`
- RPC：`shiwen-baojian/supabase/migrations/20250119_create_get_essay_annotations_function.sql`
