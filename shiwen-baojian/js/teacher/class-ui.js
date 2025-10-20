/**
 * 班級管理 UI 組件
 * 負責渲染班級管理界面和處理用户交互
 */

import ClassManager from './class-manager.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

class ClassUI {
  constructor(classManager) {
    this.classManager = classManager;
    this.container = null;
  }

  /**
   * 初始化 UI
   * @param {HTMLElement} container - 容器元素
   */
  async initialize(container) {
    this.container = container;
    
    // 加載班級信息
    await this.classManager.initialize();

    // 渲染界面
    await this.render();
  }

  /**
   * 渲染班級管理界面
   */
  async render() {
    if (!this.container) {
      console.error('未設置容器元素');
      return;
    }

    if (!this.classManager.currentClass) {
      // 未創建班級，顯示創建表單
      this.renderCreateClassForm();
    } else {
      // 已有班級，顯示班級管理界面
      await this.renderClassDashboard();
    }
  }

  /**
   * 渲染創建班級表單
   */
  renderCreateClassForm() {
    this.container.innerHTML = `
      <div class="create-class-container">
        <div class="create-class-card">
          <h2>創建班級</h2>
          <p class="text-muted">創建班級以開始管理學生和布置寫作任務</p>
          
          <form id="createClassForm" class="create-class-form">
            <div class="form-group">
              <label for="className">班級名稱 <span class="required">*</span></label>
              <input
                type="text"
                id="className"
                name="className"
                placeholder="例如：十年級A班"
                required
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label for="classDescription">班級描述（可選）</label>
              <textarea
                id="classDescription"
                name="classDescription"
                placeholder="例如：2024-2025 學年 十年級 中國古典文學"
                rows="3"
                maxlength="500"
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary">創建班級</button>
            </div>

            <p class="mvp-notice">
              <i class="fas fa-info-circle"></i>
              MVP 版本僅支持單個班級，多班級功能即將推出
            </p>
          </form>
        </div>
      </div>
    `;

    // 綁定表單提交事件（使用容器的 querySelector）
    const form = this.container.querySelector('#createClassForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateClass(e));
    }
  }

  /**
   * 處理創建班級表單提交
   */
  async handleCreateClass(event) {
    event.preventDefault();

    const form = event.target;
    const className = form.className.value.trim();
    const description = form.classDescription.value.trim();

    try {
      // 顯示加載狀態
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 創建中...';

      // 創建班級
      await this.classManager.createClass(className, description);

      // 顯示成功消息
      toast.success('班級創建成功！');

      // 重新渲染界面
      await this.render();
    } catch (error) {
      console.error('創建班級失敗:', error);
      toast.error(error.message || '創建班級失敗，請重試');

      // 恢复按鈕狀態
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '創建班級';
    }
  }

  /**
   * 渲染班級管理儀表板
   */
  async renderClassDashboard() {
    const classInfo = this.classManager.currentClass;
    const stats = await this.classManager.getClassStatistics();
    const members = await this.classManager.getClassMembers();

    this.container.innerHTML = `
      <div class="class-dashboard">
        <!-- 班級概覽 -->
        <div class="class-header">
          <div class="class-info">
            <h2>${this.escapeHtml(classInfo.class_name)}</h2>
            ${classInfo.description ? `<p class="class-description">${this.escapeHtml(classInfo.description)}</p>` : ''}
          </div>
          <div class="class-actions">
            <button id="addStudentsBtn" class="btn btn-primary">
              <i class="fas fa-user-plus"></i> 批量添加學生
            </button>
            ${classInfo.is_active
              ? '<button id="deactivateBtn" class="btn btn-secondary"><i class="fas fa-pause"></i> 停用班級</button>'
              : '<button id="activateBtn" class="btn btn-success"><i class="fas fa-play"></i> 激活班級</button>'
            }
          </div>
        </div>

        <!-- 統計卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalStudents}</div>
              <div class="stat-label">學生總數</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon active">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.activeStudents}</div>
              <div class="stat-label">活躍學生</div>
              <div class="stat-sublabel">最近 7 天登入</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalAssignments}</div>
              <div class="stat-label">任務總數</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon pending">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.pendingGrading}</div>
              <div class="stat-label">待批改作業</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.averageCompletion}%</div>
              <div class="stat-label">平均完成率</div>
            </div>
          </div>
        </div>

        <!-- 學生列表 -->
        <div class="students-section">
          <div class="section-header">
            <h3>學生列表</h3>
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                type="text"
                id="studentSearch"
                placeholder="搜索學生姓名或郵箱..."
              />
            </div>
          </div>

          <div class="students-table-container">
            ${this.renderStudentsTable(members)}
          </div>
        </div>
      </div>

      <!-- 批量添加學生模态框 -->
      <div id="addStudentsModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>批量添加學生</h3>
            <button class="modal-close" id="closeModalBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>學生郵箱列表</label>
              <textarea
                id="emailListInput"
                placeholder="請輸入學生郵箱，每行一個或用逗號分隔

例如：
3015174@student.isf.edu.hk
3015175@student.isf.edu.hk
3015176@student.isf.edu.hk"
                rows="10"
              ></textarea>
              <p class="help-text">僅支持 @student.isf.edu.hk 郵箱</p>
            </div>
          </div>
          <div class="modal-footer">
            <button id="cancelAddBtn" class="btn btn-secondary">取消</button>
            <button id="confirmAddBtn" class="btn btn-primary">添加學生</button>
          </div>
        </div>
      </div>
    `;

    // 綁定事件
    this.bindDashboardEvents(members);
  }

  /**
   * 渲染學生表格
   */
  renderStudentsTable(members) {
    if (members.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>還沒有學生</p>
          <p class="text-muted">點擊"批量添加學生"按鈕添加學生到班級</p>
        </div>
      `;
    }

    return `
      <table class="students-table" id="studentsTable">
        <thead>
          <tr>
            <th data-sort="displayName">姓名 <i class="fas fa-sort"></i></th>
            <th data-sort="email">郵箱 <i class="fas fa-sort"></i></th>
            <th data-sort="status">狀態 <i class="fas fa-sort"></i></th>
            <th data-sort="activityStatus">活躍度 <i class="fas fa-sort"></i></th>
            <th>作業進度</th>
            <th data-sort="addedAt">加入時間 <i class="fas fa-sort"></i></th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => this.renderStudentRow(member)).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * 渲染單個學生行
   */
  renderStudentRow(member) {
    const activityBadge = this.getActivityBadge(member.activityStatus);
    const statusBadge = member.status === 'active' ? '已登入' : member.isPending ? '待激活' : '未登入';
    const addedDate = new Date(member.addedAt).toLocaleDateString('zh-CN');

    return `
      <tr data-member-id="${member.id}" data-is-pending="${member.isPending || false}">
        <td>${this.escapeHtml(member.displayName)}</td>
        <td>${this.escapeHtml(member.email)}</td>
        <td>
          <span class="badge badge-${member.status === 'active' ? 'success' : 'secondary'}">
            ${statusBadge}
          </span>
        </td>
        <td>${activityBadge}</td>
        <td>
          <div class="progress-indicator">
            <span>${member.assignmentProgress.completed}/${member.assignmentProgress.total}</span>
            <div class="progress-bar-mini">
              <div class="progress-fill" style="width: ${member.assignmentProgress.total > 0 ? (member.assignmentProgress.completed / member.assignmentProgress.total * 100) : 0}%"></div>
            </div>
          </div>
        </td>
        <td>${addedDate}</td>
        <td>
          <button
            class="btn-icon btn-danger remove-student-btn"
            data-member-id="${member.id}"
            data-student-name="${this.escapeHtml(member.displayName)}"
            data-is-pending="${member.isPending || false}"
            title="移除學生"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * 獲取活躍度徽章
   */
  getActivityBadge(status) {
    const badges = {
      pending: '<span class="activity-badge pending">⚪ 待激活</span>',
      active: '<span class="activity-badge active">🟢 活躍</span>',
      inactive: '<span class="activity-badge inactive">🟡 不活躍</span>',
      dormant: '<span class="activity-badge dormant">🔴 長期未登入</span>'
    };
    return badges[status] || badges.dormant;
  }

  /**
   * 綁定儀表板事件
   */
  bindDashboardEvents(members) {
    // 批量添加學生按鈕
    const addStudentsBtn = this.container.querySelector('#addStudentsBtn');
    if (addStudentsBtn) {
      addStudentsBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        if (modal) modal.style.display = 'flex';
      });
    }

    // 模态框關闭按鈕（X）
    const closeModalBtn = this.container.querySelector('#closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        const input = this.container.querySelector('#emailListInput');
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
      });
    }

    // 模态框取消按鈕
    const cancelAddBtn = this.container.querySelector('#cancelAddBtn');
    if (cancelAddBtn) {
      cancelAddBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        const input = this.container.querySelector('#emailListInput');
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
      });
    }

    // 模态框确認按鈕
    const confirmAddBtn = this.container.querySelector('#confirmAddBtn');
    if (confirmAddBtn) {
      confirmAddBtn.addEventListener('click', () => this.handleBatchAddStudents());
    }

    // 停用/激活班級
    const deactivateBtn = this.container.querySelector('#deactivateBtn');
    if (deactivateBtn) {
      deactivateBtn.addEventListener('click', () => this.handleDeactivateClass());
    }

    const activateBtn = this.container.querySelector('#activateBtn');
    if (activateBtn) {
      activateBtn.addEventListener('click', () => this.handleActivateClass());
    }

    // 移除學生按鈕
    const removeButtons = this.container.querySelectorAll('.remove-student-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const memberId = e.currentTarget.getAttribute('data-member-id');
        const studentName = e.currentTarget.getAttribute('data-student-name');
        const isPending = e.currentTarget.getAttribute('data-is-pending') === 'true';
        this.handleRemoveStudent(memberId, studentName, isPending);
      });
    });

    // 搜索功能
    const searchInput = this.container.querySelector('#studentSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterStudents(e.target.value, members);
      });
    }

    // 表格排序
    const sortHeaders = this.container.querySelectorAll('[data-sort]');
    sortHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const sortKey = e.currentTarget.getAttribute('data-sort');
        this.sortStudents(sortKey, members);
      });
    });
  }

  /**
   * 處理批量添加學生
   */
  async handleBatchAddStudents() {
    const emailListInput = this.container.querySelector('#emailListInput');
    const confirmBtn = this.container.querySelector('#confirmAddBtn');

    if (!emailListInput || !confirmBtn) {
      console.error('找不到表單元素');
      return;
    }

    try {
      const emailListText = emailListInput.value.trim();
      
      if (!emailListText) {
        toast.warning('請輸入學生郵箱列表');
        return;
      }

      // 顯示加載狀態
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 添加中...';

      // 批量添加
      const result = await this.classManager.batchAddStudents(emailListText);

      // 關闭模态框
      const modal = this.container.querySelector('#addStudentsModal');
      if (modal) modal.style.display = 'none';
      emailListInput.value = '';

      // 顯示結果
      let message = `成功添加 ${result.added} 名學生`;
      if (result.duplicates > 0) {
        message += `，${result.duplicates} 個重复已跳過`;
      }
      if (result.invalidEmails > 0) {
        message += `，${result.invalidEmails} 個無效郵箱已忽略`;
      }

      toast.success(message);

      // 刷新界面
      await this.render();
    } catch (error) {
      console.error('批量添加學生失敗:', error);
      toast.error(error.message || '添加學生失敗');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '添加學生';
    }
  }

  /**
   * 處理移除學生
   */
  handleRemoveStudent(memberId, studentName, isPending) {
    const message = isPending
      ? `確定移除待激活郵箱 <strong>${studentName}</strong>？`
      : `確定將 <strong>${studentName}</strong> 移出班級？<br><br>學生的作業記錄將保留，但將無法访问班級任務。`;
    
    dialog.confirmDelete({
      title: '確認移除',
      message: message,
      confirmText: '確認移除',
      onConfirm: async () => {
        try {
          await this.classManager.removeStudent(memberId, isPending);
          toast.success(isPending ? '已移除待激活郵箱' : `已將 ${studentName} 移出班級`);
          await this.render();
        } catch (error) {
          console.error('移除學生失敗:', error);
          toast.error('移除學生失敗，請重試');
        }
      }
    });
  }

  /**
   * 處理停用班級
   */
  handleDeactivateClass() {
    dialog.confirmWarning({
      title: '確認停用',
      message: '確定停用班級？<br><br>學生將無法提交新作業，但可以查看現有作業。',
      confirmText: '確認停用',
      onConfirm: async () => {
        try {
          await this.classManager.deactivateClass();
          toast.warning('班級已停用');
          await this.render();
        } catch (error) {
          console.error('停用班級失敗:', error);
          toast.error('停用班級失敗');
        }
      }
    });
  }

  /**
   * 處理激活班級
   */
  async handleActivateClass() {
    try {
      await this.classManager.activateClass();
      this.showToast('success', '班級已激活');
      await this.render();
    } catch (error) {
      console.error('激活班級失敗:', error);
      this.showToast('error', '激活班級失敗');
    }
  }

  /**
   * 過滤學生列表
   */
  filterStudents(searchTerm, members) {
    const term = searchTerm.toLowerCase();
    const rows = this.container.querySelectorAll('#studentsTable tbody tr');
    
    rows.forEach(row => {
      const memberId = row.getAttribute('data-member-id');
      const member = members.find(m => m.id === memberId);
      
      if (member) {
        const matchesSearch =
          member.displayName.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term);
        
        row.style.display = matchesSearch ? '' : 'none';
      }
    });
  }

  /**
   * 排序學生列表
   */
  sortStudents(sortKey, members) {
    // 實現排序逻輯（這里简化處理，实際應該重新渲染）
    console.log('排序:', sortKey);
    // TODO: 實現排序并重新渲染
  }

  /**
   * 顯示提示消息
   */
  showToast(type, message) {
    // 简單的提示實現
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * HTML 轉義
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

export default ClassUI;

