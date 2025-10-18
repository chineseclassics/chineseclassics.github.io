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
    console.log('🎨 渲染 AI 反饋:', feedback);
    
    // 獲取段落標題（用於側邊欄顯示）
    const paragraphTitle = getParagraphTitle(paragraphId);
    
    // 判斷是桌面端還是移動端
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
        // 移動端：內聯展開在段落下方
        renderMobileInlineFeedback(paragraphId, paragraphTitle, feedback);
    } else {
        // 桌面端：顯示在側邊欄
        renderDesktopFeedbackSidebar(paragraphId, paragraphTitle, feedback);
    }
    
    // 高亮當前段落
    highlightCurrentParagraph(paragraphId);
    
    // 更新段落問題徽章
    updateParagraphBadge(paragraphId, feedback);
    
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
}

/**
 * 桌面端：渲染反饋到側邊欄
 */
function renderDesktopFeedbackSidebar(paragraphId, paragraphTitle, feedback) {
    const sidebarContent = document.getElementById('sidebar-feedback-content');
    if (!sidebarContent) {
        console.error('❌ 找不到側邊欄容器');
        return;
    }
    
    // 構建反饋 HTML
    const feedbackHTML = buildFeedbackHTML(paragraphId, paragraphTitle, feedback);
    
    // 渲染到側邊欄
    sidebarContent.innerHTML = feedbackHTML;
    
    // 滾動到側邊欄頂部
    sidebarContent.scrollTop = 0;
    
    console.log('✅ 反饋已顯示在側邊欄');
}

/**
 * 移動端：內聯展開反饋（在段落下方）
 */
function renderMobileInlineFeedback(paragraphId, paragraphTitle, feedback) {
    // 獲取段落元素
    const paragraphElement = document.getElementById(paragraphId);
    if (!paragraphElement) {
        console.error('❌ 找不到段落元素:', paragraphId);
        return;
    }
    
    // 查找或創建反饋容器
    let feedbackContainer = paragraphElement.querySelector('.inline-feedback-container');
    
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'inline-feedback-container mt-4';
        paragraphElement.appendChild(feedbackContainer);
    }
    
    // 構建反饋 HTML（帶收起功能）
    const feedbackHTML = `
        <div class="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-lg p-1 mb-4 animate-slide-down">
            <!-- 視覺連接線 -->
            <div class="flex justify-center -mt-3">
                <div class="w-0.5 h-3 bg-blue-400"></div>
            </div>
            
            <!-- 反饋標題欄 -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-t flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-robot"></i>
                    <span class="font-semibold text-sm">針對上方「${paragraphTitle}」的 AI 反饋</span>
                </div>
                <button onclick="this.closest('.inline-feedback-container').remove()" 
                        class="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            
            <!-- 反饋內容 -->
            <div class="bg-white p-4 rounded-b">
                ${buildSimpleFeedbackHTML(feedback)}
            </div>
        </div>
    `;
    
    feedbackContainer.innerHTML = feedbackHTML;
    
    // 滾動到反饋位置
    feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    console.log('✅ 反饋已顯示在移動端內聯位置');
}

/**
 * 構建反饋 HTML（桌面端側邊欄專用）
 */
function buildFeedbackHTML(paragraphId, paragraphTitle, feedback) {
    return `
        <!-- 當前段落標識 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div class="flex items-center space-x-2 text-blue-800">
                <i class="fas fa-file-alt text-sm"></i>
                <span class="text-sm font-semibold">${paragraphTitle}</span>
            </div>
        </div>
        
        <!-- 嚴重程度徽章 -->
        <div class="mb-4">
            ${renderSeverityBadge(feedback.severity_level)}
        </div>
        
        <!-- 結構檢查 -->
        ${renderStructureCheck(feedback.structure_check)}
        
        <!-- 句子級問題（可點擊定位） -->
        ${renderSentenceIssues(feedback.sentence_level_issues, paragraphId)}
        
        <!-- 改進建議 -->
        ${renderSuggestions(feedback.improvement_suggestions)}
        
        <!-- 內容分析（摺疊） -->
        ${renderContentAnalysis(feedback.content_analysis, paragraphId)}
        
        <!-- 生成時間 -->
        <div class="text-xs text-gray-500 text-center mt-4 pt-4 border-t border-gray-200">
            生成時間：${formatTimestamp(feedback.generated_at)}
        </div>
    `;
}

/**
 * 構建簡化反饋 HTML（移動端內聯專用）
 */
function buildSimpleFeedbackHTML(feedback) {
    return `
        <!-- 結構檢查（簡化版） -->
        ${renderStructureCheckSimple(feedback.structure_check)}
        
        <!-- 句子級問題 -->
        ${renderSentenceIssuesSimple(feedback.sentence_level_issues)}
        
        <!-- 詳細分析按鈕 -->
        <button onclick="this.nextElementSibling.classList.toggle('hidden')" 
                class="w-full text-sm text-blue-600 hover:text-blue-800 mt-3 py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
            <i class="fas fa-chart-line mr-1"></i>
            查看詳細分析
        </button>
        <div class="hidden mt-3">
            ${renderContentAnalysisSimple(feedback.content_analysis)}
        </div>
    `;
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
        const titleInput = document.getElementById(`${paragraphId.split('-para-')[0]}-title`);
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
 * 渲染句子級問題（桌面端，可點擊定位）
 */
function renderSentenceIssues(sentenceIssues, paragraphId) {
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
                    <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                         onclick="scrollToParagraph('${paragraphId}')">
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
                        <div class="text-blue-500 text-xs">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * 渲染句子級問題（移動端簡化版）
 */
function renderSentenceIssuesSimple(sentenceIssues) {
    if (!sentenceIssues || sentenceIssues.length === 0) {
        return `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <p class="text-green-800 text-sm flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>沒有發現明顯問題</span>
                </p>
            </div>
        `;
    }
    
    return `
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-800 text-sm mb-2">
                具體問題 (${sentenceIssues.length})
            </h5>
            ${sentenceIssues.map(issue => `
                <div class="flex items-start space-x-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <div class="flex-shrink-0 w-6 h-6 rounded-full ${getSeverityColor(issue.severity)} flex items-center justify-center">
                        <span class="text-white text-xs font-bold">${issue.sentence_number || '!'}</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-medium text-gray-800">${issue.message}</p>
                        ${issue.suggestion ? `
                            <p class="text-xs text-gray-600 mt-1">${issue.suggestion}</p>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
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
// 段落高亮和導航
// ================================

/**
 * 高亮當前分析的段落
 */
function highlightCurrentParagraph(paragraphId) {
    // 移除所有段落的高亮
    document.querySelectorAll('.paragraph-highlighted').forEach(el => {
        el.classList.remove('paragraph-highlighted', 'ring-2', 'ring-blue-400', 'bg-blue-50');
    });
    
    // 高亮當前段落
    const paragraphElement = document.getElementById(paragraphId);
    if (paragraphElement) {
        paragraphElement.classList.add('paragraph-highlighted', 'ring-2', 'ring-blue-400', 'bg-blue-50');
        console.log('✅ 段落已高亮:', paragraphId);
    }
}

/**
 * 更新段落問題徽章
 */
function updateParagraphBadge(paragraphId, feedback) {
    const issueCount = feedback.sentence_level_issues?.length || 0;
    
    // 獲取段落標題區域
    let badgeContainer;
    
    if (paragraphId === 'intro') {
        badgeContainer = document.querySelector('#intro-editor').parentElement.querySelector('.flex.items-center.justify-between');
    } else if (paragraphId === 'conclusion') {
        badgeContainer = document.querySelector('#conclusion-editor').parentElement.querySelector('.flex.items-center.justify-between');
    } else {
        const paragraphElement = document.getElementById(paragraphId);
        badgeContainer = paragraphElement?.querySelector('.flex.items-center.justify-between');
    }
    
    if (!badgeContainer) return;
    
    // 移除舊徽章
    const oldBadge = badgeContainer.querySelector('.feedback-badge');
    if (oldBadge) {
        oldBadge.remove();
    }
    
    // 添加新徽章
    if (issueCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'feedback-badge bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold ml-2';
        badge.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i>${issueCount}個問題`;
        
        const titleEl = badgeContainer.querySelector('h3, .text-sm.font-medium');
        if (titleEl) {
            titleEl.appendChild(badge);
        }
    } else {
        const badge = document.createElement('span');
        badge.className = 'feedback-badge bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold ml-2';
        badge.innerHTML = `<i class="fas fa-check-circle mr-1"></i>無問題`;
        
        const titleEl = badgeContainer.querySelector('h3, .text-sm.font-medium');
        if (titleEl) {
            titleEl.appendChild(badge);
        }
    }
}

/**
 * 滾動到指定段落
 */
window.scrollToParagraph = function(paragraphId) {
    const paragraphElement = document.getElementById(paragraphId);
    if (paragraphElement) {
        paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 臨時高亮（閃爍效果）
        paragraphElement.classList.add('ring-4', 'ring-yellow-300');
        setTimeout(() => {
            paragraphElement.classList.remove('ring-4', 'ring-yellow-300');
        }, 2000);
    }
}

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
// 移動端簡化渲染函數
// ================================

/**
 * 渲染結構檢查（簡化版）
 */
function renderStructureCheckSimple(structureCheck) {
    if (!structureCheck) return '';
    
    const completeness = structureCheck.completeness || 0;
    const missingElements = structureCheck.missing_elements || [];
    
    return `
        <div class="bg-white rounded-lg p-3 border border-gray-200 mb-3">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-800">結構完整度</span>
                <span class="text-lg font-bold ${completeness >= 80 ? 'text-green-600' : completeness >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                    ${completeness}%
                </span>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full ${completeness >= 80 ? 'bg-green-600' : completeness >= 50 ? 'bg-yellow-600' : 'bg-red-600'}" 
                     style="width: ${completeness}%"></div>
            </div>
            
            ${missingElements.length > 0 ? `
                <div class="text-xs text-red-700 mt-2">
                    <span class="font-semibold">缺少：</span>
                    ${missingElements.join('、')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * 渲染內容分析（簡化版）
 */
function renderContentAnalysisSimple(contentAnalysis) {
    if (!contentAnalysis) return '';
    
    let analysisHTML = '<div class="space-y-2">';
    
    for (const [key, value] of Object.entries(contentAnalysis)) {
        if (!value || typeof value !== 'object' || key === 'skipped' || key === 'error') continue;
        
        const score = value.score || 0;
        const issues = value.issues || [];
        
        analysisHTML += `
            <div class="bg-gray-50 rounded p-2">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700">${key}</span>
                    <span class="text-xs font-bold ${score >= 7 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-600'}">
                        ${score}/10
                    </span>
                </div>
                ${issues.length > 0 ? `
                    <ul class="text-xs text-gray-600 space-y-1">
                        ${issues.slice(0, 2).map(issue => `
                            <li class="flex items-start">
                                <i class="fas fa-circle text-xs mr-1 mt-1 opacity-50"></i>
                                <span>${issue}</span>
                            </li>
                        `).join('')}
                        ${issues.length > 2 ? `<li class="text-gray-400">還有 ${issues.length - 2} 個問題...</li>` : ''}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    analysisHTML += '</div>';
    return analysisHTML;
}

// ================================
// 導出
// ================================

export { highlightSentenceIssues, highlightCurrentParagraph };

