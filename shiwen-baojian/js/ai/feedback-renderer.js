/**
 * 時文寶鑑 - AI 反饋渲染模組
 * 
 * 功能：
 * - 將 AI 反饋數據渲染為可視化界面
 * - 句子級問題高亮
 * - 反饋歷史查看
 */

// ================================
// 反饋渲染器
// ================================

/**
 * 渲染 AI 反饋
 * @param {string} paragraphId - 段落 ID
 * @param {object} feedback - AI 反饋對象
 */
export function renderFeedback(paragraphId, feedback) {
    const feedbackContainer = document.getElementById(`${paragraphId}-feedback`);
    if (!feedbackContainer) {
        console.error('❌ 找不到反饋容器:', paragraphId);
        return;
    }
    
    console.log('🎨 渲染 AI 反饋:', feedback);
    
    // 構建反饋 HTML
    const feedbackHTML = `
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <!-- 反饋標題和嚴重程度 -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-robot text-blue-600 text-xl"></i>
                    <h4 class="text-lg font-bold text-gray-800">AI 反饋</h4>
                </div>
                ${renderSeverityBadge(feedback.severity_level)}
            </div>
            
            <!-- 結構檢查 -->
            ${renderStructureCheck(feedback.structure_check)}
            
            <!-- 句子級問題 -->
            ${renderSentenceIssues(feedback.sentence_level_issues)}
            
            <!-- 改進建議 -->
            ${renderSuggestions(feedback.improvement_suggestions)}
            
            <!-- 內容分析（摺疊） -->
            ${renderContentAnalysis(feedback.content_analysis, paragraphId)}
            
            <!-- 生成時間 -->
            <div class="text-xs text-gray-500 text-right mt-4">
                生成時間：${formatTimestamp(feedback.generated_at)}
            </div>
        </div>
    `;
    
    feedbackContainer.innerHTML = feedbackHTML;
    feedbackContainer.classList.remove('hidden');
    
    // 高亮句子級問題
    highlightSentenceIssues(paragraphId, feedback.sentence_level_issues);
}

/**
 * 渲染嚴重程度徽章
 */
function renderSeverityBadge(severity) {
    const severityConfig = {
        critical: {
            label: '嚴重問題',
            icon: 'fas fa-exclamation-triangle',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            borderColor: 'border-red-300'
        },
        major: {
            label: '主要問題',
            icon: 'fas fa-exclamation-circle',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-800',
            borderColor: 'border-orange-300'
        },
        moderate: {
            label: '中等問題',
            icon: 'fas fa-info-circle',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-300'
        },
        minor: {
            label: '輕微問題',
            icon: 'fas fa-check-circle',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            borderColor: 'border-green-300'
        }
    };
    
    const config = severityConfig[severity] || severityConfig.minor;
    
    return `
        <div class="flex items-center space-x-2 ${config.bgColor} ${config.textColor} border ${config.borderColor} px-3 py-1 rounded-full">
            <i class="${config.icon} text-sm"></i>
            <span class="text-xs font-semibold">${config.label}</span>
        </div>
    `;
}

/**
 * 渲染結構檢查
 */
function renderStructureCheck(structureCheck) {
    if (!structureCheck) return '';
    
    const completeness = structureCheck.completeness || 0;
    const missingElements = structureCheck.missing_elements || [];
    const presentElements = structureCheck.present_elements || [];
    
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-gray-800">
                    <i class="fas fa-check-square text-blue-600 mr-2"></i>
                    結構完整度
                </h5>
                <div class="text-2xl font-bold ${completeness >= 80 ? 'text-green-600' : completeness >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                    ${completeness}%
                </div>
            </div>
            
            <!-- 進度條 -->
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div class="h-2.5 rounded-full transition-all ${completeness >= 80 ? 'bg-green-600' : completeness >= 50 ? 'bg-yellow-600' : 'bg-red-600'}" 
                     style="width: ${completeness}%"></div>
            </div>
            
            ${missingElements.length > 0 ? `
                <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                    <p class="text-sm font-semibold text-red-800 mb-1">
                        <i class="fas fa-times-circle mr-1"></i>
                        缺少的必需元素：
                    </p>
                    <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
                        ${missingElements.map(el => `<li>${el}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${presentElements.length > 0 ? `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p class="text-sm font-semibold text-green-800 mb-1">
                        <i class="fas fa-check-circle mr-1"></i>
                        已包含的元素：
                    </p>
                    <div class="flex flex-wrap gap-2">
                        ${presentElements.map(el => `
                            <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${el}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * 渲染句子級問題
 */
function renderSentenceIssues(sentenceIssues) {
    if (!sentenceIssues || sentenceIssues.length === 0) {
        return `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-green-800 flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>沒有發現明顯問題，請繼續保持！</span>
                </p>
            </div>
        `;
    }
    
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h5 class="font-semibold text-gray-800 mb-3">
                <i class="fas fa-list-ul text-blue-600 mr-2"></i>
                具體問題 (${sentenceIssues.length})
            </h5>
            
            <div class="space-y-2">
                ${sentenceIssues.map((issue, index) => `
                    <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full ${getSeverityColor(issue.severity)} flex items-center justify-center">
                            <span class="text-white text-xs font-bold">${issue.sentence_number || '!'}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-800">${issue.message}</p>
                            ${issue.suggestion ? `
                                <p class="text-xs text-gray-600 mt-1">
                                    <i class="fas fa-lightbulb mr-1"></i>
                                    ${issue.suggestion}
                                </p>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * 渲染改進建議
 */
function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return '';
    
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h5 class="font-semibold text-gray-800 mb-3">
                <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>
                改進建議
            </h5>
            
            <ul class="space-y-2">
                ${suggestions.map(suggestion => `
                    <li class="flex items-start space-x-2 text-sm text-gray-700">
                        <i class="fas fa-arrow-right text-blue-500 mt-1"></i>
                        <span>${suggestion}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

/**
 * 渲染內容分析（可摺疊）
 */
function renderContentAnalysis(contentAnalysis, paragraphId) {
    if (!contentAnalysis) return '';
    
    const analysisId = `analysis-${paragraphId}`;
    
    return `
        <div class="border-t border-gray-200 pt-4">
            <button onclick="document.getElementById('${analysisId}').classList.toggle('hidden')"
                    class="w-full flex items-center justify-between text-left text-sm font-medium text-gray-700 hover:text-gray-900">
                <span>
                    <i class="fas fa-chart-line mr-2"></i>
                    詳細分析
                </span>
                <i class="fas fa-chevron-down"></i>
            </button>
            
            <div id="${analysisId}" class="hidden mt-3 space-y-3">
                ${renderAnalysisDimension('clarity', '論點清晰度', contentAnalysis.clarity)}
                ${renderAnalysisDimension('evidence', '文本證據', contentAnalysis.evidence)}
                ${renderAnalysisDimension('depth', '分析深度', contentAnalysis.depth)}
            </div>
        </div>
    `;
}

/**
 * 渲染分析維度
 */
function renderAnalysisDimension(id, name, data) {
    if (!data) return '';
    
    const score = data.score || 0;
    const issues = data.issues || [];
    
    return `
        <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">${name}</span>
                <span class="text-sm font-bold ${score >= 7 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-600'}">
                    ${score}/10
                </span>
            </div>
            
            ${issues.length > 0 ? `
                <ul class="text-xs text-gray-600 space-y-1">
                    ${issues.map(issue => `
                        <li class="flex items-start space-x-1">
                            <i class="fas fa-circle text-gray-400 text-xs mt-1"></i>
                            <span>${issue}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="text-xs text-green-600">表現良好</p>'}
        </div>
    `;
}

// ================================
// 句子級問題高亮
// ================================

/**
 * 高亮句子級問題
 */
function highlightSentenceIssues(paragraphId, sentenceIssues) {
    if (!sentenceIssues || sentenceIssues.length === 0) return;
    
    const editorContainer = document.getElementById(`${paragraphId}-editor`);
    if (!editorContainer) return;
    
    // 獲取 Quill 編輯器實例
    const quillEditor = editorContainer.querySelector('.ql-editor');
    if (!quillEditor) return;
    
    // TODO: 實現句子級高亮邏輯
    // 這需要解析編輯器內容，定位句子，並添加高亮標記
    // 當前簡化版本暫不實現，後續可以優化
    
    console.log('💡 句子高亮功能待實現');
}

// ================================
// 輔助函數
// ================================

/**
 * 獲取嚴重程度對應的顏色
 */
function getSeverityColor(severity) {
    const colors = {
        critical: 'bg-red-500',
        major: 'bg-orange-500',
        moderate: 'bg-yellow-500',
        minor: 'bg-blue-500'
    };
    return colors[severity] || 'bg-gray-500';
}

/**
 * 格式化時間戳
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 如果是今天
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        
        if (hours > 0) {
            return `${hours} 小時前`;
        } else if (minutes > 0) {
            return `${minutes} 分鐘前`;
        } else {
            return '剛剛';
        }
    }
    
    // 否則顯示日期和時間
    return date.toLocaleString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ================================
// 導出
// ================================

export { highlightSentenceIssues };

