// =====================================================
// 管理後台全螢幕控制器
// =====================================================

/**
 * 管理後台全螢幕畫面控制器
 */
export class AdminDrawer {
  constructor(adminManager, onContentChange) {
    this.adminManager = adminManager;
    this.onContentChange = onContentChange || (() => {});

    this.screen = null;
    this.contentEl = null;
    this.navItems = [];
    this.isOpen = false;
    this.currentView = null;
  }

  /**
   * 初始化畫面節點與事件
   */
  init() {
    this.screen = document.getElementById('admin-dashboard-screen');
    if (!this.screen) {
      console.warn('找不到管理後台畫面容器');
      return;
    }

    this.contentEl = this.screen.querySelector('#admin-dashboard-content');
    this.navItems = Array.from(this.screen.querySelectorAll('.admin-nav-item'));

    this.bindNavEvents();

    if (this.screen.dataset.initialized !== 'true') {
      this.screen.dataset.initialized = 'true';
      this.screen.setAttribute('aria-hidden', 'true');
    }
  }

  bindNavEvents() {
    if (!Array.isArray(this.navItems) || this.navItems.length === 0) {
      return;
    }

    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.showView(view);
      });
    });
  }

  /**
   * 開啟管理後台
   */
  open(view = null) {
    if (!this.screen) {
      this.init();
    }
    if (!this.screen) {
      return;
    }

    const listScreen = document.getElementById('poem-list-screen');
    const viewerScreen = document.getElementById('poem-viewer-screen');

    if (listScreen) listScreen.style.display = 'none';
    if (viewerScreen) viewerScreen.style.display = 'none';

    this.screen.style.display = 'flex';
    this.screen.setAttribute('aria-hidden', 'false');
    this.isOpen = true;

    const targetView = view || (this.currentView || this.getDefaultView());
    this.showView(targetView);

    if (this.contentEl) {
      this.contentEl.scrollTop = 0;
    }
  }

  /**
   * 關閉管理後台
   */
  close() {
    if (!this.screen) {
      return;
    }

    this.screen.style.display = 'none';
    this.screen.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    this.onContentChange(null);
  }

  /**
   * 顯示指定的管理視圖
   * @param {string} viewName 視圖代碼
   */
  showView(viewName) {
    if (!viewName || !this.screen) {
      return;
    }

    if (!this.navItems || this.navItems.length === 0) {
      this.navItems = Array.from(this.screen.querySelectorAll('.admin-nav-item'));
    }

    this.navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.currentView = viewName;
    this.onContentChange(viewName);
  }

  /**
   * 設定主要內容區
   */
  setContent(content) {
    if (!this.contentEl) {
      return;
    }

    if (typeof content === 'string') {
      this.contentEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentEl.innerHTML = '';
      this.contentEl.appendChild(content);
    }
  }

  /**
   * 顯示載入狀態
   */
  showLoading() {
    this.setContent(`
      <div class="admin-loading">
        <div class="admin-loading-spinner"></div>
        <p class="admin-loading-text">載入中...</p>
      </div>
    `);
  }

  /**
   * 顯示錯誤狀態
   */
  showError(message) {
    this.setContent(`
      <div class="admin-error">
        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
        <p>${message || '發生錯誤，請稍後再試'}</p>
      </div>
    `);
  }

  /**
   * 銷毀參考
   */
  destroy() {
    this.screen = null;
    this.contentEl = null;
    this.navItems = [];
    this.isOpen = false;
  }

  /**
   * 取得預設視圖
   */
  getDefaultView() {
    if (this.navItems && this.navItems.length > 0) {
      return this.navItems[0].dataset.view;
    }
    return 'recording-review';
  }
}

