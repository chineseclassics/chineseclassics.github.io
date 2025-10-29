/**
 * 學生端任務列表查看器（精简版）
 */

import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';
import { getClassColorClass } from '../utils/class-color-utils.js';

// 使用全局 AppState，避免循環導入
const AppState = window.AppState;

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
            .select(`
              *,
              classes!class_id(
                id,
                class_name,
                description
              )
            `)
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
              const content = (typeof essay.content_json === 'string')
                ? JSON.parse(essay.content_json)
                : essay.content_json;
              actualWordCount = this.calculateWordCount(content);
            } catch (e) {
              console.warn('解析作業內容失敗:', e);
              actualWordCount = essay.total_word_count || 0;
            }
          }

          // 解析字數建議（若老師有設定）
          let wordTarget = null;
          try {
            const layout = assignment.editor_layout_json;
            const json = typeof layout === 'string' ? JSON.parse(layout) : layout;
            const primaryMetric = json?.primaryMetric || null;
            const targetCfg = primaryMetric ? (json?.targets?.[primaryMetric] || null) : null;
            if (primaryMetric && targetCfg && (typeof targetCfg.min === 'number' || typeof targetCfg.max === 'number')) {
              wordTarget = {
                metric: primaryMetric,
                min: typeof targetCfg.min === 'number' ? targetCfg.min : null,
                max: typeof targetCfg.max === 'number' ? targetCfg.max : null
              };
            }
          } catch (_) { /* ignore parse errors */ }

          return {
            ...assignment,
            studentEssay: essay,
            actualWordCount: actualWordCount,
            wordTarget
          };
        })
      );

      this.assignments = enrichedAssignments;
      
      // 5. 計算練筆作品的字數
      this.practiceEssays = this.practiceEssays.map(essay => {
        let wordCount = 0;
        if (essay.content_json) {
          try {
            const content = (typeof essay.content_json === 'string')
              ? JSON.parse(essay.content_json)
              : essay.content_json;
            wordCount = this.calculateWordCount(content);
          } catch (e) {
            wordCount = essay.total_word_count || 0;
          }
        }
        return { ...essay, actualWordCount: wordCount };
      });

      await this.renderAssignmentList();
    } catch (error) {
      console.error('加載任務失敗:', error);
      this.container.innerHTML = `<div class="error">加載失敗：${error.message}</div>`;
    }
  }

  /**
   * 渲染任務列表
   */
  async renderAssignmentList() {
    const hasAssignments = this.assignments.length > 0;
    const hasPractices = this.practiceEssays.length > 0;

    // 渲染所有卡片（支持 async）
    const assignmentCards = await Promise.all(
      this.assignments.map(a => this.renderAssignmentCard(a))
    );

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
                <button id="refresh-assignments-btn" class="text-sm text-stone-600 hover:text-stone-800 flex items-center gap-2">
                  <i class="fas fa-sync-alt"></i>
                  刷新
                </button>
              </div>
            </div>
            <div class="student-assignments-grid">
              ${assignmentCards.join('')}
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
  async renderAssignmentCard(assignment) {
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
    
    // 檢查是否有老師批注
    const hasAnnotations = essay ? await this.checkHasAnnotations(essay.id) : false;

    const classColorClass = assignment.classes ? getClassColorClass(assignment.classes.id) : 'class-1';
    
    // 構造建議區間顯示（若有）
    let targetMetaHtml = '';
    if (assignment.wordTarget) {
      const t = assignment.wordTarget;
      const label = t.metric === 'en_words' ? '英文詞數' : '中字數';
      let rangeText = '';
      if (typeof t.min === 'number' && typeof t.max === 'number') rangeText = `${t.min}–${t.max}`;
      else if (typeof t.min === 'number') rangeText = `≥ ${t.min}`;
      else if (typeof t.max === 'number') rangeText = `≤ ${t.max}`;
      if (rangeText) {
        targetMetaHtml = `
          <div class="meta-item">
            <i class="fas fa-bullseye"></i>
            <span>建議：${label} ${rangeText}</span>
          </div>
        `;
      }
    }
    
    return `
      <div class="student-assignment-card ${status.class} ${classColorClass}">
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
          ${assignment.classes ? `
            <div class="meta-item class-info">
              <i class="fas fa-users"></i>
              <span>班級：${this.escapeHtml(assignment.classes.class_name)}</span>
            </div>
          ` : ''}
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
          ${targetMetaHtml}
          ${essay && essay.submitted_at ? `
            <div class="meta-item">
              <i class="fas fa-check-circle text-emerald-600"></i>
              <span>已於 ${new Date(essay.submitted_at).toLocaleDateString('zh-Hant-TW', { 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} 提交</span>
            </div>
          ` : ''}
        </div>
        
        ${this.renderStatusNotice(essay, hasAnnotations)}

        <div class="card-actions">
          ${this.renderActionButtons(assignment, essay, canWithdraw, hasAnnotations)}
        </div>
      </div>
    `;
  }
  
  /**
   * 檢查論文是否有老師批注
   */
  async checkHasAnnotations(essayId) {
    try {
      // 查詢該論文的所有段落
      const { data: paragraphs } = await this.supabase
        .from('paragraphs')
        .select('id')
        .eq('essay_id', essayId);
      
      if (!paragraphs || paragraphs.length === 0) return false;
      
      const paragraphIds = paragraphs.map(p => p.id);
      const { data: annotations } = await this.supabase
        .from('annotations')
        .select('id')
        .in('paragraph_id', paragraphIds)
        .limit(1);
      
      return annotations && annotations.length > 0;
    } catch (error) {
      console.error('❌ 檢查批注失敗:', error);
      return false;
    }
  }

  /**
   * 渲染狀態提示
   */
  renderStatusNotice(essay, hasAnnotations) {
    if (!essay) return '';
    
    // 移除提交流程：僅在有批注時提示可依據批注繼續完善
    if (hasAnnotations) {
      return `
        <div class="submission-notice annotation-notice">
          <i class="fas fa-comment-dots text-blue-600"></i>
          <span>老師已添加批注，請根據批注繼續完善</span>
        </div>
      `;
    }
    
    if (essay.status === 'graded') {
      return `
        <div class="submission-notice graded-notice">
          <i class="fas fa-star text-amber-600"></i>
          <span>老師已批改，可查看評分和批注</span>
        </div>
      `;
    }
    
    return '';
  }

  /**
   * 渲染操作按鈕
   */
  renderActionButtons(assignment, essay, canWithdraw, hasAnnotations = false) {
    // 未開始
    if (!essay || !assignment.actualWordCount) {
      return `
        <button class="btn-action start-btn" data-id="${assignment.id}">
          <i class="fas fa-pen"></i>
          開始寫作
        </button>
      `;
    }
    
    // 草稿中（有內容）
    if (essay && essay.status === 'draft') {
      // 檢查是否有必填內容（標題、引言、結論）
      const hasContent = assignment.actualWordCount > 0;
      const canSubmit = hasContent; // 簡化檢查，實際提交時會做詳細驗證
      
      return `
        <button class="btn-action continue-btn edit" data-id="${assignment.id}">
          <i class="fas fa-edit"></i>
          繼續寫作
        </button>
      `;
    }
    
    // 已提交
    // 已提交（兼容舊數據）：一律提供繼續寫作
    if (essay && essay.status === 'submitted') {
      return `
        <button class="btn-action continue-btn edit" data-id="${assignment.id}">
          <i class="fas fa-edit"></i>
          繼續寫作
        </button>
      `;
    }
    
    // 已批改
    if (essay && essay.status === 'graded') {
      return `
        <button class="btn-action view-btn graded" data-id="${assignment.id}">
          <i class="fas fa-star"></i>
          查看評分和批注
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
    
    // 兼容舊數據：submitted 視為進行中

    return isOverdue
      ? { text: '進行中（已過期）', class: 'overdue' }
      : { text: '進行中', class: 'in-progress' };
  }

  /**
   * 移除所有事件監聽器
   */
  removeAllEventListeners() {
    // 只移除任務卡片中的按鈕，避免影響對話框
    const cardButtons = this.container.querySelectorAll('.student-assignment-card button');
    cardButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    // 先移除所有舊的事件監聽器
    this.removeAllEventListeners();
    
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
    
    // 已移除提交/撤回流程：不再綁定 submit/withdraw 事件

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
   * 提交作業（從卡片）
   */
  async submitAssignment(assignmentId, essayId) {
    try {
      console.log('🚀 開始提交作業流程...');
      console.log('📋 參數:', { assignmentId, essayId });
      
      // 0. 檢查認證狀態
      const { data: { user } } = await this.supabase.auth.getUser();
      console.log('🔐 當前認證用戶:', user?.id, user?.email);
      
      // 1. 獲取作業內容
      console.log('📄 正在獲取作業內容...');
      const { data: essay, error: fetchError } = await this.supabase
        .from('essays')
        .select('*')
        .eq('id', essayId)
        .single();
        
      if (fetchError) throw fetchError;
      
      if (!essay || !essay.content_json) {
        toast.error('找不到作業內容');
        return;
      }
      
      // 2. 解析內容並檢查
      const content = JSON.parse(essay.content_json);
      
      // 檢查標題
      if (!content.title || content.title.trim() === '') {
        toast.warning('請先填寫論文標題');
        return;
      }
      
      // 檢查引言
      if (!content.introduction || content.introduction.trim() === '' || content.introduction === '<p><br></p>') {
        toast.warning('請先完成引言部分');
        return;
      }
      
      // 檢查結論
      if (!content.conclusion || content.conclusion.trim() === '' || content.conclusion === '<p><br></p>') {
        toast.warning('請先完成結論部分');
        return;
      }
      
      // 3. 計算字數
      const wordCount = this.calculateWordCount(content);
      
      // 4. 最終確認（整合字數提醒）
      const argumentCount = content.arguments ? content.arguments.length : 0;
      const isLowWordCount = wordCount < 100;
      
      const confirmed = await new Promise(resolve => {
        dialog.confirm({
          title: '確定提交作業嗎？',
          message: `
            <div class="text-left">
              <p class="mb-2">📝 論文標題：${this.escapeHtml(content.title)}</p>
              <p class="mb-2">📊 總字數：${wordCount} 字</p>
              <p class="mb-4">📚 包含：引言、${argumentCount} 個分論點、結論</p>
              ${isLowWordCount ? 
                '<p class="text-amber-700 font-semibold mb-2">⚠️ 字數較少，建議繼續寫作後再提交</p>' : 
                ''
              }
              <p class="text-amber-700 font-semibold">⚠️ 提交後將無法修改，請確認已完成寫作</p>
            </div>
          `,
          confirmText: '確定提交',
          cancelText: '再檢查一下',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });
      
      if (!confirmed) return;
      
      // 6. 執行提交
      console.log('🚀 開始執行提交操作...');
      console.log('📝 更新參數:', {
        essayId,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      });
      
      const { data: updateResult, error: submitError } = await this.supabase
        .from('essays')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', essayId)
        .select();
        
      console.log('📊 更新結果:', updateResult);
      console.log('❌ 錯誤信息:', submitError);
        
      if (submitError) {
        console.error('❌ 數據庫更新失敗:', submitError);
        console.error('❌ 錯誤詳情:', {
          code: submitError.code,
          message: submitError.message,
          details: submitError.details,
          hint: submitError.hint
        });
        throw submitError;
      }
      
      console.log('✅ 更新結果:', updateResult);
      console.log('✅ 作業提交成功，狀態已更新為 submitted');
      
      // 7. 提交成功
      console.log('✅ 作業提交成功');
      toast.success('作業提交成功！<br>老師收到後會開始批改', 3000);
      
      // 8. 清除緩存並強制刷新列表
      const { AppState } = await import('../app.js');
      AppState.cache.assignmentsList = [];
      AppState.cache.lastRefreshTime = null;
      console.log('🗑️ 已清除任務列表緩存');
      
      // 9. 重新加載任務列表
      await this.loadAndRenderAssignments(false);
      
    } catch (error) {
      console.error('❌ 提交失敗:', error);
      toast.error('提交失敗：' + error.message);
    }
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
          
          // 清除緩存並強制刷新列表
          const { AppState } = await import('../app.js');
          AppState.cache.assignmentsList = [];
          AppState.cache.lastRefreshTime = null;
          console.log('🗑️ 已清除任務列表緩存');
          
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

