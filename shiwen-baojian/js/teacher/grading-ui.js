/**
 * 批改功能 UI（精简版）
 */

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
          paragraphs(*),
          ai_feedback(*)
        `)
        .eq('id', essayId)
        .single();

      if (error) throw error;

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

      alert('批改已提交！');
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'assignments' }
      }));
    } catch (error) {
      console.error('提交批改失敗:', error);
      alert('提交失敗：' + error.message);
    }
  }
}

export default GradingUI;

