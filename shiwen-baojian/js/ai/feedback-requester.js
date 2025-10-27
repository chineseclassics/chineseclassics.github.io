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
export async function requestAIFeedback(paragraphId, paragraphContent, paragraphType, formatSpec = null) {
    if (!AppState.supabase) {
        throw new Error('Supabase 未初始化');
    }
    
    console.log('📤 請求 AI 反饋:', { paragraphId, paragraphType });
    
    try {
        // 1. 計算內容哈希值
        const contentHash = simpleHash(paragraphContent);
        console.log('🔑 內容哈希:', contentHash);
        
        // 2. 檢查緩存
        const cachedFeedback = AppState.cache.aiFeedbackCache[paragraphId];
        if (cachedFeedback && cachedFeedback.contentHash === contentHash) {
            console.log('📦 使用緩存的 AI 反饋（內容未變化）');
            
            // 直接渲染緩存的反饋
            renderFeedback(paragraphId, cachedFeedback.feedback);
            
            return {
                success: true,
                feedback: cachedFeedback.feedback,
                fromCache: true
            };
        }
        
        // 3. 內容已變化或無緩存，重新請求
        if (cachedFeedback) {
            console.log('🔄 內容已變化，重新請求 AI 反饋');
        } else {
            console.log('🆕 首次請求 AI 反饋');
        }
        
        // 4. 顯示加載狀態
        showLoadingState(paragraphId);
        
        // 5. 加載格式規範（如果沒有傳入）
        if (!formatSpec) {
            console.log('📥 加載紅樓夢論文格式規範...');
            formatSpec = await loadHonglouFormatSpec();
        }
        
        // 6. 調用 Edge Function
        const { data, error } = await AppState.supabase.functions.invoke('ai-feedback-agent', {
            body: {
                paragraph_id: paragraphId,
                paragraph_content: paragraphContent,
                paragraph_type: paragraphType,
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
        
        // 7. 更新緩存
        AppState.cache.aiFeedbackCache[paragraphId] = {
            contentHash: contentHash,
            feedback: data.feedback,
            timestamp: Date.now()
        };
        console.log('💾 AI 反饋已緩存');
        
        // 8. 隱藏加載狀態
        hideLoadingState(paragraphId);
        
        // 9. 渲染反饋
        renderFeedback(paragraphId, data.feedback);
        
        // 10. 返回結果
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
    
    // 判斷是桌面端還是移動端
    const isMobile = window.innerWidth < 1024;
    
    const loadingHTML = `
        <!-- 當前段落標識 -->
        <div class="bg-stone-50 border border-stone-300 rounded-lg p-3 mb-4">
            <div class="flex items-center space-x-2 text-stone-800">
                <i class="fas fa-file-alt text-sm"></i>
                <span class="text-sm font-semibold">${paragraphTitle}</span>
            </div>
        </div>
        
        <!-- 加載動畫 -->
        <div class="flex flex-col items-center justify-center py-12 space-y-4">
            <div class="relative">
                <div class="w-16 h-16 border-4 border-stone-300 rounded-full"></div>
                <div class="absolute top-0 left-0 w-16 h-16 border-4 border-stone-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div class="text-center">
                <p class="text-lg font-medium text-gray-700">AI 正在分析您的段落...</p>
                <p class="text-sm text-gray-500 mt-1">這可能需要幾秒鐘</p>
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
    
    // 查找或創建反饋容器
    let feedbackContainer = paragraphElement.querySelector('.inline-feedback-container');
    
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'inline-feedback-container mt-4';
        paragraphElement.appendChild(feedbackContainer);
    }
    
    // 顯示加載動畫（帶連接線）
    feedbackContainer.innerHTML = `
        <div class="bg-gradient-to-r from-stone-100 to-stone-200 border-2 border-stone-400 rounded-lg p-1 mb-4 animate-slide-down">
            <!-- 視覺連接線 -->
            <div class="flex justify-center -mt-3">
                <div class="w-0.5 h-3 bg-stone-400"></div>
            </div>
            
            <div class="bg-white p-4 rounded">
                ${loadingHTML}
            </div>
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

