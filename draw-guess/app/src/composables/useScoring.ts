import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'

// 計分配置
const GUESS_BASE_SCORE = 100 // 猜中基礎分數（第一名得分）
const GUESS_DECREMENT = 10 // 每名遞減分數
const GUESS_MIN_SCORE = 10 // 猜中最低分數
const DRAWING_SCORE_PER_GUESS = 10 // 畫家得分：每個猜中玩家 × 10
const RATING_BONUS_PER_STAR = 6 // 評分獎勵：平均評分 × 6
const WINNER_BONUS = 100 // 獲勝獎勵

export function useScoring() {
  const roomStore = useRoomStore()

  // 計算猜中得分（根據順序：100, 90, 80, 70, 60...，最低10分）
  function calculateGuessScore(guessOrder: number): number {
    // guessOrder 是已猜中玩家的數量（0 表示第一個猜中）
    // 第1名(order=0): 100, 第2名(order=1): 90, 第3名(order=2): 80...
    const score = GUESS_BASE_SCORE - (guessOrder * GUESS_DECREMENT)
    return Math.max(score, GUESS_MIN_SCORE)
  }

  // 計算繪畫得分（猜中人數 × 10 + 評分獎勵）
  function calculateDrawingScore(correctGuessCount: number, averageRating: number = 0): number {
    if (correctGuessCount === 0) {
      return 0 // 沒有人猜中，繪畫得分為 0
    }
    // 猜中人數 × 10 + 評分獎勵（平均星 × 6）
    const guessScore = correctGuessCount * DRAWING_SCORE_PER_GUESS
    const ratingBonus = Math.round(averageRating * RATING_BONUS_PER_STAR)
    return guessScore + ratingBonus
  }

  // 更新畫家分數（輪次結束時調用）
  async function updateDrawerScore(drawerId: string, correctGuessCount: number, averageRating: number = 0): Promise<boolean> {
    const drawingScore = calculateDrawingScore(correctGuessCount, averageRating)
    if (drawingScore === 0) {
      return true // 沒有人猜中，不需要更新
    }
    return await updatePlayerScore(drawerId, drawingScore)
  }

  // 更新玩家分數（累加到總分）
  async function updatePlayerScore(userId: string, scoreToAdd: number): Promise<boolean> {
    if (!roomStore.currentRoom) {
      console.error('沒有當前房間')
      return false
    }

    try {
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

      return true
    } catch (err) {
      console.error('更新玩家分數錯誤:', err)
      return false
    }
  }

  // 計算獲勝者（遊戲結束時調用）
  function calculateWinner(): { user_id: string; score: number } | null {
    if (!roomStore.participants || roomStore.participants.length === 0) {
      return null
    }

    // 按分數排序
    const sorted = [...roomStore.participants].sort((a, b) => b.score - a.score)

    // 如果最高分只有一個，直接返回
    if (sorted.length === 1 || (sorted[0] && sorted[1] && sorted[0].score > sorted[1].score)) {
      return {
        user_id: sorted[0]?.user_id || '',
        score: sorted[0]?.score || 0,
      }
    }

    // 如果分數相同，需要比較其他條件
    // 這裡需要從數據庫獲取更多信息（猜中次數、繪畫次數）
    // 暫時返回第一個最高分的玩家
    return {
      user_id: sorted[0]?.user_id || '',
      score: sorted[0]?.score || 0,
    }
  }

  // 玩家排行榜（按分數排序）
  const playerRankings = computed(() => {
    if (!roomStore.participants || roomStore.participants.length === 0) {
      return []
    }

    // 按分數從高到低排序
    const sorted = [...roomStore.participants]
      .sort((a, b) => {
        // 先按分數排序
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // 分數相同時，按加入時間排序（先加入的排名靠前）
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      })
      .map((participant, index) => ({
        id: participant.id,
        user_id: participant.user_id,
        score: participant.score,
        rank: index + 1,
      }))

    return sorted
  })

  // 獲勝者（遊戲結束時）
  const winner = computed(() => {
    if (roomStore.currentRoom?.status !== 'finished') {
      return null
    }
    return calculateWinner()
  })

  // 獲勝獎勵（在最終排名時顯示，不影響遊戲過程中的分數）
  function getWinnerBonus(): number {
    return WINNER_BONUS
  }

  return {
    // 配置
    GUESS_BASE_SCORE,
    GUESS_DECREMENT,
    GUESS_MIN_SCORE,
    DRAWING_SCORE_PER_GUESS,
    RATING_BONUS_PER_STAR,
    WINNER_BONUS,
    // 計算函數
    calculateGuessScore,
    calculateDrawingScore,
    calculateWinner,
    // 更新函數
    updatePlayerScore,
    updateDrawerScore,
    // 計算屬性
    playerRankings,
    winner,
    getWinnerBonus,
  }
}
