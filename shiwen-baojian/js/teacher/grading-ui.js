/**
 * 批改功能 UI（精简版）
 */

import toast from '../ui/toast.js';

class GradingUI {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentEssay = null;
  }

  /**
   * 渲染批改界面
   */
  async render(container, essayId) {
    this.container = container;
    
    try {
      // 加載作業詳情
      const { data: essay, error } = await this.supabase
        .from('essays')
        .select(`
          *,
          student:users!student_id(display_name, email),
          assignment:assignments!assignment_id(title, grading_rubric_json),
          paragraphs(*)
        `)
        .eq('id', essayId)
        .single();

      if (error) {
        console.error('❌ 查詢作業失敗:', error);
        throw error;
      }
      
      console.log('✅ 作業數據加載成功:', essay.title);
      console.log('📊 完整數據結構:', {
        essayTitle: essay.title,
        assignmentTitle: essay.assignment?.title,
        hasRubric: !!essay.assignment?.grading_rubric_json,
        rubricType: typeof essay.assignment?.grading_rubric_json,
        rubric: essay.assignment?.grading_rubric_json
      });

      this.currentEssay = essay;
      this.renderGradingForm();
    } catch (error) {
      console.error('加載作業失敗:', error);
      container.innerHTML = `<div class="error">加載失敗：${error.message}</div>`;
    }
  }

  /**
   * 渲染批改表單
   */
  renderGradingForm() {
    const essay = this.currentEssay;
    const rubric = essay.assignment.grading_rubric_json;
    
    console.log('🎯 開始渲染批改表單');
    console.log('  - 作業:', essay.title);
    console.log('  - 評分標準:', rubric ? '已加載' : '❌ 缺失');
    console.log('  - rubric 對象:', rubric);
    console.log('  - criteria 數量:', rubric?.criteria?.length || 0);
    
    if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
      this.container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <p class="text-gray-700 text-lg">此任務缺少評分標準</p>
          <p class="text-gray-500 text-sm mt-2">請返回編輯任務並設置評分標準</p>
          <button id="backBtn" class="btn btn-secondary mt-4">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      `;
      
      // 綁定返回按鈕
      setTimeout(() => {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', {
              detail: { page: 'grading-queue' }
            }));
          });
        }
      }, 100);
      
      return;
    }

    this.container.innerHTML = `
      <div class="grading-container-wrapper">
        <!-- 頂部標題欄 -->
        <div class="grading-top-bar">
          <button id="backBtn" class="btn-back">
            <i class="fas fa-arrow-left"></i>
            <span>返回批改列表</span>
          </button>
          <div class="grading-title-info">
            <h2 class="text-xl font-bold text-gray-800">
              <i class="fas fa-file-alt mr-2"></i>${this.escapeHtml(essay.title || '未命名論文')}
            </h2>
            <div class="text-sm text-gray-600 mt-1">
              <span class="mr-4">
                <i class="fas fa-tasks mr-1"></i>任務：${essay.assignment.title}
              </span>
              <span class="mr-4">
                <i class="fas fa-user mr-1"></i>學生：${essay.student.display_name}
              </span>
              <span>
                <i class="fas fa-envelope mr-1"></i>${essay.student.email}
              </span>
            </div>
          </div>
        </div>

        <!-- 左右分欄佈局 -->
        <div class="grading-layout">
          <!-- 左側：作業內容（完整顯示） -->
          <div class="grading-main-column">
            <div class="essay-content-section">
              <h3 class="section-title">
                <i class="fas fa-book-open mr-2"></i>作業內容
              </h3>
              <div class="essay-viewer">
                ${this.renderEssayContent(essay)}
              </div>
            </div>
          </div>

          <!-- 右側：AI 評分建議 + 評分表單（固定） -->
          <aside class="grading-sidebar">
            <div class="sticky top-24">
              <!-- AI 評分建議面板 -->
              <div class="ai-grading-panel">
                <div class="panel-header">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-robot text-xl"></i>
                    <h3 class="font-bold text-lg">AI 評分建議</h3>
                  </div>
                </div>
                
                <div class="panel-actions">
                  <button id="getAISuggestionBtn" class="btn-ai-suggest">
                    <i class="fas fa-magic"></i>
                    獲取 AI 評分建議
                  </button>
                  <p class="ai-hint">
                    <i class="fas fa-info-circle"></i>
                    AI 建議僅供參考，老師可自由調整
                  </p>
                </div>
                
                <div id="aiLoadingState" class="hidden ai-loading">
                  <div class="spinner"></div>
                  <p class="loading-text">AI 正在分析論文...</p>
                  <p class="loading-hint">預計需要 5-15 秒</p>
                </div>

                <div id="aiSuggestionResults" class="hidden ai-results">
                  <!-- 結果將動態生成 -->
                </div>
              </div>

              <!-- 評分表單（在 AI 建議下方）-->
              <div class="grading-form-panel">
                <div class="panel-header">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-clipboard-check text-xl"></i>
                    <h3 class="font-bold text-lg">評分</h3>
                  </div>
                </div>
                
                <div class="panel-content">
                  <form id="gradingForm">
                    ${(() => {
                      console.log('📝 開始渲染評分標準，共', rubric.criteria.length, '個');
                      const criteriaHTML = rubric.criteria.map((criterion, idx) => {
                        console.log(`  - 標準 ${idx + 1}:`, criterion.code, criterion.name);
                        return this.renderCriterionForm(criterion);
                      }).join('');
                      console.log('✅ 評分標準 HTML 生成完成');
                      return criteriaHTML;
                    })()}

                    <div class="form-group">
                      <label>總體評語</label>
                      <textarea
                        name="comments"
                        rows="6"
                        placeholder="請填寫對學生作業的總體評價和改進建議..."
                        required
                      >${essay.teacher_comments || ''}</textarea>
                    </div>

                    <div class="form-actions">
                      <button type="submit" class="btn-submit-grading">
                        <i class="fas fa-check"></i>
                        提交批改
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;
    
    console.log('✅ 批改表單 HTML 已渲染');

    // 等待 DOM 更新後再綁定事件
    setTimeout(() => {
      console.log('🔗 開始綁定事件...');
      this.bindEvents();
    }, 100);
  }

  /**
   * 渲染作業內容
   */
  renderEssayContent(essay) {
    console.log('📄 渲染作業內容...');
    console.log('  - content_json 存在?', !!essay.content_json);
    console.log('  - paragraphs 數量:', essay.paragraphs?.length || 0);
    
    // 優先從 content_json 獲取完整結構化內容
    if (essay.content_json) {
      try {
        const content = typeof essay.content_json === 'string' 
          ? JSON.parse(essay.content_json) 
          : essay.content_json;
        
        console.log('✅ 從 content_json 渲染');
        console.log('  - 引言:', !!content.introduction);
        console.log('  - 分論點:', content.arguments?.length || 0);
        console.log('  - 結論:', !!content.conclusion);
        
        let html = '';
        
        // 引言
        if (content.introduction) {
          html += `
            <div class="paragraph-block">
              <h4 class="text-lg font-semibold text-gray-800 mb-2">
                <i class="fas fa-quote-left mr-2 text-blue-500"></i>引言
              </h4>
              <div class="paragraph-content">${content.introduction}</div>
            </div>
          `;
        }
        
        // 分論點
        if (content.arguments && content.arguments.length > 0) {
          content.arguments.forEach((arg, index) => {
            html += `
              <div class="paragraph-block argument-section">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">
                  <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>
                  分論點 ${index + 1}${arg.title ? `：${arg.title}` : ''}
                </h4>
            `;
            
            if (arg.paragraphs && arg.paragraphs.length > 0) {
              arg.paragraphs.forEach((para, pIndex) => {
                html += `
                  <div class="paragraph-content sub-paragraph">
                    <div class="paragraph-label">段落 ${pIndex + 1}</div>
                    ${para.content || ''}
                  </div>
                `;
              });
            }
            
            html += `</div>`;
          });
        }
        
        // 結論
        if (content.conclusion) {
          html += `
            <div class="paragraph-block">
              <h4 class="text-lg font-semibold text-gray-800 mb-2">
                <i class="fas fa-flag-checkered mr-2 text-green-500"></i>結論
              </h4>
              <div class="paragraph-content">${content.conclusion}</div>
            </div>
          `;
        }
        
        return html || '<p class="text-gray-500">作業內容為空</p>';
        
      } catch (e) {
        console.error('❌ 解析作業內容失敗:', e);
      }
    }
    
    // 備用：從 paragraphs 表渲染（舊格式）
    if (essay.paragraphs && essay.paragraphs.length > 0) {
      console.log('⚠️ 從 paragraphs 表渲染（備用方案）');
      console.log('  - 第一個段落的 content 類型:', typeof essay.paragraphs[0].content);
      console.log('  - 第一個段落的 content:', essay.paragraphs[0].content);
      
      return essay.paragraphs
        .sort((a, b) => a.order_index - b.order_index)
        .map(p => {
          // 提取 HTML 內容
          let htmlContent = '';
          if (p.content && typeof p.content === 'object') {
            htmlContent = p.content.html || JSON.stringify(p.content);
          } else {
            htmlContent = p.content || '';
          }
          
          return `
            <div class="paragraph-block">
              <h4>${p.paragraph_type === 'introduction' ? '引言' : p.paragraph_type === 'conclusion' ? '結論' : '正文段落'}</h4>
              <div class="paragraph-content">${htmlContent}</div>
            </div>
          `;
        }).join('');
    }
    
    return '<p class="text-gray-500">作業內容為空</p>';
  }

  /**
   * 渲染評分標準表單
   */
  renderCriterionForm(criterion) {
    return `
      <div class="criterion-group">
        <label>標準 ${criterion.code}：${criterion.name} (0-${criterion.maxScore})</label>
        <select name="criterion_${criterion.code.toLowerCase()}" required>
          <option value="">請選擇分数</option>
          ${Array.from({ length: criterion.maxScore + 1 }, (_, i) => `
            <option value="${i}">${i} 分</option>
          `).join('')}
        </select>
        <details class="criterion-details">
          <summary>查看評分標準</summary>
          <div class="descriptors">
            ${criterion.descriptors.map(d => `
              <div class="descriptor">
                <strong>${d.range} 分：</strong>
                <p>${d.description}</p>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    const form = document.getElementById('gradingForm');
    if (!form) {
      console.error('❌ 找不到批改表單元素');
      return;
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmitGrading(form);
    });

    const backBtn = document.getElementById('backBtn');
    if (!backBtn) {
      console.error('❌ 找不到返回按鈕');
      return;
    }
    
    backBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'grading-queue' }  // ✅ 返回批改隊列而非作業管理
      }));
    });

    // AI 評分建議按鈕
    const aiSuggestionBtn = document.getElementById('getAISuggestionBtn');
    if (aiSuggestionBtn) {
      aiSuggestionBtn.addEventListener('click', async () => {
        await this.handleGetAISuggestion();
      });
    }
  }

  /**
   * 處理提交批改
   */
  async handleSubmitGrading(form) {
    try {
      const formData = new FormData(form);
      
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('未登入');
      
      // 準備評分數據（插入到 grades 表）
      const gradingData = {
        essay_id: this.currentEssay.id,
        teacher_id: user.id,
        criterion_a_score: parseInt(formData.get('criterion_a')),
        criterion_b_score: parseInt(formData.get('criterion_b')),
        criterion_c_score: parseInt(formData.get('criterion_c')),
        criterion_d_score: parseInt(formData.get('criterion_d')),
        overall_comment: formData.get('comments'),
        status: 'final' // 設置為最終評分
      };

      // 插入或更新 grades 表（使用 upsert）
      const { error } = await this.supabase
        .from('grades')
        .upsert(gradingData, {
          onConflict: 'essay_id'
        });

      if (error) throw error;

      // 觸發器會自動：
      // 1. 設置 grades.graded_at = NOW()
      // 2. 更新 essays.status = 'graded'

      toast.success('批改已提交！正在返回任務列表...');
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignments' }
        }));
      }, 1000);
    } catch (error) {
      console.error('提交批改失敗:', error);
      toast.error('提交失敗：' + error.message);
    }
  }

  /**
   * 獲取 AI 評分建議
   */
  async handleGetAISuggestion() {
    try {
      const loadingState = document.getElementById('aiLoadingState');
      const resultsDiv = document.getElementById('aiSuggestionResults');
      const btn = document.getElementById('getAISuggestionBtn');

      // 顯示加載狀態
      loadingState.classList.remove('hidden');
      resultsDiv.classList.add('hidden');
      btn.disabled = true;

      // 動態導入 AI 評分請求模塊
      const { requestAIGradingSuggestion } = await import('./ai-grading-requester.js');

      // 調用 AI 評分
      const result = await requestAIGradingSuggestion(
        this.currentEssay.id,
        this.currentEssay.assignment.grading_rubric_json,
        this.supabase
      );

      // 隱藏加載狀態
      loadingState.classList.add('hidden');

      // 顯示結果（包含总评）
      this.renderAISuggestion(result.criteria_scores, result.overall_comment);

      btn.disabled = false;
    } catch (error) {
      console.error('獲取 AI 評分建議失敗:', error);
      
      // 隱藏加載狀態
      document.getElementById('aiLoadingState').classList.add('hidden');
      document.getElementById('getAISuggestionBtn').disabled = false;

      toast.error('獲取 AI 評分建議失敗：' + error.message);
    }
  }

  /**
   * 渲染 AI 評分建議
   */
  renderAISuggestion(criteriaScores, overallComment = null) {
    const resultsDiv = document.getElementById('aiSuggestionResults');
    
    // 計算總分
    let totalScore = 0;
    let criteriaCount = 0;
    Object.values(criteriaScores).forEach(c => {
      if (c && c.score !== null && c.score !== undefined) {
        totalScore += c.score;
        criteriaCount++;
      }
    });

    // 生成評分卡片
    const cardsHTML = Object.entries(criteriaScores).map(([criterionId, data]) => {
      if (!data || data.score === null) return '';

      const criterionInfo = this.getCriterionInfo(criterionId);
      
      return `
        <div class="ai-criterion-card" style="background: white; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <div>
              <h4 style="margin: 0; color: #2c3e50; font-size: 1.1rem;">
                <i class="fas fa-check-circle" style="color: #667eea;"></i> 
                標準 ${criterionId}：${criterionInfo.name}
              </h4>
            </div>
            <div style="text-align: center; min-width: 60px;">
              <div style="font-size: 2rem; font-weight: 700; color: #667eea;">${data.score}</div>
              <div style="font-size: 0.75rem; color: #7f8c8d;">/ 8 分</div>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; border-left: 3px solid #667eea;">
            <p style="margin: 0; color: #2c3e50; line-height: 1.6; white-space: pre-wrap;">${data.reason}</p>
          </div>
        </div>
      `;
    }).filter(html => html).join('');

    // 生成总评卡片
    const overallCommentHTML = overallComment ? `
      <div style="background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid #f39c12;">
        <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 1.1rem;">
          <i class="fas fa-comment-dots" style="color: #f39c12;"></i> AI 總評
        </h4>
        
        <!-- 優點 -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-thumbs-up" style="color: #27ae60;"></i>
            <strong style="color: #27ae60;">做得好的方面</strong>
          </div>
          <div style="background: #f0fdf4; padding: 0.875rem; border-radius: 6px; border-left: 3px solid #27ae60;">
            <p style="margin: 0; color: #2c3e50; line-height: 1.6; white-space: pre-wrap;">${overallComment.strengths || '暂无'}</p>
          </div>
        </div>
        
        <!-- 改進建議 -->
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-arrow-up" style="color: #e67e22;"></i>
            <strong style="color: #e67e22;">需要改進的方面</strong>
          </div>
          <div style="background: #fff7ed; padding: 0.875rem; border-radius: 6px; border-left: 3px solid #e67e22;">
            <p style="margin: 0; color: #2c3e50; line-height: 1.6; white-space: pre-wrap;">${overallComment.improvements || '暂无'}</p>
          </div>
        </div>
        
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #7f8c8d; font-size: 0.85rem;">
            <i class="fas fa-lightbulb"></i> 老師可參考此總評撰寫評語，也可以自由修改或補充
          </p>
        </div>
      </div>
    ` : '';

    resultsDiv.innerHTML = `
      <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 1.5rem;">
        <!-- 總分顯示 -->
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="color: white; font-size: 0.9rem; margin-bottom: 0.25rem;">AI 建議總分</div>
          <div style="color: white; font-size: 3rem; font-weight: 700;">${totalScore}</div>
          <div style="color: rgba(255,255,255,0.9); font-size: 0.85rem;">/ ${criteriaCount * 8} 分（${criteriaCount} 個標準）</div>
        </div>

        <!-- AI 總評 -->
        ${overallCommentHTML}

        <!-- 各標準評分卡片 -->
        ${cardsHTML}

        <!-- 採用建議按鈕 -->
        <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
          <button id="applyAISuggestionBtn" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1.05rem;">
            <i class="fas fa-check-double"></i> 採用 AI 建議
          </button>
          <p style="margin-top: 0.75rem; color: #7f8c8d; font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> 採用後分數會自動填入，總評可複製到評語欄參考
          </p>
        </div>
      </div>
    `;

    resultsDiv.classList.remove('hidden');

    // 保存总评到实例变量，供「採用建議」使用
    this.currentAIOverallComment = overallComment;

    // 綁定「採用建議」按鈕
    const applyBtn = document.getElementById('applyAISuggestionBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyAISuggestion(criteriaScores, overallComment);
      });
    }
  }

  /**
   * 獲取標準信息
   */
  getCriterionInfo(criterionId) {
    const criterionMap = {
      'A': { name: '分析', icon: 'fa-search' },
      'B': { name: '組織', icon: 'fa-sitemap' },
      'C': { name: '創作', icon: 'fa-pen-fancy' },
      'D': { name: '語言', icon: 'fa-language' }
    };
    return criterionMap[criterionId] || { name: '未知', icon: 'fa-question' };
  }

  /**
   * 採用 AI 建議（一鍵填充評分表單）
   */
  applyAISuggestion(criteriaScores, overallComment = null) {
    const form = document.getElementById('gradingForm');
    
    // 填充各标准分数
    Object.entries(criteriaScores).forEach(([criterionId, data]) => {
      if (data && data.score !== null && data.score !== undefined) {
        const inputName = `criterion_${criterionId.toLowerCase()}`;
        const input = form.querySelector(`input[name="${inputName}"]`);
        if (input) {
          input.value = data.score;
          console.log(`✅ 填充 ${criterionId}：${data.score} 分`);
        }
      }
    });

    // 填充总评到评语栏（作为参考起点）
    if (overallComment) {
      const commentsTextarea = form.querySelector('textarea[name="comments"]');
      if (commentsTextarea) {
        const aiComment = `【AI 參考評語】

✅ 做得好的方面：
${overallComment.strengths || ''}

📈 需要改進的方面：
${overallComment.improvements || ''}

---
（老師可以在此基礎上修改、補充或完全重寫）`;
        
        commentsTextarea.value = aiComment;
        console.log('✅ 已將 AI 總評填入評語欄');
      }
    }

    toast.success('AI 建議已填充！<br>分數和參考評語已填入，請檢查調整後提交。', 3000);
    
    // 滾動到評分表單
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  /**
   * 轉義 HTML 特殊字符
   */
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default GradingUI;

