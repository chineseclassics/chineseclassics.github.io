/**
 * 句豆 - 用戶統計 Store
 * 
 * 管理用戶的豆子數量、等級、連續天數和排行榜
 * 使用 profiles 表作為主要數據源
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

// 等級配置：每個等級需要的豆子數
const LEVEL_THRESHOLDS = [
  0,      // Lv.1: 0
  30,     // Lv.2: 30
  100,    // Lv.3: 100
  200,    // Lv.4: 200
  350,    // Lv.5: 350
  550,    // Lv.6: 550
  850,    // Lv.7: 850
  1300,   // Lv.8: 1300
  2000,   // Lv.9: 2000
  3000,   // Lv.10: 3000
]

// 時間係數配置（平均每字用時）
const TIME_FACTORS = [
  { maxTime: 1, factor: 1.3 },   // < 1秒/字
  { maxTime: 2, factor: 1.2 },   // 1-2秒/字
  { maxTime: 3, factor: 1.1 },   // 2-3秒/字
  { maxTime: 5, factor: 1.0 },   // 3-5秒/字
  { maxTime: 8, factor: 0.9 },   // 5-8秒/字
  { maxTime: Infinity, factor: 0.7 }, // > 8秒/字
]

// 嘗試係數配置
const ATTEMPT_FACTORS = [
  1.2,   // 第1次：×1.2（一次過關獎勵）
  1.0,   // 第2次：×1.0
  0.95,  // 第3次：×0.95
  0.9,   // 第4次+：×0.9
]

// 連續天數加成配置
const STREAK_FACTORS = [
  { minDays: 30, factor: 1.2 },   // 30天+
  { minDays: 14, factor: 1.15 },  // 14-29天
  { minDays: 7, factor: 1.1 },    // 7-13天
  { minDays: 3, factor: 1.05 },   // 3-6天
  { minDays: 0, factor: 1.0 },    // 1-2天
]

// 首次完成加成
const FIRST_CLEAR_FACTOR = 1.2

// 每日獎勵
const DAILY_LOGIN_REWARD = 5
const DAILY_FIRST_PRACTICE_REWARD = 10

// 用戶 Profile 類型
export interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_seed: string | null
  grade: string | null
  total_beans: number
  weekly_beans: number
  monthly_beans: number
  streak_days: number
  max_streak: number
  last_practice_date: string | null
  last_login_date: string | null
  daily_login_claimed: boolean
  daily_first_claimed: boolean
  updated_at: string
}

// 排行榜條目類型
export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  beans: number
  isCurrentUser: boolean
}

// 排行榜類型
export type LeaderboardType = 'total' | 'weekly' | 'monthly'

export const useUserStatsStore = defineStore('userStats', () => {
  const authStore = useAuthStore()
  
  // 狀態
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 排行榜相關
  const leaderboard = ref<LeaderboardEntry[]>([])
  const leaderboardType = ref<LeaderboardType>('total')
  const leaderboardLoading = ref(false)
  
  // 當前用戶排名信息
  const rankInfo = ref<{
    rank: number
    totalUsers: number
  } | null>(null)

  // 計算等級（基於總豆子數）
  const level = computed(() => {
    if (!profile.value) return 1
    const beans = profile.value.total_beans
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = LEVEL_THRESHOLDS[i]
      if (threshold !== undefined && beans >= threshold) {
        return i + 1
      }
    }
    return 1
  })

  // 當前等級進度（百分比）
  const levelProgress = computed(() => {
    if (!profile.value) return 0
    const currentLevel = level.value
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || currentThreshold + 1000
    const beansInLevel = profile.value.total_beans - currentThreshold
    const beansNeeded = nextThreshold - currentThreshold
    return Math.min(100, Math.round((beansInLevel / beansNeeded) * 100))
  })

  // 距離下一等級還需要的豆子
  const beansToNextLevel = computed(() => {
    if (!profile.value) return 30
    const currentLevel = level.value
    if (currentLevel >= LEVEL_THRESHOLDS.length) return 0
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || 3000
    return Math.max(0, nextThreshold - profile.value.total_beans)
  })

  // 獲取時間係數
  function getTimeFactor(avgTimePerChar: number): number {
    for (const config of TIME_FACTORS) {
      if (avgTimePerChar < config.maxTime) {
        return config.factor
      }
    }
    return 0.7
  }

  // 獲取嘗試係數
  function getAttemptFactor(attemptCount: number): number {
    if (attemptCount <= 0) return 1.0
    if (attemptCount > ATTEMPT_FACTORS.length) {
      return ATTEMPT_FACTORS[ATTEMPT_FACTORS.length - 1] || 0.9
    }
    return ATTEMPT_FACTORS[attemptCount - 1] || 0.9
  }

  // 獲取連續天數加成
  function getStreakFactor(streakDays: number): number {
    for (const config of STREAK_FACTORS) {
      if (streakDays >= config.minDays) {
        return config.factor
      }
    }
    return 1.0
  }

  // 計算最終得分
  function calculateScore(params: {
    breakCount: number       // 斷句數
    charCount: number        // 文章字數
    elapsedSeconds: number   // 用時（秒）
    attemptCount: number     // 嘗試次數
    isFirstClear: boolean    // 是否首次完成該文章
  }): { score: number; breakdown: ScoreBreakdown } {
    const { breakCount, charCount, elapsedSeconds, attemptCount, isFirstClear } = params
    
    // 基礎分 = 斷句數 × 2
    const baseScore = breakCount * 2
    
    // 時間係數
    const avgTimePerChar = charCount > 0 ? elapsedSeconds / charCount : 5
    const timeFactor = getTimeFactor(avgTimePerChar)
    
    // 嘗試係數
    const attemptFactor = getAttemptFactor(attemptCount)
    
    // 連續天數加成
    const streakDays = profile.value?.streak_days || 0
    const streakFactor = getStreakFactor(streakDays)
    
    // 首次完成加成
    const firstClearFactor = isFirstClear ? FIRST_CLEAR_FACTOR : 1.0
    
    // 最終得分
    const finalScore = Math.round(baseScore * timeFactor * attemptFactor * streakFactor * firstClearFactor)
    
    return {
      score: finalScore,
      breakdown: {
        baseScore,
        timeFactor,
        attemptFactor,
        streakFactor,
        firstClearFactor,
        avgTimePerChar: Math.round(avgTimePerChar * 10) / 10
      }
    }
  }

  // 獲取用戶 Profile
  async function fetchProfile() {
    if (!supabase || !authStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authStore.user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // 沒有 profile，自動創建一個
          console.log('用戶 Profile 不存在，正在創建...')
          await createInitialProfile()
          return
        }
        throw fetchError
      }

      profile.value = data
      
      // 檢查並發放每日登入獎勵
      await checkDailyLoginReward()
    } catch (e) {
      error.value = (e as Error).message
      console.error('獲取用戶 Profile 失敗:', e)
    } finally {
      loading.value = false
    }
  }

  // 創建初始 Profile（新用戶）
  async function createInitialProfile(): Promise<void> {
    if (!supabase || !authStore.user) return
    
    try {
      // 從 users 表獲取用戶信息
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', authStore.user.id)
        .single()
      
      const displayName = userData?.display_name || authStore.user.email?.split('@')[0] || '豆友'
      const username = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authStore.user.id,
          username: username + '_' + Date.now().toString(36),
          display_name: displayName,
          total_beans: 0,
          weekly_beans: 0,
          monthly_beans: 0,
          streak_days: 0,
          max_streak: 0,
          daily_login_claimed: false,
          daily_first_claimed: false
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('創建 Profile 失敗:', insertError)
        return
      }
      
      profile.value = data
      console.log('✅ Profile 創建成功')
      
      // 發放每日登入獎勵
      await checkDailyLoginReward()
    } catch (e) {
      console.error('創建初始 Profile 失敗:', e)
    }
  }

  // 檢查並發放每日登入獎勵
  async function checkDailyLoginReward(): Promise<boolean> {
    if (!supabase || !profile.value || !authStore.user) return false
    
    const today = new Date().toISOString().split('T')[0]
    const lastLoginDate = profile.value.last_login_date
    
    // 如果今天已經領取過，直接返回
    if (lastLoginDate === today && profile.value.daily_login_claimed) {
      return false
    }
    
    // 更新登入日期和領取登入獎勵
    try {
      const updates: Partial<UserProfile> = {
        last_login_date: today,
        daily_login_claimed: true,
        total_beans: profile.value.total_beans + DAILY_LOGIN_REWARD,
        weekly_beans: profile.value.weekly_beans + DAILY_LOGIN_REWARD,
        monthly_beans: profile.value.monthly_beans + DAILY_LOGIN_REWARD,
        updated_at: new Date().toISOString()
      }
      
      // 如果是新的一天，重置每日首練標記
      if (lastLoginDate !== today) {
        updates.daily_first_claimed = false
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authStore.user.id)
      
      if (updateError) throw updateError
      
      // 更新本地狀態
      Object.assign(profile.value, updates)
      
      console.log(`🎁 每日登入獎勵 +${DAILY_LOGIN_REWARD} 豆`)
      return true
    } catch (e) {
      console.error('發放每日登入獎勵失敗:', e)
      return false
    }
  }

  // 檢查並發放每日首練獎勵
  async function checkDailyFirstPracticeReward(): Promise<number> {
    if (!supabase || !profile.value || !authStore.user) return 0
    
    // 如果今天已經領取過，直接返回
    if (profile.value.daily_first_claimed) {
      return 0
    }
    
    try {
      const updates = {
        daily_first_claimed: true,
        total_beans: profile.value.total_beans + DAILY_FIRST_PRACTICE_REWARD,
        weekly_beans: profile.value.weekly_beans + DAILY_FIRST_PRACTICE_REWARD,
        monthly_beans: profile.value.monthly_beans + DAILY_FIRST_PRACTICE_REWARD,
        updated_at: new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authStore.user.id)
      
      if (updateError) throw updateError
      
      // 更新本地狀態
      Object.assign(profile.value, updates)
      
      console.log(`🎁 每日首練獎勵 +${DAILY_FIRST_PRACTICE_REWARD} 豆`)
      return DAILY_FIRST_PRACTICE_REWARD
    } catch (e) {
      console.error('發放每日首練獎勵失敗:', e)
      return 0
    }
  }

  // 更新連續天數
  async function updateStreakDays(): Promise<void> {
    if (!supabase || !profile.value || !authStore.user) return
    
    const today = new Date().toISOString().split('T')[0] as string
    const lastPracticeDate = profile.value.last_practice_date
    
    let newStreakDays = profile.value.streak_days
    
    if (!lastPracticeDate) {
      // 首次練習
      newStreakDays = 1
    } else {
      const lastDate = new Date(lastPracticeDate as string)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        // 今天已經練習過，不變
        return
      } else if (diffDays === 1) {
        // 連續練習
        newStreakDays = profile.value.streak_days + 1
      } else {
        // 中斷了，重新開始
        newStreakDays = 1
      }
    }
    
    const newMaxStreak = Math.max(profile.value.max_streak, newStreakDays)
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          streak_days: newStreakDays,
          max_streak: newMaxStreak,
          last_practice_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', authStore.user.id)
      
      if (updateError) throw updateError
      
      profile.value.streak_days = newStreakDays
      profile.value.max_streak = newMaxStreak
      profile.value.last_practice_date = today
    } catch (e) {
      console.error('更新連續天數失敗:', e)
    }
  }

  // 檢查是否首次完成該文章
  async function checkFirstClear(textId: string): Promise<boolean> {
    if (!supabase || !authStore.user) return false
    
    try {
      const { data } = await supabase
        .from('user_text_scores')
        .select('id')
        .eq('user_id', authStore.user.id)
        .eq('text_id', textId)
        .maybeSingle()
      
      // 沒有記錄，是首次完成
      return !data
    } catch (e) {
      return false
    }
  }

  // 記錄練習結果並更新分數（最高分制）
  async function recordPracticeScore(params: {
    textId: string
    score: number
    isFirstClear: boolean
  }): Promise<{ beansEarned: number; isNewRecord: boolean }> {
    if (!supabase || !profile.value || !authStore.user) {
      return { beansEarned: 0, isNewRecord: false }
    }
    
    const { textId, score } = params
    // isFirstClear 和 today 暫時未使用，但保留以備將來擴展
    
    try {
      // 獲取現有記錄（使用 maybeSingle 避免無記錄時報錯）
      const { data: existing } = await supabase
        .from('user_text_scores')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('text_id', textId)
        .maybeSingle()
      
      let beansEarned = 0
      let isNewRecord = false
      
      if (!existing) {
        // 首次完成這篇文章
        await supabase
          .from('user_text_scores')
          .insert({
            user_id: authStore.user.id,
            text_id: textId,
            best_score: score,
            weekly_best: score,
            monthly_best: score,
            first_clear_at: new Date().toISOString(),
            attempt_count: 1
          })
        
        beansEarned = score
        isNewRecord = true
      } else {
        // 更新記錄
        const updates: Record<string, unknown> = {
          attempt_count: existing.attempt_count + 1,
          updated_at: new Date().toISOString()
        }
        
        // 總榜最高分
        if (score > existing.best_score) {
          beansEarned = score - existing.best_score
          updates.best_score = score
          isNewRecord = true
        }
        
        // 周榜最高分
        if (score > existing.weekly_best) {
          updates.weekly_best = score
        }
        
        // 月榜最高分
        if (score > existing.monthly_best) {
          updates.monthly_best = score
        }
        
        await supabase
          .from('user_text_scores')
          .update(updates)
          .eq('id', existing.id)
      }
      
      // 更新用戶總豆子數
      if (beansEarned > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_beans: profile.value.total_beans + beansEarned,
            weekly_beans: profile.value.weekly_beans + beansEarned,
            monthly_beans: profile.value.monthly_beans + beansEarned,
            updated_at: new Date().toISOString()
          })
          .eq('id', authStore.user.id)
        
        if (!updateError) {
          profile.value.total_beans += beansEarned
          profile.value.weekly_beans += beansEarned
          profile.value.monthly_beans += beansEarned
        }
      }
      
      // 更新連續天數
      await updateStreakDays()
      
      // 檢查每日首練獎勵
      const dailyBonus = await checkDailyFirstPracticeReward()
      beansEarned += dailyBonus
      
      // 清除排行榜緩存，下次查看時會刷新
      clearLeaderboardCache()
      
      return { beansEarned, isNewRecord }
    } catch (e) {
      console.error('記錄練習分數失敗:', e)
      return { beansEarned: 0, isNewRecord: false }
    }
  }

  // 排行榜緩存（避免重複查詢）
  const leaderboardCache = ref<{
    total?: { data: LeaderboardEntry[], timestamp: number },
    weekly?: { data: LeaderboardEntry[], timestamp: number },
    monthly?: { data: LeaderboardEntry[], timestamp: number }
  }>({})
  const CACHE_TTL = 30000 // 30 秒緩存

  // 獲取排行榜（優化版：並行查詢 + 緩存）
  async function fetchLeaderboard(type: LeaderboardType = 'total', forceRefresh = false) {
    if (!supabase) return
    
    // 檢查緩存
    const cached = leaderboardCache.value[type]
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      leaderboard.value = cached.data
      leaderboardType.value = type
      return
    }
    
    leaderboardLoading.value = true
    leaderboardType.value = type
    
    try {
      // 根據類型選擇排序欄位
      const orderColumn = type === 'weekly' ? 'weekly_beans' 
                        : type === 'monthly' ? 'monthly_beans' 
                        : 'total_beans'
      
      const currentUserId = authStore.user?.id
      const userBeans = profile.value?.[orderColumn === 'weekly_beans' ? 'weekly_beans' : orderColumn === 'monthly_beans' ? 'monthly_beans' : 'total_beans'] || 0
      
      // 並行執行所有查詢
      const [leaderboardResult, rankResult, totalResult] = await Promise.all([
        // 查詢 1：獲取前 10 名
        supabase
          .from('profiles')
          .select('id, display_name, total_beans, weekly_beans, monthly_beans')
          .order(orderColumn, { ascending: false })
          .limit(10),
        // 查詢 2：獲取當前用戶排名（比用戶分數高的人數）
        currentUserId ? supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt(orderColumn, userBeans) : Promise.resolve({ count: 0 }),
        // 查詢 3：獲取總用戶數
        currentUserId ? supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 })
      ])
      
      if (leaderboardResult.error) throw leaderboardResult.error
      
      const profiles = leaderboardResult.data || []
      
      const leaderboardData = profiles.map((p, index) => ({
        rank: index + 1,
        userId: p.id,
        name: p.display_name || '匿名',
        beans: type === 'weekly' ? p.weekly_beans 
             : type === 'monthly' ? p.monthly_beans 
             : p.total_beans,
        isCurrentUser: p.id === currentUserId
      }))
      
      // 更新數據
      leaderboard.value = leaderboardData
      
      // 更新緩存
      leaderboardCache.value[type] = {
        data: leaderboardData,
        timestamp: Date.now()
      }
      
      // 更新排名信息
      if (currentUserId) {
        rankInfo.value = {
          rank: ((rankResult as { count: number | null }).count || 0) + 1,
          totalUsers: (totalResult as { count: number | null }).count || 0
        }
      }
    } catch (e) {
      console.error('獲取排行榜失敗:', e)
      leaderboard.value = []
    } finally {
      leaderboardLoading.value = false
    }
  }
  
  // 清除排行榜緩存（練習完成後調用）
  function clearLeaderboardCache() {
    leaderboardCache.value = {}
  }

  // 重置（用於登出時）
  function reset() {
    profile.value = null
    leaderboard.value = []
    rankInfo.value = null
    error.value = null
  }

  // 為了兼容性，保留這些別名
  const stats = profile
  const top10 = leaderboard
  const top10Loading = leaderboardLoading
  const fetchStats = fetchProfile
  const fetchTop10 = () => fetchLeaderboard('total')
  const fetchRankInfo = () => fetchLeaderboard(leaderboardType.value)

  return {
    // 狀態
    profile,
    stats, // 別名
    loading,
    error,
    
    // 排行榜
    leaderboard,
    top10, // 別名
    leaderboardType,
    leaderboardLoading,
    top10Loading, // 別名
    rankInfo,
    
    // 計算屬性
    level,
    levelProgress,
    beansToNextLevel,
    
    // 係數計算
    getTimeFactor,
    getAttemptFactor,
    getStreakFactor,
    calculateScore,
    
    // 方法
    fetchProfile,
    fetchStats, // 別名
    fetchLeaderboard,
    fetchTop10, // 別名
    fetchRankInfo, // 別名
    checkFirstClear,
    recordPracticeScore,
    checkDailyLoginReward,
    checkDailyFirstPracticeReward,
    updateStreakDays,
    clearLeaderboardCache,
    reset,
    
    // 常量導出
    DAILY_LOGIN_REWARD,
    DAILY_FIRST_PRACTICE_REWARD,
    LEVEL_THRESHOLDS
  }
})

// 得分明細類型
export interface ScoreBreakdown {
  baseScore: number
  timeFactor: number
  attemptFactor: number
  streakFactor: number
  firstClearFactor: number
  avgTimePerChar: number
}
