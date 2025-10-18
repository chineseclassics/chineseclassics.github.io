/**
 * 時文寶鑑 - AI 反饋請求模組
 * 
 * 功能：
 * - 向 Edge Function 發送段落反饋請求
 * - 處理請求狀態和錯誤
 * - 提供加載狀態管理
 */

import { AppState } from '../app.js';
import { renderFeedback } from './feedback-renderer.js';
import { loadHonglouFormatSpec } from '../data/format-spec-loader.js';

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
        // 1. 顯示加載狀態
        showLoadingState(paragraphId);
        
        // 2. 加載格式規範（如果沒有傳入）
        if (!formatSpec) {
            console.log('📥 加載紅樓夢論文格式規範...');
            formatSpec = await loadHonglouFormatSpec();
        }
        
        // 3. 調用 Edge Function
        const { data, error } = await AppState.supabase.functions.invoke('ai-feedback-agent', {
            body: {
                paragraph_id: paragraphId,
                paragraph_content: paragraphContent,
                paragraph_type: paragraphType,
                format_spec: formatSpec  // ✅ 現在會傳入完整的格式規範
            }
        });
        
        if (error) {
            throw error;
        }
        
        if (!data || !data.success) {
            throw new Error(data?.error || 'AI 反饋生成失敗');
        }
        
        console.log('✅ AI 反饋獲取成功:', data);
        
        // 4. 隱藏加載狀態
        hideLoadingState(paragraphId);
        
        // 5. 渲染反饋
        renderFeedback(paragraphId, data.feedback);
        
        // 6. 返回結果
        return {
            success: true,
            feedback: data.feedback,
            feedback_id: data.feedback_id
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
    const feedbackContainer = getFeedbackContainer(paragraphId);
    if (!feedbackContainer) return;
    
    feedbackContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 space-y-4">
            <div class="relative">
                <div class="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div class="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div class="text-center">
                <p class="text-lg font-medium text-gray-700">AI 正在分析您的段落...</p>
                <p class="text-sm text-gray-500 mt-1">這可能需要幾秒鐘</p>
            </div>
        </div>
    `;
    
    feedbackContainer.classList.remove('hidden');
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
    const feedbackContainer = getFeedbackContainer(paragraphId);
    if (!feedbackContainer) return;
    
    feedbackContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-exclamation-circle text-red-500 text-xl mt-0.5"></i>
                <div class="flex-1">
                    <h4 class="text-red-800 font-semibold mb-1">獲取 AI 反饋失敗</h4>
                    <p class="text-red-700 text-sm">${errorMessage}</p>
                    <button onclick="location.reload()" 
                            class="mt-3 text-sm text-red-600 hover:text-red-800 font-medium">
                        <i class="fas fa-redo mr-1"></i> 重新加載頁面
                    </button>
                </div>
            </div>
        </div>
    `;
    
    feedbackContainer.classList.remove('hidden');
}

/**
 * 獲取反饋容器
 */
function getFeedbackContainer(paragraphId) {
    const containerId = `${paragraphId}-feedback`;
    let container = document.getElementById(containerId);
    
    if (!container) {
        // 如果容器不存在，創建一個
        const paragraphElement = document.getElementById(paragraphId);
        if (!paragraphElement) return null;
        
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'mt-4 hidden';
        
        paragraphElement.appendChild(container);
    }
    
    return container;
}

// ================================
// 導出
// ================================

export { showLoadingState, hideLoadingState, showErrorState };

