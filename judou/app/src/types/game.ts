/**
 * 句豆對戰系統（鬥豆場）類型定義
 */

// =====================================================
// 遊戲模式配置（可擴展架構）
// =====================================================

export type GameMode = 'team_battle' | 'pvp'
export type HostType = 'teacher' | 'student'
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'cancelled'
export type ParticipantStatus = 'waiting' | 'playing' | 'completed' | 'disconnected'
export type TeamColor = 'red' | 'blue' | 'green' | 'yellow'
export type TransactionType = 'entry_fee' | 'prize' | 'refund' | 'win_streak_bonus'

/**
 * 遊戲模式配置（支持未來擴展新玩法）
 */
export interface GameModeConfig {
  id: GameMode
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  hasTeams: boolean
  hasEntryFee: boolean
  timeOptions: number[]  // 可選時間限制（秒）
  teacherOnly?: boolean  // 是否僅老師可用
}

/**
 * 預定義的遊戲模式
 */
export const GAME_MODES: GameModeConfig[] = [
  {
    id: 'team_battle',
    name: '課堂鬥豆',
    description: '分組團隊對戰，適合課堂活動',
    minPlayers: 4,
    maxPlayers: 40,
    hasTeams: true,
    hasEntryFee: false,
    timeOptions: [60, 180, 300],  // 1分鐘、3分鐘、5分鐘
    teacherOnly: true,
  },
  {
    id: 'pvp',
    name: 'PK 競技',
    description: '個人對戰，支持入場費',
    minPlayers: 2,
    maxPlayers: 4,
    hasTeams: false,
    hasEntryFee: true,
    timeOptions: [60, 180, 300],
    teacherOnly: false,
  },
]

/**
 * 入場費選項
 */
export const ENTRY_FEE_OPTIONS = [0, 10, 30, 50, 100]

/**
 * 時間模式選項
 */
export const TIME_MODE_OPTIONS = [
  { value: 60, label: '閃電戰', description: '1 分鐘' },
  { value: 180, label: '標準', description: '3 分鐘' },
  { value: 300, label: '持久', description: '5 分鐘' },
]

/**
 * 團隊數量選項
 */
export const TEAM_COUNT_OPTIONS = [2, 3, 4]

/**
 * 連勝獎勵配置
 */
export const WIN_STREAK_BONUSES: Record<number, number> = {
  3: 5,   // 連勝 3 場 +5 豆
  5: 10,  // 連勝 5 場 +10 豆
  7: 20,  // 連勝 7 場 +20 豆
  10: 50, // 連勝 10 場 +50 豆
}

/**
 * 安全限制配置
 */
export const SAFETY_LIMITS = {
  DAILY_FEE_LIMIT: 100,    // 每日最多花費 100 豆
  MIN_BALANCE: 20,         // 賬戶至少保留 20 豆
  MAX_LOSS_STREAK: 5,      // 連輸 5 場觸發提示
}

// =====================================================
// 數據庫實體類型
// =====================================================

/**
 * 遊戲房間
 */
export interface GameRoom {
  id: string
  room_code: string
  host_id: string
  host_type: HostType
  game_mode: GameMode
  text_id: string
  time_limit: number
  team_count: number | null
  max_players: number | null
  entry_fee: number
  prize_pool: number
  class_id: string | null
  status: RoomStatus
  winner_team_id: string | null
  winner_user_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  
  // 關聯數據（查詢時填充）
  host?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  text?: {
    id: string
    title: string
    author: string | null
    content: string
  }
  class?: {
    id: string
    class_name: string
  }
  teams?: GameTeam[]
  participants?: GameParticipant[]
}

/**
 * 遊戲團隊
 */
export interface GameTeam {
  id: string
  room_id: string
  team_name: string
  team_color: TeamColor
  total_score: number
  order_index: number
  created_at: string
  
  // 關聯數據
  participants?: GameParticipant[]
}

/**
 * 遊戲參與者
 */
export interface GameParticipant {
  id: string
  room_id: string
  user_id: string
  team_id: string | null
  score: number
  accuracy: number | null
  time_spent: number | null
  first_accuracy: number | null
  attempt_count: number
  status: ParticipantStatus
  completed_at: string | null
  fee_paid: number
  prize_won: number
  joined_at: string
  
  // 關聯數據
  user?: {
    id: string
    display_name: string
    avatar_url: string | null
    email: string
  }
  team?: GameTeam
}

/**
 * 遊戲交易記錄
 */
export interface GameTransaction {
  id: string
  user_id: string
  room_id: string | null
  type: TransactionType
  amount: number
  balance_after: number | null
  description: string | null
  created_at: string
}

// =====================================================
// 前端狀態類型
// =====================================================

/**
 * 創建房間的參數
 */
export interface CreateRoomParams {
  hostType: HostType
  gameMode: GameMode
  textId: string
  timeLimit: number
  teamCount?: number      // 團隊模式
  maxPlayers?: number     // PvP 模式
  entryFee?: number       // 學生模式
  classId?: string        // 老師模式
}

/**
 * 加入房間的結果
 */
export interface JoinRoomResult {
  success: boolean
  room?: GameRoom
  participant?: GameParticipant
  error?: string
}

/**
 * 提交分數的參數
 */
export interface SubmitScoreParams {
  roomId: string
  score: number
  accuracy: number
  timeSpent: number
  firstAccuracy: number
  attemptCount: number
}

/**
 * 遊戲結果
 */
export interface GameResult {
  room: GameRoom
  winners: GameParticipant[]
  winningTeam?: GameTeam
  prizeDistribution: {
    userId: string
    displayName: string
    prize: number
    streakBonus: number
  }[]
}

// =====================================================
// 團隊顏色配置
// =====================================================

export const TEAM_COLORS: Record<TeamColor, { name: string; primary: string; secondary: string; text: string }> = {
  red: {
    name: '紅隊',
    primary: '#ef4444',
    secondary: '#fecaca',
    text: '#991b1b',
  },
  blue: {
    name: '藍隊',
    primary: '#3b82f6',
    secondary: '#bfdbfe',
    text: '#1e40af',
  },
  green: {
    name: '綠隊',
    primary: '#22c55e',
    secondary: '#bbf7d0',
    text: '#166534',
  },
  yellow: {
    name: '黃隊',
    primary: '#eab308',
    secondary: '#fef08a',
    text: '#854d0e',
  },
}

/**
 * 獲取團隊顏色列表（根據數量）
 */
export function getTeamColors(count: number): TeamColor[] {
  const colors: TeamColor[] = ['red', 'blue', 'green', 'yellow']
  return colors.slice(0, count)
}

/**
 * 獲取團隊默認名稱
 */
export function getDefaultTeamName(color: TeamColor): string {
  return TEAM_COLORS[color].name
}

// =====================================================
// 等級稱號系統
// =====================================================

export interface RankTitle {
  minLevel: number
  maxLevel: number
  title: string
  color: string
}

export const RANK_TITLES: RankTitle[] = [
  { minLevel: 1, maxLevel: 2, title: '童生', color: '#78716c' },
  { minLevel: 3, maxLevel: 5, title: '秀才', color: '#22c55e' },
  { minLevel: 6, maxLevel: 9, title: '舉人', color: '#3b82f6' },
  { minLevel: 10, maxLevel: 14, title: '進士', color: '#8b5cf6' },
  { minLevel: 15, maxLevel: 19, title: '探花', color: '#f59e0b' },
  { minLevel: 20, maxLevel: 24, title: '榜眼', color: '#ef4444' },
  { minLevel: 25, maxLevel: 999, title: '狀元', color: '#dc2626' },
]

/**
 * 根據等級獲取稱號
 */
export function getRankTitle(level: number): RankTitle {
  for (const rank of RANK_TITLES) {
    if (level >= rank.minLevel && level <= rank.maxLevel) {
      return rank
    }
  }
  // 默認返回童生（第一個等級）
  return RANK_TITLES[0]!
}

/**
 * 計算連勝獎勵
 */
export function calculateStreakBonus(streak: number): number {
  let bonus = 0
  for (const [requiredStreak, amount] of Object.entries(WIN_STREAK_BONUSES)) {
    if (streak >= Number(requiredStreak)) {
      bonus = amount
    }
  }
  return bonus
}

