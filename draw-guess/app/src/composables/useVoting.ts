/**
 * useVoting Composable - 分鏡接龍模式投票邏輯
 * 
 * 實現投票、投票統計和勝出選擇邏輯
 * Requirements: 5.3, 5.4, 5.5, 6.1, 6.2, 6.3
 */

import { ref, computed } from 'vue'
import { useStoryStore } from '../stores/story'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import type { Submission, Vote } from '../types/storyboard'

/** 操作結果類型 */
interface Result<T = void> {
  success: boolean
  error?: string
  data?: T
}

export function useVoting() {
  const storyStore = useStoryStore()
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  // ============================================
  // 本地狀態
  // ============================================

  /** 投票狀態 */
  const isVoting = ref(false)

  /** 錯誤信息 */
  const error = ref<string | null>(null)

  /** 投票倒計時剩餘時間（秒） */
  const votingTimeRemaining = ref<number | null>(null)

  /** 倒計時計時器 */
  let countdownTimer: number | null = null

  // ============================================
  // 計算屬性
  // ============================================

  /** 當前輪次的投票記錄 */
  const votes = computed(() => storyStore.votes)

  /** 當前輪次的句子提交列表 */
  const submissions = computed(() => storyStore.submissions)

  /** 當前用戶的投票 */
  const myVote = computed(() => storyStore.myVote)

  /** 當前用戶已投票的句子 ID */
  const myVotedSubmissionId = computed(() => myVote.value?.submissionId || null)

  /** 是否已投票 */
  const hasVoted = computed(() => myVote.value !== null)

  /** 當前用戶的提交 */
  const mySubmission = computed(() => storyStore.mySubmission)

  /** 每個提交的投票數統計 */
  const voteCounts = computed(() => storyStore.voteCounts)

  /** 總投票人數 */
  const totalVoters = computed(() => votes.value.length)

  /** 是否所有人都已投票（用於提前結束投票） */
  const allVoted = computed(() => {
    // 需要知道總參與人數才能判斷
    // 這裡暫時返回 false，實際邏輯需要結合房間參與者數量
    return false
  })

  // ============================================
  // 投票邏輯
  // Requirements: 5.3, 5.4, 5.5
  // ============================================

  /**
   * 檢查是否可以投票給指定的句子
   * Requirements: 5.5 - 不能投給自己
   * 
   * @param submissionId 要投票的句子 ID
   * @returns 是否可以投票
   */
  function canVoteFor(submissionId: string): { canVote: boolean; reason?: string } {
    // 檢查用戶登錄狀態
    if (!authStore.user) {
      return { canVote: false, reason: '用戶未登錄' }
    }

    // 檢查當前階段是否為投票階段
    if (storyStore.currentPhase !== 'voting') {
      return { canVote: false, reason: '當前不是投票階段' }
    }

    // 檢查句子是否存在
    const submission = submissions.value.find(s => s.id === submissionId)
    if (!submission) {
      return { canVote: false, reason: '句子不存在' }
    }

    // 檢查是否投給自己
    // Requirements: 5.5 - 不能投給自己提交的句子
    if (submission.userId === authStore.user.id) {
      return { canVote: false, reason: '不能投給自己的句子' }
    }

    return { canVote: true }
  }

  /**
   * 投票給某個句子
   * Requirements: 5.3 - 記錄投票選擇
   * Requirements: 5.5 - 自投限制檢查
   * 
   * @param submissionId 要投票的句子 ID
   */
  async function castVote(submissionId: string): Promise<Result<Vote>> {
    // 檢查是否可以投票
    const { canVote, reason } = canVoteFor(submissionId)
    if (!canVote) {
      error.value = reason || '無法投票'
      return { success: false, error: reason }
    }

    // 檢查當前輪次
    if (!gameStore.currentRound) {
      error.value = '沒有當前輪次'
      return { success: false, error: '沒有當前輪次' }
    }

    try {
      isVoting.value = true
      error.value = null

      const result = await storyStore.castVote(
        gameStore.currentRound.id,
        submissionId
      )

      if (result.success) {
        console.log('[useVoting] 投票成功:', submissionId)
      } else {
        error.value = result.error || '投票失敗'
      }

      return result as Result<Vote>
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '投票失敗'
      error.value = errorMsg
      console.error('[useVoting] 投票錯誤:', err)
      return { success: false, error: errorMsg }
    } finally {
      isVoting.value = false
    }
  }

  /**
   * 更改投票
   * Requirements: 5.4 - 允許在投票時間內更改投票
   * 
   * @param newSubmissionId 新的投票目標句子 ID
   */
  async function changeVote(newSubmissionId: string): Promise<Result<Vote>> {
    // 檢查是否已投票
    if (!hasVoted.value) {
      // 如果還沒投票，直接投票
      return castVote(newSubmissionId)
    }

    // 檢查是否投給同一個句子
    if (myVotedSubmissionId.value === newSubmissionId) {
      return { success: true } // 已經投給這個句子了
    }

    // 檢查是否可以投票給新句子
    const { canVote, reason } = canVoteFor(newSubmissionId)
    if (!canVote) {
      error.value = reason || '無法更改投票'
      return { success: false, error: reason }
    }

    // 更改投票（使用 upsert 邏輯）
    return castVote(newSubmissionId)
  }

  /**
   * 取消投票（如果需要的話）
   * 注意：根據需求，投票只能更改不能取消，此方法保留備用
   */
  async function cancelVote(): Promise<Result> {
    // 當前需求不支持取消投票，只支持更改
    return { success: false, error: '不支持取消投票，只能更改投票' }
  }

  // ============================================
  // 投票統計和勝出選擇
  // Requirements: 6.1, 6.2, 6.3
  // ============================================

  /**
   * 獲取每個句子的投票數
   * Requirements: 6.1 - 統計每個句子的得票數
   * 
   * @returns Map<submissionId, voteCount>
   */
  function getVoteCounts(): Map<string, number> {
    return voteCounts.value
  }

  /**
   * 獲取投票數最高的句子列表
   * 
   * @returns 最高票的句子列表（可能有多個平票）
   */
  function getTopVotedSubmissions(): Submission[] {
    if (submissions.value.length === 0) {
      return []
    }

    let maxVotes = -1
    const topSubmissions: Submission[] = []

    for (const submission of submissions.value) {
      const voteCount = voteCounts.value.get(submission.id) || 0
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        topSubmissions.length = 0
        topSubmissions.push(submission)
      } else if (voteCount === maxVotes) {
        topSubmissions.push(submission)
      }
    }

    return topSubmissions
  }

  /**
   * 計算勝出句子
   * Requirements: 6.2 - 唯一最高票為勝出
   * Requirements: 6.3 - 平票時隨機選擇
   * 
   * @returns 勝出的句子，如果沒有提交則返回 null
   */
  function calculateWinner(): Submission | null {
    if (submissions.value.length === 0) {
      return null
    }

    const topSubmissions = getTopVotedSubmissions()

    if (topSubmissions.length === 0) {
      return null
    }

    // Requirements: 6.2 - 唯一最高票
    if (topSubmissions.length === 1) {
      console.log('[useVoting] 唯一最高票勝出:', topSubmissions[0]?.sentence)
      return topSubmissions[0] || null
    }

    // Requirements: 6.3 - 平票時隨機選擇
    const randomIndex = Math.floor(Math.random() * topSubmissions.length)
    const winner = topSubmissions[randomIndex] || null
    console.log('[useVoting] 平票隨機選擇勝出:', winner?.sentence, '(共', topSubmissions.length, '個平票)')
    return winner
  }

  /**
   * 獲取勝出句子（帶有投票數信息）
   * 
   * @returns 勝出句子及其投票數
   */
  function getWinnerWithVotes(): { submission: Submission; voteCount: number } | null {
    const winner = calculateWinner()
    if (!winner) {
      return null
    }

    const voteCount = voteCounts.value.get(winner.id) || 0
    return { submission: winner, voteCount }
  }

  /**
   * 獲取所有提交及其投票數（用於顯示投票結果）
   * 
   * @returns 按投票數排序的提交列表
   */
  function getSubmissionsWithVotes(): Array<{ submission: Submission; voteCount: number }> {
    return submissions.value
      .map(submission => ({
        submission,
        voteCount: voteCounts.value.get(submission.id) || 0,
      }))
      .sort((a, b) => b.voteCount - a.voteCount)
  }

  /**
   * 檢查是否有平票情況
   * 
   * @returns 是否存在平票
   */
  function hasTie(): boolean {
    const topSubmissions = getTopVotedSubmissions()
    return topSubmissions.length > 1
  }

  // ============================================
  // 倒計時管理
  // ============================================

  /**
   * 開始投票倒計時
   * 
   * @param duration 倒計時時長（秒）
   * @param onEnd 倒計時結束回調
   */
  function startVotingCountdown(duration: number, onEnd?: () => void) {
    stopVotingCountdown()
    
    votingTimeRemaining.value = duration
    
    countdownTimer = window.setInterval(() => {
      if (votingTimeRemaining.value !== null && votingTimeRemaining.value > 0) {
        votingTimeRemaining.value--
      } else {
        stopVotingCountdown()
        if (onEnd) {
          onEnd()
        }
      }
    }, 1000)
  }

  /**
   * 停止投票倒計時
   */
  function stopVotingCountdown() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  /**
   * 重置投票倒計時
   */
  function resetVotingCountdown() {
    stopVotingCountdown()
    votingTimeRemaining.value = null
  }

  // ============================================
  // 數據載入
  // ============================================

  /**
   * 載入當前輪次的投票記錄
   * 
   * @param roundId 輪次 ID
   */
  async function loadVotes(roundId: string): Promise<Result<Vote[]>> {
    return storyStore.loadVotes(roundId) as Promise<Result<Vote[]>>
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 清除錯誤
   */
  function clearError() {
    error.value = null
  }

  /**
   * 獲取指定句子的投票數
   * 
   * @param submissionId 句子 ID
   */
  function getVoteCountFor(submissionId: string): number {
    return voteCounts.value.get(submissionId) || 0
  }

  /**
   * 檢查當前用戶是否投給了指定句子
   * 
   * @param submissionId 句子 ID
   */
  function isVotedFor(submissionId: string): boolean {
    return myVotedSubmissionId.value === submissionId
  }

  return {
    // 狀態
    isVoting,
    error,
    votingTimeRemaining,

    // 計算屬性
    votes,
    submissions,
    myVote,
    myVotedSubmissionId,
    hasVoted,
    mySubmission,
    voteCounts,
    totalVoters,
    allVoted,

    // 投票方法
    // Requirements: 5.3, 5.4, 5.5
    canVoteFor,
    castVote,
    changeVote,
    cancelVote,

    // 投票統計方法
    // Requirements: 6.1, 6.2, 6.3
    getVoteCounts,
    getTopVotedSubmissions,
    calculateWinner,
    getWinnerWithVotes,
    getSubmissionsWithVotes,
    hasTie,

    // 倒計時方法
    startVotingCountdown,
    stopVotingCountdown,
    resetVotingCountdown,

    // 數據載入
    loadVotes,

    // 工具方法
    clearError,
    getVoteCountFor,
    isVotedFor,
  }
}
