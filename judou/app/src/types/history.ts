/**
 * 句豆 - 歷史記錄類型定義（豆跡）
 */

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
  transaction_type: string
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

// 交易類型
export type TransactionType = 
  | 'entry_fee'        // 入場費
  | 'prize'            // 獎勵
  | 'refund'           // 退款
  | 'win_streak_bonus' // 連勝獎勵
  | 'practice_reward'  // 練習獎勵
  | 'daily_login'      // 每日登入獎勵
  | 'daily_first'      // 每日首練獎勵
  | 'level_up'         // 升級獎勵

// 交易類型顯示名稱
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  entry_fee: '入場費',
  prize: '對戰獎勵',
  refund: '退款',
  win_streak_bonus: '連勝獎勵',
  practice_reward: '練習獎勵',
  daily_login: '每日登入',
  daily_first: '每日首練',
  level_up: '升級獎勵'
}

// 獲取交易類型標籤
export function getTransactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type as TransactionType] || type
}
