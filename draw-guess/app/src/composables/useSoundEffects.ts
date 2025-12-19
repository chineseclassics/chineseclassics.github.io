import { useSoundStore } from '../stores/sound'

/**
 * 音效管理器
 * 使用 Web Audio API 程序化生成遊戲音效
 */

// 全局 AudioContext（懶加載）
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // 確保 AudioContext 處於運行狀態
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/**
 * 播放單個音調
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 1,
  globalVolume: number = 0.5
) {
  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(volume * globalVolume * 0.5, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

/**
 * 播放音符序列
 */
function playSequence(
  notes: Array<{ freq: number; duration?: number; type?: OscillatorType; volume?: number }>,
  interval: number = 0.1,
  globalVolume: number = 0.5
) {
  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(
        note.freq,
        note.duration || 0.15,
        note.type || 'sine',
        note.volume || 0.5,
        globalVolume
      )
    }, index * interval * 1000)
  })
}

/**
 * 音效 Composable
 */
export function useSoundEffects() {
  const soundStore = useSoundStore()

  // 檢查是否可以播放音效
  function canPlay(): boolean {
    return soundStore.soundEnabled
  }

  // 獲取當前音量
  function getVolume(): number {
    return soundStore.volume
  }

  // ============ 遊戲流程音效 ============

  /**
   * 遊戲開始 - 歡快的上升旋律
   */
  function playGameStart() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 523, duration: 0.15 },  // C5
      { freq: 659, duration: 0.15 },  // E5
      { freq: 784, duration: 0.15 },  // G5
      { freq: 1047, duration: 0.3 },  // C6
    ], 0.12, vol)
  }

  /**
   * 新一輪開始 - 清脆鈴聲
   */
  function playRoundStart() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 880, duration: 0.1, type: 'triangle' },
      { freq: 1100, duration: 0.2, type: 'triangle' },
    ], 0.08, vol)
  }

  /**
   * 題目揭曉 - 神秘音效
   */
  function playWordReveal() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 400, duration: 0.1 },
      { freq: 600, duration: 0.1 },
      { freq: 800, duration: 0.25 },
    ], 0.1, vol)
  }

  /**
   * 輪次結束
   */
  function playRoundEnd() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 660, duration: 0.15 },
      { freq: 550, duration: 0.15 },
      { freq: 440, duration: 0.25 },
    ], 0.12, vol)
  }

  /**
   * 一局完成 - 慶祝旋律
   */
  function playGameComplete() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 523, duration: 0.12 },
      { freq: 659, duration: 0.12 },
      { freq: 784, duration: 0.12 },
      { freq: 1047, duration: 0.15 },
      { freq: 784, duration: 0.1 },
      { freq: 1047, duration: 0.3 },
    ], 0.1, vol)
  }

  /**
   * 遊戲勝利
   */
  function playVictory() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 392, duration: 0.15 },  // G4
      { freq: 523, duration: 0.15 },  // C5
      { freq: 659, duration: 0.15 },  // E5
      { freq: 784, duration: 0.2 },   // G5
      { freq: 659, duration: 0.1 },   // E5
      { freq: 784, duration: 0.15 },  // G5
      { freq: 1047, duration: 0.4 },  // C6
    ], 0.12, vol)
  }

  // ============ 猜詞互動音效 ============

  /**
   * 猜中 - 歡快的成功音
   */
  function playGuessCorrect() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 600, duration: 0.1, type: 'triangle' },
      { freq: 800, duration: 0.1, type: 'triangle' },
      { freq: 1000, duration: 0.2, type: 'triangle' },
    ], 0.08, vol)
  }

  /**
   * 猜錯 - 輕柔的錯誤音
   */
  function playGuessWrong() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 300, duration: 0.15, volume: 0.3 },
      { freq: 250, duration: 0.2, volume: 0.25 },
    ], 0.12, vol)
  }

  /**
   * 他人猜中 - 輕微通知
   */
  function playOtherCorrect() {
    if (!canPlay()) return
    playTone(880, 0.12, 'triangle', 0.3, getVolume())
  }

  /**
   * 第一個猜中 - 特別獎勵
   */
  function playFirstCorrect() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 800, duration: 0.1, type: 'triangle' },
      { freq: 1000, duration: 0.1, type: 'triangle' },
      { freq: 1200, duration: 0.15, type: 'triangle' },
      { freq: 1600, duration: 0.25, type: 'triangle' },
    ], 0.08, vol)
  }

  // ============ 倒計時音效 ============

  /**
   * 倒計時滴答
   */
  function playCountdownTick() {
    if (!canPlay()) return
    playTone(600, 0.05, 'square', 0.2, getVolume())
  }

  /**
   * 最後幾秒警告
   */
  function playTimeWarning() {
    if (!canPlay()) return
    playTone(800, 0.08, 'square', 0.4, getVolume())
  }

  /**
   * 時間到
   */
  function playTimeUp() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 800, duration: 0.15, type: 'square', volume: 0.5 },
      { freq: 600, duration: 0.15, type: 'square', volume: 0.5 },
      { freq: 400, duration: 0.3, type: 'square', volume: 0.5 },
    ], 0.12, vol)
  }

  // ============ 評分音效 ============

  /**
   * 星星評分 (1-5)
   */
  function playStarClick(stars: number) {
    if (!canPlay()) return
    const vol = getVolume()
    const baseFreq = 400 + (stars * 100) // 500, 600, 700, 800, 900
    playTone(baseFreq, 0.12, 'triangle', 0.4, vol)

    // 5星特效
    if (stars === 5) {
      setTimeout(() => {
        playSequence([
          { freq: 1000, duration: 0.08 },
          { freq: 1200, duration: 0.08 },
          { freq: 1400, duration: 0.15 },
        ], 0.06, vol)
      }, 100)
    }
  }

  /**
   * 通用點擊
   */
  function playClick() {
    if (!canPlay()) return
    playTone(700, 0.05, 'sine', 0.3, getVolume())
  }

  // ============ 分鏡模式音效 ============

  /**
   * 階段切換 - 翻頁效果
   */
  function playPhaseChange() {
    if (!canPlay()) return
    const vol = getVolume()
    const ctx = getAudioContext()
    
    // 模擬翻頁的白噪音效果
    const bufferSize = ctx.sampleRate * 0.15
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      // 快速衰減的白噪音
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3
    }

    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()
    source.buffer = buffer
    gainNode.gain.value = vol

    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start()

    // 加上一個輕微的音調
    setTimeout(() => playTone(550, 0.1, 'sine', 0.3, vol), 80)
  }

  /**
   * 投票選擇
   */
  function playVoteSelect() {
    if (!canPlay()) return
    const vol = getVolume()
    playSequence([
      { freq: 600, duration: 0.08 },
      { freq: 750, duration: 0.12 },
    ], 0.06, vol)
  }

  /**
   * 勝出揭曉 - 戲劇性
   */
  function playWinnerReveal() {
    if (!canPlay()) return
    const vol = getVolume()
    
    // 鼓點效果
    playTone(150, 0.15, 'sine', 0.5, vol)
    setTimeout(() => playTone(150, 0.15, 'sine', 0.5, vol), 200)
    setTimeout(() => playTone(150, 0.15, 'sine', 0.5, vol), 400)

    // 揭曉音
    setTimeout(() => {
      playSequence([
        { freq: 523, duration: 0.15 },
        { freq: 659, duration: 0.15 },
        { freq: 784, duration: 0.15 },
        { freq: 1047, duration: 0.35 },
      ], 0.1, vol)
    }, 600)
  }

  return {
    // 遊戲流程
    playGameStart,
    playRoundStart,
    playWordReveal,
    playRoundEnd,
    playGameComplete,
    playVictory,
    // 猜詞互動
    playGuessCorrect,
    playGuessWrong,
    playOtherCorrect,
    playFirstCorrect,
    // 倒計時
    playCountdownTick,
    playTimeWarning,
    playTimeUp,
    // 評分
    playStarClick,
    playClick,
    // 分鏡模式
    playPhaseChange,
    playVoteSelect,
    playWinnerReveal,
  }
}

