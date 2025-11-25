/**
 * 音效混音器
 * 管理多個音效軌道的同時播放
 * 從原版 kongshan 遷移
 */

/**
 * 單個音效軌道
 */
class SoundTrack {
  constructor(audioEngine, soundEffect) {
    this.audioEngine = audioEngine
    this.soundEffect = soundEffect
    this.audioBuffer = null
    this.sourceNode = null
    this.gainNode = null
    this.isPlaying = false
    this.volume = soundEffect.volume || 1.0
    this.loop = soundEffect.loop !== undefined ? soundEffect.loop : true
  }

  /**
   * 加載音頻文件
   */
  async load() {
    try {
      if (!this.audioEngine.initialized) {
        await this.audioEngine.init()
      }

      const fileUrl = this.soundEffect.file_url
      if (!fileUrl) {
        throw new Error('音效 URL 為空')
      }

      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()

      const audioContext = this.audioEngine.getAudioContext()
      this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      console.log(`✅ 音效加載成功: ${this.soundEffect.name}`)
      return true
    } catch (error) {
      console.error(`❌ 音效加載失敗: ${this.soundEffect.name}`, error)
      return false
    }
  }

  /**
   * 播放音效
   */
  async play(fadeIn = false, fadeInDuration = 500) {
    if (!this.audioBuffer) {
      console.warn('音頻未加載，無法播放')
      return
    }

    if (this.isPlaying) {
      this.stop()
    }

    try {
      await this.audioEngine.ensureInitialized(true)
    } catch (error) {
      console.warn('⚠️ AudioContext 初始化失敗:', error)
    }

    const audioContext = this.audioEngine.getAudioContext()

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (err) {
        console.warn('⚠️ 恢復 AudioContext 失敗:', err)
      }
    }

    this.sourceNode = audioContext.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer
    this.sourceNode.loop = this.loop

    this.gainNode = audioContext.createGain()

    if (fadeIn) {
      this.gainNode.gain.value = 0
      const startTime = audioContext.currentTime
      const endTime = startTime + fadeInDuration / 1000
      this.gainNode.gain.setValueAtTime(0, startTime)
      this.gainNode.gain.linearRampToValueAtTime(this.volume, endTime)
    } else {
      this.gainNode.gain.value = this.volume
    }

    this.sourceNode.connect(this.gainNode)
    this.gainNode.connect(this.audioEngine.getMasterGainNode())

    this.sourceNode.onended = () => {
      if (!this.loop) {
        this.isPlaying = false
      }
    }

    this.sourceNode.start(0)
    this.isPlaying = true

    console.log(`▶️ 播放音效: ${this.soundEffect.name}${fadeIn ? ' (淡入)' : ''}`)
  }

  /**
   * 停止播放
   */
  stop() {
    if (this.sourceNode && this.isPlaying) {
      try {
        this.sourceNode.stop()
      } catch (error) {
        // 忽略錯誤
      }
      this.sourceNode = null
      this.isPlaying = false
      console.log(`⏹️ 停止音效: ${this.soundEffect.name}`)
    }
  }

  /**
   * 淡出並停止
   */
  async fadeOutAndStop(duration = 500) {
    if (!this.isPlaying || !this.gainNode) {
      this.stop()
      return
    }

    await this.fadeTo(0, duration)
    this.stop()
  }

  /**
   * 設置音量
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume
    }
  }

  /**
   * 淡入淡出音量
   */
  fadeTo(targetVolume, duration = 500) {
    if (!this.gainNode) return Promise.resolve()

    const audioContext = this.audioEngine.getAudioContext()
    const currentVolume = this.gainNode.gain.value
    const targetVol = Math.max(0, Math.min(1, targetVolume))

    if (Math.abs(currentVolume - targetVol) < 0.001) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const startTime = audioContext.currentTime
      const endTime = startTime + duration / 1000

      this.gainNode.gain.setValueAtTime(currentVolume, startTime)
      this.gainNode.gain.linearRampToValueAtTime(targetVol, endTime)

      this.volume = targetVol

      setTimeout(() => {
        resolve()
      }, duration)
    })
  }

  setLoop(loop) {
    this.loop = loop
    if (this.sourceNode) {
      this.sourceNode.loop = loop
    }
  }

  getIsPlaying() {
    return this.isPlaying
  }

  destroy() {
    this.stop()
    this.audioBuffer = null
    this.gainNode = null
  }
}

/**
 * 音效混音器
 */
export class SoundMixer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine
    this.tracks = new Map()
    this.isPlaying = false
  }

  /**
   * 添加音效軌道
   */
  async addTrack(soundEffect) {
    if (this.tracks.has(soundEffect.id)) {
      console.warn(`音效已存在: ${soundEffect.name}`)
      return this.tracks.get(soundEffect.id)
    }

    const track = new SoundTrack(this.audioEngine, soundEffect)
    const loaded = await track.load()

    if (loaded) {
      this.tracks.set(soundEffect.id, track)
      console.log(`➕ 添加音效軌道: ${soundEffect.name}`)
      return track
    }
    return null
  }

  removeTrack(soundEffectId) {
    const track = this.tracks.get(soundEffectId)
    if (track) {
      track.destroy()
      this.tracks.delete(soundEffectId)
      console.log(`➖ 移除音效軌道: ${track.soundEffect.name}`)
    }
  }

  /**
   * 播放所有音效
   */
  async playAll(fadeIn = false, fadeInDuration = 500) {
    if (this.tracks.size === 0) {
      console.warn('沒有音效可播放')
      return
    }

    try {
      await this.audioEngine.ensureInitialized(true)

      const audioContext = this.audioEngine.getAudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
    } catch (error) {
      console.error('❌ 初始化 AudioContext 失敗:', error)
      console.warn('⚠️ 將嘗試繼續播放')
    }

    const playPromises = Array.from(this.tracks.values()).map((track) =>
      track.play(fadeIn, fadeInDuration).catch((err) => {
        console.warn('⚠️ 播放音效軌道失敗:', err)
      })
    )

    await Promise.allSettled(playPromises)

    this.isPlaying = true
    console.log(`▶️ 播放所有音效${fadeIn ? ' (淡入)' : ''}`)
  }

  /**
   * 停止所有音效
   */
  async stopAll(fadeOut = false, fadeOutDuration = 500) {
    if (this.tracks.size > 0) {
      if (fadeOut) {
        const fadePromises = Array.from(this.tracks.values()).map((track) =>
          track.fadeOutAndStop(fadeOutDuration)
        )
        await Promise.all(fadePromises)
        console.log('⏹️ 淡出並停止所有音效')
      } else {
        this.tracks.forEach((track) => {
          track.stop()
        })
        console.log('⏹️ 停止所有音效')
      }
    }

    this.isPlaying = false
  }

  setTrackVolume(soundEffectId, volume) {
    const track = this.tracks.get(soundEffectId)
    if (track) {
      track.setVolume(volume)
    }
  }

  setMasterVolume(volume) {
    this.audioEngine.setMasterVolume(volume)
  }

  getTracks() {
    return Array.from(this.tracks.values())
  }

  /**
   * 清空所有音效
   */
  async clear(fadeOut = false, fadeOutDuration = 500) {
    if (this.tracks.size > 0) {
      if (fadeOut) {
        await this.stopAll(true, fadeOutDuration)
      } else {
        this.stopAll()
      }
      this.tracks.forEach((track) => track.destroy())
      this.tracks.clear()
      console.log(`🗑️ 清空所有音效軌道${fadeOut ? ' (淡出)' : ''}`)
    }
  }

  getIsPlaying() {
    return this.isPlaying
  }
}

