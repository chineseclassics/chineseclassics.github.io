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
      const correctWord = gameStore.currentWord || ''

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
      guessInput.value = ''

      return { success: true, isCorrect, guess: data }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '提交猜測失敗'
      console.error('提交猜測錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 匹配判斷（精確匹配）
  function matchGuess(guess: string, correctWord: string): boolean {
    // 去除首尾空格並比較
    const normalizedGuess = guess.trim()
    const normalizedCorrect = correctWord.trim()

    // 精確匹配（中文無大小寫，但預留處理）
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

