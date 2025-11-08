// =====================================================
// 用戶面板模態窗口組件
// =====================================================

/**
 * 用戶面板模態窗口管理器
 */
export class UserPanelModal {
  constructor(notificationManager, getCurrentUserId, onBadgeUpdate, handleSignOut, getAuthUser, getVisitorCount, supabase) {
    this.notificationManager = notificationManager;
    this.getCurrentUserId = getCurrentUserId;
    this.onBadgeUpdate = onBadgeUpdate || (() => {});
    this.handleSignOut = handleSignOut;
    this.getAuthUser = getAuthUser;
    this.getVisitorCount = getVisitorCount;
    this.supabase = supabase;
    this.modal = null;
    this.isOpen = false;
    this.activeTab = 'ranking'; // 'ranking', 'friends', 'messages'
    this.notifications = [];
    this.isLoading = false;
  }

  /**
   * 初始化模態窗口
   */
  init() {
    this.createModal();
    this.setupEventListeners();
  }

  /**
   * 創建模態窗口 DOM
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'user-panel-modal';
    modal.className = 'user-panel-modal';
    modal.setAttribute('aria-live', 'polite');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'user-panel-title');
    modal.hidden = true;

    modal.innerHTML = `
      <div class="user-panel-modal-overlay"></div>
      <div class="user-panel-modal-content">
        <div class="user-panel-modal-header">
          <div class="user-panel-user-info">
            <h2 id="user-panel-title" class="user-panel-title"></h2>
            <p class="user-panel-subtitle"></p>
          </div>
          <button class="user-panel-close-btn" type="button" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div class="user-panel-tabs">
          <button class="user-panel-tab active" data-tab="ranking" type="button">
            <i class="fas fa-mountain" aria-hidden="true"></i>
            <span>山外</span>
          </button>
          <button class="user-panel-tab" data-tab="friends" type="button">
            <i class="fas fa-users" aria-hidden="true"></i>
            <span>友鄰</span>
          </button>
          <button class="user-panel-tab" data-tab="messages" type="button">
            <i class="fas fa-envelope" aria-hidden="true"></i>
            <span>信箋</span>
            <span class="user-panel-tab-badge" id="messages-tab-badge" hidden>0</span>
          </button>
        </div>

        <div class="user-panel-tab-content">
          <!-- 山外 - 排行榜 -->
          <div class="user-panel-tab-pane active" data-pane="ranking">
            <div id="ranking-content" class="user-panel-content-area">
              <div class="user-panel-loading">
                <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                <p>載入中...</p>
              </div>
            </div>
          </div>

          <!-- 友鄰 - 好友列表 -->
          <div class="user-panel-tab-pane" data-pane="friends">
            <div id="friends-content" class="user-panel-content-area">
              <div class="user-panel-empty-state">
                <i class="fas fa-users" aria-hidden="true"></i>
                <p>好友功能開發中</p>
              </div>
            </div>
          </div>

          <!-- 信箋 - 通知和信件 -->
          <div class="user-panel-tab-pane" data-pane="messages">
            <div id="messages-content" class="user-panel-content-area">
              <div class="user-panel-loading">
                <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                <p>載入中...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 點擊遮罩層關閉
    const overlay = this.modal.querySelector('.user-panel-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }

    // 關閉按鈕
    const closeBtn = this.modal.querySelector('.user-panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Tab 切換
    const tabs = this.modal.querySelectorAll('.user-panel-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  /**
   * 打開模態窗口
   */
  async open() {
    if (!this.modal) {
      this.init();
    }

    this.modal.hidden = false;
    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // 更新用戶信息
    await this.updateUserInfo();

    // 載入當前 tab 的內容
    await this.loadTabContent(this.activeTab);
  }

  /**
   * 關閉模態窗口
   */
  close() {
    if (this.modal) {
      this.modal.hidden = true;
      this.isOpen = false;
      document.body.style.overflow = '';
    }
  }

  /**
   * 切換模態窗口
   */
  async toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }

  /**
   * 更新用戶信息
   */
  async updateUserInfo() {
    const titleEl = this.modal.querySelector('#user-panel-title');
    const subtitleEl = this.modal.querySelector('.user-panel-subtitle');

    if (!titleEl || !subtitleEl) {
      return;
    }

    const user = this.getAuthUser();
    const count = this.getVisitorCount();

    if (user) {
      const name = user.fullName || user.email || '旅人';
      const countText = count ? `你是第 ${count} 位進入空山的旅人` : '歡迎來到空山';
      
      titleEl.textContent = name;
      subtitleEl.textContent = countText;
    }
  }

  /**
   * 切換 Tab
   */
  async switchTab(tabName) {
    if (this.activeTab === tabName) {
      return;
    }

    this.activeTab = tabName;

    // 更新 Tab 按鈕狀態
    const tabs = this.modal.querySelectorAll('.user-panel-tab');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // 更新內容面板
    const panes = this.modal.querySelectorAll('.user-panel-tab-pane');
    panes.forEach(pane => {
      if (pane.dataset.pane === tabName) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // 載入新 tab 的內容
    await this.loadTabContent(tabName);
  }

  /**
   * 載入 Tab 內容
   */
  async loadTabContent(tabName) {
    switch (tabName) {
      case 'ranking':
        await this.loadRanking();
        break;
      case 'friends':
        // 好友功能待開發
        break;
      case 'messages':
        await this.loadMessages();
        break;
    }
  }

  /**
   * 載入排行榜
   */
  async loadRanking() {
    const contentEl = this.modal.querySelector('#ranking-content');
    if (!contentEl) {
      return;
    }

    contentEl.innerHTML = `
      <div class="user-panel-loading">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
        <p>載入排行榜中...</p>
      </div>
    `;

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        contentEl.innerHTML = `
          <div class="user-panel-empty-state">
            <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
            <p>無法獲取用戶信息</p>
          </div>
        `;
        return;
      }

      // TODO: 從數據庫獲取排行榜數據
      // 目前先顯示佔位內容
      const ranking = await this.fetchRanking(userId);
      this.renderRanking(contentEl, ranking, userId);
    } catch (error) {
      console.error('載入排行榜失敗:', error);
      contentEl.innerHTML = `
        <div class="user-panel-empty-state">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <p>載入排行榜失敗，請稍後再試</p>
        </div>
      `;
    }
  }

  /**
   * 獲取排行榜數據
   */
  async fetchRanking(userId) {
    if (!this.supabase) {
      return {
        topUsers: [],
        currentUser: null
      };
    }

    try {
      // 查詢所有用戶成功發佈的聲色意境數量
      const { data: atmospheres, error: atmError } = await this.supabase
        .from('poem_atmospheres')
        .select('created_by')
        .eq('status', 'approved')
        .eq('source', 'user')
        .not('created_by', 'is', null);

      if (atmError) {
        console.error('查詢聲色意境失敗:', atmError);
        return {
          topUsers: [],
          currentUser: null
        };
      }

      // 統計每個用戶的數量
      const userCounts = {};
      atmospheres.forEach(atm => {
        const uid = atm.created_by;
        userCounts[uid] = (userCounts[uid] || 0) + 1;
      });

      // 獲取用戶信息
      const userIds = Object.keys(userCounts);
      if (userIds.length === 0) {
        return {
          topUsers: [],
          currentUser: null
        };
      }

      // 從 travelers 表獲取用戶顯示名稱
      const { data: travelers, error: travelerError } = await this.supabase
        .from('travelers')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      if (travelerError) {
        console.error('查詢用戶信息失敗:', travelerError);
      }

      // 構建用戶信息映射
      const userInfoMap = {};
      if (travelers) {
        travelers.forEach(t => {
          userInfoMap[t.user_id] = {
            name: t.display_name || t.email || '旅人',
            email: t.email
          };
        });
      }

      // 構建排行榜數據
      const rankingData = userIds.map(uid => ({
        id: uid,
        name: userInfoMap[uid]?.name || '旅人',
        count: userCounts[uid],
        rank: 0 // 稍後計算
      }));

      // 按數量排序
      rankingData.sort((a, b) => b.count - a.count);

      // 分配排名（處理並列情況）
      let currentRank = 1;
      rankingData.forEach((user, index) => {
        if (index > 0 && user.count < rankingData[index - 1].count) {
          currentRank = index + 1;
        }
        user.rank = currentRank;
      });

      // 獲取前5名
      const topUsers = rankingData.slice(0, 5);

      // 獲取當前用戶的排名
      const currentUserData = rankingData.find(u => u.id === userId);
      const currentUser = currentUserData || null;

      return {
        topUsers,
        currentUser
      };
    } catch (error) {
      console.error('獲取排行榜失敗:', error);
      return {
        topUsers: [],
        currentUser: null
      };
    }
  }

  /**
   * 渲染排行榜
   */
  renderRanking(contentEl, ranking, userId) {
    const { topUsers, currentUser } = ranking;

    let html = '<div class="ranking-list">';
    
    // 顯示前五名
    html += '<div class="ranking-top-users">';
    topUsers.forEach(user => {
      const isCurrentUser = user.id === userId;
      html += `
        <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
          <div class="ranking-rank">${user.rank}</div>
          <div class="ranking-info">
            <div class="ranking-name">${escapeHtml(user.name)}</div>
            <div class="ranking-count">${user.count} 個聲色意境</div>
          </div>
          ${isCurrentUser ? '<span class="ranking-badge">你</span>' : ''}
        </div>
      `;
    });
    html += '</div>';

    // 顯示當前用戶信息（如果不在前五名）
    if (currentUser && !topUsers.find(u => u.id === userId)) {
      html += `
        <div class="ranking-current-user-section">
          <div class="ranking-item current-user">
            <div class="ranking-rank">${currentUser.rank}</div>
            <div class="ranking-info">
              <div class="ranking-name">${escapeHtml(currentUser.name)}</div>
              <div class="ranking-count">${currentUser.count} 個聲色意境</div>
            </div>
            <span class="ranking-badge">你</span>
          </div>
        </div>
      `;
    }

    // 用戶等級和徽章（待開發）
    html += `
      <div class="ranking-user-stats">
        <div class="user-stat-item">
          <span class="user-stat-label">等級</span>
          <span class="user-stat-value">待開發</span>
        </div>
        <div class="user-stat-item">
          <span class="user-stat-label">徽章</span>
          <span class="user-stat-value">待開發</span>
        </div>
      </div>
    `;

    // 出山（登出）按鈕
    html += `
      <div class="ranking-actions">
        <button class="user-panel-signout-btn" type="button" id="user-panel-signout-btn">
          <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
          <span>出山</span>
        </button>
      </div>
    `;

    html += '</div>';

    contentEl.innerHTML = html;

    // 綁定登出按鈕
    const signOutBtn = contentEl.querySelector('#user-panel-signout-btn');
    if (signOutBtn && this.handleSignOut) {
      signOutBtn.addEventListener('click', () => {
        this.handleSignOut();
        this.close();
      });
    }
  }

  /**
   * 載入消息（通知和信件）
   */
  async loadMessages() {
    const contentEl = this.modal.querySelector('#messages-content');
    if (!contentEl) {
      return;
    }

    contentEl.innerHTML = `
      <div class="user-panel-loading">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
        <p>載入消息中...</p>
      </div>
    `;

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        contentEl.innerHTML = `
          <div class="user-panel-empty-state">
            <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
            <p>無法獲取用戶信息</p>
          </div>
        `;
        return;
      }

      const notifications = await this.notificationManager.getNotifications(userId, 50, false);
      this.notifications = Array.isArray(notifications) ? notifications : [];
      this.renderMessages(contentEl);
    } catch (error) {
      console.error('載入消息失敗:', error);
      contentEl.innerHTML = `
        <div class="user-panel-empty-state">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <p>載入消息失敗，請稍後再試</p>
        </div>
      `;
    }
  }

  /**
   * 渲染消息列表
   */
  renderMessages(contentEl) {
    if (!this.notifications || this.notifications.length === 0) {
      contentEl.innerHTML = `
        <div class="user-panel-empty-state">
          <i class="fas fa-envelope-open" aria-hidden="true"></i>
          <p>目前沒有消息</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'user-panel-messages-list';

    this.notifications.forEach(notification => {
      const item = this.createMessageItem(notification);
      list.appendChild(item);
    });

    contentEl.innerHTML = '';
    contentEl.appendChild(list);
  }

  /**
   * 創建消息項
   */
  createMessageItem(notification) {
    const item = document.createElement('div');
    item.className = `user-panel-message-item ${notification.read ? 'read' : 'unread'}`;
    item.dataset.notificationId = notification.id;

    const icon = this.getNotificationIcon(notification.type);
    const timeAgo = this.formatTimeAgo(notification.created_at);
    const message = this.formatNotificationMessage(notification);

    item.innerHTML = `
      <div class="user-panel-message-icon">
        <i class="${icon}" aria-hidden="true"></i>
      </div>
      <div class="user-panel-message-content">
        <div class="user-panel-message-header">
          <h4 class="user-panel-message-title">${escapeHtml(notification.title || '通知')}</h4>
          <span class="user-panel-message-time">${timeAgo}</span>
        </div>
        <div class="user-panel-message-text">${message}</div>
        ${!notification.read ? '<div class="user-panel-message-unread-indicator"></div>' : ''}
      </div>
      <div class="user-panel-message-actions">
        ${!notification.read ? `
          <button class="user-panel-message-action-btn" type="button" data-action="mark-read" aria-label="標記已讀">
            <i class="fas fa-check" aria-hidden="true"></i>
          </button>
        ` : ''}
        <button class="user-panel-message-action-btn" type="button" data-action="delete" aria-label="刪除">
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

    if (notification.type === 'review_result' && message) {
      message = escapeHtml(message)
        .replace(/\n\n/g, '<br><br>')
        .replace(/拒絕原因：/g, '<strong style="color: var(--color-text-primary);">拒絕原因：</strong>')
        .replace(/備註：/g, '<strong style="color: var(--color-text-primary);">備註：</strong>');
    } else {
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
        itemElement.querySelector('.user-panel-message-unread-indicator')?.remove();

        await this.onBadgeUpdate();
      }
    } catch (error) {
      console.error('標記通知為已讀失敗:', error);
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
          const list = this.modal.querySelector('.user-panel-messages-list');
          if (list && list.children.length === 0) {
            const contentEl = this.modal.querySelector('#messages-content');
            if (contentEl) {
              contentEl.innerHTML = `
                <div class="user-panel-empty-state">
                  <i class="fas fa-envelope-open" aria-hidden="true"></i>
                  <p>目前沒有消息</p>
                </div>
              `;
            }
          }
        }, 200);

        await this.onBadgeUpdate();
      }
    } catch (error) {
      console.error('刪除通知失敗:', error);
    }
  }

  /**
   * 更新消息徽章
   */
  async updateMessagesBadge() {
    const badge = this.modal.querySelector('#messages-tab-badge');
    if (!badge) {
      return;
    }

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return;
      }

      const count = await this.notificationManager.checkNotifications(userId);
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count.toString();
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    } catch (error) {
      console.error('更新消息徽章失敗:', error);
    }
  }

  /**
   * 銷毀模態窗口
   */
  destroy() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    this.modal = null;
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

