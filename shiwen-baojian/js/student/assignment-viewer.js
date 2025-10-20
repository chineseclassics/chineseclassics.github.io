/**
 * 學生端任務列表查看器（精简版）
 */

import { AppState } from '../app.js';
import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

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
    this.practiceEssays = [];  // 存儲練筆作品
    await this.loadAndRenderAssignments();
  }

  /**
   * 加載并渲染任務
   */
  async loadAndRenderAssignments(useCache = true) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      // ✅ 檢查緩存（如果允許使用緩存且緩存未過期）
      const cacheAge = AppState.cache.lastRefreshTime 
        ? (Date.now() - AppState.cache.lastRefreshTime) / 1000 
        : Infinity;
      const cacheValid = useCache && cacheAge < 300; // 5 分鐘內有效
      
      if (cacheValid && AppState.cache.assignmentsList.length > 0) {
        console.log('📦 使用緩存的任務列表（緩存時間:', Math.floor(cacheAge), '秒）');
        this.assignments = AppState.cache.assignmentsList;
        this.practiceEssays = AppState.cache.practiceEssaysList;
      } else {
        console.log('🔄 從 Supabase 加載最新數據...');
        
        // 1. 獲取學生所在的班級
        const { data: memberships } = await this.supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);

        const hasClass = memberships && memberships.length > 0;
        
        // 2. 如果有班級，獲取班級任務
        if (hasClass) {
          const classIds = memberships.map(m => m.class_id);

          const { data: assignments, error } = await this.supabase
            .from('assignments')
            .select('*')
            .in('class_id', classIds)
            .eq('is_published', true)
            .order('due_date', { ascending: true });

          if (error) throw error;
          this.assignments = assignments || [];
        } else {
          this.assignments = [];
        }

        // 3. 獲取自主練筆作品（assignment_id 為 NULL）
        const { data: practiceEssays, error: practiceError } = await this.supabase
          .from('essays')
          .select('*')
          .eq('student_id', user.id)
          .is('assignment_id', null)
          .order('updated_at', { ascending: false });

        if (practiceError) {
          console.error('獲取練筆作品失敗:', practiceError);
          this.practiceEssays = [];
        } else {
          this.practiceEssays = practiceEssays || [];
        }
        
        // ✅ 更新緩存
        AppState.cache.assignmentsList = this.assignments;
        AppState.cache.practiceEssaysList = this.practiceEssays;
        AppState.cache.lastRefreshTime = Date.now();
        console.log('✅ 緩存已更新');
      }

      // 4. 如果既沒有班級也沒有練筆作品，顯示空狀態
      const hasClass = this.assignments.length > 0 || AppState.cache.assignmentsList.length > 0;
      if (!hasClass && this.practiceEssays.length === 0) {
        this.renderNoClass();
        return;
      }

      // 為每個任務加載學生的提交狀態和字數
      const enrichedAssignments = await Promise.all(
        this.assignments.map(async (assignment) => {
          const { data: essay } = await this.supabase
            .from('essays')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id)
            .maybeSingle();

          // 如果有草稿，計算實際字數
          let actualWordCount = 0;
          if (essay && essay.content_json) {
            try {
              const content = JSON.parse(essay.content_json);
              // 計算所有段落的中文字數
              actualWordCount = this.calculateWordCount(content);
            } catch (e) {
              console.warn('解析作業內容失敗:', e);
              actualWordCount = essay.total_word_count || 0;
            }
          }

          return {
            ...assignment,
            studentEssay: essay,
            actualWordCount: actualWordCount
          };
        })
      );

      this.assignments = enrichedAssignments;
      
      // 5. 計算練筆作品的字數
      this.practiceEssays = this.practiceEssays.map(essay => {
        let wordCount = 0;
        if (essay.content_json) {
          try {
            const content = JSON.parse(essay.content_json);
            wordCount = this.calculateWordCount(content);
          } catch (e) {
            wordCount = essay.total_word_count || 0;
          }
        }
        return { ...essay, actualWordCount: wordCount };
      });

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
    const hasAssignments = this.assignments.length > 0;
    const hasPractices = this.practiceEssays.length > 0;

    // ✅ 添加刷新按鈕
    this.container.innerHTML = `
      <div class="student-assignment-list">
        ${hasAssignments ? `
          <!-- 老師佈置的任務 -->
          <div class="assignments-section">
            <div class="list-header">
              <h2><i class="fas fa-tasks"></i> 老師佈置的任務</h2>
              <div class="assignment-stats">
                <span class="stat-item">
                  <i class="fas fa-clipboard-list"></i>
                  共 ${this.assignments.length} 個任務
                </span>
                <button id="refresh-assignments-btn" class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2">
                  <i class="fas fa-sync-alt"></i>
                  刷新
                </button>
              </div>
            </div>
            <div class="student-assignments-grid">
              ${this.assignments.map(a => this.renderAssignmentCard(a)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 我的練筆 -->
        <div class="practice-section ${hasAssignments ? 'mt-12' : ''}">
          <div class="practice-header">
            <h2><i class="fas fa-feather-alt"></i> 我的練筆</h2>
            <button id="free-writing-btn" class="practice-new-btn">
              <i class="fas fa-plus"></i>
              開始新的練筆
            </button>
          </div>
          
          ${hasPractices ? `
            <div class="student-assignments-grid">
              ${this.practiceEssays.map(p => this.renderPracticeCard(p)).join('')}
            </div>
          ` : `
            <div class="empty-practice-state">
              <i class="fas fa-feather text-gray-300 text-5xl mb-4"></i>
              <p class="text-gray-500">還沒有練筆作品</p>
              <p class="text-gray-400 text-sm mt-2">點擊上方按鈕開始您的第一篇練筆</p>
            </div>
          `}
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
    const now = new Date();
    const isOverdue = dueDate < now;
    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const essay = assignment.studentEssay;
    const status = this.getStatus(essay, isOverdue);
    
    // 判断是否可以撤回（截止日期前 + 未批改）
    const canWithdraw = essay && 
                       essay.status === 'submitted' && 
                       !isOverdue && 
                       (!essay.graded_at);

    return `
      <div class="student-assignment-card ${status.class}">
        <div class="card-header">
          <h3>${this.escapeHtml(assignment.title)}</h3>
          <span class="status-badge ${status.class}">${status.text}</span>
        </div>

        ${assignment.description ? `
          <div class="card-description">
            <p>${this.escapeHtml(assignment.description)}</p>
          </div>
        ` : ''}

        <div class="card-meta">
          <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>截止：${dueDate.toLocaleDateString('zh-Hant-TW', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} ${dueDate.toLocaleTimeString('zh-Hant-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
          ${!isOverdue && daysLeft >= 0 ? `
            <div class="meta-item ${daysLeft <= 3 ? 'urgent' : ''}">
              <i class="fas fa-clock"></i>
              <span>${daysLeft === 0 ? '今天截止' : `還有 ${daysLeft} 天`}</span>
            </div>
          ` : ''}
          ${assignment.actualWordCount > 0 ? `
            <div class="meta-item">
              <i class="fas fa-file-word"></i>
              <span>已寫 ${assignment.actualWordCount} 字</span>
            </div>
          ` : ''}
          ${essay && essay.submitted_at ? `
            <div class="meta-item">
              <i class="fas fa-check-circle text-green-600"></i>
              <span>已於 ${new Date(essay.submitted_at).toLocaleDateString('zh-Hant-TW', { 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} 提交</span>
            </div>
          ` : ''}
        </div>
        
        ${essay && essay.status === 'submitted' ? `
          <!-- 已提交狀態的提示 -->
          <div class="submission-notice">
            <i class="fas fa-info-circle"></i>
            <span>${essay.graded_at ? '老師已批改，可查看評語' : '等待老師批改中...'}</span>
          </div>
        ` : ''}

        <div class="card-actions">
          ${this.renderActionButtons(assignment, essay, canWithdraw)}
        </div>
      </div>
    `;
  }
  
  /**
   * 渲染操作按鈕
   */
  renderActionButtons(assignment, essay, canWithdraw) {
    // 未開始
    if (!essay || essay.status === 'draft' && !assignment.actualWordCount) {
      return `
        <button class="btn-action start-btn" data-id="${assignment.id}">
          <i class="fas fa-pen"></i>
          開始寫作
        </button>
      `;
    }
    
    // 草稿中
    if (essay && essay.status === 'draft') {
      return `
        <button class="btn-action continue-btn edit" data-id="${assignment.id}">
          <i class="fas fa-edit"></i>
          繼續寫作
        </button>
      `;
    }
    
    // 已提交
    if (essay && essay.status === 'submitted') {
      return `
        <button class="btn-action view-btn" data-id="${assignment.id}">
          <i class="fas fa-eye"></i>
          查看作業
        </button>
        ${canWithdraw ? `
          <button class="btn-action withdraw-btn" data-id="${assignment.id}" data-essay-id="${essay.id}">
            <i class="fas fa-undo"></i>
            撤回並編輯
          </button>
        ` : ''}
      `;
    }
    
    // 已批改
    if (essay && essay.status === 'graded') {
      return `
        <button class="btn-action view-btn graded" data-id="${assignment.id}">
          <i class="fas fa-star"></i>
          查看批改結果
        </button>
      `;
    }
    
    return '';
  }

  /**
   * 轉義 HTML 特殊字符
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

  /**
   * 計算作業的實際中文字數
   */
  calculateWordCount(contentJson) {
    let total = 0;
    
    if (!contentJson) return 0;
    
    // 從 HTML 中提取純文本並統計中文字符
    const countChineseInHTML = (html) => {
      if (!html) return 0;
      // 移除 HTML 標籤
      const text = html.replace(/<[^>]*>/g, '');
      // 只統計中文字符
      const matches = text.match(/[\u4e00-\u9fa5]/g);
      return matches ? matches.length : 0;
    };
    
    // 引言
    if (contentJson.introduction) {
      total += countChineseInHTML(contentJson.introduction);
    }
    
    // 分論點
    if (contentJson.arguments && Array.isArray(contentJson.arguments)) {
      contentJson.arguments.forEach(arg => {
        if (arg.paragraphs && Array.isArray(arg.paragraphs)) {
          arg.paragraphs.forEach(para => {
            if (para.content) {
              total += countChineseInHTML(para.content);
            }
          });
        }
      });
    }
    
    // 結論
    if (contentJson.conclusion) {
      total += countChineseInHTML(contentJson.conclusion);
    }
    
    return total;
  }

  /**
   * 渲染練筆作品卡片
   */
  renderPracticeCard(essay) {
    const updatedAt = new Date(essay.updated_at);
    const createdAt = new Date(essay.created_at);
    const isNew = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000; // 24小時內

    return `
      <div class="student-assignment-card practice-card">
        <div class="card-header">
          <h3>
            ${essay.title || '未命名練筆'}
            ${isNew ? '<span class="new-badge">新</span>' : ''}
          </h3>
          <span class="status-badge practice">練筆</span>
        </div>

        <div class="card-meta">
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>最後編輯：${updatedAt.toLocaleDateString('zh-Hant-TW', { 
              month: 'long', 
              day: 'numeric' 
            })} ${updatedAt.toLocaleTimeString('zh-Hant-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
          ${essay.actualWordCount > 0 ? `
            <div class="meta-item">
              <i class="fas fa-file-word"></i>
              <span>已寫 ${essay.actualWordCount} 字</span>
            </div>
          ` : ''}
        </div>

        <div class="card-actions">
          <button class="btn-action continue-practice-btn edit" data-essay-id="${essay.id}">
            <i class="fas fa-edit"></i>
            繼續寫作
          </button>
          <button class="btn-action delete-practice-btn" data-essay-id="${essay.id}">
            <i class="fas fa-trash-alt"></i>
            刪除
          </button>
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
    // ✅ 刷新按鈕
    const refreshBtn = this.container.querySelector('#refresh-assignments-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        console.log('🔄 手動刷新任務列表...');
        refreshBtn.querySelector('i').classList.add('fa-spin');
        await this.loadAndRenderAssignments(false); // 強制刷新
        refreshBtn.querySelector('i').classList.remove('fa-spin');
      });
    }
    
    // 開始寫作/繼續寫作按鈕
    this.container.querySelectorAll('.student-assignment-card .start-btn, .student-assignment-card .continue-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-id');
        console.log('📝 開始寫作任務:', assignmentId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            assignmentId: assignmentId,
            mode: 'assignment',
            editable: true  // 可編輯
          }
        }));
      });
    });
    
    // 查看作業按鈕（只讀模式）
    this.container.querySelectorAll('.student-assignment-card .view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-id');
        console.log('👁️ 查看作業:', assignmentId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            assignmentId: assignmentId,
            mode: 'assignment',
            editable: false  // 只讀模式
          }
        }));
      });
    });
    
    // 撤回並編輯按鈕
    this.container.querySelectorAll('.student-assignment-card .withdraw-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-id');
        const essayId = e.currentTarget.getAttribute('data-essay-id');
        await this.withdrawSubmission(assignmentId, essayId);
      });
    });

    // 自主練筆按鈕（新建）
    const freeWritingBtn = this.container.querySelector('#free-writing-btn');
    if (freeWritingBtn) {
      freeWritingBtn.addEventListener('click', () => {
        console.log('✍️ 開始新的練筆');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            mode: 'free-writing',
            formatTemplate: 'honglou'
          }
        }));
      });
    }

    // 繼續練筆按鈕
    this.container.querySelectorAll('.continue-practice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const essayId = e.currentTarget.getAttribute('data-essay-id');
        console.log('✍️ 繼續練筆:', essayId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            mode: 'free-writing',
            essayId: essayId,  // 繼續編輯現有練筆
            formatTemplate: 'honglou'
          }
        }));
      });
    });

    // 刪除練筆按鈕
    this.container.querySelectorAll('.delete-practice-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const essayId = e.currentTarget.getAttribute('data-essay-id');
        await this.deletePracticeEssay(essayId);
      });
    });
  }

  /**
   * 撤回提交
   */
  async withdrawSubmission(assignmentId, essayId) {
    dialog.confirm({
      title: '確定要撤回提交嗎？',
      message: '撤回後作業將變回草稿狀態，您可以繼續編輯。<br><br>⚠️ 撤回後需要重新提交，請謹慎操作。',
      confirmText: '確定撤回',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          const { error } = await this.supabase
            .from('essays')
            .update({
              status: 'draft',
              submitted_at: null
            })
            .eq('id', essayId);

          if (error) throw error;

          console.log('✅ 作業已撤回');
          toast.success('作業已撤回，可以繼續編輯了！');
          
          // 刷新列表
          await this.loadAndRenderAssignments(false);
        } catch (error) {
          console.error('❌ 撤回失敗:', error);
          toast.error('撤回失敗：' + error.message);
        }
      }
    });
  }
  
  /**
   * 刪除練筆作品
   */
  deletePracticeEssay(essayId) {
    dialog.confirmDelete({
      message: '確定要刪除這篇練筆嗎？<br><br>此操作無法恢復。',
      onConfirm: async () => {
        try {
          const { error } = await this.supabase
            .from('essays')
            .delete()
            .eq('id', essayId);

          if (error) throw error;

          console.log('✅ 練筆已刪除');
          toast.success('練筆已刪除！');
          await this.loadAndRenderAssignments(false);
        } catch (error) {
          console.error('❌ 刪除練筆失敗:', error);
          toast.error('刪除失敗：' + error.message);
        }
      }
    });
  }

  /**
   * 渲染無班級狀態
   */
  renderNoClass() {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash text-gray-300"></i>
        <p class="text-gray-500 text-lg font-medium">您還沒有加入任何班級</p>
        <p class="text-gray-400 text-sm mt-2">請聯繫老師將您添加到班級</p>
        
        <!-- 自主練筆選項 -->
        <div class="mt-8">
          <p class="text-gray-600 text-sm mb-4">您也可以開始自主練筆</p>
          <button id="free-writing-btn-no-class" class="practice-writing-btn" style="padding: 0.875rem 1.5rem; font-size: 1rem;">
            <i class="fas fa-feather-alt"></i>
            開始自主練筆
          </button>
        </div>
      </div>
    `;

    // 綁定自主練筆按鈕
    const freeWritingBtn = this.container.querySelector('#free-writing-btn-no-class');
    if (freeWritingBtn) {
      freeWritingBtn.addEventListener('click', () => {
        console.log('✍️ 進入自主練筆模式（無班級）');
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            mode: 'free-writing',
            formatTemplate: 'honglou'
          }
        }));
      });
    }
  }
}

export default StudentAssignmentViewer;

