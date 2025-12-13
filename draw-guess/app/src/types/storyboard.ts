/**
 * 分鏡接龍模式 - TypeScript 類型定義
 * Requirements: 10.1
 */

// ============================================
// 遊戲模式類型
// ============================================

/** 遊戲模式 */
export type GameMode = 'classic' | 'storyboard'

/** 分鏡模式輪次階段 */
export type StoryboardPhase = 
  | 'setup'      // 故事開頭設定
  | 'drawing'    // 繪畫階段
  | 'writing'    // 編劇階段
  | 'voting'     // 投票階段
  | 'summary'    // 結算階段
  | 'ending'     // 故事結局設定
  | 'review'     // 故事回顧

// ============================================
// 故事鏈相關類型
// ============================================

/** 故事鏈項目類型 */
export type StoryChainItemType = 'text' | 'image'

/** 
 * 故事鏈項目
 * 
 * 注意 roundNumber 的特殊值：
 * - 0：故事開頭（由房主在遊戲開始時設定）
 * - 正數：正常輪次的內容（圖片和勝出句子）
 * - -1：故事結尾（由房主在最後一局結束時設定，可選）
 */
export interface StoryChainItem {
  id: string
  roomId: string
  /** 
   * 輪次編號
   * - 0 = 故事開頭
   * - 正數 = 正常輪次
   * - -1 = 故事結尾
   */
  roundNumber: number
  itemType: StoryChainItemType
  content: string  // 文字內容或圖片 URL
  authorId: string | null
  authorName: string | null
  createdAt: string
}

/** 故事鏈項目（數據庫格式，snake_case） */
export interface StoryChainItemDB {
  id: string
  room_id: string
  round_number: number
  item_type: StoryChainItemType
  content: string
  author_id: string | null
  author_name: string | null
  created_at: string
}

// ============================================
// 句子提交相關類型
// ============================================

/** 句子提交 */
export interface Submission {
  id: string
  roundId: string
  userId: string
  sentence: string
  voteCount: number
  isWinner: boolean
  createdAt: string
  updatedAt: string
}

/** 句子提交（數據庫格式，snake_case） */
export interface SubmissionDB {
  id: string
  round_id: string
  user_id: string
  sentence: string
  vote_count: number
  is_winner: boolean
  created_at: string
  updated_at: string
}

// ============================================
// 投票相關類型
// ============================================

/** 投票記錄 */
export interface Vote {
  id: string
  roundId: string
  voterId: string
  submissionId: string
  createdAt: string
}

/** 投票記錄（數據庫格式，snake_case） */
export interface VoteDB {
  id: string
  round_id: string
  voter_id: string
  submission_id: string
  created_at: string
}

// ============================================
// 擴展的房間類型
// ============================================

/** 分鏡模式房間擴展字段 */
export interface StoryboardRoomFields {
  gameMode: GameMode
  singleRoundMode: boolean
  isFinalRound: boolean
  storyboardPhase: StoryboardPhase
}

/** 分鏡模式房間擴展字段（數據庫格式） */
export interface StoryboardRoomFieldsDB {
  game_mode: GameMode
  single_round_mode: boolean
  is_final_round: boolean
  storyboard_phase: StoryboardPhase
}

// ============================================
// 組件 Props 類型
// ============================================

/** StoryPanel 組件 Props */
export interface StoryPanelProps {
  phase: StoryboardPhase
  storyHistory: StoryChainItem[]
  submissions?: Submission[]
  mySubmission?: string
  votedSubmissionId?: string
}

/** StoryReview 組件 Props */
export interface StoryReviewProps {
  storyChain: StoryChainItem[]
  title: string
  participants: Participant[]
  scores: PlayerScore[]
}

/** StorySetupModal 組件 Props */
export interface StorySetupModalProps {
  isHost: boolean
}

// ============================================
// 輔助類型
// ============================================

/** 參與者信息 */
export interface Participant {
  id: string
  nickname: string
  score: number
}

/** 玩家得分 */
export interface PlayerScore {
  userId: string
  nickname: string
  totalScore: number
  sentenceWins: number
  drawingCount: number
}

/** 投票統計 */
export interface VoteCount {
  submissionId: string
  count: number
}

/** 
 * 分鏡模式輪次結算結果
 * 用於顯示結算頁面和傳遞結算數據
 */
export interface StoryboardRoundResult {
  success: boolean
  error?: string
  winningSentence?: string
  winnerName?: string
  winnerId?: string
  winnerVoteCount?: number
  drawerScore?: number
  screenwriterScore?: number
  imageUrl?: string
}

// ============================================
// 類型轉換工具函數
// ============================================

/** 將數據庫格式的故事鏈項目轉換為前端格式 */
export function toStoryChainItem(db: StoryChainItemDB): StoryChainItem {
  return {
    id: db.id,
    roomId: db.room_id,
    roundNumber: db.round_number,
    itemType: db.item_type,
    content: db.content,
    authorId: db.author_id,
    authorName: db.author_name,
    createdAt: db.created_at,
  }
}

/** 將數據庫格式的句子提交轉換為前端格式 */
export function toSubmission(db: SubmissionDB): Submission {
  return {
    id: db.id,
    roundId: db.round_id,
    userId: db.user_id,
    sentence: db.sentence,
    voteCount: db.vote_count,
    isWinner: db.is_winner,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

/** 將數據庫格式的投票記錄轉換為前端格式 */
export function toVote(db: VoteDB): Vote {
  return {
    id: db.id,
    roundId: db.round_id,
    voterId: db.voter_id,
    submissionId: db.submission_id,
    createdAt: db.created_at,
  }
}

// ============================================
// 驗證工具函數
// ============================================

/** 驗證句子是否有效（非空且不超過 100 字符） */
export function isValidSentence(sentence: string): boolean {
  const trimmed = sentence.trim()
  return trimmed.length > 0 && trimmed.length <= 100
}

/** 驗證句子是否為空白 */
export function isBlankSentence(sentence: string): boolean {
  return sentence.trim().length === 0
}

/** 驗證句子是否超過字數限制 */
export function isOverLimit(sentence: string, limit: number = 100): boolean {
  return sentence.length > limit
}
