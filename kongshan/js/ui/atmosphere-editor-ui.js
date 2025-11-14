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

// 波形圖相關變量
let wavesurfer = null;
let trimStartRegion = null;
let trimEndRegion = null;
let previewAudioContext = null;
let previewAudioSource = null;
let previewDebounceTimer = null;
let previewTimeout = null; // 預覽播放的 timeout 引用
let previewTimeUpdateHandler = null; // 預覽播放的時間更新監聽器
const MIN_TRIM_DURATION = 2; // 最小剪切長度 2 秒
const WAVEFORM_SAMPLE_RATE = 100; // 每 100ms 一個數據點

// 地點相關變量
let currentRecordingLocation = null; // 當前錄音的地點名稱

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

  // 重置編輯狀態追蹤
  hasEditorChanges = false;
  
  // 保存原始狀態（用於關閉時恢復）
  const context = window.AppState?.atmosphereContext;
  if (context && context.order && context.order.length > 0 && context.index >= 0) {
    editorOriginalState = {
      entry: context.order[context.index],
      currentAtmosphere: window.AppState.currentAtmosphere
    };
  } else {
    editorOriginalState = {
      entry: null,
      currentAtmosphere: null
    };
  }

  // 只有在沒有當前聲色意境時才清除背景預覽
  // 如果有當前聲色意境，保留背景以便關閉編輯器時無縫恢復
  if (!currentAtmosphere) {
  clearBackgroundPreview();
  }

  // 檢查是否已存在編輯器
  let editor = document.getElementById('atmosphere-editor');
  if (editor) {
    editor.classList.add('visible');
    // 如果編輯器已存在，也需要重新載入數據（特別是預覽數據）
    if (currentAtmosphere) {
      // 等待音效選擇器初始化完成後再載入數據
      setTimeout(() => {
        loadAtmosphereData(currentAtmosphere).catch(error => {
          console.warn('載入聲色意境錄音資料時出現問題:', error);
        });
      }, 100);
    }
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
          <!-- 波形圖容器 -->
          <div class="recording-waveform-container">
            <div class="recording-waveform-wrapper">
              <div id="recording-waveform" class="recording-waveform"></div>
              <!-- 自定義拖動標記 -->
              <div class="recording-trim-overlay">
                <div class="recording-trim-selection" id="recording-trim-selection"></div>
                <div class="recording-trim-handle recording-trim-handle-start" id="recording-trim-handle-start">
                  <div class="recording-trim-handle-line"></div>
                  <div class="recording-trim-handle-dot"></div>
                </div>
                <div class="recording-trim-handle recording-trim-handle-end" id="recording-trim-handle-end">
                  <div class="recording-trim-handle-line"></div>
                  <div class="recording-trim-handle-dot"></div>
                </div>
              </div>
            </div>
            <div class="recording-time-info">
              <span id="recording-selected-time">已選取 0 秒</span>
              <span class="recording-time-separator">/</span>
              <span id="recording-total-time">總長度 0 秒</span>
            </div>
          </div>
          <label class="recording-name-label" for="recording-name-input">為錄音命名</label>
          <div class="recording-name-input-group">
            <input type="text" id="recording-name-input" class="editor-input" maxlength="50" placeholder="例如：松風入夜">
            <button type="button" id="recording-location-btn" class="recording-location-btn" aria-label="添加地點信息">
              <span class="recording-location-btn-text">📍 添加地點信息</span>
            </button>
          </div>
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
        <!-- 自定義配色展開區域 -->
        <div id="custom-color-picker" class="custom-color-picker" hidden>
          <div class="custom-color-row">
            <label class="custom-color-label">顏色 1</label>
            <div class="custom-color-input-group">
              <input type="color" id="custom-color-1" class="custom-color-input" value="#1A1A2E">
              <input type="text" id="custom-color-1-hex" class="custom-color-hex" value="#1A1A2E" maxlength="7" placeholder="#000000">
            </div>
          </div>
          <div class="custom-color-row">
            <label class="custom-color-label">顏色 2</label>
            <div class="custom-color-input-group">
              <input type="color" id="custom-color-2" class="custom-color-input" value="#16213E">
              <input type="text" id="custom-color-2-hex" class="custom-color-hex" value="#16213E" maxlength="7" placeholder="#000000">
            </div>
          </div>
          <div class="custom-color-row">
            <label class="custom-color-label">方向</label>
            <div class="custom-color-direction">
              <label class="custom-radio">
                <input type="radio" name="custom-direction" value="diagonal" checked>
                <span>對角</span>
              </label>
              <label class="custom-radio">
                <input type="radio" name="custom-direction" value="vertical">
                <span>垂直</span>
              </label>
            </div>
          </div>
          <div class="custom-color-preview" id="custom-color-preview"></div>
          <div class="custom-color-actions">
            <button type="button" class="editor-btn editor-btn-primary" id="custom-color-save">保存配色</button>
            <button type="button" class="editor-btn editor-btn-secondary" id="custom-color-cancel">取消</button>
          </div>
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
    
    // 如果是預覽模式，保留預覽效果（不恢復原始狀態）
    if (window.AppState?.isPreviewMode) {
      editor.classList.remove('visible');
      setTimeout(() => editor.remove(), 300);
      return;
    }
    
    // 檢查是否需要恢復原始狀態
    // 1. 用戶進行了新的編輯（hasEditorChanges === true）
    // 2. 或者頁面處於預覽狀態（previewAtmosphereData 存在）
    // 這兩種情況都需要恢復原始狀態
    const hasPreviewData = window.AppState?.previewAtmosphereData !== null && window.AppState?.previewAtmosphereData !== undefined;
    const shouldRestoreOriginal = hasEditorChanges || hasPreviewData;
    
    if (shouldRestoreOriginal && editorOriginalState) {
      // 需要恢復原始狀態
      const originalEntry = editorOriginalState.entry;
      
      // 清空編輯效果（停止音效，清除背景）
      if (window.AppState && window.AppState.soundMixer) {
        window.AppState.soundMixer.clear();
    }
      if (window.AppState && window.AppState.backgroundRenderer) {
      clearBackgroundPreview();
    }
      
      // 恢復原始狀態
      if (originalEntry && originalEntry.type !== 'placeholder' && window.applyAtmosphereEntry) {
        // 恢復原始的聲色意境
        window.applyAtmosphereEntry(originalEntry, { showStatus: true }).catch(error => {
          console.warn('恢復原始聲色意境失敗:', error);
        });
      } else if (!originalEntry || originalEntry.type === 'placeholder') {
        // 原來沒有聲色意境，保持清除狀態
        // 已經在上面清除了，不需要額外操作
      }
      
      // 清除預覽數據，因為已經恢復原始狀態了
      if (window.AppState) {
        window.AppState.previewAtmosphereData = null;
      }
    } else {
      // 用戶沒有進行編輯，且頁面不在預覽狀態，保持原狀（什麼都不做）
      // 因為編輯器打開時已經保持了原始狀態，所以關閉時不需要任何操作
    }
    
    // 重置編輯狀態追蹤
    hasEditorChanges = false;
    editorOriginalState = null;
    
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
      .select('id, display_name, storage_path, created_at, owner_id, status, location_name')
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
      const tags = [];
      
      // 如果有地點信息，添加到標籤
      if (record.location_name && record.location_name.trim()) {
        tags.push(record.location_name.trim());
      }
      
      // 如果狀態不是已批准，添加待審核標籤
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
        recordingStatus: record.status || 'approved',
        location_name: record.location_name || null
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
    waveformContainer: document.getElementById('recording-waveform'),
    selectedTimeEl: document.getElementById('recording-selected-time'),
    totalTimeEl: document.getElementById('recording-total-time'),
    nameInput: document.getElementById('recording-name-input'),
    locationBtn: document.getElementById('recording-location-btn'),
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

  // 初始化地點按鈕
  const { locationBtn } = getRecordingElements();
  if (locationBtn) {
    locationBtn.addEventListener('click', handleLocationButtonClick);
    updateLocationButton();
  }
}

function resetRecordingUI() {
  const {
    toggleBtn,
    statusEl,
    panel,
    waveformContainer,
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

  // 清理波形圖
  cleanupWaveform();

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
  
  // 重置地點
  currentRecordingLocation = null;
  updateLocationButton();
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

/**
 * 獲取當前地理位置
 * @returns {Promise<{lat: number, lon: number}>}
 */
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('此瀏覽器不支援地理位置功能'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        // 靜默失敗，不顯示錯誤
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * 使用 Nominatim API 進行逆地理編碼
 * @param {number} lat - 緯度
 * @param {number} lon - 經度
 * @returns {Promise<string>} 地點名稱
 */
async function reverseGeocode(lat, lon) {
  try {
    // Nominatim API 端點
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=zh-TW`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Kongshan-App/1.0' // Nominatim 要求設置 User-Agent
      }
    });

    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('無法解析地點信息');
    }

    // 提取地點名稱的策略
    // 1. 優先使用 name 字段（如果包含地標名稱）
    if (data.name && data.name.trim()) {
      const name = data.name.trim();
      // 如果 name 看起來像地標（不包含太多地址信息），直接使用
      if (!name.match(/^\d+/) && name.length < 50) {
        return name;
      }
    }

    // 2. 從 address 對象中提取最相關的部分
    const address = data.address;
    
    // 優先選擇地標、山名、公園名稱等
    const priorityFields = [
      'mountain', 'peak', 'hill', // 山
      'park', 'reserve', 'forest', // 公園、保護區、森林
      'attraction', 'monument', 'memorial', // 景點、紀念碑
      'place', 'locality', 'neighbourhood' // 地點、區域
    ];

    for (const field of priorityFields) {
      if (address[field] && address[field].trim()) {
        return address[field].trim();
      }
    }

    // 3. 如果沒有找到優先字段，組合城市和區域
    const parts = [];
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.suburb || address.district) {
      parts.push(address.suburb || address.district);
    }
    
    if (parts.length > 0) {
      return parts.join(' ');
    }

    // 4. 最後備選：使用 display_name 的第一部分
    if (data.display_name) {
      const parts = data.display_name.split(',');
      if (parts.length > 0) {
        return parts[0].trim();
      }
    }

    throw new Error('無法提取有效的地點名稱');
  } catch (error) {
    console.warn('逆地理編碼失敗:', error);
    throw error;
  }
}

/**
 * 更新地點按鈕的顯示狀態
 */
function updateLocationButton() {
  const { locationBtn } = getRecordingElements();
  if (!locationBtn) {
    return;
  }

  const textEl = locationBtn.querySelector('.recording-location-btn-text');
  if (!textEl) {
    return;
  }

  if (currentRecordingLocation) {
    // 有地點：顯示「✓ [地點名稱]」
    locationBtn.classList.add('has-location');
    locationBtn.disabled = false;
    const displayText = `✓ ${currentRecordingLocation}`;
    textEl.textContent = displayText;
    locationBtn.title = currentRecordingLocation; // tooltip 顯示完整名稱
  } else {
    // 無地點：顯示「📍 添加地點信息」
    locationBtn.classList.remove('has-location');
    locationBtn.disabled = false;
    textEl.textContent = '📍 添加地點信息';
    locationBtn.title = '點擊添加當前地理位置';
  }
}

/**
 * 處理地點按鈕點擊
 */
async function handleLocationButtonClick() {
  const { locationBtn } = getRecordingElements();
  if (!locationBtn) {
    return;
  }

  // 如果已經有地點，點擊則移除
  if (currentRecordingLocation) {
    currentRecordingLocation = null;
    updateLocationButton();
    return;
  }

  // 開始獲取地點
  const textEl = locationBtn.querySelector('.recording-location-btn-text');
  if (textEl) {
    textEl.textContent = '📍 正在獲取地點...';
  }
  locationBtn.disabled = true;

  try {
    // 1. 獲取地理位置
    const { lat, lon } = await getCurrentLocation();
    
    // 2. 進行逆地理編碼
    const locationName = await reverseGeocode(lat, lon);
    
    // 3. 保存地點名稱
    currentRecordingLocation = locationName;
    updateLocationButton();
  } catch (error) {
    // 靜默失敗，恢復到初始狀態
    currentRecordingLocation = null;
    updateLocationButton();
  }
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

/**
 * 格式化時間顯示（秒數轉為 MM:SS）
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 初始化波形圖
 */
async function initializeWaveform(audioUrl, duration) {
  const { waveformContainer } = getRecordingElements();
  if (!waveformContainer || typeof WaveSurfer === 'undefined') {
    throw new Error('WaveSurfer.js 未載入');
  }

  // 清理舊的波形圖實例
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
  }

  // 計算波形圖的採樣精度（每 100ms 一個點）
  const samples = Math.ceil(duration * 10); // duration * 10 = 每 100ms 一個點

  // 創建 WaveSurfer 實例
  wavesurfer = WaveSurfer.create({
    container: waveformContainer,
    waveColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text-tertiary').trim() || '#7a8574',
    progressColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#789262',
    cursorColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#789262',
    barWidth: 2,
    barRadius: 1,
    barGap: 1,
    height: 80,
    normalize: true,
    interact: true,
    backend: 'WebAudio',
    mediaControls: false
  });

  // 載入音頻
  await wavesurfer.load(audioUrl);

  // 初始化自定義拖動標記系統
  const totalDuration = wavesurfer.getDuration();
  initializeCustomTrimHandles(wavesurfer, totalDuration);

  // 點擊波形圖播放/暫停
  wavesurfer.on('click', () => {
    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
    } else {
      playTrimmedPreview();
    }
  });

  // 更新時間顯示
  updateTimeDisplay();
}

/**
 * 初始化自定義拖動標記系統
 */
function initializeCustomTrimHandles(wavesurferInstance, totalDuration) {
  const startHandle = document.getElementById('recording-trim-handle-start');
  const endHandle = document.getElementById('recording-trim-handle-end');
  const selection = document.getElementById('recording-trim-selection');
  const wrapper = document.querySelector('.recording-waveform-wrapper');
  
  if (!startHandle || !endHandle || !selection || !wrapper) {
    console.error('無法找到拖動標記元素');
    return;
  }

  // 初始化範圍：默認選中整個錄音（從開頭到結尾）
  let startTime = 0;
  let endTime = totalDuration;
  
  trimStartRegion = { start: startTime, end: startTime };
  trimEndRegion = { start: endTime, end: endTime };

  // 更新標記位置
  const updateHandles = () => {
    const wrapperWidth = wrapper.offsetWidth;
    const startPercent = (startTime / totalDuration) * 100;
    const endPercent = (endTime / totalDuration) * 100;
    
    startHandle.style.left = `${startPercent}%`;
    endHandle.style.left = `${endPercent}%`;
    selection.style.left = `${startPercent}%`;
    selection.style.width = `${endPercent - startPercent}%`;
    
    // 更新時間顯示
    updateTimeDisplay();
  };

  // 拖動處理
  let isDragging = null;
  let dragStartX = 0;
  let dragStartTime = 0;

  const startDrag = (handle, initialTime) => {
    isDragging = handle;
    dragStartTime = initialTime;
    
    // 添加拖動視覺反饋
    if (handle === 'start') {
      startHandle.classList.add('dragging');
    } else {
      endHandle.classList.add('dragging');
    }
  };

  const onDrag = (clientX) => {
    if (!isDragging || !wrapper) return;
    
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperWidth = wrapperRect.width;
    const x = clientX - wrapperRect.left;
    const percent = Math.max(0, Math.min(100, (x / wrapperWidth) * 100));
    const newTime = (percent / 100) * totalDuration;
    
    if (isDragging === 'start') {
      const maxTime = endTime - MIN_TRIM_DURATION;
      startTime = Math.max(0, Math.min(maxTime, newTime));
      trimStartRegion.start = startTime;
    } else if (isDragging === 'end') {
      const minTime = startTime + MIN_TRIM_DURATION;
      endTime = Math.min(totalDuration, Math.max(minTime, newTime));
      trimEndRegion.end = endTime;
    }
    
    updateHandles();
  };

  const endDrag = () => {
    if (isDragging) {
      // 移除拖動視覺反饋
      startHandle.classList.remove('dragging');
      endHandle.classList.remove('dragging');
      
      // 停止拖動後預覽
      if (previewDebounceTimer) {
        clearTimeout(previewDebounceTimer);
      }
      previewDebounceTimer = setTimeout(() => {
        playTrimmedPreview();
      }, 300);
    }
    isDragging = null;
  };

  // 綁定事件
  startHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag('start', startTime);
  });
  
  endHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag('end', endTime);
  });

  // 觸摸事件支持
  startHandle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrag('start', startTime);
    dragStartX = touch.clientX;
  });
  
  endHandle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrag('end', endTime);
    dragStartX = touch.clientX;
  });

  // 全局拖動事件
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      onDrag(e.clientX);
    }
  });

  document.addEventListener('mouseup', () => {
    endDrag();
  });

  document.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length > 0) {
      e.preventDefault();
      onDrag(e.touches[0].clientX);
    }
  });

  document.addEventListener('touchend', () => {
    endDrag();
  });

  // 初始更新
  updateHandles();
  
  // 觸發動畫提示（錄音完成後提示用戶可以拖動）
  startHandle.classList.add('animate-hint');
  endHandle.classList.add('animate-hint');
  
  // 3.5 秒後移除動畫類（動畫結束後）
  setTimeout(() => {
    startHandle.classList.remove('animate-hint');
    endHandle.classList.remove('animate-hint');
  }, 3500);
  
  // 監聽波形圖容器大小變化
  const resizeObserver = new ResizeObserver(() => {
    updateHandles();
  });
  resizeObserver.observe(wrapper);
}

/**
 * 更新時間顯示
 */
function updateTimeDisplay() {
  const { selectedTimeEl, totalTimeEl } = getRecordingElements();
  if (!trimStartRegion || !trimEndRegion || !wavesurfer) return;

  const startTime = trimStartRegion.start || 0;
  const endTime = trimEndRegion.end || wavesurfer.getDuration();
  const selectedDuration = endTime - startTime;
  const totalDuration = wavesurfer.getDuration();

  if (selectedTimeEl) {
    selectedTimeEl.textContent = `已選取 ${formatTime(selectedDuration)}`;
  }
  if (totalTimeEl) {
    totalTimeEl.textContent = `總長度 ${formatTime(totalDuration)}`;
  }
}

/**
 * 播放剪切後的預覽
 */
async function playTrimmedPreview() {
  if (!trimStartRegion || !trimEndRegion || !wavesurfer || !currentRecordingBlob) return;

  const startTime = trimStartRegion.start || 0;
  const endTime = trimEndRegion.end || wavesurfer.getDuration();

  // 清除之前的播放和監聽器
  if (wavesurfer.isPlaying()) {
    wavesurfer.pause();
  }
  
  // 清除之前的 timeout
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  
  // 移除之前的事件監聽器
  if (previewTimeUpdateHandler && wavesurfer) {
    wavesurfer.un('timeupdate', previewTimeUpdateHandler);
    previewTimeUpdateHandler = null;
  }

  // 設置播放範圍
  const totalDuration = wavesurfer.getDuration();
  wavesurfer.seekTo(startTime / totalDuration);
  
  try {
    await wavesurfer.play();
    
    // 計算播放時長
    const duration = endTime - startTime;
    
    // 方法 1: 使用 timeupdate 事件監聽（主要方法）
    previewTimeUpdateHandler = () => {
      const currentTime = wavesurfer.getCurrentTime();
      if (currentTime >= endTime) {
        wavesurfer.pause();
        // 清理監聽器
        if (previewTimeUpdateHandler) {
          wavesurfer.un('timeupdate', previewTimeUpdateHandler);
          previewTimeUpdateHandler = null;
        }
        if (previewTimeout) {
          clearTimeout(previewTimeout);
          previewTimeout = null;
        }
      }
    };
    
    wavesurfer.on('timeupdate', previewTimeUpdateHandler);
    
    // 方法 2: 設置 timeout 作為備份（防止事件未觸發）
    // 添加 100ms 緩衝時間，考慮播放延遲
    previewTimeout = setTimeout(() => {
      if (wavesurfer && wavesurfer.isPlaying()) {
        const currentTime = wavesurfer.getCurrentTime();
        if (currentTime >= endTime - 0.1) { // 允許 0.1 秒誤差
          wavesurfer.pause();
        }
      }
      // 清理監聽器
      if (previewTimeUpdateHandler) {
        wavesurfer.un('timeupdate', previewTimeUpdateHandler);
        previewTimeUpdateHandler = null;
      }
      previewTimeout = null;
    }, (duration + 0.2) * 1000); // 添加 200ms 緩衝
    
  } catch (error) {
    console.error('播放預覽失敗:', error);
    // 清理資源
    if (previewTimeUpdateHandler) {
      wavesurfer.un('timeupdate', previewTimeUpdateHandler);
      previewTimeUpdateHandler = null;
    }
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      previewTimeout = null;
    }
  }
}

/**
 * 清理波形圖資源
 */
function cleanupWaveform() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
  }

  // 清除預覽播放的 timeout
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  
  // 移除預覽播放的事件監聽器
  if (previewTimeUpdateHandler && wavesurfer) {
    try {
      wavesurfer.un('timeupdate', previewTimeUpdateHandler);
    } catch (error) {
      console.warn('移除時間更新監聽器失敗:', error);
    }
    previewTimeUpdateHandler = null;
  }

  if (wavesurfer) {
    try {
      // 停止播放
      if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
      }
      wavesurfer.destroy();
    } catch (error) {
      console.warn('清理波形圖時發生錯誤:', error);
    }
    wavesurfer = null;
  }

  trimStartRegion = null;
  trimEndRegion = null;

  if (previewAudioContext) {
    try {
      previewAudioContext.close();
    } catch (error) {
      console.warn('關閉音頻上下文時發生錯誤:', error);
    }
    previewAudioContext = null;
  }
  previewAudioSource = null;
}

/**
 * 剪切音頻（根據選中的區域）
 */
async function trimAudio(blob, startTime, endTime) {
  if (!blob || startTime < 0 || endTime <= startTime) {
    return blob;
  }

  try {
    // 創建音頻上下文
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 計算要提取的樣本範圍
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const length = endSample - startSample;

    // 創建新的音頻緩衝區
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    );

    // 複製選中的音頻數據
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const trimmedData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        trimmedData[i] = channelData[startSample + i];
      }
    }

    // 將 AudioBuffer 轉換為 WAV Blob
    const wavBlob = audioBufferToWav(trimmedBuffer);
    
    // 關閉音頻上下文
    await audioContext.close();

    // 如果原始格式不是 WAV，需要轉換
    if (blob.type && !blob.type.includes('wav')) {
      // 使用 MediaRecorder 重新編碼為原始格式
      return await encodeAudioBlob(wavBlob, blob.type);
    }

    return wavBlob;
  } catch (error) {
    console.error('剪切音頻失敗:', error);
    // 如果剪切失敗，返回原始 blob
    return blob;
  }
}

/**
 * 將 AudioBuffer 轉換為 WAV Blob
 */
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV 文件頭
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);

  // 寫入音頻數據
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * 使用 MediaRecorder 重新編碼音頻
 */
async function encodeAudioBlob(wavBlob, targetMimeType) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const audioUrl = URL.createObjectURL(wavBlob);
    audio.src = audioUrl;

    audio.onloadeddata = () => {
      const mediaRecorder = new MediaRecorder(audio.captureStream(), {
        mimeType: targetMimeType
      });
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        URL.revokeObjectURL(audioUrl);
        const blob = new Blob(chunks, { type: targetMimeType });
        resolve(blob);
      };

      mediaRecorder.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      mediaRecorder.start();
      audio.play();

      audio.onended = () => {
        mediaRecorder.stop();
      };
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };
  });
}

async function handleRecordingStop() {
  const {
    panel,
    waveformContainer,
    selectedTimeEl,
    totalTimeEl,
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

  // 初始化波形圖
  if (waveformContainer && currentRecordingUrl) {
    try {
      await initializeWaveform(currentRecordingUrl, currentRecordingDuration);
      if (totalTimeEl) {
        totalTimeEl.textContent = `總長度 ${formatTime(currentRecordingDuration)}`;
      }
      if (selectedTimeEl) {
        selectedTimeEl.textContent = `已選取 ${formatTime(currentRecordingDuration)}`;
      }
    } catch (error) {
      console.error('初始化波形圖失敗:', error);
      if (statusEl) {
        statusEl.textContent = '波形圖載入失敗，但錄音已保存。';
        statusEl.classList.add('recording-status-error');
      }
    }
  }

  if (cancelBtn) {
    cancelBtn.disabled = false;
  }

  if (saveBtn) {
    saveBtn.disabled = !(nameInput && nameInput.value.trim());
  }

  if (statusEl) {
    statusEl.textContent = '錄音完成，請調整剪切範圍後命名保存。';
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

  // 獲取剪切範圍
  let trimmedBlob = currentRecordingBlob;
  let trimmedDuration = currentRecordingDuration;
  
  if (trimStartRegion && trimEndRegion && wavesurfer) {
    // 獲取開始和結束時間（自定義標記）
    const startTime = trimStartRegion.start || 0;
    const endTime = trimEndRegion.end || wavesurfer.getDuration();
    
    trimmedDuration = endTime - startTime;
    
    // 如果用戶調整了剪切範圍，進行音頻剪切
    if (startTime > 0 || endTime < wavesurfer.getDuration()) {
      trimmedBlob = await trimAudio(currentRecordingBlob, startTime, endTime);
    }
  }

  const rawMimeType = currentRecordingMimeType || trimmedBlob.type || getFallbackMimeType();
  const normalizedMimeType = normalizeRecordingMimeType(rawMimeType);
  const extension = inferFileExtension(normalizedMimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeBaseName = buildSafeStorageFileBase(displayName);
  const finalFileName = `${safeBaseName}_${timestamp}.${extension}`;
  const storagePath = `pending/${userId}/${finalFileName}`;
  const uploadBlob = createUploadBlob(trimmedBlob, normalizedMimeType);

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
      duration_seconds: Math.round(trimmedDuration),
      status: 'pending',
      location_name: currentRecordingLocation || null
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
    status: insertData.status || 'pending',
    location_name: insertData.location_name || null
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
    saveBtn,
    cancelBtn
  } = getRecordingElements();

  setRecordingButtonState(false);

  if (panel) {
    panel.hidden = true;
  }

  // 清理波形圖
  cleanupWaveform();

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
let isAutoPreviewRunning = false; // 防止多個實例同時執行

// 編輯狀態追蹤
let editorOriginalState = null; // 保存編輯器打開時的原始狀態
let hasEditorChanges = false; // 追蹤是否有編輯操作

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
    isAutoPreviewRunning = false;
    return;
  }

  // 如果已經有實例在執行，取消本次執行
  if (isAutoPreviewRunning) {
    console.log('自動預覽已在執行中，跳過本次調用');
    return;
  }

  autoPreviewTimer = null;
  isAutoPreviewRunning = true;

  try {
    const soundMixer = window.AppState.soundMixer;
    const selectedItems = Array.from(document.querySelectorAll('.selected-sound-item'));

    // 清空既有音效，確保等待完成
    await soundMixer.clear();

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
  } finally {
    // 確保標誌被重置
    isAutoPreviewRunning = false;
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
    // 立即停止對應音效，避免等待定時器
    if (window.AppState && window.AppState.soundMixer) {
      const soundMixer = window.AppState.soundMixer;
      const soundId = sound.id;
      // 如果該音效正在播放，立即停止
      // 直接檢查 tracks Map，因為它是公開的
      if (soundMixer.tracks && soundMixer.tracks.has(soundId)) {
        soundMixer.removeTrack(soundId);
      }
    }
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

  // 標記為有編輯操作
  hasEditorChanges = true;

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
      // 標記為有編輯操作
      hasEditorChanges = true;
    });
  }

  // 綁定移除按鈕
  const removeBtn = item.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => {
    // 立即停止對應音效
    if (window.AppState && window.AppState.soundMixer) {
      const soundMixer = window.AppState.soundMixer;
      const soundId = sound.id;
      // 如果該音效正在播放，立即停止
      // 直接檢查 tracks Map，因為它是公開的
      if (soundMixer.tracks && soundMixer.tracks.has(soundId)) {
        soundMixer.removeTrack(soundId);
      }
    }
    item.remove();
    const soundCard = document.querySelector(`.sound-card[data-sound-id="${sound.id}"]`);
    if (soundCard) soundCard.classList.remove('selected');
    // 標記為有編輯操作
    hasEditorChanges = true;
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
  'bamboo': '#FFFFFF',   // 竹林：白色文字
  'winter-snow': '#2C3E50',     // 冬雪：深色文字
  'plum-blossom': '#2C3E50',   // 梅花：深色文字
  'moonlight-night': '#FFFFFF', // 月夜：白色文字（已棄用，改為星夜）
  'starry-night': '#FFFFFF', // 星夜：白色文字
  'green-mountain': '#FFFFFF',  // 青山：白色文字
  'cloud-mist': '#2C3E50',     // 雲霧：深色文字
  'falling-flowers': '#2C3E50', // 落花：深色文字
  'lantern-valley': '#FFFFFF',  // 元宵：白色文字
  'rainfall': '#FFFFFF'         // 雨幕：白色文字
};

/**
 * 獲取當前文字顏色（從 CSS 變量或計算值）
 */
function getCurrentTextColor() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const currentColor = computedStyle.getPropertyValue('--poem-text-color').trim();
  
  // 如果是 CSS 變量，嘗試解析
  if (currentColor.startsWith('var(')) {
    // 嘗試獲取實際值
    const tempEl = document.createElement('div');
    tempEl.style.color = currentColor;
    document.body.appendChild(tempEl);
    const actualColor = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    
    // 將 rgb() 轉換為十六進制
    const rgbMatch = actualColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
    return '#2C3E50'; // 默認值
  }
  
  // 如果已經是十六進制顏色，直接返回
  if (currentColor.startsWith('#')) {
    return currentColor;
  }
  
  return '#2C3E50'; // 默認值
}

/**
 * 將十六進制顏色轉換為 RGB 對象
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 44, g: 62, b: 80 }; // 默認 #2C3E50
}

/**
 * 將 RGB 對象轉換為十六進制顏色
 */
function rgbToHex(rgb) {
  const r = Math.round(rgb.r).toString(16).padStart(2, '0');
  const g = Math.round(rgb.g).toString(16).padStart(2, '0');
  const b = Math.round(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * 在兩個顏色之間插值
 */
function interpolateColor(color1, color2, t) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const rgb = {
    r: rgb1.r + (rgb2.r - rgb1.r) * t,
    g: rgb1.g + (rgb2.g - rgb1.g) * t,
    b: rgb1.b + (rgb2.b - rgb1.b) * t
  };
  
  return rgbToHex(rgb);
}

/**
 * 根據背景配置獲取目標文字顏色
 */
function getTargetTextColor(backgroundConfig) {
  if (!backgroundConfig || !backgroundConfig.color_scheme || !backgroundConfig.color_scheme.colors) {
    // 沒有背景配置，使用系統默認
    return '#2C3E50';
  }

  const bgId = backgroundConfig.color_scheme.id;
  const colors = backgroundConfig.color_scheme.colors;
  
  // 如果是自定義配色（沒有 id 或 id 以 custom- 開頭），根據亮度自動判斷
  if (!bgId || bgId.startsWith('custom-')) {
    // 計算平均亮度
    function getLuminance(hex) {
      const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!rgb) return 0;
      
      const r = parseInt(rgb[1], 16) / 255;
      const g = parseInt(rgb[2], 16) / 255;
      const b = parseInt(rgb[3], 16) / 255;
      
      // 使用相對亮度公式
      const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    }

    const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length;
    return avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF';
  }
  
  // 預設配色：使用映射表
  const textColor = backgroundTextColorMap[bgId];
  return textColor || '#2C3E50';
}

/**
 * 應用文字顏色（帶過渡）
 * @param {string} targetColor - 目標顏色（十六進制）
 * @param {number} duration - 過渡時長（毫秒）
 */
function applyTextColorWithTransition(targetColor, duration = 600) {
  const root = document.documentElement;
  const currentColor = getCurrentTextColor();
  
  // 如果顏色相同，直接設置
  if (currentColor.toUpperCase() === targetColor.toUpperCase()) {
    root.style.setProperty('--poem-text-color', targetColor);
    root.style.setProperty('--poem-glow-color', targetColor);
    root.style.setProperty('--poem-meta-color', targetColor);
    updatePoemTextGlow(targetColor);
    return Promise.resolve();
  }
  
  // 設置 CSS transition
  root.style.setProperty('--poem-text-color-transition', `${duration}ms ease-in-out`);
  root.style.setProperty('--poem-glow-color-transition', `${duration}ms ease-in-out`);
  root.style.setProperty('--poem-meta-color-transition', `${duration}ms ease-in-out`);
  
  // 開始過渡動畫
  return new Promise((resolve) => {
    const startTime = performance.now();
    const startColor = hexToRgb(currentColor);
    const endColor = hexToRgb(targetColor);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用緩動函數（ease-in-out）
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // 計算中間顏色
      const interpolatedRgb = {
        r: startColor.r + (endColor.r - startColor.r) * easedProgress,
        g: startColor.g + (endColor.g - startColor.g) * easedProgress,
        b: startColor.b + (endColor.b - startColor.b) * easedProgress
      };
      
      const interpolatedColor = rgbToHex(interpolatedRgb);
      
      // 更新顏色
      root.style.setProperty('--poem-text-color', interpolatedColor);
      root.style.setProperty('--poem-glow-color', interpolatedColor);
      root.style.setProperty('--poem-meta-color', interpolatedColor);
      
      // 更新發光效果
      updatePoemTextGlow(interpolatedColor);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 過渡完成，設置最終顏色
        root.style.setProperty('--poem-text-color', targetColor);
        root.style.setProperty('--poem-glow-color', targetColor);
        root.style.setProperty('--poem-meta-color', targetColor);
        updatePoemTextGlow(targetColor);
        
        // 清除 transition（避免影響後續的非過渡設置）
        root.style.removeProperty('--poem-text-color-transition');
        root.style.removeProperty('--poem-glow-color-transition');
        root.style.removeProperty('--poem-meta-color-transition');
        
        resolve();
      }
    };
    
    requestAnimationFrame(animate);
  });
}

/**
 * 應用背景對應的文字顏色
 * @param {object} backgroundConfig - 背景配置對象
 * @param {number} duration - 過渡時長（毫秒），0 表示無過渡
 */
function applyBackgroundTextColor(backgroundConfig, duration = 0) {
  const targetColor = getTargetTextColor(backgroundConfig);
  
  if (duration > 0) {
    // 使用過渡
    return applyTextColorWithTransition(targetColor, duration);
  } else {
    // 直接設置（無過渡）
    const root = document.documentElement;
    root.style.setProperty('--poem-text-color', targetColor);
    root.style.setProperty('--poem-glow-color', targetColor);
    root.style.setProperty('--poem-meta-color', targetColor);
    updatePoemTextGlow(targetColor);
    return Promise.resolve();
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
    { id: 'bamboo', name: '竹林', colors: ['#2D5016', '#4A7C2E'] },
    { id: 'winter-snow', name: '冬雪', colors: ['#F5F5F5', '#E0E0E0'] },
    { id: 'plum-blossom', name: '梅花', colors: ['#FFF3E0', '#FFE0B2'] },
    { id: 'starry-night', name: '星夜', colors: ['#070825', '#0A0D2E'] },
    { id: 'rotating-stars', name: '旋轉星空', colors: ['#000000', '#0A0D2E'] },
    { id: 'twinkling-stars', name: '靜夜星空', colors: ['#02040d', '#0a1230'] },
    { id: 'lantern-valley', name: '元宵', colors: ['#1A0F1F', '#3A1F36'] },
    { id: 'rainfall', name: '雨幕', colors: ['#0B132B', '#1F3558'] },
    { id: 'green-mountain', name: '青山', colors: ['#4A7C2E', '#6B8E23'] },
    { id: 'cloud-mist', name: '雲霧', colors: ['#ECEFF1', '#CFD8DC'] },
    { id: 'falling-flowers', name: '落花', colors: ['#FFE5E8', '#FFCCD0'] }
  ];

  container.innerHTML = '';
  
  // 首先添加「+ 自定義」卡片
  const customCard = createCustomColorCard();
  container.appendChild(customCard);
  
  // 然後添加預設配色
  backgrounds.forEach(bg => {
    const bgCard = createBackgroundCard(bg);
    container.appendChild(bgCard);
  });

  // 初始化顏色選擇器事件
  initializeCustomColorPicker();

  // 不設置默認選擇，讓用戶自己選擇
}

/**
 * 立即應用背景配置（編輯器預覽模式）
 * @param {string} bgId - 背景配色 ID
 */
function applyBackgroundPreview(bgId) {
  if (!window.AppState || !window.AppState.backgroundRenderer) {
    return;
  }

  // 標記為有編輯操作
  hasEditorChanges = true;

  // 背景配色方案映射（包含粒子動畫配置）
  const backgroundSchemes = {
    'night': { 
      colors: ['#1A1A2E', '#16213E'], 
      direction: 'diagonal',
      particle_animation: {
        type: 'threejs',
        preset: 'stardust',
        config: {}
      }
    },
    'dawn': { colors: ['#FFE5B4', '#FFDAB9'], direction: 'vertical' },
    'autumn': { 
      colors: ['#2F4F4F', '#708090'], 
      direction: 'vertical',
      particle_animation: {
        type: 'threejs',
        preset: 'falling-leaves',
        config: {}
      }
    },
    'spring': { colors: ['#E8F4F8', '#D4E8F0'], direction: 'diagonal' },
    'sunset': { colors: ['#FF6B6B', '#FFA07A'], direction: 'diagonal' },
    'bamboo': { colors: ['#2D5016', '#4A7C2E'], direction: 'diagonal' },
    'winter-snow': { 
      colors: ['#F5F5F5', '#E0E0E0'], 
      direction: 'diagonal',
      particle_animation: {
        type: 'particlesjs',
        preset: 'snowflakes',
        config: {}
      }
    },
    'plum-blossom': { colors: ['#FFF3E0', '#FFE0B2'], direction: 'diagonal' },
    'starry-night': { 
      colors: ['#070825', '#0A0D2E'], 
      direction: 'diagonal',
      particle_animation: {
        type: 'particlesjs',
        preset: 'codepen-stars',
        config: {}
      }
    },
    'rotating-stars': {
      colors: ['#000000', '#0A0D2E'],
      direction: 'diagonal',
      particle_animation: {
        type: 'particlesjs',
        preset: 'rotating-stars',
        config: {
          hue: 217,
          maxStars: undefined // 使用默認值（移動設備 600，桌面 1400）
        }
      }
    },
        'twinkling-stars': {
          colors: ['#02040d', '#050b1f', '#0e1839'],
          direction: 'diagonal',
          particle_animation: {
            type: 'canvas',
            preset: 'twinkling-stars',
            config: {
              maxStars: undefined, // 使用預設（移動端較少，桌面較多）
              backgroundColor: '#030510',
              backgroundAlpha: 0.82,
              starIntensity: 1.2,
              starSizeMultiplier: 1.08,
              brightnessRange: [0.35, 0.95],
              twinkleSpeedRange: [0.006, 0.02],
              sparkleChance: 0.03,
              sparkleBoost: 0.22,
              starColorPalette: ['#fefefe', '#cfe8ff', '#ffe7c4', '#ffd2c2', '#c7d8ff']
            }
          }
        },
    'lantern-valley': {
      colors: ['#120C1C', '#2D1B3D', '#3A283B'],
      direction: 'vertical',
      particle_animation: {
        type: 'particlesjs',
        preset: 'lantern-glow',
        config: {}
      }
    },
    'rainfall': {
      colors: ['#0b132b', '#1b263b', '#415a77'],
      direction: 'vertical',
      particle_animation: {
        type: 'particlesjs',
        preset: 'rainfall',
        config: {}
      }
    },
    'green-mountain': { colors: ['#4A7C2E', '#6B8E23'], direction: 'diagonal' },
    'cloud-mist': { colors: ['#ECEFF1', '#CFD8DC'], direction: 'diagonal' },
    'falling-flowers': { 
      colors: ['#FFE5E8', '#FFCCD0'], 
      direction: 'diagonal',
      particle_animation: {
        type: 'threejs',
        preset: 'falling-petals',
        config: {}
      }
    }
  };

  const bgScheme = backgroundSchemes[bgId];
  if (!bgScheme) {
    return;
  }

  const backgroundConfig = {
    color_scheme: {
      id: bgId,
      colors: bgScheme.colors,
      direction: bgScheme.direction
    },
    abstract_elements: []
  };
  
  // 添加粒子動畫配置（如果存在）
  if (bgScheme.particle_animation) {
    backgroundConfig.particle_animation = bgScheme.particle_animation;
  }

  try {
    const { backgroundRenderer } = window.AppState;
    if (typeof backgroundRenderer.setConfig === 'function') {
      backgroundRenderer.setConfig(backgroundConfig);
      // 應用對應的文字顏色
      applyBackgroundTextColor(backgroundConfig);
    }
  } catch (error) {
    console.warn('應用背景預覽失敗:', error);
  }
}

/**
 * 清除背景預覽（恢復默認）
 */
function clearBackgroundPreview() {
  if (!window.AppState || !window.AppState.backgroundRenderer) {
    return;
  }

  try {
    const { backgroundRenderer } = window.AppState;
    if (typeof backgroundRenderer.clear === 'function') {
      backgroundRenderer.clear();
    }
    // 恢復默認文字顏色
    applyBackgroundTextColor(null);
  } catch (error) {
    console.warn('清除背景預覽失敗:', error);
  }
}

/**
 * 創建「+ 自定義」卡片
 */
function createCustomColorCard() {
  const card = document.createElement('div');
  card.className = 'background-card background-card-custom';
  card.dataset.bgId = 'custom';

  card.innerHTML = `
    <div class="background-preview" style="background: linear-gradient(135deg, var(--color-surface-soft) 0%, var(--color-surface-raised) 100%); border: 2px dashed var(--color-border-soft); display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 1.5rem; color: var(--color-text-secondary);">+</span>
    </div>
    <div class="background-name">自定義</div>
  `;

  card.addEventListener('click', () => {
    // 顯示顏色選擇器
    const picker = document.getElementById('custom-color-picker');
    if (picker) {
      picker.hidden = false;
      picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      updateCustomColorPreview();
    }
  });

  return card;
}

/**
 * 創建背景卡片
 */
function createBackgroundCard(background) {
  const card = document.createElement('div');
  card.className = 'background-card';
  
  // 自定義配色使用臨時 ID，格式：custom-{timestamp}
  if (background.isCustom) {
    card.dataset.bgId = background.id || `custom-${Date.now()}`;
    card.dataset.isCustom = 'true';
    card.dataset.customColors = JSON.stringify(background.colors);
    card.dataset.customDirection = background.direction || 'diagonal';
  } else {
  card.dataset.bgId = background.id;
  }

  card.innerHTML = `
    <div class="background-preview" style="background: linear-gradient(135deg, ${background.colors[0]} 0%, ${background.colors[1]} 100%);"></div>
    <div class="background-name">${background.name}</div>
  `;

  card.addEventListener('click', () => {
    // 隱藏顏色選擇器
    const picker = document.getElementById('custom-color-picker');
    if (picker) {
      picker.hidden = true;
    }
    
    document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    // 立即應用背景預覽
    if (background.isCustom) {
      applyCustomBackgroundPreview(background.colors, background.direction || 'diagonal');
    } else {
    applyBackgroundPreview(background.id);
    }
  });

  return card;
}

/**
 * 初始化自定義顏色選擇器
 */
function initializeCustomColorPicker() {
  const color1Input = document.getElementById('custom-color-1');
  const color1Hex = document.getElementById('custom-color-1-hex');
  const color2Input = document.getElementById('custom-color-2');
  const color2Hex = document.getElementById('custom-color-2-hex');
  const saveBtn = document.getElementById('custom-color-save');
  const cancelBtn = document.getElementById('custom-color-cancel');
  const picker = document.getElementById('custom-color-picker');

  if (!color1Input || !color1Hex || !color2Input || !color2Hex || !saveBtn || !cancelBtn) {
    return;
  }

  // 顏色選擇器與 HEX 輸入框雙向同步
  function syncColor1() {
    const value = color1Input.value.toUpperCase();
    color1Hex.value = value;
    updateCustomColorPreview();
  }

  function syncColor1FromHex() {
    const hexValue = color1Hex.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      color1Input.value = hexValue.toUpperCase();
      updateCustomColorPreview();
    }
  }

  function syncColor2() {
    const value = color2Input.value.toUpperCase();
    color2Hex.value = value;
    updateCustomColorPreview();
  }

  function syncColor2FromHex() {
    const hexValue = color2Hex.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      color2Input.value = hexValue.toUpperCase();
      updateCustomColorPreview();
    }
  }

  color1Input.addEventListener('input', syncColor1);
  color1Hex.addEventListener('input', syncColor1FromHex);
  color1Hex.addEventListener('blur', syncColor1FromHex);
  
  color2Input.addEventListener('input', syncColor2);
  color2Hex.addEventListener('input', syncColor2FromHex);
  color2Hex.addEventListener('blur', syncColor2FromHex);

  // 方向選擇器變化時更新預覽
  document.querySelectorAll('input[name="custom-direction"]').forEach(radio => {
    radio.addEventListener('change', updateCustomColorPreview);
  });

  // 保存按鈕
  saveBtn.addEventListener('click', () => {
    const color1 = color1Input.value.toUpperCase();
    const color2 = color2Input.value.toUpperCase();
    const direction = document.querySelector('input[name="custom-direction"]:checked')?.value || 'diagonal';

    // 驗證顏色格式
    if (!/^#[0-9A-Fa-f]{6}$/.test(color1) || !/^#[0-9A-Fa-f]{6}$/.test(color2)) {
      alert('請輸入有效的顏色代碼（格式：#RRGGBB）');
      return;
    }

    // 創建自定義配色卡片
    const customBg = {
      id: `custom-${Date.now()}`,
      name: '自定義',
      colors: [color1, color2],
      direction: direction,
      isCustom: true
    };

    // 添加到選擇器（在「+ 自定義」卡片後面）
    const container = document.getElementById('background-selector');
    const customCard = container.querySelector('.background-card-custom');
    const newCard = createBackgroundCard(customBg);
    
    // 插入到自定義卡片後面
    if (customCard && customCard.nextSibling) {
      container.insertBefore(newCard, customCard.nextSibling);
    } else {
      container.appendChild(newCard);
    }

    // 選中新創建的卡片
    document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
    newCard.classList.add('selected');

    // 應用預覽
    applyCustomBackgroundPreview([color1, color2], direction);

    // 隱藏顏色選擇器
    if (picker) {
      picker.hidden = true;
    }
  });

  // 取消按鈕
  cancelBtn.addEventListener('click', () => {
    if (picker) {
      picker.hidden = true;
    }
  });
}

/**
 * 更新自定義顏色預覽
 */
function updateCustomColorPreview() {
  const color1Input = document.getElementById('custom-color-1');
  const color2Input = document.getElementById('custom-color-2');
  const preview = document.getElementById('custom-color-preview');
  const directionRadio = document.querySelector('input[name="custom-direction"]:checked');
  
  if (!color1Input || !color2Input || !preview) {
    return;
  }

  const color1 = color1Input.value;
  const color2 = color2Input.value;
  const direction = directionRadio?.value || 'diagonal';

  // 計算漸變角度
  let gradientAngle = '135deg';
  if (direction === 'vertical') {
    gradientAngle = '180deg';
  } else if (direction === 'horizontal') {
    gradientAngle = '90deg';
  }

  preview.style.background = `linear-gradient(${gradientAngle}, ${color1} 0%, ${color2} 100%)`;
}

/**
 * 應用自定義背景預覽
 */
function applyCustomBackgroundPreview(colors, direction) {
  if (!window.AppState || !window.AppState.backgroundRenderer) {
    return;
  }

  // 標記為有編輯操作
  hasEditorChanges = true;

  const backgroundConfig = {
    color_scheme: {
      colors: colors,
      direction: direction || 'diagonal'
    },
    abstract_elements: []
  };

  try {
    const { backgroundRenderer } = window.AppState;
    if (typeof backgroundRenderer.setConfig === 'function') {
      backgroundRenderer.setConfig(backgroundConfig);
      // 應用對應的文字顏色（根據亮度自動判斷）
      applyCustomBackgroundTextColor(colors);
    }
  } catch (error) {
    console.warn('應用自定義背景預覽失敗:', error);
  }
}

/**
 * 根據自定義配色自動判斷文字顏色
 */
function applyCustomBackgroundTextColor(colors) {
  const root = document.documentElement;
  
  // 計算平均亮度
  function getLuminance(hex) {
    const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!rgb) return 0;
    
    const r = parseInt(rgb[1], 16) / 255;
    const g = parseInt(rgb[2], 16) / 255;
    const b = parseInt(rgb[3], 16) / 255;
    
    // 使用相對亮度公式
    const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  const avgLuminance = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length;
  const textColor = avgLuminance > 0.5 ? '#2C3E50' : '#FFFFFF';
  
  root.style.setProperty('--poem-text-color', textColor);
  root.style.setProperty('--poem-glow-color', textColor);
  root.style.setProperty('--poem-meta-color', textColor); // Meta 信息使用相同顏色，通過 opacity 降低顯示
  updatePoemTextGlow(textColor);
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

  // 編輯器打開時，只載入當前頁面的聲色意境狀態到界面
  // 不重新從數據庫載入數據，不自動播放音樂，保持原頁面的狀態

  // 載入已選音效（使用傳入的 atmosphere 對象中的數據）
  if (atmosphere.sound_combination && atmosphere.sound_combination.length > 0) {
    const selectedContainer = document.getElementById('selected-sounds');
    selectedContainer.innerHTML = '';
    
    for (const config of atmosphere.sound_combination) {
      const sourceType = config.source_type || 'system';
      const displayName = config.display_name || config.name || '音效';
      const volumeValue = Math.round((config.volume || 0.7) * 100);
      const soundId = config.recording_id || config.sound_id;
      const fileUrl = config.file_url || '';
      const recordingPath = config.recording_path || '';

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
          // 不設置音量到 soundMixer，保持原頁面的音量狀態
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
        
        // 創建已選音效項，使用傳入的數據
        const soundName = soundCard.querySelector('.sound-card-name')?.textContent || displayName;
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
          // 不設置音量到 soundMixer，保持原頁面的音量狀態
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
    
    // 編輯器打開時，不自動播放音樂，保持原頁面的音樂播放狀態
    // 只有當用戶在編輯器中主動選擇/修改音效時，才會通過 scheduleAutoPreview() 播放預覽
  }

  // 載入背景配置
  if (atmosphere.background_config && atmosphere.background_config.color_scheme) {
    const colorScheme = atmosphere.background_config.color_scheme;
    const bgId = colorScheme.id;
    
    // 如果有預設 ID，查找對應的預設卡片
    if (bgId && !bgId.startsWith('custom-')) {
    const bgCard = document.querySelector(`.background-card[data-bg-id="${bgId}"]`);
    if (bgCard) {
      document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
      bgCard.classList.add('selected');
      // 不立即應用背景預覽，保持原頁面的背景狀態
      // 背景已經在原頁面顯示了，編輯器打開時不需要重新應用
      }
    } else {
      // 自定義配色：創建卡片並選中
      const colors = colorScheme.colors || [];
      const direction = colorScheme.direction || 'diagonal';
      
      if (colors.length >= 2) {
        const customBg = {
          id: bgId || `custom-${Date.now()}`,
          name: '自定義',
          colors: colors,
          direction: direction,
          isCustom: true
        };
        
        // 檢查是否已存在相同的自定義配色卡片
        const container = document.getElementById('background-selector');
        const existingCard = Array.from(container.querySelectorAll('.background-card[data-is-custom="true"]'))
          .find(card => {
            const cardColors = JSON.parse(card.dataset.customColors || '[]');
            return cardColors[0] === colors[0] && cardColors[1] === colors[1] && 
                   card.dataset.customDirection === direction;
          });
        
        if (existingCard) {
          // 使用現有卡片
          document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
          existingCard.classList.add('selected');
          // 不立即應用背景預覽，保持原頁面的背景狀態
        } else {
          // 創建新卡片
          const customCard = container.querySelector('.background-card-custom');
          const newCard = createBackgroundCard(customBg);
          
          if (customCard && customCard.nextSibling) {
            container.insertBefore(newCard, customCard.nextSibling);
          } else {
            container.appendChild(newCard);
          }
          
          document.querySelectorAll('.background-card').forEach(c => c.classList.remove('selected'));
          newCard.classList.add('selected');
          // 不立即應用背景預覽，保持原頁面的背景狀態
        }
      }
    }
  } else {
    // 如果沒有背景配置，清除所有選中狀態
    // 但不清除背景預覽，保持原頁面的背景狀態
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

  // 檢查該用戶在該詩句下是否已有意境
  const userId = await ensureCurrentUserId();
  if (userId && window.AppState?.supabase) {
    try {
      const { data: existingAtmospheres, error } = await window.AppState.supabase
        .from('poem_atmospheres')
        .select('id, status, created_at')
        .eq('poem_id', poem.id)
        .eq('created_by', userId);

      if (error) {
        console.warn('檢查舊意境失敗:', error);
      } else if (existingAtmospheres && existingAtmospheres.length > 0) {
        // 有舊意境，提示用戶確認覆蓋
        const oldStatus = existingAtmospheres[0].status;
        const statusText = {
          'approved': '已發布',
          'pending': '待審核',
          'draft': '草稿',
          'rejected': '已拒絕'
        }[oldStatus] || '未知狀態';

        const confirmed = confirm(
          `你已經為這首詩創作過一個聲色意境（狀態：${statusText}）。\n\n` +
          `發布新的意境將會覆蓋舊的意境，舊的意境將被刪除。\n\n` +
          `確定要繼續發布嗎？`
        );

        if (!confirmed) {
          // 用戶取消，不繼續發布
          return;
        }
      }
    } catch (error) {
      console.warn('檢查舊意境時發生錯誤:', error);
      // 發生錯誤時繼續發布流程，不阻斷用戶操作
    }
  }

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
    const isCustom = selectedBg.dataset.isCustom === 'true';
    
    if (isCustom) {
      // 自定義配色：從 data 屬性讀取
      const customColors = JSON.parse(selectedBg.dataset.customColors || '[]');
      const customDirection = selectedBg.dataset.customDirection || 'diagonal';
      
      if (customColors.length >= 2) {
        backgroundConfig = {
          color_scheme: {
            colors: customColors,
            direction: customDirection
            // 注意：自定義配色不包含 id，這樣其他用戶也能正確顯示
          },
          abstract_elements: []
        };
      }
    } else {
      // 預設配色：使用映射表
      const backgroundSchemes = {
        'night': { 
          colors: ['#1A1A2E', '#16213E'], 
          direction: 'diagonal',
          particle_animation: {
            type: 'threejs',
            preset: 'stardust',
            config: {}
          }
        },
        'dawn': { colors: ['#FFE5B4', '#FFDAB9'], direction: 'vertical' },
        'autumn': { 
          colors: ['#2F4F4F', '#708090'], 
          direction: 'vertical',
          particle_animation: {
            type: 'threejs',
            preset: 'falling-leaves',
            config: {}
          }
        },
        'spring': { colors: ['#E8F4F8', '#D4E8F0'], direction: 'diagonal' },
        'sunset': { colors: ['#FF6B6B', '#FFA07A'], direction: 'diagonal' },
        'bamboo': { colors: ['#2D5016', '#4A7C2E'], direction: 'diagonal' },
        'winter-snow': { 
          colors: ['#F5F5F5', '#E0E0E0'], 
          direction: 'diagonal',
          particle_animation: {
            type: 'particlesjs',
            preset: 'snowflakes',
            config: {}
          }
        },
        'plum-blossom': { colors: ['#FFF3E0', '#FFE0B2'], direction: 'diagonal' },
        'starry-night': { 
          colors: ['#070825', '#0A0D2E'], 
          direction: 'diagonal',
          particle_animation: {
            type: 'particlesjs',
            preset: 'codepen-stars',
            config: {}
          }
        },
        'rotating-stars': {
          colors: ['#000000', '#0A0D2E'],
          direction: 'diagonal',
          particle_animation: {
            type: 'particlesjs',
            preset: 'rotating-stars',
            config: {
              hue: 217,
              maxStars: undefined // 使用默認值（移動設備 600，桌面 1400）
            }
          }
        },
        'twinkling-stars': {
          colors: ['#02040d', '#050b1f', '#0e1839'],
          direction: 'diagonal',
          particle_animation: {
            type: 'canvas',
            preset: 'twinkling-stars',
            config: {
              maxStars: undefined, // 使用預設（移動端較少，桌面較多）
              backgroundColor: '#030510',
              backgroundAlpha: 0.82,
              starIntensity: 1.2,
              starSizeMultiplier: 1.08,
              brightnessRange: [0.35, 0.95],
              twinkleSpeedRange: [0.006, 0.02],
              sparkleChance: 0.03,
              sparkleBoost: 0.22,
              starColorPalette: ['#fefefe', '#cfe8ff', '#ffe7c4', '#ffd2c2', '#c7d8ff']
            }
          }
        },
        'lantern-valley': {
          colors: ['#120C1C', '#2D1B3D', '#3A283B'],
          direction: 'vertical',
          particle_animation: {
            type: 'particlesjs',
            preset: 'lantern-glow',
            config: {}
          }
        },
        'rainfall': {
          colors: ['#0b132b', '#1b263b', '#415a77'],
          direction: 'vertical',
          particle_animation: {
            type: 'particlesjs',
            preset: 'rainfall',
            config: {}
          }
        },
        'green-mountain': { colors: ['#4A7C2E', '#6B8E23'], direction: 'diagonal' },
        'cloud-mist': { colors: ['#ECEFF1', '#CFD8DC'], direction: 'diagonal' },
        'falling-flowers': { 
          colors: ['#FFE5E8', '#FFCCD0'], 
          direction: 'diagonal',
          particle_animation: {
            type: 'threejs',
            preset: 'falling-petals',
            config: {}
          }
        }
      };
      
      const bgScheme = backgroundSchemes[bgId] || backgroundSchemes['night'];
      
      backgroundConfig = {
        color_scheme: {
          id: bgId,
          colors: bgScheme.colors,
          direction: bgScheme.direction
        },
        abstract_elements: []
      };
      
      // 添加粒子動畫配置（如果存在）
      if (bgScheme.particle_animation) {
        backgroundConfig.particle_animation = bgScheme.particle_animation;
      }
    }
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


