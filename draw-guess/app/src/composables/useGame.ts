import { ref, computed, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useRealtime } from './useRealtime'

// 總結頁面顯示時間（秒）
const SUMMARY_TIME = 3

export function useGame() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const { broadcastGameState: _broadcastGameState, subscribeGameState: _subscribeGameState } = useRealtime()

  // 倒計時相關
  const timeRemaining = ref<number | null>(null) // 剩餘時間（秒）
  const isCountingDown = ref(false)
  let countdownTimer: number | null = null

  // 總結倒計時
  const summaryTimeRemaining = ref<number | null>(null)
  let summaryTimer: number | null = null
  
  // 已使用的詞語索引（用於避免重複）
  const usedWordIndices = ref<Set<number>>(new Set())

  // 遊戲狀態
  const gameStatus = computed(() => roomStore.currentRoom?.status || 'waiting')
  const isPlaying = computed(() => gameStatus.value === 'playing')
  const isWaiting = computed(() => gameStatus.value === 'waiting')
  const isFinished = computed(() => gameStatus.value === 'finished')

  // 輪次狀態（簡化：只有 drawing 和 summary 兩種狀態）
  const roundStatus = computed(() => gameStore.roundStatus)
  const isDrawing = computed(() => roundStatus.value === 'drawing')
  const isSummary = computed(() => roundStatus.value === 'summary')

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

  // 開始總結倒計時（每輪結束後顯示 3 秒總結）
  function startSummaryCountdown() {
    if (summaryTimer) {
      clearInterval(summaryTimer)
    }

    summaryTimeRemaining.value = SUMMARY_TIME
    console.log('[useGame] 開始總結倒計時:', SUMMARY_TIME, '秒')

    summaryTimer = window.setInterval(async () => {
      if (summaryTimeRemaining.value !== null && summaryTimeRemaining.value > 0) {
        summaryTimeRemaining.value--
      } else {
        stopSummaryCountdown()
        console.log('[useGame] 總結倒計時結束, isHost:', roomStore.isHost)
        // 只有房主執行下一輪操作，其他人等待廣播
        if (roomStore.isHost) {
          console.log('[useGame] 房主執行 continueToNextRound')
          await continueToNextRound()
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

  // 獲取下一個詞語（優先使用未用過的，如果都用過則允許重複）
  function getNextWord(): { text: string; source: 'wordlist' | 'custom' } | null {
    if (!roomStore.currentRoom) return null

    const words = roomStore.currentRoom.words as Array<{ text: string; source: 'wordlist' | 'custom' }>
    if (words.length === 0) return null

    // 找出未使用的詞語索引
    const unusedIndices: number[] = []
    for (let i = 0; i < words.length; i++) {
      if (!usedWordIndices.value.has(i)) {
        unusedIndices.push(i)
      }
    }

    let selectedIndex: number = 0
    if (unusedIndices.length > 0) {
      // 隨機選一個未使用的
      const randomIdx = Math.floor(Math.random() * unusedIndices.length)
      selectedIndex = unusedIndices[randomIdx] ?? 0
    } else {
      // 所有詞語都用過了，重置並隨機選一個
      console.log('[useGame] 所有詞語都用過了，重置並重新選擇')
      usedWordIndices.value.clear()
      selectedIndex = Math.floor(Math.random() * words.length)
    }

    // 標記為已使用
    usedWordIndices.value.add(selectedIndex)
    return words[selectedIndex] ?? null
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
      // 重置已使用詞語
      usedWordIndices.value.clear()
      
      // 更新房間狀態為 playing
      const statusResult = await roomStore.updateRoomStatus('playing')
      if (!statusResult.success) {
        return statusResult
      }

      // 直接開始第一輪繪畫（不再有選詞階段）
      const roundResult = await startDrawingPhase()
      return roundResult
    } catch (err) {
      console.error('開始遊戲錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始遊戲失敗' }
    }
  }

  // 開始繪畫階段（系統自動分配畫家和詞語）
  async function startDrawingPhase() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    const currentRoundNum = roomStore.currentRoom.current_round || 0
    // 下一輪的輪次號
    const nextRoundNum = currentRoundNum + 1

    // 檢查是否所有輪次已完成
    if (currentRoundNum >= totalRounds.value) {
      // 結束遊戲
      await endGame()
      return { success: false, error: '所有輪次已完成' }
    }

    try {
      // 選擇畫家（輪流）
      const drawerIndex = (nextRoundNum - 1) % roomStore.participants.length
      const drawer = roomStore.participants[drawerIndex]
      
      console.log('[startDrawingPhase] 第', nextRoundNum, '輪，畫家:', drawer?.nickname)
      
      if (!drawer) {
        throw new Error('無法選擇畫家')
      }

      // 獲取下一個詞語
      const word = getNextWord()
      if (!word) {
        throw new Error('沒有可用的詞語')
      }
      
      console.log('[startDrawingPhase] 分配詞語:', word.text)

      // 更新房間當前畫家
      await roomStore.updateRoomDrawer(drawer.user_id)

      // 創建新輪次
      const result = await gameStore.createRound(
        roomStore.currentRoom.id,
        drawer.user_id,
        word.text,
        word.source
      )

      if (!result.success || !result.round) {
        throw new Error('創建輪次失敗')
      }

      // 進入繪畫階段
      gameStore.setRoundStatus('drawing')
      gameStore.clearRatings()

      // 廣播狀態給所有玩家
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.code, {
        roundStatus: 'drawing',
        wordOptions: [],
        drawerId: drawer.user_id,
        drawerName: drawer.nickname,
        roundNumber: nextRoundNum
      })

      // 開始繪畫倒計時
      startCountdown(drawTime.value)

      return { success: true, drawerId: drawer.user_id, word: word.text }
    } catch (err) {
      console.error('開始繪畫階段錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '開始繪畫階段失敗' }
    }
  }

  // 開始下一輪（直接進入繪畫階段）
  async function startNextRound() {
    return await startDrawingPhase()
  }

  // 結束當前輪次（只應由房主調用，避免競爭條件）
  // 新流程：結束輪次 → 顯示 3 秒總結 → 自動開始下一輪繪畫
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
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.code, {
        roundStatus: 'summary',
        wordOptions: [],
        drawerId: roomStore.currentRoom!.current_drawer_id ?? undefined
      })

      // 檢查是否還有下一輪
      const currentRoundNum = roomStore.currentRoom.current_round || 0
      if (currentRoundNum >= totalRounds.value) {
        // 所有輪次完成，3 秒後結束遊戲
        setTimeout(async () => {
          await endGame()
        }, SUMMARY_TIME * 1000)
        return { success: true, gameEnded: true }
      }

      // 還有下一輪，開始 3 秒總結倒計時
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
      // 直接開始下一輪繪畫
      await startDrawingPhase()
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
    // 輪次狀態（簡化：只有 drawing 和 summary）
    roundStatus,
    isDrawing,
    isSummary,
    summaryTimeRemaining,
    // 方法
    startGame,
    startNextRound,
    startDrawingPhase,
    endRound,
    continueToNextRound,
    endGame,
    startCountdown,
    stopCountdown,
    startSummaryCountdown,
    stopSummaryCountdown,
    resetCountdown,
  }
}