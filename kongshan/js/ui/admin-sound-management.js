// =====================================================
// 管理後台 - 系統音效庫管理
// =====================================================

/**
 * 渲染音效管理介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 * @param {Function} context.getCurrentUserId
 */
export async function renderSoundManagement(container, { adminManager, getCurrentUserId }) {
  if (!container || !adminManager || typeof getCurrentUserId !== 'function') {
    return;
  }

  container.classList.add('admin-view-shell');

  container.innerHTML = `
    <section class="admin-section">
      <header class="admin-section-header">
        <div>
          <h2 class="admin-section-title">系統音效庫</h2>
          <p class="admin-description">管理空山內建音效及公開的旅人音效，可新增、編輯或刪除音效。刪除後將一併移除使用該音效的聲色意境。</p>
        </div>
        <div class="admin-inline-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
          <button class="admin-btn admin-btn-primary admin-btn-small" type="button" data-action="create">
            <i class="fas fa-plus" aria-hidden="true"></i>
            新增音效
          </button>
        </div>
      </header>

      <div class="admin-card admin-card-table-wrapper">
        <table class="admin-table admin-sound-table" aria-describedby="sound-management-empty">
          <thead>
            <tr>
              <th scope="col">音效</th>
              <th scope="col">來源 / 狀態</th>
              <th scope="col">標籤</th>
              <th scope="col">時長</th>
              <th scope="col">使用 / 建立</th>
              <th scope="col" class="admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody id="admin-sound-table-body">
            <tr>
              <td colspan="6">
                <div class="admin-empty-state" id="sound-management-loading">
                  <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                  <p>載入音效中...</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  const state = {
    sounds: [],
    isLoading: false
  };

  const tableBody = container.querySelector('#admin-sound-table-body');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const createBtn = container.querySelector('[data-action="create"]');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadSounds(true).catch(err => console.warn('重新整理音效失敗:', err));
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openSoundForm('create');
    });
  }

  await loadSounds(false);

  async function loadSounds(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingRow();

    try {
      const results = await adminManager.getAllSoundEffects();
      state.sounds = Array.isArray(results) ? results : [];
      renderTable();
    } catch (error) {
      console.error('載入音效列表失敗:', error);
      showErrorRow('載入音效列表時發生錯誤，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  function renderTable() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = '';

    if (!state.sounds || state.sounds.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6">
          <div class="admin-empty-state" id="sound-management-empty">
            <i class="fas fa-volume-off" aria-hidden="true"></i>
            <p>目前沒有系統音效，請點擊右上角的「新增音效」。</p>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
      return;
    }

    state.sounds.forEach(sound => {
      const row = document.createElement('tr');
      row.dataset.soundId = sound.id;
      row.innerHTML = `
        <td data-label="音效">
          <div class="admin-sound-name">
            ${escapeHtml(sound.name || '未命名音效')}
          </div>
          ${sound.description ? `<div class="admin-sound-description">${escapeHtml(sound.description)}</div>` : ''}
        </td>
        <td data-label="來源 / 狀態">
          <div class="admin-tag-group">
            <span class="admin-tag ${getSourceTagClass(sound.source)}">${getSourceLabel(sound.source)}</span>
            <span class="admin-tag ${getStatusTagClass(sound.status)}">${getStatusLabel(sound.status)}</span>
          </div>
        </td>
        <td data-label="標籤">
          ${renderTags(sound.tags)}
        </td>
        <td data-label="時長">
          <div class="admin-meta">${formatDuration(sound.duration)}</div>
        </td>
        <td data-label="使用 / 建立">
          <div class="admin-meta">
            <i class="fas fa-headphones" aria-hidden="true"></i>
            使用 ${Number.isFinite(sound.usage_count) ? sound.usage_count : 0}
          </div>
          <div class="admin-meta">
            <i class="fas fa-clock" aria-hidden="true"></i>
            ${formatDateTime(sound.created_at)}
          </div>
        </td>
        <td class="admin-table-actions">
          <div class="admin-inline-actions">
            <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="preview">
              <i class="fas fa-play" aria-hidden="true"></i>
              預覽
            </button>
            <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="edit">
              <i class="fas fa-pen" aria-hidden="true"></i>
              編輯
            </button>
            <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="delete">
              <i class="fas fa-trash-can" aria-hidden="true"></i>
              刪除
            </button>
          </div>
        </td>
      `;

      const previewBtn = row.querySelector('[data-action="preview"]');
      const editBtn = row.querySelector('[data-action="edit"]');
      const deleteBtn = row.querySelector('[data-action="delete"]');

      previewBtn?.addEventListener('click', () => openSoundPreview(sound));
      editBtn?.addEventListener('click', () => openSoundForm('edit', sound));
      deleteBtn?.addEventListener('click', () => openDeleteConfirm(sound));

      tableBody.appendChild(row);
    });
  }

  function showLoadingRow() {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="admin-empty-state">
            <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
            <p>載入音效中...</p>
          </div>
        </td>
      </tr>
    `;
  }

  function showErrorRow(message) {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="admin-error">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
            <p>${message}</p>
          </div>
        </td>
      </tr>
    `;
  }

  // =====================================================
  // 表單與操作
  // =====================================================

  function openSoundForm(mode, sound = null) {
    closeOverlays();

    const isEdit = mode === 'edit' && sound;

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h2 class="admin-modal-title">${isEdit ? '編輯音效' : '新增音效'}</h2>
          <button type="button" class="admin-modal-close" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <form class="admin-form" id="sound-form">
          <div class="admin-form-group">
            <label class="admin-form-label" for="sound-name-input">音效名稱</label>
            <input type="text" id="sound-name-input" class="admin-form-input" maxlength="120" required placeholder="例如：夜雨松風">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label" for="sound-description-input">簡短描述（選填）</label>
            <textarea id="sound-description-input" class="admin-form-textarea" rows="3" placeholder="介紹音效的氛圍、使用情境等"></textarea>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label" for="sound-url-input">音效網址 / Supabase 公開網址</label>
            <input type="url" id="sound-url-input" class="admin-form-input" required placeholder="https://...">
          </div>
          <div class="admin-form-group admin-form-dual">
            <div>
              <label class="admin-form-label" for="sound-duration-input">時長（秒，選填）</label>
              <input type="number" id="sound-duration-input" class="admin-form-input" min="0" step="1" placeholder="例如：120">
            </div>
            <div>
              <label class="admin-form-label" for="sound-tags-input">標籤（以逗號分隔，可留空）</label>
              <input type="text" id="sound-tags-input" class="admin-form-input" placeholder="雨聲, 森林, 夜晚">
            </div>
          </div>
          <div class="admin-form-group admin-form-dual">
            <div>
              <label class="admin-form-label" for="sound-source-input">來源</label>
              <select id="sound-source-input" class="admin-form-select">
                <option value="system">系統音效</option>
                <option value="user">旅人音效</option>
              </select>
            </div>
            <div>
              <label class="admin-form-label" for="sound-status-input">狀態</label>
              <select id="sound-status-input" class="admin-form-select">
                <option value="approved">已公開</option>
                <option value="pending">待審核</option>
                <option value="private">僅管理員可見</option>
                <option value="rejected">已退回</option>
              </select>
            </div>
          </div>
          <p class="admin-error-text admin-hidden" data-role="form-error"></p>
          <div class="admin-modal-actions">
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-small" data-action="cancel">取消</button>
            <button type="submit" class="admin-btn admin-btn-primary admin-btn-small">${isEdit ? '儲存變更' : '新增音效'}</button>
          </div>
        </form>
      </div>
    `;

  const closeBtn = overlay.querySelector('.admin-modal-close');
  const cancelBtn = overlay.querySelector('[data-action="cancel"]');
  const form = overlay.querySelector('#sound-form');
  const errorEl = overlay.querySelector('[data-role="form-error"]');

  const nameInput = overlay.querySelector('#sound-name-input');
  const descriptionInput = overlay.querySelector('#sound-description-input');
  const urlInput = overlay.querySelector('#sound-url-input');
  const durationInput = overlay.querySelector('#sound-duration-input');
  const tagsInput = overlay.querySelector('#sound-tags-input');
  const sourceSelect = overlay.querySelector('#sound-source-input');
  const statusSelect = overlay.querySelector('#sound-status-input');

  if (isEdit) {
    nameInput.value = sound.name || '';
    descriptionInput.value = sound.description || '';
    urlInput.value = sound.file_url || '';
    durationInput.value = Number.isFinite(sound.duration) ? String(sound.duration) : '';
    tagsInput.value = Array.isArray(sound.tags) ? sound.tags.join(', ') : '';
    sourceSelect.value = (sound.source || 'system');
    statusSelect.value = (sound.status || 'approved');
  } else {
    sourceSelect.value = 'system';
    statusSelect.value = 'approved';
  }

  function closeModal() {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 150);
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
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim() || null,
      file_url: urlInput.value.trim(),
      duration: parseDuration(durationInput.value),
      tags: parseTags(tagsInput.value),
      source: sourceSelect.value || 'system',
      status: statusSelect.value || 'approved'
    };

    if (!payload.name || !payload.file_url) {
      showMessage(errorEl, '名稱與音效網址為必填項目。');
      return;
    }

    try {
      if (isEdit && sound) {
        const result = await adminManager.updateSoundEffect(sound.id, payload);
        if (!result?.success) {
          throw new Error(result?.error || '更新音效失敗，請稍後再試。');
        }
      } else {
        const result = await adminManager.createSoundEffect(payload);
        if (!result?.success) {
          throw new Error(result?.error || '新增音效失敗，請稍後再試。');
        }
      }

      closeModal();
      await loadSounds(true);
    } catch (error) {
      console.error('儲存音效失敗:', error);
      showMessage(errorEl, error.message || '儲存音效時發生錯誤，請稍後再試。');
    }
  });

  document.body.appendChild(overlay);
  nameInput?.focus();
}

  function openDeleteConfirm(sound) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <h3 class="admin-confirm-dialog-title">刪除音效</h3>
        <p class="admin-confirm-dialog-message">
          確定要刪除 <strong>${escapeHtml(sound.name || '未命名音效')}</strong> 嗎？<br>
          使用該音效的聲色意境會同步刪除，請謹慎操作。
        </p>
        <div class="admin-confirm-dialog-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="cancel">取消</button>
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
        const result = await adminManager.deleteSoundEffect(sound.id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '刪除音效失敗，請稍後再試。');
        }
        if (Number.isFinite(result?.deletedAtmospheres)) {
          alert(`音效已刪除，同時移除了 ${result.deletedAtmospheres} 個聲色意境。`);
        }
      } catch (error) {
        console.error('刪除音效失敗:', error);
        alert(error.message || '刪除音效時發生錯誤，請稍後再試。');
      } finally {
        closeDialog();
        await loadSounds(true);
      }
    });

    document.body.appendChild(overlay);
  }

  function openSoundPreview(sound) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h2 class="admin-modal-title">音效預覽</h2>
          <button type="button" class="admin-modal-close" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div class="admin-audio-preview">
          <p class="admin-sound-name">${escapeHtml(sound.name || '未命名音效')}</p>
          ${sound.description ? `<p class="admin-sound-description">${escapeHtml(sound.description)}</p>` : ''}
          <audio controls preload="auto" class="admin-audio">
            <source src="${escapeAttribute(sound.file_url || '')}" />
            您的瀏覽器無法播放此音效。
          </audio>
          <p class="admin-meta">
            <i class="fas fa-link" aria-hidden="true"></i>
            <a href="${escapeAttribute(sound.file_url || '#')}" target="_blank" rel="noopener noreferrer">在新視窗開啟音效連結</a>
          </p>
        </div>
      </div>
    `;

    const closeBtn = overlay.querySelector('.admin-modal-close');
    const audioEl = overlay.querySelector('audio');

    closeBtn?.addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 150);
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 150);
      }
    });

    if (audioEl) {
      audioEl.addEventListener('canplay', () => {
        audioEl.play().catch(() => {});
      }, { once: true });
    }

    document.body.appendChild(overlay);
  }

  function closeOverlays() {
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

function escapeAttribute(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return escapeHtml(str);
}

function formatDuration(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const totalSeconds = Math.max(0, Math.round(value));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(isoString) {
  if (!isoString) {
    return '時間未知';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '時間未知';
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return '<span class="admin-meta admin-meta-muted">—</span>';
  }
  const formatted = tags
    .map(tag => tag && tag.trim())
    .filter(Boolean)
    .map(tag => `#${escapeHtml(tag)}`)
    .join(' ');
  return `<span class="admin-sound-tags">${formatted}</span>`;
}

function parseTags(value) {
  if (!value) {
    return null;
  }
  const raw = value
    .replace(/，/g, ',')
    .split(/[,，\s]+/)
    .map(tag => tag.trim())
    .filter(Boolean);
  return raw.length > 0 ? raw : null;
}

function parseDuration(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.round(num);
}

function getSourceLabel(source) {
  switch ((source || 'system').toLowerCase()) {
    case 'user':
      return '旅人音效';
    case 'system':
    default:
      return '系統音效';
  }
}

function getSourceTagClass(source) {
  switch ((source || 'system').toLowerCase()) {
    case 'user':
      return 'admin-tag-muted';
    case 'system':
    default:
      return 'admin-tag-outline';
  }
}

function getStatusLabel(status) {
  switch ((status || 'approved').toLowerCase()) {
    case 'pending':
      return '待審核';
    case 'private':
      return '僅管理員';
    case 'rejected':
      return '已退回';
    case 'approved':
    default:
      return '已公開';
  }
}

function getStatusTagClass(status) {
  switch ((status || 'approved').toLowerCase()) {
    case 'pending':
      return 'admin-tag-warning';
    case 'private':
      return 'admin-tag-muted';
    case 'rejected':
      return 'admin-tag-danger';
    case 'approved':
    default:
      return 'admin-tag-success';
  }
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

