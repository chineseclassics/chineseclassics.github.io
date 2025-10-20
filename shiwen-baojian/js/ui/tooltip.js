/**
 * Tooltip 提示系統
 * 
 * 功能：
 * - 懸停或點擊顯示提示
 * - 支持多種類型（info/success/warning/error）
 * - 自動定位
 * - 優雅的動畫效果
 * 
 * @created 2025-10-20
 * @singleton
 */

class TooltipManager {
  constructor() {
    if (TooltipManager.instance) {
      return TooltipManager.instance;
    }
    
    this.currentTooltip = null;
    this.currentTarget = null;
    this.hideTimeout = null;
    
    // 創建 tooltip 容器
    this.createTooltipContainer();
    
    // 綁定全局事件（用於點擊外部關閉）
    document.addEventListener('click', (e) => {
      if (this.currentTooltip && !this.currentTooltip.contains(e.target) && e.target !== this.currentTarget) {
        this.hide();
      }
    });
    
    TooltipManager.instance = this;
    console.log('[Tooltip] Tooltip 系統已初始化（Singleton）');
  }
  
  /**
   * 創建 tooltip 容器
   */
  createTooltipContainer() {
    const style = document.createElement('style');
    style.textContent = `
      .ui-tooltip {
        position: fixed;
        z-index: 10000;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.4;
        max-width: 280px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: none;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      
      .ui-tooltip.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .ui-tooltip.clickable {
        pointer-events: auto;
      }
      
      /* 類型樣式 */
      .ui-tooltip.info {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .ui-tooltip.success {
        background: linear-gradient(135deg, #0ba360 0%, #3cba92 100%);
        color: white;
      }
      
      .ui-tooltip.warning {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }
      
      .ui-tooltip.error {
        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        color: white;
      }
      
      /* 箭頭 */
      .ui-tooltip::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 6px solid transparent;
      }
      
      /* 箭頭位置 - 頂部顯示時，箭頭在下方 */
      .ui-tooltip.position-top::before {
        bottom: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: inherit;
        border-bottom: none;
      }
      
      /* 箭頭位置 - 底部顯示時，箭頭在上方 */
      .ui-tooltip.position-bottom::before {
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: inherit;
        border-top: none;
      }
      
      /* 箭頭顏色匹配 */
      .ui-tooltip.info::before {
        border-top-color: #667eea;
        border-bottom-color: #667eea;
      }
      
      .ui-tooltip.success::before {
        border-top-color: #0ba360;
        border-bottom-color: #0ba360;
      }
      
      .ui-tooltip.warning::before {
        border-top-color: #f093fb;
        border-bottom-color: #f093fb;
      }
      
      .ui-tooltip.error::before {
        border-top-color: #eb3349;
        border-bottom-color: #eb3349;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * 綁定 tooltip 到元素
   * @param {HTMLElement} element - 目標元素
   * @param {string|Function} content - tooltip 內容（可以是字符串或返回字符串的函數）
   * @param {Object} options - 配置選項
   */
  bind(element, content, options = {}) {
    if (!element) return;
    
    const config = {
      type: options.type || 'info',           // 'info' | 'success' | 'warning' | 'error'
      position: options.position || 'top',    // 'top' | 'bottom'
      trigger: options.trigger || 'both',     // 'hover' | 'click' | 'both'
      delay: options.delay || 0,              // 延遲顯示（毫秒）
      ...options
    };
    
    // 懸停事件
    if (config.trigger === 'hover' || config.trigger === 'both') {
      element.addEventListener('mouseenter', () => {
        const text = typeof content === 'function' ? content() : content;
        if (text) {
          this.show(element, text, config);
        }
      });
      
      element.addEventListener('mouseleave', () => {
        // 延遲隱藏，避免鼠標快速移動時閃爍
        this.hideTimeout = setTimeout(() => {
          this.hide();
        }, 100);
      });
    }
    
    // 點擊事件
    if (config.trigger === 'click' || config.trigger === 'both') {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = typeof content === 'function' ? content() : content;
        if (text) {
          // 如果已經顯示，則隱藏；否則顯示
          if (this.currentTarget === element && this.currentTooltip) {
            this.hide();
          } else {
            this.show(element, text, { ...config, clickable: true });
          }
        }
      });
    }
  }
  
  /**
   * 顯示 tooltip
   * @param {HTMLElement} element - 目標元素
   * @param {string} content - tooltip 內容
   * @param {Object} options - 配置選項
   */
  show(element, content, options = {}) {
    if (!element || !content) return;
    
    // 清除之前的隱藏定時器
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // 如果已經有 tooltip，先移除
    this.hide();
    
    const config = {
      type: options.type || 'info',
      position: options.position || 'top',
      clickable: options.clickable || false,
      ...options
    };
    
    // 創建 tooltip 元素
    const tooltip = document.createElement('div');
    tooltip.className = `ui-tooltip ${config.type} position-${config.position}`;
    if (config.clickable) {
      tooltip.classList.add('clickable');
    }
    tooltip.innerHTML = content;
    
    document.body.appendChild(tooltip);
    
    // 計算位置
    this.positionTooltip(tooltip, element, config.position);
    
    // 顯示動畫
    requestAnimationFrame(() => {
      tooltip.classList.add('show');
    });
    
    // 保存當前狀態
    this.currentTooltip = tooltip;
    this.currentTarget = element;
    
    console.log('[Tooltip] 已顯示:', content.substring(0, 30) + '...');
  }
  
  /**
   * 計算 tooltip 位置
   */
  positionTooltip(tooltip, element, position) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top, left;
    
    if (position === 'top') {
      top = rect.top - tooltipRect.height - 12;  // 12px 間距（包含箭頭）
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    } else if (position === 'bottom') {
      top = rect.bottom + 12;
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    }
    
    // 邊界檢查
    const padding = 8;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    
    if (top < padding) {
      // 如果頂部放不下，改為底部
      top = rect.bottom + 12;
      tooltip.classList.remove('position-top');
      tooltip.classList.add('position-bottom');
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }
  
  /**
   * 隱藏 tooltip
   */
  hide() {
    if (!this.currentTooltip) return;
    
    const tooltip = this.currentTooltip;
    
    // 隱藏動畫
    tooltip.classList.remove('show');
    
    // 動畫結束後移除
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 200);
    
    this.currentTooltip = null;
    this.currentTarget = null;
    
    console.log('[Tooltip] 已隱藏');
  }
  
  /**
   * 更新當前 tooltip 內容
   */
  update(content) {
    if (this.currentTooltip) {
      this.currentTooltip.innerHTML = content;
    }
  }
}

// 創建全局單例
const tooltip = new TooltipManager();

// 導出單例（ES6 模塊）
export default tooltip;

