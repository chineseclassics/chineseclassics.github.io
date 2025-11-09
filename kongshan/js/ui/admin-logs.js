// =====================================================
// 管理後台 - 操作日誌介面
// =====================================================

/**
 * 渲染操作日誌介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 */
export async function renderAdminLogs(container, { adminManager }) {
  if (!container || !adminManager) {
    return;
  }

  container.classList.add('admin-view-shell');

  // 操作類型選項
  const actionTypes = [
    { value: '', label: '全部操作' },
    { value: 'review_recording', label: '審核錄音' },
    { value: 'approve_recording', label: '批准錄音' },
    { value: 'reject_recording', label: '拒絕錄音' },
    { value: 'create_poem', label: '新增詩句' },
    { value: 'update_poem', label: '更新詩句' },
    { value: 'delete_poem', label: '刪除詩句' },
    { value: 'create_sound', label: '新增音效' },
    { value: 'update_sound', label: '更新音效' },
    { value: 'delete_sound', label: '刪除音效' },
    { value: 'delete_user', label: '刪除用戶' },
    { value: 'promote_admin', label: '任命管理員' },
    { value: 'revoke_admin', label: '撤銷管理員' }
  ];

  // 目標類型選項
  const targetTypes = [
    { value: '', label: '全部目標' },
    { value: 'recording', label: '錄音' },
    { value: 'poem', label: '詩句' },
    { value: 'sound_effect', label: '音效' },
    { value: 'user', label: '用戶' },
    { value: 'admin', label: '管理員' }
  ];

  container.innerHTML = `
    <section class="admin-section">
      <header class="admin-section-header">
        <div>
          <h2 class="admin-section-title">操作日誌</h2>
        </div>
        <div class="admin-inline-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
        </div>
      </header>

      <!-- 篩選和搜索區域 -->
      <div class="admin-card admin-filters-card">
        <div class="admin-filters-row">
          <div class="admin-form-group admin-form-group-inline">
            <label for="log-action-type-filter" class="admin-form-label">操作類型</label>
            <select id="log-action-type-filter" class="admin-form-select">
              ${actionTypes.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
          </div>
          <div class="admin-form-group admin-form-group-inline">
            <label for="log-target-type-filter" class="admin-form-label">目標類型</label>
            <select id="log-target-type-filter" class="admin-form-select">
              ${targetTypes.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
          </div>
          <div class="admin-form-group admin-form-group-inline">
            <label for="log-search-input" class="admin-form-label">搜索</label>
            <input 
              type="text" 
              id="log-search-input" 
              class="admin-form-input" 
              placeholder="搜索操作者、目標ID..."
            />
          </div>
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="clear-filters">
            <i class="fas fa-times" aria-hidden="true"></i>
            清除篩選
          </button>
        </div>
      </div>

      <!-- 日誌列表 -->
      <div class="admin-card admin-card-table-wrapper">
        <table class="admin-table admin-logs-table" aria-describedby="logs-management-empty">
          <thead>
            <tr>
              <th scope="col">時間</th>
              <th scope="col">操作者</th>
              <th scope="col">操作類型</th>
              <th scope="col">目標類型</th>
              <th scope="col">目標ID</th>
              <th scope="col">操作詳情</th>
              <th scope="col">IP地址</th>
            </tr>
          </thead>
          <tbody id="admin-logs-table-body">
            <tr>
              <td colspan="7">
                <div class="admin-empty-state" id="logs-management-loading">
                  <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                  <p>載入操作日誌中...</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="admin-logs-pagination" class="admin-pagination"></div>
    </section>
  `;

  const state = {
    logs: [],
    isLoading: false,
    currentPage: 1,
    pageSize: 50,
    totalLogs: 0,
    filters: {
      actionType: '',
      targetType: '',
      search: ''
    },
    adminNames: new Map() // admin_id -> display_name
  };

  const tableBody = container.querySelector('#admin-logs-table-body');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const clearFiltersBtn = container.querySelector('[data-action="clear-filters"]');
  const actionTypeFilter = container.querySelector('#log-action-type-filter');
  const targetTypeFilter = container.querySelector('#log-target-type-filter');
  const searchInput = container.querySelector('#log-search-input');
  const paginationEl = container.querySelector('#admin-logs-pagination');

  // 綁定事件
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLogs(true).catch(err => console.warn('重新整理操作日誌失敗:', err));
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      state.filters.actionType = '';
      state.filters.targetType = '';
      state.filters.search = '';
      actionTypeFilter.value = '';
      targetTypeFilter.value = '';
      searchInput.value = '';
      state.currentPage = 1;
      loadLogs(true).catch(err => console.warn('載入操作日誌失敗:', err));
    });
  }

  if (actionTypeFilter) {
    actionTypeFilter.addEventListener('change', () => {
      state.filters.actionType = actionTypeFilter.value;
      state.currentPage = 1;
      loadLogs(true).catch(err => console.warn('載入操作日誌失敗:', err));
    });
  }

  if (targetTypeFilter) {
    targetTypeFilter.addEventListener('change', () => {
      state.filters.targetType = targetTypeFilter.value;
      state.currentPage = 1;
      loadLogs(true).catch(err => console.warn('載入操作日誌失敗:', err));
    });
  }

  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = searchInput.value.trim();
        state.currentPage = 1;
        loadLogs(true).catch(err => console.warn('載入操作日誌失敗:', err));
      }, 300); // 防抖 300ms
    });
  }

  await loadLogs(false);

  async function loadLogs(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingRow();

    try {
      const actionType = state.filters.actionType || null;
      const targetType = state.filters.targetType || null;

      const { data, total } = await adminManager.getAdminLogs(
        state.currentPage,
        state.pageSize,
        actionType,
        targetType
      );

      let logs = Array.isArray(data) ? data : [];

      // 應用搜索過濾
      if (state.filters.search) {
        const searchLower = state.filters.search.toLowerCase();
        logs = logs.filter(log => {
          const adminName = state.adminNames.get(log.admin_id) || '';
          const targetId = log.target_id || '';
          const detailsStr = JSON.stringify(log.details || {});
          return (
            adminName.toLowerCase().includes(searchLower) ||
            targetId.toLowerCase().includes(searchLower) ||
            detailsStr.toLowerCase().includes(searchLower)
          );
        });
      }

      state.logs = logs;
      state.totalLogs = total || 0;

      // 載入操作者名稱
      await loadAdminNames(logs);

      renderTable();
      renderPagination();
    } catch (error) {
      console.error('載入操作日誌失敗:', error);
      showErrorRow('載入操作日誌失敗，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  async function loadAdminNames(logs) {
    const adminIds = [...new Set(logs.map(log => log.admin_id).filter(Boolean))];
    if (adminIds.length === 0) {
      return;
    }

    // 只載入尚未載入的管理員名稱
    const missingIds = adminIds.filter(id => !state.adminNames.has(id));
    if (missingIds.length === 0) {
      return;
    }

    try {
      if (adminManager.supabase) {
        const { data: travelers, error } = await adminManager.supabase
          .from('travelers')
          .select('user_id, display_name')
          .in('user_id', missingIds);

        if (!error && Array.isArray(travelers)) {
          travelers.forEach(t => {
            state.adminNames.set(t.user_id, t.display_name || '未知用戶');
          });
        }
      }
    } catch (error) {
      console.warn('載入操作者名稱失敗:', error);
    }
  }

  function renderTable() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = '';

    if (!state.logs || state.logs.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="7">
          <div class="admin-empty-state" id="logs-management-empty">
            <i class="fas fa-scroll" aria-hidden="true"></i>
            <p>目前沒有任何操作日誌。</p>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
      return;
    }

    state.logs.forEach(log => {
      const row = document.createElement('tr');
      row.dataset.logId = log.id;

      const adminName = log.admin_id ? (state.adminNames.get(log.admin_id) || '未知用戶') : '系統';
      const actionLabel = getActionLabel(log.action_type);
      const targetLabel = getTargetLabel(log.target_type);
      const detailsStr = formatDetails(log.details);
      const ipAddress = log.ip_address || '-';

      row.innerHTML = `
        <td data-label="時間">
          <div class="admin-meta">
            <i class="fas fa-clock" aria-hidden="true"></i>
            ${formatDateTime(log.created_at)}
          </div>
        </td>
        <td data-label="操作者">
          <div class="admin-user-name">${escapeHtml(adminName)}</div>
        </td>
        <td data-label="操作類型">
          <span class="admin-tag ${getActionTagClass(log.action_type)}">${escapeHtml(actionLabel)}</span>
        </td>
        <td data-label="目標類型">
          <span class="admin-tag admin-tag-neutral">${escapeHtml(targetLabel)}</span>
        </td>
        <td data-label="目標ID">
          <div class="admin-meta admin-text-muted">${log.target_id ? escapeHtml(log.target_id.substring(0, 8) + '...') : '-'}</div>
        </td>
        <td data-label="操作詳情">
          <div class="admin-log-details">${detailsStr}</div>
        </td>
        <td data-label="IP地址">
          <div class="admin-meta admin-text-muted">${escapeHtml(ipAddress)}</div>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  function showLoadingRow() {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="admin-empty-state">
            <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
            <p>載入操作日誌中...</p>
          </div>
        </td>
      </tr>
    `;
  }

  function showErrorRow(message) {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
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

    const totalPages = Math.ceil(state.totalLogs / state.pageSize);
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
        共 ${state.totalLogs} 條記錄，第 ${state.currentPage} / ${totalPages} 頁
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
          loadLogs(true).catch(err => console.warn('切換頁面失敗:', err));
        }
      });
    });

    paginationEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        loadLogs(true).catch(err => console.warn('切換頁面失敗:', err));
      }
    });

    paginationEl.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      const totalPages = Math.ceil(state.totalLogs / state.pageSize);
      if (state.currentPage < totalPages) {
        state.currentPage++;
        loadLogs(true).catch(err => console.warn('切換頁面失敗:', err));
      }
    });
  }

  // =====================================================
  // 輔助函數
  // =====================================================

  function getActionLabel(actionType) {
    const labels = {
      'review_recording': '審核錄音',
      'approve_recording': '批准錄音',
      'reject_recording': '拒絕錄音',
      'create_poem': '新增詩句',
      'update_poem': '更新詩句',
      'delete_poem': '刪除詩句',
      'create_sound': '新增音效',
      'update_sound': '更新音效',
      'delete_sound': '刪除音效',
      'delete_user': '刪除用戶',
      'promote_admin': '任命管理員',
      'revoke_admin': '撤銷管理員'
    };
    return labels[actionType] || actionType;
  }

  function getTargetLabel(targetType) {
    const labels = {
      'recording': '錄音',
      'poem': '詩句',
      'sound_effect': '音效',
      'user': '用戶',
      'admin': '管理員'
    };
    return labels[targetType] || targetType;
  }

  function getActionTagClass(actionType) {
    if (actionType.includes('delete') || actionType.includes('reject')) {
      return 'admin-tag-danger';
    }
    if (actionType.includes('create') || actionType.includes('approve') || actionType.includes('promote')) {
      return 'admin-tag-success';
    }
    if (actionType.includes('update')) {
      return 'admin-tag-info';
    }
    return 'admin-tag-neutral';
  }

  function formatDetails(details) {
    if (!details || typeof details !== 'object') {
      return '-';
    }

    try {
      const entries = Object.entries(details);
      if (entries.length === 0) {
        return '-';
      }

      return entries.map(([key, value]) => {
        const keyLabel = getDetailKeyLabel(key);
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `<span class="admin-detail-item"><strong>${escapeHtml(keyLabel)}</strong>: ${escapeHtml(valueStr)}</span>`;
      }).join('<br>');
    } catch (error) {
      return '-';
    }
  }

  function getDetailKeyLabel(key) {
    const labels = {
      'recording_id': '錄音ID',
      'poem_id': '詩句ID',
      'sound_id': '音效ID',
      'user_id': '用戶ID',
      'admin_id': '管理員ID',
      'rejection_reason': '拒絕原因',
      'review_notes': '審核備註',
      'deleted_atmospheres_count': '刪除的聲色意境數',
      'promoted_user_id': '被任命的用戶ID',
      'revoked_user_id': '被撤銷的用戶ID'
    };
    return labels[key] || key;
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
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

