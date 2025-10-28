/**
 * 時文寶鑑 - 學生論文編輯器
 * 
 * 功能：
 * - 管理分層段落結構（引言、分論點、結論）
 * - 集成 Quill.js 富文本編輯器
 * - 實時字數統計
 * - 自動保存
 */

import { RichTextEditor } from '../editor/rich-text-editor.js';
import { initializeStorage, saveEssayToSupabase, StorageState } from './essay-storage.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

// 動態獲取全局 AppState（避免 ES 模組載入時機問題）
function getAppState() {
    return window.AppState;
}

// ================================
// 編輯器狀態管理
// ================================

const EditorState = {
    introEditor: null,
    conclusionEditor: null,
    arguments: [], // { id, titleEditor, paragraphs: [{ id, editor }] }
    totalWordCount: 0,
    saveTimer: null,
    initialized: false,
    isInitializing: false  // 防止重复初始化
};

/**
 * 獲取編輯器實例（供外部模組使用）
 */
export function getEditorByParagraphId(paragraphId) {
    if (paragraphId === 'intro') {
        return EditorState.introEditor;
    } else if (paragraphId === 'conclusion') {
        return EditorState.conclusionEditor;
    } else {
        // 從分論點中查找
        for (const arg of EditorState.arguments) {
            const para = arg.paragraphs.find(p => p.id === paragraphId);
            if (para) {
                return para.editor;
            }
        }
    }
    return null;
}

// ================================
// 初始化編輯器
// ================================

export async function initializeEssayEditor(forceReinit = false) {
    // 如果強制重新初始化，先重置狀態
    if (forceReinit) {
        console.log('🔄 強制重新初始化編輯器...');
        EditorState.initialized = false;
        EditorState.isInitializing = false;
        EditorState.introEditor = null;
        EditorState.conclusionEditor = null;
        EditorState.arguments = [];
        EditorState.totalWordCount = 0;
        if (EditorState.saveTimer) {
            clearTimeout(EditorState.saveTimer);
            EditorState.saveTimer = null;
        }
    }
    
    // 防止重複初始化
    if (EditorState.initialized || EditorState.isInitializing) {
        console.log('⏸️ 編輯器已初始化或正在初始化中，跳過');
        return;
    }
    
    EditorState.isInitializing = true;
    console.log('📝 初始化論文編輯器...');
    
    try {
        // 0. 初始化存儲模組
        initializeStorage();
        
        // 1. 初始化引言編輯器
        const introContainer = document.getElementById('intro-editor');
        if (!introContainer) {
            console.error('❌ 找不到引言編輯器容器');
            return;
        }
        
        EditorState.introEditor = new RichTextEditor(introContainer, {
            placeholder: '在此撰寫引言...\n\n提示：引言應包含 Hook、定義、研究缺口、論文主張、結構預告',
            toolbarType: 'simple',
            onChange: handleEditorChange
        });
        
        console.log('✅ 引言編輯器初始化完成');
        
        // 2. 初始化結論編輯器
        const conclusionContainer = document.getElementById('conclusion-editor');
        if (!conclusionContainer) {
            console.error('❌ 找不到結論編輯器容器');
            return;
        }
        
        EditorState.conclusionEditor = new RichTextEditor(conclusionContainer, {
            placeholder: '在此撰寫結論...\n\n提示：結論應重申主張、總結論點、引申思考',
            toolbarType: 'simple',
            onChange: handleEditorChange
        });
        
        console.log('✅ 結論編輯器初始化完成');
        
        // 3. 綁定添加分論點按鈕
        const addArgumentBtn = document.getElementById('add-argument-btn');
        if (addArgumentBtn) {
            addArgumentBtn.addEventListener('click', addArgument);
        }
        
        // 4. 綁定標題輸入框變化事件
        const titleInput = document.getElementById('essay-title');
        const subtitleInput = document.getElementById('essay-subtitle');
        
        if (titleInput) {
            titleInput.addEventListener('input', handleEditorChange);
        }
        if (subtitleInput) {
            subtitleInput.addEventListener('input', handleEditorChange);
        }
        
        // 5. 綁定引言和結論的 AI 反饋按鈕
        const introFeedbackBtn = document.getElementById('intro-feedback-btn');
        if (introFeedbackBtn) {
            introFeedbackBtn.addEventListener('click', () => requestParagraphFeedback('intro', 'introduction'));
        }
        
        const conclusionFeedbackBtn = document.getElementById('conclusion-feedback-btn');
        if (conclusionFeedbackBtn) {
            conclusionFeedbackBtn.addEventListener('click', () => requestParagraphFeedback('conclusion', 'conclusion'));
        }
        
        // 6. 初始化字數統計
        updateWordCount();
        
        EditorState.initialized = true;
        EditorState.isInitializing = false;
        console.log('✅ 論文編輯器初始化完成');
        
    } catch (error) {
        console.error('❌ 編輯器初始化失敗:', error);
        EditorState.isInitializing = false;  // 發生錯誤時也要重置狀態
    }
}

// ================================
// 分論點管理
// ================================

/**
 * 添加新分論點
 */
export function addArgument() {
    const argumentId = `arg-${Date.now()}`;
    const argumentIndex = EditorState.arguments.length + 1;
    
    // 創建分論點 HTML 結構
    const argumentHTML = `
        <div id="${argumentId}" class="border-b border-gray-200 p-6 bg-gradient-to-r from-stone-50 to-transparent">
            <!-- 分論點標題 -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3 flex-1">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full bg-stone-600 text-white text-sm font-bold">
                        ${argumentIndex}
                    </div>
                    <input type="text" class="input"
                           id="${argumentId}-title"
                           placeholder="輸入分論點標題..."
                           class="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-stone-400 focus:border-stone-600 focus:outline-none px-2 py-1 transition-colors">
                </div>
                <button class="delete-argument-btn text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition-all"
                        data-argument-id="${argumentId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <!-- 段落容器 -->
            <div id="${argumentId}-paragraphs" class="space-y-4 ml-11">
                <!-- 段落將動態添加到這裡 -->
            </div>
            
            <!-- 添加段落按鈕 -->
            <div class="ml-11 mt-4">
                <button class="add-paragraph-btn w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-stone-400 rounded-lg text-stone-600 hover:border-stone-600 hover:bg-stone-50 text-sm transition-all"
                        data-argument-id="${argumentId}">
                    <i class="fas fa-plus"></i>
                    <span>添加段落</span>
                </button>
            </div>
        </div>
    `;
    
    // 插入到容器中
    const container = document.getElementById('arguments-container');
    container.insertAdjacentHTML('beforeend', argumentHTML);
    
    // 創建分論點對象
    const argument = {
        id: argumentId,
        index: argumentIndex,
        paragraphs: []
    };
    
    EditorState.arguments.push(argument);
    
    // 綁定刪除按鈕
    const deleteBtn = document.querySelector(`[data-argument-id="${argumentId}"].delete-argument-btn`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteArgument(argumentId));
    }
    
    // 綁定添加段落按鈕
    const addParagraphBtn = document.querySelector(`[data-argument-id="${argumentId}"].add-paragraph-btn`);
    if (addParagraphBtn) {
        addParagraphBtn.addEventListener('click', () => addParagraph(argumentId));
    }
    
    // 自動添加第一個段落
    addParagraph(argumentId);
    
    console.log(`✅ 已添加分論點 ${argumentIndex}`);
}

/**
 * 刪除分論點
 */
function deleteArgument(argumentId) {
    dialog.confirmDelete({
        message: '確定要刪除此分論點及其所有段落嗎？<br><br>此操作無法撤銷。',
        onConfirm: () => {
            // 從 DOM 中移除
            const element = document.getElementById(argumentId);
            if (element) {
                element.remove();
            }
            
            // 從狀態中移除
            const index = EditorState.arguments.findIndex(arg => arg.id === argumentId);
            if (index !== -1) {
                // 銷毀所有段落編輯器
                const argument = EditorState.arguments[index];
                argument.paragraphs.forEach(para => {
                    if (para.editor) {
                        para.editor.destroy();
                    }
                });
                
                EditorState.arguments.splice(index, 1);
            }
            
            // 重新編號
            renumberArguments();
            
            // 更新字數
            updateWordCount();
            
            // 提示
            toast.success('分論點已刪除！');
            
            console.log(`✅ 已刪除分論點: ${argumentId}`);
        }
    });
}

/**
 * 重新編號分論點
 */
function renumberArguments() {
    EditorState.arguments.forEach((argument, index) => {
        argument.index = index + 1;
        
        const badge = document.querySelector(`#${argument.id} .rounded-full`);
        if (badge) {
            badge.textContent = argument.index;
        }
    });
}

// ================================
// 段落管理
// ================================

/**
 * 添加段落到分論點
 */
export function addParagraph(argumentId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) {
        console.error('❌ 找不到分論點:', argumentId);
        return;
    }
    
    const paragraphId = `${argumentId}-para-${Date.now()}`;
    const paragraphIndex = argument.paragraphs.length + 1;
    
    // 創建段落 HTML
    const paragraphHTML = `
        <div id="${paragraphId}" class="paragraph-block bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">段落 ${paragraphIndex}</span>
                <div class="flex items-center space-x-2">
                    <!-- 雨村評點按鈕 -->
                    <button id="${paragraphId}-feedback-btn" 
                            class="premium-blue-text hover:premium-blue-text-dark hover:premium-blue-hover px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow"
                            data-paragraph-id="${paragraphId}"
                            title="請雨村評點">
                        <i class="fas fa-pen-fancy mr-2 text-base"></i>
                        雨村評點
                    </button>
                    <!-- 刪除按鈕 -->
                    <button class="delete-paragraph-btn text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-100 transition-all"
                            data-paragraph-id="${paragraphId}"
                            data-argument-id="${argumentId}">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
            <div id="${paragraphId}-editor" class="min-h-[150px]"></div>
            <div class="mt-2 flex items-center justify-between">
                <span id="${paragraphId}-word-count" class="text-xs text-gray-500">0 字</span>
            </div>
            <!-- 移動端 AI 反饋容器（內聯展開） -->
        </div>
    `;
    
    // 插入到段落容器
    const container = document.getElementById(`${argumentId}-paragraphs`);
    container.insertAdjacentHTML('beforeend', paragraphHTML);
    
    // 創建編輯器
    const editorContainer = document.getElementById(`${paragraphId}-editor`);
    const editor = new RichTextEditor(editorContainer, {
        placeholder: '在此撰寫段落內容...\n\n提示：主題句、文本證據、細讀分析、總結',
        toolbarType: 'simple',
        onChange: (data) => {
            // 更新段落字數
            const wordCountEl = document.getElementById(`${paragraphId}-word-count`);
            if (wordCountEl) {
                wordCountEl.textContent = `${data.wordCount.total} 字`;
            }
            
            // 觸發全局變化
            handleEditorChange(data);
        }
    });
    
    // 保存段落對象
    const paragraph = {
        id: paragraphId,
        index: paragraphIndex,
        editor: editor,
        type: 'body' // 正文段落
    };
    
    argument.paragraphs.push(paragraph);
    
    // 綁定刪除按鈕
    const deleteBtn = document.querySelector(`[data-paragraph-id="${paragraphId}"].delete-paragraph-btn`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteParagraph(argumentId, paragraphId));
    }
    
    // 綁定 AI 反饋按鈕
    const feedbackBtn = document.getElementById(`${paragraphId}-feedback-btn`);
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => requestParagraphFeedback(paragraphId, 'body'));
    }
    
    console.log(`✅ 已添加段落到分論點 ${argument.index}`);
}

/**
 * 刪除段落
 */
function deleteParagraph(argumentId, paragraphId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) {
        console.error('❌ 找不到分論點:', argumentId);
        return;
    }
    
    // 從 DOM 中移除
    const element = document.getElementById(paragraphId);
    if (element) {
        element.remove();
    }
    
    // 從狀態中移除
    const index = argument.paragraphs.findIndex(para => para.id === paragraphId);
    if (index !== -1) {
        // 銷毀編輯器
        const paragraph = argument.paragraphs[index];
        if (paragraph.editor) {
            paragraph.editor.destroy();
        }
        
        argument.paragraphs.splice(index, 1);
    }
    
    // 重新編號段落
    renumberParagraphs(argumentId);
    
    // 更新字數
    updateWordCount();
    
    console.log(`✅ 已刪除段落: ${paragraphId}`);
}

/**
 * 重新編號段落
 */
function renumberParagraphs(argumentId) {
    const argument = EditorState.arguments.find(arg => arg.id === argumentId);
    if (!argument) return;
    
    argument.paragraphs.forEach((paragraph, index) => {
        paragraph.index = index + 1;
        
        const label = document.querySelector(`#${paragraph.id} .text-sm.font-medium`);
        if (label) {
            label.textContent = `段落 ${paragraph.index}`;
        }
    });
}

// ================================
// 內容變化處理
// ================================

/**
 * 處理編輯器內容變化
 */
function handleEditorChange(data) {
    // 更新字數統計
    updateWordCount();
    
    // 檢查是否需要自動降級狀態（從 submitted 到 draft）
    checkAndDowngradeStatus();
    
    // 觸發自動保存（3秒防抖）
    if (EditorState.saveTimer) {
        clearTimeout(EditorState.saveTimer);
    }
    
    EditorState.saveTimer = setTimeout(() => {
        autoSave();
    }, 3000);
}

/**
 * 檢查並自動降級論文狀態（從 submitted 到 draft）
 */
async function checkAndDowngradeStatus() {
    try {
        // 獲取當前論文 ID
        const { StorageState } = await import('./essay-storage.js');
        const essayId = StorageState.currentEssayId;
        
        if (!essayId) return;
        
        // 防禦性檢查 - 在使用時檢查
        const AppState = getAppState();
        if (!AppState) {
            console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
            return;
        }
        
        // 檢查當前論文狀態
        const { data: essay } = await AppState.supabase
            .from('essays')
            .select('status')
            .eq('id', essayId)
            .single();
            
        if (!essay || essay.status !== 'submitted') {
            return; // 不是 submitted 狀態，不需要降級
        }
        
        // 更新狀態為 draft
        const { error } = await AppState.supabase
            .from('essays')
            .update({ 
                status: 'draft',
                updated_at: new Date().toISOString()
            })
            .eq('id', essayId);
            
        if (error) {
            console.error('❌ 更新論文狀態失敗:', error);
            return;
        }
        
        // 更新 UI 狀態顯示
        const statusText = document.getElementById('essay-status-text');
        if (statusText) {
            statusText.textContent = '草稿';
            statusText.classList.remove('text-blue-600', 'font-semibold');
        }
        
        // 顯示修改提示
        showModificationNotice();
        
        console.log('✅ 論文狀態已自動降級為草稿');
        
    } catch (error) {
        console.error('❌ 檢查狀態降級失敗:', error);
    }
}

/**
 * 顯示論文修改提示
 */
function showModificationNotice() {
    const container = document.getElementById('student-dashboard-content');
    if (!container) return;
    
    // 檢查是否已存在修改提示
    if (container.querySelector('.modification-notice')) {
        return;
    }
    
    const notice = document.createElement('div');
    notice.className = 'modification-notice bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4';
    notice.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-edit text-yellow-700"></i>
            <span class="text-yellow-800 font-medium">論文已修改，請重新提交</span>
        </div>
    `;
    
    const assignmentInfo = container.querySelector('#assignment-info-panel');
    if (assignmentInfo) {
        assignmentInfo.after(notice);
    }
}

/**
 * 更新總字數統計
 */
function updateWordCount() {
    let totalWords = 0;
    
    // 引言字數
    if (EditorState.introEditor) {
        const introCount = EditorState.introEditor.getWordCount().total;
        totalWords += introCount;
        
        const introCountEl = document.getElementById('intro-word-count');
        if (introCountEl) {
            introCountEl.textContent = `${introCount} 字`;
        }
    }
    
    // 分論點和段落字數
    EditorState.arguments.forEach(argument => {
        argument.paragraphs.forEach(paragraph => {
            if (paragraph.editor) {
                totalWords += paragraph.editor.getWordCount().total;
            }
        });
    });
    
    // 結論字數
    if (EditorState.conclusionEditor) {
        const conclusionCount = EditorState.conclusionEditor.getWordCount().total;
        totalWords += conclusionCount;
        
        const conclusionCountEl = document.getElementById('conclusion-word-count');
        if (conclusionCountEl) {
            conclusionCountEl.textContent = `${conclusionCount} 字`;
        }
    }
    
    // 更新總字數顯示
    EditorState.totalWordCount = totalWords;
    const wordCountDisplay = document.getElementById('word-count-display');
    if (wordCountDisplay) {
        wordCountDisplay.textContent = `${totalWords} 字`;
    }
}

// ================================
// 自動保存
// ================================

/**
 * 自動保存論文內容
 */
async function autoSave() {
    // 防禦性檢查 - 在使用時檢查
    const AppState = getAppState();
    if (!AppState) {
        console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
        return;
    }
    
    if (!AppState.supabase || !AppState.currentUser) {
        console.log('⏸️ 跳過自動保存（未登錄）');
        return;
    }
    
    console.log('💾 開始自動保存...');
    
    try {
        // 顯示保存中狀態
        updateSaveStatus('saving');
        
        // 收集所有內容
        const essayData = {
            title: document.getElementById('essay-title')?.value || '',
            subtitle: document.getElementById('essay-subtitle')?.value || '',
            introduction: EditorState.introEditor ? EditorState.introEditor.getHTML() : '',
            arguments: EditorState.arguments.map(arg => ({
                title: document.getElementById(`${arg.id}-title`)?.value || '',
                paragraphs: arg.paragraphs.map(para => ({
                    content: para.editor ? para.editor.getHTML() : ''
                }))
            })),
            conclusion: EditorState.conclusionEditor ? EditorState.conclusionEditor.getHTML() : '',
            word_count: EditorState.totalWordCount,
            last_saved_at: new Date().toISOString()
        };
        
        // 1. 保存到 localStorage（離線備份）
        localStorage.setItem('essay-draft', JSON.stringify(essayData));
        
        // 2. 保存到 Supabase 數據庫
        try {
            await saveEssayToSupabase(essayData);
            console.log('✅ 自動保存完成（Supabase + localStorage）');
            updateSaveStatus('saved');
        } catch (dbError) {
            console.warn('⚠️ Supabase 保存失敗，已保存到 localStorage:', dbError.message);
            updateSaveStatus('saved'); // 至少 localStorage 保存成功了
        }
        
    } catch (error) {
        console.error('❌ 自動保存失敗:', error);
        updateSaveStatus('error');
    }
}

/**
 * 更新保存狀態指示器
 */
function updateSaveStatus(status) {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    
    const icon = statusEl.querySelector('i');
    const text = statusEl.querySelector('span');
    
    switch (status) {
        case 'saving':
            icon.className = 'fas fa-spinner fa-spin text-stone-500';
            text.textContent = '保存中...';
            text.className = 'text-gray-600';
            break;
            
        case 'saved':
            icon.className = 'fas fa-check-circle text-emerald-600';
            text.textContent = '已保存';
            text.className = 'text-gray-600';
            break;
            
        case 'error':
            icon.className = 'fas fa-exclamation-circle text-rose-600';
            text.textContent = '保存失敗';
            text.className = 'text-rose-700';
            break;
    }
}

// ================================
// AI 反饋請求
// ================================

/**
 * 請求段落 AI 反饋
 */
async function requestParagraphFeedback(paragraphId, paragraphType) {
    console.log('🤖 請求段落 AI 反饋:', paragraphId);
    
    // 動態導入 AI 反饋模組
    try {
        const { requestAIFeedback } = await import('../ai/feedback-requester.js');
        
        // 獲取段落內容
        let content = '';
        let type = paragraphType;
        
        // 根據段落 ID 判斷類型和獲取內容
        if (paragraphId === 'intro') {
            content = EditorState.introEditor?.getHTML() || '';
            type = 'introduction';
        } else if (paragraphId === 'conclusion') {
            content = EditorState.conclusionEditor?.getHTML() || '';
            type = 'conclusion';
        } else {
            // 從分論點中查找段落
            for (const arg of EditorState.arguments) {
                const para = arg.paragraphs.find(p => p.id === paragraphId);
                if (para) {
                    content = para.editor?.getHTML() || '';
                    type = 'body';
                    break;
                }
            }
        }
        
        if (!content || content.trim() === '') {
            toast.warning('段落內容為空，請先撰寫內容再請求反饋');
            return;
        }
        
        // 防禦性檢查 - 在使用時檢查
        const AppState = getAppState();
        if (!AppState) {
            console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
            return;
        }
        
        // 調用 AI 反饋 API（傳遞格式規範）
        await requestAIFeedback(paragraphId, content, type, AppState.currentFormatSpec);
        
    } catch (error) {
        console.error('❌ 請求 AI 反饋失敗:', error);
        toast.error(`獲取 AI 反饋失敗：${error.message}`);
    }
}

// ================================
// 導出
// ================================

export { EditorState, requestParagraphFeedback };
