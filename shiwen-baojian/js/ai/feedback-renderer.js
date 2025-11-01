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
    
    // 構建反饋 HTML（新版：指引對齊 + rubric 對齊 + 句子級備註）
    const feedbackHTML = `
        <div class="bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-300 rounded-lg p-6 space-y-4">
            <!-- 反饋標題和嚴重程度 -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-robot text-stone-600 text-xl"></i>
                    <h4 class="text-lg font-bold text-gray-800">AI 反饋</h4>
                </div>
                ${renderSeverityBadge(feedback.severity_level)}
            </div>

            <!-- 總體評語 -->
            ${renderOverallComment(feedback.overall_comment)}

            <!-- 指引對齊度（guideline_alignment） -->
            ${renderGuidelineAlignment(feedback.guideline_alignment || feedback.structure_check)}

            <!-- 評分標準對齊（rubric_alignment，可選） -->
            ${renderRubricAlignment(feedback.rubric_alignment)}

            <!-- 句子級反饋 -->
            ${renderSentenceNotes(feedback.sentence_notes || feedback.sentence_level_issues, paragraphId)}

            <!-- 內容分析（保留舊版可選） -->
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
    
    // 顯示反饋時隱藏左側提示（yucun-tip）
    try { document.querySelector('.yucun-tip')?.classList.add('hidden'); } catch (_) {}

    // 構建反饋 HTML
    const feedbackHTML = buildFeedbackHTML(paragraphId, paragraphTitle, feedback);
    
    // 渲染到側邊欄並顯示（若初始隱藏）
    sidebarContent.classList.remove('hidden');
        // 精簡：移除「針對段落」與收合區塊，直接顯示從「總體反饋」開始的內容
        sidebarContent.innerHTML = `${feedbackHTML}`;

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
    
    // 顯示反饋時隱藏左側提示（yucun-tip）
    try { document.querySelector('.yucun-tip')?.classList.add('hidden'); } catch (_) {}

    // 查找或創建反饋容器
    let feedbackContainer = paragraphElement.querySelector('.inline-feedback-container');
    
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'inline-feedback-container mt-4';
        paragraphElement.appendChild(feedbackContainer);
    }
    
    // 構建精簡反饋 HTML：移除標題欄，直接從「總體反饋」開始顯示
    const feedbackHTML = `
        <div class="bg-white border border-stone-300 rounded-lg p-4 mb-4 animate-slide-down relative">
            <button title="關閉" onclick="(function(btn){ const c=btn.closest('.inline-feedback-container'); if(c) c.remove(); const tip=document.querySelector('.yucun-tip'); if(tip) tip.classList.remove('hidden'); })(this)" 
                    class="absolute right-2 top-2 text-stone-500 hover:text-stone-800 p-1 rounded">
                <i class="fas fa-times text-sm"></i>
            </button>
            ${buildSimpleFeedbackHTML(feedback)}
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
        <!-- 總體評語 -->
        ${renderOverallComment(feedback.overall_comment)}

        <!-- 指引對齊度（guideline_alignment） -->
        ${renderGuidelineAlignment(feedback.guideline_alignment || feedback.structure_check)}

        <!-- 評分標準對齊（rubric_alignment，可選） -->
        ${renderRubricAlignment(feedback.rubric_alignment)}

        <!-- 句子級反饋（可點擊定位） -->
        ${renderSentenceNotes(feedback.sentence_notes || feedback.sentence_level_issues, paragraphId)}

        <!-- 改進建議（舊版保留） -->
        ${renderSuggestions(feedback.improvement_suggestions || feedback.suggestions_form)}
        
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
        <!-- 總體評語（簡易） -->
        ${renderOverallComment(feedback.overall_comment)}

        <!-- 指引對齊度（簡化） -->
        ${renderGuidelineAlignmentSimple(feedback.guideline_alignment || feedback.structure_check)}

        <!-- 句子級備註 -->
        ${renderSentenceIssuesSimple(feedback.sentence_notes || feedback.sentence_level_issues)}
        
        <!-- 詳細分析按鈕 -->
        <button onclick="this.nextElementSibling.classList.toggle('hidden')" 
                class="w-full text-sm text-stone-600 hover:text-stone-800 mt-3 py-2 border border-stone-300 rounded hover:bg-stone-50 transition-colors">
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
            bgColor: 'bg-rose-100',
            textColor: 'text-rose-800',
            borderColor: 'border-rose-400'
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
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-800',
            borderColor: 'border-amber-400'
        },
        minor: {
            label: '輕微問題',
            icon: 'fas fa-check-circle',
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-800',
            borderColor: 'border-emerald-400'
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
function renderOverallComment(text) {
    if (!text) return '';
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h5 class="font-semibold text-gray-800 mb-2">
                <i class="fas fa-comment-dots text-stone-600 mr-2"></i>
                總體反饋
            </h5>
            <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">${text}</p>
        </div>
    `;
}

function renderGuidelineAlignment(g) {
    if (!g) return '';
    // 向後相容：若是舊的 structure_check，轉為簡化顯示
    if (g && typeof g === 'object' && 'completeness' in g) {
        const completeness = g.completeness || 0;
        const missing = g.missing_elements || [];
        return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-gray-800">
                    <i class="fas fa-check-square text-stone-600 mr-2"></i>
                    指引對齊度（舊版資料映射）
                </h5>
                <div class="text-2xl font-bold ${completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-rose-600'}">${completeness}%</div>
            </div>
            ${missing.length > 0 ? `<div class="text-xs text-rose-700">缺少：${missing.join('、')}</div>` : ''}
        </div>`;
    }
    const score = g.score || 0;
    const checks = Array.isArray(g.checks) ? g.checks : [];
    const snippets = Array.isArray(g.rationale_snippets) ? g.rationale_snippets : [];
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-gray-800">
                    <i class="fas fa-check-square text-stone-600 mr-2"></i>
                    指引對齊度（guideline_alignment）
                </h5>
                <div class="text-2xl font-bold ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}">${score}%</div>
            </div>
            ${checks.length > 0 ? `
            <div class="space-y-2">
              ${checks.map(c => `
                <div class="flex items-start gap-2 text-sm">
                  <span class="px-2 py-0.5 rounded text-xs ${c.source === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}">${c.source}</span>
                  <span class="font-medium ${c.status === 'met' ? 'text-emerald-700' : c.status === 'partially_met' ? 'text-amber-700' : c.status === 'not_met' ? 'text-rose-700' : 'text-gray-700'}">${c.status}</span>
                  <span class="text-gray-800">${c.name}</span>
                </div>
              `).join('')}
            </div>` : ''}
            ${snippets.length > 0 ? `
              <div class="mt-3 text-xs text-gray-600">
                <div class="font-semibold mb-1">依據片段：</div>
                <ul class="list-disc list-inside space-y-1">
                  ${snippets.map(s => `<li>${s}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
        </div>
    `;
}

function renderRubricAlignment(r) {
    if (!r || !Array.isArray(r.criteria)) return '';
    const score = r.score;
    return `
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h5 class="font-semibold text-gray-800">
            <i class="fas fa-scale-balanced text-stone-600 mr-2"></i>
            評分標準對齊（rubric_alignment）<span class="ml-2 text-xs text-gray-500">teacher > rubric</span>
          </h5>
          ${typeof score === 'number' ? `<div class="text-2xl font-bold text-stone-700">${Math.round(score)}%</div>` : ''}
        </div>
        <div class="space-y-2">
          ${r.criteria.map(c => `
            <div class="flex items-start gap-2 text-sm">
              ${c.dimension ? `<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">${c.dimension}</span>` : ''}
              <span class="font-medium ${c.status === 'met' ? 'text-emerald-700' : c.status === 'partially_met' ? 'text-amber-700' : c.status === 'not_met' ? 'text-rose-700' : 'text-gray-700'}">${c.status}</span>
              <span class="text-gray-800">${c.name || c.id}</span>
              ${c.scope === 'essay' ? `<span class="ml-auto text-xs text-gray-600">此段對整篇：${c.paragraph_contribution || 'neutral'}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
}

/**
 * 渲染句子級問題（桌面端，可點擊定位）
 */
function renderSentenceNotes(sentenceNotes, paragraphId) {
    if (!sentenceNotes || sentenceNotes.length === 0) {
        return `
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p class="text-emerald-800 flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>沒有發現明顯問題，請繼續保持！</span>
                </p>
            </div>
        `;
    }
    
    return `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h5 class="font-semibold text-gray-800 mb-3">
                <i class="fas fa-list-ul text-stone-600 mr-2"></i>
                具體問題 (${sentenceNotes.length})
                <span class="text-xs text-gray-500 font-normal ml-2">點擊查看原句</span>
            </h5>
            
            <div class="space-y-2">
                ${sentenceNotes.map((issue, index) => {
                    const sentenceNum = issue.sentence_number || 0;
                    
                    return `
                    <div class="sentence-issue-item flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer group"
                         data-paragraph-id="${paragraphId}"
                         data-sentence-number="${sentenceNum}"
                         onclick="handleSentenceClick('${paragraphId}', ${sentenceNum})">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full ${getSeverityColor(issue.severity)} flex items-center justify-center">
                            <span class="text-white text-xs font-bold">${sentenceNum || '!'}</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-800">${issue.comment || issue.message}</p>
                            ${issue.suggestion ? `
                                <p class="text-xs text-gray-600 mt-1">
                                    <i class="fas fa-lightbulb mr-1"></i>
                                    ${issue.suggestion}
                                </p>
                            ` : ''}
                        </div>
                        <div class="text-amber-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="fas fa-eye"></i>
                        </div>
                    </div>
                    `;
                }).join('')}
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
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p class="text-emerald-800 text-sm flex items-center">
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
                        <p class="text-xs font-medium text-gray-800">${issue.comment || issue.message}</p>
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
                <i class="fas fa-lightbulb text-amber-600 mr-2"></i>
                改進建議
            </h5>
            
            <ul class="space-y-2">
                ${suggestions.map(suggestion => `
                    <li class="flex items-start space-x-2 text-sm text-gray-700">
                        <i class="fas fa-arrow-right text-stone-500 mt-1"></i>
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
                <span class="text-sm font-bold ${score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-rose-600'}">
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
            ` : '<p class="text-xs text-emerald-600">表現良好</p>'}
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
        el.classList.remove('paragraph-highlighted', 'ring-2', 'ring-blue-400', 'bg-stone-50');
    });
    
    // 高亮當前段落
    const paragraphElement = document.getElementById(paragraphId);
    if (paragraphElement) {
        paragraphElement.classList.add('paragraph-highlighted', 'ring-2', 'ring-blue-400', 'bg-stone-50');
        console.log('✅ 段落已高亮:', paragraphId);
    }
}

/**
 * 更新段落問題徽章
 */
function updateParagraphBadge(paragraphId, feedback) {
    const issueCount = (feedback.sentence_notes?.length || feedback.sentence_level_issues?.length || 0);
    
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
        badge.className = 'feedback-badge bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold ml-2';
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
 * 處理句子點擊事件（全局函數）
 */
window.handleSentenceClick = async function(paragraphId, sentenceNumber) {
    console.log('🖱️ 點擊句子問題:', { paragraphId, sentenceNumber });
    
    if (sentenceNumber === 0) {
        // 整體問題，只滾動到段落
        scrollToParagraph(paragraphId);
        return;
    }
    
    // 動態導入句子高亮器
    try {
        const { highlightSentence } = await import('./sentence-highlighter.js');
        highlightSentence(paragraphId, sentenceNumber);
    } catch (error) {
        console.error('❌ 加載句子高亮器失敗:', error);
        // 備用方案：只滾動到段落
        scrollToParagraph(paragraphId);
    }
}

/**
 * 切換詳細分析展開/收起（全局函數）
 */
window.toggleDetailedAnalysis = function(button) {
    const detailedContent = button.nextElementSibling;
    const toggleText = button.querySelector('.toggle-text');
    const icon = button.querySelector('i');
    
    if (detailedContent && detailedContent.classList.contains('hidden')) {
        detailedContent.classList.remove('hidden');
        if (toggleText) toggleText.textContent = '收起詳細分析';
        if (icon) {
            icon.classList.remove('fa-chart-line');
            icon.classList.add('fa-chevron-up');
        }
    } else if (detailedContent) {
        detailedContent.classList.add('hidden');
        if (toggleText) toggleText.textContent = '查看詳細分析';
        if (icon) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chart-line');
        }
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
        critical: 'bg-rose-500',
        major: 'bg-orange-500',
        moderate: 'bg-amber-600',
        minor: 'bg-stone-500'
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
function renderGuidelineAlignmentSimple(g) {
    if (!g) return '';
    if (g && 'completeness' in g) {
        const completeness = g.completeness || 0;
        return `
        <div class="bg-white rounded-lg p-3 border border-gray-200 mb-3">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-800">指引對齊度</span>
                <span class="text-lg font-bold ${completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-rose-600'}">${completeness}%</span>
            </div>
        </div>`;
    }
    const score = g.score || 0;
    return `
        <div class="bg-white rounded-lg p-3 border border-gray-200 mb-3">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-800">指引對齊度</span>
                <span class="text-lg font-bold ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}">${score}%</span>
            </div>
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
                    <span class="text-xs font-bold ${score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-rose-600'}">
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
