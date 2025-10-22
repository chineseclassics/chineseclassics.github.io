# 階段 3.5：缺失功能緊急修復計劃

> **緊急程度**：🚨🚨🚨 P0（立即修復）  
> **發現時間**：2025-10-20  
> **修復目標**：與獨立頁面功能完全一致

## 📋 修復概述

基於對獨立頁面（`format-editor.html` + `format-editor.js`）的詳細分析，發現集成版本只移植了約 30% 的功能，導致核心設計原則被嚴重違反。本階段將完整修復所有缺失功能。

## 🎯 修復目標

### 核心目標
1. **修復強制 AI 優化漏洞**：用戶無法繞過 AI 優化直接保存
2. **實現完整狀態管理**：三種模式（direct/incremental/custom）正確管理
3. **添加實時狀態反饋**：用戶可看到當前狀態和下一步操作
4. **完善選擇起點 UI**：卡片式選擇界面，支持預覽功能
5. **補全格式管理功能**：搜索、篩選、排序、編輯等

### 成功標準
- ✅ 與獨立頁面功能 100% 一致
- ✅ 用戶無法繞過 AI 優化
- ✅ 三種模式正確工作
- ✅ 狀態面板實時更新
- ✅ 所有 UI 組件完整

## 📊 修復任務詳情

### 3.5.1 核心狀態管理系统修复（8 個任務）

#### 3.5.1.1 在 assignment-creator.js 添加完整狀態管理
**目標**：添加所有必要的狀態變量和方法

**實現內容**：
```javascript
// 添加狀態變量
let currentMode = 'custom';  // 'direct' | 'incremental' | 'custom'
let hasBeenOptimized = false;
let originalContent = '';
let cachedFormatJSON = null;

// 添加方法
function updateButtonStates() {
    const content = this.inlineQuill?.getText().trim() || '';
    const optimizeBtn = this.container.querySelector('#inlineOptimizeBtn');
    const saveBtn = this.container.querySelector('#inlineSaveBtn');
    
    // AI 優化按鈕
    if (currentMode === 'direct') {
        optimizeBtn.disabled = true;
    } else {
        optimizeBtn.disabled = !content || hasBeenOptimized;
    }
    
    // 保存按鈕
    if (currentMode === 'direct') {
        saveBtn.disabled = !cachedFormatJSON;
    } else {
        saveBtn.disabled = !hasBeenOptimized || !cachedFormatJSON;
    }
}

function updateStatus() {
    const statusPanel = this.container.querySelector('#statusPanel');
    if (!statusPanel) return;
    
    const modeText = {
        'direct': '直接使用系統格式',
        'incremental': '基於系統格式修改',
        'custom': '從零開始自定義'
    };
    
    const statusHTML = `
        <p>✏️ 模式：${modeText[currentMode]}</p>
        <p>📝 已優化：${hasBeenOptimized ? '是' : '否'}</p>
        <p>💾 可保存：${(hasBeenOptimized || currentMode === 'direct') && cachedFormatJSON ? '是' : '否'}</p>
    `;
    statusPanel.querySelector('#statusContent').innerHTML = statusHTML;
}

function handleContentChange() {
    const content = this.inlineQuill?.getText().trim() || '';
    
    // 檢測模式變化
    if (this.selectedTemplateId && content !== originalContent) {
        if (currentMode === 'direct') {
            currentMode = 'incremental';
            console.log('[AssignmentCreator] 模式切換：direct → incremental');
        }
        hasBeenOptimized = false;
        cachedFormatJSON = null;
    }
    
    updateButtonStates();
    updateStatus();
}
```

#### 3.5.1.2 在 format-template-page.js 添加完整狀態管理
**目標**：為模板庫頁面添加相同的狀態管理

**實現內容**：
- 添加相同的狀態變量
- 實現相同的狀態管理方法
- 集成到編輯模式中

#### 3.5.1.3 實現強制 AI 優化檢查邏輯
**目標**：確保用戶無法繞過 AI 優化

**實現內容**：
```javascript
// 在保存前檢查
function handleInlineSave() {
    if (!hasBeenOptimized && currentMode !== 'direct') {
        alert('請先使用 AI 優化寫作要求');
        return;
    }
    
    if (!cachedFormatJSON) {
        alert('格式 JSON 尚未生成，請先優化');
        return;
    }
    
    // 繼續保存邏輯...
}
```

#### 3.5.1.4 實現智能按鈕狀態管理
**目標**：按鈕狀態反映當前操作的有效性

**實現內容**：
- AI 優化按鈕：direct 模式禁用，其他模式有內容且未優化時啟用
- 保存按鈕：direct 模式有 JSON 時啟用，其他模式必須優化後啟用
- 實時更新按鈕狀態

#### 3.5.1.5 添加實時狀態面板 UI
**目標**：用戶可看到當前狀態

**實現內容**：
```html
<!-- 在 assignment-creator.js HTML 模板中添加 -->
<div id="statusPanel" class="bg-white rounded-lg shadow p-4 mt-4">
    <h3 class="text-sm font-semibold text-gray-700 mb-2">📊 當前狀態</h3>
    <div id="statusContent" class="text-sm text-gray-600">
        <p>✏️ 模式：從零開始</p>
        <p>📝 已優化：否</p>
        <p>💾 可保存：否</p>
    </div>
</div>
```

#### 3.5.1.6 實現狀態面板更新邏輯
**目標**：狀態面板實時反映當前狀態

**實現內容**：
- `updateStatus()` 方法：實時顯示狀態信息
- 模式文本映射：direct/incremental/custom
- 狀態變化時自動更新顯示

#### 3.5.1.7 實現內容變化監聽
**目標**：自動檢測用戶修改並切換模式

**實現內容**：
```javascript
// 在 Quill 初始化後添加
this.inlineQuill.on('text-change', () => {
    this.handleContentChange();
});
```

#### 3.5.1.8 測試狀態管理系統
**目標**：確保狀態管理正確工作

**測試內容**：
- 測試三種模式的正確切換
- 測試強制優化邏輯
- 測試按鈕狀態正確性
- 測試狀態面板實時更新

### 3.5.2 選擇起點 UI 完整實現（6 個任務）

#### 3.5.2.1 在 assignment-creator.js 添加選擇起點 UI
**目標**：添加卡片式選擇界面

**實現內容**：
```html
<!-- 替換現有的下拉菜單 -->
<div class="form-group">
    <label>選擇起點 <span class="required">*</span></label>
    
    <!-- 從零開始 -->
    <div id="startFromScratch" class="format-card mb-4 p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer transition hover:shadow-md">
        <div class="flex items-center gap-3">
            <div class="text-3xl">✏️</div>
            <div class="flex-1">
                <h3 class="font-semibold text-blue-900">從零開始</h3>
                <p class="text-sm text-blue-700">完全自定義寫作要求</p>
            </div>
            <div id="scratchCheck" class="text-blue-600">✓</div>
        </div>
    </div>

    <!-- 系統寫作要求列表 -->
    <h3 class="text-sm font-medium text-gray-700 mt-6 mb-3">或基於系統寫作要求：</h3>
    <div id="systemFormatsList" class="space-y-3">
        <!-- 系統格式卡片將動態生成 -->
    </div>

    <!-- 加載預覽按鈕 -->
    <button id="loadPreviewBtn" class="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50">
        📄 加載預覽
    </button>
</div>
```

#### 3.5.2.2 實現選擇起點邏輯
**目標**：處理用戶選擇並更新狀態

**實現內容**：
```javascript
function selectStartPoint(formatId) {
    // 更新選中狀態
    document.querySelectorAll('.format-card').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-gray-200');
        const check = card.querySelector('[id$="-check"]');
        if (check) check.classList.add('hidden');
    });
    
    if (formatId === 'scratch') {
        // 從零開始
        this.selectedTemplateId = null;
        currentMode = 'custom';
        // 更新視覺狀態...
    } else {
        // 選擇系統格式
        this.selectedTemplateId = formatId;
        currentMode = 'direct';
        // 更新視覺狀態...
    }
    
    updateButtonStates();
    updateStatus();
}
```

#### 3.5.2.3 實現加載預覽功能
**目標**：用戶可預覽系統格式

**實現內容**：
```javascript
async function loadFormatPreview() {
    if (!this.selectedTemplateId) {
        alert('請先選擇一個系統格式');
        return;
    }
    
    try {
        const format = await FormatEditorCore.loadSystemFormat(this.selectedTemplateId, this.supabase);
        const humanReadable = FormatEditorCore.formatJSONToHumanReadable(format.spec_json);
        
        this.inlineQuill.setText(humanReadable);
        originalContent = humanReadable;
        
        if (currentMode === 'direct') {
            cachedFormatJSON = format.spec_json;
            hasBeenOptimized = true;
        }
        
        updateButtonStates();
        updateStatus();
    } catch (error) {
        console.error('加載預覽失敗:', error);
        alert('加載預覽失敗：' + error.message);
    }
}
```

#### 3.5.2.4 在 format-template-page.js 添加選擇起點
**目標**：模板庫編輯模式也支持選擇起點

**實現內容**：
- 編輯模式添加起點選擇器
- 支持從零開始或基於系統格式
- 實現選擇邏輯和狀態管理

#### 3.5.2.5 實現 formatJSONToHumanReadable 完整邏輯
**目標**：確保 JSON 正確轉換為人類可讀格式

**實現內容**：
```javascript
// 在 FormatEditorCore 中完善
static formatJSONToHumanReadable(formatJSON) {
    let text = '';
    
    // 任務類型
    if (formatJSON.metadata && formatJSON.metadata.structure_type) {
        text += `【任務類型】\n${formatJSON.metadata.structure_type}\n\n`;
    }
    
    // 字數要求
    if (formatJSON.constraints && formatJSON.constraints.total_word_count) {
        const wc = formatJSON.constraints.total_word_count;
        if (wc.min && wc.max) {
            text += `【字數要求】\n• 總字數：${wc.min}-${wc.max} 字\n\n`;
        }
    }
    
    // 段落結構
    if (formatJSON.structure && formatJSON.structure.required_sections) {
        text += `【段落結構】\n`;
        formatJSON.structure.required_sections.forEach(section => {
            text += `• ${section.name}：${section.description || ''}\n`;
        });
        text += '\n';
    }
    
    // 內容要求
    if (formatJSON.content_requirements && formatJSON.content_requirements.length > 0) {
        text += `【內容要求】\n`;
        formatJSON.content_requirements.forEach(req => {
            if (req.literary_work) text += `• 作品：${req.literary_work}\n`;
            if (req.theme) text += `• 主題：${req.theme}\n`;
            if (req.specific_criteria) text += `• 要求：${req.specific_criteria.join('、')}\n`;
        });
        text += '\n';
    }
    
    // 檢查維度
    if (formatJSON.analysis_dimensions && formatJSON.analysis_dimensions.length > 0) {
        text += `【檢查維度】\n`;
        formatJSON.analysis_dimensions.forEach(dim => {
            text += `${dim.name}：\n`;
            dim.checks.forEach(check => {
                text += `- ${check}\n`;
            });
            text += '\n';
        });
    }
    
    return text.trim();
}
```

#### 3.5.2.6 測試選擇起點功能
**目標**：確保選擇起點功能正確工作

**測試內容**：
- 測試卡片選擇狀態
- 測試加載預覽功能
- 測試模式切換正確性
- 測試 JSON 轉換完整性

### 3.5.3 格式管理功能完善（5 個任務）

#### 3.5.3.1 在 format-template-page.js 添加搜索功能
**目標**：支持按名稱、描述搜索

**實現內容**：
```javascript
function setupSearch() {
    const searchInput = this.container.querySelector('#searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            this.filteredFormats = this.allFormats.filter(format => 
                format.name.toLowerCase().includes(query) ||
                (format.description && format.description.toLowerCase().includes(query))
            );
            this.renderFormats();
        });
    }
}
```

#### 3.5.3.2 添加篩選和排序功能
**目標**：支持類型篩選和排序

**實現內容**：
- 類型篩選：系統格式 / 自定義格式
- 排序選項：創建時間、名稱、更新時間
- 排序方向：升序 / 降序

#### 3.5.3.3 完善查看詳情功能
**目標**：模態框顯示完整信息

**實現內容**：
- 模態框顯示 human_input（自然語言）
- 顯示格式元數據（創建時間、類型等）
- 添加複製格式說明按鈕
- 添加編輯按鈕

#### 3.5.3.4 實現編輯現有格式流程
**目標**：支持編輯現有格式

**實現內容**：
- 編輯按鈕跳轉到編輯模式
- 加載現有格式到編輯器
- 設置正確的初始狀態（hasBeenOptimized = true）
- 保存時更新而非創建

#### 3.5.3.5 添加清空編輯器功能
**目標**：支持清空編輯器

**實現內容**：
- 清空按鈕和確認對話框
- 重置所有狀態變量
- 更新按鈕狀態和狀態面板

### 3.5.4 草稿自動保存完善（3 個任務）

#### 3.5.4.1 實現草稿恢復確認流程
**目標**：用戶可選擇是否恢復草稿

**實現內容**：
```javascript
// 在 FormatEditorCore 中完善
static askRestoreDraft(draftKey, quill) {
    const draft = this.loadDraft(draftKey);
    if (draft) {
        const shouldRestore = confirm(`發現未保存的草稿，是否恢復？\n\n草稿內容：\n${draft.substring(0, 100)}${draft.length > 100 ? '...' : ''}`);
        if (shouldRestore) {
            quill.setText(draft);
            console.log('[FormatEditorCore] 草稿已恢復');
            return true;
        } else {
            this.clearDraft(draftKey);
            console.log('[FormatEditorCore] 用戶拒絕恢復草稿');
            return false;
        }
    }
    return false;
}
```

#### 3.5.4.2 實現草稿過期管理
**目標**：草稿自動過期

**實現內容**：
- 草稿保存時間戳
- 超過 24 小時自動過期
- 過期草稿自動清除
- 顯示草稿時間信息

#### 3.5.4.3 完善草稿清理邏輯
**目標**：正確清理草稿

**實現內容**：
- 保存成功後清除草稿
- 取消編輯時清除草稿
- 頁面卸載時保存草稿
- 測試草稿功能完整性

### 3.5.5 集成測試和驗證（3 個任務）

#### 3.5.5.1 完整用戶流程測試
**目標**：確保所有流程正確工作

**測試場景**：
1. **模式 A**：直接使用系統格式
   - 選擇系統格式 → 加載預覽 → 直接保存
   - 驗證：無需 AI 優化，可直接保存

2. **模式 B**：基於系統格式修改
   - 選擇系統格式 → 加載預覽 → 修改內容 → AI 優化 → 保存
   - 驗證：必須 AI 優化才能保存

3. **模式 C**：從零開始自定義
   - 選擇從零開始 → 輸入內容 → AI 優化 → 保存
   - 驗證：必須 AI 優化才能保存

#### 3.5.5.2 狀態管理一致性測試
**目標**：確保狀態管理正確

**測試內容**：
- 按鈕狀態與業務邏輯一致
- 狀態面板顯示正確
- 模式切換邏輯正確
- 內容變化監聽正確

#### 3.5.5.3 刪除獨立頁面文件
**目標**：清理錯誤的文件

**清理內容**：
- 確認集成版本功能完整
- 刪除 format-editor.html
- 刪除 format-manager.html
- 刪除 format-editor.js
- 刪除 format-manager.js
- 更新相關文檔

## 📋 實施檢查清單

### 準備工作
- [ ] 備份當前集成版本
- [ ] 準備獨立頁面作為參考
- [ ] 設置測試環境

### 核心修復
- [ ] 3.5.1.1 添加狀態管理到 assignment-creator.js
- [ ] 3.5.1.2 添加狀態管理到 format-template-page.js
- [ ] 3.5.1.3 實現強制 AI 優化檢查
- [ ] 3.5.1.4 實現智能按鈕狀態管理
- [ ] 3.5.1.5 添加狀態面板 UI
- [ ] 3.5.1.6 實現狀態面板更新邏輯
- [ ] 3.5.1.7 實現內容變化監聽
- [ ] 3.5.1.8 測試狀態管理系統

### UI 完善
- [ ] 3.5.2.1 添加選擇起點 UI
- [ ] 3.5.2.2 實現選擇起點邏輯
- [ ] 3.5.2.3 實現加載預覽功能
- [ ] 3.5.2.4 模板庫添加選擇起點
- [ ] 3.5.2.5 完善 JSON 轉換邏輯
- [ ] 3.5.2.6 測試選擇起點功能

### 功能補全
- [ ] 3.5.3.1 添加搜索功能
- [ ] 3.5.3.2 添加篩選和排序
- [ ] 3.5.3.3 完善查看詳情
- [ ] 3.5.3.4 實現編輯流程
- [ ] 3.5.3.5 添加清空功能

### 草稿管理
- [ ] 3.5.4.1 實現恢復確認流程
- [ ] 3.5.4.2 實現過期管理
- [ ] 3.5.4.3 完善清理邏輯

### 測試驗證
- [ ] 3.5.5.1 完整用戶流程測試
- [ ] 3.5.5.2 狀態管理一致性測試
- [ ] 3.5.5.3 刪除獨立頁面文件

## 🎯 成功標準

### 功能完整性
- ✅ 與獨立頁面功能 100% 一致
- ✅ 所有 UI 組件完整
- ✅ 所有業務邏輯正確

### 用戶體驗
- ✅ 用戶無法繞過 AI 優化
- ✅ 狀態面板實時更新
- ✅ 按鈕狀態正確反映當前操作

### 技術質量
- ✅ 代碼結構清晰
- ✅ 錯誤處理完善
- ✅ 性能良好

## 📝 風險評估

### 高風險
- **狀態管理複雜性**：多個狀態變量需要正確同步
- **模式切換邏輯**：需要確保切換時機正確

### 中風險
- **UI 一致性**：需要確保與現有設計一致
- **性能影響**：添加更多監聽器可能影響性能

### 低風險
- **功能補全**：主要是添加缺失功能
- **測試驗證**：有獨立頁面作為參考

## 🚀 實施時間表

### 第一階段（2-3 小時）
- 核心狀態管理系統修復
- 強制 AI 優化檢查實現

### 第二階段（2-3 小時）
- 選擇起點 UI 完整實現
- 狀態面板添加

### 第三階段（1-2 小時）
- 格式管理功能完善
- 草稿管理完善

### 第四階段（1 小時）
- 集成測試和驗證
- 清理獨立頁面文件

**總計**：6-9 小時

---

**計劃創建時間**：2025-10-20  
**計劃創建者**：AI Assistant  
**修復優先級**：P0（立即修復）  
**預期完成時間**：2025-10-20 第三次會話
