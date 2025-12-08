import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { useRoomStore } from './room'

// 遊戲輪次接口
export interface GameRound {
  id: string
  room_id: string
  round_number: number
  drawer_id: string
  word_text: string
  word_source: 'wordlist' | 'custom'
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
  const guesses = ref<Guess[]>([]) // 當前輪次的猜測記錄
  const correctGuesses = computed(() => guesses.value.filter(g => g.is_correct))

  // 載入當前輪次
  async function loadCurrentRound(roomId: string) {
    try {
      const { data, error } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('room_id', roomId)
        .order('round_number', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        currentRound.value = data as GameRound
        currentWord.value = data.word_text
        await loadGuesses(data.id)
      }

      return { success: true, round: data }
    } catch (err) {
      console.error('載入當前輪次錯誤:', err)
      return { success: false, error: err instanceof Error ? err.message : '載入輪次失敗' }
    }
  }

  // 載入猜測記錄
  async function loadGuesses(roundId: string) {
    try {
      const { data, error } = await supabase
        .from('guesses')
        .select('*')
        .eq('round_id', roundId)
        .order('guessed_at', { ascending: true })

      if (error) throw error

      guesses.value = (data || []) as Guess[]
    } catch (err) {
      console.error('載入猜測記錄錯誤:', err)
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
      guesses.value = []

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

  // 檢查是否已猜中
  function hasGuessed(userId: string): boolean {
    return guesses.value.some(g => g.user_id === userId && g.is_correct)
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
      // 計算畫家得分
      const correctCount = correctGuesses.value.length
      const { useScoring } = await import('../composables/useScoring')
      const { updateDrawerScore } = useScoring()
      
      await updateDrawerScore(currentRound.value.drawer_id, correctCount)

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
  }

  return {
    // 狀態
    currentRound,
    currentWord,
    guesses,
    correctGuesses,
    isCurrentDrawer,
    // 方法
    loadCurrentRound,
    loadGuesses,
    createRound,
    hasGuessed,
    endRound,
    clearGame,
  }
})

