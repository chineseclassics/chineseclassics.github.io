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

// =====================================================
// 豆製品徽章系統（隊伍標識）
// =====================================================

export type BeanProductType = '豆芽' | '豆乾' | '豆腐' | '豆包' | '豆豉' | '豆漿' | '油豆腐' | '豆苗'

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
 * 調整為較低的數值，讓練習得分（對幾個得幾豆）更容易參與鬥豆
 */
export const ENTRY_FEE_OPTIONS = [0, 5, 15, 50]

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
  text_id: string | null  // 向後兼容（單篇）
  text_ids: string[]      // 多篇文章ID列表（新版）
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
  texts?: {
    id: string
    title: string
    author: string | null
    content: string
  }[]
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
  team_color: TeamColor  // 保留向後兼容
  bean_product?: BeanProductType  // 豆製品類型（新增，優先使用）
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
  
  // 多篇文章進度
  current_text_index: number    // 當前文章索引
  completed_texts: number       // 已完成文章數
  correct_breaks: number        // 正確斷句總數
  
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

/**
 * 文章進度記錄（多篇模式）
 */
export interface GameTextProgress {
  id: string
  participant_id: string
  text_id: string
  text_index: number
  correct_count: number
  wrong_count: number
  time_spent: number | null
  completed_at: string | null
  created_at: string
}

/**
 * 提交單篇文章成績的參數
 */
export interface SubmitTextProgressParams {
  roomId: string
  textId: string
  textIndex: number
  correctCount: number
  wrongCount: number
  timeSpent: number
}

/**
 * 即時更新文章進度與個人分數的參數（取代最終提交）
 */
export interface UpdateProgressParams {
  roomId: string
  textId: string
  textIndex: number
  correctCount: number       // 當前文章累計正確數
  wrongCount: number         // 當前文章累計錯誤數
  totalCorrect: number       // 所有文章累計正確數（= score）
  totalBeans: number         // 所有文章總豆子數（正確斷句總數）
  usedBeans: number          // 所有文章已放置豆子數
  lastInteraction: number    // 時戳（毫秒）
  isFinished: boolean        // 是否已用完所有豆子
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
  textIds: string[]       // 多篇文章ID列表
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
// 豆製品徽章配置（統一圖標系統）
// =====================================================

/**
 * 豆製品徽章配置
 * 用於隊伍標識和成就徽章系統
 */
export const BEAN_PRODUCTS: Record<BeanProductType, {
  name: string
  filename: string  // 圖片文件名（圓形圖標）
  color: string  // 主題色（用於 UI 配色）
  description: string
}> = {
  豆芽: {
    name: '豆芽',
    filename: '豆芽.png',
    color: '#a7f3d0',  // 嫩綠色
    description: '生機勃勃',
  },
  豆乾: {
    name: '豆乾',
    filename: '豆乾.png',
    color: '#d97706',  // 棕黃色
    description: '堅實耐嚼',
  },
  豆腐: {
    name: '豆腐',
    filename: '豆腐.png',
    color: '#f3f4f6',  // 灰白色
    description: '柔軟細膩',
  },
  豆包: {
    name: '豆包',
    filename: '豆包.png',
    color: '#fbbf24',  // 金黃色
    description: '圓潤飽滿',
  },
  豆豉: {
    name: '豆豉',
    filename: '豆豉.png',
    color: '#78350f',  // 深棕色
    description: '發酵深度',
  },
  豆漿: {
    name: '豆漿',
    filename: '豆漿.png',
    color: '#fef3c7',  // 米白色
    description: '流暢滋養',
  },
  油豆腐: {
    name: '油豆腐',
    filename: '油豆腐.png',
    color: '#fbbf24',  // 金黃色
    description: '外酥內嫩',
  },
  豆苗: {
    name: '豆苗',
    filename: '豆苗.png',
    color: '#86efac',  // 淺綠色
    description: '清新翠綠',
  },
}

/**
 * 獲取豆製品徽章的圖片 URL
 */
export function getBeanProductBadgeUrl(productType: BeanProductType): string {
  const product = BEAN_PRODUCTS[productType]
  // 直接使用絕對路徑，確保在開發和生產環境都能正確加載
  const baseUrl = import.meta.env.BASE_URL || '/judou/'
  // 移除重複的斜杠
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBase}/images/team-badges/${product.filename}`
}

/**
 * 隊伍使用的豆製品列表（按順序，最多 4 個）
 */
export const TEAM_BEAN_PRODUCTS: BeanProductType[] = ['豆芽', '豆乾', '豆腐', '豆包']

/**
 * 根據隊伍數量獲取豆製品列表
 */
export function getTeamBeanProducts(count: number): BeanProductType[] {
  return TEAM_BEAN_PRODUCTS.slice(0, count)
}

/**
 * 獲取隊伍的豆製品名稱
 */
export function getTeamBeanProductName(productType: BeanProductType): string {
  return BEAN_PRODUCTS[productType].name
}

/**
 * 獲取隊伍的豆製品類型（如果存在）
 */
export function getTeamBeanProduct(team: GameTeam): BeanProductType | null {
  return team.bean_product || null
}

/**
 * 獲取隊伍的主題色（優先使用豆製品顏色，否則使用隊伍顏色）
 */
export function getTeamThemeColor(team: GameTeam): string {
  if (team.bean_product) {
    return BEAN_PRODUCTS[team.bean_product].color
  }
  return TEAM_COLORS[team.team_color].primary
}

// =====================================================
// 團隊顏色配置（保留向後兼容）
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
// 等級稱號系統（科舉制度）
// =====================================================

export interface RankTitle {
  level: number
  title: string
  description: string
  icon: string
  color: string
}

/**
 * 科舉等級稱號表
 * 每個等級一個獨特稱號，從蒙童到大學士
 */
export const RANK_TITLES: RankTitle[] = [
  // 啟蒙階段（灰色系）
  { level: 1,  title: '蒙童',     description: '剛開始啟蒙識字',       icon: '📒', color: '#78716c' },
  { level: 2,  title: '童生',     description: '準備參加科考',         icon: '📚', color: '#78716c' },
  
  // 秀才階段（綠色系）
  { level: 3,  title: '生員',     description: '通過縣試',             icon: '📖', color: '#22c55e' },
  { level: 4,  title: '秀才',     description: '通過院試',             icon: '🎓', color: '#22c55e' },
  { level: 5,  title: '廩生',     description: '優秀秀才，享廩膳',     icon: '📜', color: '#16a34a' },
  
  // 舉人階段（藍色系）
  { level: 6,  title: '貢生',     description: '被選送國子監',         icon: '🏛️', color: '#3b82f6' },
  { level: 7,  title: '監生',     description: '國子監學生',           icon: '🎋', color: '#3b82f6' },
  { level: 8,  title: '舉人',     description: '鄉試及第',             icon: '🏮', color: '#2563eb' },
  { level: 9,  title: '解元',     description: '鄉試第一名',           icon: '🎖️', color: '#1d4ed8' },
  
  // 進士階段（紫色系）
  { level: 10, title: '貢士',     description: '會試及第',             icon: '📯', color: '#8b5cf6' },
  { level: 11, title: '會元',     description: '會試第一名',           icon: '🏆', color: '#8b5cf6' },
  { level: 12, title: '進士',     description: '殿試及第',             icon: '👨‍🎓', color: '#7c3aed' },
  { level: 13, title: '二甲進士', description: '殿試前列',             icon: '🥈', color: '#7c3aed' },
  { level: 14, title: '一甲進士', description: '殿試頂尖',             icon: '🥇', color: '#6d28d9' },
  
  // 三鼎甲階段（金色系）
  { level: 15, title: '探花',     description: '殿試第三名',           icon: '🌸', color: '#f59e0b' },
  { level: 16, title: '榜眼',     description: '殿試第二名',           icon: '👁️', color: '#d97706' },
  { level: 17, title: '狀元',     description: '殿試第一名',           icon: '👑', color: '#b45309' },
  
  // 翰林階段（紅金色系）
  { level: 18, title: '翰林',     description: '入翰林院',             icon: '🖋️', color: '#dc2626' },
  { level: 19, title: '學士',     description: '翰林學士',             icon: '📿', color: '#b91c1c' },
  { level: 20, title: '大學士',   description: '內閣大學士，位極人臣', icon: '🎭', color: '#991b1b' },
]

/**
 * 根據等級獲取稱號
 */
export function getRankTitle(level: number): RankTitle {
  // 等級超過最高定義時，返回最高稱號
  if (level >= RANK_TITLES.length) {
    return RANK_TITLES[RANK_TITLES.length - 1]!
  }
  // 等級從1開始，數組從0開始
  return RANK_TITLES[Math.max(0, level - 1)]!
}

/**
 * 獲取下一個等級的稱號（用於顯示升級目標）
 */
export function getNextRankTitle(level: number): RankTitle | null {
  if (level >= RANK_TITLES.length) {
    return null // 已達最高等級
  }
  return RANK_TITLES[level] || null
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
