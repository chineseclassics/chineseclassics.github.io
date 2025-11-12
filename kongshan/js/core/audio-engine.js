// =====================================================
// 音頻引擎模塊
// Web Audio API 封裝
// =====================================================

import { APP_CONFIG } from '../config.js';

/**
 * 音頻引擎
 * 負責音頻播放、混音、音量控制
 */
export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGainNode = null; // 主音量節點（供 SoundMixer 使用）
    this.sources = new Map(); // 存儲所有播放源 { soundId: { source, gainNode, buffer } }
    this.buffers = new Map(); // 音頻緩存 { url: AudioBuffer }
    this.isMuted = false;
    this.masterVolume = 1.0;
    this.initialized = false;
    this.iosAudioUnlocked = false;
    this.iosUnlockInProgress = false;
    this.silentAudioUrl = null;
  }
  
  /**
   * 初始化音頻上下文
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // 創建 AudioContext（需要用戶交互後才能創建）
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 如果 AudioContext 處於 suspended 狀態，嘗試恢復
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      console.log('✅ 音頻引擎初始化成功');
    } catch (error) {
      console.error('❌ 音頻引擎初始化失敗:', error);
      throw error;
    }
  }
  
  /**
   * 確保音頻上下文已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    
    // 如果 AudioContext 處於 suspended 狀態，嘗試恢復
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  
  /**
   * 加載音頻文件
   */
  async loadSound(url) {
    // 檢查緩存
    if (this.buffers.has(url)) {
      return this.buffers.get(url);
    }
    
    try {
      await this.ensureInitialized();
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // 緩存音頻
      this.buffers.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('加載音頻失敗:', url, error);
      throw error;
    }
  }
  
  /**
   * 播放單個音效
   */
  async playSound(soundId, url, options = {}) {
    if (this.isMuted) return;
    
    try {
      await this.ensureInitialized();
      
      // 如果已經在播放，先停止
      if (this.sources.has(soundId)) {
        this.stopSound(soundId);
      }
      
      // 加載音頻
      const audioBuffer = await this.loadSound(url);
      
      // 創建播放源
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      source.loop = options.loop !== undefined ? options.loop : true;
      
      // 設置音量
      const volume = (options.volume !== undefined ? options.volume : APP_CONFIG.audio.defaultVolume) * this.masterVolume;
      gainNode.gain.value = volume;
      
      // 連接節點
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 開始播放
      source.start(0);
      
      // 存儲播放源
      this.sources.set(soundId, {
        source,
        gainNode,
        buffer: audioBuffer,
        url,
        volume: options.volume !== undefined ? options.volume : APP_CONFIG.audio.defaultVolume,
        loop: source.loop
      });
      
      // 播放結束時清理
      source.onended = () => {
        this.sources.delete(soundId);
      };
      
      console.log(`✅ 播放音效: ${soundId}`);
    } catch (error) {
      console.error('播放音效失敗:', soundId, error);
    }
  }
  
  /**
   * 停止播放音效
   */
  stopSound(soundId) {
    const sound = this.sources.get(soundId);
    if (sound) {
      try {
        sound.source.stop();
      } catch (error) {
        // 可能已經停止，忽略錯誤
      }
      this.sources.delete(soundId);
      console.log(`⏹️ 停止音效: ${soundId}`);
    }
  }
  
  /**
   * 設置音效音量
   */
  setVolume(soundId, volume) {
    const sound = this.sources.get(soundId);
    if (sound) {
      sound.gainNode.gain.value = volume * this.masterVolume;
      sound.volume = volume;
      console.log(`🔊 設置音量: ${soundId} = ${volume}`);
    }
  }
  
  /**
   * 設置主音量
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // 更新主音量節點
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
    
    // 更新所有正在播放的音效音量
    this.sources.forEach((sound, soundId) => {
      sound.gainNode.gain.value = sound.volume * this.masterVolume;
    });
    
    console.log(`🔊 設置主音量: ${this.masterVolume}`);
  }
  
  /**
   * 停止所有音效
   */
  stopAll() {
    this.sources.forEach((sound, soundId) => {
      try {
        sound.source.stop();
      } catch (error) {
        // 忽略錯誤
      }
    });
    this.sources.clear();
    console.log('⏹️ 停止所有音效');
  }
  
  /**
   * 靜音/取消靜音
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stopAll();
    }
    
    console.log(this.isMuted ? '🔇 已靜音' : '🔊 取消靜音');
    return this.isMuted;
  }
  
  /**
   * 獲取播放狀態
   */
  getPlayingSounds() {
    return Array.from(this.sources.keys());
  }
  
  /**
   * 檢查音效是否正在播放
   */
  isPlaying(soundId) {
    return this.sources.has(soundId);
  }

  /**
   * 獲取 AudioContext 實例（供 SoundMixer 使用）
   */
  getAudioContext() {
    if (!this.audioContext) {
      // 如果還沒有初始化，創建一個新的 AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    }
    return this.audioContext;
  }

  /**
   * 獲取主音量節點（供 SoundMixer 使用）
   */
  getMasterGainNode() {
    if (!this.masterGainNode) {
      // 創建主音量節點
      const ctx = this.getAudioContext();
      this.masterGainNode = ctx.createGain();
      this.masterGainNode.gain.value = this.masterVolume;
      this.masterGainNode.connect(ctx.destination);
    }
    return this.masterGainNode;
  }

  /**
   * 判斷是否為 iOS 裝置
   */
  isIOSDevice() {
    if (typeof navigator === 'undefined') {
      return false;
    }
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const iosRegex = /iPad|iPhone|iPod/;
    const isIOS = iosRegex.test(ua) || iosRegex.test(platform);
    const isMacWithTouch = platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
    return isIOS || isMacWithTouch;
  }

  /**
   * 建立靜音音訊的 URL（用於喚醒 iOS 靜音模式）
   * @param {number} durationMs - 持續時間（毫秒）
   */
  createSilentAudioUrl(durationMs = 250) {
    if (this.silentAudioUrl) {
      return this.silentAudioUrl;
    }

    if (typeof window === 'undefined' || typeof Blob === 'undefined') {
      return null;
    }

    const sampleRate = 44100;
    const channels = 1;
    const bitsPerSample = 16;
    const frameCount = Math.max(1, Math.round(sampleRate * (durationMs / 1000)));
    const blockAlign = channels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = frameCount * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;

    const writeString = (str) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset, str.charCodeAt(i));
        offset += 1;
      }
    };

    const writeUint32 = (value) => {
      view.setUint32(offset, value, true);
      offset += 4;
    };

    const writeUint16 = (value) => {
      view.setUint16(offset, value, true);
      offset += 2;
    };

    writeString('RIFF');
    writeUint32(36 + dataSize);
    writeString('WAVE');
    writeString('fmt ');
    writeUint32(16); // Subchunk1Size
    writeUint16(1); // PCM
    writeUint16(channels);
    writeUint32(sampleRate);
    writeUint32(byteRate);
    writeUint16(blockAlign);
    writeUint16(bitsPerSample);
    writeString('data');
    writeUint32(dataSize);
    // ArrayBuffer 預設為 0，無需手動填入靜音數據

    try {
      const blob = new Blob([buffer], { type: 'audio/wav' });
      this.silentAudioUrl = URL.createObjectURL(blob);
      return this.silentAudioUrl;
    } catch (error) {
      console.warn('建立靜音音訊 URL 失敗:', error);
      return null;
    }
  }

  /**
   * 喚醒 iOS 靜音模式，允許音訊輸出
   */
  async unlockIOSAudio() {
    if (!this.isIOSDevice()) {
      return true;
    }

    if (this.iosAudioUnlocked) {
      return true;
    }

    if (this.iosUnlockInProgress) {
      // 若已有進行中流程，等待其完成
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.iosUnlockInProgress) {
            clearInterval(checkInterval);
            resolve(this.iosAudioUnlocked);
          }
        }, 50);
      });
    }

    this.iosUnlockInProgress = true;

    try {
      await this.ensureInitialized();

      if (typeof document !== 'undefined') {
        const silentUrl = this.createSilentAudioUrl();
        if (silentUrl) {
          const audioElement = document.createElement('audio');
          audioElement.style.position = 'absolute';
          audioElement.style.width = '0';
          audioElement.style.height = '0';
          audioElement.style.overflow = 'hidden';
          audioElement.style.opacity = '0';
          audioElement.setAttribute('playsinline', 'true');
          audioElement.setAttribute('webkit-playsinline', 'true');
          audioElement.preload = 'auto';
          audioElement.src = silentUrl;
          audioElement.volume = 1.0;

          document.body.appendChild(audioElement);

          try {
            const playPromise = audioElement.play();
            if (playPromise && typeof playPromise.then === 'function') {
              await playPromise;
            }
            audioElement.pause();
          } catch (error) {
            console.warn('播放靜音音訊以喚醒 iOS 失敗:', error);
          } finally {
            if (audioElement.parentNode) {
              audioElement.parentNode.removeChild(audioElement);
            }
          }
        }
      }

      // 使用 Web Audio 播放極短的靜音 buffer
      if (this.audioContext) {
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        source.stop(0);
        source.disconnect();
      }

      this.iosAudioUnlocked = true;
      console.log('🔓 iOS 音訊解鎖完成');
      return true;
    } catch (error) {
      console.warn('iOS 音訊解鎖失敗:', error);
      return false;
    } finally {
      this.iosUnlockInProgress = false;
    }
  }

  /**
   * 完全關閉音頻引擎
   * 停止所有音效並關閉 AudioContext
   */
  async close() {
    try {
      // 停止所有音效
      this.stopAll();
      
      // 斷開主音量節點
      if (this.masterGainNode) {
        try {
          this.masterGainNode.disconnect();
        } catch (error) {
          // 忽略斷開錯誤
        }
        this.masterGainNode = null;
      }
      
      // 關閉 AudioContext
      if (this.audioContext) {
        if (this.audioContext.state !== 'closed') {
          await this.audioContext.close();
        }
        this.audioContext = null;
      }
      
      // 清理緩存
      this.buffers.clear();
      this.initialized = false;
      this.iosAudioUnlocked = false;
      if (this.silentAudioUrl) {
        try {
          URL.revokeObjectURL(this.silentAudioUrl);
        } catch (error) {
          // 忽略釋放錯誤
        }
        this.silentAudioUrl = null;
      }
      
      console.log('🔇 音頻引擎已關閉');
    } catch (error) {
      console.warn('關閉音頻引擎時發生錯誤:', error);
    }
  }
}

