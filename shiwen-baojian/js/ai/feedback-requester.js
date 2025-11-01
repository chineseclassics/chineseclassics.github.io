/**
 * 時文寶鑑 - AI 反饋請求模組
 * 
 * 功能：
 * - 向 Edge Function 發送段落反饋請求
 * - 處理請求狀態和錯誤
 * - 提供加載狀態管理
 * - 智能緩存（基於內容哈希，內容變化時重新請求）
 */

import { renderFeedback } from './feedback-renderer.js';
import { loadHonglouFormatSpec } from '../data/format-spec-loader.js';

// 使用全局 AppState，避免循環導入
const AppState = window.AppState;

// ================================
// 工具函數
// ================================

/**
 * 計算內容的簡單哈希值（用於判斷內容是否變化）
 * @param {string} content - 內容文本
 * @returns {string} - 哈希值
 */
function simpleHash(content) {
    // 移除 HTML 標籤和多餘空白，只比較純文本
    const cleanText = content
        .replace(/<[^>]*>/g, '')  // 移除 HTML 標籤
        .replace(/\s+/g, ' ')      // 多個空白合併為一個
        .trim();
    
    // 使用簡單的字符串哈希算法
    let hash = 0;
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 轉換為 32 位整數
    }
    return hash.toString(16);
}

// ================================
// 反饋請求器
// ================================

/**
 * 請求 AI 反饋
 * @param {string} paragraphId - 段落 ID
 * @param {string} paragraphContent - 段落內容（HTML）
 * @param {string} paragraphType - 段落類型（introduction/body/conclusion）
 * @param {object} formatSpec - 格式規範（可選）
 * @returns {Promise<object>} - AI 反饋結果
 */
export async function requestAIFeedback(paragraphId, paragraphContent, paragraphType, formatSpecOrOptions = null) {
    if (!AppState.supabase) {
        throw new Error('Supabase 未初始化');
    }
    
    console.log('📤 請求 AI 反饋:', { paragraphId, paragraphType });
    
    try {
    // 1. 計算內容哈希值
    const contentHash = simpleHash(paragraphContent);
        console.log('🔑 內容哈希:', contentHash);
        
        // 2. 解析參數：相容舊版（formatSpec），支援新版 options { formatSpec, roleMeta }
        let formatSpec = null;
        let roleMeta = null; // { kind, label, bodyIndex }
        let sentences = null; // string[]（由 PM 分句插件計算）
        if (formatSpecOrOptions && typeof formatSpecOrOptions === 'object' && (formatSpecOrOptions.formatSpec || formatSpecOrOptions.roleMeta)) {
            formatSpec = formatSpecOrOptions.formatSpec || null;
            roleMeta = formatSpecOrOptions.roleMeta || null;
            sentences = Array.isArray(formatSpecOrOptions.sentences) ? formatSpecOrOptions.sentences : null;
        } else {
            formatSpec = formatSpecOrOptions;
        }

        // 3. 建立段落角色簽名（供快取及後端識別）
        const roleSignature = (() => {
            if (roleMeta && roleMeta.kind) {
                if (roleMeta.kind === 'body' && typeof roleMeta.bodyIndex === 'number') return `body-${roleMeta.bodyIndex}`;
                return roleMeta.kind; // introduction | conclusion
            }
            // 回退：使用基礎 paragraphType
            return paragraphType || 'body';
        })();

        // 4. 檢查緩存（內容哈希 + 角色簽名需一致）
        const cachedFeedback = AppState.cache.aiFeedbackCache[paragraphId];
        if (cachedFeedback && cachedFeedback.contentHash === contentHash && cachedFeedback.roleSignature === roleSignature) {
            console.log('📦 使用緩存的 AI 反饋（內容未變化）');
            
            // 直接渲染緩存的反饋
            renderFeedback(paragraphId, cachedFeedback.feedback);
            
            return {
                success: true,
                feedback: cachedFeedback.feedback,
                fromCache: true
            };
        }
        
        // 5. 內容已變化或無緩存，重新請求
        if (cachedFeedback) {
            console.log('🔄 內容已變化，重新請求 AI 反饋');
        } else {
            console.log('🆕 首次請求 AI 反饋');
        }
        
        // 6. 顯示加載狀態
        showLoadingState(paragraphId);
        
        // 7. 加載格式規範（如果沒有傳入）—向後相容（新後端不再強依賴）
        if (!formatSpec) {
            try {
                console.log('📥（相容）加載紅樓夢論文格式規範...');
                formatSpec = await loadHonglouFormatSpec();
            } catch (_) { formatSpec = null; }
        }
        
        // 8. 詳細段落型別（body-1、body-2…），intro/conclusion 原樣
        const paragraphTypeDetailed = roleSignature;

        // 8.1 構造 paragraph_text（純文字）
        const paragraphText = (paragraphContent || '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // 8.2 嘗試獲取老師指引與評分勾選（若前端有配置）
        const teacherGuidelinesText = (AppState?.teacherGuidelinesText || AppState?.assignment?.teacher_guidelines_text || '').trim() || null;
        const rubricSelection = AppState?.rubricSelection || null; // { rubric_id, selected_criteria: [...] }
        const rubricMode = AppState?.rubricMode || 'adaptive';
        const strictnessHint = AppState?.strictnessHint || 'adaptive';
        const traceability = (AppState?.traceability === false) ? false : true;

        // 9. 調用 Edge Function（新版契約 + 相容字段）
        const { data, error } = await AppState.supabase.functions.invoke('ai-feedback-agent', {
            body: {
                paragraph_id: paragraphId,
                // 新版字段
                paragraph_content_html: paragraphContent,
                paragraph_text: paragraphText,
                paragraph_type: paragraphType,
                paragraph_type_detailed: paragraphTypeDetailed,
                // 段落語義（向後相容）
                paragraph_role: roleMeta ? {
                    kind: roleMeta.kind || paragraphType,
                    label: roleMeta.label || null,
                    body_index: typeof roleMeta.bodyIndex === 'number' ? roleMeta.bodyIndex : null
                } : null,
                // 句子清單（若提供，供後端對齊）
                sentences: sentences || null,
                // 老師指引與 rubric（若有）
                teacher_guidelines_text: teacherGuidelinesText,
                strictness_hint: strictnessHint,
                traceability: traceability,
                rubric_selection: rubricSelection,
                rubric_mode: rubricMode,
                // 舊版相容字段（後端會忽略）
                format_spec: formatSpec
            }
        });
        
        if (error) {
            throw error;
        }
        
        if (!data || !data.success) {
            throw new Error(data?.error || 'AI 反饋生成失敗');
        }
        
        console.log('✅ AI 反饋獲取成功:', data);
        
        // 10. 更新緩存（納入角色簽名）
        AppState.cache.aiFeedbackCache[paragraphId] = {
            contentHash: contentHash,
            roleSignature: roleSignature,
            feedback: data.feedback,
            timestamp: Date.now()
        };
        console.log('💾 AI 反饋已緩存');
        
        // 11. 隱藏加載狀態
        hideLoadingState(paragraphId);
        
        // 12. 渲染反饋
        renderFeedback(paragraphId, data.feedback);
        try {
            // 若為 PM 單文檔路徑，並且 paragraphId 採用 pm-pos-<pos>，則在編輯器內掛上句子裝飾
            if (typeof paragraphId === 'string' && paragraphId.startsWith('pm-pos-')) {
                const pos = Number(paragraphId.slice('pm-pos-'.length));
                const notes = data.feedback?.sentence_notes || data.feedback?.sentence_level_issues || [];
                if (Array.isArray(notes) && notes.length > 0 && typeof window.__pmSetSentenceNotes === 'function') {
                    // 正規化字段名：確保有 sentence_number
                    const norm = notes.map(n => ({
                        sentence_number: n.sentence_number || n.sentence_index || n.idx || n.sentence || 0,
                        severity: n.severity || 'minor',
                        message: n.comment || n.message || '',
                        suggestion: n.suggestion || ''
                    })).filter(x => x.sentence_number > 0);
                    window.__pmSetSentenceNotes(pos, norm);
                }
            }
        } catch (_) {}
        
        // 13. 返回結果
        return {
            success: true,
            feedback: data.feedback,
            feedback_id: data.feedback_id,
            fromCache: false
        };
        
    } catch (error) {
        console.error('❌ 請求 AI 反饋失敗:', error);
        
        // 隱藏加載狀態
        hideLoadingState(paragraphId);
        
        // 顯示錯誤
        showErrorState(paragraphId, error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 獲取歷史反饋
 * @param {string} paragraphId - 段落 ID
 * @returns {Promise<array>} - 歷史反饋列表
 */
export async function getHistoricalFeedback(paragraphId) {
    if (!AppState.supabase) {
        throw new Error('Supabase 未初始化');
    }
    
    try {
        const { data, error } = await AppState.supabase
            .from('ai_feedback')
            .select('*')
            .eq('paragraph_id', paragraphId)
            .order('generated_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ 獲取到 ${data.length} 條歷史反饋`);
        return data;
        
    } catch (error) {
        console.error('❌ 獲取歷史反饋失敗:', error);
        return [];
    }
}

// ================================
// 加載狀態管理
// ================================

/**
 * 顯示加載狀態
 */
function showLoadingState(paragraphId) {
    // 獲取段落標題
    const paragraphTitle = getParagraphTitle(paragraphId);
    // 顯示加載時隱藏左側提示
    try { document.querySelector('.yucun-tip')?.classList.add('hidden'); } catch (_) {}
    
    // 判斷是桌面端還是移動端
    const isMobile = window.innerWidth < 1024;
    
    const loadingHTML = `
        <style>
          @keyframes dotBlink { 0%, 20% { opacity: 0.2 } 50% { opacity: 1 } 100% { opacity: 0.2 } }
        </style>
        <!-- 加載動畫：雨村先生正在仔細閱讀... -->
        <div class="flex flex-col items-center justify-center py-10 space-y-4">
            <div class="relative">
                <div class="w-16 h-16 border-4 border-stone-300 rounded-full"></div>
                <div class="absolute top-0 left-0 w-16 h-16 border-4 border-stone-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div class="text-center leading-relaxed">
                <p class="text-lg font-semibold text-gray-800">
                  雨村先生正在仔細閱讀你的文章
                </p>
                <p class="text-sm text-gray-500 mt-1">
                  請稍候<span style="animation: dotBlink 1.4s infinite">.</span><span style="animation: dotBlink 1.4s infinite 0.2s">.</span><span style="animation: dotBlink 1.4s infinite 0.4s">.</span>
                </p>
            </div>
        </div>
    `;
    
    if (isMobile) {
        // 移動端：內聯展開在段落下方
        showMobileInlineLoading(paragraphId, paragraphTitle, loadingHTML);
    } else {
        // 桌面端：在側邊欄顯示
        const sidebarContent = document.getElementById('sidebar-feedback-content');
        if (sidebarContent) {
            sidebarContent.classList.remove('hidden');
            sidebarContent.innerHTML = loadingHTML;
            sidebarContent.scrollTop = 0;
        }
    }
}

/**
 * 移動端：內聯顯示加載狀態
 */
function showMobileInlineLoading(paragraphId, paragraphTitle, loadingHTML) {
    const paragraphElement = document.getElementById(paragraphId);
    if (!paragraphElement) return;
    // 顯示加載時隱藏左側提示
    try { document.querySelector('.yucun-tip')?.classList.add('hidden'); } catch (_) {}
    
    // 查找或創建反饋容器
    let feedbackContainer = paragraphElement.querySelector('.inline-feedback-container');
    
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'inline-feedback-container mt-4';
        paragraphElement.appendChild(feedbackContainer);
    }
    
    // 顯示加載動畫（精簡樣式）
    feedbackContainer.innerHTML = `
        <div class="bg-white border border-stone-300 rounded-lg p-4 mb-4 animate-slide-down">
            ${loadingHTML}
        </div>
    `;
    
    // 滾動到加載位置
    feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 獲取段落標題
 */
function getParagraphTitle(paragraphId) {
    if (paragraphId === 'intro') {
        return '引言';
    } else if (paragraphId === 'conclusion') {
        return '結論';
    } else {
        // 嘗試從 DOM 中獲取分論點標題
        const argumentId = paragraphId.split('-para-')[0];
        const titleInput = document.getElementById(`${argumentId}-title`);
        const argumentTitle = titleInput?.value || '';
        
        // 獲取段落編號
        const paragraphElement = document.getElementById(paragraphId);
        const paragraphLabel = paragraphElement?.querySelector('.text-sm.font-medium')?.textContent || '段落';
        
        if (argumentTitle) {
            return `${argumentTitle} - ${paragraphLabel}`;
        } else {
            return paragraphLabel;
        }
    }
}

/**
 * 隱藏加載狀態
 */
function hideLoadingState(paragraphId) {
    // 加載狀態會被反饋內容替換，無需手動隱藏
}

/**
 * 顯示錯誤狀態
 */
function showErrorState(paragraphId, errorMessage) {
    const paragraphTitle = getParagraphTitle(paragraphId);
    const isMobile = window.innerWidth < 1024;
    
    const errorHTML = `
        <!-- 當前段落標識 -->
        <div class="bg-stone-50 border border-stone-300 rounded-lg p-3 mb-4">
            <div class="flex items-center space-x-2 text-stone-800">
                <i class="fas fa-file-alt text-sm"></i>
                <span class="text-sm font-semibold">${paragraphTitle}</span>
            </div>
        </div>
        
        <!-- 錯誤信息 -->
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-exclamation-circle text-rose-600 text-xl mt-0.5"></i>
                <div class="flex-1">
                    <h4 class="text-rose-800 font-semibold mb-1">獲取 AI 反饋失敗</h4>
                    <p class="text-rose-700 text-sm">${errorMessage}</p>
                    <button onclick="location.reload()" 
                            class="mt-3 text-sm text-rose-700 hover:text-rose-800 font-medium">
                        <i class="fas fa-redo mr-1"></i> 重新加載頁面
                    </button>
                </div>
            </div>
        </div>
    `;
    
    if (isMobile) {
        // 移動端：內聯展開在段落下方
        showMobileInlineLoading(paragraphId, paragraphTitle, errorHTML);
    } else {
        // 桌面端：顯示在側邊欄
        const sidebarContent = document.getElementById('sidebar-feedback-content');
        if (sidebarContent) {
            sidebarContent.innerHTML = errorHTML;
        }
    }
}

// ================================
// 導出
// ================================

export { showLoadingState, hideLoadingState, showErrorState };
