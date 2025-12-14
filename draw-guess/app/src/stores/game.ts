import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { useRoomStore } from './room'
import { useScoring } from '../composables/useScoring'

// 輪次狀態類型
export type RoundStatus = 'selecting' | 'drawing' | 'summary'

// 詞語選項接口
export interface WordOption {
  text: string
  source: 'wordlist' | 'custom'
  difficulty?: 'easy' | 'medium' | 'hard'
}

// 評分接口
export interface DrawingRating {
  id: string
  round_id: string
  rater_id: string
  drawer_id: string
  rating: number
  rated_at: string
}

// 遊戲輪次接口
export interface GameRound {
  id: string
  room_id: string
  round_number: number
  drawer_id: string
  word_text: string
  word_source: 'wordlist' | 'custom'
  word_options?: WordOption[]
  status: RoundStatus
  started_at: string
  ended_at: string | null
}

// 猜測記錄接口
export interface Guess {
  id: string
  round_id: string
  user_id: string
  guess_text: string
  is_correct: boolean
  score_earned: number
  guessed_at: string
}

export const useGameStore = defineStore('game', () => {
  const roomStore = useRoomStore()
  const authStore = useAuthStore()

  // 當前輪次
  const currentRound = ref<GameRound | null>(null)
  const currentWord = ref<string | null>(null) // 當前詞語（僅畫家可見）
  const guesses = ref<Guess[]>([]) // 整場遊戲的猜測記錄（累積所有輪次）
  const correctGuesses = computed(() => guesses.value.filter(g => g.is_correct))
  // 當前輪次的猜測記錄
  const currentRoundGuesses = computed(() => {
    if (!currentRound.value) return []
    return guesses.value.filter(g => g.round_id === currentRound.value!.id)
  })
  const currentRoundCorrectGuesses = computed(() => currentRoundGuesses.value.filter(g => g.is_correct))

  // 輪次狀態管理
  const roundStatus = ref<RoundStatus>('drawing')
  const wordOptions = ref<WordOption[]>([])
  const ratings = ref<DrawingRating[]>([])
  
  // 提示功能狀態
  const hintGiven = ref(false) // 當前輪次是否已給提示
  const revealedIndices = ref<number[]>([]) // 已揭示的字符索引
  const averageRating = computed(() => {
    if (ratings.value.length === 0) return 0
    const sum = ratings.value.reduce((acc, r) => acc + r.rating, 0)
    return sum / ratings.value.length
  })

  // 設置輪次狀態
  function setRoundStatus(status: RoundStatus) {
    roundStatus.value = status
  }

  // 設置詞語選項
  function setWordOptions(options: WordOption[]) {
    wordOptions.value = options
  }

  // 添加評分
  function addRating(rating: DrawingRating) {
    // 檢查是否已經評過分
    const existingIndex = ratings.value.findIndex(r => r.rater_id === rating.rater_id)
    if (existingIndex >= 0) {
      ratings.value[existingIndex] = rating
    } else {
      ratings.value.push(rating)
    }
  }

  // 清除輪次評分
  function clearRatings() {
    ratings.value = []
  }

  // 給提示（揭示一個隨機字符）
  function giveHint(): number | null {
    if (hintGiven.value || !currentWord.value) return null
    
    const wordLength = currentWord.value.length
    // 找出尚未揭示的索引
    const unrevealedIndices: number[] = []
    for (let i = 0; i < wordLength; i++) {
      if (!revealedIndices.value.includes(i)) {
        unrevealedIndices.push(i)
      }
    }
    
    if (unrevealedIndices.length === 0) return null
    
    // 隨機選一個揭示
    const randomIdx = Math.floor(Math.random() * unrevealedIndices.length)
    const revealIdx = unrevealedIndices[randomIdx]
    if (revealIdx === undefined) return null
    
    revealedIndices.value.push(revealIdx)
    hintGiven.value = true
    
    return revealIdx
  }

  // 設置提示狀態（用於廣播同步）
  function setHintState(given: boolean, indices: number[]) {
    hintGiven.value = given
    revealedIndices.value = indices
  }

  // 重置提示狀態（新輪次時調用）
  function resetHint() {
    hintGiven.value = false
    revealedIndices.value = []
  }

  // 載入當前輪次
  // isSummaryPhase: 如果為 true，表示在總結階段，所有人都可以看到詞語
  async function loadCurrentRound(roomId: string, isSummaryPhase: boolean = false) {
    try {
      const { data, error } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('room_id', roomId)
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        currentRound.value = data as GameRound
        
        // 總結階段：所有人都可以看到答案
        // 繪畫階段：只有畫家才能看到詞語，避免其他玩家短暫看到答案
        if (isSummaryPhase || (authStore.user && data.drawer_id === authStore.user.id)) {
          currentWord.value = data.word_text
        } else {
          // 非畫家在繪畫階段：清除詞語
          currentWord.value = null
        }
        
        // 注意：不要從數據庫同步 roundStatus！
        // 因為 'summary' 狀態只存在於前端內存中，數據庫沒有這個狀態
        // 如果從數據庫同步，會覆蓋掉 'summary' 狀態，導致總結頁面一閃而過
        // roundStatus 完全由前端的 gameStore.setRoundStatus() 控制
        
        // 同步詞語選項（如果有）
        if (data.word_options && Array.isArray(data.word_options)) {
          wordOptions.value = data.word_options as WordOption[]
        }
        
        // 恢復提示狀態（頁面刷新時從數據庫恢復）
        if (data.hint_given !== undefined) {
          hintGiven.value = data.hint_given
        }
        if (data.revealed_indices && Array.isArray(data.revealed_indices)) {
          revealedIndices.value = data.revealed_indices as number[]
        }
        
        await loadGuesses(data.id)
      } else {
        // 沒有輪次，可能是選詞階段
        // 不重置 roundStatus，讓它保持當前狀態
      }

      return { success: true, round: data }
    } catch (err) {
      console.error('載入當前輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '載入輪次失敗' }
    }
  }

  // 載入猜測記錄（追加到現有記錄，不覆蓋）
  async function loadGuesses(roundId: string) {
    try {
      const { data, error } = await supabase
        .from('guesses')
        .select('*')
        .eq('round_id', roundId)
        .order('guessed_at', { ascending: true })

      if (error) throw error

      // 追加新的猜測記錄，避免重複
      const newGuesses = (data || []) as Guess[]
      const existingIds = new Set(guesses.value.map(g => g.id))
      const uniqueNewGuesses = newGuesses.filter(g => !existingIds.has(g.id))
      if (uniqueNewGuesses.length > 0) {
        guesses.value = [...guesses.value, ...uniqueNewGuesses]
      }
    } catch (err) {
      console.error('載入猜測記錄錯誤:', err)
    }
  }

  // 載入整場遊戲的所有猜測記錄
  async function loadAllGuesses(roomId: string) {
    try {
      // 先獲取該房間的所有輪次 ID
      const { data: rounds, error: roundsError } = await supabase
        .from('game_rounds')
        .select('id')
        .eq('room_id', roomId)

      if (roundsError) throw roundsError

      if (!rounds || rounds.length === 0) {
        guesses.value = []
        return
      }

      const roundIds = rounds.map(r => r.id)

      // 獲取所有輪次的猜測記錄
      const { data, error } = await supabase
        .from('guesses')
        .select('*')
        .in('round_id', roundIds)
        .order('guessed_at', { ascending: true })

      if (error) throw error

      guesses.value = (data || []) as Guess[]
    } catch (err) {
      console.error('載入所有猜測記錄錯誤:', err)
    }
  }

  // 創建新輪次
  async function createRound(roomId: string, drawerId: string, wordText: string, wordSource: 'wordlist' | 'custom') {
    try {
      if (!roomStore.currentRoom) {
        throw new Error('沒有當前房間')
      }

      const roundNumber = (roomStore.currentRoom.current_round || 0) + 1

      const { data, error } = await supabase
        .from('game_rounds')
        .insert({
          room_id: roomId,
          round_number: roundNumber,
          drawer_id: drawerId,
          word_text: wordText,
          word_source: wordSource,
        })
        .select()
        .single()

      if (error) throw error

      currentRound.value = data as GameRound
      currentWord.value = wordText
      // 不清空猜測記錄，整場遊戲累積

      // 更新房間當前輪次
      await supabase
        .from('game_rooms')
        .update({
          current_round: roundNumber,
          current_drawer_id: drawerId,
        })
        .eq('id', roomId)

      return { success: true, round: data }
    } catch (err) {
      console.error('創建輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '創建輪次失敗' }
    }
  }

  // 檢查當前輪次是否已猜中
  function hasGuessed(userId: string): boolean {
    if (!currentRound.value) return false
    return guesses.value.some(g => g.round_id === currentRound.value!.id && g.user_id === userId && g.is_correct)
  }

  // 檢查是否為當前畫家
  const isCurrentDrawer = computed(() => {
    if (!currentRound.value || !authStore.user) return false
    return currentRound.value.drawer_id === authStore.user.id
  })

  // 結束輪次（計算畫家得分）
  async function endRound() {
    if (!currentRound.value || !roomStore.currentRoom) {
      return { success: false, error: '沒有當前輪次' }
    }

    try {
      // 計算畫家得分（基於猜中人數和平均評分）
      const correctCount = correctGuesses.value.length
      const avgRating = averageRating.value
      const { updateDrawerScore } = useScoring()
      
      console.log('[endRound] 猜中人數:', correctCount, '平均評分:', avgRating)
      await updateDrawerScore(currentRound.value.drawer_id, correctCount, avgRating)

      // 更新輪次結束時間
      const { error } = await supabase
        .from('game_rounds')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', currentRound.value.id)

      if (error) throw error

      return { success: true }
    } catch (err) {
      console.error('結束輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '結束輪次失敗' }
    }
  }

  // 清除遊戲狀態
  function clearGame() {
    currentRound.value = null
    currentWord.value = null
    guesses.value = []
    roundStatus.value = 'drawing'
    wordOptions.value = []
    ratings.value = []
    hintGiven.value = false
    revealedIndices.value = []
  }

  // 提交評分到數據庫
  async function submitRating(roundId: string, drawerId: string, rating: number) {
    if (!authStore.user) {
      return { success: false, error: '用戶未登錄' }
    }

    try {
      const { data, error } = await supabase
        .from('drawing_ratings')
        .upsert({
          round_id: roundId,
          rater_id: authStore.user.id,
          drawer_id: drawerId,
          rating: rating,
        }, {
          onConflict: 'round_id,rater_id'
        })
        .select()
        .single()

      if (error) throw error

      // 更新本地評分
      if (data) {
        addRating(data as DrawingRating)
      }

      return { success: true, rating: data }
    } catch (err) {
      console.error('提交評分錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '提交評分失敗' }
    }
  }

  // 載入輪次評分
  async function loadRatings(roundId: string) {
    try {
      const { data, error } = await supabase
        .from('drawing_ratings')
        .select('*')
        .eq('round_id', roundId)

      if (error) throw error

      ratings.value = (data || []) as DrawingRating[]
      return { success: true, ratings: data }
    } catch (err) {
      console.error('載入評分錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '載入評分失敗' }
    }
  }

  return {
    // 狀態
    currentRound,
    currentWord,
    guesses,
    correctGuesses,
    currentRoundGuesses,
    currentRoundCorrectGuesses,
    isCurrentDrawer,
    // 輪次狀態
    roundStatus,
    wordOptions,
    ratings,
    averageRating,
    // 提示狀態
    hintGiven,
    revealedIndices,
    // 方法
    loadCurrentRound,
    loadGuesses,
    loadAllGuesses,
    createRound,
    hasGuessed,
    endRound,
    clearGame,
    // 輪次狀態方法
    setRoundStatus,
    setWordOptions,
    addRating,
    clearRatings,
    submitRating,
    loadRatings,
    // 提示方法
    giveHint,
    setHintState,
    resetHint,
  }
})

