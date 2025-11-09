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
   */
  play() {
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
    this.gainNode.gain.value = this.volume;

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

    console.log(`▶️ 播放音效: ${this.soundEffect.name}`);
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
   */
  async playAll() {
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
      track.play();
    });

    this.isPlaying = true;
    console.log('▶️ 播放所有音效');
  }

  /**
   * 停止所有音效
   */
  stopAll() {
    if (this.tracks.size > 0) {
      this.tracks.forEach(track => {
        track.stop();
      });
      console.log('⏹️ 停止所有音效');
    }

    this.isPlaying = false;
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
   */
  clear() {
    if (this.tracks.size > 0) {
      this.stopAll();
      this.tracks.forEach(track => track.destroy());
      this.tracks.clear();
      console.log('🗑️ 清空所有音效軌道');
    }
  }

  /**
   * 獲取播放狀態
   */
  getIsPlaying() {
    return this.isPlaying;
  }
}

