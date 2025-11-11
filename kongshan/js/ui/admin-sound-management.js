// =====================================================
// 管理後台 - 音效庫管理（系統音效 + 旅人錄音）
// =====================================================

/**
 * 渲染音效管理介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 * @param {import('@supabase/supabase-js').SupabaseClient} context.supabase
 * @param {Function} context.getCurrentUserId
 */
export async function renderSoundManagement(container, { adminManager, supabase, getCurrentUserId }) {
  if (!container || !adminManager || typeof getCurrentUserId !== 'function') {
    return;
  }

  container.classList.add('admin-view-shell');

  container.innerHTML = `
    <section class="admin-section">
      <header class="admin-section-header">
        <div>
          <h2 class="admin-section-title" id="admin-sound-title">系統音效庫</h2>
        </div>
        <div class="admin-inline-actions">
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
          <button class="admin-btn admin-btn-primary admin-btn-small" type="button" data-action="create" id="admin-create-btn">
            <i class="fas fa-plus" aria-hidden="true"></i>
            新增音效
          </button>
        </div>
      </header>

      <!-- 標籤切換 -->
      <div class="admin-tab-switcher" role="tablist" aria-label="音效類型切換">
        <button class="admin-tab-btn admin-tab-btn-active" type="button" data-mode="system" role="tab" aria-selected="true">
          <i class="fas fa-music" aria-hidden="true"></i>
          <span>系統音效</span>
        </button>
        <button class="admin-tab-btn" type="button" data-mode="recordings" role="tab" aria-selected="false">
          <i class="fas fa-microphone" aria-hidden="true"></i>
          <span>旅人錄音</span>
        </button>
      </div>

      <div class="admin-card admin-card-table-wrapper">
        <table class="admin-table admin-sound-table" id="admin-sound-table" aria-describedby="sound-management-empty">
          <thead id="admin-sound-table-head">
            <!-- 表頭將動態生成 -->
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

      <div id="admin-sound-pagination" class="admin-pagination"></div>
    </section>
  `;

  const state = {
    mode: 'system', // 'system' | 'recordings'
    sounds: [],
    recordings: [],
    isLoading: false,
    currentPage: 1,
    recordingsPage: 1,
    pageSize: 50,
    totalSounds: 0,
    totalRecordings: 0
  };

  const titleEl = container.querySelector('#admin-sound-title');
  const createBtn = container.querySelector('#admin-create-btn');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const tabBtns = container.querySelectorAll('.admin-tab-btn');
  const tableHead = container.querySelector('#admin-sound-table-head');
  const tableBody = container.querySelector('#admin-sound-table-body');
  const tableEl = container.querySelector('#admin-sound-table');
  const paginationEl = container.querySelector('#admin-sound-pagination');

  // 標籤切換事件
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode && mode !== state.mode) {
        switchMode(mode);
      }
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadData(true).catch(err => console.warn('重新整理失敗:', err));
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      if (state.mode === 'system') {
        openSoundForm('create');
      }
    });
  }

  // 切換模式
  function switchMode(mode) {
    state.mode = mode;
    
    // 更新標籤狀態
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('admin-tab-btn-active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // 更新標題
    if (titleEl) {
      titleEl.textContent = mode === 'system' ? '系統音效庫' : '旅人錄音庫';
    }

    // 顯示/隱藏新增按鈕
    if (createBtn) {
      createBtn.style.display = mode === 'system' ? '' : 'none';
    }

    // 更新表頭
    renderTableHeader();

    // 載入數據
    loadData(false);
  }

  // 渲染表頭
  function renderTableHeader() {
    if (!tableHead) return;

    if (state.mode === 'system') {
      tableHead.innerHTML = `
        <tr>
          <th scope="col">音效</th>
          <th scope="col">來源 / 狀態</th>
          <th scope="col">標籤</th>
          <th scope="col">時長</th>
          <th scope="col">使用 / 建立</th>
          <th scope="col" class="admin-table-actions">操作</th>
        </tr>
      `;
      if (tableEl) {
        tableEl.setAttribute('aria-describedby', 'sound-management-empty');
      }
    } else {
      tableHead.innerHTML = `
        <tr>
          <th scope="col">錄音</th>
          <th scope="col">上傳者</th>
          <th scope="col">狀態</th>
          <th scope="col">時長</th>
          <th scope="col">上傳時間</th>
          <th scope="col" class="admin-table-actions">操作</th>
        </tr>
      `;
      if (tableEl) {
        tableEl.setAttribute('aria-describedby', 'recording-management-empty');
      }
    }
  }

  // 載入數據
  async function loadData(forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoadingRow();

    try {
      if (state.mode === 'system') {
        const { data, total } = await adminManager.getAllSoundEffects(state.currentPage, state.pageSize);
        state.sounds = Array.isArray(data) ? data : [];
        state.totalSounds = total || 0;
        
        if (state.sounds.length === 0 && state.currentPage > 1 && state.totalSounds > 0) {
          state.currentPage = 1;
          const { data: firstPageData, total: firstPageTotal } = await adminManager.getAllSoundEffects(1, state.pageSize);
          state.sounds = Array.isArray(firstPageData) ? firstPageData : [];
          state.totalSounds = firstPageTotal || 0;
        }
      } else {
        const { data, total } = await adminManager.getAllRecordings(state.recordingsPage, state.pageSize);
        state.recordings = Array.isArray(data) ? data : [];
        state.totalRecordings = total || 0;
        
        if (state.recordings.length === 0 && state.recordingsPage > 1 && state.totalRecordings > 0) {
          state.recordingsPage = 1;
          const { data: firstPageData, total: firstPageTotal } = await adminManager.getAllRecordings(1, state.pageSize);
          state.recordings = Array.isArray(firstPageData) ? firstPageData : [];
          state.totalRecordings = firstPageTotal || 0;
        }
      }
      
      renderTable();
      renderPagination();
    } catch (error) {
      console.error('載入數據失敗:', error);
      showErrorRow(state.mode === 'system' ? '載入音效列表時發生錯誤，請稍後再試。' : '載入旅人錄音列表時發生錯誤，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  // 渲染表格
  function renderTable() {
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (state.mode === 'system') {
      renderSystemSoundsTable();
    } else {
      renderRecordingsTable();
    }
  }

  // 渲染系統音效表格
  function renderSystemSoundsTable() {
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

  // 渲染旅人錄音表格
  function renderRecordingsTable() {
    if (!state.recordings || state.recordings.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6">
          <div class="admin-empty-state" id="recording-management-empty">
            <i class="fas fa-microphone-slash" aria-hidden="true"></i>
            <p>目前沒有旅人錄音。</p>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
      return;
    }

    state.recordings.forEach(recording => {
      const row = document.createElement('tr');
      row.dataset.recordingId = recording.id;
      const ownerName = (recording.owner?.display_name || '').trim() || '旅人';
      const ownerEmail = (recording.owner?.email || '').trim();
      
      row.innerHTML = `
        <td data-label="錄音">
          <div class="admin-sound-name">
            ${escapeHtml(recording.display_name || '未命名錄音')}
          </div>
        </td>
        <td data-label="上傳者">
          <div class="admin-meta">
            <i class="fas fa-user-circle" aria-hidden="true"></i>
            ${escapeHtml(ownerName)}${ownerEmail ? `<br><span style="font-size: 0.875em; color: #666;">${escapeHtml(ownerEmail)}</span>` : ''}
          </div>
        </td>
        <td data-label="狀態">
          <span class="admin-tag ${getRecordingStatusTagClass(recording.status)}">${getRecordingStatusLabel(recording.status)}</span>
        </td>
        <td data-label="時長">
          <div class="admin-meta">${formatDuration(recording.duration_seconds)}</div>
        </td>
        <td data-label="上傳時間">
          <div class="admin-meta">
            <i class="fas fa-clock" aria-hidden="true"></i>
            ${formatDateTime(recording.created_at)}
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
            ${recording.status === 'pending' ? `
              <button class="admin-btn admin-btn-success admin-btn-small" type="button" data-action="approve">
                <i class="fas fa-check" aria-hidden="true"></i>
                通過
              </button>
              <button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="reject">
                <i class="fas fa-xmark" aria-hidden="true"></i>
                拒絕
              </button>
            ` : ''}
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
      const approveBtn = row.querySelector('[data-action="approve"]');
      const rejectBtn = row.querySelector('[data-action="reject"]');

      previewBtn?.addEventListener('click', () => openRecordingPreview(recording));
      editBtn?.addEventListener('click', () => openRecordingEditForm(recording));
      deleteBtn?.addEventListener('click', () => openRecordingDeleteConfirm(recording));
      approveBtn?.addEventListener('click', () => quickApproveRecording(recording));
      rejectBtn?.addEventListener('click', () => quickRejectRecording(recording));

      tableBody.appendChild(row);
    });
  }

  function showLoadingRow() {
    if (!tableBody) return;
    const colCount = state.mode === 'system' ? 6 : 6;
    tableBody.innerHTML = `
      <tr>
        <td colspan="${colCount}">
          <div class="admin-empty-state">
            <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
            <p>載入${state.mode === 'system' ? '音效' : '旅人錄音'}中...</p>
          </div>
        </td>
      </tr>
    `;
  }

  function showErrorRow(message) {
    if (!tableBody) return;
    const colCount = state.mode === 'system' ? 6 : 6;
    tableBody.innerHTML = `
      <tr>
        <td colspan="${colCount}">
          <div class="admin-error">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
            <p>${message}</p>
          </div>
        </td>
      </tr>
    `;
  }

  function renderPagination() {
    if (!paginationEl) return;

    const total = state.mode === 'system' ? state.totalSounds : state.totalRecordings;
    const currentPage = state.mode === 'system' ? state.currentPage : state.recordingsPage;
    const totalPages = Math.ceil(total / state.pageSize);
    
    if (totalPages <= 1) {
      paginationEl.innerHTML = total > 0 
        ? `<div class="admin-pagination-info">共 ${total} 個${state.mode === 'system' ? '音效' : '旅人錄音'}</div>`
        : '';
      return;
    }

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
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
        <button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
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
        共 ${total} 個${state.mode === 'system' ? '音效' : '旅人錄音'}，第 ${currentPage} / ${totalPages} 頁
      </div>
      <div class="admin-pagination-controls">
        <button class="admin-pagination-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        ${pages.join('')}
        <button class="admin-pagination-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    `;

    // 綁定分頁事件
    const prevBtn = paginationEl.querySelector('[data-action="prev"]');
    const nextBtn = paginationEl.querySelector('[data-action="next"]');
    const pageBtns = paginationEl.querySelectorAll('[data-page]');

    prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) {
        if (state.mode === 'system') {
          state.currentPage--;
        } else {
          state.recordingsPage--;
        }
        loadData(true).catch(err => console.warn('載入失敗:', err));
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        if (state.mode === 'system') {
          state.currentPage++;
        } else {
          state.recordingsPage++;
        }
        loadData(true).catch(err => console.warn('載入失敗:', err));
      }
    });

    pageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page && page !== currentPage) {
          if (state.mode === 'system') {
            state.currentPage = page;
          } else {
            state.recordingsPage = page;
          }
          loadData(true).catch(err => console.warn('載入失敗:', err));
        }
      });
    });
  }

  // =====================================================
  // 系統音效操作
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
            <label class="admin-form-label" for="sound-tags-input">標籤（以逗號分隔，可留空）</label>
            <input type="text" id="sound-tags-input" class="admin-form-input" placeholder="雨聲, 森林, 夜晚">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label" for="sound-file-input">${isEdit ? '上傳音效文件（選填，留空則保留原文件）' : '上傳音效文件（必填）'}</label>
            <input type="file" id="sound-file-input" class="admin-form-input" accept="audio/*" ${isEdit ? '' : 'required'}>
            <div class="admin-form-hint">支持 MP3、WAV、OGG 等音頻格式。上傳後將自動保存到 system/ 路徑，時長會自動解析。</div>
          </div>
          <p class="admin-error-text admin-hidden" data-role="form-error"></p>
          <div id="sound-duration-info" class="admin-form-hint admin-hidden" style="color: #666; margin-top: -10px; margin-bottom: 10px;">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            正在解析音頻時長...
          </div>
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
    const fileInput = overlay.querySelector('#sound-file-input');
    const tagsInput = overlay.querySelector('#sound-tags-input');
    const durationInfo = overlay.querySelector('#sound-duration-info');
    
    let detectedDuration = null;

    if (isEdit) {
      nameInput.value = sound.name || '';
      tagsInput.value = Array.isArray(sound.tags) ? sound.tags.join(', ') : '';
      detectedDuration = Number.isFinite(sound.duration) ? sound.duration : null;
    }

    async function detectAudioDuration(audioSource) {
      return new Promise((resolve) => {
        const audio = new Audio();
        
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          if (duration && duration > 0 && isFinite(duration)) {
            resolve(duration);
          } else {
            resolve(null);
          }
        });
        
        audio.addEventListener('error', () => {
          resolve(null);
        });
        
        setTimeout(() => {
          resolve(null);
        }, 10000);
        
        if (audioSource instanceof File) {
          audio.src = URL.createObjectURL(audioSource);
        } else if (typeof audioSource === 'string') {
          audio.src = audioSource;
        } else {
          resolve(null);
        }
      });
    }

    function showDurationInfo(text, isError = false) {
      if (durationInfo) {
        durationInfo.textContent = text;
        durationInfo.style.color = isError ? '#dc3545' : '#666';
        durationInfo.classList.remove('admin-hidden');
      }
    }

    function hideDurationInfo() {
      if (durationInfo) {
        durationInfo.classList.add('admin-hidden');
      }
    }

    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        showDurationInfo('正在解析音頻時長...');
        detectedDuration = await detectAudioDuration(file);
        
        if (detectedDuration) {
          showDurationInfo(`✓ 已解析時長：${formatDuration(detectedDuration)}`);
          setTimeout(hideDurationInfo, 3000);
        } else {
          showDurationInfo('無法解析時長，將使用默認值', true);
          setTimeout(hideDurationInfo, 3000);
        }
      } else {
        detectedDuration = null;
        hideDurationInfo();
      }
    });

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

      let fileUrl = null;
      let uploadedFilePath = null;

      if (fileInput?.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `system/${fileName}`;

        try {
          const adminId = await getCurrentUserId();
          if (!adminId) {
            throw new Error('未能取得管理員身份，請重新登入。');
          }

          const { error: uploadError } = await adminManager.supabase
            .storage
            .from('kongshan_recordings')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            throw new Error(`上傳文件失敗：${uploadError.message}`);
          }

          fileUrl = storagePath;
          uploadedFilePath = storagePath;
        } catch (uploadError) {
          console.error('上傳文件失敗:', uploadError);
          showMessage(errorEl, uploadError.message || '上傳文件時發生錯誤，請稍後再試。');
          return;
        }
      } else {
        if (!isEdit) {
          showMessage(errorEl, '請上傳音效文件。');
          return;
        } else {
          fileUrl = sound.file_url || null;
          if (!fileUrl) {
            showMessage(errorEl, '請上傳音效文件或確保原文件存在。');
            return;
          }
        }
      }

      let finalDuration = detectedDuration;
      if (isEdit && sound && !fileInput?.files?.length) {
        finalDuration = Number.isFinite(sound.duration) ? sound.duration : null;
      }

      const payload = {
        name: nameInput.value.trim(),
        description: null,
        file_url: fileUrl,
        duration: finalDuration,
        tags: parseTags(tagsInput.value),
        source: 'system',
        status: 'approved'
      };

      if (!payload.name) {
        showMessage(errorEl, '音效名稱為必填項目。');
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
        await loadData(true);
      } catch (error) {
        console.error('儲存音效失敗:', error);
        showMessage(errorEl, error.message || '儲存音效時發生錯誤，請稍後再試。');
        
        if (uploadedFilePath) {
          try {
            await adminManager.supabase
              .storage
              .from('kongshan_recordings')
              .remove([uploadedFilePath]);
          } catch (cleanupError) {
            console.warn('清理已上傳文件失敗:', cleanupError);
          }
        }
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
        await loadData(true);
      }
    });

    document.body.appendChild(overlay);
  }

  function openSoundPreview(sound) {
    closeOverlays();

    let soundUrl = sound.file_url || '';
    if (soundUrl.startsWith('system/') || soundUrl.startsWith('approved/')) {
      const projectUrl = adminManager.supabase?.supabaseUrl?.replace('/rest/v1', '') || '';
      if (projectUrl) {
        soundUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${soundUrl}`;
      }
    }

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
            <source src="${escapeAttribute(soundUrl)}" />
            您的瀏覽器無法播放此音效。
          </audio>
          <p class="admin-meta">
            <i class="fas fa-link" aria-hidden="true"></i>
            <a href="${escapeAttribute(soundUrl || '#')}" target="_blank" rel="noopener noreferrer">在新視窗開啟音效連結</a>
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

  // =====================================================
  // 旅人錄音操作
  // =====================================================

  function openRecordingEditForm(recording) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h2 class="admin-modal-title">編輯錄音名稱</h2>
          <button type="button" class="admin-modal-close" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <form class="admin-form" id="recording-form">
          <div class="admin-form-group">
            <label class="admin-form-label" for="recording-name-input">錄音名稱</label>
            <input type="text" id="recording-name-input" class="admin-form-input" maxlength="120" required placeholder="例如：山間鳥鳴">
          </div>
          <p class="admin-error-text admin-hidden" data-role="form-error"></p>
          <div class="admin-modal-actions">
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-small" data-action="cancel">取消</button>
            <button type="submit" class="admin-btn admin-btn-primary admin-btn-small">儲存變更</button>
          </div>
        </form>
      </div>
    `;

    const closeBtn = overlay.querySelector('.admin-modal-close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const form = overlay.querySelector('#recording-form');
    const errorEl = overlay.querySelector('[data-role="form-error"]');
    const nameInput = overlay.querySelector('#recording-name-input');

    nameInput.value = recording.display_name || '';

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

      const displayName = nameInput.value.trim();
      if (!displayName) {
        showMessage(errorEl, '錄音名稱為必填項目。');
        return;
      }

      try {
        const result = await adminManager.updateRecording(recording.id, {
          display_name: displayName
        });

        if (!result?.success) {
          throw new Error(result?.error || '更新錄音失敗，請稍後再試。');
        }

        closeModal();
        await loadData(true);
      } catch (error) {
        console.error('更新錄音失敗:', error);
        showMessage(errorEl, error.message || '更新錄音時發生錯誤，請稍後再試。');
      }
    });

    document.body.appendChild(overlay);
    nameInput?.focus();
  }

  async function quickApproveRecording(recording) {
    if (!confirm(`確定要通過審核「${escapeHtml(recording.display_name || '未命名錄音')}」嗎？`)) {
      return;
    }

    try {
      const adminId = await getCurrentUserId();
      if (!adminId) {
        throw new Error('未能取得管理員身份，請重新登入。');
      }

      const result = await adminManager.reviewRecording(
        recording.id,
        'approved',
        adminId,
        null,
        null
      );

      if (!result?.success) {
        throw new Error(result?.error || '審核操作失敗，請稍後再試。');
      }

      await loadData(true);
    } catch (error) {
      console.error('審核錄音失敗:', error);
      alert(error.message || '審核時發生錯誤，請稍後再試。');
    }
  }

  async function quickRejectRecording(recording) {
    const reason = prompt(`請輸入拒絕「${escapeHtml(recording.display_name || '未命名錄音')}」的原因：`);
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const adminId = await getCurrentUserId();
      if (!adminId) {
        throw new Error('未能取得管理員身份，請重新登入。');
      }

      const result = await adminManager.reviewRecording(
        recording.id,
        'rejected',
        adminId,
        reason.trim(),
        null
      );

      if (!result?.success) {
        throw new Error(result?.error || '審核操作失敗，請稍後再試。');
      }

      await loadData(true);
    } catch (error) {
      console.error('審核錄音失敗:', error);
      alert(error.message || '審核時發生錯誤，請稍後再試。');
    }
  }

  function openRecordingDeleteConfirm(recording) {
    closeOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-dialog">
        <h3 class="admin-confirm-dialog-title">刪除旅人錄音</h3>
        <p class="admin-confirm-dialog-message">
          確定要刪除 <strong>${escapeHtml(recording.display_name || '未命名錄音')}</strong> 嗎？<br>
          使用該錄音的聲色意境會同步刪除，請謹慎操作。
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
        const result = await adminManager.deleteRecording(recording.id, adminId);
        if (!result?.success) {
          throw new Error(result?.error || '刪除錄音失敗，請稍後再試。');
        }
      } catch (error) {
        console.error('刪除錄音失敗:', error);
        alert(error.message || '刪除錄音時發生錯誤，請稍後再試。');
      } finally {
        closeDialog();
        await loadData(true);
      }
    });

    document.body.appendChild(overlay);
  }

  async function openRecordingPreview(recording) {
    closeOverlays();

    if (!supabase || !recording.storage_path) {
      alert('無法取得錄音文件。');
      return;
    }

    let soundUrl = '';
    const storagePath = recording.storage_path || '';
    
    if (storagePath.startsWith('approved/') || storagePath.startsWith('system/')) {
      const projectUrl = supabase.supabaseUrl.replace('/rest/v1', '');
      soundUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${storagePath}`;
    } else {
      try {
        const { data, error } = await supabase
          .storage
          .from('kongshan_recordings')
          .createSignedUrl(storagePath, 3600);
        
        if (error || !data?.signedUrl) {
          throw new Error('無法取得錄音播放連結');
        }
        
        soundUrl = data.signedUrl;
      } catch (error) {
        console.error('生成簽名網址失敗:', error);
        alert('無法取得錄音播放連結，請稍後再試。');
        return;
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h2 class="admin-modal-title">錄音預覽</h2>
          <button type="button" class="admin-modal-close" aria-label="關閉">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div class="admin-audio-preview">
          <p class="admin-sound-name">${escapeHtml(recording.display_name || '未命名錄音')}</p>
          <audio controls preload="auto" class="admin-audio">
            <source src="${escapeAttribute(soundUrl)}" />
            您的瀏覽器無法播放此錄音。
          </audio>
          <p class="admin-meta">
            <i class="fas fa-link" aria-hidden="true"></i>
            <a href="${escapeAttribute(soundUrl || '#')}" target="_blank" rel="noopener noreferrer">在新視窗開啟錄音連結</a>
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

  // 初始化
  renderTableHeader();
  await loadData(false);
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

function getRecordingStatusLabel(status) {
  switch ((status || 'pending').toLowerCase()) {
    case 'pending':
      return '待審核';
    case 'approved':
      return '已通過';
    case 'rejected':
      return '已拒絕';
    default:
      return '未知';
  }
}

function getRecordingStatusTagClass(status) {
  switch ((status || 'pending').toLowerCase()) {
    case 'pending':
      return 'admin-tag-warning';
    case 'approved':
      return 'admin-tag-success';
    case 'rejected':
      return 'admin-tag-danger';
    default:
      return 'admin-tag-muted';
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
