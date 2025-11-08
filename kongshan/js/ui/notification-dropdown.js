// =====================================================
// 通知下拉列表組件
// =====================================================

/**
 * 通知下拉列表管理器
 */
export class NotificationDropdown {
  constructor(notificationManager, getCurrentUserId, onBadgeUpdate) {
    this.notificationManager = notificationManager;
    this.getCurrentUserId = getCurrentUserId;
    this.onBadgeUpdate = onBadgeUpdate || (() => {});
    this.dropdown = null;
    this.isOpen = false;
    this.notifications = [];
    this.isLoading = false;
  }

  /**
   * 初始化下拉列表
   */
  init() {
    this.createDropdown();
    this.setupEventListeners();
  }

  /**
   * 創建下拉列表 DOM
   */
  createDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = 'notification-dropdown';
    dropdown.className = 'notification-dropdown';
    dropdown.setAttribute('aria-live', 'polite');
    dropdown.hidden = true;

    dropdown.innerHTML = `
      <div class="notification-dropdown-header">
        <h3 class="notification-dropdown-title">通知</h3>
        <div class="notification-dropdown-actions">
          <button class="notification-action-btn" type="button" data-action="mark-all-read" aria-label="標記全部已讀">
            <i class="fas fa-check-double" aria-hidden="true"></i>
          </button>
          <button class="notification-action-btn" type="button" data-action="close" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="notification-dropdown-content" id="notification-dropdown-content">
        <div class="notification-empty-state">
          <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
          <p>載入通知中...</p>
        </div>
      </div>
    `;

    document.body.appendChild(dropdown);
    this.dropdown = dropdown;
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 點擊外部關閉
    document.addEventListener('click', (e) => {
      const notificationBtn = document.getElementById('notification-btn');
      if (
        this.isOpen &&
        !this.dropdown.contains(e.target) &&
        !notificationBtn?.contains(e.target)
      ) {
        this.close();
      }
    });

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // 標記全部已讀
    const markAllReadBtn = this.dropdown.querySelector('[data-action="mark-all-read"]');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
    }

    // 關閉按鈕
    const closeBtn = this.dropdown.querySelector('[data-action="close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
  }

  /**
   * 打開下拉列表
   */
  async open() {
    if (!this.dropdown) {
      this.init();
    }

    const notificationBtn = document.getElementById('notification-btn');
    if (!notificationBtn) {
      return;
    }

    // 計算位置
    const rect = notificationBtn.getBoundingClientRect();
    this.dropdown.style.top = `${rect.bottom + 8}px`;
    this.dropdown.style.right = `${window.innerWidth - rect.right}px`;

    this.dropdown.hidden = false;
    this.isOpen = true;

    // 載入通知
    await this.loadNotifications();
  }

  /**
   * 關閉下拉列表
   */
  close() {
    if (this.dropdown) {
      this.dropdown.hidden = true;
      this.isOpen = false;
    }
  }

  /**
   * 切換下拉列表
   */
  async toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }

  /**
   * 載入通知列表
   */
  async loadNotifications() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    const contentEl = this.dropdown.querySelector('#notification-dropdown-content');
    if (!contentEl) {
      return;
    }

    contentEl.innerHTML = `
      <div class="notification-empty-state">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
        <p>載入通知中...</p>
      </div>
    `;

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        contentEl.innerHTML = `
          <div class="notification-empty-state">
            <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
            <p>無法獲取用戶信息</p>
          </div>
        `;
        return;
      }

      const notifications = await this.notificationManager.getNotifications(userId, 50, false);
      this.notifications = Array.isArray(notifications) ? notifications : [];
      this.renderNotifications();
    } catch (error) {
      console.error('載入通知失敗:', error);
      contentEl.innerHTML = `
        <div class="notification-empty-state">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <p>載入通知失敗，請稍後再試</p>
        </div>
      `;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 渲染通知列表
   */
  renderNotifications() {
    const contentEl = this.dropdown.querySelector('#notification-dropdown-content');
    if (!contentEl) {
      return;
    }

    if (!this.notifications || this.notifications.length === 0) {
      contentEl.innerHTML = `
        <div class="notification-empty-state">
          <i class="fas fa-bell-slash" aria-hidden="true"></i>
          <p>目前沒有通知</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'notification-list';

    this.notifications.forEach(notification => {
      const item = this.createNotificationItem(notification);
      list.appendChild(item);
    });

    contentEl.innerHTML = '';
    contentEl.appendChild(list);
  }

  /**
   * 創建通知項
   */
  createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
    item.dataset.notificationId = notification.id;

    const icon = this.getNotificationIcon(notification.type);
    const timeAgo = this.formatTimeAgo(notification.created_at);
    const message = this.formatNotificationMessage(notification);

    item.innerHTML = `
      <div class="notification-item-icon">
        <i class="${icon}" aria-hidden="true"></i>
      </div>
      <div class="notification-item-content">
        <div class="notification-item-header">
          <h4 class="notification-item-title">${escapeHtml(notification.title || '通知')}</h4>
          <span class="notification-item-time">${timeAgo}</span>
        </div>
        <div class="notification-item-message">${message}</div>
        ${!notification.read ? '<div class="notification-item-unread-indicator"></div>' : ''}
      </div>
      <div class="notification-item-actions">
        ${!notification.read ? `
          <button class="notification-item-action-btn" type="button" data-action="mark-read" aria-label="標記已讀">
            <i class="fas fa-check" aria-hidden="true"></i>
          </button>
        ` : ''}
        <button class="notification-item-action-btn" type="button" data-action="delete" aria-label="刪除">
          <i class="fas fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    `;

    // 綁定事件
    const markReadBtn = item.querySelector('[data-action="mark-read"]');
    const deleteBtn = item.querySelector('[data-action="delete"]');

    if (markReadBtn) {
      markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAsRead(notification.id, item);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNotification(notification.id, item);
      });
    }

    return item;
  }

  /**
   * 格式化通知消息
   */
  formatNotificationMessage(notification) {
    let message = notification.message || '';

    // 如果是審核結果通知，將換行符轉換為 HTML 換行，並添加樣式
    if (notification.type === 'review_result' && message) {
      // message 中已經包含了拒絕原因和備註（由 admin-manager.js 格式化）
      // 先轉義 HTML，然後將換行符轉換為 <br>，並為關鍵信息添加樣式
      message = escapeHtml(message)
        .replace(/\n\n/g, '<br><br>')
        .replace(/拒絕原因：/g, '<strong style="color: var(--color-text-primary);">拒絕原因：</strong>')
        .replace(/備註：/g, '<strong style="color: var(--color-text-primary);">備註：</strong>');
    } else {
      // 其他類型的通知，簡單轉換換行符
      message = escapeHtml(message).replace(/\n/g, '<br>');
    }

    return message;
  }

  /**
   * 獲取通知圖標
   */
  getNotificationIcon(type) {
    const icons = {
      'review_result': 'fas fa-gavel',
      'system': 'fas fa-info-circle',
      'atmosphere_approved': 'fas fa-check-circle',
      'atmosphere_rejected': 'fas fa-times-circle'
    };
    return icons[type] || 'fas fa-bell';
  }

  /**
   * 格式化時間
   */
  formatTimeAgo(dateString) {
    if (!dateString) {
      return '';
    }

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return '剛剛';
      } else if (diffMins < 60) {
        return `${diffMins} 分鐘前`;
      } else if (diffHours < 24) {
        return `${diffHours} 小時前`;
      } else if (diffDays < 7) {
        return `${diffDays} 天前`;
      } else {
        return date.toLocaleDateString('zh-TW', {
          month: '2-digit',
          day: '2-digit'
        });
      }
    } catch (error) {
      return '';
    }
  }

  /**
   * 標記通知為已讀
   */
  async markAsRead(notificationId, itemElement) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return;
      }

      const success = await this.notificationManager.markAsRead(notificationId, userId);
      if (success) {
        itemElement.classList.remove('unread');
        itemElement.classList.add('read');
        itemElement.querySelector('[data-action="mark-read"]')?.remove();
        itemElement.querySelector('.notification-item-unread-indicator')?.remove();

        // 更新徽章
        await this.onBadgeUpdate();
      }
    } catch (error) {
      console.error('標記通知為已讀失敗:', error);
    }
  }

  /**
   * 標記所有通知為已讀
   */
  async markAllAsRead() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return;
      }

      const success = await this.notificationManager.markAllAsRead(userId);
      if (success) {
        // 重新載入通知列表
        await this.loadNotifications();
        // 更新徽章
        await this.onBadgeUpdate();
      }
    } catch (error) {
      console.error('標記所有通知為已讀失敗:', error);
    }
  }

  /**
   * 刪除通知
   */
  async deleteNotification(notificationId, itemElement) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return;
      }

      const success = await this.notificationManager.deleteNotification(notificationId, userId);
      if (success) {
        itemElement.style.opacity = '0';
        itemElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
          itemElement.remove();
          // 如果列表為空，顯示空狀態
          const list = this.dropdown.querySelector('.notification-list');
          if (list && list.children.length === 0) {
            const contentEl = this.dropdown.querySelector('#notification-dropdown-content');
            if (contentEl) {
              contentEl.innerHTML = `
                <div class="notification-empty-state">
                  <i class="fas fa-bell-slash" aria-hidden="true"></i>
                  <p>目前沒有通知</p>
                </div>
              `;
            }
          }
        }, 200);

        // 更新徽章
        await this.onBadgeUpdate();
      }
    } catch (error) {
      console.error('刪除通知失敗:', error);
    }
  }

  /**
   * 銷毀下拉列表
   */
  destroy() {
    if (this.dropdown && this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
    this.dropdown = null;
    this.isOpen = false;
  }
}

/**
 * HTML 轉義函數
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

