// =====================================================
// 聲色意境編輯器 UI 模塊
// =====================================================

import { normalizeSoundUrl } from '../utils/sound-url.js';

const MAX_RECORDING_SECONDS = 120;
const DEFAULT_RECORDING_MIME = 'audio/mp4';
const MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/aac',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm'
];

// 分頁配置
const ITEMS_PER_PAGE = 10;

let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingTimerInterval = null;
let recordingAutoStopTimeout = null;
let recordingRemainingSeconds = MAX_RECORDING_SECONDS;
let recordingStartTimestamp = null;
let currentRecordingBlob = null;
let currentRecordingUrl = null;
let currentRecordingDuration = 0;
let currentRecordingMimeType = '';
let isUploadingRecording = false;

/**
 * 創建並顯示聲色意境編輯器
 * @param {object} poem - 當前詩歌
 * @param {object} currentAtmosphere - 當前聲色意境（可選）
 * @param {function} onSave - 保存回調函數
 */
export function showAtmosphereEditor(poem, currentAtmosphere, onSave) {
  // 清除預覽模式標記
  if (window.AppState) {
    window.AppState.isPreviewMode = false;
  }

  // 檢查是否已存在編輯器
  let editor = document.getElementById('atmosphere-editor');
  if (editor) {
    editor.classList.add('visible');
    return;
  }

  // 創建編輯器容器
  editor = document.createElement('div');
  editor.id = 'atmosphere-editor';
  editor.className = 'atmosphere-editor';
  editor.dataset.defaultName = currentAtmosphere?.name || (poem && poem.title ? `${poem.title} 聲色意境` : '未命名聲色意境');
  editor.dataset.defaultDescription = currentAtmosphere?.description || '';

  // 創建側邊欄包裝容器
  const sidebar = document.createElement('div');
  sidebar.className = 'editor-sidebar';

  // 編輯器內容
  sidebar.innerHTML = `
    <div class="editor-header">
      <h2 class="editor-title">聲色意境編輯器</h2>
      <button class="editor-close-btn" type="button" aria-label="關閉編輯器">
        <i class="fas fa-times" aria-hidden="true"></i>
        <span class="sr-only">關閉</span>
      </button>
    </div>
    <div class="editor-content">
      <!-- 音效選擇 -->
      <div class="editor-section">
        <label class="editor-label">
          空山音效
          <span class="editor-hint">最多選擇 5 個</span>
        </label>
        <div id="sound-selector" class="sound-selector">
          <!-- 音效列表將動態生成 -->
        </div>
        <div id="sound-selector-pagination" class="pagination-container">
          <!-- 分頁控件將動態生成 -->
        </div>
      </div>

      <!-- 錄音功能 -->
      <div class="editor-section" id="recording-section">
        <div class="recording-header">
          <span class="recording-label">旅人錄音</span>
          <span class="recording-subtext">單次最長 120 秒</span>
        </div>
        <!-- 已發布的旅人錄音列表 -->
        <div id="traveler-recordings-selector" class="sound-selector" style="margin-bottom: 12px;">
          <!-- 旅人錄音卡片將動態生成 -->
        </div>
        <div id="traveler-recordings-pagination" class="pagination-container">
          <!-- 分頁控件將動態生成 -->
        </div>
        <div class="recording-inline">
          <button class="recording-toggle" id="recording-toggle-btn" type="button" aria-label="開始錄音">
            <i class="fas fa-circle"></i>
          </button>
          <div class="recording-timer-text" id="recording-timer">00:00 / 02:00</div>
        </div>
        <div class="recording-status" id="recording-status"></div>
        <div class="recording-name-panel" id="recording-name-panel" hidden>
          <audio id="recording-audio" controls></audio>
          <label class="recording-name-label" for="recording-name-input">為錄音命名</label>
          <input type="text" id="recording-name-input" class="editor-input" maxlength="50" placeholder="例如：松風入夜">
          <div class="recording-name-actions">
            <button class="recording-action-primary" id="recording-save-btn" type="button">保存錄音</button>
            <button class="recording-action-secondary" id="recording-cancel-btn" type="button">取消</button>
          </div>
        </div>
      </div>

      <!-- 已選擇的音效 -->
      <div class="editor-section">
        <label class="editor-label">已選音效</label>
        <div id="selected-sounds" class="selected-sounds">
          <div class="empty-state">尚未選擇音效</div>
        </div>
      </div>

      <!-- 背景配置 -->
      <div class="editor-section">
        <label class="editor-label">背景配色</label>
        <div id="background-selector" class="background-selector">
          <!-- 背景選項將動態生成 -->
        </div>
      </div>
    </div>

    <div class="editor-footer">
      <button class="editor-btn editor-btn-secondary" id="preview-btn">
        預覽
      </button>
      <button class="editor-btn editor-btn-primary" id="publish-btn">
        發佈
      </button>
    </div>
  `;

  // 將 sidebar 添加到 editor
  editor.appendChild(sidebar);
  document.body.appendChild(editor);

  // 綁定關閉按鈕
  const closeBtn = editor.querySelector('.editor-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => hideAtmosphereEditor());
  }

  // 點擊外部關閉
  editor.addEventListener('click', (e) => {
    if (e.target === editor) {
      hideAtmosphereEditor();
    }
  });

  // 初始化內容（異步）
  initializeSoundSelector().then(() => {
    initializeTravelerRecordings(); // 初始化旅人錄音選擇器
    initializeRecordingSection();
    initializeBackgroundSelector();
    
    // 如果有當前聲色意境，載入數據（在音效卡片創建後）
    if (currentAtmosphere) {
      setTimeout(() => {
        loadAtmosphereData(currentAtmosphere).catch(error => {
          console.warn('載入聲色意境錄音資料時出現問題:', error);
        });
      }, 100);
    }
  });

  // 綁定按鈕事件
  document.getElementById('preview-btn').addEventListener('click', () => previewAtmosphere(poem));
  document.getElementById('publish-btn').addEventListener('click', () => publishAtmosphere(poem, onSave));

  // 顯示編輯器
  setTimeout(() => editor.classList.add('visible'), 10);
}

/**
 * 隱藏編輯器
 * @param {boolean} shouldStopSounds - 是否停止正在播放的音效，默認為 true
 */
export function hideAtmosphereEditor(shouldStopSounds = true) {
  const editor = document.getElementById('atmosphere-editor');
  if (editor) {
    cancelAutoPreview();
    stopRecording(true);
    cleanupRecordingState();
    
    // 只有在非預覽模式下才停止音效
    // 預覽模式下應該保留音效播放
    if (shouldStopSounds && window.AppState && window.AppState.soundMixer) {
      window.AppState.soundMixer.stopAll();
    }
    
    editor.classList.remove('visible');
    setTimeout(() => editor.remove(), 300);
  }
}

/**
 * 創建分頁控件
 * @param {number} currentPage - 當前頁碼（從 1 開始）
 * @param {number} totalPages - 總頁數
 * @param {function} onPageChange - 頁碼變更回調函數
 * @returns {HTMLElement} 分頁控件元素
 */
function createPagination(currentPage, totalPages, onPageChange) {
  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  
  if (totalPages <= 1) {
    // 只有一頁或沒有內容時，不顯示分頁控件
    return pagination;
  }

  // 上一頁按鈕
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn pagination-btn-nav';
  prevBtn.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
  prevBtn.setAttribute('aria-label', '上一頁');
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });
  pagination.appendChild(prevBtn);

  // 頁碼按鈕
  const pageNumbers = [];
  
  // 計算顯示的頁碼範圍
  let startPage = Math.max(1, currentPage - 1);
  let endPage = Math.min(totalPages, currentPage + 1);
  
  // 確保至少顯示 3 個頁碼（如果總頁數足夠）
  if (endPage - startPage < 2 && totalPages >= 3) {
    if (startPage === 1) {
      endPage = Math.min(3, totalPages);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - 2);
    }
  }

  // 第一頁
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.className = 'pagination-btn pagination-btn-page';
    firstBtn.textContent = '1';
    firstBtn.addEventListener('click', () => onPageChange(1));
    pagination.appendChild(firstBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
  }

  // 中間頁碼
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'pagination-btn pagination-btn-page';
    if (i === currentPage) {
      pageBtn.classList.add('active');
    }
    pageBtn.textContent = i.toString();
    pageBtn.addEventListener('click', () => onPageChange(i));
    pagination.appendChild(pageBtn);
  }

  // 最後一頁
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
    
    const lastBtn = document.createElement('button');
    lastBtn.className = 'pagination-btn pagination-btn-page';
    lastBtn.textContent = totalPages.toString();
    lastBtn.addEventListener('click', () => onPageChange(totalPages));
    pagination.appendChild(lastBtn);
  }

  // 下一頁按鈕
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn pagination-btn-nav';
  nextBtn.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
  nextBtn.setAttribute('aria-label', '下一頁');
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });
  pagination.appendChild(nextBtn);

  return pagination;
}

/**
 * 渲染分頁內容
 * @param {HTMLElement} container - 容器元素
 * @param {Array} items - 所有項目
 * @param {number} currentPage - 當前頁碼
 * @param {function} createItemElement - 創建單個項目的函數
 */
function renderPaginatedItems(container, items, currentPage, createItemElement) {
  container.innerHTML = '';
  
  if (items.length === 0) {
    container.innerHTML = '<div class="loading-text">暫無內容</div>';
    return;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, items.length);
  const pageItems = items.slice(startIndex, endIndex);

  // 獲取已選中的音效 ID 列表
  const selectedContainer = document.getElementById('selected-sounds');
  const selectedSoundIds = selectedContainer 
    ? Array.from(selectedContainer.querySelectorAll('.selected-sound-item'))
        .map(item => item.dataset.soundId)
    : [];

  pageItems.forEach(item => {
    const element = createItemElement(item);
    // 如果該音效已選中，添加 selected 類
    if (selectedSoundIds.includes(item.id?.toString() || item.id)) {
      element.classList.add('selected');
    }
    container.appendChild(element);
  });
}

/**
 * 初始化音效選擇器（只加載系統音效，帶分頁）
 */
function initializeSoundSelector() {
  const container = document.getElementById('sound-selector');
  const paginationContainer = document.getElementById('sound-selector-pagination');
  
  if (!container) return Promise.resolve();
  
  container.innerHTML = '<div class="loading-text">加載音效庫...</div>';
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
  }

  return new Promise(async (resolve) => {
    // 從數據庫加載系統音效列表
    let sounds = [];
    
    if (window.AppState && window.AppState.supabase && window.AppState.atmosphereManager) {
      try {
        // 從數據庫加載所有已批准的系統音效
        const { data, error } = await window.AppState.supabase
          .from('sound_effects')
          .select('*')
          .eq('source', 'system')
          .eq('status', 'approved')
          .order('name');
        
        if (!error && data && data.length > 0) {
          sounds = data.map(effect => {
            // 如果 file_url 是 Supabase Storage 路徑（system/），構建完整 URL
            let fileUrl = effect.file_url || '';
            if (fileUrl.startsWith('system/')) {
              const projectUrl = window.AppState.supabase.supabaseUrl.replace('/rest/v1', '');
              fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${fileUrl}`;
            }
            
            return {
              id: effect.id,
              name: effect.name,
              tags: effect.tags || [],
              file_url: fileUrl,
              sourceType: 'system'
            };
          });
        }
      } catch (error) {
        console.warn('從數據庫加載音效失敗:', error);
      }
    }
    
    // 如果數據庫中沒有音效，顯示空列表
    if (sounds.length === 0) {
      container.innerHTML = '<div class="loading-text">暫無系統音效，請管理員上傳</div>';
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
      resolve();
      return;
    }

    // 初始化分頁狀態
    let currentPage = 1;
    const totalPages = Math.ceil(sounds.length / ITEMS_PER_PAGE);

    // 渲染第一頁
    const renderPage = (page) => {
      currentPage = page;
      renderPaginatedItems(container, sounds, currentPage, (sound) => createSoundCard(sound));
      
      // 更新分頁控件
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
        if (totalPages > 1) {
          const pagination = createPagination(currentPage, totalPages, renderPage);
          paginationContainer.appendChild(pagination);
        }
      }
    };

    renderPage(1);
    resolve();
  });
}

async function loadPublishedRecordings() {
  if (!window.AppState?.supabase) {
    return [];
  }

  try {
    const supabaseClient = window.AppState.supabase;
    const userId = window.AppState?.userId || null;

    let query = supabaseClient
      .from('recordings')
      .select('id, display_name, storage_path, created_at, owner_id, status')
      .order('created_at', { ascending: false })
      .limit(50);

    if (userId) {
      query = query.or(`status.eq.approved,and(status.eq.pending,owner_id.eq.${userId})`);
    } else {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;

    if (error || !Array.isArray(data)) {
      return [];
    }

    const sounds = await Promise.all(data.map(async (record) => {
      if (!record.storage_path) {
        return null;
      }

      // 根據路徑判斷是否需要簽名 URL
      // approved/ 和 system/ 路徑可以直接訪問，pending/ 路徑需要簽名 URL
      let fileUrl = '';
      const storagePath = record.storage_path || '';
      
      if (storagePath.startsWith('approved/') || storagePath.startsWith('system/')) {
        // 公開路徑，直接構建 URL
        const projectUrl = supabaseClient.supabaseUrl.replace('/rest/v1', '');
        fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${storagePath}`;
      } else {
        // pending/ 路徑，需要簽名 URL
        try {
          const { data: signedData, error: signedError } = await supabaseClient
            .storage
            .from('kongshan_recordings')
            .createSignedUrl(storagePath, 3600);
          
          if (signedError || !signedData?.signedUrl) {
            // 如果獲取簽名 URL 失敗，說明文件可能已被刪除，跳過此記錄
            console.warn(`錄音文件不存在或無法訪問: ${record.display_name} (${storagePath})`, signedError);
            return null;
          }
          
          fileUrl = signedData.signedUrl;
        } catch (signedError) {
          // 如果獲取簽名 URL 異常，說明文件可能已被刪除，跳過此記錄
          console.warn(`錄音文件不存在或無法訪問: ${record.display_name} (${storagePath})`, signedError);
          return null;
        }
      }

      // 如果 fileUrl 為空，跳過此記錄
      if (!fileUrl) {
        return null;
      }

      const statusLabel = (record.status || '').toLowerCase();
      const tags = ['旅人錄音'];
      if (statusLabel && statusLabel !== 'approved') {
        tags.push('待審核');
      }

      return {
        id: record.id,
        name: record.display_name || '旅人錄音',
        tags,
        file_url: fileUrl,
        sourceType: 'recording',
        recordingPath: record.storage_path,
        recordingId: record.id,
        display_name: record.display_name || '旅人錄音',
        ownerId: record.owner_id || null,
        recordingStatus: record.status || 'approved'
      };
    }));

    return sounds.filter(Boolean);
  } catch (error) {
    console.warn('載入旅人錄音失敗:', error);
    return [];
  }
}

/**
 * 初始化旅人錄音選擇器（顯示在旅人錄音區域，帶分頁）
 */
function initializeTravelerRecordings() {
  const container = document.getElementById('traveler-recordings-selector');
  const paginationContainer = document.getElementById('traveler-recordings-pagination');
  
  if (!container) {
    return;
  }

  container.innerHTML = '<div class="loading-text">加載旅人錄音...</div>';
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
  }

  loadPublishedRecordings().then(travelerSounds => {
    // 如果沒有旅人錄音，顯示空狀態
    if (travelerSounds.length === 0) {
      container.innerHTML = '';
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
      return;
    }

    // 初始化分頁狀態
    let currentPage = 1;
    const totalPages = Math.ceil(travelerSounds.length / ITEMS_PER_PAGE);

    // 渲染第一頁
    const renderPage = (page) => {
      currentPage = page;
      renderPaginatedItems(container, travelerSounds, currentPage, (sound) => createSoundCard(sound));
      
      // 更新分頁控件
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
        if (totalPages > 1) {
          const pagination = createPagination(currentPage, totalPages, renderPage);
          paginationContainer.appendChild(pagination);
        }
      }
    };

    renderPage(1);
  }).catch(error => {
    console.warn('初始化旅人錄音選擇器失敗:', error);
    container.innerHTML = '';
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
    }
  });
}

function getRecordingElements() {
  return {
    section: document.getElementById('recording-section'),
    toggleBtn: document.getElementById('recording-toggle-btn'),
    timerEl: document.getElementById('recording-timer'),
    statusEl: document.getElementById('recording-status'),
    panel: document.getElementById('recording-name-panel'),
    audioEl: document.getElementById('recording-audio'),
    nameInput: document.getElementById('recording-name-input'),
    saveBtn: document.getElementById('recording-save-btn'),
    cancelBtn: document.getElementById('recording-cancel-btn')
  };
}

function initializeRecordingSection() {
  const {
    section,
    toggleBtn,
    saveBtn,
    cancelBtn,
    nameInput,
    statusEl
  } = getRecordingElements();

  if (!section) {
    return;
  }

  const recordingSupported = typeof window !== 'undefined'
    && navigator?.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  if (!recordingSupported) {
    if (toggleBtn) {
      toggleBtn.disabled = true;
    }
    if (statusEl) {
      statusEl.textContent = '此設備或瀏覽器不支援錄音功能，請改用支援 MediaRecorder 的瀏覽器。';
      statusEl.classList.add('recording-status-error');
    }
    updateTimerDisplay(0);
    return;
  }

  resetRecordingUI();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording(true);
      } else {
        await startRecording();
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', handleRecordingSave);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleRecordingCancel);
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const trimmed = nameInput.value.trim();
      const { saveBtn: latestSaveBtn, statusEl: latestStatus } = getRecordingElements();
      if (latestSaveBtn) {
        latestSaveBtn.disabled = !trimmed || isUploadingRecording;
      }
      if (latestStatus) {
        latestStatus.textContent = '';
        latestStatus.classList.remove('recording-status-error', 'recording-status-success');
      }
    });
  }
}

function resetRecordingUI() {
  const {
    toggleBtn,
    statusEl,
    panel,
    audioEl,
    nameInput,
    saveBtn,
    cancelBtn
  } = getRecordingElements();

  setRecordingButtonState(false);
  updateTimerDisplay(0);

  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }

  if (panel) {
    panel.hidden = true;
  }

  if (audioEl) {
    try {
      audioEl.pause();
    } catch (error) {
      /* ignore */
    }
    audioEl.removeAttribute('src');
    try {
      audioEl.load();
    } catch (error) {
      /* ignore */
    }
  }

  if (nameInput) {
    nameInput.value = '';
  }

  if (saveBtn) {
    saveBtn.disabled = true;
  }

  if (cancelBtn) {
    cancelBtn.disabled = true;
  }

  recordingRemainingSeconds = MAX_RECORDING_SECONDS;
}

function setRecordingButtonState(isRecording) {
  const { toggleBtn } = getRecordingElements();
  if (!toggleBtn) {
    return;
  }

  toggleBtn.classList.toggle('recording-active', !!isRecording);
  const icon = toggleBtn.querySelector('i');
  if (icon) {
    icon.className = isRecording ? 'fas fa-stop' : 'fas fa-circle';
  }
  toggleBtn.setAttribute('aria-label', isRecording ? '停止錄音' : '開始錄音');
}

function updateTimerDisplay(elapsedSeconds = 0) {
  const { timerEl } = getRecordingElements();
  if (!timerEl) {
    return;
  }

  const clamped = Math.max(0, Math.min(MAX_RECORDING_SECONDS, elapsedSeconds));
  const elapsedText = formatTimerSegment(clamped);
  const totalText = formatTimerSegment(MAX_RECORDING_SECONDS);
  timerEl.textContent = `${elapsedText} / ${totalText}`;
}

function formatTimerSegment(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

async function startRecording() {
  if (isUploadingRecording) {
    return;
  }

  const {
    toggleBtn,
    statusEl,
    panel,
    saveBtn,
    cancelBtn
  } = getRecordingElements();

  try {
    stopRecording(true);
    cleanupRecordingState({ keepBlob: false, preserveUploaded: true });
    resetRecordingUI();

    if (statusEl) {
      statusEl.textContent = '正在請求麥克風權限...';
      statusEl.classList.remove('recording-status-error', 'recording-status-success');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStream = stream;
    recordingChunks = [];
    recordingRemainingSeconds = MAX_RECORDING_SECONDS;
    recordingStartTimestamp = Date.now();

    const preferredMime = pickSupportedMimeType();
    const recorderOptions = preferredMime ? { mimeType: preferredMime } : undefined;
    const recorder = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);
    mediaRecorder = recorder;
    currentRecordingMimeType = recorder.mimeType || preferredMime || getFallbackMimeType();

    recorder.addEventListener('dataavailable', handleRecordingDataAvailable);
    recorder.addEventListener('stop', handleRecordingStop);
    recorder.start();

    setRecordingButtonState(true);
    if (panel) {
      panel.hidden = true;
    }
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }
    if (statusEl) {
      statusEl.textContent = '錄音中...';
      statusEl.classList.remove('recording-status-error', 'recording-status-success');
    }

    updateTimerDisplay(0);

    if (recordingTimerInterval) {
      clearInterval(recordingTimerInterval);
    }
    recordingTimerInterval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - recordingStartTimestamp) / 1000));
      recordingRemainingSeconds = Math.max(0, MAX_RECORDING_SECONDS - elapsed);
      updateTimerDisplay(elapsed);
      if (recordingRemainingSeconds <= 0) {
        stopRecording(false);
      }
    }, 1000);

    if (recordingAutoStopTimeout) {
      clearTimeout(recordingAutoStopTimeout);
    }
    recordingAutoStopTimeout = setTimeout(() => {
      stopRecording(false);
    }, MAX_RECORDING_SECONDS * 1000);
  } catch (error) {
    console.error('啟動錄音失敗:', error);
    if (statusEl) {
      statusEl.textContent = '無法啟動錄音，請確認已允許麥克風權限。';
      statusEl.classList.add('recording-status-error');
    }
    setRecordingButtonState(false);
    cleanupRecordingState({ keepBlob: false, preserveUploaded: true });
    resetRecordingUI();
  }
}

function stopRecording(manualStop) {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return;
  }

  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }

  if (recordingAutoStopTimeout) {
    clearTimeout(recordingAutoStopTimeout);
    recordingAutoStopTimeout = null;
  }

  setRecordingButtonState(false);

  const { statusEl } = getRecordingElements();
  if (statusEl && manualStop) {
    statusEl.textContent = '正在處理錄音...';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }

  try {
    mediaRecorder.stop();
  } catch (error) {
    console.warn('停止錄音時發生錯誤:', error);
  }
}

function handleRecordingDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordingChunks.push(event.data);
    if (!currentRecordingMimeType && event.data.type) {
      currentRecordingMimeType = event.data.type;
    }
  }
}

async function handleRecordingStop() {
  const {
    panel,
    audioEl,
    nameInput,
    saveBtn,
    cancelBtn,
    statusEl
  } = getRecordingElements();

  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }

  const recordingDurationMs = recordingStartTimestamp ? Date.now() - recordingStartTimestamp : 0;
  const elapsedSeconds = Math.max(1, Math.round(recordingDurationMs / 1000));
  currentRecordingDuration = Math.min(MAX_RECORDING_SECONDS, elapsedSeconds);
  recordingStartTimestamp = null;
  updateTimerDisplay(currentRecordingDuration);

  try {
    mediaRecorder = null;
    const firstChunkType = recordingChunks[0]?.type;
    const resolvedMime = currentRecordingMimeType || firstChunkType || getFallbackMimeType();
    const blob = new Blob(recordingChunks, { type: resolvedMime });
    currentRecordingMimeType = blob.type || resolvedMime;
    currentRecordingBlob = blob;
    if (currentRecordingUrl) {
      URL.revokeObjectURL(currentRecordingUrl);
    }
    currentRecordingUrl = URL.createObjectURL(blob);
  } catch (error) {
    console.error('處理錄音資料失敗:', error);
    if (statusEl) {
      statusEl.textContent = '錄音失敗，請重新嘗試。';
      statusEl.classList.add('recording-status-error');
    }
    cleanupRecordingState({ keepBlob: false, preserveUploaded: true });
    resetRecordingUI();
    return;
  }

  if (panel) {
    panel.hidden = false;
  }

  if (audioEl) {
    audioEl.src = currentRecordingUrl;
    try {
      audioEl.load();
    } catch (loadError) {
      console.warn('重新載入錄音播放器失敗:', loadError);
    }
  }

  if (cancelBtn) {
    cancelBtn.disabled = false;
  }

  if (saveBtn) {
    saveBtn.disabled = !(nameInput && nameInput.value.trim());
  }

  if (statusEl) {
    statusEl.textContent = '錄音完成，請命名後保存。';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }

  if (nameInput) {
    nameInput.focus();
    nameInput.select();
  }
}

async function handleRecordingSave() {
  const {
    nameInput,
    saveBtn,
    cancelBtn,
    statusEl
  } = getRecordingElements();

  if (!nameInput) {
    return;
  }

  const displayName = sanitizeRecordingName(nameInput.value);
  if (!displayName) {
    if (statusEl) {
      statusEl.textContent = '請輸入錄音名稱後再保存。';
      statusEl.classList.add('recording-status-error');
    }
    return;
  }

  if (!currentRecordingBlob) {
    if (statusEl) {
      statusEl.textContent = '沒有可保存的錄音，請重新錄製。';
      statusEl.classList.add('recording-status-error');
    }
    return;
  }

  if (isUploadingRecording) {
    return;
  }

  try {
    isUploadingRecording = true;
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }
    if (statusEl) {
      statusEl.textContent = '錄音上傳中...';
      statusEl.classList.remove('recording-status-error', 'recording-status-success');
    }

    const recording = await uploadRecording(displayName);

    ensureRecordingCardExists(buildRecordingSound(recording));
    addUploadedRecordingToSelection(recording);

    // 刷新旅人錄音列表，顯示新上傳的錄音
    initializeTravelerRecordings();

    cleanupRecordingState({ keepBlob: false, preserveUploaded: false });
    resetRecordingUI();

    const { statusEl: finalStatus } = getRecordingElements();
    if (finalStatus) {
      finalStatus.textContent = '錄音已保存並加入音效清單。';
      finalStatus.classList.remove('recording-status-error');
      finalStatus.classList.add('recording-status-success');
    }

  } catch (error) {
    console.error('錄音上傳失敗:', error);
    if (statusEl) {
      statusEl.textContent = `錄音上傳失敗：${error.message || '請稍後再試'}`;
      statusEl.classList.add('recording-status-error');
    }
    const { saveBtn: latestSaveBtn, cancelBtn: latestCancelBtn } = getRecordingElements();
    if (latestSaveBtn) {
      latestSaveBtn.disabled = false;
    }
    if (latestCancelBtn) {
      latestCancelBtn.disabled = false;
    }
  } finally {
    isUploadingRecording = false;
  }
}

function handleRecordingCancel() {
  cleanupRecordingState({ keepBlob: false, preserveUploaded: true });
  resetRecordingUI();
  const { statusEl } = getRecordingElements();
  if (statusEl) {
    statusEl.textContent = '已取消本次錄音。';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }
}

async function uploadRecording(displayName) {
  if (!currentRecordingBlob) {
    throw new Error('尚未產生可上傳的錄音。');
  }

  if (!window.AppState || !window.AppState.supabase) {
    throw new Error('尚未連接 Supabase，無法上傳錄音。');
  }

  const supabaseClient = window.AppState.supabase;
  const userId = await ensureCurrentUserId();
  if (!userId) {
    throw new Error('未能取得使用者身份，請重新整理頁面。');
  }

  const rawMimeType = currentRecordingMimeType || currentRecordingBlob.type || getFallbackMimeType();
  const normalizedMimeType = normalizeRecordingMimeType(rawMimeType);
  const extension = inferFileExtension(normalizedMimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeBaseName = buildSafeStorageFileBase(displayName);
  const finalFileName = `${safeBaseName}_${timestamp}.${extension}`;
  const storagePath = `pending/${userId}/${finalFileName}`;
  const uploadBlob = createUploadBlob(currentRecordingBlob, normalizedMimeType);

  if (!uploadBlob || uploadBlob.size === 0) {
    throw new Error('錄音資料為空，請重新錄製。');
  }

  const { error: uploadError } = await supabaseClient
    .storage
    .from('kongshan_recordings')
    .upload(storagePath, uploadBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: normalizedMimeType
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: insertData, error: insertError } = await supabaseClient
    .from('recordings')
    .insert({
      owner_id: userId,
      display_name: displayName,
      storage_path: storagePath,
      duration_seconds: currentRecordingDuration,
      status: 'pending'
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  let signedUrl = '';
  try {
    const { data: signedData } = await supabaseClient
      .storage
      .from('kongshan_recordings')
      .createSignedUrl(storagePath, 3600);
    signedUrl = signedData?.signedUrl || '';
  } catch (signedError) {
    console.warn('生成錄音簽名網址失敗:', signedError);
  }

  return {
    id: insertData.id,
    display_name: insertData.display_name,
    storage_path: insertData.storage_path,
    duration_seconds: insertData.duration_seconds,
    file_url: signedUrl,
    owner_id: insertData.owner_id || userId,
    status: insertData.status || 'pending'
  };
}

function buildRecordingSound(recording) {
  return {
    id: recording.id,
    name: recording.display_name || '旅人錄音',
    display_name: recording.display_name || '旅人錄音',
    file_url: recording.file_url || '',
    tags: ['旅人錄音'],
    sourceType: 'recording',
    recordingPath: recording.storage_path || '',
    recordingId: recording.id,
    ownerId: recording.owner_id || recording.ownerId || null,
    recordingStatus: recording.status || recording.recordingStatus || 'pending'
  };
}

function ensureRecordingCardExists(sound) {
  // 根據 sourceType 決定添加到哪個容器
  const isRecording = sound.sourceType === 'recording';
  const selector = document.getElementById(isRecording ? 'traveler-recordings-selector' : 'sound-selector');
  if (!selector) {
    return null;
  }

  let card = selector.querySelector(`.sound-card[data-sound-id="${sound.id}"]`);
  if (card) {
    if (sound.file_url) {
      card.dataset.fileUrl = sound.file_url;
    }
    card.dataset.sourceType = sound.sourceType || card.dataset.sourceType || 'recording';
    card.dataset.recordingPath = sound.recordingPath || card.dataset.recordingPath || '';
    if (sound.ownerId) {
      card.dataset.recordingOwnerId = sound.ownerId;
    }
    if (sound.recordingStatus) {
      card.dataset.recordingStatus = sound.recordingStatus;
    }
    return card;
  }

  card = createSoundCard(sound);
  // 旅人錄音添加到開頭（最新的在前），系統音效也添加到開頭
  selector.insertBefore(card, selector.firstChild);
  return card;
}

function addUploadedRecordingToSelection(recording) {
  if (!recording) {
    return;
  }

  const sound = buildRecordingSound(recording);
  const card = ensureRecordingCardExists(sound);

  const selectedContainer = document.getElementById('selected-sounds');
  if (!selectedContainer) {
    return;
  }

  const existingItem = selectedContainer.querySelector(`[data-sound-id="${sound.id}"]`);
  if (existingItem) {
    if (sound.file_url) {
      existingItem.dataset.fileUrl = sound.file_url;
    }
    if (sound.recordingPath) {
      existingItem.dataset.recordingPath = sound.recordingPath;
    }
    if (sound.display_name) {
      existingItem.dataset.displayName = sound.display_name;
      const nameEl = existingItem.querySelector('.sound-item-name');
      if (nameEl) {
        nameEl.textContent = sound.display_name;
      }
    }
    updateEmptyState();
    scheduleAutoPreview();
    return;
  }

  if (card) {
    card.classList.add('selected');
    toggleSoundSelection(sound, card);
    return;
  }
 
  const item = createSelectedSoundItem(sound);
  selectedContainer.appendChild(item);
  updateEmptyState();
  scheduleAutoPreview();
}

function cleanupRecordingState({ keepBlob = false, preserveUploaded = true } = {}) {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }

  if (recordingAutoStopTimeout) {
    clearTimeout(recordingAutoStopTimeout);
    recordingAutoStopTimeout = null;
  }

  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }

  mediaRecorder = null;
  recordingStartTimestamp = null;
  recordingChunks = [];
  recordingRemainingSeconds = MAX_RECORDING_SECONDS;

  const {
    panel,
    audioEl,
    saveBtn,
    cancelBtn
  } = getRecordingElements();

  setRecordingButtonState(false);

  if (panel) {
    panel.hidden = true;
  }

  if (audioEl) {
    try {
      audioEl.pause();
    } catch (error) {
      /* ignore */
    }
    audioEl.removeAttribute('src');
    try {
      audioEl.load();
    } catch (error) {
      /* ignore */
    }
  }

  if (saveBtn) {
    saveBtn.disabled = true;
  }

  if (cancelBtn) {
    cancelBtn.disabled = true;
  }

  if (!keepBlob) {
    if (currentRecordingUrl) {
      URL.revokeObjectURL(currentRecordingUrl);
    }
    currentRecordingBlob = null;
    currentRecordingUrl = null;
    currentRecordingDuration = 0;
    currentRecordingMimeType = '';
  }

  if (!preserveUploaded) {
    // no-op for現在的流程
  }
}

function sanitizeRecordingName(name) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 50);
}

function inferFileExtension(mimeType) {
  if (!mimeType) {
    return 'm4a';
  }
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mp4') || normalized.includes('m4a')) {
    return 'm4a';
  }
  if (normalized.includes('mpeg')) {
    return 'mp3';
  }
  if (normalized.includes('ogg')) {
    return 'ogg';
  }
  if (normalized.includes('wav')) {
    return 'wav';
  }
  if (normalized.includes('aac')) {
    return 'aac';
  }
  return 'm4a';
}

function normalizeRecordingMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return getFallbackMimeType();
  }

  const cleaned = mimeType.split(';')[0].trim().toLowerCase();
  if (!cleaned) {
    return getFallbackMimeType();
  }

  if (cleaned === 'audio/x-m4a') {
    return 'audio/mp4';
  }

  return cleaned;
}

function createUploadBlob(blob, mimeType) {
  if (!blob) {
    return null;
  }

  if (blob.type && blob.type.toLowerCase() === mimeType) {
    return blob;
  }

  try {
    return new Blob([blob], { type: mimeType });
  } catch (error) {
    console.warn('重新封裝錄音資料時發生問題，改用原始 Blob：', error);
    return blob;
  }
}

function buildSafeStorageFileBase(name) {
  if (!name || typeof name !== 'string') {
    return 'recording';
  }

  const normalized = name.normalize('NFKC').trim();
  if (!normalized) {
    return 'recording';
  }

  const safeSegments = [];
  for (const char of normalized) {
    if (/\s/.test(char)) {
      safeSegments.push('_');
      continue;
    }

    if (char === '-' || char === '_') {
      safeSegments.push(char);
      continue;
    }

    const codePoint = char.codePointAt(0);
    const isAsciiDigit = codePoint >= 0x30 && codePoint <= 0x39;
    const isAsciiUpper = codePoint >= 0x41 && codePoint <= 0x5A;
    const isAsciiLower = codePoint >= 0x61 && codePoint <= 0x7A;

    if (isAsciiDigit || isAsciiUpper || isAsciiLower) {
      safeSegments.push(char.toLowerCase());
    } else {
      const hex = codePoint.toString(16).toLowerCase();
      const paddedHex = codePoint <= 0xFFFF ? hex.padStart(4, '0') : hex;
      safeSegments.push(`u${paddedHex}`);
    }
  }

  let result = safeSegments.join('');
  if (!result) {
    return 'recording';
  }

  result = result.replace(/_+/g, '_');
  result = result.replace(/-+/g, '-');
  result = result.replace(/^[_-]+|[_-]+$/g, '');

  if (!result) {
    return 'recording';
  }

  return result.slice(0, 60);
}

async function ensureCurrentUserId() {
  if (window.AppState?.userId) {
    return window.AppState.userId;
  }

  if (!window.AppState?.supabase) {
    return null;
  }

  try {
    const { data, error } = await window.AppState.supabase.auth.getUser();
    if (error || !data?.user) {
      return null;
    }
    window.AppState.userId = data.user.id;
    return data.user.id;
  } catch (error) {
    console.warn('取得使用者資訊失敗:', error);
    return null;
  }
}

/**
 * 創建音效卡片
 */
function createSoundCard(sound) {
  const card = document.createElement('div');
  card.className = 'sound-card';
  card.dataset.soundId = sound.id;
  card.dataset.soundName = sound.name || '';
  card.dataset.fileUrl = sound.file_url || '';
  card.dataset.sourceType = sound.sourceType || 'system';
  card.dataset.recordingPath = sound.recordingPath || '';
  if (sound.ownerId) {
    card.dataset.recordingOwnerId = sound.ownerId;
  }
  if (sound.recordingStatus) {
    card.dataset.recordingStatus = sound.recordingStatus;
  }

  card.innerHTML = `
    <div class="sound-card-name">${sound.name}</div>
    <div class="sound-card-tags">
      ${sound.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>
  `;

  card.addEventListener('click', () => toggleSoundSelection(sound, card));
  return card;
}

let autoPreviewTimer = null;

function scheduleAutoPreview() {
  if (!window.AppState || !window.AppState.soundMixer) {
    return;
  }

  if (autoPreviewTimer) {
    clearTimeout(autoPreviewTimer);
  }

  autoPreviewTimer = setTimeout(() => {
    autoPreviewSelectedSounds().catch(error => {
      console.error('自動預覽音效失敗:', error);
    });
  }, 120);
}

function cancelAutoPreview() {
  if (autoPreviewTimer) {
    clearTimeout(autoPreviewTimer);
    autoPreviewTimer = null;
  }
}

async function autoPreviewSelectedSounds() {
  if (!window.AppState || !window.AppState.soundMixer) {
    autoPreviewTimer = null;
    return;
  }

  autoPreviewTimer = null;

  const soundMixer = window.AppState.soundMixer;
  const selectedItems = Array.from(document.querySelectorAll('.selected-sound-item'));

  // 清空既有音效
  soundMixer.clear();

  if (selectedItems.length === 0) {
    return;
  }

  for (const item of selectedItems) {
    const soundId = item.dataset.soundId;
    let fileUrl = item.dataset.fileUrl;
    const name = item.dataset.displayName || '音效';
    const volumeSlider = item.querySelector('.volume-slider');
    const volume = volumeSlider ? Math.max(0, Math.min(1, parseFloat(volumeSlider.value) / 100)) : 0.7;
    const sourceType = item.dataset.sourceType || 'system';

    if ((!fileUrl || fileUrl === '') && sourceType === 'recording' && window.AppState?.supabase) {
      const recordingPath = item.dataset.recordingPath;
      if (recordingPath) {
        // 根據路徑判斷是否需要簽名 URL
        // approved/ 和 system/ 路徑可以直接訪問，pending/ 路徑需要簽名 URL
        if (recordingPath.startsWith('approved/') || recordingPath.startsWith('system/')) {
          // 公開路徑，直接構建 URL
          const projectUrl = window.AppState.supabase.supabaseUrl.replace('/rest/v1', '');
          fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${recordingPath}`;
          item.dataset.fileUrl = fileUrl;
        } else {
          // pending/ 路徑，需要簽名 URL
          try {
            const { data: signedData, error: signedError } = await window.AppState.supabase
              .storage
              .from('kongshan_recordings')
              .createSignedUrl(recordingPath, 3600);
            if (!signedError && signedData?.signedUrl) {
              fileUrl = signedData.signedUrl;
              item.dataset.fileUrl = fileUrl;
            }
          } catch (signedUrlError) {
            console.warn('取得錄音播放鏈接失敗:', signedUrlError);
          }
        }
      }
    }

    // 系統音效：將 Storage 路徑補全為公開 URL
    if (sourceType === 'system') {
      try {
        const normalized = normalizeSoundUrl(fileUrl || '', window.AppState?.supabase);
        if (normalized) {
          fileUrl = normalized;
          item.dataset.fileUrl = fileUrl;
        }
      } catch (e) {
        // 忽略規範化錯誤
      }
    }

    if (!fileUrl) {
      console.warn(`音效 ${soundId} 缺少對應的文件 URL，略過自動播放`);
      continue;
    }

    const track = await soundMixer.addTrack({
      id: soundId,
      name,
      file_url: fileUrl,
      volume,
      loop: true
    });

    if (track) {
      soundMixer.setTrackVolume(soundId, volume);
    }
  }

  if (soundMixer.getTracks().length > 0) {
    await soundMixer.playAll();
  }
}

/**
 * 切換音效選擇狀態
 */
function toggleSoundSelection(sound, card) {
  const selectedContainer = document.getElementById('selected-sounds');
  const existingItem = selectedContainer.querySelector(`[data-sound-id="${sound.id}"]`);

  if (existingItem) {
    // 已選擇，取消選擇
    existingItem.remove();
    card.classList.remove('selected');
  } else {
    // 檢查是否已達到最大數量
    const selectedCount = selectedContainer.querySelectorAll('.selected-sound-item').length;
    if (selectedCount >= 5) {
      alert('最多只能選擇 5 個音效');
      return;
    }

    // 添加到已選列表
    const enrichedSound = {
      ...sound,
      file_url: sound.file_url || card.dataset.fileUrl || '',
      sourceType: sound.sourceType || card.dataset.sourceType || 'system',
      recordingPath: sound.recordingPath || card.dataset.recordingPath || '',
      display_name: sound.name || card.dataset.soundName || '音效',
      ownerId: sound.ownerId || card.dataset.recordingOwnerId || '',
      recordingStatus: sound.recordingStatus || card.dataset.recordingStatus || ''
    };

    const item = createSelectedSoundItem(enrichedSound);
    if (!item.dataset.fileUrl) {
      item.dataset.fileUrl = card.dataset.fileUrl || '';
    }
    selectedContainer.appendChild(item);
    card.classList.add('selected');
  }

  // 更新空狀態
  updateEmptyState();
  scheduleAutoPreview();
}

/**
 * 創建已選音效項
 */
function createSelectedSoundItem(sound) {
  const item = document.createElement('div');
  item.className = 'selected-sound-item';
  item.dataset.soundId = sound.id;
  item.dataset.fileUrl = sound.file_url || '';
  item.dataset.displayName = sound.display_name || sound.name || '音效';
  item.dataset.sourceType = sound.sourceType || 'system';
  item.dataset.recordingPath = sound.recordingPath || '';
  item.dataset.recordingId = sound.recordingId || '';
  item.dataset.recordingOwnerId = sound.ownerId || sound.recordingOwnerId || '';
  item.dataset.recordingStatus = sound.recordingStatus || '';

  item.innerHTML = `
    <div class="sound-item-name">${sound.name}</div>
    <div class="sound-item-controls">
      <label class="volume-label">音量</label>
      <input type="range" class="volume-slider" min="0" max="100" value="70" data-sound-id="${sound.id}" />
      <button class="remove-btn" data-sound-id="${sound.id}" aria-label="移除">×</button>
    </div>
  `;

  const volumeSlider = item.querySelector('.volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      const volumeValue = Math.max(0, Math.min(1, parseFloat(volumeSlider.value) / 100));
      if (window.AppState && window.AppState.soundMixer) {
        window.AppState.soundMixer.setTrackVolume(sound.id, volumeValue);
      }
    });
  }

  // 綁定移除按鈕
  const removeBtn = item.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => {
    item.remove();
    const soundCard = document.querySelector(`.sound-card[data-sound-id="${sound.id}"]`);
    if (soundCard) soundCard.classList.remove('selected');
    updateEmptyState();
    scheduleAutoPreview();
  });

  return item;
}

/**
 * 更新空狀態顯示
 */
function updateEmptyState() {
  const selectedContainer = document.getElementById('selected-sounds');
  const items = selectedContainer.querySelectorAll('.selected-sound-item');
  
  let emptyState = selectedContainer.querySelector('.empty-state');
  if (items.length === 0) {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = '尚未選擇音效';
      selectedContainer.appendChild(emptyState);
    }
  } else {
    if (emptyState) emptyState.remove();
  }
}

/**
 * 背景文字顏色映射表
 * 根據背景配色方案自動設置文字顏色和發光顏色
 */
const backgroundTextColorMap = {
  'night': '#FFFFFF',    // 夜色：白色文字
  'dawn': '#2C3E50',     // 晨曦：深色文字
  'autumn': '#FFFFFF',   // 秋色：白色文字
  'spring': '#2C3E50',   // 春意：深色文字
  'sunset': '#FFFFFF',   // 暮色：白色文字
  'bamboo': '#FFFFFF'    // 竹林：白色文字
};

/**
 * 應用背景對應的文字顏色
 * @param {object} backgroundConfig - 背景配置對象
 */
function applyBackgroundTextColor(backgroundConfig) {
  const root = document.documentElement;
  
  if (!backgroundConfig || !backgroundConfig.color_scheme || !backgroundConfig.color_scheme.id) {
    // 沒有背景配置，使用系統默認
    root.style.setProperty('--poem-text-color', 'var(--color-text-primary, #2C3E50)');
    root.style.setProperty('--poem-glow-color', 'var(--color-text-primary, #2C3E50)');
    updatePoemTextGlow('var(--color-text-primary, #2C3E50)');
    return;
  }

  const bgId = backgroundConfig.color_scheme.id;
  const textColor = backgroundTextColorMap[bgId];
  
  if (textColor) {
    root.style.setProperty('--poem-text-color', textColor);
    root.style.setProperty('--poem-glow-color', textColor);
    updatePoemTextGlow(textColor);
  } else {
    // 未知的背景 ID，使用系統默認
    root.style.setProperty('--poem-text-color', 'var(--color-text-primary, #2C3E50)');
    root.style.setProperty('--poem-glow-color', 'var(--color-text-primary, #2C3E50)');
    updatePoemTextGlow('var(--color-text-primary, #2C3E50)');
  }
}

// 暴露到全局，供 app.js 使用
window.applyBackgroundTextColor = applyBackgroundTextColor;

/**
 * 更新詩句文字的發光效果
 * @param {string} glowColor - 發光顏色（十六進制或 CSS 變量）
 */
function updatePoemTextGlow(glowColor) {
  // 如果是 CSS 變量，無法直接轉換為 RGB，使用默認的白色
  if (glowColor.startsWith('var(')) {
    glowColor = '#FFFFFF';
  }
  
  // 將十六進制顏色轉換為 RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };
  
  const rgb = hexToRgb(glowColor);
  
  // 生成動態發光陰影（iOS 和桌面版使用相同的效果）
  const glowShadowMin = `0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3), 0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`;
  const glowShadowMax = `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8), 0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.48)`;
  
  const root = document.documentElement;
  root.style.setProperty('--poem-glow-shadow-min', glowShadowMin);
  root.style.setProperty('--poem-glow-shadow-max', glowShadowMax);
}

/**
 * 初始化背景選擇器
 */
function initializeBackgroundSelector() {
  const container = document.getElementById('background-selector');

  const backgrounds = [
    { id: 'night', name: '夜色', colors: ['#1A1A2E', '#16213E'] },
    { id: 'dawn', name: '晨曦', colors: ['#FFE5B4', '#FFDAB9'] },
    { id: 'autumn', name: '秋色', colors: ['#2F4F4F', '#708090'] },
    { id: 'spring', name: '春意', colors: ['#E8F4F8', '#D4E8F0'] },
    { id: 'sunset', name: '暮色', colors: ['#FF6B6B', '#FFA07A'] },
    { id: 'bamboo', name: '竹林', colors: ['#2D5016', '#4A7C2E'] }
  ];

  container.innerHTML = '';
  backgrounds.forEach(bg => {
    const bgCard = createBackgroundCard(bg);
    container.appendChild(bgCard);
  });

  // 不設置默認選擇，讓用戶自己選擇
}

/**
 * 創建背景卡片
 */
function createBackgroundCard(background) {
  const card = document.createElement('div');
  card.className = 'background-card';
  card.dataset.bgId = background.id;

  card.innerHTML = `
    <div class="background-preview" style="background: linear-gradient(135deg, ${background.colors[0]} 0%, ${background.colors[1]} 100%);"></div>
    <div class="background-name">${background.name}</div>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });

  return card;
}

/**
 * 載入聲色意境數據
 */
async function loadAtmosphereData(atmosphere) {
  const editor = document.getElementById('atmosphere-editor');
  if (editor) {
    if (atmosphere.name) {
      editor.dataset.defaultName = atmosphere.name;
    }
    if (typeof atmosphere.description === 'string') {
      editor.dataset.defaultDescription = atmosphere.description;
    }
  }

  // 使用 getAtmosphereSounds 獲取正確的音效信息（包括最新的 URL）
  // 這樣可以重用首頁已經處理好的邏輯，避免重複查詢
  let sounds = [];
  if (window.AppState?.atmosphereManager && atmosphere.sound_combination) {
    try {
      sounds = await window.AppState.atmosphereManager.getAtmosphereSounds(atmosphere);
    } catch (error) {
      console.warn('獲取音效信息失敗:', error);
    }
  }

  // 載入已選音效
  if (atmosphere.sound_combination && atmosphere.sound_combination.length > 0) {
    const selectedContainer = document.getElementById('selected-sounds');
    selectedContainer.innerHTML = '';
    
    // 創建音效 ID 到正確 URL 的映射
    const soundUrlMap = new Map();
    sounds.forEach(sound => {
      soundUrlMap.set(sound.id, sound.file_url);
    });
    
    for (const config of atmosphere.sound_combination) {
      const sourceType = config.source_type || 'system';
      const displayName = config.display_name || config.name || '音效';
      const volumeValue = Math.round((config.volume || 0.7) * 100);
      const soundId = config.recording_id || config.sound_id;
      
      // 優先使用 getAtmosphereSounds 返回的正確 URL
      let fileUrl = soundUrlMap.get(soundId) || config.file_url || '';
      
      // 如果是錄音，從 sounds 中獲取最新的 recording_path
      let recordingPath = config.recording_path || '';
      if (sourceType === 'recording') {
        const soundInfo = sounds.find(s => s.id === soundId);
        if (soundInfo?.recording_path) {
          recordingPath = soundInfo.recording_path;
        }
      }

      if (sourceType === 'recording') {
        const recordingId = soundId;
        const item = createSelectedSoundItem({
          id: recordingId,
          name: displayName,
          display_name: displayName,
          file_url: fileUrl,
          sourceType: 'recording',
          recordingPath,
          recordingId,
          ownerId: config.recording_owner_id || '',
          recordingStatus: config.recording_status || ''
        });

        if (item.dataset.fileUrl === '' && fileUrl) {
          item.dataset.fileUrl = fileUrl;
        }

        selectedContainer.appendChild(item);

        const volumeSlider = item.querySelector('.volume-slider');
        if (volumeSlider) {
          volumeSlider.value = volumeValue;
          if (window.AppState?.soundMixer) {
            window.AppState.soundMixer.setTrackVolume(recordingId, Math.max(0, Math.min(1, volumeValue / 100)));
          }
        }

        // 標記對應的旅人錄音卡片為選中狀態
        const recordingCard = document.querySelector(`#traveler-recordings-selector .sound-card[data-sound-id="${recordingId}"]`);
        if (recordingCard) {
          recordingCard.classList.add('selected');
        }

        continue;
      }

      // 從音效選擇器中找到對應的音效卡片（系統音效或旅人錄音）
      const soundCard = document.querySelector(`.sound-card[data-sound-id="${config.sound_id}"]`);
      if (soundCard) {
        soundCard.classList.add('selected');
        
        // 創建已選音效項，優先使用 getAtmosphereSounds 返回的正確 URL
        const soundName = soundCard.querySelector('.sound-card-name').textContent;
        const finalFileUrl = fileUrl || soundCard.dataset.fileUrl || '';
        const item = createSelectedSoundItem({
          id: config.sound_id,
          name: soundName,
          display_name: soundName,
          file_url: finalFileUrl,
          tags: [],
          sourceType
        });
        
        // 設置音量
        const volumeSlider = item.querySelector('.volume-slider');
        if (volumeSlider) {
          volumeSlider.value = volumeValue;
          if (window.AppState && window.AppState.soundMixer) {
            window.AppState.soundMixer.setTrackVolume(config.sound_id, (volumeValue / 100));
          }
        }
        
        selectedContainer.appendChild(item);
      } else if (fileUrl) {
        // 如果找不到音效卡片，但已經有正確的 URL，直接創建項目
        const item = createSelectedSoundItem({
          id: config.sound_id,
          name: displayName,
          display_name: displayName,
          file_url: fileUrl,
          sourceType
        });

        const volumeSlider = item.querySelector('.volume-slider');
        if (volumeSlider) {
          volumeSlider.value = volumeValue;
        }

        selectedContainer.appendChild(item);
      }
    }
    
    updateEmptyState();
    scheduleAutoPreview();
  }

  // 載入背景配置
  if (atmosphere.background_config && atmosphere.background_config.color_scheme) {
    const bgId = atmosphere.background_config.color_scheme.id;
    const bgCard = document.querySelector(`.background-card[data-bg-id="${bgId}"]`);
    if (bgCard) {
      document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
      bgCard.classList.add('selected');
    }
  } else {
    // 如果沒有背景配置，清除所有選中狀態
    document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
  }
}

/**
 * 預覽聲色意境
 */
async function previewAtmosphere(poem) {
  cancelAutoPreview();
  const data = collectAtmosphereData(poem, 'draft');
  if (!data) return;

  console.log('預覽聲色意境:', data);

  // 通過全局 AppState 應用預覽
  if (window.AppState) {
    const { soundMixer, backgroundRenderer, atmosphereManager } = window.AppState;

    // 清空現有音效
    if (soundMixer) {
      soundMixer.clear();
    }

    // 加載並應用音效
    if (soundMixer && data.sound_combination && data.sound_combination.length > 0) {
      try {
        // 檢查 sound_id 是否為有效的 UUID（編輯器使用模擬數據時 ID 為 "1", "2" 等）
        const soundIds = data.sound_combination.map(s => s.sound_id);
        const isValidUUID = soundIds.some(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        });
        
        let soundEffects = [];
        
        // 如果是有效的 UUID，嘗試從數據庫加載
        if (isValidUUID && atmosphereManager && atmosphereManager.loadSoundEffects) {
          try {
            soundEffects = await atmosphereManager.loadSoundEffects(soundIds);
          } catch (dbError) {
            console.warn('從數據庫加載音效失敗，使用編輯器數據:', dbError);
            soundEffects = [];
          }
        }
        
        // 如果無法從數據庫加載或使用模擬數據，使用編輯器中的音效信息
        if (soundEffects.length === 0) {
          soundEffects = await Promise.all(data.sound_combination.map(async (config) => {
            // 優先從已選項目獲取信息（包含完整的錄音信息）
            const selectedItem = document.querySelector(`.selected-sound-item[data-sound-id="${config.sound_id}"]`);
            const soundCard = selectedItem || document.querySelector(`.sound-card[data-sound-id="${config.sound_id}"]`);
            
            if (!soundCard) {
              return {
                id: config.sound_id,
                name: '音效',
                file_url: ''
              };
            }

            const name = soundCard.querySelector('.sound-card-name')?.textContent || 
                        soundCard.dataset.displayName || 
                        soundCard.dataset.soundName || 
                        '音效';
            
            let fileUrl = soundCard.dataset.fileUrl || '';
            const sourceType = soundCard.dataset.sourceType || 'system';
            const recordingPath = soundCard.dataset.recordingPath || '';

            // 如果是錄音文件且 file_url 為空，嘗試生成簽名 URL
            if ((!fileUrl || fileUrl === '') && sourceType === 'recording' && recordingPath && window.AppState?.supabase) {
              try {
                if (recordingPath.startsWith('approved/') || recordingPath.startsWith('system/')) {
                  // 公開路徑，直接構建 URL
                  const projectUrl = window.AppState.supabase.supabaseUrl.replace('/rest/v1', '');
                  fileUrl = `${projectUrl}/storage/v1/object/public/kongshan_recordings/${recordingPath}`;
                } else if (recordingPath.startsWith('pending/')) {
                  // pending/ 路徑，需要簽名 URL
                  const { data: signedData, error: signedError } = await window.AppState.supabase
                    .storage
                    .from('kongshan_recordings')
                    .createSignedUrl(recordingPath, 3600);
                  if (!signedError && signedData?.signedUrl) {
                    fileUrl = signedData.signedUrl;
                  }
                }
              } catch (signedError) {
                console.warn('生成錄音簽名網址失敗:', signedError);
              }
            }

            return {
              id: config.sound_id,
              name: name,
              file_url: fileUrl
            };
          }));
        }

        // 合併音效信息和配置
        const sounds = soundEffects.map(effect => {
          const config = data.sound_combination.find(s => s.sound_id === effect.id);
          return {
            id: effect.id,
            name: effect.name,
            file_url: normalizeSoundUrl(effect.file_url || '', window.AppState?.supabase),
            volume: config ? config.volume : 1.0,
            loop: config ? config.loop : true
          };
        });

        // 添加到混音器
        for (const sound of sounds) {
          // 檢查編輯器是否還存在（用戶可能已經關閉）
          const editor = document.getElementById('atmosphere-editor');
          if (!editor || !editor.classList.contains('visible')) {
            // 編輯器已關閉，停止載入
            if (soundMixer) {
              soundMixer.clear();
            }
            return;
          }
          
          if (sound.file_url) {
            await soundMixer.addTrack(sound);
            
            // 每次載入後再次檢查編輯器狀態
            const editorStillExists = document.getElementById('atmosphere-editor');
            if (!editorStillExists || !editorStillExists.classList.contains('visible')) {
              // 編輯器已關閉，停止載入
              if (soundMixer) {
                soundMixer.clear();
              }
              return;
            }
          }
        }

        // 播放前最後檢查編輯器狀態
        const editor = document.getElementById('atmosphere-editor');
        if (editor && editor.classList.contains('visible') && soundMixer.getTracks().length > 0) {
          await soundMixer.playAll();
        } else {
          // 編輯器已關閉，清除音效
          if (soundMixer) {
            soundMixer.clear();
          }
        }

        // 預覽模式下隱藏音效控制面板
        const soundControlsEl = document.getElementById('sound-controls');
        if (soundControlsEl) {
          soundControlsEl.style.display = 'none';
        }
      } catch (error) {
        console.error('加載預覽音效失敗:', error);
        // 即使音效加載失敗，也顯示提示
      }
    }

    // 應用背景配置（檢查編輯器是否還存在）
    const editor = document.getElementById('atmosphere-editor');
    if (editor && editor.classList.contains('visible')) {
      if (backgroundRenderer) {
        if (data.background_config && typeof backgroundRenderer.setConfig === 'function') {
      try {
        backgroundRenderer.setConfig(data.background_config);
            // 應用對應的文字顏色
            applyBackgroundTextColor(data.background_config);
      } catch (bgError) {
        console.warn('應用背景配置失敗:', bgError);
          }
        } else {
          // 如果沒有背景配置，清除背景並恢復默認文字顏色
          if (typeof backgroundRenderer.clear === 'function') {
            backgroundRenderer.clear();
          }
          applyBackgroundTextColor(null);
      }
    }

    // 保存當前編輯狀態，以便返回編輯
    window.AppState.previewAtmosphereData = data;
    window.AppState.isPreviewMode = true; // 標記為預覽模式
    } else {
      // 編輯器已關閉，清除音效和背景
      if (soundMixer) {
        soundMixer.clear();
      }
      if (backgroundRenderer && typeof backgroundRenderer.clear === 'function') {
        backgroundRenderer.clear();
      }
      applyBackgroundTextColor(null);
    }
  }

  // 關閉編輯器，但不停止音效（因為預覽需要播放音效）
  hideAtmosphereEditor(false);

  // 顯示提示
  const previewTip = document.createElement('div');
  previewTip.className = 'preview-tip';
  previewTip.textContent = '正在預覽聲色意境，音效已自動播放';
  document.body.appendChild(previewTip);
  
  setTimeout(() => {
    previewTip.classList.add('visible');
  }, 100);

  setTimeout(() => {
    previewTip.classList.remove('visible');
    setTimeout(() => previewTip.remove(), 300);
  }, 3000);
}

/**
 * 發布聲色意境
 */
async function publishAtmosphere(poem, onSave) {
  cancelAutoPreview();
  const data = collectAtmosphereData(poem, 'pending');
  if (!data) return;

  if (data.status === 'approved') {
    alert('你的聲色意境已直接發佈！');
  } else {
    alert('你的聲色意境包含個人錄音，已提交審核並可先由你自己預覽。');
  }

  console.log('發布意境:', data);
  
  if (onSave) onSave(data);
  hideAtmosphereEditor();
}

/**
 * 收集聲色意境數據
 */
function collectAtmosphereData(poem, status) {
  const editor = document.getElementById('atmosphere-editor');
  const fallbackName = poem && poem.title ? `${poem.title} 聲色意境` : '未命名聲色意境';
  const name = editor && editor.dataset.defaultName ? editor.dataset.defaultName : fallbackName;
  const description = editor && typeof editor.dataset.defaultDescription === 'string'
    ? editor.dataset.defaultDescription
    : '';

  // 收集已選音效
  const selectedSounds = [];
  document.querySelectorAll('.selected-sound-item').forEach(item => {
    const soundId = item.dataset.soundId;
    const volumeSlider = item.querySelector('.volume-slider');
    const volumeValue = volumeSlider ? parseFloat(volumeSlider.value) : 70;
    const sourceType = item.dataset.sourceType || 'system';
    const recordingPath = item.dataset.recordingPath || '';
    const displayName = item.dataset.displayName || '音效';
    const fileUrl = item.dataset.fileUrl || '';
    const recordingId = item.dataset.recordingId || (sourceType === 'recording' ? soundId : '');
    const recordingOwnerId = item.dataset.recordingOwnerId || '';
    const recordingStatus = item.dataset.recordingStatus || '';

    selectedSounds.push({
      sound_id: soundId,
      volume: Math.max(0, Math.min(1, volumeValue / 100)),
      loop: true,
      source_type: sourceType,
      display_name: displayName,
      file_url: fileUrl || null,
      recording_path: recordingPath || null,
      recording_id: recordingId || null,
      recording_owner_id: recordingOwnerId || null,
      recording_status: recordingStatus || null
    });
  });

  if (selectedSounds.length === 0) {
    alert('請至少選擇一個音效');
    return null;
  }

  // 收集背景配置（只有當用戶選中背景時才創建配置）
  const selectedBg = document.querySelector('.background-card.selected');
  let backgroundConfig = null;
  
  if (selectedBg) {
    const bgId = selectedBg.dataset.bgId;
  
  // 背景配色方案映射
  const backgroundSchemes = {
    'night': { colors: ['#1A1A2E', '#16213E'], direction: 'diagonal' },
    'dawn': { colors: ['#FFE5B4', '#FFDAB9'], direction: 'vertical' },
    'autumn': { colors: ['#2F4F4F', '#708090'], direction: 'vertical' },
    'spring': { colors: ['#E8F4F8', '#D4E8F0'], direction: 'diagonal' },
    'sunset': { colors: ['#FF6B6B', '#FFA07A'], direction: 'diagonal' },
    'bamboo': { colors: ['#2D5016', '#4A7C2E'], direction: 'diagonal' }
  };
  
  const bgScheme = backgroundSchemes[bgId] || backgroundSchemes['night'];
    
    backgroundConfig = {
      color_scheme: {
        id: bgId,
        colors: bgScheme.colors,
        direction: bgScheme.direction
      },
      abstract_elements: [] // 暫時為空
    };
  }

  const currentUserId = window.AppState?.userId || null;

  let finalStatus = status;
  if (status === 'pending') {
    const requiresReview = selectedSounds.some(soundConfig => {
      if ((soundConfig.source_type || 'system') !== 'recording') {
        return false;
      }
      const ownerId = soundConfig.recording_owner_id;
      const recordingStatus = (soundConfig.recording_status || '').toLowerCase();
      if (recordingStatus === 'published') {
        return false;
      }
      if (!currentUserId) {
        return true;
      }
      return ownerId ? ownerId === currentUserId : true;
    });

    finalStatus = requiresReview ? 'pending' : 'approved';
  }

  return {
    poem_id: poem.id,
    name,
    description,
    sound_combination: selectedSounds,
    background_config: backgroundConfig,
    status: finalStatus,
    source: 'user',
    is_ai_generated: false
  };
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  for (const candidate of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    } catch (error) {
      console.warn('檢查錄音格式支援時出現問題:', error);
    }
  }

  return '';
}

function getFallbackMimeType() {
  return DEFAULT_RECORDING_MIME;
}


