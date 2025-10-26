/**
 * 批注管理器 - 核心批注功能
 * 負責文本選擇、高亮、批注 CRUD 操作
 */

import toast from '../ui/toast.js';
import dialog from '../ui/dialog.js';

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
  async init(essayId, paragraphs) {
    // 防止重複初始化
    if (this.isInitialized) {
      console.log('ℹ️ 批注系統已初始化，跳過重複初始化');
      return;
    }
    
    console.log('🚀 初始化批注系統:', { essayId, paragraphCount: paragraphs.length });
    
    this.currentEssayId = essayId;
    this.paragraphs = paragraphs; // 保存所有段落
    
    // 加載所有段落的批注
    await this.loadAllAnnotations();
    
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
    
          button.addEventListener('click', async (e) => {
      console.log('🖱️ 批注按鈕被點擊');
      e.preventDefault();
      
      // 從選中文本的 DOM 節點獲取段落 ID
      const commonNode = this.selectedText?.range?.commonAncestorContainer;
      const baseElement = commonNode
        ? (commonNode.nodeType === Node.ELEMENT_NODE
            ? commonNode
            : (commonNode.parentElement || null))
        : null;
      const paragraphElement = baseElement ? baseElement.closest('[data-paragraph-id]') : null;
      
      if (paragraphElement) {
        const paragraphId = paragraphElement.dataset.paragraphId;
        console.log('📝 找到段落 ID:', paragraphId);
        if (paragraphId) {
          this.currentParagraphId = paragraphId;
        }
      } else {
        console.warn('⚠️ 未能從選區定位到段落容器');
        toast.error('無法定位段落，請重新選擇文本');
        return;
      }
      
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
    if (!this.selectedText || !this.selectedText.range) return;
    
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
      this.selectedText.range.surroundContents(highlight);
      
      // 保存高亮元素引用，以便取消時移除
      this.tempHighlight = highlight;
      
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
    
    // 先基於段落計算全域偏移（在任何 DOM 改動之前）
    let paraStart = null;
    let paraEnd = null;
    try {
      const paragraphElement = this.getCurrentParagraphElement();
      if (!paragraphElement) {
        console.warn('⚠️ 無法獲取段落容器，偏移計算可能不準確');
      } else {
        const offsets = this.computeParagraphOffsets(paragraphElement, this.selectedText.range);
        if (offsets) {
          // 規範化起迄
          paraStart = Math.min(offsets.start, offsets.end);
          paraEnd = Math.max(offsets.start, offsets.end);
          console.log('✅ 取得段落全域偏移:', { paraStart, paraEnd });
        }
      }
    } catch (err) {
      console.warn('⚠️ 計算段落偏移失敗，將回退到臨時方案:', err);
    }
    
    // 隱藏批注按鈕
    this.hideAnnotationButton();
    
    // 立即高亮選中的文字
    this.highlightSelectedText();
    
    // 顯示批注創建對話框
    const dialogResult = await this.showAnnotationDialog();
    if (!dialogResult) {
      console.log('❌ 用戶取消了批注創建');
      return;
    }
    
    const { content, inputBox, cleanup } = dialogResult;
    console.log('✅ 批注內容:', content);
    
    // 🚨 樂觀更新：立即生成臨時 ID 並轉換為批註顯示
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paragraphOrderIndex = this.getCurrentParagraphOrderIndex();
    
    // 添加到本地存儲（使用臨時 ID）
    this.annotations.set(tempId, {
      id: tempId,
      paragraph_id: this.currentParagraphId,
      paragraph_order_index: paragraphOrderIndex,
      content: content,
      highlight_start: (paraStart != null ? paraStart : Math.min(this.selectedText.startOffset, this.selectedText.endOffset)),
      highlight_end: (paraEnd != null ? paraEnd : Math.max(this.selectedText.startOffset, this.selectedText.endOffset)),
      anchor_text: this.selectedText.text,
      annotation_type: 'comment',
      priority: 'normal',
      is_private: false,
      created_at: new Date().toISOString(),
      _isOptimistic: true // 標記為樂觀更新
    });
    
    // 移除輸入框
    cleanup();
    
    // 若存在臨時高亮，先移除
    if (this.tempHighlight) {
      try {
        const parent = this.tempHighlight.parentNode;
        while (this.tempHighlight.firstChild) {
          parent.insertBefore(this.tempHighlight.firstChild, this.tempHighlight);
        }
        parent.removeChild(this.tempHighlight);
        this.tempHighlight = null;
        console.log('🧹 已移除臨時高亮，準備渲染永久高亮');
      } catch (cleanupErr) {
        console.log('⚠️ 清理臨時高亮失敗:', cleanupErr);
      }
    }
    
    // 🚨 立即渲染批註（使用臨時 ID）
    this.renderAnnotation(tempId);
    
    // 清除選擇
    window.getSelection().removeAllRanges();
    this.selectedText = null;
    this.tempHighlight = null;
    this.hideAnnotationButton();
    
    console.log('✅ 批注已樂觀顯示，臨時 ID:', tempId);
    
    // 🚨 後台異步同步到 Supabase
    try {
      console.log('📤 後台同步到 Supabase...');
      
      const { data, error } = await this.supabase.rpc('create_annotation', {
        p_paragraph_id: this.currentParagraphId,
        p_content: content,
        p_highlight_start: (paraStart != null ? paraStart : Math.min(this.selectedText.startOffset, this.selectedText.endOffset)),
        p_highlight_end: (paraEnd != null ? paraEnd : Math.max(this.selectedText.startOffset, this.selectedText.endOffset)),
        p_anchor_text: this.selectedText.text,
        p_annotation_type: 'comment',
        p_priority: 'normal',
        p_is_private: false
      });
      
      if (error) throw error;
      
      // 🚨 同步成功：用真實 ID 替換臨時 ID
      const annotationData = this.annotations.get(tempId);
      this.annotations.delete(tempId);
      
      annotationData.id = data;
      delete annotationData._isOptimistic;
      this.annotations.set(data, annotationData);
      
      // 更新 DOM 元素的 data-annotation-id
      const annotationElement = document.querySelector(`.floating-annotation[data-annotation-id="${tempId}"]`);
      const highlightElement = document.querySelector(`.annotation-highlight[data-annotation-id="${tempId}"]`);
      
      if (annotationElement) {
        annotationElement.dataset.annotationId = data;
      }
      if (highlightElement) {
        highlightElement.dataset.annotationId = data;
      }
      
      console.log('✅ 批注同步成功，真實 ID:', data);
      
      // 顯示成功提示
      if (typeof toast !== 'undefined') {
        toast.success('批注已添加');
      }
      
    } catch (error) {
      console.error('❌ 同步批注失敗:', error);
      
      // 🚨 同步失敗：標記批註為錯誤狀態
      const annotationData = this.annotations.get(tempId);
      if (annotationData) {
        annotationData._syncError = true;
      }
      
      // 在批註上顯示錯誤標記
      const annotationElement = document.querySelector(`.floating-annotation[data-annotation-id="${tempId}"]`);
      if (annotationElement) {
        annotationElement.classList.add('sync-error');
        annotationElement.title = '同步失敗，點擊重試';
      }
      
      console.error('錯誤詳情:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      if (typeof toast !== 'undefined') {
        const errorMsg = error.message || '網絡連接錯誤';
        toast.error('批注同步失敗: ' + errorMsg);
      }
    }
  }

  /**
   * 取得當前段落容器 Element
   * 若找不到，返回 null
   */
  getCurrentParagraphElement() {
    if (!this.currentParagraphId) return null;
    return document.querySelector(`[data-paragraph-id="${this.currentParagraphId}"]`);
  }

  /**
   * 獲取當前段落的 order_index
   * 從 DOM 元素的 data-order-index 屬性讀取
   */
  getCurrentParagraphOrderIndex() {
    const paragraphElement = this.getCurrentParagraphElement();
    if (!paragraphElement) {
      console.warn('⚠️ 無法獲取段落元素，返回默認 order_index 0');
      return 0;
    }
    
    const orderIndex = paragraphElement.dataset.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      console.warn('⚠️ 段落元素沒有 data-order-index 屬性，返回默認值 0');
      return 0;
    }
    
    const parsed = parseInt(orderIndex, 10);
    if (isNaN(parsed)) {
      console.warn('⚠️ 無法解析 order_index:', orderIndex);
      return 0;
    }
    
    console.log('✅ 獲取段落 order_index:', parsed);
    return parsed;
  }

  /**
   * 計算 Range 對應於段落內的全域偏移（支援跨節點）
   * 返回 { start, end }（皆為段落內字元索引）
   */
  computeParagraphOffsets(paragraphElement, range) {
    if (!paragraphElement || !range) return null;
    const textNodes = this.getTextNodes(paragraphElement);
    const totalLength = textNodes.reduce((sum, n) => sum + n.textContent.length, 0);

    const posOf = (container, offset) => {
      // 僅處理 Text 節點；若為 Element，嘗試向內找到第一個 Text 節點
      let node = container;
      if (node.nodeType !== Node.TEXT_NODE) {
        // 嘗試定位到一個合理的文本節點
        // 簡化策略：使用 TreeWalker 從 container 起點向後尋找第一個文本節點
        const walker = document.createTreeWalker(paragraphElement, NodeFilter.SHOW_TEXT, null, false);
        let found = null;
        while (walker.nextNode()) {
          if (walker.currentNode === container || container.contains(walker.currentNode)) {
            found = walker.currentNode;
            break;
          }
        }
        node = found || textNodes[0] || null;
        // 若仍不可得，回傳邊界
        if (!node) return 0;
        // Element 情況下 offset 很難準確映射，選擇落在該文字節點開頭
        offset = 0;
      }

      let acc = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const n = textNodes[i];
        if (n === node) {
          return Math.max(0, Math.min(acc + offset, totalLength));
        }
        acc += n.textContent.length;
      }
      // 若選區節點不在段落內，採用邊界策略
      return (paragraphElement.contains(container)) ? totalLength : 0;
    };

    const start = posOf(range.startContainer, range.startOffset);
    const end = posOf(range.endContainer, range.endOffset);
    return { start, end };
  }

  /**
   * 顯示批注對話框
   */
  async showAnnotationDialog(defaultContent = '') {
    console.log('💬 顯示批注對話框:', defaultContent);
    
    return new Promise((resolve) => {
      // 獲取滾動容器
      const wrapper = document.querySelector('.grading-content-wrapper');
      if (!wrapper) {
        console.error('❌ 找不到滾動容器');
        resolve(null);
        return;
      }

      // 創建浮動輸入框
      const inputBox = document.createElement('div');
      inputBox.className = 'floating-annotation-input';

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
      
      // 直接添加到滾動容器
      wrapper.appendChild(inputBox);
      
      // 調整所有批註位置
      this.adjustAnnotationsForActive(inputBox);
      
      // 滾動到原文位置
      this.scrollToHighlight();
      
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
        
        // 移除已創建的高亮元素
        if (this.tempHighlight) {
          try {
            const parent = this.tempHighlight.parentNode;
            while (this.tempHighlight.firstChild) {
              parent.insertBefore(this.tempHighlight.firstChild, this.tempHighlight);
            }
            parent.removeChild(this.tempHighlight);
            this.tempHighlight = null;
            console.log('✅ 已移除臨時高亮');
          } catch (error) {
            console.log('⚠️ 移除高亮失敗:', error);
          }
        }
        
        cleanup();
        resolve(null);
      });
      
      submitBtn.addEventListener('click', () => {
        const content = textarea.value.trim();
        console.log('💾 用戶保存批注:', content);
        
        // 🚨 修改：不立即清理，返回內容和輸入框元素
        // 讓 createAnnotation 方法處理樂觀更新
        resolve({ content, inputBox, cleanup });
      });
      
      // 自動聚焦到文本框
      textarea.focus();
    });
  }

  /**
   * 獲取當前用戶信息（統一方法）
   */
  getCurrentUser() {
    // 從全局狀態獲取用戶信息
    if (window.AppState?.currentUser) {
      console.log('✅ 從 AppState 獲取用戶信息:', window.AppState.currentUser.email);
      return window.AppState.currentUser;
    }
    
    
    console.log('❌ 無法獲取用戶信息');
    return null;
  }

  /**
   * 獲取用戶姓名首字母
   */
  getUserInitials() {
    const user = this.getCurrentUser();
    if (user) {
      const fullName = user.user_metadata?.full_name || user.email || 'User';
      console.log('👤 獲取用戶首字母:', fullName.charAt(0).toUpperCase());
      return fullName.charAt(0).toUpperCase();
    }
    console.log('⚠️ 無法獲取用戶信息，使用默認首字母');
    return 'U';
  }

  /**
   * 獲取當前用戶姓名
   */
  getCurrentUserName() {
    const user = this.getCurrentUser();
    if (user) {
      const userName = user.user_metadata?.full_name || user.email || 'Unknown User';
      console.log('👤 獲取用戶姓名:', userName);
      return userName;
    }
    console.log('⚠️ 無法獲取用戶信息，使用默認姓名');
    return 'Unknown User';
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
   * 獲取批註的理想位置（對齊原文高亮）
   */
  getIdealTop(annotation) {
    const essayViewer = document.getElementById('essayViewer');
    if (!essayViewer) return 0;
    
    const essayViewerOffset = essayViewer.offsetTop;
    
    // 對於輸入框
    if (annotation.classList && annotation.classList.contains('floating-annotation-input')) {
      if (!this.tempHighlight) return 0;
      return this.tempHighlight.offsetTop + essayViewerOffset;
    }
    
    // 對於已存在的批註
    const annotationId = annotation.dataset?.annotationId;
    if (annotationId) {
      const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
      
      if (highlight) {
        return highlight.offsetTop + essayViewerOffset;
      }
    }
    
    return parseInt(annotation.style.top) || 0;
  }

  /**
   * 調整批註位置，確保活動批註對齊原文，其他批註智能避讓
   */
  adjustAnnotationsForActive(activeElement) {
    const allAnnotations = Array.from(
      document.querySelectorAll('.floating-annotation, .floating-annotation-input')
    );
    
    // 輔助函數：獲取元素的段落順序和段內位置
    const getAnnotationPosition = (element) => {
      const annotationId = element.dataset.annotationId;
      
      // 情況1：已保存的批註，從 this.annotations 獲取
      if (annotationId) {
        const data = this.annotations.get(annotationId);
        return {
          paragraphOrderIndex: data?.paragraph_order_index || 0,
          highlightStart: data?.highlight_start || 0
        };
      }
      
      // 情況2：新批註輸入框，從 tempHighlight 計算
      if (element.classList.contains('floating-annotation-input') && this.tempHighlight) {
        // 獲取段落元素和段落順序
        const paragraphElement = this.tempHighlight.closest('[data-paragraph-id]');
        const paragraphOrderIndex = paragraphElement?.dataset.orderIndex 
          ? parseInt(paragraphElement.dataset.orderIndex, 10) 
          : 0;
        
        // 計算段內字符偏移
        const range = document.createRange();
        range.setStart(paragraphElement, 0);
        range.setEnd(this.tempHighlight, 0);
        const highlightStart = range.toString().length;
        
        return {
          paragraphOrderIndex,
          highlightStart
        };
      }
      
      // 默認情況（不應該發生）
      return { paragraphOrderIndex: 0, highlightStart: 0 };
    };
    
    // 按段落順序和 highlight_start 排序
    const sortedAnnotations = allAnnotations.sort((a, b) => {
      const aPos = getAnnotationPosition(a);
      const bPos = getAnnotationPosition(b);
      
      // 先按段落順序排序
      const orderDiff = aPos.paragraphOrderIndex - bPos.paragraphOrderIndex;
      if (orderDiff !== 0) return orderDiff;
      
      // 同一段落內按 highlight_start 排序
      return aPos.highlightStart - bPos.highlightStart;
    });
    
    // 找到活動批註的索引
    const activeIndex = sortedAnnotations.indexOf(activeElement);
    const activeIdealTop = this.getIdealTop(activeElement);
    activeElement.style.top = activeIdealTop + 'px';
    const activeBottom = activeIdealTop + (activeElement.offsetHeight || 100);
    
    // 調整上方的批註（向上避讓）
    let currentBottom = activeIdealTop;
    for (let i = activeIndex - 1; i >= 0; i--) {
      const ann = sortedAnnotations[i];
      const annHeight = ann.offsetHeight || 100;
      const annIdealTop = this.getIdealTop(ann);
      
      // 如果理想位置會重疊，向上移動
      if (annIdealTop + annHeight + 12 > currentBottom) {
        ann.style.top = Math.max(0, currentBottom - annHeight - 12) + 'px';
        currentBottom = Math.max(0, currentBottom - annHeight - 12);
      } else {
        ann.style.top = annIdealTop + 'px';
        currentBottom = annIdealTop;
      }
    }
    
    // 調整下方的批註（向下避讓）
    let currentTop = activeBottom;
    for (let i = activeIndex + 1; i < sortedAnnotations.length; i++) {
      const ann = sortedAnnotations[i];
      const annIdealTop = this.getIdealTop(ann);
      
      // 如果理想位置會重疊，向下移動
      if (annIdealTop < currentTop + 12) {
        ann.style.top = (currentTop + 12) + 'px';
        currentTop = currentTop + 12 + (ann.offsetHeight || 100);
      } else {
        ann.style.top = annIdealTop + 'px';
        currentTop = annIdealTop + (ann.offsetHeight || 100);
      }
    }
  }

  /**
   * 調整所有批註位置，確保按原文順序排列且不重疊
   */
  adjustAllAnnotations() {
    const allAnnotations = Array.from(
      document.querySelectorAll('.floating-annotation, .floating-annotation-input')
    );
    
    if (allAnnotations.length === 0) return;
    
    // 按段落順序和 highlight_start 排序
    const sortedAnnotations = allAnnotations.sort((a, b) => {
      const aId = a.dataset.annotationId;
      const bId = b.dataset.annotationId;
      
      // 處理輸入框（沒有 annotationId）
      if (!aId) return -1;
      if (!bId) return 1;
      
      const aData = this.annotations.get(aId);
      const bData = this.annotations.get(bId);
      
      // 先按段落順序排序
      const orderDiff = (aData?.paragraph_order_index || 0) - (bData?.paragraph_order_index || 0);
      if (orderDiff !== 0) return orderDiff;
      
      // 同一段落內按 highlight_start 排序
      return (aData?.highlight_start || 0) - (bData?.highlight_start || 0);
    });
    
    // 從上到下依次放置，避免重疊
    let lastBottom = 0;
    sortedAnnotations.forEach(ann => {
      const idealTop = this.getIdealTop(ann);
      const actualTop = Math.max(idealTop, lastBottom + 12);
      ann.style.top = actualTop + 'px';
      lastBottom = actualTop + (ann.offsetHeight || 100);
    });
  }

  /**
   * 創建連接線
   */
  createConnectionLine(annotationId) {
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    const annotation = document.querySelector(`.floating-annotation[data-annotation-id="${annotationId}"]`);
    
    if (!highlight || !annotation) return;
    
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!wrapper) return;
    
    // 清理現有連接線
    this.clearConnectionLines();
    
    // 計算位置
    const highlightRect = highlight.getBoundingClientRect();
    const annotationRect = annotation.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    const startX = highlightRect.right - wrapperRect.left;
    const startY = highlightRect.top + highlightRect.height / 2 - wrapperRect.top + wrapper.scrollTop;
    const endX = annotationRect.left - wrapperRect.left;
    const endY = annotationRect.top + annotationRect.height / 2 - wrapperRect.top + wrapper.scrollTop;
    
    // 創建連接線元素
    const connection = document.createElement('div');
    connection.className = 'annotation-connection';
    connection.dataset.annotationId = annotationId;
    
    // 計算連接線的長度和角度
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    // 設置連接線樣式
    connection.style.left = startX + 'px';
    connection.style.top = startY + 'px';
    connection.style.width = length + 'px';
    connection.style.transform = `rotate(${angle}deg)`;
    connection.style.transformOrigin = '0 50%';
    
    // 添加到滾動容器
    wrapper.appendChild(connection);
    
    // 監聽滾動事件，更新連接線位置
    const updateConnection = () => {
      const newHighlightRect = highlight.getBoundingClientRect();
      const newAnnotationRect = annotation.getBoundingClientRect();
      const newWrapperRect = wrapper.getBoundingClientRect();
      
      const newStartX = newHighlightRect.right - newWrapperRect.left;
      const newStartY = newHighlightRect.top + newHighlightRect.height / 2 - newWrapperRect.top + wrapper.scrollTop;
      const newEndX = newAnnotationRect.left - newWrapperRect.left;
      const newEndY = newAnnotationRect.top + newAnnotationRect.height / 2 - newWrapperRect.top + wrapper.scrollTop;
      
      const newDeltaX = newEndX - newStartX;
      const newDeltaY = newEndY - newStartY;
      const newLength = Math.sqrt(newDeltaX * newDeltaX + newDeltaY * newDeltaY);
      const newAngle = Math.atan2(newDeltaY, newDeltaX) * 180 / Math.PI;
      
      connection.style.left = newStartX + 'px';
      connection.style.top = newStartY + 'px';
      connection.style.width = newLength + 'px';
      connection.style.transform = `rotate(${newAngle}deg)`;
    };
    
    // 綁定滾動事件
    connection._updateHandler = updateConnection;
    wrapper.addEventListener('scroll', updateConnection);
    window.addEventListener('resize', updateConnection);
  }

  /**
   * 清理連接線
   */
  clearConnectionLines() {
    const connections = document.querySelectorAll('.annotation-connection');
    connections.forEach(connection => {
      const wrapper = document.querySelector('.grading-content-wrapper');
      if (wrapper && connection._updateHandler) {
        wrapper.removeEventListener('scroll', connection._updateHandler);
        window.removeEventListener('resize', connection._updateHandler);
      }
      connection.remove();
    });
  }

  /**
   * 滾動到高亮的原文位置
   */
  scrollToHighlight() {
    const wrapper = document.querySelector('.grading-content-wrapper');
    const highlight = this.tempHighlight;
    
    if (!wrapper || !highlight) return;
    
    const highlightRect = highlight.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const currentScrollTop = wrapper.scrollTop;
    
    const highlightTop = highlightRect.top - wrapperRect.top + currentScrollTop;
    const scrollTo = highlightTop - (wrapper.clientHeight / 2) + (highlight.offsetHeight / 2);
    
    wrapper.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: 'smooth'
    });
  }

  /**
   * 滾動到指定批註的原文位置
   */
  scrollToAnnotationHighlight(annotationId) {
    const wrapper = document.querySelector('.grading-content-wrapper');
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    
    if (!wrapper || !highlight) return;
    
    const highlightRect = highlight.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const currentScrollTop = wrapper.scrollTop;
    
    const highlightTop = highlightRect.top - wrapperRect.top + currentScrollTop;
    const scrollTo = highlightTop - (wrapper.clientHeight / 2) + (highlight.offsetHeight / 2);
    
    wrapper.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: 'smooth'
    });
  }



  /**
   * 創建浮動批注（Google Docs 風格 - 直接浮動在右側）
   */
  createFloatingAnnotation(annotationId, annotation) {
    // 獲取滾動容器
    const wrapper = document.querySelector('.grading-content-wrapper');
    if (!wrapper) {
      console.log('❌ 找不到滾動容器');
      return;
    }

    // 找到對應的高亮元素
    const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    
    // 如果批注是孤立的（找不到對應的文本），顯示警告標記
    if (!highlight && annotation.is_orphaned) {
      console.log('⚠️ 批注是孤立的，無法定位原文');
    } else if (!highlight) {
      console.log('❌ 找不到對應的高亮元素');
      return;
    }
    
    // 創建浮動批注容器
    const floatingAnnotation = document.createElement('div');
    floatingAnnotation.className = 'floating-annotation';
    floatingAnnotation.dataset.annotationId = annotationId;

    // 批注內容
    const orphanedWarning = annotation.is_orphaned 
      ? '<div class="annotation-orphaned-warning"><i class="fas fa-exclamation-triangle"></i> 此批注可能無法定位原文</div>' 
      : '';
    
    floatingAnnotation.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-avatar">${this.getUserInitials()}</div>
        <div class="annotation-author">${this.getCurrentUserName()}</div>
        <div class="annotation-time">${this.formatTime(annotation.created_at)}</div>
      </div>
      ${orphanedWarning}
      <div class="annotation-content">${annotation.content}</div>
      <div class="annotation-actions">
        <button class="annotation-action-btn edit" data-annotation-id="${annotationId}">編輯</button>
        <button class="annotation-action-btn delete" data-annotation-id="${annotationId}">刪除</button>
      </div>
    `;

    // 直接添加到滾動容器中
    wrapper.appendChild(floatingAnnotation);
    
    // 計算批註位置（使用新的 getIdealTop 方法）
    const idealTop = this.getIdealTop(floatingAnnotation);
    floatingAnnotation.style.top = idealTop + 'px';
    
    console.log('✅ 批注元素已添加到滾動容器中');

    // 綁定事件
    floatingAnnotation.addEventListener('click', (e) => {
      if (e.target.classList.contains('annotation-action-btn')) return;
      this.highlightAnnotation(annotationId);
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
    
    // 調整所有批註位置，避免重疊
    this.adjustAllAnnotations();
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
      
      // 添加 active 類以啟用增強效果
      highlight.classList.add('active');
      
      // 創建連接線
      this.createConnectionLine(annotationId);
      
      setTimeout(() => {
        highlight.classList.remove('active');
      }, AnnotationManager.CONSTANTS.TEMP_HIGHLIGHT_DURATION);
    }
  }

  /**
   * 高亮批注（統一方法）
   */
  highlightAnnotation(annotationId) {
    // 清理現有連接線
    this.clearConnectionLines();
    
    // 移除所有原文高亮的 active 狀態
    document.querySelectorAll('.annotation-highlight').forEach(highlight => {
      highlight.classList.remove('active');
    });
    
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
      
      // 為對應的原文高亮添加 active 狀態（持續保持，不自動移除）
      const highlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
      if (highlight) {
        highlight.classList.add('active');
      }
      
      // 調整批註位置，讓該批註對齊原文
      this.adjustAnnotationsForActive(floatingAnnotation);
      
      // 滾動到原文位置
      this.scrollToAnnotationHighlight(annotationId);
      
      // 創建連接線
      this.createConnectionLine(annotationId);
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
   * 在論文中高亮文本
   */
  highlightTextInEssay(annotationId, annotation) {
    // 只在對應段落內尋找並重建跨節點選區
    const paragraphId = annotation.paragraph_id || this.currentParagraphId;
    const paragraphElement = paragraphId
      ? document.querySelector(`[data-paragraph-id="${paragraphId}"]`)
      : null;
    if (!paragraphElement) {
      console.log('❌ 找不到對應段落內容，放棄高亮');
      return;
    }

    // 策略 1：優先使用錨定文本定位（如果可用且批注未被標記為孤立）
    if (annotation.anchor_text && !annotation.is_orphaned) {
      console.log('🔍 使用錨定文本定位:', annotation.anchor_text);
      const found = this.findTextByAnchor(paragraphElement, annotation.anchor_text);
      if (found) {
        console.log('✅ 使用錨定文本成功定位');
        this.highlightWithRange(annotationId, found);
        return;
      } else {
        console.log('⚠️ 錨定文本未找到，回退到偏移定位');
      }
    }

    const textNodes = this.getTextNodes(paragraphElement);
    if (!textNodes.length) {
      console.log('⚠️ 段落內無文本節點');
      return;
    }

    // 策略 2：回退到使用段落全域偏移定位
    console.log('🔍 使用偏移定位:', annotation.highlight_start, annotation.highlight_end);
    const totalLength = textNodes.reduce((sum, n) => sum + n.textContent.length, 0);
    const startIndex = Math.max(0, Math.min(annotation.highlight_start || 0, totalLength));
    const endIndex = Math.max(0, Math.min(annotation.highlight_end || startIndex, totalLength));

    const locate = (charIndex) => {
      let acc = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const len = textNodes[i].textContent.length;
        if (acc + len >= charIndex) {
          return { node: textNodes[i], offset: charIndex - acc };
        }
        acc += len;
      }
      // 邊界：落在最後一個節點尾端
      const last = textNodes[textNodes.length - 1];
      return { node: last, offset: last.textContent.length };
    };

    const startPos = locate(startIndex);
    const endPos = locate(endIndex);

    try {
      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);

      // 使用統一的 highlightWithRange 方法
      this.highlightWithRange(annotationId, range);
      console.log('✅ 使用偏移定位高亮成功');
    } catch (err) {
      console.log('⚠️ 跨節點高亮失敗，使用備用方案:', err);
      this.addFallbackMarker(annotationId, annotation);
    }
  }

  /**
   * 使用錨定文本在段落中查找文本位置
   * @param {HTMLElement} paragraphElement - 段落元素
   * @param {string} anchorText - 要查找的錨定文本
   * @returns {Range|null} 找到的文本範圍，如果沒找到返回 null
   */
  findTextByAnchor(paragraphElement, anchorText) {
    if (!paragraphElement || !anchorText) return null;
    
    const textNodes = this.getTextNodes(paragraphElement);
    if (!textNodes.length) return null;
    
    // 將所有文本節點組合成完整文本
    const fullText = textNodes.map(n => n.textContent).join('');
    
    // 在完整文本中搜索錨定文本
    const searchIndex = fullText.indexOf(anchorText);
    if (searchIndex === -1) {
      console.log('⚠️ 錨定文本未在段落中找到:', anchorText);
      return null;
    }
    
    // 找到的起始和結束位置
    const startPos = searchIndex;
    const endPos = searchIndex + anchorText.length;
    
    // 將全局位置映射回具體的節點和偏移
    const locate = (charIndex) => {
      let acc = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const len = textNodes[i].textContent.length;
        if (acc + len >= charIndex) {
          return { node: textNodes[i], offset: charIndex - acc };
        }
        acc += len;
      }
      const last = textNodes[textNodes.length - 1];
      return { node: last, offset: last.textContent.length };
    };
    
    const startNode = locate(startPos);
    const endNode = locate(endPos);
    
    try {
      const range = document.createRange();
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
      return range;
    } catch (err) {
      console.log('⚠️ 創建 Range 失敗:', err);
      return null;
    }
  }

  /**
   * 使用 Range 高亮文本
   * @param {string} annotationId - 批注 ID
   * @param {Range} range - 文本範圍
   */
  highlightWithRange(annotationId, range) {
    if (!range) {
      console.log('⚠️ 無效的 Range');
      return;
    }
    
    try {
      // 調試：檢查 Range 的內容
      console.log('🔍 Range 調試信息:', {
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        collapsed: range.collapsed,
        commonAncestorContainer: range.commonAncestorContainer,
        toString: range.toString()
      });
      
      const highlight = document.createElement('span');
      highlight.className = 'annotation-highlight';
      highlight.dataset.annotationId = annotationId;
      highlight.style.cssText = `
        background-color: ${AnnotationManager.CONSTANTS.HIGHLIGHT_BG};
        border-bottom: 2px solid ${AnnotationManager.CONSTANTS.HIGHLIGHT_BORDER};
        cursor: pointer;
        position: relative;
        padding: 1px 2px;
        border-radius: 2px;
      `;

      // 方法 1：嘗試使用 surroundContents（更簡單，避免額外的 DOM 結構）
      try {
        range.surroundContents(highlight);
        console.log('✅ 使用 surroundContents 高亮成功');
      } catch (surroundErr) {
        // 方法 2：如果 surroundContents 失敗（跨節點情況），使用 extractContents
        console.log('⚠️ surroundContents 失敗，使用 extractContents:', surroundErr);
        
        // 先收集所有文本節點，確保 Range 正確
        const clonedRange = range.cloneRange();
        const frag = clonedRange.extractContents();
        
        // 清理空的文本節點和純空白節點，同時移除可能包裹空白的 block 元素
        const cleanNodes = Array.from(frag.childNodes).filter(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim().length > 0;
          }
          // 如果是元素節點，檢查是否只包含空白
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName?.toLowerCase();
            // 移除可能導致空行的 block 元素
            if (['p', 'div', 'br'].includes(tagName)) {
              // 只保留有實際內容的節點
              return node.textContent.trim().length > 0;
            }
          }
          return true;
        });
        
        // 如果清理後沒有節點，嘗試用 surroundContents
        if (cleanNodes.length === 0) {
          console.log('⚠️ 提取的內容為空，嘗試調整 Range');
          // 重新設置 Range 到連續的文本
          const textNodes = this.getTextNodes(range.commonAncestorContainer.parentElement || range.commonAncestorContainer);
          const startNode = textNodes.find(n => n.contains(range.startContainer) || n === range.startContainer);
          const endNode = textNodes.find(n => n.contains(range.endContainer) || n === range.endContainer);
          
          if (startNode && endNode) {
            const newRange = document.createRange();
            newRange.setStart(startNode, range.startOffset);
            newRange.setEnd(endNode, range.endOffset);
            newRange.surroundContents(highlight);
          } else {
            throw new Error('無法找到有效的文本節點');
          }
        } else {
          // 重新組裝 fragment
          while (frag.firstChild) frag.removeChild(frag.firstChild);
          cleanNodes.forEach(node => frag.appendChild(node));
          highlight.appendChild(frag);
          range.insertNode(highlight);
        }
        
        console.log('✅ 使用 extractContents 高亮成功');
      }

      // 綁定點擊與懸浮效果
      highlight.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🖱️ 點擊高亮文本:', annotationId);
        this.highlightAnnotation(annotationId);
      });
      highlight.addEventListener('mouseenter', () => {
        highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_TEMP;
      });
      highlight.addEventListener('mouseleave', () => {
        highlight.style.background = AnnotationManager.CONSTANTS.HIGHLIGHT_BG;
      });

    } catch (err) {
      console.log('⚠️ 高亮失敗:', err);
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
        const contentElement = floatingAnnotation.querySelector('.annotation-content');
        if (contentElement) {
          contentElement.textContent = newContent;
        }
        
        // 調整批註位置，讓該批註對齊原文
        this.adjustAnnotationsForActive(floatingAnnotation);
        
        // 滾動到原文位置
        this.scrollToAnnotationHighlight(annotationId);
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
    // 使用統一的 Dialog 組件替代原生 confirm
    dialog.confirmDelete({
      title: '刪除批注',
      message: '確定要刪除這個批注嗎？<br><br>此操作無法撤銷。',
      onConfirm: async () => {
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
    });
  }

  /**
   * 加載整篇文章的所有批注
   */
  async loadAllAnnotations() {
    console.log('📥 加載整篇文章的批注');
    
    try {
      const { data, error } = await this.supabase.rpc('get_essay_annotations', {
        p_essay_id: this.currentEssayId
      });
      
      if (error) {
        console.error('❌ RPC 調用失敗:', error);
        throw error;
      }
      
      console.log('📊 批注數據:', data);
      
      // 檢查數據有效性
      if (!data || !Array.isArray(data)) {
        console.log('⚠️ 沒有批注數據或數據格式不正確');
        return;
      }
      
      // 按照 paragraph_order_index 和 highlight_start 排序
      const sortedAnnotations = data.sort((a, b) => {
        const orderDiff = (a.paragraph_order_index || 0) - (b.paragraph_order_index || 0);
        if (orderDiff !== 0) return orderDiff;
        return (a.highlight_start || 0) - (b.highlight_start || 0);
      });
      
      console.log('✅ 批注已按段落和位置排序');
      
      // 存儲並渲染批注
      sortedAnnotations.forEach(annotation => {
        const annotationId = annotation.id || annotation.annotation_id;
        if (annotationId) {
          this.annotations.set(annotationId, annotation);
          this.renderAnnotation(annotationId);
        }
      });
      
      console.log(`✅ 已加載 ${sortedAnnotations.length} 個批注`);
      
      // 調整所有批註位置
      setTimeout(() => {
        this.adjustAllAnnotations();
      }, 200);
      
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('加載批注失敗: ' + error.message);
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
      
      // 按照 highlight_start 排序（從小到大，確保批註按原文順序顯示）
      const sortedAnnotations = data.sort((a, b) => {
        return (a.highlight_start || 0) - (b.highlight_start || 0);
      });
      
      console.log('✅ 批注已按原文位置排序');
      
      // 存儲並渲染批注
      sortedAnnotations.forEach(annotation => {
        const annotationId = annotation.id || annotation.annotation_id;
        if (annotationId) {
          // 從 DOM 獲取段落的 order_index
          const paragraphElement = document.querySelector(`[data-paragraph-id="${this.currentParagraphId}"]`);
          const paragraphOrderIndex = paragraphElement?.dataset.orderIndex 
            ? parseInt(paragraphElement.dataset.orderIndex, 10) 
            : 0;
          
          this.annotations.set(annotationId, {
            ...annotation,
            paragraph_order_index: paragraphOrderIndex
          });
          this.renderAnnotation(annotationId);
        } else {
          console.log('⚠️ 批注沒有有效的 ID:', annotation);
        }
      });
      
      console.log(`✅ 已加載 ${sortedAnnotations.length} 個批注`);
      
      // 調整所有批註位置，確保不重疊
      setTimeout(() => {
        this.adjustAllAnnotations();
      }, 200);
      
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      toast.error('加載批注失敗: ' + error.message);
    }
  }

  /**
   * 設置 Realtime 監聽
   */
  setupRealtimeListener() {
    // 清理現有的監聽器
    this.cleanupRealtimeListener();
    
    // 獲取所有段落的 ID
    const paragraphIds = this.paragraphs?.map(p => p.id) || [];
    console.log('🔗 設置 Realtime 監聽，段落數量:', paragraphIds.length);
    
    if (paragraphIds.length === 0) {
      console.log('⚠️ 沒有段落，跳過 Realtime 監聽設置');
      return;
    }
    
    // 監聽批注變化
    // 如果段落太多，使用更寬泛的過濾器
    const filter = paragraphIds.length > 50 
      ? `essay_id=eq.${this.currentEssayId}` 
      : `paragraph_id=in.(${paragraphIds.join(',')})`;
    
    this.realtimeChannel = this.supabase
      .channel('annotations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'annotations',
        filter: filter
      }, (payload) => {
        console.log('🔄 收到新批注:', payload.new);
        
        // 檢查是否已經存在這個批注（避免重複處理）
        if (this.annotations.has(payload.new.id)) {
          console.log('ℹ️ 批注已存在，跳過重複處理');
          return;
        }
        
        // 如果使用 essay_id 過濾器，需要驗證段落是否屬於當前文章
        if (paragraphIds.length > 50) {
          const paragraph = this.paragraphs?.find(p => p.id === payload.new.paragraph_id);
          if (!paragraph) {
            console.log('⚠️ 批注不屬於當前文章，跳過處理');
            return;
          }
        }
        
        // 獲取段落的 order_index
        const paragraph = this.paragraphs?.find(p => p.id === payload.new.paragraph_id);
        const paragraphOrderIndex = paragraph?.order_index || 0;
        
        this.annotations.set(payload.new.id, {
          ...payload.new,
          paragraph_order_index: paragraphOrderIndex
        });
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
        filter: filter
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
        filter: filter
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
   * 清理 Realtime 監聽器
   */
  cleanupRealtimeListener() {
    if (this.realtimeChannel) {
      console.log('🧹 清理 Realtime 監聽器');
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
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
    
    // 清理連接線
    this.clearConnectionLines();
    
    // 清理 Realtime 監聽器
    this.cleanupRealtimeListener();
    
    // 移除事件監聽器
    document.removeEventListener('mouseup', this.boundHandleTextSelection);
    document.removeEventListener('keyup', this.boundHandleTextSelection);
    document.removeEventListener('click', this.boundHandleAnnotationClick);
    
    // 重置狀態
    this.isInitialized = false;
    this.annotations.clear();
    this.paragraphs = null;
    this.currentEssayId = null;
    this.currentParagraphId = null;
  }
}

export default AnnotationManager;
