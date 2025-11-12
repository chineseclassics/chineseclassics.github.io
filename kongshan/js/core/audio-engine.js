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
    this.initPromise = null; // 防止重複初始化
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.stateCheckInterval = null; // AudioContext 狀態檢查定時器
  }
  
  /**
   * 初始化音頻上下文
   * @param {boolean} forceResume - 強制恢復 AudioContext（用於用戶交互後）
   */
  async init(forceResume = false) {
    // 如果正在初始化，等待完成
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // 如果已經初始化且不需要強制恢復，直接返回
    if (this.initialized && !forceResume) {
      return;
    }
    
    this.initPromise = (async () => {
      try {
        // 如果還沒有創建 AudioContext，創建一個
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('🎵 AudioContext 已創建，狀態:', this.audioContext.state);
        }
        
        // 確保 AudioContext 處於運行狀態
        if (this.audioContext.state === 'suspended' || forceResume) {
          console.log('🔄 嘗試恢復 AudioContext...');
          try {
            await this.audioContext.resume();
            console.log('✅ AudioContext 已恢復，狀態:', this.audioContext.state);
          } catch (resumeError) {
            console.warn('⚠️ AudioContext resume 失敗（可能需要用戶交互）:', resumeError);
            // 不拋出錯誤，允許後續重試
          }
        }
        
        // 如果 AudioContext 狀態不是 running，記錄警告
        if (this.audioContext.state !== 'running') {
          console.warn(`⚠️ AudioContext 狀態為 ${this.audioContext.state}，可能需要用戶交互`);
        }
        
        // 監聽狀態變化
        this.audioContext.addEventListener('statechange', () => {
          console.log('🎵 AudioContext 狀態變化:', this.audioContext.state);
        });
        
        // 啟動狀態檢查（移動端特別重要）
        this.startStateCheck();
        
        this.initialized = true;
        console.log('✅ 音頻引擎初始化成功，狀態:', this.audioContext.state);
      } catch (error) {
        console.error('❌ 音頻引擎初始化失敗:', error);
        this.initPromise = null;
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();
    
    return this.initPromise;
  }
  
  /**
   * 啟動 AudioContext 狀態檢查（移動端特別重要）
   */
  startStateCheck() {
    // 如果已經有檢查定時器，先清除
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
    }
    
    // 每 2 秒檢查一次 AudioContext 狀態（移動端可能被自動暫停）
    this.stateCheckInterval = setInterval(() => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('🔄 檢測到 AudioContext 被暫停，嘗試恢復...');
        this.audioContext.resume().catch(err => {
          console.warn('⚠️ 自動恢復 AudioContext 失敗:', err);
        });
      }
    }, 2000);
  }
  
  /**
   * 停止狀態檢查
   */
  stopStateCheck() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
  }
  
  /**
   * 確保音頻上下文已初始化並處於運行狀態
   * @param {boolean} requireUserInteraction - 是否需要用戶交互（移動端）
   */
  async ensureInitialized(requireUserInteraction = false) {
    // 如果還沒有初始化，先初始化
    if (!this.initialized) {
      await this.init(requireUserInteraction);
    }
    
    // 確保 AudioContext 存在
    if (!this.audioContext) {
      await this.init(requireUserInteraction);
    }
    
    // 如果 AudioContext 處於 suspended 狀態，嘗試恢復
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('✅ AudioContext 已恢復，狀態:', this.audioContext.state);
      } catch (error) {
        console.warn('⚠️ 恢復 AudioContext 失敗（可能需要用戶交互）:', error);
        // 移動端可能需要用戶交互才能恢復
        if (this.isMobile && requireUserInteraction) {
          throw new Error('AudioContext 需要用戶交互才能恢復');
        }
      }
    }
    
    // 如果狀態不是 running，記錄警告
    if (this.audioContext.state !== 'running') {
      console.warn(`⚠️ AudioContext 狀態為 ${this.audioContext.state}，可能影響播放`);
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
   * 注意：此方法不會自動初始化，應該先調用 ensureInitialized()
   */
  getAudioContext() {
    if (!this.audioContext) {
      // 如果還沒有初始化，創建一個新的 AudioContext（但不標記為已初始化）
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 AudioContext 已創建（通過 getAudioContext），狀態:', this.audioContext.state);
      // 啟動狀態檢查
      this.startStateCheck();
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
      // 停止狀態檢查
      this.stopStateCheck();
      
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
      this.initPromise = null;
      
      console.log('🔇 音頻引擎已關閉');
    } catch (error) {
      console.warn('關閉音頻引擎時發生錯誤:', error);
    }
  }
}

