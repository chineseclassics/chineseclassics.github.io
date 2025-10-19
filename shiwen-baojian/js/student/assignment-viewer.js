/**
 * 学生端任务列表查看器（精简版）
 */

class StudentAssignmentViewer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.assignments = [];
  }

  /**
   * 渲染学生任务列表
   */
  async render(container) {
    this.container = container;
    await this.loadAndRenderAssignments();
  }

  /**
   * 加载并渲染任务
   */
  async loadAndRenderAssignments() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // 获取学生所在的班级
      const { data: memberships } = await this.supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        this.renderNoClass();
        return;
      }

      const classIds = memberships.map(m => m.class_id);

      // 获取班级的任务
      const { data: assignments, error } = await this.supabase
        .from('assignments')
        .select('*')
        .in('class_id', classIds)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;

      this.assignments = assignments || [];

      // 为每个任务加载学生的提交状态
      const enrichedAssignments = await Promise.all(
        this.assignments.map(async (assignment) => {
          const { data: essay } = await this.supabase
            .from('essays')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('user_id', user.id)
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
      console.error('加载任务失败:', error);
      this.container.innerHTML = `<div class="error">加载失败：${error.message}</div>`;
    }
  }

  /**
   * 渲染任务列表
   */
  renderAssignmentList() {
    if (this.assignments.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>暂时没有写作任务</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="student-assignments">
        <h2>我的任务</h2>
        <div class="assignments-list">
          ${this.assignments.map(a => this.renderAssignmentCard(a)).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * 渲染任务卡片
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
          ${essay ? `<div><i class="fas fa-file-alt"></i> 字数：${essay.word_count || 0}</div>` : ''}
        </div>

        ${assignment.description ? `<p class="assignment-desc">${assignment.description}</p>` : ''}

        <div class="assignment-actions">
          ${essay
            ? `<button class="btn btn-primary continue-btn" data-id="${assignment.id}">
                <i class="fas fa-edit"></i> ${essay.is_submitted ? '查看作业' : '继续写作'}
              </button>`
            : `<button class="btn btn-primary start-btn" data-id="${assignment.id}">
                <i class="fas fa-pen"></i> 开始写作
              </button>`
          }
        </div>
      </div>
    `;
  }

  /**
   * 获取任务状态
   */
  getStatus(essay, isOverdue) {
    if (!essay) {
      return isOverdue
        ? { text: '已过期', class: 'overdue' }
        : { text: '未开始', class: 'not-started' };
    }

    if (essay.is_submitted) {
      if (essay.graded_at) {
        return { text: '已批改', class: 'graded' };
      }
      return { text: '已提交', class: 'submitted' };
    }

    return isOverdue
      ? { text: '进行中（已过期）', class: 'overdue' }
      : { text: '进行中', class: 'in-progress' };
  }

  /**
   * 绑定事件
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
   * 渲染无班级状态
   */
  renderNoClass() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash"></i>
        <p>您还没有加入任何班级</p>
        <p class="text-muted">请联系老师将您添加到班级</p>
      </div>
    `;
  }
}

export default StudentAssignmentViewer;

