// =====================================================
// 管理後台 - 用戶管理介面
// =====================================================

/**
 * 渲染用戶管理介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 * @param {Function} context.getCurrentUserId
 */
export async function renderUserManagement(container, { adminManager, getCurrentUserId }) {
  if (!container || !adminManager || typeof getCurrentUserId !== 'function') {
    return;
  }

  container.classList.add('admin-view-shell');

  container.innerHTML = `
    <section class="admin-section">
      <header class="admin-section-header">
        <div>
          <h2 class="admin-section-title">用戶管理</h2>
          <p class="admin-description">管理空山的旅人帳號。刪除用戶時，其創作的聲色意境將保留但匿名化處理。僅超級管理員可任命或撤銷管理員權限。</p>
        </div>
        <div class="admin-inline-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
        </div>
      </header>

      <div class="admin-card admin-card-table-wrapper">
        <table class="admin-table admin-user-table" aria-describedby="user-management-empty">
          <thead>
            <tr>
              <th scope="col">旅人</th>
              <th scope="col">郵箱</th>
              <th scope="col">首次訪問</th>
              <th scope="col">角色</th>
              <th scope="col" class="admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody id="admin-user-table-body">
            <tr>
              <td colspan="5">
                <div class="admin-empty-state" id="user-management-loading">
                  <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                  <p>載入用戶中...</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="admin-user-pagination" class="admin-pagination"></div>
    </section>
  `;

  const state = {
    users: [],
    adminRoles: new Map(), // userId -> role
    isLoading: false,
    currentPage: 1,
    pageSize: 50,
    totalUsers: 0,
    isSuperAdmin: false
  };

  const tableBody = container.querySelector('#admin-user-table-body');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const paginationEl = container.querySelector('#admin-user-pagination');

  // 檢查當前用戶是否為超級管理員
  const currentUserId = await getCurrentUserId();
  if (currentUserId) {
    state.isSuperAdmin = await adminManager.isSuperAdmin(currentUserId);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadUsers(true).catch(err => console.warn('重新整理用戶列表失敗:', err));
    });
  }

  await loadUsers(false);

  async function loadUsers(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingRow();

    try {
      const { data, total } = await adminManager.getAllUsers(state.currentPage, state.pageSize);
      state.users = Array.isArray(data) ? data : [];
      state.totalUsers = total || 0;

      // 載入每個用戶的管理員角色
      await loadAdminRoles();

      renderTable();
      renderPagination();
    } catch (error) {
      console.error('載入用戶列表失敗:', error);
      showErrorRow('載入用戶列表時發生錯誤，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  async function loadAdminRoles() {
    state.adminRoles.clear();
    if (!state.users || state.users.length === 0) {
      return;
    }

    // 批量查詢管理員角色
    const userIds = state.users.map(u => u.user_id).filter(Boolean);
    if (userIds.length === 0) {
      return;
    }

    try {
      if (!adminManager.supabase) {
        console.warn('無法訪問 Supabase 客戶端');
        return;
      }

      const { data, error } = await adminManager.supabase
        .from('admins')
        .select('user_id, role')
        .in('user_id', userIds);

      if (!error && Array.isArray(data)) {
        data.forEach(admin => {
          state.adminRoles.set(admin.user_id, admin.role);
        });
      }
    } catch (error) {
      console.warn('載入管理員角色失敗:', error);
    }
  }

  function renderTable() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = '';

    if (!state.users || state.users.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="5">
          <div class="admin-empty-state" id="user-management-empty">
            <i class="fas fa-users" aria-hidden="true"></i>
            <p>目前沒有任何用戶。</p>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
      return;
    }

    state.users.forEach(user => {
      const userId = user.user_id;
      const role = state.adminRoles.get(userId);
      const isAdmin = !!role;
      const isSuper = role === 'super_admin';
      const isCurrentUser = userId === currentUserId;

      const row = document.createElement('tr');
      row.dataset.userId = userId;
      row.innerHTML = `
        <td data-label="旅人">
          <div class="admin-user-name">
            ${escapeHtml(user.display_name || '匿名旅人')}
          </div>
        </td>
        <td data-label="郵箱">
          <div class="admin-meta">${escapeHtml(user.email || 'N/A')}</div>
        </td>
        <td data-label="首次訪問">
          <div class="admin-meta">
            <i class="fas fa-clock" aria-hidden="true"></i>
            ${formatDateTime(user.first_seen)}
          </div>
        </td>
        <td data-label="角色">
          ${renderRoleBadge(role, isCurrentUser)}
        </td>
        <td class="admin-table-actions">
          <div class="admin-inline-actions">
            ${renderActionButtons(user, role, isCurrentUser)}
          </div>
        </td>
      `;

      // 綁定事件
      const deleteBtn = row.querySelector('[data-action="delete"]');
      const promoteBtn = row.querySelector('[data-action="promote"]');
      const revokeBtn = row.querySelector('[data-action="revoke"]');

      deleteBtn?.addEventListener('click', () => openDeleteConfirm(user));
      promoteBtn?.addEventListener('click', () => openPromoteConfirm(user));
      revokeBtn?.addEventListener('click', () => openRevokeConfirm(user));

      tableBody.appendChild(row);
    });
  }

  function renderRoleBadge(role, isCurrentUser) {
    if (!role) {
      return '<span class="admin-tag admin-tag-neutral">旅人</span>';
    }
    if (role === 'super_admin') {
      return `<span class="admin-tag admin-tag-primary">${isCurrentUser ? '超級管理員（您）' : '超級管理員'}</span>`;
    }
    if (role === 'admin') {
      return `<span class="admin-tag admin-tag-secondary">${isCurrentUser ? '管理員（您）' : '管理員'}</span>`;
    }
    return '<span class="admin-tag admin-tag-neutral">旅人</span>';
  }

  function renderActionButtons(user, role, isCurrentUser) {
    const buttons = [];

    // 刪除按鈕（所有管理員可見，但不能刪除自己）
    if (!isCurrentUser) {
      buttons.push(`
        <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="delete">
          <i class="fas fa-trash-can" aria-hidden="true"></i>
          刪除
        </button>
      `);
    }

    // 提升/撤銷管理員按鈕（僅超級管理員可見）
    if (state.isSuperAdmin && !isCurrentUser) {
      if (!role) {
        buttons.push(`
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="promote">
            <i class="fas fa-user-shield" aria-hidden="true"></i>
            任命管理員
          </button>
        `);
      } else if (role === 'admin') {
        buttons.push(`
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="revoke">
            <i class="fas fa-user-slash" aria-hidden="true"></i>
            撤銷管理員
          </button>
        `);
      }
    }

    if (buttons.length === 0) {
      return '<span class="admin-meta admin-text-muted">無可用操作</span>';
    }

    return buttons.join('');
  }

  function showLoadingRow() {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="admin-empty-state">
            <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
            <p>載入用戶中...</p>
          </div>
        </td>
      </tr>
    `;
  }

  function showErrorRow(message) {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="admin-error">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
            <p>${message}</p>
          </div>
        </td>
      </tr>
    `;
  }

  function renderPagination() {
    if (!paginationEl) {
      return;
    }

    const totalPages = Math.ceil(state.totalUsers / state.pageSize);
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(`<button class="admin-pagination-btn" data-page="1">1</button>`);
      if (startPage > 2) {
        pages.push('<span class="admin-pagination-ellipsis">...</span>');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <button class="admin-pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('<span class="admin-pagination-ellipsis">...</span>');
      }
      pages.push(`<button class="admin-pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    paginationEl.innerHTML = `
      <div class="admin-pagination-info">
        共 ${state.totalUsers} 位旅人，第 ${state.currentPage} / ${totalPages} 頁
      </div>
      <div class="admin-pagination-controls">
        <button class="admin-pagination-btn" data-action="prev" ${state.currentPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        ${pages.join('')}
        <button class="admin-pagination-btn" data-action="next" ${state.currentPage === totalPages ? 'disabled' : ''}>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    `;

    paginationEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page !== state.currentPage) {
          state.currentPage = page;
          loadUsers(true).catch(err => console.warn('切換頁面失敗:', err));
        }
      });
    });

    paginationEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        loadUsers(true).catch(err => console.warn('切換頁面失敗:', err));
      }
    });

    paginationEl.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      const totalPages = Math.ceil(state.totalUsers / state.pageSize);
      if (state.currentPage < totalPages) {
        state.currentPage++;
        loadUsers(true).catch(err => console.warn('切換頁面失敗:', err));
      }
    });
  }

  // =====================================================
  // 確認對話框
  // =====================================================

  function openDeleteConfirm(user) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <div class="admin-confirm-dialog-header">
          <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
          <h3 class="admin-confirm-dialog-title">刪除用戶</h3>
        </div>
        <div class="admin-confirm-dialog-body">
          <p>
            確定要刪除用戶 <strong>${escapeHtml(user.display_name || '匿名旅人')}</strong> 嗎？<br>
            刪除後，該用戶創作的聲色意境將保留但匿名化處理，用戶記錄將無法復原。
          </p>
        </div>
        <div class="admin-confirm-dialog-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-action="cancel">取消</button>
          <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="confirm">刪除</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');

    function closeDialog() {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 150);
    }

    cancelBtn?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        const adminId = await getCurrentUserId();
        if (!adminId) {
          throw new Error('未能取得管理員身份，請重新登入後再試。');
        }
        const result = await adminManager.deleteUser(user.user_id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '刪除用戶失敗，請稍後再試。');
        }
        closeDialog();
        await loadUsers(true);
      } catch (error) {
        console.error('刪除用戶失敗:', error);
        alert(error.message || '刪除用戶時發生錯誤，請稍後再試。');
        confirmBtn.disabled = false;
      }
    });

    document.body.appendChild(overlay);
  }

  function openPromoteConfirm(user) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <div class="admin-confirm-dialog-header">
          <i class="fas fa-user-shield" aria-hidden="true"></i>
          <h3 class="admin-confirm-dialog-title">任命管理員</h3>
        </div>
        <div class="admin-confirm-dialog-body">
          <p>
            確定要將 <strong>${escapeHtml(user.display_name || '匿名旅人')}</strong> 提升為管理員嗎？<br>
            管理員可以審核音效、管理詩句和音效庫，但無法任命或撤銷其他管理員。
          </p>
        </div>
        <div class="admin-confirm-dialog-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-action="cancel">取消</button>
          <button class="admin-btn admin-btn-primary admin-btn-small" type="button" data-action="confirm">確認任命</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');

    function closeDialog() {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 150);
    }

    cancelBtn?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        const adminId = await getCurrentUserId();
        if (!adminId) {
          throw new Error('未能取得管理員身份，請重新登入後再試。');
        }
        const result = await adminManager.promoteToAdmin(user.user_id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '任命管理員失敗，請稍後再試。');
        }
        closeDialog();
        await loadUsers(true);
      } catch (error) {
        console.error('任命管理員失敗:', error);
        alert(error.message || '任命管理員時發生錯誤，請稍後再試。');
        confirmBtn.disabled = false;
      }
    });

    document.body.appendChild(overlay);
  }

  function openRevokeConfirm(user) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <div class="admin-confirm-dialog-header">
          <i class="fas fa-user-slash" aria-hidden="true"></i>
          <h3 class="admin-confirm-dialog-title">撤銷管理員權限</h3>
        </div>
        <div class="admin-confirm-dialog-body">
          <p>
            確定要撤銷 <strong>${escapeHtml(user.display_name || '匿名旅人')}</strong> 的管理員權限嗎？<br>
            撤銷後，該用戶將恢復為普通旅人，無法再訪問管理後台。
          </p>
        </div>
        <div class="admin-confirm-dialog-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-action="cancel">取消</button>
          <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="confirm">確認撤銷</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');

    function closeDialog() {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 150);
    }

    cancelBtn?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        const adminId = await getCurrentUserId();
        if (!adminId) {
          throw new Error('未能取得管理員身份，請重新登入後再試。');
        }
        const result = await adminManager.revokeAdmin(user.user_id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '撤銷管理員權限失敗，請稍後再試。');
        }
        closeDialog();
        await loadUsers(true);
      } catch (error) {
        console.error('撤銷管理員權限失敗:', error);
        alert(error.message || '撤銷管理員權限時發生錯誤，請稍後再試。');
        confirmBtn.disabled = false;
      }
    });

    document.body.appendChild(overlay);
  }

  function closeOverlays() {
    document.querySelectorAll('.admin-confirm-overlay').forEach(el => el.remove());
  }

  // =====================================================
  // 輔助函數
  // =====================================================

  function escapeHtml(str) {
    if (typeof str !== 'string') {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDateTime(dateString) {
    if (!dateString) {
      return 'N/A';
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }
}

