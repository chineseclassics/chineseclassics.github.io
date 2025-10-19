/**
 * 班级管理 UI 组件
 * 负责渲染班级管理界面和处理用户交互
 */

import ClassManager from './class-manager.js';

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
    
    // 加载班级信息
    await this.classManager.initialize();

    // 渲染界面
    await this.render();
  }

  /**
   * 渲染班级管理界面
   */
  async render() {
    if (!this.container) {
      console.error('未设置容器元素');
      return;
    }

    if (!this.classManager.currentClass) {
      // 未创建班级，显示创建表单
      this.renderCreateClassForm();
    } else {
      // 已有班级，显示班级管理界面
      await this.renderClassDashboard();
    }
  }

  /**
   * 渲染创建班级表单
   */
  renderCreateClassForm() {
    this.container.innerHTML = `
      <div class="create-class-container">
        <div class="create-class-card">
          <h2>创建班级</h2>
          <p class="text-muted">创建班级以开始管理学生和布置写作任务</p>
          
          <form id="createClassForm" class="create-class-form">
            <div class="form-group">
              <label for="className">班级名称 <span class="required">*</span></label>
              <input
                type="text"
                id="className"
                name="className"
                placeholder="例如：十年级A班"
                required
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label for="classDescription">班级描述（可选）</label>
              <textarea
                id="classDescription"
                name="classDescription"
                placeholder="例如：2024-2025 学年 十年级 中国古典文学"
                rows="3"
                maxlength="500"
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary">创建班级</button>
            </div>

            <p class="mvp-notice">
              <i class="fas fa-info-circle"></i>
              MVP 版本仅支持单个班级，多班级功能即将推出
            </p>
          </form>
        </div>
      </div>
    `;

    // 绑定表单提交事件（使用容器的 querySelector）
    const form = this.container.querySelector('#createClassForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateClass(e));
    }
  }

  /**
   * 处理创建班级表单提交
   */
  async handleCreateClass(event) {
    event.preventDefault();

    const form = event.target;
    const className = form.className.value.trim();
    const description = form.classDescription.value.trim();

    try {
      // 显示加载状态
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

      // 创建班级
      await this.classManager.createClass(className, description);

      // 显示成功消息
      this.showToast('success', '班级创建成功！');

      // 重新渲染界面
      await this.render();
    } catch (error) {
      console.error('创建班级失败:', error);
      this.showToast('error', error.message || '创建班级失败，请重试');

      // 恢复按钮状态
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '创建班级';
    }
  }

  /**
   * 渲染班级管理仪表板
   */
  async renderClassDashboard() {
    const classInfo = this.classManager.currentClass;
    const stats = await this.classManager.getClassStatistics();
    const members = await this.classManager.getClassMembers();

    this.container.innerHTML = `
      <div class="class-dashboard">
        <!-- 班级概览 -->
        <div class="class-header">
          <div class="class-info">
            <h2>${this.escapeHtml(classInfo.class_name)}</h2>
            ${classInfo.description ? `<p class="class-description">${this.escapeHtml(classInfo.description)}</p>` : ''}
          </div>
          <div class="class-actions">
            <button id="addStudentsBtn" class="btn btn-primary">
              <i class="fas fa-user-plus"></i> 批量添加学生
            </button>
            ${classInfo.is_active
              ? '<button id="deactivateBtn" class="btn btn-secondary"><i class="fas fa-pause"></i> 停用班级</button>'
              : '<button id="activateBtn" class="btn btn-success"><i class="fas fa-play"></i> 激活班级</button>'
            }
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalStudents}</div>
              <div class="stat-label">学生总数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon active">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.activeStudents}</div>
              <div class="stat-label">活跃学生</div>
              <div class="stat-sublabel">最近 7 天登录</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalAssignments}</div>
              <div class="stat-label">任务总数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon pending">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.pendingGrading}</div>
              <div class="stat-label">待批改作业</div>
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

        <!-- 学生列表 -->
        <div class="students-section">
          <div class="section-header">
            <h3>学生列表</h3>
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                type="text"
                id="studentSearch"
                placeholder="搜索学生姓名或邮箱..."
              />
            </div>
          </div>

          <div class="students-table-container">
            ${this.renderStudentsTable(members)}
          </div>
        </div>
      </div>

      <!-- 批量添加学生模态框 -->
      <div id="addStudentsModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>批量添加学生</h3>
            <button class="modal-close" id="closeModalBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>学生邮箱列表</label>
              <textarea
                id="emailListInput"
                placeholder="请输入学生邮箱，每行一个或用逗号分隔

例如：
3015174@student.isf.edu.hk
3015175@student.isf.edu.hk
3015176@student.isf.edu.hk"
                rows="10"
              ></textarea>
              <p class="help-text">仅支持 @student.isf.edu.hk 邮箱</p>
            </div>
          </div>
          <div class="modal-footer">
            <button id="cancelAddBtn" class="btn btn-secondary">取消</button>
            <button id="confirmAddBtn" class="btn btn-primary">添加学生</button>
          </div>
        </div>
      </div>
    `;

    // 绑定事件
    this.bindDashboardEvents(members);
  }

  /**
   * 渲染学生表格
   */
  renderStudentsTable(members) {
    if (members.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>还没有学生</p>
          <p class="text-muted">点击"批量添加学生"按钮添加学生到班级</p>
        </div>
      `;
    }

    return `
      <table class="students-table" id="studentsTable">
        <thead>
          <tr>
            <th data-sort="displayName">姓名 <i class="fas fa-sort"></i></th>
            <th data-sort="email">邮箱 <i class="fas fa-sort"></i></th>
            <th data-sort="status">状态 <i class="fas fa-sort"></i></th>
            <th data-sort="activityStatus">活跃度 <i class="fas fa-sort"></i></th>
            <th>作业进度</th>
            <th data-sort="addedAt">加入时间 <i class="fas fa-sort"></i></th>
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
   * 渲染单个学生行
   */
  renderStudentRow(member) {
    const activityBadge = this.getActivityBadge(member.activityStatus);
    const statusBadge = member.status === 'active' ? '已登录' : member.isPending ? '待激活' : '未登录';
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
            title="移除学生"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * 获取活跃度徽章
   */
  getActivityBadge(status) {
    const badges = {
      pending: '<span class="activity-badge pending">⚪ 待激活</span>',
      active: '<span class="activity-badge active">🟢 活跃</span>',
      inactive: '<span class="activity-badge inactive">🟡 不活跃</span>',
      dormant: '<span class="activity-badge dormant">🔴 长期未登录</span>'
    };
    return badges[status] || badges.dormant;
  }

  /**
   * 绑定仪表板事件
   */
  bindDashboardEvents(members) {
    // 批量添加学生按钮
    const addStudentsBtn = this.container.querySelector('#addStudentsBtn');
    if (addStudentsBtn) {
      addStudentsBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        if (modal) modal.style.display = 'flex';
      });
    }

    // 模态框关闭按钮（X）
    const closeModalBtn = this.container.querySelector('#closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        const input = this.container.querySelector('#emailListInput');
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
      });
    }

    // 模态框取消按钮
    const cancelAddBtn = this.container.querySelector('#cancelAddBtn');
    if (cancelAddBtn) {
      cancelAddBtn.addEventListener('click', () => {
        const modal = this.container.querySelector('#addStudentsModal');
        const input = this.container.querySelector('#emailListInput');
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
      });
    }

    // 模态框确认按钮
    const confirmAddBtn = this.container.querySelector('#confirmAddBtn');
    if (confirmAddBtn) {
      confirmAddBtn.addEventListener('click', () => this.handleBatchAddStudents());
    }

    // 停用/激活班级
    const deactivateBtn = this.container.querySelector('#deactivateBtn');
    if (deactivateBtn) {
      deactivateBtn.addEventListener('click', () => this.handleDeactivateClass());
    }

    const activateBtn = this.container.querySelector('#activateBtn');
    if (activateBtn) {
      activateBtn.addEventListener('click', () => this.handleActivateClass());
    }

    // 移除学生按钮
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
   * 处理批量添加学生
   */
  async handleBatchAddStudents() {
    const emailListInput = this.container.querySelector('#emailListInput');
    const confirmBtn = this.container.querySelector('#confirmAddBtn');

    if (!emailListInput || !confirmBtn) {
      console.error('找不到表单元素');
      return;
    }

    try {
      const emailListText = emailListInput.value.trim();
      
      if (!emailListText) {
        this.showToast('warning', '请输入学生邮箱列表');
        return;
      }

      // 显示加载状态
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 添加中...';

      // 批量添加
      const result = await this.classManager.batchAddStudents(emailListText);

      // 关闭模态框
      const modal = this.container.querySelector('#addStudentsModal');
      if (modal) modal.style.display = 'none';
      emailListInput.value = '';

      // 显示结果
      let message = `成功添加 ${result.added} 名学生`;
      if (result.duplicates > 0) {
        message += `，${result.duplicates} 个重复已跳过`;
      }
      if (result.invalidEmails > 0) {
        message += `，${result.invalidEmails} 个无效邮箱已忽略`;
      }

      this.showToast('success', message);

      // 刷新界面
      await this.render();
    } catch (error) {
      console.error('批量添加学生失败:', error);
      this.showToast('error', error.message || '添加学生失败');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '添加学生';
    }
  }

  /**
   * 处理移除学生
   */
  async handleRemoveStudent(memberId, studentName, isPending) {
    const message = isPending
      ? `确定移除待激活邮箱 ${studentName}？`
      : `确定将 ${studentName} 移出班级？\n\n学生的作业记录将保留，但将无法访问班级任务。`;
    
    const confirmed = confirm(message);
    
    if (!confirmed) return;

    try {
      await this.classManager.removeStudent(memberId, isPending);
      this.showToast('success', isPending ? '已移除待激活邮箱' : `已将 ${studentName} 移出班级`);
      
      // 刷新界面
      await this.render();
    } catch (error) {
      console.error('移除学生失败:', error);
      this.showToast('error', '移除学生失败，请重试');
    }
  }

  /**
   * 处理停用班级
   */
  async handleDeactivateClass() {
    const confirmed = confirm('确定停用班级？\n\n学生将无法提交新作业，但可以查看现有作业。');
    
    if (!confirmed) return;

    try {
      await this.classManager.deactivateClass();
      this.showToast('success', '班级已停用');
      await this.render();
    } catch (error) {
      console.error('停用班级失败:', error);
      this.showToast('error', '停用班级失败');
    }
  }

  /**
   * 处理激活班级
   */
  async handleActivateClass() {
    try {
      await this.classManager.activateClass();
      this.showToast('success', '班级已激活');
      await this.render();
    } catch (error) {
      console.error('激活班级失败:', error);
      this.showToast('error', '激活班级失败');
    }
  }

  /**
   * 过滤学生列表
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
   * 排序学生列表
   */
  sortStudents(sortKey, members) {
    // 实现排序逻辑（这里简化处理，实际应该重新渲染）
    console.log('排序:', sortKey);
    // TODO: 实现排序并重新渲染
  }

  /**
   * 显示提示消息
   */
  showToast(type, message) {
    // 简单的提示实现
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
   * HTML 转义
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

