/**
 * 學生端批注查看器
 * 負責顯示老師的批注，支持學生回覆和創建批注
 */

import toast from '../ui/toast.js';

class StudentAnnotationViewer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.annotations = new Map(); // 存儲當前批注
    this.currentEssayId = null;
    this.currentParagraphId = null;
    this.isReadOnly = false; // 是否為只讀模式
    
    // 保存事件處理器引用
    this.boundHandleAnnotationClick = this.handleAnnotationClick.bind(this);
    this.boundHandleTextSelection = this.handleTextSelection.bind(this);
  }

  /**
   * 初始化學生端批注系統
   */
  async init(essayId, paragraphId, isReadOnly = false) {
    console.log('🚀 初始化學生端批注系統:', { essayId, paragraphId, isReadOnly });
    
    this.currentEssayId = essayId;
    this.currentParagraphId = paragraphId;
    this.isReadOnly = isReadOnly;
    
    // 加載現有批注
    await this.loadAnnotations();
    
    // 設置 Realtime 監聽
    this.setupRealtimeListener();
    
    // 如果不是只讀模式，啟用文本選擇
    if (!isReadOnly) {
      this.enableSelectionMode();
    }
    
    console.log('✅ 學生端批注系統初始化完成');
  }

  /**
   * 加載批注
   */
  async loadAnnotations() {
    try {
      console.log('📥 加載批注:', this.currentParagraphId);
      
      const { data: annotations, error } = await this.supabase
        .from('annotations')
        .select(`
          *,
          teacher:users!annotations_teacher_id_fkey(display_name, email)
        `)
        .eq('paragraph_id', this.currentParagraphId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ 加載批注失敗:', error);
        throw error;
      }

      console.log('📄 找到批注數量:', annotations.length);
      
      // 清空現有批注
      this.annotations.clear();
      
      // 存儲批注
      annotations.forEach(annotation => {
        this.annotations.set(annotation.id, annotation);
      });
      
      // 渲染批注
      this.renderAnnotations();
      
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('加載批注失敗: ' + error.message);
    }
  }

  /**
   * 渲染批注
   */
  renderAnnotations() {
    const container = document.getElementById('annotationsContainer');
    if (!container) {
      console.log('❌ 找不到批注容器');
      return;
    }

    // 清空容器
    container.innerHTML = '';

    if (this.annotations.size === 0) {
      container.innerHTML = `
        <div class="no-annotations">
          <i class="fas fa-comment-slash text-gray-400"></i>
          <p class="text-gray-500 text-sm">暫無批注</p>
        </div>
      `;
      return;
    }

    // 渲染每個批注
    this.annotations.forEach((annotation, id) => {
      this.renderAnnotation(annotation, container);
    });

    // 更新批注計數
    this.updateAnnotationCount();
  }

  /**
   * 渲染單個批注
   */
  renderAnnotation(annotation, container) {
    const annotationElement = document.createElement('div');
    annotationElement.className = 'annotation-item';
    annotationElement.dataset.annotationId = annotation.id;
    
    const isTeacher = annotation.teacher_id !== this.getCurrentUserId();
    const authorName = isTeacher ? 
      (annotation.teacher?.display_name || '老師') : 
      '我';
    
    annotationElement.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-author">
          <i class="fas ${isTeacher ? 'fa-chalkboard-teacher' : 'fa-user'}"></i>
          <span class="author-name">${authorName}</span>
          <span class="annotation-time">${this.formatTime(annotation.created_at)}</span>
        </div>
        <div class="annotation-actions">
          ${!this.isReadOnly ? `
            <button class="btn-reply" data-annotation-id="${annotation.id}">
              <i class="fas fa-reply"></i>
              回覆
            </button>
          ` : ''}
        </div>
      </div>
      <div class="annotation-content">
        <p>${this.escapeHtml(annotation.content)}</p>
      </div>
      <div class="annotation-replies" id="replies-${annotation.id}">
        <!-- 回覆將在這裡顯示 -->
      </div>
    `;

    container.appendChild(annotationElement);

    // 綁定回覆按鈕事件
    if (!this.isReadOnly) {
      const replyBtn = annotationElement.querySelector('.btn-reply');
      if (replyBtn) {
        replyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showReplyDialog(annotation.id);
        });
      }
    }
  }

  /**
   * 顯示回覆對話框
   */
  showReplyDialog(annotationId) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;

    // 創建回覆對話框
    const dialog = document.createElement('div');
    dialog.className = 'annotation-reply-dialog';
    dialog.innerHTML = `
      <div class="reply-dialog-content">
        <div class="reply-dialog-header">
          <h4>回覆批注</h4>
          <button class="btn-close-reply">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="reply-dialog-body">
          <div class="original-annotation">
            <strong>${annotation.teacher?.display_name || '老師'}:</strong>
            <p>${this.escapeHtml(annotation.content)}</p>
          </div>
          <div class="reply-input">
            <textarea placeholder="輸入您的回覆..." rows="3"></textarea>
          </div>
        </div>
        <div class="reply-dialog-footer">
          <button class="btn-cancel-reply">取消</button>
          <button class="btn-send-reply">發送回覆</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 綁定事件
    const closeBtn = dialog.querySelector('.btn-close-reply');
    const cancelBtn = dialog.querySelector('.btn-cancel-reply');
    const sendBtn = dialog.querySelector('.btn-send-reply');
    const textarea = dialog.querySelector('textarea');

    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    sendBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (content) {
        await this.createReply(annotationId, content);
        closeDialog();
      }
    });

    // 聚焦到輸入框
    textarea.focus();
  }

  /**
   * 創建回覆
   */
  async createReply(annotationId, content) {
    try {
      console.log('💬 創建回覆:', { annotationId, content });
      
      const { data, error } = await this.supabase
        .from('annotation_comments')
        .insert({
          annotation_id: annotationId,
          user_id: this.getCurrentUserId(),
          content: content
        })
        .select(`
          *,
          user:users!annotation_comments_user_id_fkey(display_name, email)
        `)
        .single();

      if (error) {
        console.error('❌ 創建回覆失敗:', error);
        throw error;
      }

      console.log('✅ 回覆創建成功:', data);
      toast.success('回覆已發送');
      
      // 重新加載批注以顯示新回覆
      await this.loadAnnotations();
      
    } catch (error) {
      console.error('❌ 創建回覆失敗:', error);
      toast.error('發送回覆失敗: ' + error.message);
    }
  }

  /**
   * 啟用文本選擇模式
   */
  enableSelectionMode() {
    console.log('🎯 啟用學生端文本選擇模式');
    document.body.classList.add('annotation-selection-mode');
    
    // 綁定文本選擇事件
    document.addEventListener('mouseup', this.boundHandleTextSelection);
    document.addEventListener('keyup', this.boundHandleTextSelection);
  }

  /**
   * 處理文本選擇
   */
  handleTextSelection(event) {
    if (this.isReadOnly) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      this.showAnnotationButton(event, selectedText);
    }
  }

  /**
   * 顯示批注按鈕
   */
  showAnnotationButton(event, selectedText) {
    // 移除現有的批注按鈕
    const existingBtn = document.querySelector('.annotation-button');
    if (existingBtn) {
      existingBtn.remove();
    }

    // 創建批注按鈕
    const button = document.createElement('button');
    button.className = 'annotation-button';
    button.innerHTML = '<i class="fas fa-comment"></i> 添加批注';
    
    // 設置位置
    const rect = event.target.getBoundingClientRect();
    button.style.position = 'absolute';
    button.style.left = `${event.clientX}px`;
    button.style.top = `${event.clientY - 40}px`;
    button.style.zIndex = '1000';
    
    document.body.appendChild(button);
    
    // 綁定點擊事件
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCreateAnnotationDialog(selectedText);
      button.remove();
    });
    
    // 點擊其他地方移除按鈕
    setTimeout(() => {
      document.addEventListener('click', () => {
        if (button.parentNode) {
          button.remove();
        }
      }, { once: true });
    }, 100);
  }

  /**
   * 顯示創建批注對話框
   */
  showCreateAnnotationDialog(selectedText) {
    const dialog = document.createElement('div');
    dialog.className = 'annotation-create-dialog';
    dialog.innerHTML = `
      <div class="create-dialog-content">
        <div class="create-dialog-header">
          <h4>添加批注</h4>
          <button class="btn-close-create">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="create-dialog-body">
          <div class="selected-text">
            <strong>選中文本:</strong>
            <p>"${this.escapeHtml(selectedText)}"</p>
          </div>
          <div class="annotation-input">
            <textarea placeholder="輸入您的批注..." rows="3"></textarea>
          </div>
        </div>
        <div class="create-dialog-footer">
          <button class="btn-cancel-create">取消</button>
          <button class="btn-send-create">發送批注</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 綁定事件
    const closeBtn = dialog.querySelector('.btn-close-create');
    const cancelBtn = dialog.querySelector('.btn-cancel-create');
    const sendBtn = dialog.querySelector('.btn-send-create');
    const textarea = dialog.querySelector('textarea');

    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    sendBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (content) {
        await this.createAnnotation(content, selectedText);
        closeDialog();
      }
    });

    // 聚焦到輸入框
    textarea.focus();
  }

  /**
   * 創建批注
   */
  async createAnnotation(content, selectedText) {
    try {
      console.log('📝 創建批注:', { content, selectedText });
      
      // 獲取選中文本的位置信息
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      
      const { data, error } = await this.supabase
        .from('annotations')
        .insert({
          paragraph_id: this.currentParagraphId,
          teacher_id: this.getCurrentUserId(), // 學生創建的批注也使用 teacher_id 字段
          content: content,
          annotation_type: 'comment',
          highlight_start: startOffset,
          highlight_end: endOffset,
          // 新增：文本片段錨定
          anchor_text: selectedText,
          anchor_context: this.getTextContext(selectedText, 50) // 前後50字符的上下文
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 創建批注失敗:', error);
        throw error;
      }

      console.log('✅ 批注創建成功:', data);
      toast.success('批注已發送');
      
      // 重新加載批注
      await this.loadAnnotations();
      
    } catch (error) {
      console.error('❌ 創建批注失敗:', error);
      toast.error('發送批注失敗: ' + error.message);
    }
  }

  /**
   * 獲取文本上下文
   */
  getTextContext(selectedText, contextLength = 50) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent;
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      
      const beforeText = text.substring(Math.max(0, startOffset - contextLength), startOffset);
      const afterText = text.substring(endOffset, Math.min(text.length, endOffset + contextLength));
      
      return {
        before: beforeText,
        after: afterText,
        full_text: text
      };
    }
    
    return {
      before: '',
      after: '',
      full_text: selectedText
    };
  }

  /**
   * 設置 Realtime 監聽
   */
  setupRealtimeListener() {
    // 監聽批注變化
    this.supabase
      .channel('student-annotations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'annotations',
        filter: `paragraph_id=eq.${this.currentParagraphId}`
      }, (payload) => {
        console.log('🔄 收到新批注:', payload.new);
        this.annotations.set(payload.new.id, payload.new);
        this.renderAnnotations();
        toast.info('收到新批注');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'annotations',
        filter: `paragraph_id=eq.${this.currentParagraphId}`
      }, (payload) => {
        console.log('🔄 批注已更新:', payload.new);
        this.annotations.set(payload.new.id, payload.new);
        this.renderAnnotations();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'annotations',
        filter: `paragraph_id=eq.${this.currentParagraphId}`
      }, (payload) => {
        console.log('🔄 批注已刪除:', payload.old);
        this.annotations.delete(payload.old.id);
        this.renderAnnotations();
      })
      .subscribe();
  }

  /**
   * 處理批注點擊事件
   */
  handleAnnotationClick(event) {
    const annotationMarker = event.target.closest('[data-annotation-id]');
    if (annotationMarker) {
      const annotationId = annotationMarker.dataset.annotationId;
      this.highlightAnnotationInSidebar(annotationId);
    }
  }

  /**
   * 在側邊欄高亮批注
   */
  highlightAnnotationInSidebar(annotationId) {
    // 移除其他高亮
    document.querySelectorAll('.annotation-item.highlighted').forEach(item => {
      item.classList.remove('highlighted');
    });
    
    // 高亮當前批注
    const annotationElement = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (annotationElement) {
      annotationElement.classList.add('highlighted');
      annotationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 更新批注計數
   */
  updateAnnotationCount() {
    const countElement = document.querySelector('.annotation-count');
    if (countElement) {
      countElement.textContent = `${this.annotations.size} 個批注`;
    }
  }

  /**
   * 獲取當前用戶 ID
   */
  getCurrentUserId() {
    // 這裡需要從全局狀態或認證系統獲取用戶 ID
    // 暫時返回 null，實際實現時需要從 AppState 或認證系統獲取
    return window.AppState?.currentUser?.id || null;
  }

  /**
   * 格式化時間
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分鐘內
      return '剛剛';
    } else if (diff < 3600000) { // 1小時內
      return `${Math.floor(diff / 60000)}分鐘前`;
    } else if (diff < 86400000) { // 1天內
      return `${Math.floor(diff / 3600000)}小時前`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * 轉義 HTML
   */
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 銷毀批注系統
   */
  destroy() {
    console.log('🗑️ 銷毀學生端批注系統');
    
    // 移除事件監聽器
    document.removeEventListener('mouseup', this.boundHandleTextSelection);
    document.removeEventListener('keyup', this.boundHandleTextSelection);
    document.removeEventListener('click', this.boundHandleAnnotationClick);
    
    // 清理批注
    this.annotations.clear();
  }
}

export default StudentAnnotationViewer;
