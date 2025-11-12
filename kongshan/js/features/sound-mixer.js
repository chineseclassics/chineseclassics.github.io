// =====================================================
// 音效混音模塊
// 負責管理多個音效的同時播放、音量控制、循環等
// =====================================================

/**
 * 單個音效軌道
 */
class SoundTrack {
  constructor(audioEngine, soundEffect) {
    this.audioEngine = audioEngine;
    this.soundEffect = soundEffect;
    this.audioBuffer = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.volume = soundEffect.volume || 1.0;
    this.loop = soundEffect.loop !== undefined ? soundEffect.loop : true;
  }

  /**
   * 加載音頻文件
   * 注意：file_url 應該已經是完整的 URL（由上層 normalizeSoundUrl 處理）
   */
  async load() {
    try {
      // 確保 AudioEngine 已初始化
      if (!this.audioEngine.initialized) {
        await this.audioEngine.init();
      }
      
      // file_url 應該已經是完整的 URL（由上層處理）
      const fileUrl = this.soundEffect.file_url;
      if (!fileUrl) {
        throw new Error('音效 URL 為空');
      }
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      const audioContext = this.audioEngine.getAudioContext();
      this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log(`✅ 音效加載成功: ${this.soundEffect.name} (${fileUrl})`);
      return true;
    } catch (error) {
      console.error(`❌ 音效加載失敗: ${this.soundEffect.name}`, error);
      console.error(`   嘗試的 URL: ${this.soundEffect.file_url}`);
      return false;
    }
  }

  /**
   * 播放音效
   * @param {boolean} fadeIn - 是否淡入，默認 false
   * @param {number} fadeInDuration - 淡入時長（毫秒），默認 500ms
   */
  play(fadeIn = false, fadeInDuration = 500) {
    if (!this.audioBuffer) {
      console.warn('音頻未加載，無法播放');
      return;
    }

    // 如果已經在播放，先停止
    if (this.isPlaying) {
      this.stop();
    }

    // 確保 AudioContext 已初始化
    const audioContext = this.audioEngine.getAudioContext();
    
    // 如果 AudioContext 處於 suspended 狀態，嘗試恢復
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(err => {
        console.warn('恢復 AudioContext 失敗:', err);
      });
    }
    
    // 創建音源節點
    this.sourceNode = audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.loop;

    // 創建音量節點
    this.gainNode = audioContext.createGain();
    
    // 根據是否需要淡入設置初始音量
    if (fadeIn) {
      this.gainNode.gain.value = 0;
      const startTime = audioContext.currentTime;
      const endTime = startTime + fadeInDuration / 1000;
      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(this.volume, endTime);
    } else {
      this.gainNode.gain.value = this.volume;
    }

    // 連接節點：音源 -> 音量 -> 主音量 -> 目標
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.audioEngine.getMasterGainNode());

    // 播放結束事件
    this.sourceNode.onended = () => {
      if (!this.loop) {
        this.isPlaying = false;
      }
    };

    this.sourceNode.start(0);
    this.isPlaying = true;

    console.log(`▶️ 播放音效: ${this.soundEffect.name}${fadeIn ? ' (淡入)' : ''}`);
  }

  /**
   * 停止播放
   */
  stop() {
    if (this.sourceNode && this.isPlaying) {
      try {
        this.sourceNode.stop();
      } catch (error) {
        console.warn('停止音效時發生錯誤:', error);
      }
      this.sourceNode = null;
      this.isPlaying = false;
      console.log(`⏹️ 停止音效: ${this.soundEffect.name}`);
    }
  }

  /**
   * 淡出並停止播放
   * @param {number} duration - 淡出時長（毫秒），默認 500ms
   */
  async fadeOutAndStop(duration = 500) {
    if (!this.isPlaying || !this.gainNode) {
      this.stop();
      return;
    }
    
    // 淡出到 0
    await this.fadeTo(0, duration);
    
    // 停止播放
    this.stop();
  }

  /**
   * 設置音量
   * @param {number} volume - 音量值 (0.0 到 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * 淡入淡出音量
   * @param {number} targetVolume - 目標音量值 (0.0 到 1.0)
   * @param {number} duration - 過渡時長（毫秒），默認 500ms
   */
  fadeTo(targetVolume, duration = 500) {
    if (!this.gainNode) return Promise.resolve();
    
    const audioContext = this.audioEngine.getAudioContext();
    const currentVolume = this.gainNode.gain.value;
    const targetVol = Math.max(0, Math.min(1, targetVolume));
    
    // 如果目標音量與當前音量相同，直接返回
    if (Math.abs(currentVolume - targetVol) < 0.001) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const startTime = audioContext.currentTime;
      const endTime = startTime + duration / 1000;
      
      // 設置初始音量
      this.gainNode.gain.setValueAtTime(currentVolume, startTime);
      
      // 線性過渡到目標音量
      this.gainNode.gain.linearRampToValueAtTime(targetVol, endTime);
      
      // 更新內部音量值
      this.volume = targetVol;
      
      // 過渡完成後解析 Promise
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * 設置循環
   * @param {boolean} loop - 是否循環播放
   */
  setLoop(loop) {
    this.loop = loop;
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  /**
   * 獲取播放狀態
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * 銷毀音效軌道
   */
  destroy() {
    this.stop();
    this.audioBuffer = null;
    this.gainNode = null;
  }
}

/**
 * 音效混音器
 * 管理多個音效軌道的同時播放
 */
export class SoundMixer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.tracks = new Map(); // Map<soundEffectId, SoundTrack>
    this.isPlaying = false;
    this.silenceCheckTimer = null;
    this.silenceCheckInterval = 800; // 毫秒
    this.silenceCheckDelay = 1200; // 首次檢測延遲
    this.silenceThreshold = 0.0008; // RMS 閾值
    this.silenceConsecutiveChecks = 3; // 連續靜音次數才提示
    this.silenceCheckCounter = 0;
    this.silenceDetected = false;
    this.silenceWarningDismissed = false;
    this.silenceWarningSuppressed = false;
    this.onSilenceDetected = null;
    this.onAudioRecovered = null;
  }

  /**
   * 添加音效到混音器
   * @param {object} soundEffect - 音效對象 { id, name, file_url, volume, loop }
   */
  async addTrack(soundEffect) {
    if (this.tracks.has(soundEffect.id)) {
      console.warn(`音效已存在: ${soundEffect.name}`);
      return this.tracks.get(soundEffect.id);
    }

    const track = new SoundTrack(this.audioEngine, soundEffect);
    const loaded = await track.load();

    if (loaded) {
      this.tracks.set(soundEffect.id, track);
      console.log(`➕ 添加音效軌道: ${soundEffect.name}`);
      return track;
    } else {
      return null;
    }
  }

  /**
   * 移除音效軌道
   * @param {string} soundEffectId - 音效 ID
   */
  removeTrack(soundEffectId) {
    const track = this.tracks.get(soundEffectId);
    if (track) {
      track.destroy();
      this.tracks.delete(soundEffectId);
      console.log(`➖ 移除音效軌道: ${track.soundEffect.name}`);
    }
  }

  /**
   * 播放所有音效
   * @param {boolean} fadeIn - 是否淡入，默認 false
   * @param {number} fadeInDuration - 淡入時長（毫秒），默認 500ms
   */
  async playAll(fadeIn = false, fadeInDuration = 500) {
    if (this.tracks.size === 0) {
      console.warn('沒有音效可播放');
      return;
    }

    // 確保 AudioContext 已初始化（需要用戶交互）
    try {
      if (!this.audioEngine.initialized) {
        await this.audioEngine.init();
      }
      
      // 確保 AudioContext 處於運行狀態
      const audioContext = this.audioEngine.getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (error) {
      console.error('初始化 AudioContext 失敗:', error);
      return;
    }

    this.tracks.forEach(track => {
      track.play(fadeIn, fadeInDuration);
    });

    this.isPlaying = true;
    this.silenceDetected = false;
    this.silenceCheckCounter = 0;
    this.silenceWarningDismissed = false;
    this.startSilenceMonitor();
    console.log(`▶️ 播放所有音效${fadeIn ? ' (淡入)' : ''}`);
  }

  /**
   * 停止所有音效
   * @param {boolean} fadeOut - 是否淡出，默認 false
   * @param {number} fadeOutDuration - 淡出時長（毫秒），默認 500ms
   */
  async stopAll(fadeOut = false, fadeOutDuration = 500) {
    if (this.tracks.size > 0) {
      if (fadeOut) {
        // 並行淡出所有音效
        const fadePromises = Array.from(this.tracks.values()).map(track =>
          track.fadeOutAndStop(fadeOutDuration)
        );
        await Promise.all(fadePromises);
        console.log('⏹️ 淡出並停止所有音效');
      } else {
        this.tracks.forEach(track => {
          track.stop();
        });
        console.log('⏹️ 停止所有音效');
      }
    }

    this.isPlaying = false;
    this.clearSilenceMonitor(true);
  }

  /**
   * 設置單個音效的音量
   * @param {string} soundEffectId - 音效 ID
   * @param {number} volume - 音量值 (0.0 到 1.0)
   */
  setTrackVolume(soundEffectId, volume) {
    const track = this.tracks.get(soundEffectId);
    if (track) {
      track.setVolume(volume);
    }
  }

  /**
   * 設置主音量
   * @param {number} volume - 音量值 (0.0 到 1.0)
   */
  setMasterVolume(volume) {
    this.audioEngine.setMasterVolume(volume);
  }

  /**
   * 獲取所有音效軌道
   */
  getTracks() {
    return Array.from(this.tracks.values());
  }

  /**
   * 清空所有音效軌道
   * @param {boolean} fadeOut - 是否淡出，默認 false
   * @param {number} fadeOutDuration - 淡出時長（毫秒），默認 500ms
   */
  async clear(fadeOut = false, fadeOutDuration = 500) {
    if (this.tracks.size > 0) {
      if (fadeOut) {
        await this.stopAll(true, fadeOutDuration);
      } else {
        this.stopAll();
      }
      this.tracks.forEach(track => track.destroy());
      this.tracks.clear();
      console.log(`🗑️ 清空所有音效軌道${fadeOut ? ' (淡出)' : ''}`);
    }
  }

  /**
   * 獲取播放狀態
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * 註冊靜音提示回呼
   * @param {object} callbacks - 回呼設定
   * @param {Function} callbacks.onSilenceDetected - 偵測靜音時觸發
   * @param {Function} callbacks.onAudioRecovered - 音訊恢復時觸發
   */
  setSilenceWarningCallbacks(callbacks = {}) {
    const { onSilenceDetected = null, onAudioRecovered = null } = callbacks;
    this.onSilenceDetected = typeof onSilenceDetected === 'function' ? onSilenceDetected : null;
    this.onAudioRecovered = typeof onAudioRecovered === 'function' ? onAudioRecovered : null;
  }

  /**
   * 單次播放中忽略後續靜音提示
   */
  dismissSilenceWarningForCurrentPlayback() {
    this.silenceWarningDismissed = true;
  }

  /**
   * 在當前工作階段中停用靜音提示
   */
  suppressSilenceWarningForSession() {
    this.silenceWarningSuppressed = true;
    this.clearSilenceMonitor(true);
    if (this.onAudioRecovered) {
      this.onAudioRecovered();
    }
  }

  /**
   * 檢查是否已全域停用靜音提示
   */
  isSilenceWarningSuppressed() {
    return this.silenceWarningSuppressed;
  }

  /**
   * 開始靜音監測循環
   */
  startSilenceMonitor() {
    this.clearSilenceMonitor();

    if (this.silenceWarningSuppressed) {
      return;
    }

    const analyser = this.audioEngine.getAnalyserNode();
    if (!analyser) {
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const checkSilence = () => {
      if (!this.isPlaying || this.tracks.size === 0) {
        this.clearSilenceMonitor(true);
        return;
      }

      analyser.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const sample = dataArray[i];
        sumSquares += sample * sample;
      }

      const rms = Math.sqrt(sumSquares / bufferLength);
      const isSilent = rms < this.silenceThreshold;

      if (isSilent) {
        this.silenceCheckCounter += 1;
        if (!this.silenceDetected && !this.silenceWarningDismissed && this.silenceCheckCounter >= this.silenceConsecutiveChecks) {
          this.silenceDetected = true;
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }
      } else {
        this.silenceCheckCounter = 0;
        if (this.silenceDetected) {
          this.silenceDetected = false;
          this.silenceWarningDismissed = false;
          if (this.onAudioRecovered) {
            this.onAudioRecovered();
          }
        }
      }

      this.silenceCheckTimer = setTimeout(checkSilence, this.silenceCheckInterval);
    };

    this.silenceCheckTimer = setTimeout(checkSilence, this.silenceCheckDelay);
  }

  /**
   * 停止靜音監測
   * @param {boolean} notifyRecovery - 是否通知音訊恢復
   */
  clearSilenceMonitor(notifyRecovery = false) {
    if (this.silenceCheckTimer) {
      clearTimeout(this.silenceCheckTimer);
      this.silenceCheckTimer = null;
    }

    this.silenceCheckCounter = 0;

    if (notifyRecovery && this.silenceDetected) {
      this.silenceDetected = false;
      if (this.onAudioRecovered) {
        this.onAudioRecovered();
      }
    }
  }
}

