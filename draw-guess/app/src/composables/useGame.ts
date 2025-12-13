import { ref, computed, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useStoryStore } from '../stores/story'
import { useRealtime } from './useRealtime'
import { supabase } from '../lib/supabase'
import type { StoryboardPhase } from '../types/storyboard'

// 總結頁面顯示時間（秒）
const SUMMARY_TIME = 6

// ========== 分鏡模式配置 ==========
// 各階段時間（秒）
const STORYBOARD_DRAWING_TIME = 60  // 繪畫階段
const STORYBOARD_WRITING_TIME = 60  // 編劇階段
const STORYBOARD_VOTING_TIME = 60   // 投票階段
const STORYBOARD_SUMMARY_TIME = 5   // 結算階段（自動跳轉前的展示時間）

// 分鏡模式得分配置
// Requirements: 6.6, 6.7, 9.4
const SCREENWRITER_WIN_SCORE = 10   // 編劇勝出 +10 分
const DIRECTOR_BASE_SCORE = 5       // 畫家基礎分
const DIRECTOR_VOTE_BONUS = 2       // 每個投票人數 ×2 分
const RATING_BONUS_MULTIPLIER = 3   // 平均評星 ×3 分

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

// ========== 分鏡模式全局狀態 ==========
// 當前分鏡模式階段
// Requirements: 3.5, 4.1, 4.10, 5.1
const globalStoryboardPhase = ref<StoryboardPhase>('setup')

// 分鏡模式階段倒計時
const globalStoryboardTimeRemaining = ref<number | null>(null)
let globalStoryboardTimer: number | null = null

// ========== useGame composable ==========
export function useGame() {
  const roomStore = useRoomStore()
  const gameStore = useGameStore()
  const storyStore = useStoryStore()
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

  // ========== 分鏡模式狀態 ==========
  // Requirements: 3.5, 4.1, 4.10, 5.1
  
  // 是否為分鏡模式
  const isStoryboardMode = computed(() => {
    const room = roomStore.currentRoom as any
    return room?.game_mode === 'storyboard'
  })

  // 當前分鏡模式階段
  const storyboardPhase = globalStoryboardPhase
  const storyboardTimeRemaining = globalStoryboardTimeRemaining

  // 分鏡模式階段判斷
  const isStoryboardDrawing = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'drawing'
  )
  const isStoryboardWriting = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'writing'
  )
  const isStoryboardVoting = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'voting'
  )
  const isStoryboardSummary = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'summary'
  )
  const isStoryboardSetup = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'setup'
  )
  const isStoryboardEnding = computed(() => 
    isStoryboardMode.value && storyboardPhase.value === 'ending'
  )

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
      
      // 自動設定輪數為房間人數（確保每個人都有一次機會畫畫）
      const participantCount = roomStore.participants.length
      const settingsResult = await roomStore.updateRoomSettings({ rounds: participantCount })
      if (!settingsResult.success) {
        return settingsResult
      }
      console.log('[useGame] 輪數已自動設定為房間人數:', participantCount)
      
      // 更新房間狀態為 playing
      const statusResult = await roomStore.updateRoomStatus('playing')
      if (!statusResult.success) {
        return statusResult
      }

      // ========== 分鏡模式特殊處理 ==========
      // Requirements: 2.1 - 分鏡接龍模式遊戲開始時進入 setup 階段
      if (isStoryboardMode.value) {
        console.log('[useGame] 分鏡模式：進入故事設定階段')
        setStoryboardPhase('setup')
        
        // 清除故事數據
        storyStore.clearAll()
        
        // 廣播進入 setup 階段
        const { broadcastGameState } = useRealtime()
        await broadcastGameState(roomStore.currentRoom!.code, {
          roundStatus: 'drawing', // 保持 roundStatus 為 drawing
          storyboardPhase: 'setup',
        })
        
        return { success: true, isStoryboardSetup: true }
      }
      // ========== 分鏡模式特殊處理結束 ==========

      // 傳統模式：直接開始第一輪繪畫（不再有選詞階段）
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
    // 注意：輪數可以超過詞語總數（會重複使用詞語），所以這裡只檢查是否超過設定的總輪數
    // 但由於輪數是動態設定的（等於房間人數），實際上可以無限繼續
    // 只有在用戶明確選擇「結束遊戲」時才結束
    // 因此移除這個檢查，允許無限繼續
    // if (currentRoundNum >= totalRounds.value) {
    //   // 結束遊戲
    //   await endGame()
    //   return { success: false, error: '所有輪次已完成' }
    // }

    try {
      // 選擇畫家（輪流）
      const drawerIndex = (nextRoundNum - 1) % roomStore.participants.length
      const drawer = roomStore.participants[drawerIndex]
      
      console.log('[startDrawingPhase] 第', nextRoundNum, '輪，畫家:', drawer?.nickname)
      
      if (!drawer) {
        throw new Error('無法選擇畫家')
      }

      // ========== 分鏡模式特殊處理 ==========
      // 分鏡模式不需要詞語，使用故事鏈中的最新句子作為繪畫題目
      let word: { text: string; source: 'wordlist' | 'custom' } | null = null
      
      if (isStoryboardMode.value) {
        // 分鏡模式：使用故事鏈中的最新句子作為「詞語」
        const latestSentence = storyStore.latestSentence
        if (latestSentence) {
          word = { text: latestSentence.content, source: 'custom' }
          console.log('[startDrawingPhase] 分鏡模式：使用故事句子作為題目:', word.text)
        } else {
          // 如果沒有故事句子，使用佔位符
          word = { text: '故事開始...', source: 'custom' }
          console.log('[startDrawingPhase] 分鏡模式：沒有故事句子，使用佔位符')
        }
      } else {
        // 傳統模式：獲取下一個詞語
        word = getNextWord()
        if (!word) {
          throw new Error('沒有可用的詞語')
        }
        console.log('[startDrawingPhase] 傳統模式：分配詞語:', word.text)
      }
      // ========== 分鏡模式特殊處理結束 ==========

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
      // 使用服務器返回的 started_at 時間戳，確保所有玩家倒計時同步
      const { broadcastGameState } = useRealtime()
      
      // 根據遊戲模式廣播不同的狀態
      if (isStoryboardMode.value) {
        // 分鏡模式：廣播分鏡模式階段
        await broadcastGameState(roomStore.currentRoom!.code, {
          roundStatus: 'drawing',
          storyboardPhase: 'drawing',
          drawerId: drawer.user_id,
          drawerName: drawer.nickname,
          roundNumber: nextRoundNum,
          startedAt: result.round.started_at,
        })
      } else {
        // 傳統模式：廣播傳統模式狀態
        await broadcastGameState(roomStore.currentRoom!.code, {
          roundStatus: 'drawing',
          wordOptions: [],
          drawerId: drawer.user_id,
          drawerName: drawer.nickname,
          roundNumber: nextRoundNum,
          startedAt: result.round.started_at,
        })
      }

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
      // 1. 更新輪次結束時間（gameStore.endRound 內部會計算畫家得分並寫入數據庫）
      const endResult = await gameStore.endRound()
      if (!endResult.success) {
        return endResult
      }

      // 檢查是否是最後一輪
      // 注意：由於現在支持無限繼續，理論上沒有「最後一輪」的概念
      // 只有在用戶明確選擇「結束遊戲」時才結束
      // 但為了保持向後兼容，我們仍然設置 isLastRound，但永遠為 false
      // 這樣就不會觸發自動結束遊戲的邏輯
      const isLastRound = false  // 永遠為 false，允許無限繼續

      // 2. 廣播進入總結階段（所有人包括房主在回調中統一處理）
      // 數據庫已在 gameStore.endRound() 中更新，這裡只需廣播
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

    // 允許無限進行：不再自動結束遊戲
    await startDrawingPhase()
    return { success: true, gameEnded: false }
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

  // 下一局（不重置任何數據，直接開始下一輪繪畫）
  async function newGame() {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    if (!roomStore.isHost) {
      return { success: false, error: '只有房主可以開始下一局' }
    }

    if (roomStore.currentRoom.status !== 'playing') {
      return { success: false, error: '房間狀態不正確' }
    }

    // 檢查是否在總結階段
    if (roundStatus.value !== 'summary') {
      return { success: false, error: '只能在總結階段開始下一局' }
    }

    try {
      console.log('[useGame] 開始下一局，直接進入下一輪繪畫')

      // 停止總結倒計時
      stopSummaryCountdown()

      // 不重置任何數據：
      // - 不重置房間狀態（保持 playing）
      // - 不重置 current_round（繼續累加）
      // - 不重置已使用詞語索引（繼續累加）
      // - 不重置分數（繼續累加）
      // - 不刪除輪次記錄（保留歷史）
      // - 不調用 clearGame()

      // 直接開始下一輪繪畫
      const roundResult = await startDrawingPhase()
      return roundResult
    } catch (err) {
      console.error('下一局錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '下一局失敗' }
    }
  }

  // 格式化倒計時顯示
  const formattedTime = computed(() => {
    if (timeRemaining.value === null) return '--:--'
    const minutes = Math.floor(timeRemaining.value / 60)
    const seconds = timeRemaining.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  // ========== 分鏡模式階段管理 ==========
  // Requirements: 3.5, 4.1, 4.10, 5.1

  /**
   * 設置分鏡模式階段
   * @param phase 新的階段
   */
  function setStoryboardPhase(phase: StoryboardPhase) {
    console.log('[useGame] 設置分鏡模式階段:', phase)
    globalStoryboardPhase.value = phase
    storyStore.setPhase(phase)
  }

  /**
   * 開始分鏡模式倒計時
   * @param duration 倒計時時長（秒）
   * @param onEnd 倒計時結束回調
   */
  function startStoryboardCountdown(duration: number, onEnd?: () => void) {
    console.log('[useGame] 開始分鏡模式倒計時:', duration, '秒')
    
    if (globalStoryboardTimer) {
      clearInterval(globalStoryboardTimer)
    }

    globalStoryboardTimeRemaining.value = duration

    globalStoryboardTimer = window.setInterval(() => {
      if (globalStoryboardTimeRemaining.value !== null && globalStoryboardTimeRemaining.value > 0) {
        globalStoryboardTimeRemaining.value--
      } else {
        stopStoryboardCountdown()
        if (onEnd) {
          onEnd()
        }
      }
    }, 1000)
  }

  /**
   * 停止分鏡模式倒計時
   */
  function stopStoryboardCountdown() {
    if (globalStoryboardTimer) {
      clearInterval(globalStoryboardTimer)
      globalStoryboardTimer = null
    }
  }

  /**
   * 重置分鏡模式倒計時
   */
  function resetStoryboardCountdown() {
    stopStoryboardCountdown()
    globalStoryboardTimeRemaining.value = null
  }

  /**
   * 進入分鏡模式繪畫階段
   * Requirements: 3.5 - 繪畫時間結束自動進入編劇階段
   */
  async function enterStoryboardDrawingPhase() {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以控制階段' }
    }

    console.log('[useGame] 進入分鏡模式繪畫階段')
    setStoryboardPhase('drawing')
    
    // 清除上一輪的提交和投票數據
    storyStore.clearRoundData()

    // 廣播階段變化
    const { broadcastGameState } = useRealtime()
    await broadcastGameState(roomStore.currentRoom.code, {
      roundStatus: 'drawing',
      storyboardPhase: 'drawing',
      startedAt: new Date().toISOString(),
    })

    return { success: true }
  }

  /**
   * 進入分鏡模式編劇階段
   * Requirements: 4.1 - 繪畫階段結束進入編劇階段
   */
  async function enterStoryboardWritingPhase() {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以控制階段' }
    }

    console.log('[useGame] 進入分鏡模式編劇階段')
    const startedAt = new Date().toISOString()
    
    // 1. 先寫入數據庫（持久化）
    const { error: dbError } = await supabase
      .from('game_rooms')
      .update({ 
        storyboard_phase: 'writing',
        updated_at: startedAt
      })
      .eq('id', roomStore.currentRoom.id)
    
    if (dbError) {
      console.error('[useGame] 更新數據庫失敗:', dbError)
      // 繼續執行，廣播仍然有效
    }
    
    setStoryboardPhase('writing')

    // 2. 再廣播（快速通知）
    const { broadcastGameState } = useRealtime()
    await broadcastGameState(roomStore.currentRoom.code, {
      roundStatus: 'drawing', // 保持 roundStatus 為 drawing，用 storyboardPhase 區分
      storyboardPhase: 'writing',
      startedAt: startedAt,
    })

    return { success: true }
  }

  /**
   * 進入分鏡模式投票階段
   * Requirements: 4.10 - 編劇時間結束自動進入投票階段
   * Requirements: 5.1 - 編劇時間結束進入投票階段並顯示所有提交的句子
   */
  async function enterStoryboardVotingPhase() {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以控制階段' }
    }

    console.log('[useGame] 進入分鏡模式投票階段')
    const startedAt = new Date().toISOString()
    
    // 1. 先寫入數據庫（持久化）
    const { error: dbError } = await supabase
      .from('game_rooms')
      .update({ 
        storyboard_phase: 'voting',
        updated_at: startedAt
      })
      .eq('id', roomStore.currentRoom.id)
    
    if (dbError) {
      console.error('[useGame] 更新數據庫失敗:', dbError)
    }
    
    setStoryboardPhase('voting')

    // 2. 再廣播（快速通知）
    const { broadcastGameState } = useRealtime()
    await broadcastGameState(roomStore.currentRoom.code, {
      roundStatus: 'drawing', // 保持 roundStatus 為 drawing，用 storyboardPhase 區分
      storyboardPhase: 'voting',
      startedAt: startedAt,
    })

    return { success: true }
  }

  /**
   * 進入分鏡模式結算階段
   */
  async function enterStoryboardSummaryPhase() {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以控制階段' }
    }

    console.log('[useGame] 進入分鏡模式結算階段')
    const startedAt = new Date().toISOString()
    
    // 1. 先寫入數據庫（持久化）
    const { error: dbError } = await supabase
      .from('game_rooms')
      .update({ 
        storyboard_phase: 'summary',
        updated_at: startedAt
      })
      .eq('id', roomStore.currentRoom.id)
    
    if (dbError) {
      console.error('[useGame] 更新數據庫失敗:', dbError)
    }
    
    setStoryboardPhase('summary')

    // 2. 再廣播（快速通知）
    const { broadcastGameState } = useRealtime()
    await broadcastGameState(roomStore.currentRoom.code, {
      roundStatus: 'summary',
      storyboardPhase: 'summary',
      startedAt: startedAt,
    })

    return { success: true }
  }

  /**
   * 進入分鏡模式故事結局階段
   * Requirements: 7.7, 7.8 - 最後一局結束時進入故事結局階段
   */
  async function enterStoryboardEndingPhase() {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以控制階段' }
    }

    console.log('[useGame] 進入分鏡模式故事結局階段')
    
    // 1. 先寫入數據庫（持久化）
    const { error: dbError } = await supabase
      .from('game_rooms')
      .update({ 
        storyboard_phase: 'ending',
        updated_at: new Date().toISOString()
      })
      .eq('id', roomStore.currentRoom.id)
    
    if (dbError) {
      console.error('[useGame] 更新數據庫失敗:', dbError)
    }
    
    setStoryboardPhase('ending')

    // 2. 再廣播（快速通知）
    const { broadcastGameState } = useRealtime()
    await broadcastGameState(roomStore.currentRoom.code, {
      roundStatus: 'summary',
      storyboardPhase: 'ending',
    })

    return { success: true }
  }

  // ========== 分鏡模式輪次結算流程 ==========
  // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8

  /** 輪次結算結果類型 */
  interface StoryboardRoundResult {
    success: boolean
    error?: string
    winningSentence?: string
    winnerName?: string
    winnerId?: string
    winnerVoteCount?: number
    drawerScore?: number
    screenwriterScore?: number
    imageUrl?: string
  }

  /**
   * 計算勝出句子
   * Requirements: 6.1, 6.2, 6.3
   * 
   * @returns 勝出的句子及其作者信息
   */
  function calculateWinningSentence(): {
    submission: typeof storyStore.submissions[0] | null
    voteCount: number
    hasTie: boolean
  } {
    const submissions = storyStore.submissions
    const votes = storyStore.votes

    if (submissions.length === 0) {
      console.log('[useGame] 沒有任何提交，使用默認句子')
      return { submission: null, voteCount: 0, hasTie: false }
    }

    // Requirements: 6.1 - 統計每個句子的得票數
    const voteCounts = new Map<string, number>()
    for (const submission of submissions) {
      voteCounts.set(submission.id, 0)
    }
    for (const vote of votes) {
      const current = voteCounts.get(vote.submissionId) || 0
      voteCounts.set(vote.submissionId, current + 1)
    }

    // 找出最高票
    let maxVotes = -1
    let topSubmissions: typeof submissions = []

    for (const submission of submissions) {
      const voteCount = voteCounts.get(submission.id) || 0
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        topSubmissions = [submission]
      } else if (voteCount === maxVotes) {
        topSubmissions.push(submission)
      }
    }

    const hasTie = topSubmissions.length > 1

    // Requirements: 6.2 - 唯一最高票為勝出
    if (topSubmissions.length === 1) {
      console.log('[useGame] 唯一最高票勝出:', topSubmissions[0]?.sentence)
      return { submission: topSubmissions[0] || null, voteCount: maxVotes, hasTie: false }
    }

    // Requirements: 6.3 - 平票時隨機選擇
    const randomIndex = Math.floor(Math.random() * topSubmissions.length)
    const winner = topSubmissions[randomIndex] || null
    console.log('[useGame] 平票隨機選擇勝出:', winner?.sentence, '(共', topSubmissions.length, '個平票)')
    
    return { submission: winner, voteCount: maxVotes, hasTie }
  }

  /**
   * 完成分鏡模式輪次結算
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   * 
   * 此方法整合了完整的輪次結算流程：
   * 1. 計算勝出句子 (6.1, 6.2, 6.3)
   * 2. 上傳畫布截圖 (6.4)
   * 3. 更新 Story_Chain (6.5)
   * 4. 計算並更新玩家得分 (6.6, 6.7)
   * 5. 返回結算結果用於顯示 (6.8)
   * 
   * @param canvas 畫布元素（用於截圖）
   */
  async function finalizeStoryboardRound(
    canvas: HTMLCanvasElement | null
  ): Promise<StoryboardRoundResult> {
    if (!roomStore.currentRoom || !roomStore.isHost) {
      return { success: false, error: '只有房主可以執行結算' }
    }

    if (!gameStore.currentRound) {
      return { success: false, error: '沒有當前輪次' }
    }

    const roundNumber = gameStore.currentRound.round_number
    const drawerId = gameStore.currentRound.drawer_id
    const drawerParticipant = roomStore.participants.find(p => p.user_id === drawerId)
    const drawerName = drawerParticipant?.nickname || '畫家'

    console.log('[useGame] 開始分鏡模式輪次結算，輪次:', roundNumber)

    try {
      // ========== 1. 計算勝出句子 ==========
      // Requirements: 6.1, 6.2, 6.3
      const { submission: winningSubmission, voteCount, hasTie } = calculateWinningSentence()
      
      let winningSentence: string
      let winnerId: string
      let winnerName: string

      if (winningSubmission) {
        winningSentence = winningSubmission.sentence
        winnerId = winningSubmission.userId
        const winnerParticipant = roomStore.participants.find(p => p.user_id === winnerId)
        winnerName = winnerParticipant?.nickname || '編劇'
        
        // 標記勝出句子
        await storyStore.markWinningSubmission(winningSubmission.id)
        
        console.log('[useGame] 勝出句子:', winningSentence, '作者:', winnerName, '票數:', voteCount, '平票:', hasTie)
      } else {
        // Requirements: 5.7 - 沒有任何編劇提交句子時使用默認句子
        winningSentence = '故事繼續發展中...'
        winnerId = drawerId // 默認歸屬畫家
        winnerName = drawerName
        console.log('[useGame] 沒有提交，使用默認句子')
      }

      // ========== 2. 上傳畫布截圖 ==========
      // Requirements: 6.4
      let imageUrl = '/placeholder-image.png'
      
      if (canvas) {
        try {
          // 將 canvas 轉換為 Blob
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png', 0.9)
          })

          if (blob) {
            const { supabase } = await import('../lib/supabase')
            const timestamp = Date.now()
            const fileName = `storyboard/${roomStore.currentRoom!.id}/round_${roundNumber}_${timestamp}.png`

            const { error: uploadError } = await supabase.storage
              .from('canvas-snapshots')
              .upload(fileName, blob, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false,
              })

            if (uploadError) {
              console.error('[useGame] 截圖上傳失敗:', uploadError)
            } else {
              const { data: urlData } = supabase.storage
                .from('canvas-snapshots')
                .getPublicUrl(fileName)
              imageUrl = urlData.publicUrl
              console.log('[useGame] 畫布截圖上傳成功:', imageUrl)
            }
          }
        } catch (err) {
          console.error('[useGame] 截圖上傳錯誤:', err)
        }
      } else {
        console.warn('[useGame] 沒有畫布元素，使用佔位圖')
      }

      // ========== 3. 更新 Story_Chain ==========
      // Requirements: 6.5
      
      // 添加畫布截圖到故事鏈
      await storyStore.addStoryChainItem({
        roomId: roomStore.currentRoom!.id,
        roundNumber,
        itemType: 'image',
        content: imageUrl,
        authorId: drawerId,
        authorName: drawerName,
      })

      // 添加勝出句子到故事鏈
      await storyStore.addStoryChainItem({
        roomId: roomStore.currentRoom!.id,
        roundNumber,
        itemType: 'text',
        content: winningSentence,
        authorId: winnerId,
        authorName: winnerName,
      })

      console.log('[useGame] Story_Chain 已更新')

      // ========== 4. 計算並更新玩家得分 ==========
      // Requirements: 6.6, 6.7
      const voterCount = storyStore.votes.length
      
      // 編劇勝出得分（只有當有實際提交時才給分）
      let screenwriterScore = 0
      if (winningSubmission) {
        screenwriterScore = SCREENWRITER_WIN_SCORE
        await updateStoryboardPlayerScore(winnerId, screenwriterScore)
        console.log('[useGame] 編劇勝出得分:', screenwriterScore, '分給', winnerName)
      }

      // 畫家得分
      const directorScore = DIRECTOR_BASE_SCORE + (voterCount * DIRECTOR_VOTE_BONUS)
      await updateStoryboardPlayerScore(drawerId, directorScore)
      console.log('[useGame] 畫家得分:', directorScore, '分給', drawerName, '(投票人數:', voterCount, ')')

      // ========== 5. 返回結算結果 ==========
      // Requirements: 6.8
      const result: StoryboardRoundResult = {
        success: true,
        winningSentence,
        winnerName,
        winnerId,
        winnerVoteCount: voteCount,
        drawerScore: directorScore,
        screenwriterScore,
        imageUrl,
      }

      console.log('[useGame] 輪次結算完成:', result)
      return result
    } catch (err) {
      console.error('[useGame] 輪次結算錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '輪次結算失敗' }
    }
  }

  /**
   * 獲取畫布元素（用於截圖）
   * 從 DOM 中查找畫布元素
   */
  function getCanvasElement(): HTMLCanvasElement | null {
    // 嘗試從 DOM 中獲取畫布元素
    const canvas = document.querySelector('canvas.drawing-canvas') as HTMLCanvasElement
    if (canvas) {
      return canvas
    }
    
    // 備選：嘗試獲取任何畫布
    const anyCanvas = document.querySelector('canvas') as HTMLCanvasElement
    return anyCanvas || null
  }

  /**
   * 獲取當前分鏡模式階段的時間配置
   */
  function getStoryboardPhaseDuration(phase: StoryboardPhase): number {
    switch (phase) {
      case 'drawing':
        return STORYBOARD_DRAWING_TIME
      case 'writing':
        return STORYBOARD_WRITING_TIME
      case 'voting':
        return STORYBOARD_VOTING_TIME
      default:
        return 0
    }
  }

  // ========== 分鏡模式得分計算 ==========
  // Requirements: 6.6, 6.7, 9.4

  /**
   * 計算編劇勝出得分
   * Requirements: 6.6, 9.2 - 編劇勝出 +10 分
   */
  function calculateScreenwriterWinScore(): number {
    return SCREENWRITER_WIN_SCORE
  }

  /**
   * 計算畫家得分
   * Requirements: 6.7, 9.3 - 畫家 5 + 投票人數×2 分
   * @param voterCount 投票人數
   */
  function calculateDirectorScore(voterCount: number): number {
    return DIRECTOR_BASE_SCORE + (voterCount * DIRECTOR_VOTE_BONUS)
  }

  /**
   * 計算評星加分
   * Requirements: 9.4 - 平均評星 × 3 分
   * @param averageRating 平均評星（1-5）
   */
  function calculateRatingBonus(averageRating: number): number {
    return Math.round(averageRating * RATING_BONUS_MULTIPLIER)
  }

  /**
   * 計算分鏡模式輪次結算得分
   * Requirements: 6.6, 6.7, 9.4
   * 
   * @param winnerId 勝出句子作者 ID
   * @param drawerId 畫家 ID
   * @param voterCount 投票人數
   * @param averageRating 平均評星（可選）
   */
  async function calculateStoryboardRoundScores(
    winnerId: string,
    drawerId: string,
    voterCount: number,
    averageRating: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    try {
      // 1. 編劇勝出得分
      const screenwriterScore = calculateScreenwriterWinScore()
      console.log('[useGame] 編劇勝出得分:', screenwriterScore, '分給', winnerId)
      
      await updateStoryboardPlayerScore(winnerId, screenwriterScore)

      // 2. 畫家得分
      const directorScore = calculateDirectorScore(voterCount)
      console.log('[useGame] 畫家得分:', directorScore, '分給', drawerId, '(投票人數:', voterCount, ')')
      
      await updateStoryboardPlayerScore(drawerId, directorScore)

      // 3. 評星加分（如果有評星）
      if (averageRating > 0) {
        const ratingBonus = calculateRatingBonus(averageRating)
        console.log('[useGame] 評星加分:', ratingBonus, '分給', drawerId, '(平均評星:', averageRating, ')')
        
        await updateStoryboardPlayerScore(drawerId, ratingBonus)
      }

      return { success: true }
    } catch (err) {
      console.error('[useGame] 計算分鏡模式得分錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '計算得分失敗' }
    }
  }

  /**
   * 更新分鏡模式玩家得分
   * @param userId 玩家 ID
   * @param scoreToAdd 要增加的分數
   */
  async function updateStoryboardPlayerScore(userId: string, scoreToAdd: number): Promise<boolean> {
    if (!roomStore.currentRoom) {
      console.error('[useGame] 沒有當前房間')
      return false
    }

    try {
      const { supabase } = await import('../lib/supabase')
      
      // 獲取當前分數
      const { data: participant, error: fetchError } = await supabase
        .from('room_participants')
        .select('score')
        .eq('room_id', roomStore.currentRoom.id)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      const newScore = (participant?.score || 0) + scoreToAdd

      // 更新分數
      const { error: updateError } = await supabase
        .from('room_participants')
        .update({ score: newScore })
        .eq('room_id', roomStore.currentRoom.id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      // 更新本地狀態
      const participantIndex = roomStore.participants.findIndex(p => p.user_id === userId)
      if (participantIndex !== -1 && roomStore.participants[participantIndex]) {
        roomStore.participants[participantIndex].score = newScore
      }

      console.log('[useGame] 玩家', userId, '得分更新為', newScore)
      return true
    } catch (err) {
      console.error('[useGame] 更新玩家分數錯誤:', err)
      return false
    }
  }

  // 清理資源
  onUnmounted(() => {
    stopCountdown()
    stopSummaryCountdown()
    stopStoryboardCountdown()
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
    // 分鏡模式狀態
    isStoryboardMode,
    storyboardPhase,
    storyboardTimeRemaining,
    isStoryboardDrawing,
    isStoryboardWriting,
    isStoryboardVoting,
    isStoryboardSummary,
    isStoryboardSetup,
    isStoryboardEnding,
    // 方法
    startGame,
    newGame,
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
    // 分鏡模式階段管理方法
    setStoryboardPhase,
    startStoryboardCountdown,
    stopStoryboardCountdown,
    resetStoryboardCountdown,
    enterStoryboardDrawingPhase,
    enterStoryboardWritingPhase,
    enterStoryboardVotingPhase,
    enterStoryboardSummaryPhase,
    enterStoryboardEndingPhase,
    getStoryboardPhaseDuration,
    // 分鏡模式輪次結算方法
    // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
    calculateWinningSentence,
    finalizeStoryboardRound,
    getCanvasElement,
    // 分鏡模式得分計算方法
    calculateScreenwriterWinScore,
    calculateDirectorScore,
    calculateRatingBonus,
    calculateStoryboardRoundScores,
    updateStoryboardPlayerScore,
    // 分鏡模式配置常量
    STORYBOARD_DRAWING_TIME,
    STORYBOARD_WRITING_TIME,
    STORYBOARD_VOTING_TIME,
    STORYBOARD_SUMMARY_TIME,
    SCREENWRITER_WIN_SCORE,
    DIRECTOR_BASE_SCORE,
    DIRECTOR_VOTE_BONUS,
    RATING_BONUS_MULTIPLIER,
  }
}