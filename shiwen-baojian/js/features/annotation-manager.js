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
    this.paragraphIds = [];
    this.paragraphElements = new Map();
    this.realtimeChannels = [];
    
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
  async init(essayId, paragraphInfo) {
    // 防止重複初始化
    if (this.isInitialized) {
      console.log('ℹ️ 批注系統已初始化，跳過重複初始化');
      return;
    }
    
    console.log('🚀 初始化批注系統:', { essayId, paragraphInfo });
    this.currentEssayId = essayId;
    this.paragraphIds = Array.isArray(paragraphInfo)
      ? paragraphInfo.filter(p => p && p.id).map(p => p.id)
      : paragraphInfo
        ? [typeof paragraphInfo === 'string' ? paragraphInfo : paragraphInfo.id]
        : [];
    this.paragraphIds = Array.from(new Set(this.paragraphIds.filter(Boolean)));
    if (this.paragraphIds.length === 0) {
      this.refreshParagraphElements();
      this.paragraphIds = Array.from(this.paragraphElements.keys());
    }
    this.currentParagraphId = this.paragraphIds[0] || null;
    
    this.refreshParagraphElements();
    
    // 加載現有批注
    await this.loadAllAnnotations();
    
    // 啟用文本選擇模式
    this.enableSelectionMode();
    
    // 設置 Realtime 監聽
    this.setupRealtimeListener();
    
    this.isInitialized = true;
    console.log('✅ 批注系統初始化完成');
  }

  /**
   * 重新整理段落元素映射
   */
  refreshParagraphElements() {
    this.paragraphElements.clear();
    const nodes = document.querySelectorAll('#essayViewer [data-paragraph-id]');
    nodes.forEach(node => {
      const paragraphId = node.dataset.paragraphId;
      if (paragraphId) {
        this.paragraphElements.set(paragraphId, node);
      }
    });
  }

  /**
   * 取得段落元素
   */
  getParagraphElement(paragraphId) {
    if (!paragraphId) return null;
    if (this.paragraphElements.has(paragraphId)) {
      return this.paragraphElements.get(paragraphId);
    }
    const node = document.querySelector(`#essayViewer [data-paragraph-id="${paragraphId}"]`);
    if (node) {
      this.paragraphElements.set(paragraphId, node);
      return node;
    }
    return null;
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
    if (!selection || selection.rangeCount === 0) {
      this.hideAnnotationButton();
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    if (range.collapsed) {
      this.hideAnnotationButton();
      return;
    }

    const startElement = (range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement);
    const endElement = (range.endContainer.nodeType === Node.ELEMENT_NODE
      ? range.endContainer
      : range.endContainer.parentElement);

    const paragraphElement = startElement?.closest?.('[data-paragraph-id]');
    const endParagraphElement = endElement?.closest?.('[data-paragraph-id]');

    if (!paragraphElement || !endParagraphElement || paragraphElement !== endParagraphElement) {
      this.hideAnnotationButton();
      return;
    }

    const paragraphId = paragraphElement.dataset.paragraphId;
    if (!paragraphId) {
      this.hideAnnotationButton();
      return;
    }

    this.currentParagraphId = paragraphId;
    if (!this.paragraphIds.includes(paragraphId)) {
      this.paragraphIds.push(paragraphId);
    }

    const offsets = this.calculateOffsets(range, paragraphElement);
    if (!offsets || offsets.end <= offsets.start) {
      this.hideAnnotationButton();
      return;
    }
    
    const selectedText = range.toString();
    if (!selectedText.trim()) {
      this.hideAnnotationButton();
      return;
    }

    this.selectedText = {
      text: selectedText,
      range,
      paragraphId,
      paragraphElement,
      startOffset: offsets.start,
      endOffset: offsets.end,
      offsets
    };
    
    console.log('✅ 文本選擇完成，顯示批注按鈕');
    // 顯示批注按鈕
    this.showAnnotationButton(event);
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
    `;

    const selectionRect = this.selectedText?.range?.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const fallbackLeft = event?.pageX ? event.pageX + 10 : 0;
    const fallbackTop = event?.pageY ? event.pageY - 40 : 0;

    const positionLeft = selectionRect ? selectionRect.right + scrollX + 10 : fallbackLeft;
    const positionTop = selectionRect ? selectionRect.top + scrollY - 40 : fallbackTop;

    button.style.left = `${Math.max(0, positionLeft)}px`;
    button.style.top = `${Math.max(0, positionTop)}px`;
    
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
    if (!this.selectedText || !this.selectedText.range) return;
    
    try {
      const range = this.selectedText.range.cloneRange();
      // 創建高亮元素
      const highlight = document.createElement('span');
      highlight.className = 'annotation-highlight';
      if (this.selectedText?.paragraphId) {
        highlight.dataset.paragraphId = this.selectedText.paragraphId;
      }
      highlight.dataset.tempAnnotation = 'true';
      highlight.style.cssText = `
        background-color: ${AnnotationManager.CONSTANTS.HIGHLIGHT_BG};
        border-bottom: 2px solid ${AnnotationManager.CONSTANTS.HIGHLIGHT_BORDER};
        padding: 1px 2px;
        border-radius: 2px;
        position: relative;
        z-index: 1;
      `;
      
      // 用高亮元素包圍選中的文字
      range.surroundContents(highlight);
      
      // 保存高亮元素引用，以便取消時移除
      this.tempHighlight = highlight;
      
      console.log('✅ 文字已立即高亮');
    } catch (error) {
      console.log('⚠️ 無法立即高亮文字:', error);
    }
  }

  /**
   * 取得批注對應的根容器（此處為論文呈現區塊）
   */
  getAnnotationRoot(paragraphId = null) {
    if (paragraphId) {
      const paragraphElement = this.getParagraphElement(paragraphId);
      if (paragraphElement) {
        return paragraphElement;
      }
    }
    return document.getElementById('essayViewer');
  }

  /**
   * 計算文字選取在根容器內的絕對偏移量
   */
  calculateOffsets(range, root) {
    if (!root) return null;

    try {
      const startRange = range.cloneRange();
      startRange.selectNodeContents(root);
      startRange.setEnd(range.startContainer, range.startOffset);
      const start = startRange.toString().length;
      const selectionLength = range.toString().length;
      const end = start + selectionLength;
      return {
        start,
        end
      };
    } catch (error) {
      console.log('⚠️ 無法計算選取偏移量:', error);
      return null;
    }
  }

  /**
   * 建立錨定上下文
   */
  buildAnchorContext(range, root, offsets) {
    if (!root || !offsets) return null;
    try {
      const textContent = root.textContent || '';
      const before = textContent.slice(Math.max(0, offsets.start - 50), offsets.start);
      const after = textContent.slice(offsets.end, Math.min(textContent.length, offsets.end + 50));
      return {
        before,
        after,
        paragraph_id: root.dataset?.paragraphId || null,
        start_offset: offsets.start,
        end_offset: offsets.end
      };
    } catch (error) {
      console.log('⚠️ 建立錨定上下文失敗:', error);
      return null;
    }
  }

  /**
   * 根據絕對偏移量尋找對應的文字節點與相對偏移
   */
  findNodeForOffset(root, targetOffset) {
    if (typeof targetOffset !== 'number' || targetOffset < 0) {
      return null;
    }

    const textNodes = this.getTextNodes(root);
    let cumulative = 0;

    for (const node of textNodes) {
      const nodeLength = node.textContent.length;
      const nextCumulative = cumulative + nodeLength;

      if (targetOffset <= nextCumulative) {
        return {
          node,
          offset: Math.min(nodeLength, targetOffset - cumulative)
        };
      }

      cumulative = nextCumulative;
    }

    // 若偏移量剛好等於全文長度，使用最後一個節點
    const lastNode = textNodes[textNodes.length - 1];
    if (lastNode) {
      return {
        node: lastNode,
        offset: lastNode.textContent.length
      };
    }

    return null;
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

    if (!this.selectedText.paragraphId) {
      console.log('❌ 無法識別段落，取消批注');
      if (toast?.error) {
        toast.error('找不到對應段落，無法添加批註');
      }
      return;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      console.log('❌ 無法取得當前用戶資訊');
      if (toast?.error) {
        toast.error('未能識別當前教師，請重新登入後重試');
      }
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
      const anchorContext = this.buildAnchorContext(
        this.selectedText.range,
        this.selectedText.paragraphElement,
        this.selectedText.offsets
      );

      const insertPayload = {
        paragraph_id: this.selectedText.paragraphId,
        teacher_id: currentUser.id,
        content,
        annotation_type: 'comment',
        highlight_start: this.selectedText.startOffset,
        highlight_end: this.selectedText.endOffset,
        anchor_text: this.selectedText.text,
        anchor_context: anchorContext
      };

      const { data, error } = await this.supabase
        .from('annotations')
        .insert(insertPayload)
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .single();
      
      if (error) throw error;

      const annotationRecord = data;
      const annotationId = annotationRecord.id;
      if (!annotationId) {
        throw new Error('無法取得新批注的識別碼');
      }
      
      // 添加批注到本地存儲
      this.annotations.set(annotationId, annotationRecord);
      
      // 渲染批注
      this.renderAnnotation(annotationId);
      this.updateAnnotationCount();
      
      // 清除選擇和臨時高亮引用
      window.getSelection().removeAllRanges();
      this.selectedText = null;
      if (this.tempHighlight && this.tempHighlight.parentNode) {
        try {
          const parent = this.tempHighlight.parentNode;
          while (this.tempHighlight.firstChild) {
            parent.insertBefore(this.tempHighlight.firstChild, this.tempHighlight);
          }
          parent.removeChild(this.tempHighlight);
        } catch (cleanupError) {
          console.log('⚠️ 清理臨時高亮失敗:', cleanupError);
        }
      }
      this.tempHighlight = null; // 清除臨時高亮引用，因為已成為永久批註
      this.hideAnnotationButton();
      
      console.log('✅ 批注創建成功，ID:', annotationId);
      
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
        cleanup();
        resolve(content);
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
    
    // 備用：從 Supabase 會話獲取
    try {
      // 使用同步方式獲取當前會話
      const session = this.supabase.auth.session;
      if (session?.user) {
        console.log('✅ 從 Supabase 會話獲取用戶信息:', session.user.email);
        return session.user;
      }
    } catch (error) {
      console.warn('⚠️ 無法獲取會話信息:', error);
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
   * 取得批註作者資訊（姓名與首字母）
   */
  getAnnotationAuthorInfo(annotation) {
    const teacherProfile = annotation?.teacher;
    if (teacherProfile?.display_name) {
      const name = teacherProfile.display_name;
      return {
        name,
        initials: this.computeInitials(name)
      };
    }

    const currentUser = this.getCurrentUser();
    if (annotation?.teacher_id && currentUser?.id === annotation.teacher_id) {
      const name = this.getCurrentUserName();
      return {
        name,
        initials: this.computeInitials(name)
      };
    }

    if (teacherProfile?.email) {
      const emailName = teacherProfile.email.split('@')[0];
      return {
        name: emailName,
        initials: this.computeInitials(emailName)
      };
    }

    const fallbackName = '老師';
    return {
      name: fallbackName,
      initials: this.computeInitials(fallbackName)
    };
  }

  /**
   * 根據名字計算首字母
   */
  computeInitials(name) {
    if (!name) return 'T';
    const trimmed = String(name).trim();
    if (!trimmed) return 'T';
    return trimmed.charAt(0).toUpperCase();
  }

  /**
   * 簡易轉義 HTML 字符
   */
  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

    this.refreshParagraphElements();
    
    console.log('🎨 渲染批注:', annotation);
    
    // 檢查是否已經渲染過這個批注
    const existingHighlight = document.querySelector(`.annotation-highlight[data-annotation-id="${annotationId}"]`);
    if (existingHighlight) {
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
    
    // 按 highlight_start 排序
    const sortedAnnotations = allAnnotations.sort((a, b) => {
      if (a === activeElement) return 0;
      if (b === activeElement) return 0;
      
      const aId = a.dataset.annotationId;
      const bId = b.dataset.annotationId;
      if (!aId) return -1;
      if (!bId) return 1;
      
      const aData = this.annotations.get(aId);
      const bData = this.annotations.get(bId);
      return (aData?.highlight_start || 0) - (bData?.highlight_start || 0);
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
    
    // 按 highlight_start 排序
    const sortedAnnotations = allAnnotations.sort((a, b) => {
      const aId = a.dataset.annotationId;
      const bId = b.dataset.annotationId;
      
      // 處理輸入框（沒有 annotationId）
      if (!aId) return -1;
      if (!bId) return 1;
      
      const aData = this.annotations.get(aId);
      const bData = this.annotations.get(bId);
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
    if (!highlight) {
      console.log('❌ 找不到對應的高亮元素');
      return;
    }
    
    const authorInfo = this.getAnnotationAuthorInfo(annotation);
    const authorName = this.escapeHtml(authorInfo.name);
    const authorInitials = this.escapeHtml(authorInfo.initials);
    const safeContent = this.escapeHtml(annotation.content).replace(/\n/g, '<br>');
    const isOrphan = !!annotation.is_orphaned;

    // 創建浮動批注容器
    const floatingAnnotation = document.createElement('div');
    floatingAnnotation.className = `floating-annotation${isOrphan ? ' orphan' : ''}`;
    floatingAnnotation.dataset.annotationId = annotationId;

    // 批注內容
    floatingAnnotation.innerHTML = `
      <div class="annotation-header">
        <div class="annotation-avatar">${authorInitials}</div>
        <div class="annotation-author">${authorName}</div>
        <div class="annotation-time">${this.formatTime(annotation.created_at)}</div>
      </div>
      <div class="annotation-content">${safeContent}</div>
      ${isOrphan ? `
        <div class="annotation-status orphan">
          <i class="fas fa-circle-notch mr-1"></i>原文已修改
        </div>
      ` : ''}
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
    const paragraphElement = this.getAnnotationRoot(annotation.paragraph_id);
    if (!paragraphElement) {
      console.log('❌ 找不到段落元素，paragraph_id:', annotation.paragraph_id);
      return;
    }

    const existingMarker = paragraphElement.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (existingMarker) {
      console.log('ℹ️ 高亮或占位符已存在，跳過重新建立');
      return;
    }

    const hasValidOffsets = typeof annotation.highlight_start === 'number'
      && typeof annotation.highlight_end === 'number'
      && annotation.highlight_end > annotation.highlight_start;

    if (annotation.is_orphaned) {
      console.log('ℹ️ 批注為孤立狀態，產生灰色占位符');
      this.renderOrphanPlaceholder(paragraphElement, annotationId, annotation, annotation.highlight_start);
      return;
    }

    let startInfo = hasValidOffsets
      ? this.findNodeForOffset(paragraphElement, annotation.highlight_start)
      : null;
    let endInfo = hasValidOffsets
      ? this.findNodeForOffset(paragraphElement, annotation.highlight_end)
      : null;

    if ((!startInfo || !endInfo) && annotation.anchor_text) {
      const paragraphText = paragraphElement.textContent || '';
      const anchorIndex = paragraphText.indexOf(annotation.anchor_text);
      if (anchorIndex >= 0) {
        startInfo = this.findNodeForOffset(paragraphElement, anchorIndex);
        endInfo = this.findNodeForOffset(paragraphElement, anchorIndex + annotation.anchor_text.length);
      }
    }

    if (!startInfo || !endInfo) {
      console.log('⚠️ 無法定位批注，使用灰色占位符');
      this.renderOrphanPlaceholder(paragraphElement, annotationId, annotation, annotation.highlight_start);
      return;
    }

    try {
      const range = document.createRange();
      range.setStart(startInfo.node, startInfo.offset);
      range.setEnd(endInfo.node, endInfo.offset);

      const highlight = document.createElement('span');
      highlight.className = 'annotation-highlight';
      highlight.dataset.annotationId = annotationId;
      if (annotation.paragraph_id) {
        highlight.dataset.paragraphId = annotation.paragraph_id;
      }

      try {
        range.surroundContents(highlight);
      } catch (error) {
        console.log('⚠️ surroundContents 失敗，改用 extractContents:', error);
        const fragment = range.extractContents();
        highlight.appendChild(fragment);
        range.insertNode(highlight);
      }
      console.log('✅ 文本高亮已添加');

      this.bindHighlightInteractions(highlight, annotationId);
    } catch (error) {
      console.log('⚠️ 高亮文本失敗，使用灰色占位符:', error);
      this.renderOrphanPlaceholder(paragraphElement, annotationId, annotation, annotation.highlight_start);
    }
  }

  /**
   * 綁定高亮交互行為
   */
  bindHighlightInteractions(element, annotationId) {
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🖱️ 點擊高亮文本:', annotationId);
      this.highlightAnnotation(annotationId);
    });
  }

  /**
   * 渲染孤立批註占位符
   */
  renderOrphanPlaceholder(root, annotationId, annotation, fallbackOffset = null) {
    const placeholder = document.createElement('span');
    placeholder.className = 'annotation-highlight annotation-highlight-orphan';
    placeholder.dataset.annotationId = annotationId;
    if (annotation.paragraph_id) {
      placeholder.dataset.paragraphId = annotation.paragraph_id;
    }
    placeholder.dataset.orphan = 'true';
    placeholder.textContent = '原文已修改';
    if (annotation.anchor_text) {
      const preview = annotation.anchor_text.length > 60
        ? `${annotation.anchor_text.slice(0, 60)}…`
        : annotation.anchor_text;
      placeholder.title = `原文字句：「${preview}」`;
    } else {
      placeholder.title = '原文已修改';
    }

    this.insertNodeAtOffset(root, placeholder, fallbackOffset);
    this.bindHighlightInteractions(placeholder, annotationId);
  }

  /**
   * 依照偏移量插入節點
   */
  insertNodeAtOffset(root, node, targetOffset) {
    if (!root) return;
    if (typeof targetOffset !== 'number' || targetOffset < 0) {
      root.appendChild(node);
      return;
    }
    const positionInfo = this.findNodeForOffset(root, targetOffset);
    if (positionInfo && positionInfo.node) {
      const range = document.createRange();
      range.setStart(positionInfo.node, positionInfo.offset);
      range.collapse(true);
      range.insertNode(node);
    } else {
      root.appendChild(node);
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
      if (node.textContent.length) {
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
    const paragraphElement = this.getAnnotationRoot(annotation.paragraph_id);
    if (paragraphElement) {
      this.renderOrphanPlaceholder(paragraphElement, annotationId, annotation, annotation.highlight_start);
    }
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
      this.updateAnnotationCount();
      
      toast.success('批注已刪除');
      
    } catch (error) {
      console.error('❌ 刪除批注失敗:', error);
      toast.error('刪除批注失敗: ' + error.message);
    }
      }
    });
  }

  /**
   * 加載現有批注
   */
  async loadAllAnnotations() {
    console.log('📥 加載全部批注:', this.paragraphIds);
    this.annotations.clear();

    // 清理現有標記與浮動批注
    document.querySelectorAll('.annotation-highlight, .floating-annotation').forEach(node => node.remove());

    if (!this.paragraphIds || this.paragraphIds.length === 0) {
      console.log('ℹ️ 沒有段落可載入批注');
      this.updateAnnotationCount();
      return;
    }

    for (const paragraphId of this.paragraphIds) {
      await this.loadAnnotationsForParagraph(paragraphId);
    }

    this.updateAnnotationCount();

    // 調整所有批註位置，確保不重疊
    setTimeout(() => {
      this.adjustAllAnnotations();
    }, 200);
  }

  /**
   * 加載指定段落的批注
   */
  async loadAnnotationsForParagraph(paragraphId) {
    if (!paragraphId) return;
    console.log('📥 加載段落批注:', paragraphId);

    try {
      const { data, error } = await this.supabase
        .from('annotations')
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .eq('paragraph_id', paragraphId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ 加載段落批注失敗:', error);
        throw error;
      }

      (data || []).forEach(annotation => {
        const annotationId = annotation.id;
        if (!annotationId) {
          console.log('⚠️ 批注沒有有效的 ID:', annotation);
          return;
        }
        this.annotations.set(annotationId, annotation);
        this.renderAnnotation(annotationId);
      });

      console.log(`✅ 段落 ${paragraphId} 已加載 ${(data || []).length} 個批注`);
    } catch (error) {
      console.error('❌ 加載批注失敗:', error);
      if (toast?.error) {
        toast.error('加載批注失敗: ' + error.message);
      }
    }
  }

  /**
   * 取得單筆批注詳細資料
   */
  async fetchAnnotationById(annotationId) {
    try {
      const { data, error } = await this.supabase
        .from('annotations')
        .select('*, teacher:users!annotations_teacher_id_fkey(display_name, email)')
        .eq('id', annotationId)
        .single();

      if (error) {
        console.error('❌ 無法獲取批注資料:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ 擷取批注資料失敗:', error);
      return null;
    }
  }

  /**
   * 設置 Realtime 監聽
   */
  setupRealtimeListener() {
    if (!this.paragraphIds || this.paragraphIds.length === 0) return;

    // 移除既有頻道
    this.realtimeChannels.forEach(channel => {
      try {
        this.supabase.removeChannel(channel);
      } catch (error) {
        console.log('⚠️ 移除舊頻道失敗:', error);
      }
    });
    this.realtimeChannels = [];

    this.paragraphIds.forEach(paragraphId => {
      const channel = this.supabase
        .channel(`annotations-${paragraphId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'annotations',
          filter: `paragraph_id=eq.${paragraphId}`
        }, async (payload) => {
          console.log('🔄 收到新批注:', payload.new);
          
          const annotationId = payload.new?.id;
          if (!annotationId || this.annotations.has(annotationId)) {
            console.log('ℹ️ 批注已存在或缺少 ID，跳過');
            return;
          }

          const annotation = await this.fetchAnnotationById(annotationId);
          if (!annotation) return;

          this.annotations.set(annotationId, annotation);
          this.renderAnnotation(annotationId);
          this.updateAnnotationCount();

          const currentUserId = this.getCurrentUser()?.id;
          if (toast?.info && annotation.teacher_id !== currentUserId) {
            toast.info('收到新批注');
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'annotations',
          filter: `paragraph_id=eq.${paragraphId}`
        }, async (payload) => {
          console.log('🔄 批注已更新:', payload.new);
          const annotationId = payload.new?.id;
          if (!annotationId) return;

          const annotation = await this.fetchAnnotationById(annotationId);
          if (!annotation) return;

          this.annotations.set(annotationId, annotation);
          this.updateAnnotationHighlight(annotationId);
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'annotations',
          filter: `paragraph_id=eq.${paragraphId}`
        }, (payload) => {
          console.log('🔄 批注已刪除:', payload.old);
          const annotationId = payload.old?.id;
          if (!annotationId) return;

          this.annotations.delete(annotationId);
          const markers = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
          markers.forEach(marker => marker.remove());
          this.updateAnnotationCount();
        })
        .subscribe();

      this.realtimeChannels.push(channel);
    });
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
    
    // 移除事件監聽器
    document.removeEventListener('mouseup', this.boundHandleTextSelection);
    document.removeEventListener('keyup', this.boundHandleTextSelection);
    document.removeEventListener('click', this.boundHandleAnnotationClick);
  }
}

export default AnnotationManager;
