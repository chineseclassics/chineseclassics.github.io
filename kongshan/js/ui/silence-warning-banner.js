// =====================================================
// 靜音提示橫幅組件
// =====================================================

export class SilenceWarningBanner {
  constructor(container) {
    this.container = container;
    this.bannerEl = null;
    this.dismissButton = null;
    this.disableButton = null;
    this.isVisible = false;
    this.onDismiss = null;
    this.onDisable = null;
  }

  /**
   * 初始化橫幅
   */
  init() {
    if (!this.container) {
      return;
    }

    if (this.bannerEl) {
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'silence-warning-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.hidden = true;

    banner.innerHTML = `
      <div class="silence-warning-inner">
        <div class="silence-warning-icon" aria-hidden="true">
          <span>🔕</span>
        </div>
        <div class="silence-warning-text">
          <p class="silence-warning-title">目前偵測到裝置可能處於靜音狀態</p>
          <p class="silence-warning-desc">
            若想聆聽聲色意境，請確認未開啟靜音或調高媒體音量。
          </p>
        </div>
        <div class="silence-warning-actions">
          <button type="button" class="silence-warning-btn" data-action="dismiss">
            知道了
          </button>
          <button type="button" class="silence-warning-link" data-action="disable">
            本次瀏覽不再提示
          </button>
        </div>
      </div>
    `;

    this.container.insertBefore(banner, this.container.firstChild);

    this.bannerEl = banner;
    this.dismissButton = banner.querySelector('[data-action="dismiss"]');
    this.disableButton = banner.querySelector('[data-action="disable"]');

    this.setupEvents();
  }

  /**
   * 設定按鈕回呼
   * @param {object} callbacks - 回呼設定
   * @param {Function} callbacks.onDismiss - 使用者關閉提示
   * @param {Function} callbacks.onDisable - 使用者停用提示
   */
  setCallbacks(callbacks = {}) {
    const { onDismiss = null, onDisable = null } = callbacks;
    this.onDismiss = typeof onDismiss === 'function' ? onDismiss : null;
    this.onDisable = typeof onDisable === 'function' ? onDisable : null;
  }

  /**
   * 顯示橫幅
   */
  show() {
    if (!this.container) {
      return;
    }

    this.init();

    if (!this.bannerEl || this.isVisible) {
      return;
    }

    this.bannerEl.hidden = false;
    requestAnimationFrame(() => {
      this.bannerEl.classList.add('visible');
    });
    this.isVisible = true;
  }

  /**
   * 隱藏橫幅
   */
  hide() {
    if (!this.bannerEl || !this.isVisible) {
      return;
    }

    this.bannerEl.classList.remove('visible');
    setTimeout(() => {
      if (this.bannerEl) {
        this.bannerEl.hidden = true;
      }
    }, 200);

    this.isVisible = false;
  }

  /**
   * 銷毀橫幅
   */
  destroy() {
    if (this.bannerEl && this.bannerEl.parentNode) {
      this.bannerEl.parentNode.removeChild(this.bannerEl);
    }

    this.bannerEl = null;
    this.dismissButton = null;
    this.disableButton = null;
    this.isVisible = false;
  }

  setupEvents() {
    if (this.dismissButton) {
      this.dismissButton.addEventListener('click', () => {
        this.hide();
        if (this.onDismiss) {
          this.onDismiss();
        }
      });
    }

    if (this.disableButton) {
      this.disableButton.addEventListener('click', () => {
        this.hide();
        if (this.onDisable) {
          this.onDisable();
        }
      });
    }
  }
}


