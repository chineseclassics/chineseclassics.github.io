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
    this.practiceEssays = [];  // 存儲練筆作品
    await this.loadAndRenderAssignments();
  }

  /**
   * 加載并渲染任務
   */
  async loadAndRenderAssignments() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
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

      // 4. 如果既沒有班級也沒有練筆作品，顯示空狀態
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
              </div>
            </div>
            <div class="student-assignments-grid">
              ${this.assignments.map(a => this.renderAssignmentCard(a)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 我的練筆 -->
        <div class="practice-section ${hasAssignments ? 'mt-12' : ''}">
          <div class="list-header">
            <h2><i class="fas fa-feather-alt"></i> 我的練筆</h2>
            <button id="free-writing-btn" class="btn-action start-btn" style="padding: 0.625rem 1.25rem; font-size: 0.9rem;">
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
        </div>

        <div class="card-actions">
          ${essay || assignment.actualWordCount > 0
            ? `<button class="btn-action continue-btn ${essay && essay.status === 'submitted' ? 'view' : 'edit'}" data-id="${assignment.id}">
                <i class="fas ${essay && essay.status === 'submitted' ? 'fa-eye' : 'fa-edit'}"></i>
                ${essay && essay.status === 'submitted' ? '查看作業' : '繼續寫作'}
              </button>`
            : `<button class="btn-action start-btn" data-id="${assignment.id}">
                <i class="fas fa-pen"></i>
                開始寫作
              </button>`
          }
        </div>
      </div>
    `;
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
    // 任務寫作按鈕
    this.container.querySelectorAll('.student-assignment-card .start-btn, .student-assignment-card .continue-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.currentTarget.getAttribute('data-id');
        console.log('📝 開始寫作任務:', assignmentId);
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { 
            page: 'essay-writer', 
            assignmentId: assignmentId,
            mode: 'assignment'  // ✅ 明確指定這是任務寫作模式
          }
        }));
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
   * 刪除練筆作品
   */
  async deletePracticeEssay(essayId) {
    if (!confirm('確定要刪除這篇練筆嗎？此操作無法恢復。')) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('essays')
        .delete()
        .eq('id', essayId);

      if (error) throw error;

      console.log('✅ 練筆已刪除');
      
      // 重新加載列表
      await this.loadAndRenderAssignments();
    } catch (error) {
      console.error('❌ 刪除練筆失敗:', error);
      alert('刪除失敗：' + error.message);
    }
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
          <button id="free-writing-btn-no-class" class="btn-action start-btn" style="padding: 0.875rem 1.5rem; font-size: 1rem;">
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

