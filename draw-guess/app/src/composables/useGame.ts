import { ref, computed, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useRealtime } from './useRealtime'

// 總結頁面顯示時間（秒）
const SUMMARY_TIME = 6

// ========== 全局單例狀態（所有 useGame() 調用共享） ==========
// 倒計時相關
const globalTimeRemaining = ref<number | null>(null) // 剩餘時間（秒）
const globalIsCountingDown = ref(false)
let globalCountdownTimer: number | null = null

// 總結倒計時
const globalSummaryTimeRemaining = ref<number | null>(null)
let globalSummaryTimer: number | null = null

// 已使用的詞語索引（用於避免重複）
const globalUsedWordIndices = ref<Set<number>>(new Set())

// ========== useGame composable ==========
export function useGame() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const { broadcastGameState: _broadcastGameState, subscribeGameState: _subscribeGameState } = useRealtime()

  // 暴露全局狀態（只讀引用）
  const timeRemaining = globalTimeRemaining
  const isCountingDown = globalIsCountingDown
  const summaryTimeRemaining = globalSummaryTimeRemaining

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
    console.log('[useGame] startCountdown 開始，時長:', duration, '秒')
    
    if (globalCountdownTimer) {
      clearInterval(globalCountdownTimer)
    }

    globalTimeRemaining.value = duration
    globalIsCountingDown.value = true

    globalCountdownTimer = window.setInterval(() => {
      if (globalTimeRemaining.value !== null && globalTimeRemaining.value > 0) {
        globalTimeRemaining.value--
      } else {
        stopCountdown()
        // 倒計時結束，只讓房主自動結束輪次（避免競爭條件）
        if (isPlaying.value && currentRound.value && roomStore.isHost) {
          console.log('[useGame] 倒計時結束，房主執行 endRound')
          endRound()
        }
      }
    }, 1000)
  }

  // 停止倒計時
  function stopCountdown() {
    if (globalCountdownTimer) {
      clearInterval(globalCountdownTimer)
      globalCountdownTimer = null
    }
    globalIsCountingDown.value = false
  }

  // 重置倒計時
  function resetCountdown() {
    stopCountdown()
    globalTimeRemaining.value = null
  }

  // 開始總結倒計時（每輪結束後顯示 3 秒總結）
  function startSummaryCountdown() {
    console.log('[useGame] startSummaryCountdown 開始')
    
    if (globalSummaryTimer) {
      clearInterval(globalSummaryTimer)
    }

    globalSummaryTimeRemaining.value = SUMMARY_TIME
    console.log('[useGame] 開始總結倒計時:', SUMMARY_TIME, '秒')

    globalSummaryTimer = window.setInterval(async () => {
      if (globalSummaryTimeRemaining.value !== null && globalSummaryTimeRemaining.value > 0) {
        globalSummaryTimeRemaining.value--
        console.log('[useGame] 總結倒計時:', globalSummaryTimeRemaining.value)
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
    console.log('[useGame] stopSummaryCountdown')
    if (globalSummaryTimer) {
      clearInterval(globalSummaryTimer)
      globalSummaryTimer = null
    }
    globalSummaryTimeRemaining.value = null
  }

  // 獲取下一個詞語（優先使用未用過的，如果都用過則允許重複）
  function getNextWord(): { text: string; source: 'wordlist' | 'custom' } | null {
    if (!roomStore.currentRoom) return null

    const words = roomStore.currentRoom.words as Array<{ text: string; source: 'wordlist' | 'custom' }>
    if (words.length === 0) return null

    // 找出未使用的詞語索引
    const unusedIndices: number[] = []
    for (let i = 0; i < words.length; i++) {
      if (!globalUsedWordIndices.value.has(i)) {
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
      globalUsedWordIndices.value.clear()
      selectedIndex = Math.floor(Math.random() * words.length)
    }

    // 標記為已使用
    globalUsedWordIndices.value.add(selectedIndex)
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
      globalUsedWordIndices.value.clear()
      
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
  // 只有房主調用此函數，負責準備數據並廣播
  // 所有人（包括房主）在收到廣播後統一執行狀態更新
  async function startDrawingPhase() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }
    
    // 只有房主可以發起新輪次
    if (!roomStore.isHost) {
      return { success: false, error: '只有房主可以發起新輪次' }
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

      // 廣播狀態給所有玩家（包括房主自己，統一在回調中處理）
      // 使用 result.round.started_at 作為統一時間基準
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.code, {
        roundStatus: 'drawing',
        wordOptions: [],
        drawerId: drawer.user_id,
        drawerName: drawer.nickname,
        roundNumber: nextRoundNum,
        startedAt: result.round.started_at  // 傳遞開始時間用於同步倒計時
      })

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
  // 房主負責：更新數據庫 + 發廣播
  // 所有人（包括房主）在收到廣播後統一執行狀態更新
  async function endRound() {
    if (!currentRound.value || !roomStore.currentRoom) {
      return { success: false, error: '沒有當前輪次' }
    }

    // 只允許房主執行結束輪次操作
    if (!roomStore.isHost) {
      return { success: false, error: '只有房主可以結束輪次' }
    }

    try {
      // 更新輪次結束時間（gameStore.endRound 內部會計算畫家得分）
      const endResult = await gameStore.endRound()
      if (!endResult.success) {
        return endResult
      }

      // 檢查是否是最後一輪
      const currentRoundNum = roomStore.currentRoom.current_round || 0
      const isLastRound = currentRoundNum >= totalRounds.value

      // 廣播進入總結階段（所有人包括房主在回調中統一處理）
      const { broadcastGameState } = useRealtime()
      await broadcastGameState(roomStore.currentRoom!.code, {
        roundStatus: 'summary',
        wordOptions: [],
        drawerId: roomStore.currentRoom!.current_drawer_id ?? undefined,
        isLastRound: isLastRound
      })

      return { success: true, gameEnded: isLastRound }
    } catch (err) {
      console.error('結束輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '結束輪次失敗' }
    }
  }

  // 從總結階段繼續到下一輪（只有房主調用）
  async function continueToNextRound() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }
    
    // 只有房主可以發起下一輪
    if (!roomStore.isHost) {
      return { success: false, error: '只有房主可以發起下一輪' }
    }

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