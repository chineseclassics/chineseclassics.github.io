/**
 * 時文寶鑑 - 句子高亮器
 * 
 * 功能：
 * - 解析段落內容，分割句子
 * - 在編輯器中高亮指定句子
 * - 顯示句子提示條
 * - 自動滾動到句子位置
 */

// ================================
// 句子解析
// ================================

/**
 * 解析段落內容，分割成句子
 * @param {string} htmlContent - Quill 編輯器的 HTML 內容
 * @returns {array} 句子數組
 */
export function parseSentences(htmlContent) {
    // 移除 HTML 標籤，獲取純文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // 按中文句號、問號、感嘆號分割
    const sentences = plainText
        .split(/[。！？；]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    return sentences;
}

/**
 * 在編輯器中查找句子的位置
 * @param {object} quill - Quill 編輯器實例
 * @param {string} sentenceText - 句子文本
 * @returns {object} {index: 起始位置, length: 長度} 或 null
 */
function findSentenceInEditor(quill, sentenceText) {
    if (!quill || !sentenceText) return null;
    
    const editorText = quill.getText();
    const index = editorText.indexOf(sentenceText);
    
    if (index === -1) return null;
    
    return {
        index: index,
        length: sentenceText.length
    };
}

// ================================
// 句子高亮
// ================================

let currentHighlight = null; // 當前高亮狀態

/**
 * 高亮編輯器中的句子
 * @param {string} paragraphId - 段落 ID
 * @param {number} sentenceNumber - 句子編號（從 1 開始）
 * @param {string} sentenceText - 句子文本（可選，用於精確定位）
 */
export async function highlightSentence(paragraphId, sentenceNumber, sentenceText = null) {
    console.log('🎯 高亮句子:', { paragraphId, sentenceNumber, sentenceText });
    
    // 清除之前的高亮
    clearSentenceHighlight();
    
    // 獲取編輯器實例
    const editorInstance = await getEditorInstance(paragraphId);
    if (!editorInstance) {
        console.error('❌ 找不到編輯器實例:', paragraphId);
        return;
    }
    
    // 獲取段落內容
    const content = editorInstance.getHTML ? editorInstance.getHTML() : editorInstance.root.innerHTML;
    const sentences = parseSentences(content);
    
    if (sentenceNumber < 1 || sentenceNumber > sentences.length) {
        console.error('❌ 句子編號超出範圍:', sentenceNumber, '總句數:', sentences.length);
        return;
    }
    
    const targetSentence = sentences[sentenceNumber - 1];
    
    // 顯示句子提示條
    showSentenceTooltip(paragraphId, sentenceNumber, targetSentence);
    
    // 在編輯器中高亮句子
    highlightInEditor(editorInstance, targetSentence, paragraphId);
    
    // 滾動到段落位置
    scrollToParagraphSmooth(paragraphId);
}

/**
 * 顯示句子提示條
 */
function showSentenceTooltip(paragraphId, sentenceNumber, sentenceText) {
    // 移除舊的提示條
    const oldTooltip = document.getElementById('sentence-tooltip');
    if (oldTooltip) {
        oldTooltip.remove();
    }
    
    // 創建提示條
    const tooltip = document.createElement('div');
    tooltip.id = 'sentence-tooltip';
    tooltip.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down';
    tooltip.innerHTML = `
        <div class="bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-lg px-4 py-3 max-w-2xl">
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                    ${sentenceNumber}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-yellow-900 mb-1">第 ${sentenceNumber} 句：</p>
                    <p class="text-sm text-yellow-800">${sentenceText}</p>
                </div>
                <button onclick="this.closest('#sentence-tooltip').remove()" 
                        class="text-yellow-700 hover:text-yellow-900 p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // ✅ 改為 8 秒後自動移除（給用戶更多時間閱讀）
    setTimeout(() => {
        if (tooltip.parentElement) {
            tooltip.remove();
        }
    }, 8000);
}

/**
 * 在編輯器中高亮句子
 */
function highlightInEditor(editorInstance, sentenceText, paragraphId) {
    // 獲取 Quill 實例
    const quill = editorInstance.quill;
    if (!quill) {
        console.warn('⚠️ 無法獲取 Quill 實例，使用 DOM 高亮');
        highlightWithDOM(paragraphId, sentenceText);
        return;
    }
    
    // 在 Quill 中查找句子位置
    const position = findSentenceInEditor(quill, sentenceText);
    if (!position) {
        console.warn('⚠️ 找不到句子位置，使用 DOM 高亮');
        highlightWithDOM(paragraphId, sentenceText);
        return;
    }
    
    // 應用黃色背景格式
    quill.formatText(position.index, position.length, {
        'background': '#fef08a'  // yellow-200
    });
    
    // 保存當前高亮信息（用於清除）
    currentHighlight = {
        quill: quill,
        index: position.index,
        length: position.length,
        paragraphId: paragraphId
    };
    
    // ✅ 移除自動清除邏輯，保持高亮直到用戶點擊其他建議
    // 用戶點擊其他建議時會調用 clearSentenceHighlight() 清除
    
    console.log('✅ 句子已在編輯器中高亮（持續顯示）');
}

/**
 * 使用 DOM 方式高亮（備用方案）
 */
function highlightWithDOM(paragraphId, sentenceText) {
    const editorElement = document.getElementById(`${paragraphId}-editor`);
    if (!editorElement) return;
    
    const editorContent = editorElement.querySelector('.ql-editor');
    if (!editorContent) return;
    
    // 簡單方式：給整個編輯器加黃色背景
    editorContent.style.backgroundColor = '#fef08a';
    
    // 3 秒後移除
    setTimeout(() => {
        editorContent.style.backgroundColor = '';
    }, 3000);
    
    console.log('✅ 使用 DOM 方式高亮整個段落');
}

/**
 * 清除當前句子高亮
 */
export function clearSentenceHighlight() {
    if (!currentHighlight) return;
    
    const { quill, index, length } = currentHighlight;
    
    try {
        // 移除背景色格式
        quill.removeFormat(index, length);
        console.log('✅ 句子高亮已清除');
    } catch (error) {
        console.warn('⚠️ 清除高亮失敗:', error);
    }
    
    currentHighlight = null;
}

// ================================
// 輔助函數
// ================================

/**
 * 獲取編輯器實例
 */
async function getEditorInstance(paragraphId) {
    try {
        // 從 essay-writer.js 獲取真實的編輯器實例
        const { getEditorByParagraphId } = await import('../student/essay-writer.js');
        const editor = getEditorByParagraphId(paragraphId);
        
        if (editor && editor.quill) {
            return editor;
        }
    } catch (error) {
        console.warn('⚠️ 無法獲取編輯器實例:', error);
    }
    
    // 備用方案：使用 DOM 查詢
    return {
        getHTML: () => {
            const editorEl = document.getElementById(`${paragraphId}-editor`);
            const qlEditor = editorEl?.querySelector('.ql-editor');
            return qlEditor?.innerHTML || '';
        },
        quill: null
    };
}

/**
 * 平滑滾動到段落
 */
function scrollToParagraphSmooth(paragraphId) {
    const element = document.getElementById(paragraphId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ================================
// 導出
// ================================

// clearSentenceHighlight 和 highlightSentence 已在函數定義時導出
// showSentenceTooltip 是內部函數，不需要導出

