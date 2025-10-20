/**
 * Dialog 對話框系統（單例模式）
 * 提供統一優雅的確認、提示對話框
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
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: dialogFadeIn 0.2s ease-out;
        }
        
        .dialog-content {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 28rem;
          width: 100%;
          overflow: hidden;
          animation: dialogSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .dialog-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .dialog-header.confirm {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }
        
        .dialog-header.warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        }
        
        .dialog-header.info {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        }
        
        .dialog-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .dialog-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        
        .dialog-body {
          padding: 1.5rem;
          color: #374151;
          line-height: 1.6;
        }
        
        .dialog-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        
        .dialog-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .dialog-btn-cancel {
          background: #e5e7eb;
          color: #374151;
        }
        
        .dialog-btn-cancel:hover {
          background: #d1d5db;
        }
        
        .dialog-btn-confirm {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }
        
        .dialog-btn-confirm:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }
        
        .dialog-btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        
        .dialog-btn-danger:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }
        
        .dialog-btn-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }
        
        .dialog-btn-warning:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
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

    // 圖標映射
    const icons = {
      danger: '<i class="fas fa-exclamation-triangle text-red-500"></i>',
      warning: '<i class="fas fa-exclamation-circle text-orange-500"></i>',
      info: '<i class="fas fa-info-circle text-blue-500"></i>'
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

    cancelBtn.addEventListener('click', () => {
      this.close();
      onCancel();
    });

    confirmBtn.addEventListener('click', () => {
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

    return this;
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

    // 添加淡出動畫
    const overlay = this.currentDialog;
    overlay.style.animation = 'dialogFadeOut 0.2s ease-in';
    const content = overlay.querySelector('.dialog-content');
    if (content) {
      content.style.animation = 'dialogSlideOut 0.2s ease-in';
    }

    // 動畫結束後移除
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
      this.currentDialog = null;
    }, 200);
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

export default window.__dialogInstance;

