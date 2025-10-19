/**
 * 任务列表 UI（精简版）
 */

import AssignmentManager from './assignment-manager.js';

class AssignmentList {
  constructor(assignmentManager) {
    this.assignmentManager = assignmentManager;
    this.container = null;
    this.assignments = [];
  }

  /**
   * 渲染任务列表
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
      this.assignments = await this.assignmentManager.getAssignments();

      this.container.innerHTML = `
        <div class="assignment-list-container">
          <div class="list-header">
            <h2>我的任务</h2>
            <button id="createAssignmentBtn" class="btn btn-primary">
              <i class="fas fa-plus"></i> 创建新任务
            </button>
          </div>

          <div class="assignments-grid">
            ${this.assignments.length > 0
              ? this.assignments.map(a => this.renderAssignmentCard(a)).join('')
              : this.renderEmptyState()
            }
          </div>
        </div>
      `;

      this.bindEvents();
    } catch (error) {
      console.error('加载任务列表失败:', error);
      this.container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>加载失败：${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 渲染任务卡片
   */
  renderAssignmentCard(assignment) {
    const dueDate = new Date(assignment.due_date);
    const isOverdue = dueDate < new Date() && assignment.is_published;
    const stats = assignment.stats || {};

    return `
      <div class="assignment-card${isOverdue ? ' overdue' : ''}" data-id="${assignment.id}">
        <div class="card-header">
          <h3>${assignment.title}</h3>
          <span class="badge badge-${assignment.is_published ? 'success' : 'secondary'}">
            ${assignment.is_published ? '已发布' : '草稿'}
          </span>
        </div>

        <div class="card-content">
          ${assignment.description ? `<p class="description">${assignment.description}</p>` : ''}
          
          <div class="card-meta">
            <div class="meta-item">
              <i class="fas fa-calendar"></i>
              <span>截止：${dueDate.toLocaleDateString('zh-CN')}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-file-alt"></i>
              <span>提交：${stats.submitted || 0}/${stats.totalStudents || 0}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-check-circle"></i>
              <span>批改：${stats.graded || 0}/${stats.submitted || 0}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-action view-btn" data-id="${assignment.id}">
            <i class="fas fa-eye"></i> 查看
          </button>
          <button class="btn-action edit-btn" data-id="${assignment.id}">
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button class="btn-action delete-btn" data-id="${assignment.id}">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染空状态
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p>还没有创建任务</p>
        <p class="text-muted">点击"创建新任务"开始布置写作任务</p>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 创建任务
    const createBtn = document.getElementById('createAssignmentBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-create' }
        }));
      });
    }

    // 查看、编辑、删除按钮
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-view', id }
        }));
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-edit', id }
        }));
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await this.handleDelete(id);
      });
    });
  }

  /**
   * 处理删除任务
   */
  async handleDelete(assignmentId) {
    const confirmed = confirm('确定删除此任务吗？此操作无法撤销。');
    if (!confirmed) return;

    try {
      await this.assignmentManager.deleteAssignment(assignmentId, true);
      await this.loadAndRenderAssignments();
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  }
}

export default AssignmentList;

