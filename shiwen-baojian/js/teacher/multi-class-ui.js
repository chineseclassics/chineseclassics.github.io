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
    const currentClass = this.multiClassManager.getCurrentClass();

    if (classes.length === 0) {
      // 沒有班級，顯示創建班級界面
      this.renderCreateClassForm();
    } else if (classes.length === 1) {
      // 只有一個班級，顯示單班級管理界面
      await this.renderSingleClassDashboard();
    } else {
      // 多個班級，顯示多班級管理界面
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
   * 渲染單班級管理界面
   */
  async renderSingleClassDashboard() {
    const currentClass = this.multiClassManager.getCurrentClass();
    const stats = await this.multiClassManager.getClassStatistics();

    this.container.innerHTML = `
      <div class="single-class-dashboard">
        <!-- 班級概覽 -->
        <div class="class-header">
          <div class="class-info">
            <h2><i class="fas fa-graduation-cap"></i> ${this.escapeHtml(currentClass.class_name)}</h2>
            ${currentClass.description ? `<p class="class-description">${this.escapeHtml(currentClass.description)}</p>` : ''}
          </div>
          <div class="class-actions">
            <button id="editClassBtn" class="btn btn-secondary">
              <i class="fas fa-edit"></i> 編輯班級
            </button>
            <button id="createNewClassBtn" class="btn btn-primary">
              <i class="fas fa-plus"></i> 創建新班級
            </button>
          </div>
        </div>

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
            <button class="action-btn" onclick="this.showBatchAddStudentsModal()">
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
                  value="${this.escapeHtml(currentClass.class_name)}"
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
                >${this.escapeHtml(currentClass.description || '')}</textarea>
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
    this.bindSingleClassEvents();
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
        <div class="class-header">
          <div class="class-info">
            <h2><i class="fas fa-graduation-cap"></i> ${this.escapeHtml(currentClass.class_name)}</h2>
            ${currentClass.description ? `<p class="class-description">${this.escapeHtml(currentClass.description)}</p>` : ''}
          </div>
        </div>

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
            <button class="action-btn" onclick="this.showBatchAddStudentsModal()">
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
      </div>
    `;
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
