import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * 音效狀態管理
 * 管理音效開關和音量設定，並持久化到 localStorage
 */
export const useSoundStore = defineStore('sound', () => {
  // 從 localStorage 讀取設定
  const storedEnabled = localStorage.getItem('sound-enabled')
  const storedVolume = localStorage.getItem('sound-volume')

  // 音效開關
  const soundEnabled = ref(storedEnabled !== null ? storedEnabled === 'true' : true)
  
  // 音量 (0-1)
  const volume = ref(storedVolume !== null ? parseFloat(storedVolume) : 0.5)

  // 監聽變化並保存到 localStorage
  watch(soundEnabled, (newValue) => {
    localStorage.setItem('sound-enabled', String(newValue))
  })

  watch(volume, (newValue) => {
    localStorage.setItem('sound-volume', String(newValue))
  })

  // 切換音效開關
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }

  // 設定音量
  function setVolume(newVolume: number) {
    volume.value = Math.max(0, Math.min(1, newVolume))
  }

  // 靜音
  function mute() {
    soundEnabled.value = false
  }

  // 取消靜音
  function unmute() {
    soundEnabled.value = true
  }

  return {
    soundEnabled,
    volume,
    toggleSound,
    setVolume,
    mute,
    unmute,
  }
})

