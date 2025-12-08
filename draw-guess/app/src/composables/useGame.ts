import { ref, computed, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useScoring } from './useScoring'

export function useGame() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const { updateDrawerScore } = useScoring()

  // 倒計時相關
  const timeRemaining = ref<number | null>(null) // 剩餘時間（秒）
  const isCountingDown = ref(false)
  let countdownTimer: number | null = null

  // 遊戲狀態
  const gameStatus = computed(() => roomStore.currentRoom?.status || 'waiting')
  const isPlaying = computed(() => gameStatus.value === 'playing')
  const isWaiting = computed(() => gameStatus.value === 'waiting')
  const isFinished = computed(() => gameStatus.value === 'finished')

  // 當前輪次信息
  const currentRound = computed(() => gameStore.currentRound)
  const currentRoundNumber = computed(() => roomStore.currentRoom?.current_round || 0)
  const totalRounds = computed(() => roomStore.currentRoom?.settings.rounds || 0)
  const drawTime = computed(() => roomStore.currentRoom?.settings.draw_time || 60)

  // 是否為當前畫家
  const isCurrentDrawer = computed(() => gameStore.isCurrentDrawer)

  // 開始倒計時
  function startCountdown(duration: number) {
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }

    timeRemaining.value = duration
    isCountingDown.value = true

    countdownTimer = window.setInterval(() => {
      if (timeRemaining.value !== null && timeRemaining.value > 0) {
        timeRemaining.value--
      } else {
        stopCountdown()
        // 倒計時結束，自動結束輪次
        if (isPlaying.value && currentRound.value) {
          endRound()
        }
      }
    }, 1000)
  }

  // 停止倒計時
  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    isCountingDown.value = false
  }

  // 重置倒計時
  function resetCountdown() {
    stopCountdown()
    timeRemaining.value = null
  }

  // 開始遊戲
  async function startGame() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    if (roomStore.currentRoom.status !== 'waiting') {
      return { success: false, error: '房間狀態不正確' }
    }

    if (roomStore.participants.length < 2) {
      return { success: false, error: '至少需要 2 個玩家才能開始遊戲' }
    }

    try {
      // 更新房間狀態為 playing
      const statusResult = await roomStore.updateRoomStatus('playing')
      if (!statusResult.success) {
        return statusResult
      }

      // 開始第一輪
      const roundResult = await startNextRound()
      return roundResult
    } catch (err) {
      console.error('開始遊戲錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始遊戲失敗' }
    }
  }

  // 開始下一輪
  async function startNextRound() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    const words = roomStore.currentRoom.words as Array<{ text: string; source: 'wordlist' | 'custom' }>
    const currentRoundNum = roomStore.currentRoom.current_round || 0

    // 檢查是否所有輪次已完成
    if (currentRoundNum >= words.length || currentRoundNum >= totalRounds.value) {
      // 結束遊戲
      await endGame()
      return { success: false, error: '所有輪次已完成' }
    }

    try {
      // 選擇當前詞語
      const word = words[currentRoundNum]
      
      // 選擇畫家（輪流）
      const drawerIndex = currentRoundNum % roomStore.participants.length
      const drawer = roomStore.participants[drawerIndex]
      
      if (!drawer || !word) {
        throw new Error('無法選擇畫家或詞語')
      }

      // 創建新輪次
      const result = await gameStore.createRound(
        roomStore.currentRoom.id,
        drawer.user_id,
        word.text,
        word.source
      )

      if (result.success && result.round) {
        // 開始倒計時
        startCountdown(drawTime.value)
      }

      return result
    } catch (err) {
      console.error('開始下一輪錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始下一輪失敗' }
    }
  }

  // 結束當前輪次
  async function endRound() {
    if (!currentRound.value || !roomStore.currentRoom) {
      return { success: false, error: '沒有當前輪次' }
    }

    try {
      // 停止倒計時
      stopCountdown()

      // 計算畫家得分
      const correctCount = gameStore.correctGuesses.length
      await updateDrawerScore(currentRound.value.drawer_id, correctCount)

      // 更新輪次結束時間
      const endResult = await gameStore.endRound()
      if (!endResult.success) {
        return endResult
      }

      // 檢查是否還有下一輪
      const currentRoundNum = roomStore.currentRoom.current_round || 0
      if (currentRoundNum >= totalRounds.value) {
        // 所有輪次完成，結束遊戲
        await endGame()
        return { success: true, gameEnded: true }
      } else {
        // 開始下一輪（延遲一下，讓玩家看到結果）
        setTimeout(async () => {
          await startNextRound()
        }, 2000)
        return { success: true, gameEnded: false }
      }
    } catch (err) {
      console.error('結束輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '結束輪次失敗' }
    }
  }

  // 結束遊戲
  async function endGame() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    try {
      // 停止倒計時
      stopCountdown()

      // 更新房間狀態為 finished
      await roomStore.updateRoomStatus('finished')

      return { success: true }
    } catch (err) {
      console.error('結束遊戲錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '結束遊戲失敗' }
    }
  }

  // 格式化倒計時顯示
  const formattedTime = computed(() => {
    if (timeRemaining.value === null) return '--:--'
    const minutes = Math.floor(timeRemaining.value / 60)
    const seconds = timeRemaining.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  // 清理資源
  onUnmounted(() => {
    stopCountdown()
  })

  return {
    // 狀態
    gameStatus,
    isPlaying,
    isWaiting,
    isFinished,
    currentRound,
    currentRoundNumber,
    totalRounds,
    drawTime,
    isCurrentDrawer,
    timeRemaining,
    isCountingDown,
    formattedTime,
    // 方法
    startGame,
    startNextRound,
    endRound,
    endGame,
    startCountdown,
    stopCountdown,
    resetCountdown,
  }
}

