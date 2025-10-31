/**
 * 任務列表 UI（精简版）
 */

import AssignmentManager from './assignment-manager.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';
import { getClassColorClass } from '../utils/class-color-utils.js';

class AssignmentList {
  constructor(assignmentManager) {
    this.assignmentManager = assignmentManager;
    this.container = null;
    this.assignments = [];
  }

  /**
   * 渲染任務列表
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
      // 顯示骨架屏
      this.container.innerHTML = `
        <div class="assignment-list-container">
          <!-- 頂部操作欄：統一樣式 -->
          <div class="mb-8">
            <button 
              id="createAssignmentBtn" 
              class="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-stone-600 to-stone-700 text-white font-medium rounded-lg hover:from-stone-700 hover:to-stone-800 transition-all shadow-sm hover:shadow-md"
            >
              <i class="fas fa-plus mr-2"></i>創建新任務
            </button>
          </div>

          <div class="assignments-grid">
            ${this.renderSkeletonCards(3)}
          </div>
        </div>
      `;
      
      // 載入數據
      this.assignments = await this.assignmentManager.getAssignments();
      
      // 渲染實際內容
      const grid = this.container.querySelector('.assignments-grid');
      if (grid) {
        grid.innerHTML = this.assignments.length > 0
          ? this.assignments.map(a => this.renderAssignmentCard(a)).join('')
          : this.renderEmptyState();
      }
      
      this.bindEvents();
    } catch (error) {
      console.error('加載任務列表失敗:', error);
      this.container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>加載失敗：${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 渲染骨架屏卡片
   */
  renderSkeletonCards(count) {
    return Array(count).fill(0).map(() => `
      <div class="assignment-card card animate-pulse">
        <div class="card-header">
          <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div class="card-content">
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 渲染任務卡片
   */
  renderAssignmentCard(assignment) {
    const dueDate = new Date(assignment.due_date);
    const isOverdue = dueDate < new Date() && assignment.is_published;
    const stats = assignment.stats || {};
    const classColorClass = assignment.class ? getClassColorClass(assignment.class.id) : 'class-1';

    // 提取字數要求
    const wordCountHtml = this.getWordCountHtml(assignment);

    return `
      <div class="assignment-card card ${classColorClass}${isOverdue ? ' overdue' : ''}" data-id="${assignment.id}">
        <div class="card-header">
          <h3>${assignment.title}</h3>
          <span class="badge badge-${assignment.is_published ? 'success' : 'secondary'}">
            ${assignment.is_published ? '已發佈' : '草稿'}
          </span>
        </div>

        <div class="card-content">
          ${assignment.description ? `<p class="description">${assignment.description}</p>` : ''}
          
          <div class="card-meta">
            ${assignment.class ? `
              <div class="meta-item class-info">
                <i class="fas fa-users"></i>
                <span>班級：${this.escapeHtml(assignment.class.class_name)}</span>
              </div>
            ` : ''}
            <div class="meta-item">
              <i class="fas fa-calendar"></i>
              <span>截止：${dueDate.toLocaleDateString('zh-CN')}</span>
            </div>
            ${wordCountHtml}
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
            <i class="fas fa-edit"></i> 編輯
          </button>
          <button class="btn-action delete-btn" data-id="${assignment.id}">
            <i class="fas fa-trash"></i> 刪除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 獲取學生作業實際字數統計 HTML
   */
  getWordCountHtml(assignment) {
    try {
      const stats = assignment.stats || {};
      const averageWordCount = stats.averageWordCount || 0;
      const submitted = stats.submitted || 0;

      // 如果沒有提交的作業，不顯示字數
      if (submitted === 0) {
        return '';
      }

      // 顯示已提交作業的平均字數
      return `
        <div class="meta-item">
          <i class="fas fa-font"></i>
          <span>${averageWordCount} 字</span>
        </div>
      `;
    } catch (error) {
      console.error('提取字數統計失敗:', error);
      return ''; // 出錯時不顯示
    }
  }

  /**
   * 渲染空狀態
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p>還沒有創建任務</p>
        <p class="text-muted">點擊"創建新任務"開始布置寫作任務</p>
      </div>
    `;
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    // 創建任務
    const createBtn = this.container.querySelector('#createAssignmentBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        console.log('🔘 點擊創建新任務按鈕');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-create' }
        }));
      });
    } else {
      console.warn('⚠️ 找不到創建任務按鈕');
    }

    // 查看、編輯、刪除按鈕
    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-view', id }
        }));
      });
    });

    this.container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'assignment-edit', id }
        }));
      });
    });

    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.handleDelete(id);
      });
    });
  }

  /**
   * 處理刪除任務
   */
  handleDelete(assignmentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      toast.error('任務不存在');
      return;
    }
    
    dialog.confirmDelete({
      message: `確定要刪除任務「<strong>${assignment.title}</strong>」嗎？<br><br>此操作無法撤銷。`,
      onConfirm: async () => {
        try {
          await this.assignmentManager.deleteAssignment(assignmentId, true);
          toast.success('任務已刪除！');
          await this.loadAndRenderAssignments();
        } catch (error) {
          console.error('刪除失敗:', error);
          toast.error('刪除失敗：' + error.message);
        }
      }
    });
  }

  /**
   * HTML 轉義方法
   */
  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
      return '';
    }
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default AssignmentList;


