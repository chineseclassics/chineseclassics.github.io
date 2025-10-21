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

    this.container.innerHTML = `
      <div class="grading-container">
        <div class="grading-header">
          <div>
            <h2>${essay.assignment.title}</h2>
            <p>學生：${essay.student.display_name} (${essay.student.email})</p>
          </div>
          <button id="backBtn" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>

        <!-- 作業內容（只讀） -->
        <div class="essay-content">
          <h3>作業內容</h3>
          <div class="essay-viewer">
            ${this.renderEssayContent(essay)}
          </div>
        </div>

        <!-- AI 評分建議區域 -->
        <div class="ai-grading-section" style="margin: 2rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-robot"></i> AI 評分建議
            </h3>
            <button id="getAISuggestionBtn" class="btn" style="background: white; color: #667eea; border: none; padding: 0.75rem 1.5rem; font-weight: 600; cursor: pointer;">
              <i class="fas fa-magic"></i> 獲取 AI 評分建議
            </button>
          </div>
          
          <!-- 加載狀態 -->
          <div id="aiLoadingState" class="hidden" style="text-align: center; padding: 2rem; background: rgba(255,255,255,0.9); border-radius: 8px;">
            <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 1rem; color: #667eea; font-weight: 600;">AI 正在分析論文...</p>
            <p style="margin-top: 0.5rem; color: #764ba2; font-size: 0.9rem;">預計需要 5-15 秒</p>
          </div>

          <!-- AI 建議結果 -->
          <div id="aiSuggestionResults" class="hidden">
            <!-- 結果將動態生成 -->
          </div>

          <!-- 提示信息 -->
          <p style="color: rgba(255,255,255,0.9); font-size: 0.85rem; margin: 0.5rem 0 0 0; text-align: center;">
            <i class="fas fa-info-circle"></i> AI 建議僅供參考，老師可自由調整評分
          </p>
        </div>

        <!-- 評分表單 -->
        <div class="grading-form">
          <h3>評分</h3>
          <form id="gradingForm">
            ${rubric.criteria.map(criterion => this.renderCriterionForm(criterion)).join('')}

            <div class="form-group">
              <label>總體评语</label>
              <textarea
                name="comments"
                rows="6"
                placeholder="請填寫對學生作業的總體评价和改进建議..."
                required
              >${essay.teacher_comments || ''}</textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-check"></i> 提交批改
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * 渲染作業內容
   */
  renderEssayContent(essay) {
    return essay.paragraphs
      .sort((a, b) => a.order_index - b.order_index)
      .map(p => `
        <div class="paragraph-block">
          <h4>${p.type === 'introduction' ? '引言' : p.type === 'conclusion' ? '結论' : '正文段落'}</h4>
          <div class="paragraph-content">${p.content_html || p.content}</div>
        </div>
      `).join('');
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmitGrading(form);
    });

    const backBtn = document.getElementById('backBtn');
    backBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'assignments' }
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

      // 顯示結果
      this.renderAISuggestion(result.criteria_scores);

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
  renderAISuggestion(criteriaScores) {
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

    resultsDiv.innerHTML = `
      <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 1.5rem;">
        <!-- 總分顯示 -->
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="color: white; font-size: 0.9rem; margin-bottom: 0.25rem;">AI 建議總分</div>
          <div style="color: white; font-size: 3rem; font-weight: 700;">${totalScore}</div>
          <div style="color: rgba(255,255,255,0.9); font-size: 0.85rem;">/ ${criteriaCount * 8} 分（${criteriaCount} 個標準）</div>
        </div>

        <!-- 各標準評分卡片 -->
        ${cardsHTML}

        <!-- 採用建議按鈕 -->
        <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
          <button id="applyAISuggestionBtn" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1.05rem;">
            <i class="fas fa-check-double"></i> 採用 AI 建議
          </button>
          <p style="margin-top: 0.75rem; color: #7f8c8d; font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> 採用後可以手動調整分數，評語仍需老師填寫
          </p>
        </div>
      </div>
    `;

    resultsDiv.classList.remove('hidden');

    // 綁定「採用建議」按鈕
    const applyBtn = document.getElementById('applyAISuggestionBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyAISuggestion(criteriaScores);
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
  applyAISuggestion(criteriaScores) {
    const form = document.getElementById('gradingForm');
    
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

    toast.success('AI 建議已填充到評分表單！<br>請檢查並調整，然後填寫評語。', 3000);
    
    // 滾動到評分表單
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default GradingUI;

