/**
 * 句豆 - 用戶統計 Store
 * 
 * 管理用戶的豆子數量、等級和其他統計數據
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

// 等級配置：每個等級需要的經驗值
const LEVEL_THRESHOLDS = [
  0,      // Lv.1: 0
  100,    // Lv.2: 100
  300,    // Lv.3: 300
  600,    // Lv.4: 600
  1000,   // Lv.5: 1000
  1500,   // Lv.6: 1500
  2200,   // Lv.7: 2200
  3000,   // Lv.8: 3000
  4000,   // Lv.9: 4000
  5200,   // Lv.10: 5200
  6600,   // Lv.11: 6600
  8200,   // Lv.12: 8200
  10000,  // Lv.13: 10000
  12000,  // Lv.14: 12000
  15000,  // Lv.15: 15000
]

export interface UserStats {
  id: string
  user_id: string
  beans: number           // 豆子數量
  total_exp: number       // 總經驗值
  total_practices: number // 總練習次數
  correct_count: number   // 正確次數
  streak_days: number     // 連續學習天數
  last_practice_at: string | null
  created_at: string
  updated_at: string
}

export const useUserStatsStore = defineStore('userStats', () => {
  const authStore = useAuthStore()
  
  // 狀態
  const stats = ref<UserStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 計算等級
  const level = computed(() => {
    if (!stats.value) return 1
    const exp = stats.value.total_exp
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = LEVEL_THRESHOLDS[i]
      if (threshold !== undefined && exp >= threshold) {
        return i + 1
      }
    }
    return 1
  })

  // 當前等級進度（百分比）
  const levelProgress = computed(() => {
    if (!stats.value) return 0
    const currentLevel = level.value
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || currentThreshold + 1000
    const expInLevel = stats.value.total_exp - currentThreshold
    const expNeeded = nextThreshold - currentThreshold
    return Math.min(100, Math.round((expInLevel / expNeeded) * 100))
  })

  // 距離下一等級還需要的經驗值
  const expToNextLevel = computed(() => {
    if (!stats.value) return 100
    const currentLevel = level.value
    const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 15000
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] ?? lastThreshold + 1000
    return Math.max(0, nextThreshold - stats.value.total_exp)
  })

  // 正確率
  const accuracy = computed(() => {
    if (!stats.value || stats.value.total_practices === 0) return 0
    return Math.round((stats.value.correct_count / stats.value.total_practices) * 100)
  })

  // 獲取用戶統計
  async function fetchStats() {
    if (!supabase || !authStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', authStore.user.id)
        .single()

      if (fetchError) {
        // 如果沒有記錄，創建一個
        if (fetchError.code === 'PGRST116') {
          await createInitialStats()
          return
        }
        throw fetchError
      }

      stats.value = data
    } catch (e) {
      error.value = (e as Error).message
      console.error('獲取用戶統計失敗:', e)
    } finally {
      loading.value = false
    }
  }

  // 創建初始統計記錄
  async function createInitialStats() {
    if (!supabase || !authStore.user) return

    try {
      const { data, error: insertError } = await supabase
        .from('user_stats')
        .insert({
          user_id: authStore.user.id,
          beans: 0,
          total_exp: 0,
          total_practices: 0,
          correct_count: 0,
          streak_days: 0
        })
        .select()
        .single()

      if (insertError) throw insertError
      stats.value = data
    } catch (e) {
      error.value = (e as Error).message
      console.error('創建用戶統計失敗:', e)
    }
  }

  // 增加豆子
  async function addBeans(amount: number) {
    if (!supabase || !stats.value) return false

    try {
      const newBeans = stats.value.beans + amount
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({ beans: newBeans, updated_at: new Date().toISOString() })
        .eq('user_id', stats.value.user_id)

      if (updateError) throw updateError
      stats.value.beans = newBeans
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  // 增加經驗值
  async function addExp(amount: number) {
    if (!supabase || !stats.value) return false

    try {
      const newExp = stats.value.total_exp + amount
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({ total_exp: newExp, updated_at: new Date().toISOString() })
        .eq('user_id', stats.value.user_id)

      if (updateError) throw updateError
      stats.value.total_exp = newExp
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  // 記錄練習
  async function recordPractice(isCorrect: boolean, beansEarned: number, expEarned: number) {
    if (!supabase || !stats.value) return false

    try {
      const updates = {
        beans: stats.value.beans + beansEarned,
        total_exp: stats.value.total_exp + expEarned,
        total_practices: stats.value.total_practices + 1,
        correct_count: stats.value.correct_count + (isCorrect ? 1 : 0),
        last_practice_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', stats.value.user_id)

      if (updateError) throw updateError
      
      stats.value.beans = updates.beans
      stats.value.total_exp = updates.total_exp
      stats.value.total_practices = updates.total_practices
      stats.value.correct_count = updates.correct_count
      stats.value.last_practice_at = updates.last_practice_at
      
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  // 重置（用於登出時）
  function reset() {
    stats.value = null
    error.value = null
  }

  return {
    // 狀態
    stats,
    loading,
    error,
    
    // 計算屬性
    level,
    levelProgress,
    expToNextLevel,
    accuracy,
    
    // 方法
    fetchStats,
    addBeans,
    addExp,
    recordPractice,
    reset
  }
})

