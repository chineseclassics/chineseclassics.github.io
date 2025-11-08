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

  container.innerHTML = `
    <div class="admin-section-header">
      <div>
        <h2 class="admin-section-title">音效審核</h2>
        <p class="admin-description">請聆聽旅人上傳的音效，並給予審核結果。通過後音效會立即對所有旅人開放使用。</p>
      </div>
      <div class="admin-inline-actions">
        <button class="admin-btn admin-btn-secondary" type="button" data-action="refresh">
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
  `;

  const listEl = container.querySelector('#admin-recording-review-list');
  const refreshBtn = container.querySelector('[data-action="refresh"]');

  const state = {
    isLoading: false,
    records: []
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
      const records = await adminManager.getPendingRecordings();
      state.records = Array.isArray(records) ? records : [];
      renderList();
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
        if (state.records.length === 0) {
          renderList();
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

