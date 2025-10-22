/**
 * Dialog 對話框系統（單例模式）
 * 提供統一優雅的確認、提示對話框
 * 
 * 配色方案：青灰雅士
 * 使用設計令牌系統
 * 
 * @updated 2025-10-22 - 遷移到設計令牌系統
 */

class Dialog {
  constructor() {
    this.currentDialog = null;
    this.init();
  }

  /**
   * 初始化樣式
   */
  init() {
    // 只添加一次樣式
    if (!document.getElementById('dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'dialog-styles';
      style.textContent = `
        .dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: dialogFadeIn var(--duration-fast) var(--ease-out);
        }
        
        .dialog-content {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 28rem;
          width: 100%;
          overflow: hidden;
          animation: dialogSlideIn var(--duration-normal) var(--ease-bounce);
        }
        
        .dialog-header {
          padding: var(--spacing-6);
          border-bottom: 1px solid var(--border-secondary);
          display: flex;
          align-items: center;
          gap: var(--spacing-3);
        }
        
        .dialog-header.confirm {
          background: linear-gradient(135deg, var(--error-100) 0%, var(--error-200) 100%);
        }
        
        .dialog-header.warning {
          background: linear-gradient(135deg, var(--warning-100) 0%, var(--warning-200) 100%);
        }
        
        .dialog-header.info {
          background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
        }
        
        .dialog-icon {
          font-size: var(--text-2xl);
          flex-shrink: 0;
        }
        
        .dialog-title {
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--gray-900);
          margin: 0;
        }
        
        .dialog-body {
          padding: var(--spacing-6);
          color: var(--text-primary);
          line-height: var(--leading-relaxed);
        }
        
        .dialog-footer {
          padding: var(--spacing-4) var(--spacing-6);
          border-top: 1px solid var(--border-secondary);
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-3);
        }
        
        .dialog-btn {
          padding: var(--spacing-2) var(--spacing-4);
          border-radius: var(--radius-md);
          font-weight: var(--font-medium);
          transition: all var(--duration-fast) var(--ease-out);
          border: none;
          cursor: pointer;
          font-size: var(--text-sm);
        }
        
        .dialog-btn-cancel {
          background: var(--gray-200);
          color: var(--text-primary);
        }
        
        .dialog-btn-cancel:hover {
          background: var(--gray-300);
        }
        
        .dialog-btn-confirm {
          background: var(--btn-primary-bg);
          color: var(--btn-primary-text);
        }
        
        .dialog-btn-confirm:hover {
          background: var(--btn-primary-hover);
        }
        
        .dialog-btn-danger {
          background: var(--btn-danger-bg);
          color: var(--btn-danger-text);
        }
        
        .dialog-btn-danger:hover {
          background: var(--btn-danger-hover);
        }
        
        .dialog-btn-warning {
          background: var(--btn-warning-bg);
          color: var(--btn-warning-text);
        }
        
        .dialog-btn-warning:hover {
          background: var(--btn-warning-hover);
        }
        
        @keyframes dialogFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes dialogSlideIn {
          from {
            transform: translateY(-50px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes dialogFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes dialogSlideOut {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-50px) scale(0.95);
            opacity: 0;
          }
        }
        
        @media (max-width: 640px) {
          .dialog-content {
            max-width: 100%;
            margin: 1rem;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 顯示確認對話框
   * @param {Object} options - 配置選項
   * @param {string} options.title - 標題
   * @param {string} options.message - 消息內容（支持 HTML）
   * @param {string} options.type - 類型：danger, warning, info（默認 danger）
   * @param {string} options.confirmText - 確認按鈕文字（默認「確認」）
   * @param {string} options.cancelText - 取消按鈕文字（默認「取消」）
   * @param {Function} options.onConfirm - 確認回調
   * @param {Function} options.onCancel - 取消回調（可選）
   */
  confirm(options) {
    const {
      title = '確認操作',
      message = '確定要執行此操作嗎？',
      type = 'danger',  // danger, warning, info
      confirmText = '確認',
      cancelText = '取消',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;

    // 關閉現有對話框
    this.close();

    // 直接創建新對話框，不需要延遲
    this.createDialog(options);

    return this;
  }

  /**
   * 創建對話框內容
   */
  createDialog(options) {
    const {
      title = '確認操作',
      message = '確定要執行此操作嗎？',
      type = 'danger',  // danger, warning, info
      confirmText = '確認',
      cancelText = '取消',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;

    // 圖標映射（使用設計令牌）
    const icons = {
      danger: '<i class="fas fa-exclamation-triangle" style="color: var(--error-600);"></i>',
      warning: '<i class="fas fa-exclamation-circle" style="color: var(--warning-600);"></i>',
      info: '<i class="fas fa-info-circle" style="color: var(--primary-600);"></i>'
    };

    // 按鈕類型映射
    const btnTypes = {
      danger: 'dialog-btn-danger',
      warning: 'dialog-btn-warning',
      info: 'dialog-btn-confirm'
    };

    // 創建對話框
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header ${type}">
          <div class="dialog-icon">${icons[type]}</div>
          <h3 class="dialog-title">${title}</h3>
        </div>
        <div class="dialog-body">
          ${message}
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-cancel" data-action="cancel">
            ${cancelText}
          </button>
          <button class="dialog-btn ${btnTypes[type]}" data-action="confirm">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    // 綁定事件
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      onCancel();
    });

    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      onConfirm();
    });

    // 點擊遮罩關閉
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
        onCancel();
      }
    });

    // ESC 鍵關閉
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        onCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // 顯示對話框
    document.body.appendChild(overlay);
    this.currentDialog = overlay;

    // 聚焦到確認按鈕
    setTimeout(() => confirmBtn.focus(), 100);
  }

  /**
   * 顯示提示對話框（僅確認）
   */
  alert(options) {
    const {
      title = '提示',
      message = '',
      type = 'info',
      confirmText = '知道了',
      onConfirm = () => {}
    } = options;

    return this.confirm({
      title,
      message,
      type,
      confirmText,
      cancelText: null,  // 不顯示取消按鈕
      onConfirm
    });
  }

  /**
   * 關閉當前對話框
   */
  close() {
    if (!this.currentDialog) return;
    
    // 防止重複關閉
    const overlay = this.currentDialog;
    this.currentDialog = null;

    // 直接移除，不使用動畫
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
  }

  /**
   * 快捷方法：刪除確認
   */
  confirmDelete(options) {
    return this.confirm({
      title: '確認刪除',
      type: 'danger',
      confirmText: '確認刪除',
      ...options
    });
  }

  /**
   * 快捷方法：警告確認
   */
  confirmWarning(options) {
    return this.confirm({
      title: '確認操作',
      type: 'warning',
      confirmText: '確認',
      ...options
    });
  }
}

// 單例模式
if (!window.__dialogInstance) {
  window.__dialogInstance = new Dialog();
}

// 導出單例（ES6 模塊）
export default window.__dialogInstance;

