// =====================================================
// 音效控制面板 UI 模塊
// =====================================================

/**
 * 渲染音效控制面板
 * @param {HTMLElement} container - 容器元素
 * @param {SoundMixer} soundMixer - 音效混音器實例
 */
export function renderSoundControls(container, soundMixer) {
  if (!container) return;

  container.innerHTML = '';

  // 主控制按鈕容器
  const mainControls = document.createElement('div');
  mainControls.className = 'main-controls';

  // 播放/暫停按鈕
  const playPauseBtn = document.createElement('button');
  playPauseBtn.className = 'control-btn play-pause-btn';
  playPauseBtn.setAttribute('aria-label', '播放/暫停');
  playPauseBtn.innerHTML = soundMixer.getIsPlaying() 
    ? createPauseIcon() 
    : createPlayIcon();
  
  playPauseBtn.addEventListener('click', async () => {
    if (soundMixer.getIsPlaying()) {
      soundMixer.stopAll();
      playPauseBtn.innerHTML = createPlayIcon();
    } else {
      const playResult = await soundMixer.playAll();
      if (playResult.success) {
        playPauseBtn.innerHTML = createPauseIcon();
      } else {
        // 播放失敗，保持播放圖標
        console.log('📱 音效播放失敗，可能需要用戶交互或設備未靜音');
      }
    }
  });

  mainControls.appendChild(playPauseBtn);

  // 主音量滑塊
  const masterVolumeControl = createVolumeControl('主音量', 1.0, (value) => {
    soundMixer.setMasterVolume(value);
  });
  mainControls.appendChild(masterVolumeControl);

  container.appendChild(mainControls);

  // 音效軌道列表
  const tracksList = document.createElement('div');
  tracksList.className = 'tracks-list';

  const tracks = soundMixer.getTracks();
  tracks.forEach(track => {
    const trackControl = createTrackControl(track, soundMixer);
    tracksList.appendChild(trackControl);
  });

  container.appendChild(tracksList);
}

/**
 * 創建單個音效軌道控制
 */
function createTrackControl(track, soundMixer) {
  const trackEl = document.createElement('div');
  trackEl.className = 'track-control';

  // 音效名稱
  const nameEl = document.createElement('div');
  nameEl.className = 'track-name';
  nameEl.textContent = track.soundEffect.name;
  trackEl.appendChild(nameEl);

  // 音量滑塊
  const volumeControl = createVolumeControl('音量', track.volume, (value) => {
    soundMixer.setTrackVolume(track.soundEffect.id, value);
  });
  trackEl.appendChild(volumeControl);

  return trackEl;
}

/**
 * 創建音量控制滑塊
 */
function createVolumeControl(label, initialValue, onChange) {
  const container = document.createElement('div');
  container.className = 'volume-control';

  const labelEl = document.createElement('label');
  labelEl.className = 'volume-label';
  labelEl.textContent = label;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'volume-slider';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(initialValue * 100);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'volume-value';
  valueDisplay.textContent = `${Math.round(initialValue * 100)}%`;

  slider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) / 100;
    valueDisplay.textContent = `${Math.round(value * 100)}%`;
    onChange(value);
  });

  container.appendChild(labelEl);
  container.appendChild(slider);
  container.appendChild(valueDisplay);

  return container;
}

/**
 * 創建播放圖標
 */
function createPlayIcon() {
  return `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  `;
}

/**
 * 創建暫停圖標
 */
function createPauseIcon() {
  return `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  `;
}

