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
    if (!this.isSelectionMode) {
      return;
    }
    
    // 如果點擊的是批注按鈕，不處理
    if (event.target.classList.contains('annotation-button')) {
      return;
    }
    
    // 如果點擊的是批注對話框內的元素，不處理
    if (event.target.closest('.annotation-dialog')) {
      return;
    }
    
    // 如果點擊的是批注彈出框，不處理
    if (event.target.closest('.annotation-popup')) {
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
      
      console.log('✅ 批注創建成功，ID:', data);
      
      // 顯示成功提示
      if (typeof toast !== 'undefined') {
        toast.success('批注已添加');
      } else {
        alert('批注已添加！');
      }
      
    } catch (error) {
      console.error('❌ 創建批注失敗:', error);
      if (typeof toast !== 'undefined') {
        toast.error('創建批注失敗: ' + error.message);
      } else {
        alert('創建批注失敗: ' + error.message);
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

      // 計算選中文本的相對位置
      let relativePosition = 0;
      if (this.selectedText && this.selectedText.range) {
        const essayViewer = document.getElementById('essayViewer');
        const rect = this.selectedText.range.getBoundingClientRect();
        const essayRect = essayViewer.getBoundingClientRect();
        
        const relativeTop = (rect.top - essayRect.top) / essayRect.height;
        relativePosition = Math.max(0, Math.min(1, relativeTop));
      }

      // 創建浮動輸入框
      const inputBox = document.createElement('div');
      inputBox.className = 'floating-annotation-input';
      inputBox.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 280px;
        z-index: 1001;
        font-size: 14px;
        line-height: 1.4;
        left: 0;
        top: ${relativePosition * 400}px;
      `;

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
   * 渲染批注高亮
   */
  renderAnnotationHighlight(annotationId) {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      console.log('❌ 批注不存在:', annotationId);
      return;
    }
    
    console.log('🎨 渲染批注高亮:', annotation);
    
    // 檢查是否已經渲染過這個批注
    const existingMarker = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (existingMarker) {
      console.log('ℹ️ 批注標記已存在，跳過重複渲染');
      return;
    }
    
    // 在原文中高亮選中的文本
    this.highlightTextInEssay(annotationId, annotation);
    
    // 在側邊欄中顯示批注
    this.addAnnotationToSidebar(annotationId, annotation);
  }

  /**
   * 在側邊欄中添加批注（Google Docs 風格）
   */
  addAnnotationToSidebar(annotationId, annotation) {
    // 創建獨立的批注容器，放在對應的高亮文本旁邊
    this.createFloatingAnnotation(annotationId, annotation);
    
    // 更新批注計數
    this.updateAnnotationCount();
    
    console.log('✅ 批注已添加到側邊欄');
  }

  /**
   * 創建浮動批注（在右側區域內浮動）
   */
  createFloatingAnnotation(annotationId, annotation) {
    // 找到對應的高亮元素
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (!highlight) {
      console.log('❌ 找不到對應的高亮元素');
      return;
    }

    // 獲取右側批注容器
    const annotationsContainer = document.getElementById('annotationsContainer');
    if (!annotationsContainer) {
      console.log('❌ 找不到批注容器');
      return;
    }

    // 計算高亮文本在論文中的相對位置
    const essayViewer = document.getElementById('essayViewer');
    const highlightRect = highlight.getBoundingClientRect();
    const essayRect = essayViewer.getBoundingClientRect();
    
    // 計算高亮文本相對於論文頂部的百分比位置
    const relativeTop = (highlightRect.top - essayRect.top) / essayRect.height;
    const relativePosition = Math.max(0, Math.min(1, relativeTop));

    // 創建浮動批注容器
    const floatingAnnotation = document.createElement('div');
    floatingAnnotation.className = 'floating-annotation';
    floatingAnnotation.dataset.annotationId = annotationId;
    floatingAnnotation.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      width: 280px;
      z-index: 1000;
      font-size: 14px;
      line-height: 1.4;
      left: 0;
      top: ${relativePosition * 400}px; /* 在右側區域內垂直浮動 */
    `;

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

    // 點擊高亮文本時顯示/隱藏批注
    highlight.addEventListener('click', () => {
      this.toggleFloatingAnnotation(annotationId);
    });

    // 初始狀態隱藏
    floatingAnnotation.style.display = 'none';
  }

  /**
   * 切換浮動批注顯示狀態
   */
  toggleFloatingAnnotation(annotationId) {
    const floatingAnnotation = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
    if (floatingAnnotation) {
      const isVisible = floatingAnnotation.style.display !== 'none';
      floatingAnnotation.style.display = isVisible ? 'none' : 'block';
      
      // 隱藏其他批注
      if (!isVisible) {
        document.querySelectorAll('.floating-annotation').forEach(ann => {
          if (ann.dataset.annotationId !== annotationId) {
            ann.style.display = 'none';
          }
        });
      }
    }
  }

  /**
   * 高亮側邊欄中的批注
   */
  highlightAnnotationInSidebar(annotationId) {
    // 隱藏所有浮動批注
    document.querySelectorAll('.floating-annotation').forEach(ann => {
      ann.style.display = 'none';
    });

    // 顯示當前批注
    const floatingAnnotation = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
    if (floatingAnnotation) {
      floatingAnnotation.style.display = 'block';
    }

    // 在原文中高亮對應的文本
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (highlight) {
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlight.style.background = '#fde68a';
      setTimeout(() => {
        highlight.style.background = '#fef3c7';
      }, 2000);
    }
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

    // 在原文中高亮對應的文本
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (highlight) {
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlight.style.background = '#fde68a';
      setTimeout(() => {
        highlight.style.background = '#fef3c7';
      }, 2000);
    }
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
          highlight.style.cssText = `
            background-color: #fef3c7;
            border-bottom: 2px solid #f59e0b;
            cursor: pointer;
            position: relative;
            padding: 1px 2px;
            border-radius: 2px;
          `;
          
          // 用高亮元素包圍選中的文本
          range.surroundContents(highlight);
          
          // 添加批注標記
          const marker = document.createElement('span');
          marker.className = 'annotation-marker';
          marker.dataset.annotationId = annotationId;
          marker.innerHTML = `📝`;
          marker.style.cssText = `
            color: #f59e0b;
            cursor: pointer;
            margin-left: 2px;
            display: inline-block;
            font-size: 12px;
            background: #fef3c7;
            padding: 1px 3px;
            border-radius: 2px;
            border: 1px solid #f59e0b;
            position: relative;
            z-index: 10;
          `;
          
          // 將標記插入到高亮元素後面
          highlight.parentNode.insertBefore(marker, highlight.nextSibling);
          
          // 綁定點擊事件
          highlight.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ 點擊高亮文本:', annotationId);
            this.highlightAnnotationInSidebar(annotationId);
          });
          
          marker.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ 點擊批注標記:', annotationId);
            this.highlightAnnotationInSidebar(annotationId);
          });
          
          // 添加懸停效果
          highlight.addEventListener('mouseenter', () => {
            highlight.style.background = '#fde68a';
          });
          
          highlight.addEventListener('mouseleave', () => {
            highlight.style.background = '#fef3c7';
          });
          
          marker.addEventListener('mouseenter', () => {
            marker.style.background = '#fde68a';
            marker.style.transform = 'scale(1.1)';
          });
          
          marker.addEventListener('mouseleave', () => {
            marker.style.background = '#fef3c7';
            marker.style.transform = 'scale(1)';
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
   * 備用方案：在論文末尾添加標記
   */
  addFallbackMarker(annotationId, annotation) {
    const essayViewer = document.getElementById('essayViewer');
    if (!essayViewer) return;
    
    const marker = document.createElement('span');
    marker.className = 'annotation-marker';
    marker.dataset.annotationId = annotationId;
    marker.innerHTML = `📝`;
    marker.style.cssText = `
      color: #f59e0b;
      cursor: pointer;
      margin-left: 4px;
      display: inline-block;
      font-size: 14px;
      background: #fef3c7;
      padding: 2px 4px;
      border-radius: 3px;
      border: 1px solid #f59e0b;
      position: relative;
      z-index: 10;
    `;
    
    essayViewer.appendChild(marker);
    
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🖱️ 點擊批注標記:', annotationId);
      this.showAnnotationPopup(annotationId, marker);
    });
    
    console.log('✅ 備用標記已添加');
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
        
        // 檢查是否已經存在這個批注（避免重複處理）
        if (this.annotations.has(payload.new.id)) {
          console.log('ℹ️ 批注已存在，跳過重複處理');
          return;
        }
        
        this.annotations.set(payload.new.id, payload.new);
        this.renderAnnotationHighlight(payload.new.id);
        
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
