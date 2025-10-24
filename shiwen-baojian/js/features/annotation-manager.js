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

  // 設計令牌常量配置
  static CONSTANTS = {
    // 顏色（使用設計令牌）
    HIGHLIGHT_BG: 'var(--warning-100)',        // 秋香淺背景
    HIGHLIGHT_BORDER: 'var(--warning-600)',    // 秋香中
    HIGHLIGHT_TEMP: 'var(--warning-200)',      // 極淺秋香
    BUTTON_BG: 'var(--primary-600)',           // 青灰主色
    BUTTON_TEXT: 'var(--text-inverse)',        // 白色文字
    
    // 時長
    TEMP_HIGHLIGHT_DURATION: 2000,              // 臨時高亮持續時間
    
    // 尺寸
    ANNOTATION_WIDTH: '280px',
    BUTTON_PADDING: '8px 12px',
    
    // Z-index
    BUTTON_Z_INDEX: '1000',
    ANNOTATION_Z_INDEX: '1001',
    
    // 動畫
    SCROLL_BEHAVIOR: 'smooth',
    SCROLL_BLOCK: 'center'
  };

  /**
   * 初始化批注系統
   */
  async init(essayId, paragraphId) {
    // 防止重複初始化
    if (this.isInitialized) {
      console.log('ℹ️ 批注系統已初始化，跳過重複初始化');
      return;
    }
    
    console.log('🚀 初始化批注系統:', { essayId, paragraphId });
    
    this.currentEssayId = essayId;
    this.currentParagraphId = paragraphId;
    
    // 加載現有批注
    await this.loadAnnotations();
    
    // 啟用文本選擇模式
    this.enableSelectionMode();
    
    // 設置 Realtime 監聽
    this.setupRealtimeListener();
    
    this.isInitialized = true;
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
      // 直接高亮對應的批注，不再使用彈窗
      this.highlightAnnotation(annotationId);
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
    if (!this.isSelectionMode) {
      return;
    }
    
    // 如果點擊的是批注按鈕，不處理
    if (event.target.classList.contains('annotation-button')) {
      return;
    }
    
    // 如果點擊的是批注對話框內的元素，不處理
    if (event.target.closest('.annotation-dialog') || event.target.closest('.floating-annotation-input')) {
      return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
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
      z-index: ${AnnotationManager.CONSTANTS.BUTTON_Z_INDEX};
      background: ${AnnotationManager.CONSTANTS.BUTTON_BG};
      color: ${AnnotationManager.CONSTANTS.BUTTON_TEXT};
      border: none;
      padding: ${AnnotationManager.CONSTANTS.BUTTON_PADDING};
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      left: ${event.pageX + 10}px;
      top: ${event.pageY - 40}px;
    `;
    
    button.addEventListener('click', (e) => {
      console.log('🖱️ 批注按鈕被點擊');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.createAnnotation();
    });
    
    // 添加 mousedown 事件防止文本選擇干擾
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.body.appendChild(button);
    this.annotationButton = button;
    
    console.log('✅ 批注按鈕已添加到頁面');
    console.log('🔍 按鈕元素:', button);
    console.log('🔍 按鈕位置:', {
      left: button.style.left,
      top: button.style.top,
      display: button.style.display
    });
  }

  /**
   * 隱藏批注按鈕
   */
  hideAnnotationButton() {
    if (this.annotationButton) {
      console.log('🗑️ 移除批注按鈕');
      this.annotationButton.remove();
      this.annotationButton = null;
    }
  }

  /**
   * 立即高亮選中的文字
   */
  highlightSelectedText() {
    if (!this.selectedText || !this.selectedRange) return;
    
    try {
      // 創建高亮元素
      const highlight = document.createElement('span');
      highlight.className = 'annotation-highlight';
      highlight.style.cssText = `
        background-color: ${AnnotationManager.CONSTANTS.HIGHLIGHT_BG};
        border-bottom: 2px solid ${AnnotationManager.CONSTANTS.HIGHLIGHT_BORDER};
        padding: 1px 2px;
        border-radius: 2px;
        position: relative;
        z-index: 1;
      `;
      
      // 用高亮元素包圍選中的文字
      this.selectedRange.surroundContents(highlight);
      
      console.log('✅ 文字已立即高亮');
    } catch (error) {
      console.log('⚠️ 無法立即高亮文字:', error);
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
    
    // 隱藏批注按鈕
    this.hideAnnotationButton();
    
    // 立即高亮選中的文字
    this.highlightSelectedText();
    
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
      
      // 渲染批注
      this.renderAnnotation(data.id);
      
      // 清除選擇
      window.getSelection().removeAllRanges();
      this.selectedText = null;
      this.hideAnnotationButton();
      
      console.log('✅ 批注創建成功，ID:', data);
      
      // 顯示成功提示
      if (typeof toast !== 'undefined') {
        toast.success('批注已添加');
      }
      
    } catch (error) {
      console.error('❌ 創建批注失敗:', error);
      if (typeof toast !== 'undefined') {
        toast.error('創建批注失敗: ' + error.message);
      }
    }
  }

  /**
   * 顯示批注對話框
   */
  async showAnnotationDialog(defaultContent = '') {
    console.log('💬 顯示批注對話框:', defaultContent);
    
    return new Promise((resolve) => {
      // 獲取右側批注容器
      const annotationsContainer = document.getElementById('annotationsContainer');
      if (!annotationsContainer) {
        console.error('❌ 找不到批注容器');
        resolve(null);
        return;
      }

      // 計算輸入框位置
      let inputTop = 0;
      if (this.selectedText && this.selectedText.range) {
        const rect = this.selectedText.range.getBoundingClientRect();
        const essayViewer = document.getElementById('essayViewer');
        const essayRect = essayViewer.getBoundingClientRect();
        
        // 計算相對於原文容器的位置
        inputTop = rect.top - essayRect.top;
      }

      // 創建浮動輸入框
      const inputBox = document.createElement('div');
      inputBox.className = 'floating-annotation-input';
      inputBox.style.top = inputTop + 'px';

      inputBox.innerHTML = `
        <div class="annotation-input-header">
          <div class="annotation-input-avatar">${this.getUserInitials()}</div>
          <div class="annotation-input-author">${this.getCurrentUserName()}</div>
        </div>
        <textarea 
          class="annotation-input-content"
          placeholder="添加批注..."
          rows="3"
        >${defaultContent}</textarea>
        <div class="annotation-input-actions">
          <button class="annotation-input-btn cancel">取消</button>
          <button class="annotation-input-btn submit">留言</button>
        </div>
      `;
      
      // 添加到右側批注容器
      annotationsContainer.appendChild(inputBox);
      
      // 綁定事件
      const cancelBtn = inputBox.querySelector('.cancel');
      const submitBtn = inputBox.querySelector('.submit');
      const textarea = inputBox.querySelector('.annotation-input-content');
      
      const cleanup = () => {
        if (inputBox.parentNode) {
          inputBox.parentNode.removeChild(inputBox);
        }
      };
      
      cancelBtn.addEventListener('click', () => {
        console.log('❌ 用戶取消批注');
        cleanup();
        resolve(null);
      });
      
      submitBtn.addEventListener('click', () => {
        const content = textarea.value.trim();
        console.log('💾 用戶保存批注:', content);
        cleanup();
        resolve(content);
      });
      
      // 自動聚焦到文本框
      textarea.focus();
    });
  }

  /**
   * 獲取用戶姓名首字母
   */
  getUserInitials() {
    // 這裡可以從用戶信息中獲取，暫時使用默認值
    return 'Y';
  }

  /**
   * 獲取當前用戶姓名
   */
  getCurrentUserName() {
    // 這裡可以從用戶信息中獲取，暫時使用默認值
    return 'Yulong ZHANG';
  }

  /**
   * 渲染批注（統一入口）
   */
  renderAnnotation(annotationId) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      console.log('❌ 批注不存在:', annotationId);
      return;
    }
    
    console.log('🎨 渲染批注:', annotation);
    
    // 檢查是否已經渲染過這個批注
    const existingMarker = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (existingMarker) {
      console.log('ℹ️ 批注已存在，跳過重複渲染');
      return;
    }
    
    // 1. 在原文中高亮文本
    this.highlightTextInEssay(annotationId, annotation);
    
    // 2. 在右側創建浮動批注
    setTimeout(() => {
      this.createFloatingAnnotation(annotationId, annotation);
    }, 100);
  }


  /**
   * 創建浮動批注（Google Docs 風格 - 跟隨原文滾動）
   */
  createFloatingAnnotation(annotationId, annotation) {
    // 獲取右側批注容器
    const annotationsContainer = document.querySelector('.annotations-container');
    if (!annotationsContainer) {
      console.log('❌ 找不到批注容器');
      return;
    }

    // 找到對應的高亮元素
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (!highlight) {
      console.log('❌ 找不到對應的高亮元素');
      return;
    }

    // 計算批註位置（相對於批註容器頂部）
    const essayViewer = document.getElementById('essayViewer');
    const highlightRect = highlight.getBoundingClientRect();
    const essayRect = essayViewer.getBoundingClientRect();
    const highlightTop = highlightRect.top - essayRect.top;
    
    // 創建浮動批注容器
    const floatingAnnotation = document.createElement('div');
    floatingAnnotation.className = 'floating-annotation';
    floatingAnnotation.dataset.annotationId = annotationId;
    floatingAnnotation.style.top = highlightTop + 'px';

    // 批注內容
    floatingAnnotation.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-avatar">${this.getUserInitials()}</div>
        <div class="annotation-author">${this.getCurrentUserName()}</div>
        <div class="annotation-time">${this.formatTime(annotation.created_at)}</div>
      </div>
      <div class="annotation-content">${annotation.content}</div>
      <div class="annotation-actions">
        <button class="annotation-action-btn edit" data-annotation-id="${annotationId}">編輯</button>
        <button class="annotation-action-btn delete" data-annotation-id="${annotationId}">刪除</button>
      </div>
    `;

    // 添加到右側批注容器中
    annotationsContainer.appendChild(floatingAnnotation);
    console.log('✅ 批注元素已添加到容器中');
    console.log('📍 批注位置:', highlightTop, 'px');

    // 綁定事件
    floatingAnnotation.addEventListener('click', (e) => {
      if (e.target.classList.contains('annotation-action-btn')) return;
      this.highlightAnnotationInText(annotationId);
    });

    // 編輯按鈕
    const editBtn = floatingAnnotation.querySelector('.edit');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editAnnotation(annotationId);
    });

    // 刪除按鈕
    const deleteBtn = floatingAnnotation.querySelector('.delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAnnotation(annotationId);
    });

    // 點擊高亮文本時高亮對應批注
    highlight.addEventListener('click', () => {
      this.highlightAnnotation(annotationId);
    });

    // 初始狀態顯示
    floatingAnnotation.style.display = 'block';
    console.log('✅ 批注已設置為顯示狀態');
  }

  /**
   * 臨時高亮原文文本
   */
  highlightTextTemporarily(annotationId) {
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (highlight) {
      highlight.scrollIntoView({ 
        behavior: AnnotationManager.CONSTANTS.SCROLL_BEHAVIOR, 
        block: AnnotationManager.CONSTANTS.SCROLL_BLOCK 
      });
      highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_TEMP;
      setTimeout(() => {
        highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_BG;
      }, AnnotationManager.CONSTANTS.TEMP_HIGHLIGHT_DURATION);
    }
  }

  /**
   * 高亮批注（統一方法）
   */
  highlightAnnotation(annotationId) {
    // 確保所有批注都顯示
    document.querySelectorAll('.floating-annotation').forEach(ann => {
      ann.style.display = 'block';
      ann.classList.remove('active');
    });

    // 為當前批注添加 active 狀態
    const floatingAnnotation = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
    if (floatingAnnotation) {
      floatingAnnotation.classList.add('active');
      floatingAnnotation.style.display = 'block';
      
      // 滾動批註到視窗中央
      const wrapper = document.querySelector('.grading-content-wrapper');
      if (wrapper) {
        const annotationRect = floatingAnnotation.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const currentScrollTop = wrapper.scrollTop;
        const annotationTop = annotationRect.top - wrapperRect.top + currentScrollTop;
        const wrapperHeight = wrapper.clientHeight;
        const scrollTo = annotationTop - (wrapperHeight / 2) + (floatingAnnotation.offsetHeight / 2);
        
        wrapper.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }

    // 臨時高亮原文文本
    this.highlightTextTemporarily(annotationId);
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
      return date.toLocaleDateString('zh-TW');
    }
  }

  /**
   * 更新批注計數
   */
  updateAnnotationCount() {
    const countElement = document.querySelector('.annotation-count');
    if (countElement) {
      const count = this.annotations.size;
      countElement.textContent = `${count} 個批注`;
    }
  }

  /**
   * 高亮側邊欄中的批注
   */
  highlightAnnotationInText(annotationId) {
    // 移除所有高亮
    document.querySelectorAll('.annotation-item.active').forEach(item => {
      item.classList.remove('active');
    });

    // 高亮當前批注
    const annotationItem = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (annotationItem) {
      annotationItem.classList.add('active');
    }

    // 滾動原文到視窗中央
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (highlight) {
      const wrapper = document.querySelector('.grading-content-wrapper');
      if (wrapper) {
        const highlightRect = highlight.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const currentScrollTop = wrapper.scrollTop;
        const highlightTop = highlightRect.top - wrapperRect.top + currentScrollTop;
        const wrapperHeight = wrapper.clientHeight;
        const scrollTo = highlightTop - (wrapperHeight / 2) + (highlight.offsetHeight / 2);
        
        wrapper.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }

    // 臨時高亮原文文本
    this.highlightTextTemporarily(annotationId);
  }

  /**
   * 在論文中高亮文本
   */
  highlightTextInEssay(annotationId, annotation) {
    const essayViewer = document.getElementById('essayViewer');
    if (!essayViewer) {
      console.log('❌ 找不到論文內容區域');
      return;
    }

    // 獲取論文內容的文本節點
    const textNodes = this.getTextNodes(essayViewer);
    console.log('📄 找到文本節點數量:', textNodes.length);

    // 嘗試在文本中找到對應的位置並高亮
    let found = false;
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const text = node.textContent;
      
      // 檢查這個節點是否包含我們要標記的文本
      if (text.length > annotation.highlight_start) {
        try {
          // 創建高亮範圍
          const range = document.createRange();
          range.setStart(node, annotation.highlight_start);
          range.setEnd(node, Math.min(annotation.highlight_end, text.length));
          
          // 創建高亮元素
          const highlight = document.createElement('span');
          highlight.className = 'annotation-highlight';
          highlight.dataset.annotationId = annotationId;
          console.log('🎨 創建高亮元素，annotationId:', annotationId);
          highlight.style.cssText = `
            background-color: ${AnnotationManager.CONSTANTS.HIGHLIGHT_BG};
            border-bottom: 2px solid ${AnnotationManager.CONSTANTS.HIGHLIGHT_BORDER};
            cursor: pointer;
            position: relative;
            padding: 1px 2px;
            border-radius: 2px;
          `;
          
          // 用高亮元素包圍選中的文本
          range.surroundContents(highlight);
          console.log('✅ 高亮元素已包圍文本');
          
          
          // 綁定點擊事件
          highlight.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ 點擊高亮文本:', annotationId);
            this.highlightAnnotation(annotationId);
          });
          
          // 添加懸停效果
          highlight.addEventListener('mouseenter', () => {
            highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_TEMP;
          });
          
          highlight.addEventListener('mouseleave', () => {
            highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_BG;
          });
          
          found = true;
          console.log('✅ 文本高亮已添加');
          break;
        } catch (error) {
          console.log('⚠️ 高亮文本失敗:', error);
          continue;
        }
      }
    }
    
    if (!found) {
      console.log('⚠️ 無法在文本中找到對應位置，使用備用方案');
      this.addFallbackMarker(annotationId, annotation);
    }
  }

  /**
   * 獲取所有文本節點
   */
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    return textNodes;
  }

  /**
   * 備用方案：直接創建浮動批注
   */
  addFallbackMarker(annotationId, annotation) {
    console.log('⚠️ 無法精確定位文本，直接創建浮動批注');
    // 直接創建浮動批注，不添加標記
    this.createFloatingAnnotation(annotationId, annotation);
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
      
      // 更新浮動批注內容
      const floatingAnnotation = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
      if (floatingAnnotation) {
        const contentElement = floatingAnnotation.querySelector('.annotation-content p');
        if (contentElement) {
          contentElement.textContent = newContent;
        }
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
        const annotationId = annotation.id || annotation.annotation_id;
        if (annotationId) {
          this.annotations.set(annotationId, annotation);
          this.renderAnnotation(annotationId);
        } else {
          console.log('⚠️ 批注沒有有效的 ID:', annotation);
        }
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
        
        // 檢查是否已經存在這個批注（避免重複處理）
        if (this.annotations.has(payload.new.id)) {
          console.log('ℹ️ 批注已存在，跳過重複處理');
          return;
        }
        
        this.annotations.set(payload.new.id, payload.new);
        this.renderAnnotation(payload.new.id);
        
        // 只在不是當前用戶創建的批注時顯示通知
        if (typeof toast !== 'undefined') {
          toast.info('收到新批注');
        }
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
    this.renderAnnotation(annotationId);
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
      background: ${AnnotationManager.CONSTANTS.BUTTON_BG};
      color: ${AnnotationManager.CONSTANTS.BUTTON_TEXT};
      padding: ${AnnotationManager.CONSTANTS.BUTTON_PADDING};
      border-radius: 6px;
      font-size: 12px;
      z-index: ${AnnotationManager.CONSTANTS.BUTTON_Z_INDEX};
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
    this.hideSelectionHint();
    
    // 移除事件監聽器
    document.removeEventListener('mouseup', this.boundHandleTextSelection);
    document.removeEventListener('keyup', this.boundHandleTextSelection);
    document.removeEventListener('click', this.boundHandleAnnotationClick);
  }
}

export default AnnotationManager;
