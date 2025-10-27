/**
 * 批注重新定位管理器
 * 負責處理學生修改文本後的批注重新定位和孤立批注處理
 */

import toast from '../ui/toast.js';

class AnnotationRepositioningManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.repositioningQueue = new Map(); // 重新定位隊列
    this.isProcessing = false;
  }

  /**
   * 初始化批注重新定位系統
   */
  async init(essayId) {
    console.log('🚀 初始化批注重新定位系統:', essayId);
    
    // 監聽段落內容變化
    this.setupContentChangeListener();
    
    // 定期處理重新定位隊列
    this.startRepositioningProcessor();
    
    console.log('✅ 批注重新定位系統初始化完成');
  }

  /**
   * 設置內容變化監聽器
   */
  setupContentChangeListener() {
    // 監聽編輯器內容變化
    const editors = document.querySelectorAll('.ql-editor');
    editors.forEach(editor => {
      editor.addEventListener('input', (e) => {
        this.handleContentChange(e.target);
      });
    });

    // 監聽段落內容變化（通過 MutationObserver）
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target = mutation.target;
          if (target.classList && target.classList.contains('ql-editor')) {
            this.handleContentChange(target);
          }
        }
      });
    });

    // 開始觀察
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * 處理內容變化
   */
  async handleContentChange(editor) {
    const paragraphId = this.getParagraphIdFromEditor(editor);
    if (!paragraphId) return;

    console.log('📝 檢測到內容變化:', paragraphId);
    
    // 延遲處理，避免頻繁觸發
    clearTimeout(this.repositioningTimeout);
    this.repositioningTimeout = setTimeout(() => {
      this.repositionAnnotationsForParagraph(paragraphId);
    }, 1000); // 1秒延遲
  }

  /**
   * 從編輯器獲取段落ID
   */
  getParagraphIdFromEditor(editor) {
    // 查找最近的段落容器
    const paragraphContainer = editor.closest('[data-paragraph-id]');
    if (paragraphContainer) {
      return paragraphContainer.dataset.paragraphId;
    }
    
    // 如果沒有找到，嘗試從編輯器ID推斷
    const editorId = editor.id;
    if (editorId.includes('intro')) return 'intro';
    if (editorId.includes('conclusion')) return 'conclusion';
    if (editorId.includes('argument')) {
      const match = editorId.match(/argument-(\d+)/);
      if (match) return `argument-${match[1]}`;
    }
    
    return null;
  }

  /**
   * 重新定位段落的所有批注
   */
  async repositionAnnotationsForParagraph(paragraphId) {
    try {
      console.log('🔄 重新定位批注:', paragraphId);
      
      // 獲取該段落的所有批注
      const { data: annotations, error } = await this.supabase
        .from('annotations')
        .select('*')
        .eq('paragraph_id', paragraphId)
        .eq('is_orphaned', false);

      if (error) {
        console.error('❌ 獲取批注失敗:', error);
        return;
      }

      if (!annotations || annotations.length === 0) {
        console.log('ℹ️ 沒有找到需要重新定位的批注');
        return;
      }

      // 獲取當前段落內容
      const currentContent = this.getCurrentParagraphContent(paragraphId);
      if (!currentContent) {
        console.log('❌ 無法獲取段落內容');
        return;
      }

      // 重新定位每個批注
      for (const annotation of annotations) {
        await this.repositionAnnotation(annotation, currentContent);
      }

      // 檢查孤立批注
      await this.checkOrphanedAnnotations(paragraphId);

      // 避免頻繁觸發，請求學生端批註視圖重新渲染（主要調整浮動卡片位置）
      this.requestViewerRerender();

    } catch (error) {
      console.error('❌ 重新定位批注失敗:', error);
    }
  }

  /**
   * 請求學生端批註視圖重新渲染（節流）
   */
  requestViewerRerender() {
    clearTimeout(this._rerenderTimer);
    this._rerenderTimer = setTimeout(() => {
      try {
        const viewer = window.studentAnnotationViewer;
        if (viewer && typeof viewer.renderAll === 'function') {
          viewer.renderAll();
        }
      } catch (e) {
        // 忽略錯誤
      }
    }, 300);
  }

  /**
   * 重新定位單個批注
   */
  async repositionAnnotation(annotation, currentContent) {
    try {
      if (!annotation.anchor_text) {
        console.log('ℹ️ 批注沒有錨定文本，跳過:', annotation.id);
        return;
      }

      // 嘗試在當前內容中找到錨定文本
      const anchorIndex = currentContent.indexOf(annotation.anchor_text);
      
      if (anchorIndex >= 0) {
        // 找到錨定文本，更新位置
        const newStart = anchorIndex;
        const newEnd = anchorIndex + annotation.anchor_text.length;
        
        const { error } = await this.supabase
          .from('annotations')
          .update({
            highlight_start: newStart,
            highlight_end: newEnd,
            is_orphaned: false,
            repositioned_at: new Date().toISOString()
          })
          .eq('id', annotation.id);

        if (error) {
          console.error('❌ 更新批注位置失敗:', error);
        } else {
          console.log('✅ 批注重新定位成功:', annotation.id);
        }
      } else {
        // 沒有找到錨定文本，標記為孤立
        const { error } = await this.supabase
          .from('annotations')
          .update({
            is_orphaned: true,
            repositioned_at: new Date().toISOString()
          })
          .eq('id', annotation.id);

        if (error) {
          console.error('❌ 標記孤立批注失敗:', error);
        } else {
          console.log('⚠️ 批注標記為孤立:', annotation.id);
        }
      }

    } catch (error) {
      console.error('❌ 重新定位批注失敗:', error);
    }
  }

  /**
   * 獲取當前段落內容
   */
  getCurrentParagraphContent(paragraphId) {
    // 根據段落ID找到對應的編輯器
    let editor;
    
    if (paragraphId === 'intro') {
      editor = document.getElementById('intro-editor');
    } else if (paragraphId === 'conclusion') {
      editor = document.getElementById('conclusion-editor');
    } else if (paragraphId.startsWith('argument-')) {
      const argumentIndex = paragraphId.split('-')[1];
      editor = document.getElementById(`argument-${argumentIndex}-editor`);
    }
    
    if (editor) {
      // 獲取純文本內容
      return editor.textContent || editor.innerText || '';
    }
    
    return null;
  }

  /**
   * 檢查孤立批注
   */
  async checkOrphanedAnnotations(paragraphId) {
    try {
      const { data: orphanedAnnotations, error } = await this.supabase
        .from('annotations')
        .select('*')
        .eq('paragraph_id', paragraphId)
        .eq('is_orphaned', true);

      if (error) {
        console.error('❌ 獲取孤立批注失敗:', error);
        return;
      }

      if (orphanedAnnotations && orphanedAnnotations.length > 0) {
        console.log('⚠️ 發現孤立批注:', orphanedAnnotations.length);
        
        // 顯示孤立批注通知
        toast.warning(`發現 ${orphanedAnnotations.length} 個孤立批注，這些批注的原始文本已被修改`);
        
        // 可以選擇顯示孤立批注列表
        this.showOrphanedAnnotationsList(orphanedAnnotations);
      }

    } catch (error) {
      console.error('❌ 檢查孤立批注失敗:', error);
    }
  }

  /**
   * 顯示孤立批注列表
   */
  showOrphanedAnnotationsList(orphanedAnnotations) {
    // 創建孤立批注通知
    const notification = document.createElement('div');
    notification.className = 'orphaned-annotations-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <i class="fas fa-exclamation-triangle text-yellow-500"></i>
          <span>孤立批注提醒</span>
          <button class="close-notification">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="notification-body">
          <p>以下批注的原始文本已被修改，無法自動定位：</p>
          <ul class="orphaned-list">
            ${orphanedAnnotations.map(annotation => `
              <li>
                <strong>${annotation.anchor_text || '未知文本'}</strong>
                <span class="annotation-content">${annotation.content}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    // 添加到頁面
    document.body.appendChild(notification);

    // 綁定關閉事件
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(notification);
    });

    // 自動關閉
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 10000);
  }

  /**
   * 手動重新定位批注
   */
  async manualRepositionAnnotation(annotationId, newAnchorText) {
    try {
      console.log('🔧 手動重新定位批注:', annotationId, newAnchorText);
      
      const { data, error } = await this.supabase
        .rpc('reposition_annotation', {
          annotation_id: annotationId,
          new_anchor_text: newAnchorText
        });

      if (error) {
        console.error('❌ 手動重新定位失敗:', error);
        throw error;
      }

      if (data) {
        toast.success('批注重新定位成功');
        return true;
      } else {
        toast.warning('批注重新定位失敗，文本可能不存在');
        return false;
      }

    } catch (error) {
      console.error('❌ 手動重新定位失敗:', error);
      toast.error('重新定位失敗: ' + error.message);
      return false;
    }
  }

  /**
   * 獲取孤立批注
   */
  async getOrphanedAnnotations(paragraphId) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_orphaned_annotations', {
          paragraph_id_param: paragraphId
        });

      if (error) {
        console.error('❌ 獲取孤立批注失敗:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ 獲取孤立批注失敗:', error);
      return [];
    }
  }

  /**
   * 開始重新定位處理器
   */
  startRepositioningProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.repositioningQueue.size > 0) {
        this.processRepositioningQueue();
      }
    }, 5000); // 每5秒檢查一次
  }

  /**
   * 處理重新定位隊列
   */
  async processRepositioningQueue() {
    this.isProcessing = true;
    
    try {
      for (const [paragraphId, callback] of this.repositioningQueue) {
        await this.repositionAnnotationsForParagraph(paragraphId);
        if (callback) callback();
      }
      
      this.repositioningQueue.clear();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 銷毀重新定位管理器
   */
  destroy() {
    console.log('🗑️ 銷毀批注重新定位管理器');
    
    if (this.repositioningTimeout) {
      clearTimeout(this.repositioningTimeout);
    }
    
    this.repositioningQueue.clear();
  }
}

export default AnnotationRepositioningManager;
