import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useRoomStore } from '../stores/room'

// 計分配置
const GUESS_BASE_SCORE = 100 // 猜中基礎分數
const DRAWING_BASE_SCORE = 50 // 繪畫基礎分數
const DRAWING_BONUS_PER_GUESS = 10 // 每個猜中玩家的額外加分
const WINNER_BONUS = 100 // 獲勝獎勵

// 猜中順序係數（根據順序：100%, 80%, 60%, 40%, 20%...）
const GUESS_ORDER_MULTIPLIERS = [1.0, 0.8, 0.6, 0.4, 0.2]

export function useScoring() {
  const roomStore = useRoomStore()

  // 計算猜中得分（根據順序）
  function calculateGuessScore(guessOrder: number): number {
    // guessOrder 是已猜中玩家的數量（0 表示第一個猜中）
    const multiplierIndex = Math.min(guessOrder, GUESS_ORDER_MULTIPLIERS.length - 1)
    const multiplier = GUESS_ORDER_MULTIPLIERS[multiplierIndex] ?? 0
    const score = Math.round(GUESS_BASE_SCORE * multiplier)
    return score
  }

  // 計算繪畫得分（根據猜中玩家數量）
  function calculateDrawingScore(correctGuessCount: number): number {
    if (correctGuessCount === 0) {
      return 0 // 沒有人猜中，繪畫得分為 0
    }
    const score = DRAWING_BASE_SCORE + (correctGuessCount * DRAWING_BONUS_PER_GUESS)
    return score
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

  // 更新畫家分數（輪次結束時調用）
  async function updateDrawerScore(drawerId: string, correctGuessCount: number): Promise<boolean> {
    const drawingScore = calculateDrawingScore(correctGuessCount)
    if (drawingScore === 0) {
      return true // 沒有人猜中，不需要更新
    }
    return await updatePlayerScore(drawerId, drawingScore)
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
    DRAWING_BASE_SCORE,
    DRAWING_BONUS_PER_GUESS,
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
