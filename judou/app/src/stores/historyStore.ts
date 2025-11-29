/**
 * 句豆 - 歷史記錄 Store（豆跡）
 * 
 * 整合顯示用戶的所有活動記錄：
 * - 練習記錄
 * - 對戰記錄
 * - 豆子收支
 * - 閱讀記錄
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from './authStore'

// =====================================================
// 類型定義
// =====================================================

// 記錄類型
export type RecordType = 'all' | 'practice' | 'game' | 'bean' | 'reading'

// 時間範圍
export type TimeRange = 'all' | 'today' | 'week' | 'month'

// 練習記錄
export interface PracticeHistoryEntry {
  id: string
  type: 'practice'
  display_name: string | null
  username: string | null
  score: number
  accuracy: number
  elapsed_seconds: number
  created_at: string
  text?: {
    id: string
    title: string
    category_name: string | null
  } | null
}

// 對戰記錄
export interface GameHistoryEntry {
  id: string
  type: 'game'
  room_id: string
  room_code: string
  game_mode: 'team_battle' | 'pvp'
  score: number
  accuracy: number | null
  time_spent: number | null
  status: 'waiting' | 'playing' | 'completed' | 'disconnected'
  is_winner: boolean
  prize_won: number
  fee_paid: number
  created_at: string
  text?: {
    id: string
    title: string
  } | null
}

// 豆子交易記錄
export interface BeanHistoryEntry {
  id: string
  type: 'bean'
  transaction_type: string  // entry_fee, prize, refund, practice_reward 等
  amount: number
  balance_after: number | null
  description: string | null
  created_at: string
  text?: {
    id: string
    title: string
  } | null
}

// 閱讀記錄
export interface ReadingHistoryEntry {
  id: string
  type: 'reading'
  progress: number
  is_completed: boolean
  read_duration: number
  read_count: number
  last_read_at: string
  created_at: string
  text?: {
    id: string
    title: string
    author: string | null
  } | null
}

// 統一的歷史記錄類型
export type HistoryEntry = PracticeHistoryEntry | GameHistoryEntry | BeanHistoryEntry | ReadingHistoryEntry

// 統計摘要
export interface HistoryStats {
  totalPractices: number
  totalGames: number
  totalWins: number
  totalReadings: number
  completedReadings: number
  totalBeansEarned: number
  totalBeansSpent: number
  weeklyPractices: number
  weeklyGames: number
}

// =====================================================
// Store 定義
// =====================================================

const LIMIT_OPTIONS = [10, 20, 50, 100] as const
type LimitOption = (typeof LIMIT_OPTIONS)[number]

export const useHistoryStore = defineStore('history', () => {
  const supabase = useSupabase()
  const authStore = useAuthStore()
  
  // 狀態
  const entries = ref<HistoryEntry[]>([])
  const stats = ref<HistoryStats | null>(null)
  const limit = ref<LimitOption>(20)
  const recordType = ref<RecordType>('all')
  const timeRange = ref<TimeRange>('all')
  const isLoading = ref(false)
  const isLoadingStats = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性：按類型過濾的記錄
  const practiceEntries = computed(() => 
    entries.value.filter((e): e is PracticeHistoryEntry => e.type === 'practice')
  )
  
  const gameEntries = computed(() => 
    entries.value.filter((e): e is GameHistoryEntry => e.type === 'game')
  )
  
  const beanEntries = computed(() => 
    entries.value.filter((e): e is BeanHistoryEntry => e.type === 'bean')
  )
  
  const readingEntries = computed(() => 
    entries.value.filter((e): e is ReadingHistoryEntry => e.type === 'reading')
  )

  // =====================================================
  // 輔助函數
  // =====================================================

  function getTimeRangeFilter(): { start: string; end: string } | null {
    const now = new Date()
    const end = now.toISOString()
    
    switch (timeRange.value) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return { start: start.toISOString(), end }
      }
      case 'week': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { start: start.toISOString(), end }
      }
      case 'month': {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { start: start.toISOString(), end }
      }
      default:
        return null
    }
  }

  // =====================================================
  // 數據獲取
  // =====================================================

  /**
   * 獲取練習記錄
   */
  async function fetchPracticeRecords(): Promise<PracticeHistoryEntry[]> {
    if (!supabase || !authStore.user?.id) return []

    let query = supabase
      .from('practice_records')
      .select(`
        id, display_name, username, score, accuracy, elapsed_seconds, created_at,
        text:practice_texts!text_id (
          id, title,
          category:practice_categories!category_id (name)
        )
      `)
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(limit.value)

    const timeFilter = getTimeRangeFilter()
    if (timeFilter) {
      query = query.gte('created_at', timeFilter.start)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('獲取練習記錄失敗:', fetchError)
      return []
    }

    return (data || []).map((item: any) => {
      const textInfo = Array.isArray(item.text) ? item.text[0] : item.text
      const categoryInfo = textInfo?.category
      const categoryName = Array.isArray(categoryInfo) ? categoryInfo[0]?.name : categoryInfo?.name

      return {
        id: item.id,
        type: 'practice' as const,
        display_name: item.display_name,
        username: item.username,
        score: item.score,
        accuracy: item.accuracy,
        elapsed_seconds: item.elapsed_seconds,
        created_at: item.created_at,
        text: textInfo ? {
          id: textInfo.id,
          title: textInfo.title,
          category_name: categoryName || null
        } : null
      }
    })
  }

  /**
   * 獲取對戰記錄
   */
  async function fetchGameRecords(): Promise<GameHistoryEntry[]> {
    if (!supabase || !authStore.user?.id) return []

    let query = supabase
      .from('game_participants')
      .select(`
        id, room_id, score, accuracy, time_spent, status, prize_won, fee_paid, joined_at,
        room:game_rooms!room_id (
          id, room_code, game_mode, status, winner_user_id,
          text:practice_texts!text_id (id, title)
        )
      `)
      .eq('user_id', authStore.user.id)
      .order('joined_at', { ascending: false })
      .limit(limit.value)

    const timeFilter = getTimeRangeFilter()
    if (timeFilter) {
      query = query.gte('joined_at', timeFilter.start)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('獲取對戰記錄失敗:', fetchError)
      return []
    }

    return (data || []).map((item: any) => {
      const room = Array.isArray(item.room) ? item.room[0] : item.room
      const text = room?.text
      const textInfo = Array.isArray(text) ? text[0] : text

      return {
        id: item.id,
        type: 'game' as const,
        room_id: item.room_id,
        room_code: room?.room_code || '',
        game_mode: room?.game_mode || 'pvp',
        score: item.score,
        accuracy: item.accuracy,
        time_spent: item.time_spent,
        status: item.status,
        is_winner: room?.winner_user_id === authStore.user?.id,
        prize_won: item.prize_won || 0,
        fee_paid: item.fee_paid || 0,
        created_at: item.joined_at,
        text: textInfo ? {
          id: textInfo.id,
          title: textInfo.title
        } : null
      }
    })
  }

  /**
   * 獲取豆子交易記錄
   */
  async function fetchBeanRecords(): Promise<BeanHistoryEntry[]> {
    if (!supabase || !authStore.user?.id) return []

    let query = supabase
      .from('game_transactions')
      .select(`
        id, type, amount, balance_after, description, created_at, text_id,
        text:practice_texts!text_id (id, title)
      `)
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(limit.value)

    const timeFilter = getTimeRangeFilter()
    if (timeFilter) {
      query = query.gte('created_at', timeFilter.start)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('獲取豆子記錄失敗:', fetchError)
      return []
    }

    return (data || []).map((item: any) => {
      const textInfo = Array.isArray(item.text) ? item.text[0] : item.text

      return {
        id: item.id,
        type: 'bean' as const,
        transaction_type: item.type,
        amount: item.amount,
        balance_after: item.balance_after,
        description: item.description,
        created_at: item.created_at,
        text: textInfo ? {
          id: textInfo.id,
          title: textInfo.title
        } : null
      }
    })
  }

  /**
   * 獲取閱讀記錄
   */
  async function fetchReadingRecords(): Promise<ReadingHistoryEntry[]> {
    if (!supabase || !authStore.user?.id) return []

    let query = supabase
      .from('reading_records')
      .select(`
        id, progress, is_completed, read_duration, read_count, 
        first_read_at, last_read_at, completed_at,
        text:practice_texts!text_id (id, title, author)
      `)
      .eq('user_id', authStore.user.id)
      .order('last_read_at', { ascending: false })
      .limit(limit.value)

    const timeFilter = getTimeRangeFilter()
    if (timeFilter) {
      query = query.gte('last_read_at', timeFilter.start)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      // 如果表不存在，靜默失敗（可能遷移尚未執行）
      if (fetchError.code === '42P01') {
        console.log('閱讀記錄表尚未創建')
        return []
      }
      console.error('獲取閱讀記錄失敗:', fetchError)
      return []
    }

    return (data || []).map((item: any) => {
      const textInfo = Array.isArray(item.text) ? item.text[0] : item.text

      return {
        id: item.id,
        type: 'reading' as const,
        progress: item.progress,
        is_completed: item.is_completed,
        read_duration: item.read_duration,
        read_count: item.read_count,
        last_read_at: item.last_read_at,
        created_at: item.first_read_at,
        text: textInfo ? {
          id: textInfo.id,
          title: textInfo.title,
          author: textInfo.author
        } : null
      }
    })
  }

  /**
   * 主要獲取函數：根據類型獲取歷史記錄
   */
  async function fetchHistory(customLimit?: LimitOption) {
    if (customLimit) {
      limit.value = customLimit
    }

    // 必須登入才能查看歷史記錄
    if (!authStore.isAuthenticated || !authStore.user?.id) {
      entries.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      let allEntries: HistoryEntry[] = []

      // 根據選擇的類型獲取記錄
      if (recordType.value === 'all' || recordType.value === 'practice') {
        const practiceRecords = await fetchPracticeRecords()
        allEntries = [...allEntries, ...practiceRecords]
      }

      if (recordType.value === 'all' || recordType.value === 'game') {
        const gameRecords = await fetchGameRecords()
        allEntries = [...allEntries, ...gameRecords]
      }

      if (recordType.value === 'all' || recordType.value === 'bean') {
        const beanRecords = await fetchBeanRecords()
        allEntries = [...allEntries, ...beanRecords]
      }

      if (recordType.value === 'all' || recordType.value === 'reading') {
        const readingRecords = await fetchReadingRecords()
        allEntries = [...allEntries, ...readingRecords]
      }

      // 按時間排序
      allEntries.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // 如果是 'all' 類型，限制總數
      if (recordType.value === 'all') {
        allEntries = allEntries.slice(0, limit.value)
      }

      entries.value = allEntries
    } catch (err: any) {
      console.error('獲取歷史記錄失敗:', err)
      error.value = err.message ?? '無法載入歷史紀錄'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 獲取統計摘要
   */
  async function fetchStats() {
    if (!supabase || !authStore.isAuthenticated || !authStore.user?.id) {
      stats.value = null
      return
    }

    isLoadingStats.value = true

    try {
      // 計算本週開始時間
      const now = new Date()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 並行獲取各項統計
      const [
        practiceResult,
        weeklyPracticeResult,
        gameResult,
        weeklyGameResult,
        readingResult,
        beanResult
      ] = await Promise.all([
        // 總練習次數
        supabase
          .from('practice_records')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authStore.user.id),
        
        // 本週練習次數
        supabase
          .from('practice_records')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authStore.user.id)
          .gte('created_at', weekStart),
        
        // 對戰統計
        supabase
          .from('game_participants')
          .select(`
            id,
            room:game_rooms!room_id (winner_user_id, status)
          `)
          .eq('user_id', authStore.user.id),
        
        // 本週對戰次數
        supabase
          .from('game_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authStore.user.id)
          .gte('joined_at', weekStart),
        
        // 閱讀統計
        supabase
          .from('reading_records')
          .select('id, is_completed', { count: 'exact' })
          .eq('user_id', authStore.user.id),
        
        // 豆子統計
        supabase
          .from('game_transactions')
          .select('amount')
          .eq('user_id', authStore.user.id)
      ])

      // 計算對戰勝場
      const gameData = gameResult.data || []
      const finishedGames = gameData.filter((g: any) => {
        const room = Array.isArray(g.room) ? g.room[0] : g.room
        return room?.status === 'finished'
      })
      const wins = finishedGames.filter((g: any) => {
        const room = Array.isArray(g.room) ? g.room[0] : g.room
        return room?.winner_user_id === authStore.user?.id
      })

      // 計算閱讀完成數
      const readingData = readingResult.data || []
      const completedReadings = readingData.filter((r: any) => r.is_completed).length

      // 計算豆子收支
      const beanData = beanResult.data || []
      let earned = 0
      let spent = 0
      for (const t of beanData) {
        if (t.amount > 0) earned += t.amount
        else spent += Math.abs(t.amount)
      }

      stats.value = {
        totalPractices: practiceResult.count || 0,
        totalGames: finishedGames.length,
        totalWins: wins.length,
        totalReadings: readingResult.count || 0,
        completedReadings,
        totalBeansEarned: earned,
        totalBeansSpent: spent,
        weeklyPractices: weeklyPracticeResult.count || 0,
        weeklyGames: weeklyGameResult.count || 0
      }
    } catch (err) {
      console.error('獲取統計失敗:', err)
      stats.value = null
    } finally {
      isLoadingStats.value = false
    }
  }

  /**
   * 設置記錄類型並重新獲取
   */
  function setRecordType(type: RecordType) {
    recordType.value = type
    fetchHistory()
  }

  /**
   * 設置時間範圍並重新獲取
   */
  function setTimeRange(range: TimeRange) {
    timeRange.value = range
    fetchHistory()
  }

  /**
   * 獲取限制選項
   */
  function getLimitOptions() {
    return LIMIT_OPTIONS
  }

  /**
   * 重置狀態
   */
  function reset() {
    entries.value = []
    stats.value = null
    recordType.value = 'all'
    timeRange.value = 'all'
    error.value = null
  }

  return {
    // 狀態
    entries,
    stats,
    limit,
    recordType,
    timeRange,
    isLoading,
    isLoadingStats,
    error,

    // 計算屬性
    practiceEntries,
    gameEntries,
    beanEntries,
    readingEntries,

    // 方法
    fetchHistory,
    fetchStats,
    setRecordType,
    setTimeRange,
    getLimitOptions,
    reset
  }
})
