/**
 * Toast 通知系統
 * 優雅的消息提示組件
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
    
    // 顏色配置
    const colors = {
      success: {
        bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        icon: '#4ade80'
      },
      error: {
        bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        icon: '#f87171'
      },
      warning: {
        bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        icon: '#fbbf24'
      },
      info: {
        bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        icon: '#60a5fa'
      }
    };
    
    toast.style.cssText = `
      background: ${colors[type].bg};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 500px;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    toast.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        flex-shrink: 0;
      ">
        ${icons[type]}
      </div>
      <div style="flex: 1; font-size: 14px; line-height: 1.5;">
        ${message}
      </div>
      <button onclick="this.parentElement.remove()" style="
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
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        ×
      </button>
    `;
    
    this.container.appendChild(toast);
    
    // 自動移除
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    
    return toast;
  }

  /**
   * 成功消息
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * 錯誤消息
   */
  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  /**
   * 警告消息
   */
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  /**
   * 信息消息
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }
}

// 添加動畫樣式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
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

// 創建全局實例
const toast = new Toast();

// 導出
export default toast;

