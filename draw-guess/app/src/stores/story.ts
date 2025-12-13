/**
 * Story Store - 分鏡接龍模式狀態管理
 * 
 * 管理故事鏈、句子提交和投票相關的狀態
 * Requirements: 2.2, 6.5
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type {
  StoryChainItem,
  StoryChainItemDB,
  Submission,
  SubmissionDB,
  Vote,
  VoteDB,
  StoryboardPhase,
} from '../types/storyboard'
import {
  toStoryChainItem as convertToStoryChainItem,
  toSubmission as convertToSubmission,
  toVote as convertToVote,
} from '../types/storyboard'

export const useStoryStore = defineStore('story', () => {
  const authStore = useAuthStore()

  // ============================================
  // 狀態
  // ============================================

  /** 故事鏈 - 存儲所有已確定的故事內容（文字和圖片交替） */
  const storyChain = ref<StoryChainItem[]>([])

  /** 當前輪次的句子提交列表 */
  const submissions = ref<Submission[]>([])

  /** 當前輪次的投票記錄 */
  const votes = ref<Vote[]>([])

  /** 當前分鏡模式階段 */
  const currentPhase = ref<StoryboardPhase>('setup')

  /** 載入狀態 */
  const loading = ref(false)

  /** 錯誤信息 */
  const error = ref<string | null>(null)

  // ============================================
  // 計算屬性
  // ============================================

  /** 獲取最新的故事句子（用於畫家繪畫題目） */
  const latestSentence = computed(() => {
    const textItems = storyChain.value.filter(item => item.itemType === 'text')
    if (textItems.length === 0) return null
    return textItems[textItems.length - 1]
  })

  /** 獲取故事開頭 */
  const storyOpening = computed(() => {
    if (storyChain.value.length === 0) return null
    const firstItem = storyChain.value[0]
    if (firstItem && firstItem.itemType === 'text') {
      return firstItem.content
    }
    return null
  })

  /** 獲取當前用戶的提交 */
  const mySubmission = computed(() => {
    if (!authStore.user) return null
    return submissions.value.find(s => s.userId === authStore.user!.id) || null
  })

  /** 獲取當前用戶的投票 */
  const myVote = computed(() => {
    if (!authStore.user) return null
    return votes.value.find(v => v.voterId === authStore.user!.id) || null
  })

  /** 獲取每個提交的投票數統計 */
  const voteCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const submission of submissions.value) {
      counts.set(submission.id, 0)
    }
    for (const vote of votes.value) {
      const current = counts.get(vote.submissionId) || 0
      counts.set(vote.submissionId, current + 1)
    }
    return counts
  })

  /** 獲取勝出的提交（最高票） */
  const winningSubmission = computed(() => {
    if (submissions.value.length === 0) return null
    
    let maxVotes = -1
    let winners: Submission[] = []
    
    for (const submission of submissions.value) {
      const voteCount = voteCounts.value.get(submission.id) || 0
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        winners = [submission]
      } else if (voteCount === maxVotes) {
        winners.push(submission)
      }
    }
    
    // 如果有多個最高票，返回第一個（實際選擇邏輯在 composable 中處理）
    return winners.length > 0 ? winners[0] : null
  })

  // ============================================
  // 故事鏈方法
  // ============================================

  /**
   * 載入房間的故事鏈
   * Requirements: 2.2
   */
  async function loadStoryChain(roomId: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('story_chains')
        .select('*')
        .eq('room_id', roomId)
        .order('round_number', { ascending: true })
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      storyChain.value = (data || []).map((item: StoryChainItemDB) => 
        convertToStoryChainItem(item)
      )

      console.log('[StoryStore] 故事鏈已載入:', storyChain.value.length, '項')
      return { success: true, data: storyChain.value }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入故事鏈失敗'
      console.error('[StoryStore] 載入故事鏈錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加故事鏈項目
   * Requirements: 6.5
   */
  async function addStoryChainItem(item: Omit<StoryChainItem, 'id' | 'createdAt'>) {
    try {
      loading.value = true
      error.value = null

      const dbItem = {
        room_id: item.roomId,
        round_number: item.roundNumber,
        item_type: item.itemType,
        content: item.content,
        author_id: item.authorId,
        author_name: item.authorName,
      }

      const { data, error: insertError } = await supabase
        .from('story_chains')
        .insert(dbItem)
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      const newItem = convertToStoryChainItem(data as StoryChainItemDB)
      storyChain.value.push(newItem)

      console.log('[StoryStore] 故事鏈項目已添加:', newItem)
      return { success: true, data: newItem }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加故事鏈項目失敗'
      console.error('[StoryStore] 添加故事鏈項目錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加故事開頭（房主設定）
   * Requirements: 2.2
   */
  async function addStoryOpening(roomId: string, sentence: string, authorId: string, authorName: string) {
    return addStoryChainItem({
      roomId,
      roundNumber: 0, // 故事開頭為第 0 輪
      itemType: 'text',
      content: sentence,
      authorId,
      authorName,
    })
  }

  /**
   * 添加故事結尾（房主設定）
   * Requirements: 7.8, 7.9
   */
  async function addStoryEnding(roomId: string, sentence: string, authorId: string, authorName: string) {
    return addStoryChainItem({
      roomId,
      roundNumber: -1, // 故事結尾為第 -1 輪（特殊標記）
      itemType: 'text',
      content: sentence,
      authorId,
      authorName,
    })
  }

  // ============================================
  // 句子提交方法
  // ============================================

  /**
   * 載入當前輪次的句子提交
   */
  async function loadSubmissions(roundId: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('story_submissions')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      submissions.value = (data || []).map((item: SubmissionDB) => 
        convertToSubmission(item)
      )

      console.log('[StoryStore] 句子提交已載入:', submissions.value.length, '項')
      return { success: true, data: submissions.value }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入句子提交失敗'
      console.error('[StoryStore] 載入句子提交錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加或更新句子提交
   * Requirements: 4.4
   */
  async function submitSentence(roundId: string, sentence: string) {
    if (!authStore.user) {
      return { success: false, error: '用戶未登錄' }
    }

    try {
      loading.value = true
      error.value = null

      const dbItem = {
        round_id: roundId,
        user_id: authStore.user.id,
        sentence: sentence.trim(),
        vote_count: 0,
        is_winner: false,
      }

      // 使用 upsert 實現添加或更新
      const { data, error: upsertError } = await supabase
        .from('story_submissions')
        .upsert(dbItem, {
          onConflict: 'round_id,user_id',
        })
        .select()
        .single()

      if (upsertError) {
        throw new Error(upsertError.message)
      }

      const newSubmission = convertToSubmission(data as SubmissionDB)
      
      // 更新本地狀態
      const existingIndex = submissions.value.findIndex(
        s => s.roundId === roundId && s.userId === authStore.user!.id
      )
      if (existingIndex >= 0) {
        submissions.value[existingIndex] = newSubmission
      } else {
        submissions.value.push(newSubmission)
      }

      console.log('[StoryStore] 句子已提交:', newSubmission)
      return { success: true, data: newSubmission }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '提交句子失敗'
      console.error('[StoryStore] 提交句子錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 標記勝出句子
   */
  async function markWinningSubmission(submissionId: string) {
    try {
      const { error: updateError } = await supabase
        .from('story_submissions')
        .update({ is_winner: true })
        .eq('id', submissionId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // 更新本地狀態
      const submission = submissions.value.find(s => s.id === submissionId)
      if (submission) {
        submission.isWinner = true
      }

      console.log('[StoryStore] 勝出句子已標記:', submissionId)
      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '標記勝出句子失敗'
      console.error('[StoryStore] 標記勝出句子錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // ============================================
  // 投票方法
  // ============================================

  /**
   * 載入當前輪次的投票記錄
   */
  async function loadVotes(roundId: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('story_votes')
        .select('*')
        .eq('round_id', roundId)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      votes.value = (data || []).map((item: VoteDB) => 
        convertToVote(item)
      )

      console.log('[StoryStore] 投票記錄已載入:', votes.value.length, '項')
      return { success: true, data: votes.value }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入投票記錄失敗'
      console.error('[StoryStore] 載入投票記錄錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 投票給某個句子
   * Requirements: 5.3
   */
  async function castVote(roundId: string, submissionId: string) {
    if (!authStore.user) {
      return { success: false, error: '用戶未登錄' }
    }

    try {
      loading.value = true
      error.value = null

      const dbItem = {
        round_id: roundId,
        voter_id: authStore.user.id,
        submission_id: submissionId,
      }

      // 使用 upsert 實現投票或更改投票
      const { data, error: upsertError } = await supabase
        .from('story_votes')
        .upsert(dbItem, {
          onConflict: 'round_id,voter_id',
        })
        .select()
        .single()

      if (upsertError) {
        throw new Error(upsertError.message)
      }

      const newVote = convertToVote(data as VoteDB)
      
      // 更新本地狀態
      const existingIndex = votes.value.findIndex(
        v => v.roundId === roundId && v.voterId === authStore.user!.id
      )
      if (existingIndex >= 0) {
        votes.value[existingIndex] = newVote
      } else {
        votes.value.push(newVote)
      }

      console.log('[StoryStore] 投票已記錄:', newVote)
      return { success: true, data: newVote }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '投票失敗'
      console.error('[StoryStore] 投票錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // 階段管理方法
  // ============================================

  /**
   * 設置當前階段
   */
  function setPhase(phase: StoryboardPhase) {
    currentPhase.value = phase
    console.log('[StoryStore] 階段已更新:', phase)
  }

  // ============================================
  // 清理方法
  // ============================================

  /**
   * 清除當前輪次的提交和投票（新輪次開始時調用）
   */
  function clearRoundData() {
    submissions.value = []
    votes.value = []
    console.log('[StoryStore] 輪次數據已清除')
  }

  /**
   * 清除所有故事數據（離開房間時調用）
   */
  function clearAll() {
    storyChain.value = []
    submissions.value = []
    votes.value = []
    currentPhase.value = 'setup'
    error.value = null
    console.log('[StoryStore] 所有故事數據已清除')
  }

  /**
   * 本地添加故事鏈項目（用於實時同步）
   */
  function addStoryChainItemLocal(item: StoryChainItem) {
    // 檢查是否已存在
    const exists = storyChain.value.some(i => i.id === item.id)
    if (!exists) {
      storyChain.value.push(item)
      console.log('[StoryStore] 本地添加故事鏈項目:', item)
    }
  }

  /**
   * 本地添加句子提交（用於實時同步）
   */
  function addSubmissionLocal(submission: Submission) {
    const existingIndex = submissions.value.findIndex(s => s.id === submission.id)
    if (existingIndex >= 0) {
      submissions.value[existingIndex] = submission
    } else {
      submissions.value.push(submission)
    }
    console.log('[StoryStore] 本地添加句子提交:', submission)
  }

  /**
   * 本地添加投票記錄（用於實時同步）
   */
  function addVoteLocal(vote: Vote) {
    const existingIndex = votes.value.findIndex(
      v => v.roundId === vote.roundId && v.voterId === vote.voterId
    )
    if (existingIndex >= 0) {
      votes.value[existingIndex] = vote
    } else {
      votes.value.push(vote)
    }
    console.log('[StoryStore] 本地添加投票記錄:', vote)
  }

  return {
    // 狀態
    storyChain,
    submissions,
    votes,
    currentPhase,
    loading,
    error,
    
    // 計算屬性
    latestSentence,
    storyOpening,
    mySubmission,
    myVote,
    voteCounts,
    winningSubmission,
    
    // 故事鏈方法
    loadStoryChain,
    addStoryChainItem,
    addStoryOpening,
    addStoryEnding,
    addStoryChainItemLocal,
    
    // 句子提交方法
    loadSubmissions,
    submitSentence,
    markWinningSubmission,
    addSubmissionLocal,
    
    // 投票方法
    loadVotes,
    castVote,
    addVoteLocal,
    
    // 階段管理
    setPhase,
    
    // 清理方法
    clearRoundData,
    clearAll,
  }
})
