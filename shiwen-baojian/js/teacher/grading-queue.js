/**
 * 批改作業隊列頁面
 * 按任務分組顯示待批改的學生提交
 */

import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

class GradingQueue {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.container = null;
    this.assignmentsWithSubmissions = [];
    this.totalPending = 0;
  }

  /**
   * 渲染批改隊列頁面
   */
  async render(container) {
    this.container = container;
    await this.loadAndRender();
  }

  /**
   * 加載並渲染數據
   */
  async loadAndRender() {
    try {
      // 🚨 優化：顯示骨架屏，改善用戶體驗
      this.container.innerHTML = `
        <div class="grading-queue-container">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              <i class="fas fa-clipboard-check text-stone-600 mr-2"></i>
              批改作業
            </h2>
          </div>
          
          <!-- 骨架屏 -->
          <div class="space-y-4">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div class="flex items-center justify-between mb-4">
                <div class="h-6 bg-gray-200 rounded w-1/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div class="space-y-3">
                <div class="h-4 bg-gray-200 rounded w-full"></div>
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="flex space-x-4 mt-4">
                  <div class="h-8 bg-gray-200 rounded w-20"></div>
                  <div class="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div class="flex items-center justify-between mb-4">
                <div class="h-6 bg-gray-200 rounded w-1/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div class="space-y-3">
                <div class="h-4 bg-gray-200 rounded w-full"></div>
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="flex space-x-4 mt-4">
                  <div class="h-8 bg-gray-200 rounded w-20"></div>
                  <div class="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // 1. 獲取當前老師的所有已發布任務
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // 先獲取老師管理的班級
      const { data: classes } = await this.supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);
        
      if (!classes || classes.length === 0) {
        this.renderNoClasses();
        return;
      }
      
      const classIds = classes.map(c => c.id);
      
      // 獲取這些班級的所有已發布任務
      const { data: assignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select('*')
        .in('class_id', classIds)
        .eq('is_published', true)
        .order('due_date', { ascending: true });
        
      if (assignmentsError) throw assignmentsError;
      
      if (!assignments || assignments.length === 0) {
        this.renderNoAssignments();
        return;
      }
      
      // 2. 🚨 優化：並行執行查詢，減少等待時間
      console.log('📊 開始加載任務提交統計，共', assignments.length, '個任務');
      
      const assignmentIds = assignments.map(a => a.id);
      const assignmentClassIds = [...new Set(assignments.map(a => a.class_id))];
      
      // 並行執行兩個查詢
      const [essaysResult, classMemberResult] = await Promise.all([
        // 一次性獲取所有作業的essays
        this.supabase
          .from('essays')
          .select(`
            id,
            assignment_id,
            student_id,
            title,
            status,
            total_word_count,
            submitted_at,
            updated_at,
            users!student_id (
              id,
              display_name,
              email
            )
          `)
          .in('assignment_id', assignmentIds)
          .in('status', ['writing', 'graded']),
        
        // 一次性獲取所有班級的學生數
        this.supabase
          .from('class_members')
          .select('class_id')
          .in('class_id', assignmentClassIds)
      ]);
      
      if (essaysResult.error) {
        console.error('❌ 獲取提交失敗:', essaysResult.error);
        throw essaysResult.error;
      }
      
      const allEssays = essaysResult.data;
      const classMemberData = classMemberResult.data;
      
      // 在內存中分組和聚合
      this.assignmentsWithSubmissions = assignments.map(assignment => {
        const essays = allEssays?.filter(e => e.assignment_id === assignment.id) || [];
        const pendingList = essays.filter(e => e.status !== 'graded');
        const graded = essays.filter(e => e.status === 'graded');
        const totalStudents = classMemberData?.filter(m => m.class_id === assignment.class_id).length || 0;
        
        return {
          ...assignment,
          submissions: {
            pending: pendingList,
            graded: graded,
            total: essays.length,
            totalStudents
          }
        };
      });
      
      // console.timeEnd('⏱️ 載入批改隊列'); // 已優化為並行查詢
      
      // 計算總待批改數
      this.totalPending = this.assignmentsWithSubmissions
        .reduce((sum, a) => sum + a.submissions.pending.length, 0);
      
      console.log('📊 統計結果：總待批改', this.totalPending, '份');
      
      this.assignmentsWithSubmissions = this.assignmentsWithSubmissions
        .filter(a => a.submissions.total > 0);
      
      console.log('📋 過濾後：', this.assignmentsWithSubmissions.length, '個任務有提交記錄');
      
      // 更新導航徽章
      this.updateNavigationBadge();
      
      // 渲染頁面
      this.renderPage();
      
    } catch (error) {
      console.error('❌ 加載批改隊列失敗:', error);
      this.container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle text-rose-500 text-4xl"></i>
          <p class="mt-4 text-gray-700">加載失敗：${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 更新導航徽章
   */
  updateNavigationBadge() {
    const badge = document.getElementById('pending-grading-badge');
    if (badge) {
      if (this.totalPending > 0) {
        badge.textContent = this.totalPending;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  /**
   * 渲染頁面
   */
  renderPage() {
    // 如果完全没有提交记录，显示空状态
    if (this.assignmentsWithSubmissions.length === 0) {
      this.renderNoSubmissions();
      return;
    }
    
    // 如果没有待批改（但有已批改），仍然显示任务列表
    if (this.totalPending === 0) {
      // 显示成功消息，但仍然渲染任务列表（显示已批改记录）
      this.container.innerHTML = `
        <div class="grading-queue-container">
          <!-- 顶部成功消息 -->
          <div class="success-banner" style="background: var(--success-100); border: 1px solid var(--success-300); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
            <i class="fas fa-check-double text-emerald-600 text-4xl mb-3"></i>
            <p class="text-gray-700 text-lg font-semibold">太棒了！沒有待批改的作業</p>
            <p class="text-gray-600 text-sm mt-2">所有提交的作業都已批改完成，您可以查看已批改記錄</p>
          </div>
          
          <!-- 任務列表（显示已批改记录） -->
          <div class="grading-assignments-list">
            ${this.assignmentsWithSubmissions.map(a => this.renderAssignmentSection(a)).join('')}
          </div>
        </div>
      `;
      
      this.bindEvents();
      return;
    }

    // 有待批改作业，正常显示
    this.container.innerHTML = `
      <div class="grading-queue-container">
        <!-- 任務列表 -->
        <div class="grading-assignments-list">
          ${this.assignmentsWithSubmissions.map(a => this.renderAssignmentSection(a)).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * 渲染任務區域（包含該任務的所有待批改提交）
   */
  renderAssignmentSection(assignment) {
    const dueDate = new Date(assignment.due_date);
    const isOverdue = dueDate < new Date();
    const pendingCount = assignment.submissions.pending.length;
    const gradedCount = assignment.submissions.graded.length;
    const totalSubmitted = assignment.submissions.total;

    return `
      <div class="assignment-grading-section">
        <!-- 任務標題卡 -->
        <div class="assignment-header-card ${isOverdue ? 'overdue' : ''}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 mb-2">
                <i class="fas fa-file-alt mr-2"></i>${this.escapeHtml(assignment.title)}
              </h3>
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  <i class="fas fa-calendar mr-1"></i>
                  截止：${dueDate.toLocaleDateString('zh-Hant-TW', { 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  ${isOverdue ? '<span class="text-rose-600 font-semibold ml-2">已過期</span>' : ''}
                </span>
                <span>
                  <i class="fas fa-users mr-1"></i>
                  提交：${totalSubmitted}/${assignment.submissions.totalStudents}
                </span>
              </div>
            </div>
            
            <!-- 批改進度 -->
            <div class="grading-progress-badge">
              <div class="text-2xl font-bold">${pendingCount}</div>
              <div class="text-xs">待批改</div>
            </div>
          </div>
          
          <!-- 進度條 -->
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>批改進度</span>
              <span>${gradedCount}/${totalSubmitted} (${Math.round(gradedCount/totalSubmitted*100)}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${gradedCount/totalSubmitted*100}%"></div>
            </div>
          </div>
        </div>

        <!-- 待批改學生列表 -->
        <div class="submissions-list">
          ${assignment.submissions.pending.map(essay => this.renderSubmissionCard(essay, assignment.id)).join('')}
        </div>
        
        <!-- 已批改摺疊區 -->
        ${gradedCount > 0 ? `
          <div class="graded-section">
            <button class="toggle-graded-btn" data-assignment-id="${assignment.id}">
              <i class="fas fa-chevron-down"></i>
              <span>查看已批改（${gradedCount}份）</span>
            </button>
            <div class="graded-list hidden" id="graded-list-${assignment.id}">
              ${assignment.submissions.graded.map(essay => this.renderGradedCard(essay, assignment.id)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染待批改提交卡片
   */
  renderSubmissionCard(essay, assignmentId) {
    const dateRef = essay.submitted_at || essay.updated_at;
    const submittedDate = dateRef ? new Date(dateRef) : new Date();
    const student = essay.users;
    const isDraft = essay.status === 'writing';

    return `
      <div class="submission-card pending ${isDraft ? 'draft' : ''}">
        <div class="student-info">
          <div class="student-avatar">
            ${student.display_name ? student.display_name.charAt(0) : '學'}
          </div>
          <div class="student-details">
            <div class="student-name">${this.escapeHtml(student.display_name || '未命名學生')}</div>
            <div class="student-email">${this.escapeHtml(student.email)}</div>
          </div>
        </div>
        
        <div class="submission-meta">
          <span class="meta-item">
            <i class="fas fa-font"></i>
            ${essay.total_word_count || 0} 字
          </span>
          <span class="meta-item">
            <i class="fas fa-clock"></i>
            ${submittedDate.toLocaleDateString('zh-Hant-TW', { 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          ${isDraft ? '<span class="meta-item draft-status"><i class="fas fa-edit"></i>草稿</span>' : ''}
        </div>
        
        <div class="submission-actions">
          <button class="btn-grade" data-essay-id="${essay.id}" data-assignment-id="${assignmentId}">
            <i class="fas fa-pen-fancy"></i>
            ${isDraft ? '查看草稿' : '開始批改'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染已批改卡片
   */
  renderGradedCard(essay, assignmentId) {
    const student = essay.users;

    return `
      <div class="submission-card graded">
        <div class="student-info">
          <div class="student-avatar graded">
            ${student.display_name ? student.display_name.charAt(0) : '學'}
          </div>
          <div class="student-details">
            <div class="student-name">${this.escapeHtml(student.display_name || '未命名學生')}</div>
            <div class="student-email">${this.escapeHtml(student.email)}</div>
          </div>
        </div>
        
        <div class="submission-meta">
          <span class="meta-item">
            <i class="fas fa-check-circle text-emerald-600"></i>
            已批改
          </span>
        </div>
        
        <div class="submission-actions">
          <button class="btn-view-grading" data-essay-id="${essay.id}" data-assignment-id="${assignmentId}">
            <i class="fas fa-eye"></i>
            查看批改
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    // 批改按鈕
    this.container.querySelectorAll('.btn-grade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const essayId = e.currentTarget.getAttribute('data-essay-id');
        const assignmentId = e.currentTarget.getAttribute('data-assignment-id');
        console.log('📝 開始批改:', essayId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'grading', id: essayId }
        }));
      });
    });
    
    // 查看批改按鈕
    this.container.querySelectorAll('.btn-view-grading').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const essayId = e.currentTarget.getAttribute('data-essay-id');
        console.log('👁️ 查看批改:', essayId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { page: 'grading', id: essayId }
        }));
      });
    });
    
    // 切換已批改列表
    this.container.querySelectorAll('.toggle-graded-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-assignment-id');
        const gradedList = document.getElementById(`graded-list-${assignmentId}`);
        const icon = e.currentTarget.querySelector('i');
        
        if (gradedList.classList.contains('hidden')) {
          gradedList.classList.remove('hidden');
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        } else {
          gradedList.classList.add('hidden');
          icon.classList.remove('fa-chevron-up');
          icon.classList.add('fa-chevron-down');
        }
      });
    });
  }

  /**
   * 渲染無班級狀態
   */
  renderNoClasses() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users-slash text-gray-300 text-5xl mb-4"></i>
        <p class="text-gray-600 text-lg">您還沒有創建班級</p>
        <p class="text-gray-500 text-sm mt-2">請先到「班級管理」創建班級並佈置任務</p>
      </div>
    `;
  }

  /**
   * 渲染無任務狀態
   */
  renderNoAssignments() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard text-gray-300 text-5xl mb-4"></i>
        <p class="text-gray-600 text-lg">還沒有已發布的任務</p>
        <p class="text-gray-500 text-sm mt-2">請到「作業管理」創建並發布任務</p>
      </div>
    `;
  }

  /**
   * 渲染無提交記錄狀態
   */
  renderNoSubmissions() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox text-gray-400 text-5xl mb-4"></i>
        <p class="text-gray-600 text-lg">還沒有學生提交作業</p>
        <p class="text-gray-500 text-sm mt-2">學生提交後會顯示在這裡</p>
      </div>
    `;
  }

  /**
   * 轉義 HTML
   */
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default GradingQueue;

