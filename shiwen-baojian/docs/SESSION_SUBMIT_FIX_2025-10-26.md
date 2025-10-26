# 學生提交作業錯誤修復 - 2025-10-26

## 問題描述

學生在提交論文時出現以下錯誤：

### 錯誤 1: essay_revision_history 表 RLS 策略違規
```
new row violates row-level security policy for table "essay_revision_history"
```

**根本原因**：
- `essay_revision_history` 表只有 SELECT 的 RLS 策略，沒有 INSERT 策略
- 當觸發器 `trigger_track_essay_revision` 嘗試插入修訂歷史記錄時，被 RLS 攔截
- 錯誤代碼: `42501`（權限拒絕）

### 錯誤 2: typing_patterns 表插入 null 值違規
```
null value in column "speed_cpm" of relation "typing_patterns" violates not-null constraint
```

**根本原因**：
- `speed_cpm` 字段是 NOT NULL
- 在計算打字速度時可能產生 NaN 或 null 值
- 錯誤代碼: `23502`（NOT NULL 約束違規）

---

## 修復方案

### 1. 添加 essay_revision_history 的 INSERT 策略

**創建遷移**: `fix_essay_revision_history_insert_policy`

添加兩個 INSERT 策略：

#### 學生策略
```sql
CREATE POLICY "Students can insert their own revision history" ON essay_revision_history
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM essays e
            WHERE e.id = essay_revision_history.essay_id
            AND e.student_id = auth.uid()
        )
    );
```

#### 教師策略
```sql
CREATE POLICY "Teachers can insert revision history for their students" ON essay_revision_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM essays e
            JOIN assignments a ON e.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE e.id = essay_revision_history.essay_id
            AND c.teacher_id = auth.uid()
        )
    );
```

**修復邏輯**：
- 學生可以插入自己的修訂歷史（通過觸發器自動插入）
- 教師可以為自己班級學生的作業插入修訂歷史

### 2. 修正教師的查看策略

**創建遷移**: `fix_teachers_select_revision_history_policy`

```sql
CREATE POLICY "Teachers can view their students' revision history" ON essay_revision_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM essays e
            JOIN assignments a ON e.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE e.id = essay_revision_history.essay_id
            AND c.teacher_id = auth.uid()
        )
    );
```

**修正說明**：
- 原策略使用了不存在的 `class_memberships` 表
- 現策略直接通過 `classes` 表檢查教師身份

### 3. 修復 typing_patterns 插入邏輯

**文件**: `shiwen-baojian/js/features/anti-cheat.js`

#### 修改 1: recordTypingBurst 函數
```javascript
function recordTypingBurst() {
    if (!currentTypingBurst.start_time) return;
    
    const duration = Date.now() - currentTypingBurst.start_time;
    // 避免除零或產生 NaN
    const speed = duration > 0 ? (currentTypingBurst.char_count / duration) * 60000 : 0;
    const speedCpm = Math.round(speed) || 0; // 確保不為 NaN 或 null
    
    const typingPattern = {
        timestamp: new Date(currentTypingBurst.start_time).toISOString(),
        char_count: currentTypingBurst.char_count || 0,
        duration_ms: duration || 0,
        speed_cpm: speedCpm,
        session_id: AntiCheatState.currentSession.session_id
    };
    
    AntiCheatState.typingPatterns.push(typingPattern);
    AntiCheatState.currentSession.typing_speed_samples.push(speed);
    
    // 重置當前打字爆發
    currentTypingBurst = {
        start_time: null,
        char_count: 0,
        duration: 0
    };
}
```

**改進**：
- 添加除零檢查（`duration > 0`）
- 確保 `speedCpm` 永遠是有效數字（不是 NaN 或 null）
- 為所有字段添加默認值

#### 修改 2: saveMonitoringData 函數
```javascript
const { error: typingError } = await AppState.supabase
    .from('typing_patterns')
    .insert(
        AntiCheatState.typingPatterns
            .filter(pattern => pattern.speed_cpm != null && !isNaN(pattern.speed_cpm)) // 過濾掉無效數據
            .map(pattern => ({
                user_id: AppState.currentUser.id,
                session_id: pattern.session_id,
                timestamp: pattern.timestamp,
                char_count: pattern.char_count || 0,
                duration_ms: pattern.duration_ms || 0,
                speed_cpm: pattern.speed_cpm || 0
            }))
    );
```

**改進**：
- 在插入前過濾掉無效的 `speed_cpm` 值
- 為所有字段提供默認值以防萬一

---

## 測試建議

### 1. 測試學生提交
- 學生登錄，創建作業草稿
- 編輯內容
- 點擊提交按鈕
- 確認提交成功，無 RLS 錯誤

### 2. 測試修訂歷史記錄
```sql
SELECT * FROM essay_revision_history 
ORDER BY created_at DESC 
LIMIT 5;
```

確認記錄已正確創建。

### 3. 測試打字模式記錄
- 在作業中進行打字操作
- 等待自動保存或手動保存
- 檢查 `typing_patterns` 表是否有新記錄

### 4. 測試教師查看
- 教師登錄
- 查看學生的作業
- 確認可以查看修訂歷史

---

## 影響範圍

### 修改的數據庫表
- `essay_revision_history` - 新增 2 個 INSERT 策略，修正 1 個 SELECT 策略

### 修改的前端文件
- `shiwen-baojian/js/features/anti-cheat.js` - 修復打字模式記錄邏輯

### 未修改的功能
- 作業提交的核心邏輯
- 批注系統
- 其他監測功能

---

## 相關文件

- 遷移文件: `shiwen-baojian/supabase/migrations/20251026*.sql`
- 核心觸發器: `006_enhance_annotation_anchoring.sql` (track_essay_revision)
- 前端代碼: `shiwen-baojian/js/features/anti-cheat.js`

---

## 完成時間

2025-10-26

---

# 教師端批注創建錯誤修復

## 問題描述

教師為學生論文添加批注時出現外鍵約束違規錯誤：

```
insert or update on table "annotations" violates foreign key constraint 
"annotations_paragraph_id_fkey"
Key (paragraph_id)=(3c223936-b9e2-4fa0-9182-96a4f6ca4177) is not present in table "paragraphs".
```

**根本原因**：
- 教師端渲染作業內容時未為段落元素添加 `data-paragraph-id` 屬性
- 批注管理器無法從 DOM 獲取段落 ID
- 使用了錯誤的段落 ID（可能來自緩存或舊數據）

---

## 修復方案

### 修改文件: `shiwen-baojian/js/teacher/grading-ui.js`

#### 1. 為引言段落添加段落 ID 屬性

```javascript
// 找到引言段落 ID
const introParagraph = essay.paragraphs?.find(p => p.paragraph_type === 'introduction');
const introParaId = introParagraph?.id || '';

html += `
  <div class="paragraph-block" data-paragraph-id="${introParaId}">
    <h4 class="text-lg font-semibold text-gray-800 mb-2">
      <i class="fas fa-quote-left mr-2" style="color: var(--primary-500);"></i>引言
    </h4>
    <div class="paragraph-content">${content.introduction}</div>
  </div>
`;
```

#### 2. 為分論點段落添加段落 ID 屬性

```javascript
arg.paragraphs.forEach((para, pIndex) => {
  // 找到對應的段落 ID
  const bodyParagraphs = essay.paragraphs?.filter(p => p.paragraph_type === 'body');
  const paraId = bodyParagraphs && bodyParagraphs[index + pIndex]?.id || '';
  
  html += `
    <div class="paragraph-content sub-paragraph" data-paragraph-id="${paraId}">
      <div class="paragraph-label">段落 ${pIndex + 1}</div>
      ${para.content || ''}
    </div>
  `;
});
```

#### 3. 為結論段落添加段落 ID 屬性

```javascript
// 找到結論段落 ID
const conclParagraph = essay.paragraphs?.find(p => p.paragraph_type === 'conclusion');
const conclParaId = conclParagraph?.id || '';

html += `
  <div class="paragraph-block" data-paragraph-id="${conclParaId}">
    <h4 class="text-lg font-semibold text-gray-800 mb-2">
      <i class="fas fa-flag-checkered mr-2" style="color: var(--success-500);"></i>結論
    </h4>
    <div class="paragraph-content">${content.conclusion}</div>
  </div>
`;
```

#### 4. 為備用渲染方案（從 paragraphs 表）也添加段落 ID

```javascript
return `
  <div class="paragraph-block" data-paragraph-id="${p.id}">
    <h4>...</h4>
    <div class="paragraph-content">...</div>
  </div>
`;
```

### 修改文件: `shiwen-baojian/js/features/annotation-manager.js`

#### 在批注按鈕點擊時動態獲取段落 ID

```javascript
button.addEventListener('click', async (e) => {
  e.preventDefault();
  
  // 從選中文本的 DOM 元素中獲取段落 ID
  const paragraphElement = this.selectedText.range.commonAncestorContainer.closest('[data-paragraph-id]');
  if (paragraphElement) {
    const paragraphId = paragraphElement.dataset.paragraphId;
    console.log('📝 找到段落 ID:', paragraphId);
    if (paragraphId) {
      this.currentParagraphId = paragraphId;
    }
  }
  
  this.createAnnotation();
});
```

**改進**：
- 動態從 DOM 獲取段落 ID，不依賴初始化時的段落 ID
- 確保每次創建批注時使用正確的段落 ID
- 避免了使用過時或錯誤的段落 ID

---

## 測試建議

### 1. 測試引言批注
- 教師打開學生作業
- 在引言部分選中文字
- 添加批注
- 確認批注成功創建

### 2. 測試分論點批注
- 在分論點段落中選中文字
- 添加批注
- 確認批注成功創建

### 3. 測試結論批注
- 在結論部分選中文字
- 添加批注
- 確認批注成功創建

### 4. 驗證數據庫
```sql
SELECT id, paragraph_id, content, created_at 
FROM annotations 
WHERE paragraph_id IN (
  SELECT id FROM paragraphs WHERE essay_id = 'YOUR_ESSAY_ID'
)
ORDER BY created_at DESC;
```

---

## 影響範圍

### 修改的文件
- `shiwen-baojian/js/teacher/grading-ui.js` - 添加段落 ID 屬性到 DOM
- `shiwen-baojian/js/features/annotation-manager.js` - 動態獲取段落 ID

### 修復的功能
- 教師端批注創建功能
- 段落 ID 識別功能
- 批注與段落關聯功能
