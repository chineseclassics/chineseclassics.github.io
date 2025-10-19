/**
 * 格式編輯器
 * 
 * 功能：
 * - 統一 Quill 編輯器界面
 * - 三種模式：直接使用 / 增量修改 / 完全自定義
 * - AI 兩階段優化
 * - 格式保存和管理
 * 
 * @created 2025-10-19
 * @related teacher-custom-format-ai (階段 2)
 */

// ============================================================
// 全局狀態
// ============================================================

let quillEditor = null;
let currentMode = 'custom';  // 'direct' | 'incremental' | 'custom'
let selectedFormatId = null;
let hasBeenOptimized = false;
let cachedFormatJSON = null;
let originalContent = '';
let editingFormatId = null;  // 如果正在編輯現有格式，存儲其 ID

// Supabase 配置
const SUPABASE_URL = 'https://fjvgfhdqrezutrmbidds.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmdmaGRxcmV6dXRybWJpZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDE3ODIsImV4cCI6MjA3NjM3Nzc4Mn0.eVX46FM_UfLBk9vJiCfA_zC9PIMTJxmG8QNZQWdG8T8';

// ============================================================
// 初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeQuillEditor();
    loadSystemFormats();
    updateStatus();
    
    // 檢查是否是編輯模式
    const urlParams = new URLSearchParams(window.location.search);
    const editFormatId = urlParams.get('edit');
    if (editFormatId) {
        loadFormatForEdit(editFormatId);
    }
});

/**
 * 初始化 Quill 編輯器（純文本模式）
 */
function initializeQuillEditor() {
    quillEditor = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: false  // 純文本編輯，無工具欄
        },
        placeholder: '請輸入格式要求...\n\n例如：\n論文總字數 1500-2000 字\n必須 3 個分論點\n詳細分析紅樓夢中林黛玉和薛寶釵的外貌描寫',
    });

    // 監聽內容變化
    quillEditor.on('text-change', handleContentChange);
    
    console.log('[FormatEditor] Quill 編輯器初始化完成');
}

/**
 * 處理內容變化
 */
function handleContentChange() {
    const content = quillEditor.getText().trim();
    
    // 檢測模式變化
    if (selectedFormatId && content !== originalContent) {
        // 從 direct 或 incremental 切換到有修改的狀態
        if (currentMode === 'direct') {
            currentMode = 'incremental';
            console.log('[FormatEditor] 模式切換：direct → incremental');
        }
        hasBeenOptimized = false;
        cachedFormatJSON = null;
    }
    
    // 更新按鈕狀態
    updateButtonStates();
    updateStatus();
}

// ============================================================
// 格式選擇
// ============================================================

/**
 * 選擇起點（從零開始或系統格式）
 */
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
        selectedFormatId = null;
        currentMode = 'custom';
        document.getElementById('startFromScratch').classList.remove('border-gray-200');
        document.getElementById('startFromScratch').classList.add('border-blue-500', 'bg-blue-50');
        document.getElementById('scratchCheck').classList.remove('hidden');
        
        // 清空編輯器
        if (quillEditor) {
            quillEditor.setText('');
            originalContent = '';
        }
        hasBeenOptimized = false;
        cachedFormatJSON = null;
        
        console.log('[FormatEditor] 選擇：從零開始');
    } else {
        // 選擇系統格式
        selectedFormatId = formatId;
        currentMode = 'direct';  // 初始為 direct 模式
        
        const card = document.querySelector(`[data-format-id="${formatId}"]`);
        if (card) {
            card.classList.remove('border-gray-200');
            card.classList.add('border-blue-500', 'bg-blue-50');
            const check = card.querySelector('[id$="-check"]');
            if (check) check.classList.remove('hidden');
        }
        
        console.log(`[FormatEditor] 選擇系統格式：${formatId}`);
    }
    
    updateButtonStates();
    updateStatus();
}

/**
 * 加載系統格式列表
 */
async function loadSystemFormats() {
    // TODO: 從數據庫加載系統格式
    // 目前只有一個硬編碼的紅樓夢格式
    console.log('[FormatEditor] 系統格式已加載');
}

/**
 * 加載格式預覽
 */
async function loadFormatPreview() {
    if (!selectedFormatId) {
        alert('請先選擇一個系統格式');
        return;
    }
    
    try {
        // TODO: 從數據庫或文件加載格式 JSON
        // 暫時使用示例
        const formatJSON = await loadFormatJSONById(selectedFormatId);
        
        // 轉換為人類可讀格式
        const humanReadable = formatJSONToHumanReadable(formatJSON);
        
        // 顯示在編輯器中
        quillEditor.setText(humanReadable);
        originalContent = humanReadable;
        
        // 緩存 JSON（如果直接使用，不需要 AI 優化）
        if (currentMode === 'direct') {
            cachedFormatJSON = formatJSON;
            hasBeenOptimized = true;  // 系統格式已經是優化的
        }
        
        updateButtonStates();
        updateStatus();
        
        console.log('[FormatEditor] 格式預覽已加載');
    } catch (error) {
        console.error('[FormatEditor] 加載格式預覽失敗:', error);
        alert('加載格式預覽失敗：' + error.message);
    }
}

// ============================================================
// AI 優化
// ============================================================

/**
 * 使用 AI 優化格式
 */
async function optimizeWithAI() {
    const content = quillEditor.getText().trim();
    
    if (!content) {
        alert('請先輸入格式要求');
        return;
    }
    
    // 顯示處理中狀態
    document.getElementById('aiProcessing').classList.remove('hidden');
    document.getElementById('optimizeBtn').disabled = true;
    
    try {
        // 調用 Edge Function - 階段 1：生成人類可讀版本
        const response = await fetch(`${SUPABASE_URL}/functions/v1/format-spec-generator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                stage: 'generate_readable',
                mode: currentMode === 'custom' ? 'custom' : 'incremental',
                teacher_input: content,
                base_template_id: selectedFormatId
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'AI 優化失敗');
        }
        
        // 更新編輯器內容為優化後的版本
        quillEditor.setText(result.human_readable);
        originalContent = result.human_readable;
        
        // 立即轉換為 JSON（階段 2）
        await convertToJSON(result.human_readable);
        
        hasBeenOptimized = true;
        updateButtonStates();
        updateStatus();
        
        console.log('[FormatEditor] AI 優化完成');
    } catch (error) {
        console.error('[FormatEditor] AI 優化失敗:', error);
        alert('AI 優化失敗：' + error.message);
    } finally {
        document.getElementById('aiProcessing').classList.add('hidden');
        document.getElementById('optimizeBtn').disabled = false;
    }
}

/**
 * 轉換為 JSON（階段 2：純代碼解析）
 */
async function convertToJSON(humanReadable) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/format-spec-generator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                stage: 'convert_to_json',
                human_readable: humanReadable
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'JSON 轉換失敗');
        }
        
        cachedFormatJSON = result.format_json;
        console.log('[FormatEditor] JSON 轉換完成，耗時:', result.parse_duration_ms, 'ms');
        
        return result.format_json;
    } catch (error) {
        console.error('[FormatEditor] JSON 轉換失敗:', error);
        throw error;
    }
}

// ============================================================
// 保存格式
// ============================================================

/**
 * 保存格式（打開對話框）
 */
function saveFormat() {
    if (!hasBeenOptimized && currentMode !== 'direct') {
        alert('請先使用 AI 優化格式');
        return;
    }
    
    if (!cachedFormatJSON) {
        alert('格式 JSON 尚未生成，請先優化');
        return;
    }
    
    // 打開保存對話框
    document.getElementById('saveDialog').classList.remove('hidden');
    
    // 預填名稱（如果有）
    if (cachedFormatJSON.metadata && cachedFormatJSON.metadata.name) {
        document.getElementById('formatName').value = cachedFormatJSON.metadata.name;
    }
}

/**
 * 確認保存
 */
async function confirmSave() {
    const name = document.getElementById('formatName').value.trim();
    const description = document.getElementById('formatDescription').value.trim();
    
    if (!name) {
        alert('請輸入格式名稱');
        return;
    }
    
    try {
        // 更新 metadata 中的名稱
        if (cachedFormatJSON.metadata) {
            cachedFormatJSON.metadata.name = name;
        }
        
        // 構建保存數據
        const formatData = {
            name: name,
            description: description,
            essay_type: cachedFormatJSON.metadata?.essay_type || 'custom',
            is_system: false,
            is_public: false,
            spec_json: cachedFormatJSON,
            parent_spec_id: selectedFormatId || null
        };
        
        // 判斷是創建還是更新
        let response;
        if (editingFormatId) {
            // 更新現有格式
            response = await fetch(`${SUPABASE_URL}/rest/v1/format_specifications?id=eq.${editingFormatId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'apikey': ANON_KEY,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(formatData)
            });
        } else {
            // 創建新格式
            response = await fetch(`${SUPABASE_URL}/rest/v1/format_specifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'apikey': ANON_KEY,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(formatData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '保存失敗');
        }
        
        const savedFormat = await response.json();
        console.log('[FormatEditor] 格式已保存:', savedFormat);
        
        alert(editingFormatId ? '✅ 格式已更新！' : '✅ 格式已保存！');
        closeSaveDialog();
        
        // 跳轉到格式管理頁面
        setTimeout(() => {
            window.location.href = 'format-manager.html';
        }, 500);
    } catch (error) {
        console.error('[FormatEditor] 保存失敗:', error);
        alert('保存失敗：' + error.message);
    }
}

/**
 * 關閉保存對話框
 */
function closeSaveDialog() {
    document.getElementById('saveDialog').classList.add('hidden');
    document.getElementById('formatName').value = '';
    document.getElementById('formatDescription').value = '';
}

// ============================================================
// 輔助函數
// ============================================================

/**
 * 格式 JSON 轉人類可讀文本
 */
function formatJSONToHumanReadable(formatJSON) {
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
        } else if (wc.min) {
            text += `【字數要求】\n• 總字數：至少 ${wc.min} 字\n\n`;
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
            if (req.literary_work) {
                text += `• 作品：${req.literary_work}\n`;
            }
            if (req.theme) {
                text += `• 主題：${req.theme}\n`;
            }
            if (req.specific_criteria) {
                text += `• 要求：${req.specific_criteria.join('、')}\n`;
            }
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

/**
 * 加載格式 JSON（從 ID）
 */
async function loadFormatJSONById(formatId) {
    // TODO: 從數據庫或文件加載
    // 暫時返回示例
    if (formatId === 'honglou-essay') {
        return {
            metadata: {
                name: '紅樓夢論文格式',
                essay_type: 'literary_analysis',
                structure_type: '完整論文'
            },
            constraints: {
                total_word_count: { min: 1500, max: 2500 }
            },
            structure: {
                required_sections: [
                    { id: 'intro', name: '引言', order: 1, description: '提出論點' },
                    { id: 'body', name: '正文', order: 2, description: '詳細分析' },
                    { id: 'conclusion', name: '結論', order: 3, description: '總結全文' }
                ]
            },
            content_requirements: [],
            analysis_dimensions: [
                {
                    id: 'analysis_depth',
                    name: '分析深度',
                    weight: 1.0,
                    checks: [
                        '是否引用原文？',
                        '是否深入分析？',
                        '是否有具體例證？'
                    ]
                }
            ]
        };
    }
    throw new Error('格式不存在');
}

/**
 * 更新按鈕狀態
 */
function updateButtonStates() {
    const content = quillEditor ? quillEditor.getText().trim() : '';
    const optimizeBtn = document.getElementById('optimizeBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    // AI 優化按鈕
    if (currentMode === 'direct') {
        // direct 模式不需要優化
        optimizeBtn.disabled = true;
    } else {
        // incremental 或 custom 模式，有內容且未優化時可優化
        optimizeBtn.disabled = !content || hasBeenOptimized;
    }
    
    // 保存按鈕
    if (currentMode === 'direct') {
        // direct 模式可直接保存
        saveBtn.disabled = !cachedFormatJSON;
    } else {
        // 其他模式需要先優化
        saveBtn.disabled = !hasBeenOptimized || !cachedFormatJSON;
    }
}

/**
 * 更新狀態面板
 */
function updateStatus() {
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
    
    document.getElementById('statusContent').innerHTML = statusHTML;
}

/**
 * 清空編輯器
 */
function clearEditor() {
    if (confirm('確定要清空編輯器內容嗎？')) {
        quillEditor.setText('');
        hasBeenOptimized = false;
        cachedFormatJSON = null;
        originalContent = '';
        updateButtonStates();
        updateStatus();
    }
}

/**
 * 加載格式進行編輯
 */
async function loadFormatForEdit(formatId) {
    try {
        // 從 Supabase 加載格式
        const response = await fetch(`${SUPABASE_URL}/rest/v1/format_specifications?id=eq.${formatId}&select=*`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`,
                'apikey': ANON_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('加載格式失敗');
        }
        
        const formats = await response.json();
        if (formats.length === 0) {
            throw new Error('格式不存在');
        }
        
        const format = formats[0];
        
        // 設置編輯模式
        editingFormatId = format.id;
        
        // 轉換為人類可讀格式並顯示
        const humanReadable = formatJSONToHumanReadable(format.spec_json);
        quillEditor.setText(humanReadable);
        originalContent = humanReadable;
        
        // 設置狀態
        selectedFormatId = format.parent_spec_id;
        currentMode = 'custom';  // 編輯模式視為自定義
        cachedFormatJSON = format.spec_json;
        hasBeenOptimized = true;
        
        updateButtonStates();
        updateStatus();
        
        console.log('[FormatEditor] 格式已加載編輯:', format.name);
    } catch (error) {
        console.error('[FormatEditor] 加載格式失敗:', error);
        alert('加載格式失敗：' + error.message);
    }
}

