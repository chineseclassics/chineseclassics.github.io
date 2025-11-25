/**
 * 音頻引擎
 * Web Audio API 封裝，從原版 kongshan 遷移
 */

const APP_CONFIG = {
  audio: {
    maxSimultaneousSounds: 5,
    defaultVolume: 0.7,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
  },
}

export class AudioEngine {
  constructor() {
    this.audioContext = null
    this.masterGainNode = null
    this.sources = new Map()
    this.buffers = new Map()
    this.isMuted = false
    this.masterVolume = 1.0
    this.initialized = false
    this.initPromise = null
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    this.stateCheckInterval = null
  }

  /**
   * 初始化音頻上下文
   */
  async init(forceResume = false) {
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.initialized && !forceResume) {
      return
    }

    this.initPromise = (async () => {
      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
          console.log('🎵 AudioContext 已創建，狀態:', this.audioContext.state)
        }

        if (this.audioContext.state === 'suspended' || forceResume) {
          console.log('🔄 嘗試恢復 AudioContext...')
          try {
            await this.audioContext.resume()
            console.log('✅ AudioContext 已恢復，狀態:', this.audioContext.state)
          } catch (resumeError) {
            console.warn('⚠️ AudioContext resume 失敗:', resumeError)
          }
        }

        if (this.audioContext.state !== 'running') {
          console.warn(`⚠️ AudioContext 狀態為 ${this.audioContext.state}`)
        }

        this.audioContext.addEventListener('statechange', () => {
          console.log('🎵 AudioContext 狀態變化:', this.audioContext.state)
        })

        this.startStateCheck()
        this.initialized = true
        console.log('✅ 音頻引擎初始化成功')
      } catch (error) {
        console.error('❌ 音頻引擎初始化失敗:', error)
        this.initPromise = null
        throw error
      } finally {
        this.initPromise = null
      }
    })()

    return this.initPromise
  }

  /**
   * 啟動 AudioContext 狀態檢查
   */
  startStateCheck() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval)
    }

    this.stateCheckInterval = setInterval(() => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('🔄 檢測到 AudioContext 被暫停，嘗試恢復...')
        this.audioContext.resume().catch((err) => {
          console.warn('⚠️ 自動恢復 AudioContext 失敗:', err)
        })
      }
    }, 2000)
  }

  stopStateCheck() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval)
      this.stateCheckInterval = null
    }
  }

  /**
   * 確保音頻上下文已初始化
   */
  async ensureInitialized(requireUserInteraction = false) {
    if (!this.initialized) {
      await this.init(requireUserInteraction)
    }

    if (!this.audioContext) {
      await this.init(requireUserInteraction)
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        console.log('✅ AudioContext 已恢復')
      } catch (error) {
        console.warn('⚠️ 恢復 AudioContext 失敗:', error)
        if (this.isMobile && requireUserInteraction) {
          throw new Error('AudioContext 需要用戶交互才能恢復')
        }
      }
    }
  }

  /**
   * 加載音頻文件
   */
  async loadSound(url) {
    if (this.buffers.has(url)) {
      return this.buffers.get(url)
    }

    try {
      await this.ensureInitialized()

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

      this.buffers.set(url, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error('加載音頻失敗:', url, error)
      throw error
    }
  }

  /**
   * 播放單個音效
   */
  async playSound(soundId, url, options = {}) {
    if (this.isMuted) return

    try {
      await this.ensureInitialized()

      if (this.sources.has(soundId)) {
        this.stopSound(soundId)
      }

      const audioBuffer = await this.loadSound(url)

      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = audioBuffer
      source.loop = options.loop !== undefined ? options.loop : true

      const volume =
        (options.volume !== undefined ? options.volume : APP_CONFIG.audio.defaultVolume) *
        this.masterVolume
      gainNode.gain.value = volume

      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      source.start(0)

      this.sources.set(soundId, {
        source,
        gainNode,
        buffer: audioBuffer,
        url,
        volume: options.volume !== undefined ? options.volume : APP_CONFIG.audio.defaultVolume,
        loop: source.loop,
      })

      source.onended = () => {
        this.sources.delete(soundId)
      }

      console.log(`✅ 播放音效: ${soundId}`)
    } catch (error) {
      console.error('播放音效失敗:', soundId, error)
    }
  }

  /**
   * 停止播放音效
   */
  stopSound(soundId) {
    const sound = this.sources.get(soundId)
    if (sound) {
      try {
        sound.source.stop()
      } catch (error) {
        // 忽略錯誤
      }
      this.sources.delete(soundId)
      console.log(`⏹️ 停止音效: ${soundId}`)
    }
  }

  /**
   * 設置音效音量
   */
  setVolume(soundId, volume) {
    const sound = this.sources.get(soundId)
    if (sound) {
      sound.gainNode.gain.value = volume * this.masterVolume
      sound.volume = volume
      console.log(`🔊 設置音量: ${soundId} = ${volume}`)
    }
  }

  /**
   * 設置主音量
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume))

    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume
    }

    this.sources.forEach((sound) => {
      sound.gainNode.gain.value = sound.volume * this.masterVolume
    })

    console.log(`🔊 設置主音量: ${this.masterVolume}`)
  }

  /**
   * 停止所有音效
   */
  stopAll() {
    this.sources.forEach((sound) => {
      try {
        sound.source.stop()
      } catch (error) {
        // 忽略錯誤
      }
    })
    this.sources.clear()
    console.log('⏹️ 停止所有音效')
  }

  /**
   * 靜音/取消靜音
   */
  toggleMute() {
    this.isMuted = !this.isMuted

    if (this.isMuted) {
      this.stopAll()
    }

    console.log(this.isMuted ? '🔇 已靜音' : '🔊 取消靜音')
    return this.isMuted
  }

  /**
   * 獲取播放狀態
   */
  getPlayingSounds() {
    return Array.from(this.sources.keys())
  }

  isPlaying(soundId) {
    return this.sources.has(soundId)
  }

  /**
   * 獲取 AudioContext（供 SoundMixer 使用）
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      console.log('🎵 AudioContext 已創建')
      this.startStateCheck()
    }
    return this.audioContext
  }

  /**
   * 獲取主音量節點
   */
  getMasterGainNode() {
    if (!this.masterGainNode) {
      const ctx = this.getAudioContext()
      this.masterGainNode = ctx.createGain()
      this.masterGainNode.gain.value = this.masterVolume
      this.masterGainNode.connect(ctx.destination)
    }
    return this.masterGainNode
  }

  /**
   * 關閉音頻引擎
   */
  async close() {
    try {
      this.stopStateCheck()
      this.stopAll()

      if (this.masterGainNode) {
        try {
          this.masterGainNode.disconnect()
        } catch (error) {
          // 忽略錯誤
        }
        this.masterGainNode = null
      }

      if (this.audioContext) {
        if (this.audioContext.state !== 'closed') {
          await this.audioContext.close()
        }
        this.audioContext = null
      }

      this.buffers.clear()
      this.initialized = false
      this.initPromise = null

      console.log('🔇 音頻引擎已關閉')
    } catch (error) {
      console.warn('關閉音頻引擎時發生錯誤:', error)
    }
  }
}

