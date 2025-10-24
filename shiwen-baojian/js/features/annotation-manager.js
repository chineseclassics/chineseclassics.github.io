/**
 * 批注管理器 - 核心批注功能
 * 負責文本選擇、高亮、批注 CRUD 操作
 */

import toast from '../ui/toast.js';

class AnnotationManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.annotations = new Map(); // 存儲當前批注
    this.selectedText = null;
    this.isSelectionMode = false;
    this.currentEssayId = null;
    this.currentParagraphId = null;
    
    // 保存事件處理器引用
    this.boundHandleTextSelection = this.handleTextSelection.bind(this);
    this.boundHandleAnnotationClick = this.handleAnnotationClick.bind(this);
    
    // 綁定事件
    this.bindEvents();
  }

  /**
   * 初始化批注系統
   */
  async init(essayId, paragraphId) {
    console.log('🚀 初始化批注系統:', { essayId, paragraphId });
    
    this.currentEssayId = essayId;
    this.currentParagraphId = paragraphId;
    
    // 加載現有批注
    await this.loadAnnotations();
    
    // 啟用文本選擇模式
    this.enableSelectionMode();
    
    // 設置 Realtime 監聽
    this.setupRealtimeListener();
    
    console.log('✅ 批注系統初始化完成');
  }

  /**
   * 綁定事件監聽器
   */
  bindEvents() {
    console.log('🔗 綁定批注系統事件監聽器');
    
    // 文本選擇事件
    document.addEventListener('mouseup', this.boundHandleTextSelection);
    document.addEventListener('keyup', this.boundHandleTextSelection);
    
    // 批注彈出框事件
    document.addEventListener('click', this.boundHandleAnnotationClick);
    
    console.log('✅ 事件監聽器已綁定');
  }

  /**
   * 處理批注點擊事件
   */
  handleAnnotationClick(event) {
    // 檢查是否點擊了批注標記
    const annotationMarker = event.target.closest('[data-annotation-id]');
    if (annotationMarker) {
      const annotationId = annotationMarker.dataset.annotationId;
      this.showAnnotationPopup(annotationId, annotationMarker);
    }
  }

  /**
   * 啟用文本選擇模式
   */
  enableSelectionMode() {
    console.log('🎯 啟用文本選擇模式');
    this.isSelectionMode = true;
    document.body.classList.add('annotation-selection-mode');
    
    // 添加選擇提示
    this.showSelectionHint();
    
    console.log('✅ 文本選擇模式已啟用');
  }

  /**
   * 禁用文本選擇模式
   */
  disableSelectionMode() {
    this.isSelectionMode = false;
    document.body.classList.remove('annotation-selection-mode');
    
    // 清除選擇提示
    this.hideSelectionHint();
  }

  /**
   * 處理文本選擇
   */
  handleTextSelection(event) {
    console.log('🔍 處理文本選擇:', {
      isSelectionMode: this.isSelectionMode,
      event: event.type,
      target: event.target
    });
    
    if (!this.isSelectionMode) {
      console.log('❌ 批注模式未啟用');
      return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('📝 選擇的文本:', selectedText);
    
    if (selectedText.length > 0) {
      this.selectedText = {
        text: selectedText,
        range: selection.getRangeAt(0),
        startOffset: selection.anchorOffset,
        endOffset: selection.focusOffset
      };
      
      console.log('✅ 文本選擇完成，顯示批注按鈕');
      // 顯示批注按鈕
      this.showAnnotationButton(event);
    } else {
      console.log('❌ 沒有選擇文本，隱藏批注按鈕');
      this.hideAnnotationButton();
    }
  }

  /**
   * 顯示批注按鈕
   */
  showAnnotationButton(event) {
    console.log('🎯 顯示批注按鈕:', event);
    
    // 移除現有按鈕
    this.hideAnnotationButton();
    
    // 創建批注按鈕
    const button = document.createElement('button');
    button.className = 'annotation-button';
    button.innerHTML = '📝 添加批注';
    button.style.cssText = `
      position: absolute;
      z-index: 1000;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      left: ${event.pageX + 10}px;
      top: ${event.pageY - 40}px;
    `;
    
    button.addEventListener('click', (e) => {
      console.log('🖱️ 批注按鈕被點擊');
      e.stopPropagation();
      this.createAnnotation();
    });
    
    document.body.appendChild(button);
    this.annotationButton = button;
    
    console.log('✅ 批注按鈕已添加到頁面');
  }

  /**
   * 隱藏批注按鈕
   */
  hideAnnotationButton() {
    if (this.annotationButton) {
      this.annotationButton.remove();
      this.annotationButton = null;
    }
  }

  /**
   * 創建批注
   */
  async createAnnotation() {
    console.log('📝 開始創建批注:', this.selectedText);
    
    if (!this.selectedText) {
      console.log('❌ 沒有選擇的文本');
      return;
    }
    
    // 顯示批注創建對話框
    const content = await this.showAnnotationDialog();
    if (!content) {
      console.log('❌ 用戶取消了批注創建');
      return;
    }
    
    console.log('✅ 批注內容:', content);
    
    try {
      // 調用 RPC 函數創建批注
      const { data, error } = await this.supabase.rpc('create_annotation', {
        p_paragraph_id: this.currentParagraphId,
        p_content: content,
        p_highlight_start: this.selectedText.startOffset,
        p_highlight_end: this.selectedText.endOffset,
        p_annotation_type: 'comment',
        p_priority: 'normal',
        p_is_private: false
      });
      
      if (error) throw error;
      
      // 添加批注到本地存儲
      this.annotations.set(data, {
        id: data,
        paragraph_id: this.currentParagraphId,
        content: content,
        highlight_start: this.selectedText.startOffset,
        highlight_end: this.selectedText.endOffset,
        annotation_type: 'comment',
        priority: 'normal',
        is_private: false,
        created_at: new Date().toISOString()
      });
      
      // 渲染批注高亮
      this.renderAnnotationHighlight(data);
      
      // 清除選擇
      window.getSelection().removeAllRanges();
      this.selectedText = null;
      this.hideAnnotationButton();
      
      toast.success('批注已添加');
      
    } catch (error) {
      console.error('❌ 創建批注失敗:', error);
      toast.error('創建批注失敗: ' + error.message);
    }
  }

  /**
   * 顯示批注對話框
   */
  async showAnnotationDialog(defaultContent = '') {
    console.log('💬 顯示批注對話框:', defaultContent);
    
    return new Promise((resolve) => {
      // 創建對話框
      const dialog = document.createElement('div');
      dialog.className = 'annotation-dialog';
      dialog.innerHTML = `
        <div class="annotation-dialog-content">
          <h3>${defaultContent ? '編輯批注' : '添加批注'}</h3>
          <div class="annotation-dialog-body">
            <label>批注內容：</label>
            <textarea id="annotation-content" placeholder="請輸入批注內容..." rows="4">${defaultContent}</textarea>
            <div class="annotation-dialog-actions">
              <button id="annotation-cancel" class="btn-secondary">取消</button>
              <button id="annotation-save" class="btn-primary">保存</button>
            </div>
          </div>
        </div>
      `;
      
      // 添加樣式
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const content = dialog.querySelector('.annotation-dialog-content');
      content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
      `;
      
      document.body.appendChild(dialog);
      
      // 綁定事件
      dialog.querySelector('#annotation-cancel').addEventListener('click', () => {
        console.log('❌ 用戶取消批注');
        dialog.remove();
        resolve(null);
      });
      
      dialog.querySelector('#annotation-save').addEventListener('click', () => {
        const content = dialog.querySelector('#annotation-content').value.trim();
        console.log('💾 用戶保存批注:', content);
        dialog.remove();
        resolve(content);
      });
      
      // 自動聚焦到文本框
      dialog.querySelector('#annotation-content').focus();
    });
  }

  /**
   * 渲染批注高亮
   */
  renderAnnotationHighlight(annotationId) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;
    
    // 創建高亮元素
    const highlight = document.createElement('span');
    highlight.className = 'annotation-highlight';
    highlight.dataset.annotationId = annotationId;
    highlight.style.cssText = `
      background-color: #fef3c7;
      border-bottom: 2px solid #f59e0b;
      cursor: pointer;
      position: relative;
    `;
    
    // 簡化實現：在論文內容區域添加標記
    const essayViewer = document.getElementById('essayViewer');
    if (essayViewer) {
      const marker = document.createElement('span');
      marker.className = 'annotation-marker';
      marker.dataset.annotationId = annotationId;
      marker.innerHTML = `📝`;
      marker.style.cssText = `
        color: #f59e0b;
        cursor: pointer;
        margin-left: 4px;
        display: inline-block;
      `;
      
      // 在論文內容區域的末尾添加標記
      essayViewer.appendChild(marker);
      
      // 綁定點擊事件
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showAnnotationPopup(annotationId, marker);
      });
    }
  }

  /**
   * 顯示批注彈出框
   */
  showAnnotationPopup(annotationId, triggerElement) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;
    
    // 移除現有彈出框
    this.hideAnnotationPopup();
    
    // 創建彈出框
    const popup = document.createElement('div');
    popup.className = 'annotation-popup';
    popup.dataset.annotationId = annotationId;
    popup.innerHTML = `
      <div class="annotation-popup-content">
        <div class="annotation-popup-header">
          <span class="annotation-type">📝 批注</span>
          <button class="annotation-close">×</button>
        </div>
        <div class="annotation-popup-body">
          <p>${annotation.content}</p>
          <div class="annotation-popup-actions">
            <button class="btn-small btn-secondary edit-annotation-btn" data-annotation-id="${annotationId}">編輯</button>
            <button class="btn-small btn-danger delete-annotation-btn" data-annotation-id="${annotationId}">刪除</button>
          </div>
        </div>
      </div>
    `;
    
    // 定位彈出框
    const rect = triggerElement.getBoundingClientRect();
    popup.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.bottom + 5}px;
      z-index: 1500;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
    `;
    
    document.body.appendChild(popup);
    this.annotationPopup = popup;
    
    // 綁定關閉事件
    popup.querySelector('.annotation-close').addEventListener('click', () => {
      this.hideAnnotationPopup();
    });
    
    // 綁定編輯和刪除按鈕事件
    popup.querySelector('.edit-annotation-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.editAnnotation(annotationId);
    });
    
    popup.querySelector('.delete-annotation-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAnnotation(annotationId);
    });
    
    // 點擊外部關閉
    document.addEventListener('click', (e) => {
      if (!popup.contains(e.target) && !triggerElement.contains(e.target)) {
        this.hideAnnotationPopup();
      }
    });
  }

  /**
   * 隱藏批注彈出框
   */
  hideAnnotationPopup() {
    if (this.annotationPopup) {
      this.annotationPopup.remove();
      this.annotationPopup = null;
    }
  }

  /**
   * 編輯批注
   */
  async editAnnotation(annotationId) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;
    
    const newContent = await this.showAnnotationDialog(annotation.content);
    if (!newContent || newContent === annotation.content) return;
    
    try {
      const { error } = await this.supabase.rpc('update_annotation', {
        p_annotation_id: annotationId,
        p_content: newContent
      });
      
      if (error) throw error;
      
      // 更新本地存儲
      annotation.content = newContent;
      annotation.updated_at = new Date().toISOString();
      
      // 更新彈出框內容
      if (this.annotationPopup && this.annotationPopup.dataset.annotationId === annotationId) {
        this.annotationPopup.querySelector('.annotation-popup-body p').textContent = newContent;
      }
      
      toast.success('批注已更新');
      
    } catch (error) {
      console.error('❌ 更新批注失敗:', error);
      toast.error('更新批注失敗: ' + error.message);
    }
  }

  /**
   * 刪除批注
   */
  async deleteAnnotation(annotationId) {
    if (!confirm('確定要刪除這個批注嗎？')) return;
    
    try {
      const { error } = await this.supabase.rpc('delete_annotation', {
        p_annotation_id: annotationId
      });
      
      if (error) throw error;
      
      // 從本地存儲移除
      this.annotations.delete(annotationId);
      
      // 移除高亮和標記
      const markers = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
      markers.forEach(marker => marker.remove());
      
      // 關閉彈出框
      this.hideAnnotationPopup();
      
      toast.success('批注已刪除');
      
    } catch (error) {
      console.error('❌ 刪除批注失敗:', error);
      toast.error('刪除批注失敗: ' + error.message);
    }
  }

  /**
   * 加載現有批注
   */
  async loadAnnotations() {
    console.log('📥 加載現有批注:', this.currentParagraphId);
    
    try {
      const { data, error } = await this.supabase.rpc('get_paragraph_annotations', {
        p_paragraph_id: this.currentParagraphId
      });
      
      if (error) {
        console.error('❌ RPC 調用失敗:', error);
        throw error;
      }
      
      console.log('📊 批注數據:', data);
      
      // 存儲批注
      data.forEach(annotation => {
        this.annotations.set(annotation.id, annotation);
        this.renderAnnotationHighlight(annotation.id);
      });
      
      console.log(`✅ 已加載 ${data.length} 個批注`);
      
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('加載批注失敗: ' + error.message);
    }
  }

  /**
   * 設置 Realtime 監聽
   */
  setupRealtimeListener() {
    // 監聽批注變化
    this.supabase
      .channel('annotations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'annotations',
        filter: `paragraph_id=eq.${this.currentParagraphId}`
      }, (payload) => {
        console.log('🔄 收到新批注:', payload.new);
        this.annotations.set(payload.new.id, payload.new);
        this.renderAnnotationHighlight(payload.new.id);
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
        // 更新現有高亮
        this.updateAnnotationHighlight(payload.new.id);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'annotations',
        filter: `paragraph_id=eq.${this.currentParagraphId}`
      }, (payload) => {
        console.log('🔄 批注已刪除:', payload.old);
        this.annotations.delete(payload.old.id);
        // 移除高亮
        const markers = document.querySelectorAll(`[data-annotation-id="${payload.old.id}"]`);
        markers.forEach(marker => marker.remove());
      })
      .subscribe();
  }

  /**
   * 更新批注高亮
   */
  updateAnnotationHighlight(annotationId) {
    // 重新渲染高亮
    const markers = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
    markers.forEach(marker => marker.remove());
    this.renderAnnotationHighlight(annotationId);
  }

  /**
   * 顯示選擇提示
   */
  showSelectionHint() {
    const hint = document.createElement('div');
    hint.className = 'annotation-selection-hint';
    hint.innerHTML = '💡 選擇文本後點擊「添加批注」按鈕來創建批注';
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
    `;
    
    document.body.appendChild(hint);
    this.selectionHint = hint;
    
    // 3秒後自動隱藏
    setTimeout(() => {
      this.hideSelectionHint();
    }, 3000);
  }

  /**
   * 隱藏選擇提示
   */
  hideSelectionHint() {
    if (this.selectionHint) {
      this.selectionHint.remove();
      this.selectionHint = null;
    }
  }

  /**
   * 銷毀批注管理器
   */
  destroy() {
    this.disableSelectionMode();
    this.hideAnnotationButton();
    this.hideAnnotationPopup();
    this.hideSelectionHint();
    
    // 移除事件監聽器
    document.removeEventListener('mouseup', this.boundHandleTextSelection);
    document.removeEventListener('keyup', this.boundHandleTextSelection);
    document.removeEventListener('click', this.boundHandleAnnotationClick);
  }
}

export default AnnotationManager;
