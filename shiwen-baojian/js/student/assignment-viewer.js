/**
 * 學生端任務列表查看器（精简版）
 */

class StudentAssignmentViewer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.assignments = [];
  }

  /**
   * 渲染學生任務列表
   */
  async render(container) {
    this.container = container;
    await this.loadAndRenderAssignments();
  }

  /**
   * 加載并渲染任務
   */
  async loadAndRenderAssignments() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // 獲取學生所在的班級
      const { data: memberships } = await this.supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships || memberships.length === 0) {
        this.renderNoClass();
        return;
      }

      const classIds = memberships.map(m => m.class_id);

      // 獲取班級的任務
      const { data: assignments, error } = await this.supabase
        .from('assignments')
        .select('*')
        .in('class_id', classIds)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;

      this.assignments = assignments || [];

      // 為每個任務加載學生的提交狀態
      const enrichedAssignments = await Promise.all(
        this.assignments.map(async (assignment) => {
          const { data: essay } = await this.supabase
            .from('essays')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id)
            .maybeSingle();

          return {
            ...assignment,
            studentEssay: essay
          };
        })
      );

      this.assignments = enrichedAssignments;
      this.renderAssignmentList();
    } catch (error) {
      console.error('加載任務失敗:', error);
      this.container.innerHTML = `<div class="error">加載失敗：${error.message}</div>`;
    }
  }

  /**
   * 渲染任務列表
   */
  renderAssignmentList() {
    if (this.assignments.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>暂時没有寫作任務</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="student-assignments">
        <h2>我的任務</h2>
        <div class="assignments-list">
          ${this.assignments.map(a => this.renderAssignmentCard(a)).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * 渲染任務卡片
   */
  renderAssignmentCard(assignment) {
    const dueDate = new Date(assignment.due_date);
    const isOverdue = dueDate < new Date();
    const essay = assignment.studentEssay;
    const status = this.getStatus(essay, isOverdue);

    return `
      <div class="assignment-item ${status.class}">
        <div class="assignment-header">
          <h3>${assignment.title}</h3>
          <span class="status-badge ${status.class}">${status.text}</span>
        </div>

        <div class="assignment-meta">
          <div><i class="fas fa-calendar"></i> 截止：${dueDate.toLocaleDateString('zh-CN')} ${dueDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
          ${essay ? `<div><i class="fas fa-file-alt"></i> 字数：${essay.total_word_count || 0}</div>` : ''}
        </div>

        ${assignment.description ? `<p class="assignment-desc">${assignment.description}</p>` : ''}

        <div class="assignment-actions">
          ${essay
            ? `<button class="btn btn-primary continue-btn" data-id="${assignment.id}">
                <i class="fas fa-edit"></i> ${essay.status === 'submitted' ? '查看作業' : '繼續寫作'}
              </button>`
            : `<button class="btn btn-primary start-btn" data-id="${assignment.id}">
                <i class="fas fa-pen"></i> 開始寫作
              </button>`
          }
        </div>
      </div>
    `;
  }

  /**
   * 獲取任務狀態
   */
  getStatus(essay, isOverdue) {
    if (!essay) {
      return isOverdue
        ? { text: '已過期', class: 'overdue' }
        : { text: '未開始', class: 'not-started' };
    }

    if (essay.status === 'graded') {
      return { text: '已批改', class: 'graded' };
    }
    
    if (essay.status === 'submitted') {
      return { text: '已提交', class: 'submitted' };
    }

    return isOverdue
      ? { text: '進行中（已過期）', class: 'overdue' }
      : { text: '進行中', class: 'in-progress' };
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    document.querySelectorAll('.start-btn, .continue-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'essay-writer', assignmentId }
        }));
      });
    });
  }

  /**
   * 渲染無班級狀態
   */
  renderNoClass() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash"></i>
        <p>您還沒有加入任何班級</p>
        <p class="text-muted">請聯系老師將您添加到班級</p>
      </div>
    `;
  }
}

export default StudentAssignmentViewer;

