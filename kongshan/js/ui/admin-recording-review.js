// =====================================================
// 管理後台 - 音效審核介面
// =====================================================

const BUCKET_NAME = 'kongshan_recordings';

/**
 * 渲染音效審核介面
 * @param {HTMLElement} container - 容器節點
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 * @param {import('@supabase/supabase-js').SupabaseClient} context.supabase
 * @param {Function} context.getCurrentUserId
 */
export async function renderRecordingReview(container, { adminManager, supabase, getCurrentUserId }) {
  if (!container) {
    return;
  }

  container.classList.add('admin-view-shell');

  container.innerHTML = `
    <div class="admin-section-header">
      <div>
        <h2 class="admin-section-title">音效審核</h2>
        <p class="admin-description">請聆聽旅人上傳的音效，並給予審核結果。通過後音效會立即對所有旅人開放使用。</p>
      </div>
      <div class="admin-inline-actions">
        <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
          <i class="fas fa-rotate-right" aria-hidden="true"></i>
          重新整理
        </button>
      </div>
    </div>
    <div class="admin-card-list" id="admin-recording-review-list">
      <div class="admin-empty-state" id="admin-recording-review-loading">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
        <p>載入待審核音效中...</p>
      </div>
    </div>
    <div id="admin-recording-pagination" class="admin-pagination"></div>
  `;

  const listEl = container.querySelector('#admin-recording-review-list');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const paginationEl = container.querySelector('#admin-recording-pagination');

  const state = {
    isLoading: false,
    records: [],
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0
  };

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadRecords(true).catch(error => {
        console.warn('重新整理待審核音效失敗:', error);
      });
    });
  }

  await loadRecords(false);

  async function loadRecords(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingState();

    try {
      const { data, total } = await adminManager.getPendingRecordings(state.currentPage, state.pageSize);
      state.records = Array.isArray(data) ? data : [];
      state.totalRecords = total || 0;
      
      // 如果當前頁沒有數據且不是第一頁，重置到第一頁
      if (state.records.length === 0 && state.currentPage > 1 && state.totalRecords > 0) {
        state.currentPage = 1;
        // 重新載入第一頁
        const { data: firstPageData, total: firstPageTotal } = await adminManager.getPendingRecordings(1, state.pageSize);
        state.records = Array.isArray(firstPageData) ? firstPageData : [];
        state.totalRecords = firstPageTotal || 0;
      }
      
      renderList();
      renderPagination();
    } catch (error) {
      console.error('載入待審核錄音失敗:', error);
      showErrorState('載入待審核音效時發生錯誤，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  function renderList() {
    if (!listEl) {
      return;
    }

    listEl.innerHTML = '';

    if (!state.records || state.records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'admin-empty-state';
      empty.innerHTML = `
        <i class="fas fa-check-circle" aria-hidden="true"></i>
        <p>目前沒有待審核的旅人錄音。</p>
      `;
      listEl.appendChild(empty);
      return;
    }

    state.records.forEach(record => {
      const card = createRecordingCard(record);
      listEl.appendChild(card);
    });
  }

  function showLoadingState() {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = `
      <div class="admin-empty-state">
        <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
        <p>載入待審核音效中...</p>
      </div>
    `;
  }

  function showErrorState(message) {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = `
      <div class="admin-error">
        <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
        <p>${message}</p>
      </div>
    `;
  }

  function renderPagination() {
    if (!paginationEl) {
      return;
    }

    const totalPages = Math.ceil(state.totalRecords / state.pageSize);
    if (totalPages <= 1) {
      paginationEl.innerHTML = state.totalRecords > 0 
        ? `<div class="admin-pagination-info">共 ${state.totalRecords} 個待審核音效</div>`
        : '';
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
        共 ${state.totalRecords} 個待審核音效，第 ${state.currentPage} / ${totalPages} 頁
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

    // 綁定分頁事件
    const prevBtn = paginationEl.querySelector('[data-action="prev"]');
    const nextBtn = paginationEl.querySelector('[data-action="next"]');
    const pageBtns = paginationEl.querySelectorAll('[data-page]');

    prevBtn?.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        loadRecords(true).catch(err => console.warn('載入待審核音效失敗:', err));
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        loadRecords(true).catch(err => console.warn('載入待審核音效失敗:', err));
      }
    });

    pageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page && page !== state.currentPage) {
          state.currentPage = page;
          loadRecords(true).catch(err => console.warn('載入待審核音效失敗:', err));
        }
      });
    });
  }

  function createRecordingCard(recording) {
    const {
      id,
      display_name: displayName,
      duration_seconds: durationSeconds,
      created_at: createdAt,
      owner,
      storage_path: storagePath
    } = recording;

    const ownerName = (owner?.display_name || '').trim() || '旅人';
    const ownerEmail = (owner?.email || '').trim();

    const card = document.createElement('article');
    card.className = 'admin-card';
    card.dataset.recordingId = id;

    card.innerHTML = `
      <div class="admin-card-header">
        <div>
          <h3 class="admin-card-title">${escapeHtml(displayName || '未命名錄音')}</h3>
          <div class="admin-card-meta">
            <span class="admin-tag admin-tag-info">
              <i class="fas fa-clock" aria-hidden="true"></i>
              ${formatDuration(durationSeconds)}
            </span>
            <span class="admin-meta">
              <i class="fas fa-calendar-day" aria-hidden="true"></i>
              ${formatDateTime(createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div class="admin-meta">
        <i class="fas fa-user-circle" aria-hidden="true"></i>
        ${escapeHtml(ownerName)}${ownerEmail ? `｜${escapeHtml(ownerEmail)}` : ''}
      </div>

      <div class="admin-audio-wrapper">
        <audio class="admin-audio" controls preload="none" data-loading="true">
          <source src="" type="audio/mp4">
        </audio>
        <p class="admin-meta admin-audio-hint">若無法播放，請點擊「重新整理」重新取得音訊連結。</p>
      </div>

      <div class="admin-form">
        <div class="admin-form-group">
          <label class="admin-form-label" for="rejection-${id}">拒絕原因（僅在拒絕時必填）</label>
          <textarea id="rejection-${id}" class="admin-form-textarea" rows="3" placeholder="請輸入拒絕原因，旅人會看到這段文字"></textarea>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label" for="notes-${id}">備註（選填）</label>
          <textarea id="notes-${id}" class="admin-form-textarea" rows="2" placeholder="給旅人的私人訊息（選填）"></textarea>
        </div>
        <div class="admin-inline-actions admin-card-actions">
          <button class="admin-btn admin-btn-danger" data-action="reject">
            <i class="fas fa-xmark" aria-hidden="true"></i>
            拒絕審核
          </button>
          <button class="admin-btn admin-btn-primary" data-action="approve">
            <i class="fas fa-check" aria-hidden="true"></i>
            通過審核
          </button>
        </div>
        <p class="admin-error-text admin-hidden" data-role="error"></p>
        <p class="admin-success-text admin-hidden" data-role="success"></p>
      </div>
    `;

    const audioEl = card.querySelector('audio');
    if (audioEl && storagePath && supabase) {
      createSignedUrl(storagePath)
        .then(url => {
          if (!url) {
            throw new Error('簽名網址為空');
          }
          const source = audioEl.querySelector('source');
          if (source) {
            source.src = url;
          }
          audioEl.load();
        })
        .catch(error => {
          console.warn('載入錄音檔案失敗:', error);
          const metaHint = card.querySelector('.admin-audio-hint');
          if (metaHint) {
            metaHint.textContent = '暫時無法取得音訊播放連結，請稍後再試或重新整理。';
          }
        })
        .finally(() => {
          audioEl.dataset.loading = 'false';
        });
    }

    const approveBtn = card.querySelector('[data-action="approve"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');

    if (approveBtn) {
      approveBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await performReview(card, recording, 'approved');
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await performReview(card, recording, 'rejected');
      });
    }

    return card;
  }

  async function performReview(card, recording, status) {
    if (!card || !recording) {
      return;
    }

    const approveBtn = card.querySelector('[data-action="approve"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');
    const reasonInput = card.querySelector(`#rejection-${recording.id}`);
    const notesInput = card.querySelector(`#notes-${recording.id}`);
    const errorEl = card.querySelector('[data-role="error"]');
    const successEl = card.querySelector('[data-role="success"]');

    hideMessage(errorEl);
    hideMessage(successEl);

    if (status === 'rejected') {
      const rejectionReason = (reasonInput?.value || '').trim();
      if (!rejectionReason) {
        showMessage(errorEl, '請填寫拒絕原因。');
        return;
      }
    }

    if (card.dataset.processing === 'true') {
      return;
    }
    card.dataset.processing = 'true';
    toggleButtonsDisabled(true);

    try {
      const reviewerId = await getCurrentUserId();
      if (!reviewerId) {
        throw new Error('未能取得管理員身份，請重新登入。');
      }

      const rejectionReason = status === 'rejected' ? (reasonInput?.value || '').trim() : null;
      const reviewNotes = (notesInput?.value || '').trim() || null;

      const result = await adminManager.reviewRecording(
        recording.id,
        status,
        reviewerId,
        rejectionReason,
        reviewNotes
      );

      if (!result?.success) {
        throw new Error(result?.error || '審核操作失敗，請稍後再試。');
      }

      showMessage(successEl, status === 'approved' ? '已通過審核，音效隨即開放使用。' : '已拒絕審核，旅人將收到通知。');
      card.classList.add('admin-card-completed');
      setTimeout(() => {
        card.remove();
        state.records = state.records.filter(r => r.id !== recording.id);
        state.totalRecords = Math.max(0, state.totalRecords - 1);
        if (state.records.length === 0) {
          renderList();
          renderPagination();
        } else {
          renderPagination();
        }
      }, 800);
    } catch (error) {
      console.error('審核錄音失敗:', error);
      showMessage(errorEl, error.message || '審核時發生錯誤，請稍後再試。');
    } finally {
      card.dataset.processing = 'false';
      toggleButtonsDisabled(false);
    }

    function toggleButtonsDisabled(disabled) {
      if (approveBtn) approveBtn.disabled = disabled;
      if (rejectBtn) rejectBtn.disabled = disabled;
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

  async function createSignedUrl(path) {
    if (!supabase || !path) {
      return '';
    }
    try {
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);
      if (error) {
        console.warn('生成簽名網址失敗:', error);
        return '';
      }
      return data?.signedUrl || '';
    } catch (error) {
      console.warn('生成簽名網址異常:', error);
      return '';
    }
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

function formatDuration(seconds) {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
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

