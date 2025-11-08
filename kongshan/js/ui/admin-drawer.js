// =====================================================
// 管理後台側邊抽屜組件
// =====================================================

/**
 * 管理後台側邊抽屜管理器
 */
export class AdminDrawer {
  constructor(adminManager, onContentChange) {
    this.adminManager = adminManager;
    this.onContentChange = onContentChange || (() => {});
    this.drawer = null;
    this.currentView = null;
    this.isOpen = false;
  }

  /**
   * 初始化抽屜
   */
  init() {
    this.createDrawer();
    this.setupEventListeners();
  }

  /**
   * 創建抽屜 DOM 結構
   */
  createDrawer() {
    // 創建遮罩層
    const overlay = document.createElement('div');
    overlay.className = 'admin-drawer-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('tabindex', '-1');

    // 創建抽屜容器
    const drawer = document.createElement('div');
    drawer.className = 'admin-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', '管理後台');
    drawer.setAttribute('tabindex', '-1');

    drawer.innerHTML = `
      <div class="admin-drawer-topbar">
        <nav class="admin-drawer-tabs" role="tablist" aria-label="管理後台功能">
          <button class="admin-nav-item" data-view="recording-review" type="button">
            <span>音效審核</span>
          </button>
          <button class="admin-nav-item" data-view="poem-management" type="button">
            <span>詩句管理</span>
          </button>
          <button class="admin-nav-item" data-view="sound-management" type="button">
            <span>音效管理</span>
          </button>
          <button class="admin-nav-item" data-view="user-management" type="button">
            <span>用戶管理</span>
          </button>
          <button class="admin-nav-item" data-view="statistics" type="button">
            <span>數據統計</span>
          </button>
          <button class="admin-nav-item" data-view="logs" type="button">
            <span>操作日誌</span>
          </button>
        </nav>
        <button class="admin-drawer-close" type="button" aria-label="關閉管理後台">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="admin-drawer-content" id="admin-drawer-content">
        <!-- 內容將動態載入 -->
      </div>
    `;

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    this.drawer = drawer;
    this.overlay = overlay;
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 關閉按鈕
    const closeBtn = this.drawer.querySelector('.admin-drawer-close');
    closeBtn.addEventListener('click', () => this.close());

    // 遮罩層點擊關閉
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // 導航按鈕
    const navItems = this.drawer.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.showView(view);
      });
    });
  }

  /**
   * 打開抽屜
   */
  open(view = null) {
    if (!this.drawer) {
      this.init();
    }

    this.overlay.setAttribute('aria-hidden', 'false');
    this.drawer.classList.add('open');
    this.overlay.classList.add('open');
    this.isOpen = true;

    // 防止背景滾動
    document.body.style.overflow = 'hidden';

    // 顯示默認視圖或指定視圖
    if (view) {
      this.showView(view);
    } else {
      // 顯示第一個導航項
      const firstNavItem = this.drawer.querySelector('.admin-nav-item');
      if (firstNavItem) {
        this.showView(firstNavItem.dataset.view);
      }
    }

    // 聚焦到抽屜
    this.drawer.focus();
  }

  /**
   * 關閉抽屜
   */
  close() {
    if (!this.drawer) return;

    this.drawer.classList.remove('open');
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.isOpen = false;

    // 恢復背景滾動
    document.body.style.overflow = '';

    // 通知內容變更
    this.onContentChange(null);
  }

  /**
   * 顯示指定視圖
   * @param {string} viewName - 視圖名稱
   */
  showView(viewName) {
    if (!viewName) return;

    // 更新導航狀態
    const navItems = this.drawer.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
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
   * 設置抽屜內容
   * @param {string|HTMLElement} content - 內容 HTML 字符串或元素
   */
  setContent(content) {
    const contentEl = this.drawer.querySelector('#admin-drawer-content');
    if (!contentEl) return;

    if (typeof content === 'string') {
      contentEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentEl.innerHTML = '';
      contentEl.appendChild(content);
    }
  }

  /**
   * 顯示加載狀態
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
   * 顯示錯誤信息
   * @param {string} message - 錯誤信息
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
   * 銷毀抽屜
   */
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.drawer = null;
    this.overlay = null;
    this.isOpen = false;
  }
}

