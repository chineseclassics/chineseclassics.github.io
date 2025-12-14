import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useScoring } from './useScoring'

export function useGuessing() {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const { calculateGuessScore, updatePlayerScore } = useScoring()

  const guessInput = ref('')
  const error = ref<string | null>(null)
  const loading = ref(false)

  // 當前詞語（僅畫家可見）
  const currentWord = computed(() => {
    if (gameStore.isCurrentDrawer) {
      return gameStore.currentWord
    }
    return null
  })

  // 已猜中玩家列表
  const correctGuesses = computed(() => gameStore.correctGuesses)

  // 是否已猜中
  const hasGuessed = computed(() => {
    if (!authStore.user) return false
    return gameStore.hasGuessed(authStore.user.id)
  })

  // 提交猜測
  async function submitGuess() {
    if (!gameStore.currentRound || !authStore.user) {
      error.value = '無法提交猜測'
      return { success: false, error: '無法提交猜測' }
    }

    if (!guessInput.value.trim()) {
      error.value = '請輸入猜測'
      return { success: false, error: '請輸入猜測' }
    }

    if (guessInput.value.length > 32) {
      error.value = '猜測不能超過 32 個字符'
      return { success: false, error: '猜測不能超過 32 個字符' }
    }

    if (hasGuessed.value) {
      error.value = '您已經猜中了'
      return { success: false, error: '您已經猜中了' }
    }

    if (gameStore.isCurrentDrawer) {
      error.value = '畫家不能猜測'
      return { success: false, error: '畫家不能猜測' }
    }

    try {
      loading.value = true
      error.value = null

      const guessText = guessInput.value.trim()
      
      // 從數據庫獲取正確答案（因為非畫家的 gameStore.currentWord 為 null）
      // 這樣可以確保猜測匹配不依賴前端狀態
      const { data: roundData, error: fetchError } = await supabase
        .from('game_rounds')
        .select('word_text')
        .eq('id', gameStore.currentRound.id)
        .single()
      
      if (fetchError || !roundData) {
        throw new Error('無法獲取當前輪次信息')
      }
      
      const correctWord = roundData.word_text || ''

      // 匹配判斷（精確匹配，忽略首尾空格）
      const isCorrect = matchGuess(guessText, correctWord)

      // 計算得分（根據猜中順序）
      const scoreEarned = isCorrect ? calculateGuessScore(correctGuesses.value.length) : 0

      // 保存猜測記錄
      const { data, error: insertError } = await supabase
        .from('guesses')
        .insert({
          round_id: gameStore.currentRound.id,
          user_id: authStore.user.id,
          guess_text: guessText,
          is_correct: isCorrect,
          score_earned: scoreEarned,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 更新本地狀態
      gameStore.guesses.push(data as any)

      // 如果猜中，更新玩家分數
      if (isCorrect && authStore.user) {
        await updatePlayerScore(authStore.user.id, scoreEarned)
      }

      // 每次提交後都清空輸入框，允許繼續猜測
      const wasCorrect = isCorrect
      guessInput.value = ''

      return { success: true, isCorrect: wasCorrect, guess: data }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '提交猜測失敗'
      console.error('提交猜測錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 匹配判斷（忽略空格和全形/半形差異）
  function matchGuess(guess: string, correctWord: string): boolean {
    // 標準化：去除所有空格（包括全形空格）並轉換為小寫
    const normalize = (str: string) => {
      return str
        .replace(/[\s\u3000]+/g, '') // 移除所有空格（包括全形空格 \u3000）
        .toLowerCase() // 轉小寫（處理英文混合情況）
        .trim()
    }
    
    const normalizedGuess = normalize(guess)
    const normalizedCorrect = normalize(correctWord)

    return normalizedGuess === normalizedCorrect
  }

  // 清除錯誤
  function clearError() {
    error.value = null
  }

  return {
    // 狀態
    guessInput,
    error,
    loading,
    currentWord,
    correctGuesses,
    hasGuessed,
    // 方法
    submitGuess,
    clearError,
  }
}

