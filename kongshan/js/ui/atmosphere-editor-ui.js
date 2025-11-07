// =====================================================
// 聲色意境編輯器 UI 模塊
// =====================================================

import { normalizeSoundUrl } from '../utils/sound-url.js';

const MAX_RECORDING_SECONDS = 120;

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
let lastUploadedRecording = null;

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
      <h3 class="editor-title">創作聲色意境</h3>
      <button class="editor-close-btn" aria-label="關閉編輯器">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="editor-content">
      <!-- 音效選擇 -->
      <div class="editor-section">
        <label class="editor-label">
          選擇音效
          <span class="editor-hint">最多選擇 5 個</span>
        </label>
        <div id="sound-selector" class="sound-selector">
          <!-- 音效列表將動態生成 -->
        </div>
      </div>

      <!-- 已選擇的音效 -->
      <div class="editor-section">
        <label class="editor-label">已選音效</label>
        <div id="selected-sounds" class="selected-sounds">
          <div class="empty-state">尚未選擇音效</div>
        </div>
      </div>

      <!-- 錄音功能 -->
      <div class="editor-section" id="recording-section">
        <label class="editor-label">
          錄製自訂音效
          <span class="editor-hint">單次最長 120 秒</span>
        </label>
        <div class="recording-controls">
          <button class="record-btn" id="start-recording-btn">開始錄音</button>
          <button class="record-btn record-btn-danger" id="stop-recording-btn" disabled>停止</button>
          <div class="recording-timer" id="recording-timer" aria-live="polite">剩餘 120 秒</div>
        </div>
        <div class="recording-preview" id="recording-preview" hidden>
          <audio id="recording-audio" controls></audio>
          <div class="recording-meta">
            <div class="recording-name-field" id="recording-name-field" hidden>
              <label for="recording-name-input">錄音名稱</label>
              <input type="text" id="recording-name-input" class="editor-input" maxlength="50" placeholder="請輸入錄音名稱">
            </div>
            <div class="recording-actions">
              <button class="editor-btn editor-btn-primary" id="upload-recording-btn" disabled>上傳錄音</button>
              <button class="editor-btn editor-btn-secondary" id="use-recording-btn" hidden>加入已選音效</button>
            </div>
          </div>
          <div class="recording-status" id="recording-status"></div>
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
  closeBtn.addEventListener('click', () => hideAtmosphereEditor());

  // 點擊外部關閉
  editor.addEventListener('click', (e) => {
    if (e.target === editor) {
      hideAtmosphereEditor();
    }
  });

  // 初始化內容（異步）
  initializeSoundSelector().then(() => {
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
 */
export function hideAtmosphereEditor() {
  const editor = document.getElementById('atmosphere-editor');
  if (editor) {
    cancelAutoPreview();
    stopRecording(true);
    cleanupRecordingState();
    editor.classList.remove('visible');
    setTimeout(() => editor.remove(), 300);
  }
}

/**
 * 初始化音效選擇器
 */
function initializeSoundSelector() {
  const container = document.getElementById('sound-selector');
  container.innerHTML = '<div class="loading-text">加載音效庫...</div>';

  return new Promise(async (resolve) => {
    // 從數據庫加載音效列表
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
          sounds = data.map(effect => ({
            id: effect.id,
            name: effect.name,
            tags: effect.tags || [],
            file_url: effect.file_url,
            sourceType: 'system'
          }));
        }
      } catch (error) {
        console.warn('從數據庫加載音效失敗，使用默認列表:', error);
      }
    }
    
    // 如果數據庫中沒有音效，使用默認列表（基於實際文件）
    if (sounds.length === 0) {
      sounds = [
        { id: 'wind', name: '風聲', tags: ['自然', '寧靜'], file_url: '/kongshan/assets/sounds/wind.mp3', sourceType: 'system' },
        { id: 'stream', name: '流水', tags: ['自然', '放鬆'], file_url: '/kongshan/assets/sounds/stream.mp3', sourceType: 'system' },
        { id: 'birds', name: '鳥鳴', tags: ['自然', '早晨'], file_url: '/kongshan/assets/sounds/birds.mp3', sourceType: 'system' },
        { id: 'night', name: '夜晚', tags: ['自然', '寧靜'], file_url: '/kongshan/assets/sounds/night.mp3', sourceType: 'system' }
      ];
    }

    container.innerHTML = '';
    sounds.forEach(sound => {
      const soundCard = createSoundCard(sound);
      container.appendChild(soundCard);
    });

    resolve();
  });
}

function getRecordingElements() {
  return {
    section: document.getElementById('recording-section'),
    startBtn: document.getElementById('start-recording-btn'),
    stopBtn: document.getElementById('stop-recording-btn'),
    timerEl: document.getElementById('recording-timer'),
    previewEl: document.getElementById('recording-preview'),
    audioEl: document.getElementById('recording-audio'),
    nameField: document.getElementById('recording-name-field'),
    nameInput: document.getElementById('recording-name-input'),
    uploadBtn: document.getElementById('upload-recording-btn'),
    statusEl: document.getElementById('recording-status'),
    useBtn: document.getElementById('use-recording-btn')
  };
}

function initializeRecordingSection() {
  const {
    section,
    startBtn,
    stopBtn,
    timerEl,
    nameInput,
    uploadBtn,
    statusEl,
    useBtn
  } = getRecordingElements();

  if (!section) {
    return;
  }

  const recordingSupported = typeof window !== 'undefined'
    && navigator?.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  if (!recordingSupported) {
    if (startBtn) {
      startBtn.disabled = true;
    }
    if (stopBtn) {
      stopBtn.disabled = true;
    }
    if (statusEl) {
      statusEl.textContent = '此設備或瀏覽器不支援錄音功能，請改用支援 MediaRecorder 的瀏覽器。';
      statusEl.classList.add('recording-status-error');
    }
    if (timerEl) {
      timerEl.textContent = '錄音功能未啟用';
    }
    return;
  }

  resetRecordingUI();

  if (startBtn) {
    startBtn.addEventListener('click', startRecording);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => stopRecording(true));
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadRecording);
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const value = nameInput.value.trim();
      if (uploadBtn) {
        uploadBtn.disabled = !value || !currentRecordingBlob || isUploadingRecording;
      }
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('recording-status-error', 'recording-status-success');
      }
    });
  }

  if (useBtn) {
    useBtn.addEventListener('click', () => {
      if (!lastUploadedRecording) {
        return;
      }
      addUploadedRecordingToSelection(lastUploadedRecording);
    });
  }
}

function resetRecordingUI() {
  const {
    startBtn,
    stopBtn,
    timerEl,
    previewEl,
    audioEl,
    nameField,
    nameInput,
    uploadBtn,
    statusEl,
    useBtn
  } = getRecordingElements();

  recordingRemainingSeconds = MAX_RECORDING_SECONDS;

  if (timerEl) {
    timerEl.textContent = formatRemainingTime(recordingRemainingSeconds);
  }

  if (startBtn) {
    startBtn.disabled = false;
  }

  if (stopBtn) {
    stopBtn.disabled = true;
  }

  if (previewEl) {
    previewEl.hidden = true;
  }

  if (audioEl) {
    audioEl.src = '';
  }

  if (nameField) {
    nameField.hidden = true;
  }

  if (nameInput) {
    nameInput.value = '';
  }

  if (uploadBtn) {
    uploadBtn.disabled = true;
  }

  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }

  if (useBtn) {
    useBtn.hidden = true;
  }
}

async function startRecording() {
  if (isUploadingRecording) {
    return;
  }

  const {
    startBtn,
    stopBtn,
    timerEl,
    previewEl,
    statusEl,
    nameField,
    uploadBtn,
    useBtn
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

    const recorder = new MediaRecorder(stream);
    mediaRecorder = recorder;
    currentRecordingMimeType = recorder.mimeType || 'audio/webm';
    recorder.addEventListener('dataavailable', handleRecordingDataAvailable);
    recorder.addEventListener('stop', handleRecordingStop);
    recorder.start();

    if (startBtn) {
      startBtn.disabled = true;
    }
    if (stopBtn) {
      stopBtn.disabled = false;
    }
    if (uploadBtn) {
      uploadBtn.disabled = true;
    }
    if (useBtn) {
      useBtn.hidden = true;
    }
    if (previewEl) {
      previewEl.hidden = false;
    }
    if (nameField) {
      nameField.hidden = true;
    }
    if (statusEl) {
      statusEl.textContent = '錄音中...';
      statusEl.classList.remove('recording-status-error', 'recording-status-success');
    }

    if (timerEl) {
      timerEl.textContent = formatRemainingTime(recordingRemainingSeconds);
    }

    recordingTimerInterval = setInterval(() => {
      recordingRemainingSeconds = Math.max(0, recordingRemainingSeconds - 1);
      if (timerEl) {
        timerEl.textContent = formatRemainingTime(recordingRemainingSeconds);
      }
      if (recordingRemainingSeconds <= 0) {
        stopRecording(false);
      }
    }, 1000);

    recordingAutoStopTimeout = setTimeout(() => {
      stopRecording(false);
    }, MAX_RECORDING_SECONDS * 1000);
  } catch (error) {
    console.error('啟動錄音失敗:', error);
    if (statusEl) {
      statusEl.textContent = '無法啟動錄音，請確認已允許麥克風權限。';
      statusEl.classList.add('recording-status-error');
    }
    if (startBtn) {
      startBtn.disabled = false;
    }
    if (stopBtn) {
      stopBtn.disabled = true;
    }
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

  try {
    mediaRecorder.stop();
  } catch (error) {
    console.warn('停止錄音時發生錯誤:', error);
  }

  const { stopBtn, startBtn, statusEl } = getRecordingElements();
  if (stopBtn) {
    stopBtn.disabled = true;
  }
  if (startBtn) {
    startBtn.disabled = false;
  }
  if (statusEl && manualStop) {
    statusEl.textContent = '正在處理錄音...';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }
}

function handleRecordingDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordingChunks.push(event.data);
  }
}

async function handleRecordingStop() {
  const {
    audioEl,
    nameField,
    uploadBtn,
    statusEl,
    previewEl,
    nameInput,
    timerEl,
    startBtn,
    useBtn
  } = getRecordingElements();

  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }

  const recordingDurationMs = recordingStartTimestamp ? Date.now() - recordingStartTimestamp : 0;
  currentRecordingDuration = Math.max(1, Math.min(MAX_RECORDING_SECONDS, Math.round(recordingDurationMs / 1000)));
  recordingStartTimestamp = null;

  try {
    mediaRecorder = null;
    const blob = new Blob(recordingChunks, { type: currentRecordingMimeType || 'audio/webm' });
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

  if (timerEl) {
    timerEl.textContent = formatRemainingTime(MAX_RECORDING_SECONDS);
  }

  if (audioEl) {
    audioEl.src = currentRecordingUrl;
  }

  if (previewEl) {
    previewEl.hidden = false;
  }

  if (nameField) {
    nameField.hidden = false;
  }

  if (uploadBtn) {
    const hasName = nameInput ? nameInput.value.trim().length > 0 : false;
    uploadBtn.disabled = !hasName;
  }

  if (startBtn) {
    startBtn.disabled = false;
  }

  if (useBtn) {
    useBtn.hidden = true;
  }

  lastUploadedRecording = null;

  if (statusEl) {
    statusEl.textContent = '錄音完成，請輸入名稱後上傳。';
    statusEl.classList.remove('recording-status-error', 'recording-status-success');
  }
}

function formatRemainingTime(seconds) {
  return `剩餘 ${seconds} 秒`;
}

function sanitizeRecordingName(name) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 50);
}

function inferFileExtension(mimeType) {
  if (!mimeType) {
    return 'webm';
  }
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a';
  }
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }
  if (mimeType.includes('wav')) {
    return 'wav';
  }
  if (mimeType.includes('aac')) {
    return 'aac';
  }
  return 'webm';
}

async function uploadRecording() {
  if (!currentRecordingBlob || isUploadingRecording) {
    return;
  }

  const {
    nameInput,
    uploadBtn,
    statusEl,
    useBtn
  } = getRecordingElements();

  if (!nameInput) {
    return;
  }

  const displayName = sanitizeRecordingName(nameInput.value);
  if (!displayName) {
    if (statusEl) {
      statusEl.textContent = '請輸入錄音名稱後再上傳。';
      statusEl.classList.add('recording-status-error');
    }
    return;
  }

  if (!window.AppState || !window.AppState.supabase) {
    if (statusEl) {
      statusEl.textContent = '尚未連接 Supabase，無法上傳錄音。';
      statusEl.classList.add('recording-status-error');
    }
    return;
  }

  try {
    isUploadingRecording = true;
    if (uploadBtn) {
      uploadBtn.disabled = true;
    }
    if (statusEl) {
      statusEl.textContent = '錄音上傳中...';
      statusEl.classList.remove('recording-status-error', 'recording-status-success');
    }

    const supabaseClient = window.AppState.supabase;
    const userId = await ensureCurrentUserId();
    if (!userId) {
      throw new Error('未能獲取使用者身份，請重新整理頁面。');
    }

    const extension = inferFileExtension(currentRecordingMimeType || currentRecordingBlob.type);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedBaseName = displayName.replace(/[^\u4e00-\u9fa5A-Za-z0-9\-\s_]/g, '').replace(/\s+/g, '_');
    const finalFileName = `${sanitizedBaseName || 'recording'}_${timestamp}.${extension}`;
    const storagePath = `${userId}/${finalFileName}`;

    const file = new File([currentRecordingBlob], finalFileName, { type: currentRecordingBlob.type || currentRecordingMimeType || 'audio/webm' });

    const { error: uploadError } = await supabaseClient
      .storage
      .from('kongshan_recordings')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
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
        status: 'published'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    let signedUrl = '';
    try {
      const { data: signedData, error: signedError } = await supabaseClient
        .storage
        .from('kongshan_recordings')
        .createSignedUrl(storagePath, 3600);
      if (!signedError && signedData?.signedUrl) {
        signedUrl = signedData.signedUrl;
      }
    } catch (signedError) {
      console.warn('生成錄音簽名網址失敗:', signedError);
    }

    lastUploadedRecording = {
      id: insertData.id,
      display_name: insertData.display_name,
      storage_path: insertData.storage_path,
      duration_seconds: insertData.duration_seconds,
      file_url: signedUrl
    };

    if (statusEl) {
      statusEl.textContent = '錄音已上傳成功，可加入編輯或再次錄製。';
      statusEl.classList.remove('recording-status-error');
      statusEl.classList.add('recording-status-success');
    }

    if (useBtn) {
      useBtn.hidden = false;
    }

    addUploadedRecordingToSelection(lastUploadedRecording);
  } catch (error) {
    console.error('錄音上傳失敗:', error);
    if (statusEl) {
      statusEl.textContent = `錄音上傳失敗：${error.message || '請稍後再試'}`;
      statusEl.classList.add('recording-status-error');
    }
  } finally {
    isUploadingRecording = false;
    const { uploadBtn: refreshedUploadBtn } = getRecordingElements();
    if (refreshedUploadBtn) {
      refreshedUploadBtn.disabled = !currentRecordingBlob || !nameInput || !nameInput.value.trim();
    }
  }
}

function addUploadedRecordingToSelection(recording) {
  if (!recording) {
    return;
  }

  const selectedContainer = document.getElementById('selected-sounds');
  if (!selectedContainer) {
    return;
  }

  const existingItem = selectedContainer.querySelector(`[data-sound-id="${recording.id}"]`);
  if (existingItem) {
    if (recording.file_url) {
      existingItem.dataset.fileUrl = recording.file_url;
    }
    if (recording.storage_path) {
      existingItem.dataset.recordingPath = recording.storage_path;
    }
    if (recording.display_name) {
      existingItem.dataset.displayName = recording.display_name;
      const nameEl = existingItem.querySelector('.sound-item-name');
      if (nameEl) {
        nameEl.textContent = recording.display_name;
      }
    }
    updateEmptyState();
    scheduleAutoPreview();
    return;
  }

  const sound = {
    id: recording.id,
    name: recording.display_name || '錄音',
    display_name: recording.display_name || '錄音',
    file_url: recording.file_url || '',
    sourceType: 'recording',
    recordingPath: recording.storage_path || '',
    recordingId: recording.id
  };

  const item = createSelectedSoundItem(sound);
  if (recording.file_url) {
    item.dataset.fileUrl = recording.file_url;
  }
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
  currentRecordingMimeType = '';

  if (!keepBlob) {
    if (currentRecordingUrl) {
      URL.revokeObjectURL(currentRecordingUrl);
    }
    currentRecordingBlob = null;
    currentRecordingUrl = null;
    currentRecordingDuration = 0;
  }

  if (!preserveUploaded) {
    lastUploadedRecording = null;
  }
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
      display_name: sound.name || card.dataset.soundName || '音效'
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

  // 默認選擇第一個
  container.querySelector('.background-card').classList.add('selected');
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

  // 載入已選音效
  if (atmosphere.sound_combination && atmosphere.sound_combination.length > 0) {
    const selectedContainer = document.getElementById('selected-sounds');
    selectedContainer.innerHTML = '';
    
    for (const config of atmosphere.sound_combination) {
      const sourceType = config.source_type || 'system';
      const displayName = config.display_name || config.name || '音效';
      const volumeValue = Math.round((config.volume || 0.7) * 100);

      if (sourceType === 'recording') {
        const recordingId = config.recording_id || config.sound_id;
        const recordingPath = config.recording_path || '';
        let fileUrl = config.file_url || '';

        if ((!fileUrl || fileUrl === '') && window.AppState?.supabase && recordingPath) {
          try {
            const { data: signedData, error: signedError } = await window.AppState.supabase
              .storage
              .from('kongshan_recordings')
              .createSignedUrl(recordingPath, 3600);
            if (!signedError && signedData?.signedUrl) {
              fileUrl = signedData.signedUrl;
            }
          } catch (signedError) {
            console.warn('取得錄音簽名網址失敗:', signedError);
          }
        }

        const item = createSelectedSoundItem({
          id: recordingId,
          name: displayName,
          display_name: displayName,
          file_url: fileUrl || '',
          sourceType: 'recording',
          recordingPath,
          recordingId
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

        continue;
      }

      // 從音效選擇器中找到對應的音效卡片
      const soundCard = document.querySelector(`.sound-card[data-sound-id="${config.sound_id}"]`);
      if (soundCard) {
        soundCard.classList.add('selected');
        
        // 創建已選音效項
        const soundName = soundCard.querySelector('.sound-card-name').textContent;
        const fileUrl = soundCard.dataset.fileUrl || '';
        const item = createSelectedSoundItem({
          id: config.sound_id,
          name: soundName,
          display_name: soundName,
          file_url: fileUrl,
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
      } else if (config.file_url) {
        const item = createSelectedSoundItem({
          id: config.sound_id,
          name: displayName,
          display_name: displayName,
          file_url: config.file_url,
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
          soundEffects = data.sound_combination.map(config => {
            const soundCard = document.querySelector(`.sound-card[data-sound-id="${config.sound_id}"]`);
            const name = soundCard ? soundCard.querySelector('.sound-card-name').textContent : '音效';
            return {
              id: config.sound_id,
              name: name,
              file_url: '' // 預覽時可能沒有實際文件
            };
          });
        }

        // 合併音效信息和配置
        const sounds = soundEffects.map(effect => {
          const config = data.sound_combination.find(s => s.sound_id === effect.id);
          return {
            id: effect.id,
            name: effect.name,
            file_url: normalizeSoundUrl(effect.file_url || `/kongshan/assets/sounds/${effect.name}.mp3`),
            volume: config ? config.volume : 1.0,
            loop: config ? config.loop : true
          };
        });

        // 添加到混音器
        for (const sound of sounds) {
          if (sound.file_url) {
            await soundMixer.addTrack(sound);
          }
        }

        // 預覽模式下自動播放音效
        if (soundMixer.getTracks().length > 0) {
          await soundMixer.playAll();
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

    // 應用背景配置
    if (backgroundRenderer && data.background_config && typeof backgroundRenderer.setConfig === 'function') {
      try {
        backgroundRenderer.setConfig(data.background_config);
      } catch (bgError) {
        console.warn('應用背景配置失敗:', bgError);
      }
    }

    // 保存當前編輯狀態，以便返回編輯
    window.AppState.previewAtmosphereData = data;
    window.AppState.isPreviewMode = true; // 標記為預覽模式
  }

  // 關閉編輯器
  hideAtmosphereEditor();

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

  // 檢查是否使用了用戶上傳的音效
  const hasUserSounds = false; // TODO: 實際檢查邏輯
  
  if (hasUserSounds) {
    alert('你的聲色意境包含自己上傳的音效，需要管理員審核後才能發佈給其他用戶。');
  } else {
    alert('你的聲色意境已發佈！');
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

    selectedSounds.push({
      sound_id: soundId,
      volume: Math.max(0, Math.min(1, volumeValue / 100)),
      loop: true,
      source_type: sourceType,
      display_name: displayName,
      file_url: fileUrl || null,
      recording_path: recordingPath || null,
      recording_id: recordingId || null
    });
  });

  if (selectedSounds.length === 0) {
    alert('請至少選擇一個音效');
    return null;
  }

  // 收集背景配置
  const selectedBg = document.querySelector('.background-card.selected');
  const bgId = selectedBg ? selectedBg.dataset.bgId : 'night';
  
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

  return {
    poem_id: poem.id,
    name,
    description,
    sound_combination: selectedSounds,
    background_config: {
      color_scheme: {
        id: bgId,
        colors: bgScheme.colors,
        direction: bgScheme.direction
      },
      abstract_elements: [] // 暫時為空
    },
    status,
    source: 'user',
    is_ai_generated: false
  };
}

