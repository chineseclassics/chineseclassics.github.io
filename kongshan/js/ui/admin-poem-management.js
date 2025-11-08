// =====================================================
// 管理後台 - 詩句庫管理介面
// =====================================================

/**
 * 渲染詩句管理介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 */
export async function renderPoemManagement(container, { adminManager, getCurrentUserId }) {
  if (!container || !adminManager || typeof getCurrentUserId !== 'function') {
    return;
  }

  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <div>
          <h2 class="admin-section-title">詩句庫管理</h2>
          <p class="admin-description">管理系統中的詩歌。可以新增、編輯或刪除詩句，調整內容後將立即反映在旅人端。</p>
        </div>
        <div class="admin-inline-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
          <button class="admin-btn admin-btn-primary" type="button" data-action="create">
            <i class="fas fa-plus" aria-hidden="true"></i>
            新增詩句
          </button>
        </div>
      </div>
      <div class="admin-card admin-card-table-wrapper">
        <table class="admin-table" aria-describedby="poem-management-empty">
          <thead>
            <tr>
              <th scope="col">題名</th>
              <th scope="col">作者</th>
              <th scope="col">朝代</th>
              <th scope="col">建立時間</th>
              <th scope="col" class="admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody id="admin-poem-table-body">
            <tr>
              <td colspan="5">
                <div class="admin-empty-state" id="admin-poem-loading">
                  <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                  <p>載入詩句中...</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const state = {
    poems: [],
    isLoading: false,
    currentPage: 1,
    pageSize: 50
  };

  const tableBody = container.querySelector('#admin-poem-table-body');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const createBtn = container.querySelector('[data-action="create"]');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadPoems(true).catch(err => console.warn('重新整理詩句失敗:', err));
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openPoemForm('create');
    });
  }

  await loadPoems(false);

  async function loadPoems(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingRow();

    try {
      const { data } = await adminManager.getAllPoems(state.currentPage, state.pageSize);
      state.poems = Array.isArray(data) ? data : [];
      renderTable();
    } catch (error) {
      console.error('載入詩句列表失敗:', error);
      showErrorRow('載入詩句失敗，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  function renderTable() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = '';

    if (!state.poems || state.poems.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="5">
          <div class="admin-empty-state" id="poem-management-empty">
            <i class="fas fa-book-open" aria-hidden="true"></i>
            <p>目前沒有任何詩句，請點擊右上角的「新增詩句」。</p>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
      return;
    }

    state.poems.forEach(poem => {
      const row = document.createElement('tr');
      row.dataset.poemId = poem.id;
      row.innerHTML = `
        <td data-label="題名">${escapeHtml(poem.title || '未命名')}</td>
        <td data-label="作者">${escapeHtml(poem.author || '佚名')}</td>
        <td data-label="朝代">${escapeHtml(poem.dynasty || '未知')}</td>
        <td data-label="建立時間">${formatDate(poem.created_at)}</td>
        <td class="admin-table-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="edit">
            <i class="fas fa-pen" aria-hidden="true"></i>
            編輯
          </button>
          <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="delete">
            <i class="fas fa-trash-can" aria-hidden="true"></i>
            刪除
          </button>
        </td>
      `;

      const editBtn = row.querySelector('[data-action="edit"]');
      const deleteBtn = row.querySelector('[data-action="delete"]');

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          openPoemForm('edit', poem);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          openDeleteConfirm(poem);
        });
      }

      tableBody.appendChild(row);
    });
  }

  function showLoadingRow() {
    if (!tableBody) {
      return;
    }
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="admin-empty-state">
            <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
            <p>載入詩句中...</p>
          </div>
        </td>
      </tr>
    `;
  }

  function showErrorRow(message) {
    if (!tableBody) {
      return;
    }
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

  // =====================================================
  // 詩句表單
  // =====================================================

  function openPoemForm(mode, poem = null) {
    closeExistingModal();

    const isEdit = mode === 'edit';

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'poem-form-title');

    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h2 id="poem-form-title" class="admin-modal-title">${isEdit ? '編輯詩句' : '新增詩句'}</h2>
          <button type="button" class="admin-modal-close" aria-label="關閉" title="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <form class="admin-form" id="poem-form">
          <div class="admin-form-group">
            <label class="admin-form-label" for="poem-title-input">題名</label>
            <input type="text" id="poem-title-input" class="admin-form-input" maxlength="120" required placeholder="例如：登鸛雀樓">
          </div>
          <div class="admin-form-group admin-form-dual">
            <div>
              <label class="admin-form-label" for="poem-author-input">作者</label>
              <input type="text" id="poem-author-input" class="admin-form-input" maxlength="60" placeholder="例如：王之涣">
            </div>
            <div>
              <label class="admin-form-label" for="poem-dynasty-input">朝代</label>
              <input type="text" id="poem-dynasty-input" class="admin-form-input" maxlength="30" placeholder="例如：唐">
            </div>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label" for="poem-content-input">詩文</label>
            <textarea id="poem-content-input" class="admin-form-textarea" rows="6" required placeholder="請輸入完整詩文，每一句可另起一行。"></textarea>
          </div>
          <p class="admin-error-text admin-hidden" data-role="form-error"></p>
          <div class="admin-modal-actions">
            <button type="button" class="admin-btn admin-btn-secondary" data-action="cancel">取消</button>
            <button type="submit" class="admin-btn admin-btn-primary">${isEdit ? '儲存變更' : '新增詩句'}</button>
          </div>
        </form>
      </div>
    `;

    const form = overlay.querySelector('#poem-form');
    const closeBtn = overlay.querySelector('.admin-modal-close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const errorEl = overlay.querySelector('[data-role="form-error"]');

    const titleInput = overlay.querySelector('#poem-title-input');
    const authorInput = overlay.querySelector('#poem-author-input');
    const dynastyInput = overlay.querySelector('#poem-dynasty-input');
    const contentInput = overlay.querySelector('#poem-content-input');

    if (isEdit && poem) {
      titleInput.value = poem.title || '';
      authorInput.value = poem.author || '';
      dynastyInput.value = poem.dynasty || '';
      contentInput.value = poem.content || '';
    }

    function closeModal() {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
      }, 150);
    }

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideMessage(errorEl);

      const payload = {
        title: titleInput.value.trim(),
        author: authorInput.value.trim() || null,
        dynasty: dynastyInput.value.trim() || null,
        content: contentInput.value.trim()
      };

      if (!payload.title || !payload.content) {
        showMessage(errorEl, '題名與詩文內容為必填。');
        return;
      }

      try {
        if (isEdit && poem) {
          const result = await adminManager.updatePoem(poem.id, payload);
          if (!result?.success) {
            throw new Error(result?.error || '更新詩句失敗，請稍後再試。');
          }
        } else {
          const result = await adminManager.createPoem(payload);
          if (!result?.success) {
            throw new Error(result?.error || '新增詩句失敗，請稍後再試。');
          }
        }

        closeModal();
        await loadPoems(true);
      } catch (error) {
        console.error('儲存詩句失敗:', error);
        showMessage(errorEl, error.message || '儲存詩句時發生錯誤，請稍後再試。');
      }
    });

    document.body.appendChild(overlay);
    titleInput?.focus();
  }

  function openDeleteConfirm(poem) {
    closeExistingModal();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <h3 class="admin-confirm-dialog-title">刪除詩句</h3>
        <p class="admin-confirm-dialog-message">
          確定要刪除 <strong>${escapeHtml(poem.title || '未命名')}</strong> 嗎？<br>
          詩句刪除後，相關聲色意境會保留，但詩句本身無法復原。
        </p>
        <div class="admin-confirm-dialog-actions">
          <button class="admin-btn admin-btn-secondary" type="button" data-action="cancel">取消</button>
          <button class="admin-btn admin-btn-danger" type="button" data-action="confirm">刪除</button>
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
        const result = await adminManager.deletePoem(poem.id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '刪除詩句失敗，請稍後再試。');
        }
      } catch (error) {
        console.error('刪除詩句失敗:', error);
        alert(error.message || '刪除詩句時發生錯誤，請稍後再試。');
      } finally {
        closeDialog();
        await loadPoems(true);
      }
    });

    document.body.appendChild(overlay);
  }

  function closeExistingModal() {
    document.querySelectorAll('.admin-modal-overlay, .admin-confirm-overlay').forEach(el => el.remove());
  }
}

// =====================================================
// 輔助函數
// =====================================================

function escapeHtml(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) {
    return '未知';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知';
  }
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function showMessage(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('admin-hidden');
}

function hideMessage(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.add('admin-hidden');
}

