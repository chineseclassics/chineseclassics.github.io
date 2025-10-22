/**
 * Toast 通知系統
 * 優雅的消息提示組件（單例模式）
 * 
 * 配色方案：青灰雅士
 * 使用設計令牌系統
 * 
 * @updated 2025-10-22 - 遷移到設計令牌系統
 */

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * 初始化 Toast 容器
   */
  init() {
    // 🚨 檢查是否已存在容器（避免重複創建）
    let existingContainer = document.getElementById('toast-container');
    if (existingContainer) {
      this.container = existingContainer;
      return;
    }
    
    // 創建容器
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * 顯示 Toast
   * @param {string} message - 消息內容
   * @param {string} type - 類型：success, error, warning, info
   * @param {number} duration - 持續時間（毫秒）
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 圖標映射
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    // 顏色配置（使用設計令牌 - 青灰雅士）
    const colors = {
      success: {
        bg: 'var(--btn-success-bg)',  // 青松色
        text: 'var(--btn-success-text)',
        icon: 'var(--success-300)'
      },
      error: {
        bg: 'var(--btn-danger-bg)',  // 緋紅色
        text: 'var(--btn-danger-text)',
        icon: 'var(--error-300)'
      },
      warning: {
        bg: 'var(--btn-warning-bg)',  // 秋香色
        text: 'var(--btn-warning-text)',
        icon: 'var(--warning-300)'
      },
      info: {
        bg: 'var(--btn-primary-bg)',  // 青灰色
        text: 'var(--btn-primary-text)',
        icon: 'var(--primary-300)'
      }
    };
    
    toast.style.cssText = `
      background: ${colors[type].bg};
      color: ${colors[type].text};
      padding: 16px 24px;
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      min-width: 300px;
      max-width: 500px;
      pointer-events: auto;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    // 添加滑入動畫 class
    toast.classList.add('toast-slide-in');
    
    toast.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        flex-shrink: 0;
      ">
        ${icons[type]}
      </div>
      <div style="flex: 1; font-size: var(--text-sm); line-height: var(--leading-normal);">
        ${message}
      </div>
      <button class="toast-close-btn">
        ×
      </button>
    `;
    
    this.container.appendChild(toast);
    
    // 綁定關閉按鈕
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeToast(toast);
      });
    }
    
    // 🚨 自動移除
    if (duration > 0) {
      toast.autoRemoveTimer = setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }
    
    return toast;
  }
  
  /**
   * 移除 Toast（帶動畫）
   */
  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    // 清除自動移除定時器
    if (toast.autoRemoveTimer) {
      clearTimeout(toast.autoRemoveTimer);
      toast.autoRemoveTimer = null;
    }
    
    // 添加滑出動畫
    toast.classList.remove('toast-slide-in');
    toast.classList.add('toast-slide-out');
    
    // 動畫結束後移除元素
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.remove();
      }
    }, 400);
  }

  /**
   * 成功消息
   */
  success(message, duration = 1800) {
    return this.show(message, 'success', duration);
  }

  /**
   * 錯誤消息
   */
  error(message, duration = 2500) {
    return this.show(message, 'error', duration);
  }

  /**
   * 警告消息
   */
  warning(message, duration = 2000) {
    return this.show(message, 'warning', duration);
  }

  /**
   * 信息消息
   */
  info(message, duration = 1800) {
    return this.show(message, 'info', duration);
  }
}

// 🚨 只添加一次樣式（避免重複）
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    .toast-slide-in {
      animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    .toast-slide-out {
      animation: toastSlideOut 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    @keyframes toastSlideIn {
      from {
        transform: translateX(450px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes toastSlideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(450px);
        opacity: 0;
      }
    }
    
    .toast-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    
    .toast-close-btn:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    
    @media (max-width: 640px) {
      #toast-container {
        left: 20px;
        right: 20px;
        top: 20px;
      }
      
      .toast {
        min-width: auto !important;
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// 🚨 單例模式：確保全局只有一個 Toast 實例
if (!window.__toastInstance) {
  window.__toastInstance = new Toast();
}

// 導出單例（ES6 模塊）
export default window.__toastInstance;

