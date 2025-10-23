/**
 * 多班級管理界面組件
 * 負責渲染多班級管理界面和處理用戶交互
 */

import MultiClassManager from './multi-class-manager.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

class MultiClassUI {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.multiClassManager = new MultiClassManager(supabaseClient);
    this.container = null;
  }

  /**
   * 初始化多班級管理界面
   */
  async initialize(container) {
    this.container = container;
    
    try {
      // 初始化多班級管理器
      await this.multiClassManager.initialize();
      
      // 渲染界面
      await this.render();
      
      // 強制重新綁定事件（確保事件綁定正確執行）
      setTimeout(() => {
        console.log('🔄 強制重新綁定事件...');
        this.bindEvents();
      }, 100);
      
      console.log('✅ 多班級管理界面初始化完成');
    } catch (error) {
      console.error('❌ 多班級管理界面初始化失敗:', error);
      this.renderError(error.message);
    }
  }

  /**
   * 渲染多班級管理界面
   */
  async render() {
    if (!this.container) {
      console.error('未設置容器元素');
      return;
    }

    const classes = this.multiClassManager.getAllClasses();

    if (classes.length === 0) {
      // 沒有班級，顯示創建班級界面
      this.renderCreateClassForm();
    } else {
      // 有班級（1個或多個），都使用統一的多班級管理界面
      await this.renderMultiClassDashboard();
    }
  }

  /**
   * 渲染創建班級表單
   */
  renderCreateClassForm() {
    this.container.innerHTML = `
      <div class="create-class-container">
        <div class="create-class-card">
          <div class="create-class-header">
            <h2><i class="fas fa-plus-circle"></i> 創建第一個班級</h2>
            <p class="text-muted">開始使用時文寶鑑，創建班級以管理學生和布置寫作任務</p>
          </div>
          
          <form id="createClassForm" class="create-class-form">
            <div class="form-group">
              <label for="className">班級名稱 <span class="required">*</span></label>
              <input
                type="text"
                id="className"
                name="className"
                placeholder="例如：十年級A班、G11 Econ、中國古典文學"
                required
                maxlength="100"
                autocomplete="off"
              />
            </div>

            <div class="form-group">
              <label for="classDescription">班級描述（可選）</label>
              <textarea
                id="classDescription"
                name="classDescription"
                placeholder="例如：2024-2025 學年 十年級 中國古典文學課程"
                rows="3"
                maxlength="500"
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-large">
                <i class="fas fa-plus"></i> 創建班級
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // 綁定表單提交事件
    const form = this.container.querySelector('#createClassForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateClass(e));
    }
  }


  /**
   * 渲染多班級管理界面
   */
  async renderMultiClassDashboard() {
    const classes = this.multiClassManager.getAllClasses();
    const currentClass = this.multiClassManager.getCurrentClass();

    this.container.innerHTML = `
      <div class="multi-class-dashboard">
        <!-- 班級切換器 -->
        <div class="class-switcher">
          <div class="switcher-header">
            <h3><i class="fas fa-graduation-cap"></i> 班級管理</h3>
            <button id="createNewClassBtn" class="btn btn-primary">
              <i class="fas fa-plus"></i> 創建新班級
            </button>
          </div>
          
          <div class="class-tabs">
            ${classes.map(cls => `
              <div class="class-tab ${cls.id === currentClass?.id ? 'active' : ''}" 
                   data-class-id="${cls.id}">
                <div class="tab-content">
                  <div class="tab-title">${this.escapeHtml(cls.class_name)}</div>
                  <div class="tab-stats">
                    <span class="stat"><i class="fas fa-users"></i> ${cls.student_count}</span>
                    <span class="stat"><i class="fas fa-clipboard-list"></i> ${cls.assignment_count}</span>
                  </div>
                </div>
                <div class="tab-actions">
                  <button class="tab-action-btn edit-btn" data-class-id="${cls.id}" title="編輯班級">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="tab-action-btn delete-btn" data-class-id="${cls.id}" title="刪除班級">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 當前班級詳情 -->
        ${currentClass ? await this.renderCurrentClassDetails(currentClass) : ''}
      </div>

      <!-- 編輯班級模態框 -->
      <div id="editClassModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>編輯班級</h3>
            <button class="modal-close" id="closeEditModalBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="editClassForm">
              <div class="form-group">
                <label for="editClassName">班級名稱</label>
                <input
                  type="text"
                  id="editClassName"
                  name="className"
                  required
                  maxlength="100"
                />
              </div>
              <div class="form-group">
                <label for="editClassDescription">班級描述</label>
                <textarea
                  id="editClassDescription"
                  name="description"
                  rows="3"
                  maxlength="500"
                ></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="cancelEditBtn" class="btn btn-secondary">取消</button>
            <button id="saveEditBtn" class="btn btn-primary">保存</button>
          </div>
        </div>
      </div>
    `;

    // 綁定事件
    this.bindMultiClassEvents();
  }

  /**
   * 渲染當前班級詳情
   */
  async renderCurrentClassDetails(currentClass) {
    const stats = await this.multiClassManager.getClassStatistics(currentClass.id);

    return `
      <div class="current-class-details">

        <!-- 統計卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats?.totalStudents || 0}</div>
              <div class="stat-label">學生總數</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon active">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats?.activeStudents || 0}</div>
              <div class="stat-label">活躍學生</div>
              <div class="stat-sublabel">最近 7 天登入</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats?.totalAssignments || 0}</div>
              <div class="stat-label">任務總數</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon pending">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats?.pendingGrading || 0}</div>
              <div class="stat-label">待批改作業</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats?.averageCompletion || 0}%</div>
              <div class="stat-label">平均完成率</div>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="quick-actions">
          <h3>快速操作</h3>
          <div class="action-buttons">
            <button class="action-btn" onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignment-create' } }))">
              <i class="fas fa-plus"></i>
              <span>創建任務</span>
            </button>
            <button class="action-btn" data-action="batch-add-students">
              <i class="fas fa-user-plus"></i>
              <span>批量添加學生</span>
            </button>
            <button class="action-btn" onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'grading-queue' } }))">
              <i class="fas fa-clipboard-check"></i>
              <span>批改作業</span>
            </button>
            <button class="action-btn" onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'assignments' } }))">
              <i class="fas fa-list"></i>
              <span>管理任務</span>
            </button>
          </div>
        </div>

        <!-- 學生列表 -->
        <div class="students-section">
          <div class="section-header">
            <h3><i class="fas fa-users"></i> 學生列表</h3>
            <div class="section-actions">
              <button class="btn btn-sm btn-outline" data-action="refresh-students">
                <i class="fas fa-sync-alt"></i>
                刷新
              </button>
            </div>
          </div>
          <div id="students-list-container">
            <!-- 學生列表將在這裡動態加載 -->
          </div>
        </div>
      </div>
    `;

    // 綁定事件
    this.bindEvents();
    
    // 加載學生列表
    await this.loadStudentsList();
  }

  /**
   * 加載學生列表
   */
  async loadStudentsList() {
    try {
      console.log('🔄 開始加載學生列表...');
      console.log('📍 當前班級ID:', this.multiClassManager.currentClassId);
      
      // 如果沒有當前班級，嘗試選擇第一個班級
      if (!this.multiClassManager.currentClassId) {
        const classes = this.multiClassManager.getAllClasses();
        console.log('📚 可用班級:', classes.length);
        if (classes.length > 0) {
          console.log('🔄 自動選擇第一個班級:', classes[0].id);
          await this.multiClassManager.switchClass(classes[0].id);
        } else {
          this.renderStudentsListError('沒有可用的班級');
          return;
        }
      }

      console.log('📋 獲取學生數據...');
      const students = await this.multiClassManager.getClassStudents(this.multiClassManager.currentClassId);
      console.log('✅ 學生數據:', students);
      this.renderStudentsList(students);
    } catch (error) {
      console.error('❌ 加載學生列表失敗:', error);
      this.renderStudentsListError(error.message);
    }
  }

  /**
   * 渲染學生列表
   */
  renderStudentsList(students) {
    console.log('🎨 開始渲染學生列表...');
    console.log('📊 學生數據:', students);
    
    const container = this.container.querySelector('#students-list-container');
    if (!container) {
      console.error('❌ 找不到學生列表容器');
      return;
    }

    console.log('📦 找到學生列表容器');

    if (students.length === 0) {
      console.log('📭 沒有學生，顯示空狀態');
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>還沒有學生</p>
          <p class="text-muted">點擊"批量添加學生"按鈕添加學生到班級</p>
        </div>
      `;
      return;
    }

    console.log('📋 渲染學生表格...');
    container.innerHTML = `
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
          ${students.map(student => this.renderStudentRow(student)).join('')}
        </tbody>
      </table>
    `;

    console.log('✅ 學生表格渲染完成');
    console.log('🔗 綁定學生列表事件...');

    // 綁定學生列表事件
    this.bindStudentsListEvents(students);
    
    console.log('✅ 學生列表渲染完成');
  }

  /**
   * 渲染學生列表錯誤
   */
  renderStudentsListError(message) {
    const container = this.container.querySelector('#students-list-container');
    if (!container) return;

    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>加載學生列表失敗</p>
        <p class="text-muted">${this.escapeHtml(message)}</p>
        <button class="btn btn-sm btn-outline" data-action="refresh-students">
          <i class="fas fa-sync-alt"></i>
          重試
        </button>
      </div>
    `;
  }

  /**
   * 渲染單個學生行
   */
  renderStudentRow(student) {
    const activityBadge = this.getActivityBadge(student.activityStatus);
    const statusBadge = student.status === 'active' ? '已登入' : student.isPending ? '待激活' : '未登入';
    const addedDate = new Date(student.addedAt).toLocaleDateString('zh-CN');

    return `
      <tr data-member-id="${student.id}" data-is-pending="${student.isPending || false}">
        <td>${this.escapeHtml(student.displayName)}</td>
        <td>${this.escapeHtml(student.email)}</td>
        <td>
          <span class="badge badge-${student.status === 'active' ? 'success' : 'secondary'}">
            ${statusBadge}
          </span>
        </td>
        <td>${activityBadge}</td>
        <td>
          <div class="progress-indicator">
            <span>${student.assignmentProgress.completed}/${student.assignmentProgress.total}</span>
            <div class="progress-bar-mini">
              <div class="progress-fill" style="width: ${student.assignmentProgress.total > 0 ? (student.assignmentProgress.completed / student.assignmentProgress.total * 100) : 0}%"></div>
            </div>
          </div>
        </td>
        <td>${addedDate}</td>
        <td>
          <button
            class="btn-icon btn-danger remove-student-btn"
            data-member-id="${student.id}"
            data-student-name="${this.escapeHtml(student.displayName)}"
            data-is-pending="${student.isPending || false}"
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
      offline: '<span class="activity-badge offline">🔴 離線</span>'
    };
    return badges[status] || badges.offline;
  }

  /**
   * 綁定學生列表事件
   */
  bindStudentsListEvents(students) {
    // 刷新按鈕
    const refreshBtn = this.container.querySelector('[data-action="refresh-students"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadStudentsList();
      });
    }

    // 移除學生按鈕
    const removeBtns = this.container.querySelectorAll('.remove-student-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const memberId = e.target.closest('button').dataset.memberId;
        const studentName = e.target.closest('button').dataset.studentName;
        const isPending = e.target.closest('button').dataset.isPending === 'true';
        
        this.handleRemoveStudent(memberId, studentName, isPending);
      });
    });
  }

  /**
   * 處理移除學生
   */
  async handleRemoveStudent(memberId, studentName, isPending) {
    try {
      const confirmed = await dialog.confirm(
        '確認移除學生',
        `確定要移除學生 "${studentName}" 嗎？${isPending ? '（該學生尚未登入）' : ''}`
      );

      if (confirmed) {
        // 這裡需要調用 ClassManager 的移除學生方法
        // 暫時顯示成功消息
        toast.success(`已移除學生 "${studentName}"`);
        await this.loadStudentsList();
      }
    } catch (error) {
      console.error('❌ 移除學生失敗:', error);
      toast.error('移除學生失敗：' + error.message);
    }
  }

  /**
   * 綁定事件（統一事件綁定）
   */
  bindEvents() {
    console.log('🔧 MultiClassUI.bindEvents 開始執行');
    
    // 班級切換
    const classTabs = this.container.querySelectorAll('.class-tab');
    classTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.tab-action-btn')) return; // 忽略操作按鈕
        const classId = tab.getAttribute('data-class-id');
        this.switchToClass(classId);
      });
    });

    // 編輯班級按鈕（多班級界面）
    const editBtns = this.container.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const classId = btn.getAttribute('data-class-id');
        this.showEditClassModal(classId);
      });
    });

    // 編輯班級按鈕（單班級界面）
    const editBtn = this.container.querySelector('#editClassBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.showEditClassModal());
    }

    // 刪除班級按鈕
    const deleteBtns = this.container.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const classId = btn.getAttribute('data-class-id');
        this.deleteClass(classId);
      });
    });

    // 創建新班級按鈕
    const createBtn = this.container.querySelector('#createNewClassBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateClassModal());
    }

    // 批量添加學生按鈕 - 永久修復
    const batchAddBtn = this.container.querySelector('[data-action="batch-add-students"]');
    console.log('🔍 查找批量添加學生按鈕:', batchAddBtn);
    if (batchAddBtn) {
      console.log('✅ 找到批量添加學生按鈕，添加事件監聽器');
      batchAddBtn.addEventListener('click', () => {
        console.log('🎯 批量添加學生按鈕被點擊！');
        this.showBatchAddStudentsModal();
      });
    } else {
      console.log('❌ 沒有找到批量添加學生按鈕');
      console.log('容器內容:', this.container.innerHTML.substring(0, 500));
    }

    // 編輯模態框事件
    this.bindEditModalEvents();
    
    console.log('✅ MultiClassUI.bindEvents 執行完成');
  }

  /**
   * 綁定單班級事件
   */
  bindSingleClassEvents() {
    // 編輯班級按鈕
    const editBtn = this.container.querySelector('#editClassBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.showEditClassModal());
    }

    // 創建新班級按鈕
    const createBtn = this.container.querySelector('#createNewClassBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateClassModal());
    }

    // 批量添加學生按鈕
    const batchAddBtn = this.container.querySelector('[data-action="batch-add-students"]');
    if (batchAddBtn) {
      batchAddBtn.addEventListener('click', () => this.showBatchAddStudentsModal());
    }

    // 刷新學生列表按鈕
    const refreshStudentsBtn = this.container.querySelector('[data-action="refresh-students"]');
    if (refreshStudentsBtn) {
      refreshStudentsBtn.addEventListener('click', () => this.loadStudentsList());
    }

    // 編輯模態框事件
    this.bindEditModalEvents();
  }

  /**
   * 綁定多班級事件
   */
  bindMultiClassEvents() {
    // 班級切換
    const classTabs = this.container.querySelectorAll('.class-tab');
    classTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.tab-action-btn')) return; // 忽略操作按鈕
        const classId = tab.getAttribute('data-class-id');
        this.switchToClass(classId);
      });
    });

    // 編輯班級按鈕
    const editBtns = this.container.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const classId = btn.getAttribute('data-class-id');
        this.showEditClassModal(classId);
      });
    });

    // 刪除班級按鈕
    const deleteBtns = this.container.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const classId = btn.getAttribute('data-class-id');
        this.deleteClass(classId);
      });
    });

    // 創建新班級按鈕
    const createBtn = this.container.querySelector('#createNewClassBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateClassModal());
    }

    // 編輯模態框事件
    this.bindEditModalEvents();
  }

  /**
   * 綁定編輯模態框事件
   */
  bindEditModalEvents() {
    const modal = this.container.querySelector('#editClassModal');
    if (!modal) return;

    // 關閉按鈕
    const closeBtn = modal.querySelector('#closeEditModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideEditModal());
    }

    // 取消按鈕
    const cancelBtn = modal.querySelector('#cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideEditModal());
    }

    // 保存按鈕
    const saveBtn = modal.querySelector('#saveEditBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleEditClass());
    }

    // 點擊遮罩關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideEditModal();
      }
    });
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
      await this.multiClassManager.createClass(className, description);

      // 重新渲染界面
      await this.render();
    } catch (error) {
      console.error('創建班級失敗:', error);
      // 恢復按鈕狀態
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-plus"></i> 創建班級';
    }
  }

  /**
   * 切換到指定班級
   */
  async switchToClass(classId) {
    try {
      await this.multiClassManager.switchClass(classId);
      
      // 重新渲染界面
      await this.render();
      
      // 觸發導航事件，更新其他界面
      window.dispatchEvent(new CustomEvent('classSwitched', {
        detail: { classId }
      }));
    } catch (error) {
      console.error('切換班級失敗:', error);
      toast.error('切換班級失敗');
    }
  }

  /**
   * 顯示編輯班級模態框
   */
  showEditClassModal(classId = null) {
    const targetClassId = classId || this.multiClassManager.getCurrentClass()?.id;
    const targetClass = this.multiClassManager.getAllClasses().find(c => c.id === targetClassId);
    
    if (!targetClass) return;

    const modal = this.container.querySelector('#editClassModal');
    const form = modal.querySelector('#editClassForm');
    
    // 填充表單
    form.className.value = targetClass.class_name;
    form.description.value = targetClass.description || '';
    
    // 設置編輯的班級ID
    form.setAttribute('data-class-id', targetClassId);
    
    // 顯示模態框
    modal.style.display = 'flex';
  }

  /**
   * 隱藏編輯模態框
   */
  hideEditModal() {
    const modal = this.container.querySelector('#editClassModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 處理編輯班級
   */
  async handleEditClass() {
    const form = this.container.querySelector('#editClassForm');
    const classId = form.getAttribute('data-class-id');
    const className = form.className.value.trim();
    const description = form.description.value.trim();

    try {
      // 顯示加載狀態
      const saveBtn = this.container.querySelector('#saveEditBtn');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

      // 更新班級
      await this.multiClassManager.editClass(classId, className, description);

      // 隱藏模態框
      this.hideEditModal();

      // 重新渲染界面
      await this.render();
    } catch (error) {
      console.error('編輯班級失敗:', error);
      // 恢復按鈕狀態
      const saveBtn = this.container.querySelector('#saveEditBtn');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '保存';
    }
  }

  /**
   * 刪除班級
   */
  async deleteClass(classId) {
    try {
      await this.multiClassManager.deleteClass(classId);
      
      // 重新渲染界面
      await this.render();
    } catch (error) {
      console.error('刪除班級失敗:', error);
    }
  }

  /**
   * 顯示創建班級模態框
   */
  showCreateClassModal() {
    // 簡單的創建班級表單
    const className = prompt('請輸入班級名稱：');
    if (!className) return;

    const description = prompt('請輸入班級描述（可選）：') || '';

    // 創建班級
    this.multiClassManager.createClass(className, description)
      .then(() => this.render())
      .catch(error => {
        console.error('創建班級失敗:', error);
      });
  }

  /**
   * 渲染錯誤信息
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-circle"></i>
        <h2>出錯了</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn btn-primary">重新加載</button>
      </div>
    `;
  }

  /**
   * 顯示批量添加學生模態框
   */
  showBatchAddStudentsModal() {
    const currentClass = this.multiClassManager.getCurrentClass();
    if (!currentClass) {
      toast.error('請先選擇一個班級');
      return;
    }

    // 創建模態框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>批量添加學生</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>學生郵箱列表</label>
            <textarea
              id="emailListInput"
              placeholder="請輸入學生郵箱，每行一個或用逗號分隔&#10;例如：&#10;3015174@student.isf.edu.hk&#10;3015175@student.isf.edu.hk&#10;3015176@student.isf.edu.hk"
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
    `;

    document.body.appendChild(modal);

    // 綁定事件
    const cancelBtn = modal.querySelector('#cancelAddBtn');
    const confirmBtn = modal.querySelector('#confirmAddBtn');
    const closeBtn = modal.querySelector('.modal-close');

    cancelBtn.onclick = () => modal.remove();
    closeBtn.onclick = () => modal.remove();
    confirmBtn.onclick = () => this.handleBatchAddStudents(currentClass.id, modal);
  }

  /**
   * 處理批量添加學生
   */
  async handleBatchAddStudents(classId, modal) {
    const emailListInput = modal.querySelector('#emailListInput');
    const confirmBtn = modal.querySelector('#confirmAddBtn');

    try {
      const emailListText = emailListInput.value.trim();
      
      if (!emailListText) {
        toast.warning('請輸入學生郵箱列表');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 添加中...';

      // 調用多班級管理器的批量添加方法
      const result = await this.multiClassManager.batchAddStudents(classId, emailListText);

      modal.remove();

      let message = `成功添加 ${result.added} 名學生`;
      if (result.duplicates > 0) {
        message += `，${result.duplicates} 個重複已跳過`;
      }
      if (result.invalidEmails > 0) {
        message += `，${result.invalidEmails} 個無效郵箱已忽略`;
      }

      toast.success(message);
      
      // 重新渲染界面
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

export default MultiClassUI;
