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
    this.audioUnlocked = false; // 標記音頻是否已解鎖（用於移動端靜音模式）
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
   * 解鎖音頻上下文（用於移動端靜音模式）
   * 通過播放一個極短的無聲音頻來"解鎖"音頻上下文
   * 這需要在用戶交互事件中調用（如點擊、觸摸）
   */
  async unlockAudio() {
    // 如果已經解鎖，直接返回
    if (this.audioUnlocked) {
      return true;
    }

    try {
      // 確保 AudioContext 已初始化
      await this.ensureInitialized();
      
      if (!this.audioContext) {
        console.warn('⚠️ AudioContext 未初始化，無法解鎖音頻');
        return false;
      }

      // 如果 AudioContext 處於 suspended 狀態，嘗試恢復
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 創建一個極短的無聲音頻緩衝區（0.1 秒）
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, sampleRate * 0.1, sampleRate);
      
      // 創建播放源並播放無聲音頻
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      // 播放完成後標記為已解鎖
      source.onended = () => {
        this.audioUnlocked = true;
        console.log('🔓 音頻上下文已解鎖（移動端靜音模式兼容）');
      };
      
      source.start(0);
      
      // 等待播放完成（最多 200ms）
      await new Promise((resolve) => {
        setTimeout(() => {
          this.audioUnlocked = true;
          resolve();
        }, 200);
      });

      return true;
    } catch (error) {
      console.warn('⚠️ 解鎖音頻上下文失敗:', error);
      // 即使失敗也標記為已嘗試，避免重複嘗試
      this.audioUnlocked = true;
      return false;
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

    // 如果音頻尚未解鎖，嘗試解鎖（用於移動端靜音模式）
    if (!this.audioUnlocked && this.audioContext) {
      // 注意：這裡不強制解鎖，因為需要用戶交互
      // 真正的解鎖應該在用戶交互事件中調用 unlockAudio()
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
      
      console.log('🔇 音頻引擎已關閉');
    } catch (error) {
      console.warn('關閉音頻引擎時發生錯誤:', error);
    }
  }
}

