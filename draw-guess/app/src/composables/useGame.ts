import { ref, computed, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore, type WordOption } from '../stores/game'
import { useRealtime } from './useRealtime'

// 選詞時間（秒）
const SELECTION_TIME = 15
// 總結時間（秒）
const SUMMARY_TIME = 8

export function useGame() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const { broadcastGameState, subscribeGameState } = useRealtime()

  // 倒計時相關
  const timeRemaining = ref<number | null>(null) // 剩餘時間（秒）
  const isCountingDown = ref(false)
  let countdownTimer: number | null = null

  // 選詞倒計時
  const selectionTimeRemaining = ref<number | null>(null)
  let selectionTimer: number | null = null

  // 總結倒計時
  const summaryTimeRemaining = ref<number | null>(null)
  let summaryTimer: number | null = null

  // 遊戲狀態
  const gameStatus = computed(() => roomStore.currentRoom?.status || 'waiting')
  const isPlaying = computed(() => gameStatus.value === 'playing')
  const isWaiting = computed(() => gameStatus.value === 'waiting')
  const isFinished = computed(() => gameStatus.value === 'finished')

  // 輪次狀態
  const roundStatus = computed(() => gameStore.roundStatus)
  const isSelecting = computed(() => roundStatus.value === 'selecting')
  const isDrawing = computed(() => roundStatus.value === 'drawing')
  const isSummary = computed(() => roundStatus.value === 'summary')

  // 當前輪次信息
  const currentRound = computed(() => gameStore.currentRound)
  const currentRoundNumber = computed(() => roomStore.currentRoom?.current_round || 0)
  const totalRounds = computed(() => roomStore.currentRoom?.settings.rounds || 0)
  const drawTime = computed(() => roomStore.currentRoom?.settings.draw_time || 60)

  // 詞語選項
  const wordOptions = computed(() => gameStore.wordOptions)

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
        // 倒計時結束，只讓房主自動結束輪次（避免競爭條件）
        if (isPlaying.value && currentRound.value && roomStore.isHost) {
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

  // 開始選詞倒計時
  function startSelectionCountdown() {
    if (selectionTimer) {
      clearInterval(selectionTimer)
    }

    selectionTimeRemaining.value = SELECTION_TIME

    selectionTimer = window.setInterval(() => {
      if (selectionTimeRemaining.value !== null && selectionTimeRemaining.value > 0) {
        selectionTimeRemaining.value--
      } else {
        stopSelectionCountdown()
        // 選詞超時，只讓房主自動選擇第一個詞
        if (isSelecting.value && roomStore.isHost && wordOptions.value.length > 0) {
          const firstOption = wordOptions.value[0]
          if (firstOption) {
            selectWord(firstOption)
          }
        }
      }
    }, 1000)
  }

  // 停止選詞倒計時
  function stopSelectionCountdown() {
    if (selectionTimer) {
      clearInterval(selectionTimer)
      selectionTimer = null
    }
    selectionTimeRemaining.value = null
  }

  // 開始總結倒計時
  function startSummaryCountdown() {
    if (summaryTimer) {
      clearInterval(summaryTimer)
    }

    summaryTimeRemaining.value = SUMMARY_TIME

    summaryTimer = window.setInterval(() => {
      if (summaryTimeRemaining.value !== null && summaryTimeRemaining.value > 0) {
        summaryTimeRemaining.value--
      } else {
        stopSummaryCountdown()
        // 總結結束，房主開始下一輪
        if (isSummary.value && roomStore.isHost) {
          continueToNextRound()
        }
      }
    }, 1000)
  }

  // 停止總結倒計時
  function stopSummaryCountdown() {
    if (summaryTimer) {
      clearInterval(summaryTimer)
      summaryTimer = null
    }
    summaryTimeRemaining.value = null
  }

  // 生成詞語選項（從剩餘詞庫中隨機選取3個）
  function generateWordOptions(): WordOption[] {
    if (!roomStore.currentRoom) return []

    const words = roomStore.currentRoom.words as Array<{ text: string; source: 'wordlist' | 'custom' }>
    const currentRoundNum = roomStore.currentRoom.current_round || 0
    
    // 獲取剩餘的詞語
    const remainingWords = words.slice(currentRoundNum)
    
    if (remainingWords.length === 0) return []

    // 隨機打亂並選取最多3個
    const shuffled = [...remainingWords].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(3, shuffled.length))

    return selected.map(w => ({
      text: w.text,
      source: w.source,
    }))
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

      // 開始第一輪的選詞階段
      const roundResult = await startSelectionPhase()
      return roundResult
    } catch (err) {
      console.error('開始遊戲錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始遊戲失敗' }
    }
  }

  // 開始選詞階段
  async function startSelectionPhase() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    const currentRoundNum = roomStore.currentRoom.current_round || 0

    // 檢查是否所有輪次已完成
    if (currentRoundNum >= totalRounds.value) {
      // 結束遊戲
      await endGame()
      return { success: false, error: '所有輪次已完成' }
    }

    try {
      // 選擇畫家（輪流）
      const drawerIndex = currentRoundNum % roomStore.participants.length
      const drawer = roomStore.participants[drawerIndex]
      
      if (!drawer) {
        throw new Error('無法選擇畫家')
      }

      // 生成詞語選項
      const options = generateWordOptions()
      if (options.length === 0) {
        throw new Error('沒有可用的詞語')
      }

      // 更新 store
      gameStore.setWordOptions(options)
      gameStore.setRoundStatus('selecting')
      gameStore.clearRatings()

      // 更新房間當前畫家
      await roomStore.updateRoomDrawer(drawer.user_id)

      // 廣播狀態給所有玩家
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.room_code, {
        roundStatus: 'selecting',
        wordOptions: options,
        drawerId: drawer.user_id
      })

      // 開始選詞倒計時
      startSelectionCountdown()

      return { success: true, drawerId: drawer.user_id, options }
    } catch (err) {
      console.error('開始選詞階段錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始選詞階段失敗' }
    }
  }

  // 選擇詞語（畫家選擇後調用）
  async function selectWord(option: WordOption) {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    // 停止選詞倒計時
    stopSelectionCountdown()

    try {
      // 獲取當前畫家
      const drawerId = roomStore.currentRoom.current_drawer_id
      if (!drawerId) {
        throw new Error('沒有當前畫家')
      }

      // 創建新輪次
      const result = await gameStore.createRound(
        roomStore.currentRoom.id,
        drawerId,
        option.text,
        option.source
      )

      if (result.success && result.round) {
        // 進入繪畫階段
        gameStore.setRoundStatus('drawing')
        gameStore.setWordOptions([])

        // 廣播狀態給所有玩家
        const { broadcastGameState } = useRealtime()
        await broadcastGameState(roomStore.currentRoom!.room_code, {
          roundStatus: 'drawing',
          wordOptions: [],
          drawerId: drawerId
        })

        // 開始繪畫倒計時
        startCountdown(drawTime.value)
      }

      return result
    } catch (err) {
      console.error('選擇詞語錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '選擇詞語失敗' }
    }
  }

  // 開始下一輪（兼容舊代碼，內部調用選詞階段）
  async function startNextRound() {
    return await startSelectionPhase()
  }

  // 結束當前輪次（只應由房主調用，避免競爭條件）
  async function endRound() {
    if (!currentRound.value || !roomStore.currentRoom) {
      return { success: false, error: '沒有當前輪次' }
    }

    // 只允許房主執行結束輪次操作
    if (!roomStore.isHost) {
      return { success: false, error: '只有房主可以結束輪次' }
    }

    try {
      // 停止倒計時
      stopCountdown()

      // 更新輪次結束時間（gameStore.endRound 內部會計算畫家得分）
      const endResult = await gameStore.endRound()
      if (!endResult.success) {
        return endResult
      }

      // 進入總結階段
      gameStore.setRoundStatus('summary')

      // 廣播狀態給所有玩家
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.room_code, {
        roundStatus: 'summary',
        wordOptions: [],
        drawerId: roomStore.currentRoom!.current_drawer_id
      })

      // 開始總結倒計時
      startSummaryCountdown()

      return { success: true, gameEnded: false }
    } catch (err) {
      console.error('結束輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '結束輪次失敗' }
    }
  }

  // 從總結階段繼續到下一輪
  async function continueToNextRound() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    // 停止總結倒計時
    stopSummaryCountdown()

    // 檢查是否還有下一輪
    const currentRoundNum = roomStore.currentRoom.current_round || 0
    if (currentRoundNum >= totalRounds.value) {
      // 所有輪次完成，結束遊戲
      await endGame()
      return { success: true, gameEnded: true }
    } else {
      // 開始下一輪選詞階段
      await startSelectionPhase()
      return { success: true, gameEnded: false }
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

  // 跳過當前詞語（僅畫家可用）
  async function skipWord() {
    if (!currentRound.value || !roomStore.currentRoom) {
      return { success: false, error: '沒有當前輪次' }
    }

    // 只允許當前畫家跳過
    if (!isCurrentDrawer.value) {
      return { success: false, error: '只有畫家可以跳過詞語' }
    }

    try {
      // 結束當前輪次（不計分）
      stopCountdown()

      // 直接開始下一輪
      const roundResult = await startNextRound()
      return roundResult
    } catch (err) {
      console.error('跳過詞語錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '跳過詞語失敗' }
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
    stopSelectionCountdown()
    stopSummaryCountdown()
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
    // 輪次狀態
    roundStatus,
    isSelecting,
    isDrawing,
    isSummary,
    wordOptions,
    selectionTimeRemaining,
    summaryTimeRemaining,
    // 方法
    startGame,
    startNextRound,
    startSelectionPhase,
    selectWord,
    endRound,
    continueToNextRound,
    endGame,
    skipWord,
    startCountdown,
    stopCountdown,
    resetCountdown,
  }
}

