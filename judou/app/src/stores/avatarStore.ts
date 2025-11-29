/**
 * 句豆 - 頭像系統 Store
 * 
 * 管理用戶頭像的解鎖、選擇和顯示
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from './authStore'

// =====================================================
// 類型定義
// =====================================================

export type AvatarRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type UnlockType = 'default' | 'level' | 'achievement' | 'event'

export interface Avatar {
  id: string
  name: string
  filename: string
  rarity: AvatarRarity
  unlock_type: UnlockType
  unlock_value: number | null
  unlock_description: string | null
  order_index: number
}

export interface UserAvatar {
  avatar_id: string
  unlocked_at: string
}

// 稀有度配置
export const RARITY_CONFIG: Record<AvatarRarity, { label: string; stars: number; color: string }> = {
  common: { label: '普通', stars: 1, color: '#78716c' },
  rare: { label: '稀有', stars: 2, color: '#3b82f6' },
  epic: { label: '珍貴', stars: 3, color: '#a855f7' },
  legendary: { label: '傳奇', stars: 4, color: '#f59e0b' }
}

// =====================================================
// Store 定義
// =====================================================

export const useAvatarStore = defineStore('avatar', () => {
  const supabase = useSupabase()
  const authStore = useAuthStore()

  // 狀態
  const allAvatars = ref<Avatar[]>([])
  const unlockedAvatarIds = ref<Set<string>>(new Set())
  const currentAvatarId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性：按稀有度分組的頭像
  const avatarsByRarity = computed(() => {
    const groups: Record<AvatarRarity, Avatar[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: []
    }
    
    for (const avatar of allAvatars.value) {
      groups[avatar.rarity].push(avatar)
    }
    
    // 每個分組按 order_index 排序
    for (const key of Object.keys(groups) as AvatarRarity[]) {
      groups[key].sort((a, b) => a.order_index - b.order_index)
    }
    
    return groups
  })

  // 計算屬性：當前頭像
  const currentAvatar = computed(() => {
    if (!currentAvatarId.value) return null
    return allAvatars.value.find(a => a.id === currentAvatarId.value) || null
  })

  // 計算屬性：當前頭像 URL
  const currentAvatarUrl = computed(() => {
    if (!currentAvatar.value) return null
    return `${import.meta.env.BASE_URL}images/avatars/${currentAvatar.value.filename}`
  })

  // 計算屬性：已解鎖頭像數量
  const unlockedCount = computed(() => unlockedAvatarIds.value.size)

  // 計算屬性：總頭像數量
  const totalCount = computed(() => allAvatars.value.length)

  // =====================================================
  // 方法
  // =====================================================

  /**
   * 獲取頭像的 URL（使用 BASE_URL 確保路徑正確）
   */
  function getAvatarUrl(avatar: Avatar): string {
    return `${import.meta.env.BASE_URL}images/avatars/${avatar.filename}`
  }

  /**
   * 檢查頭像是否已解鎖
   */
  function isUnlocked(avatarId: string): boolean {
    return unlockedAvatarIds.value.has(avatarId)
  }

  /**
   * 獲取所有頭像列表
   */
  async function fetchAvatars() {
    if (!supabase) return

    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('avatars')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError

      allAvatars.value = data || []
    } catch (err: any) {
      console.error('獲取頭像列表失敗:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 獲取用戶已解鎖的頭像
   */
  async function fetchUserAvatars() {
    if (!supabase || !authStore.user?.id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('user_avatars')
        .select('avatar_id')
        .eq('user_id', authStore.user.id)

      if (fetchError) throw fetchError

      unlockedAvatarIds.value = new Set((data || []).map(ua => ua.avatar_id))
    } catch (err: any) {
      console.error('獲取用戶頭像失敗:', err)
    }
  }

  /**
   * 獲取用戶當前頭像
   */
  async function fetchCurrentAvatar() {
    if (!supabase || !authStore.user?.id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('current_avatar_id')
        .eq('id', authStore.user.id)
        .single()

      if (fetchError) throw fetchError

      currentAvatarId.value = data?.current_avatar_id || null
    } catch (err: any) {
      console.error('獲取當前頭像失敗:', err)
    }
  }

  /**
   * 初始化頭像系統
   */
  async function initialize() {
    await fetchAvatars()
    
    if (authStore.isAuthenticated) {
      await Promise.all([
        fetchUserAvatars(),
        fetchCurrentAvatar()
      ])
    }
  }

  /**
   * 檢查並解鎖頭像（根據等級）
   * @returns 新解鎖的頭像列表
   */
  async function checkAndUnlockAvatars(level: number): Promise<Avatar[]> {
    if (!supabase || !authStore.user?.id) return []

    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_and_unlock_avatars', {
          p_user_id: authStore.user.id,
          p_level: level
        })

      if (rpcError) throw rpcError

      // 更新本地狀態
      const newlyUnlocked: Avatar[] = []
      for (const item of data || []) {
        unlockedAvatarIds.value.add(item.avatar_id)
        const avatar = allAvatars.value.find(a => a.id === item.avatar_id)
        if (avatar) {
          newlyUnlocked.push(avatar)
        }
      }

      return newlyUnlocked
    } catch (err: any) {
      console.error('檢查解鎖頭像失敗:', err)
      return []
    }
  }

  /**
   * 解鎖成就頭像
   * @param achievementId 成就ID（1=首戰告捷, 2=連勝大師）
   */
  async function unlockAchievementAvatar(achievementId: number): Promise<Avatar | null> {
    if (!supabase || !authStore.user?.id) return null

    try {
      // 找到對應的成就頭像
      const avatar = allAvatars.value.find(
        a => a.unlock_type === 'achievement' && a.unlock_value === achievementId
      )

      if (!avatar) return null

      // 檢查是否已解鎖
      if (unlockedAvatarIds.value.has(avatar.id)) return null

      // 解鎖頭像
      const { error: insertError } = await supabase
        .from('user_avatars')
        .insert({
          user_id: authStore.user.id,
          avatar_id: avatar.id
        })

      if (insertError) {
        // 可能已經解鎖（重複插入）
        if (insertError.code === '23505') return null
        throw insertError
      }

      // 更新本地狀態
      unlockedAvatarIds.value.add(avatar.id)

      return avatar
    } catch (err: any) {
      console.error('解鎖成就頭像失敗:', err)
      return null
    }
  }

  /**
   * 更換頭像
   */
  async function setCurrentAvatar(avatarId: string): Promise<boolean> {
    if (!supabase || !authStore.user?.id) return false

    // 檢查是否已解鎖
    if (!unlockedAvatarIds.value.has(avatarId)) {
      error.value = '尚未解鎖此頭像'
      return false
    }

    try {
      const { data, error: rpcError } = await supabase
        .rpc('update_user_avatar', {
          p_user_id: authStore.user.id,
          p_avatar_id: avatarId
        })

      if (rpcError) throw rpcError

      if (data) {
        currentAvatarId.value = avatarId
        return true
      }

      return false
    } catch (err: any) {
      console.error('更換頭像失敗:', err)
      error.value = err.message
      return false
    }
  }

  /**
   * 重置狀態
   */
  function reset() {
    unlockedAvatarIds.value = new Set()
    currentAvatarId.value = null
    error.value = null
  }

  return {
    // 狀態
    allAvatars,
    unlockedAvatarIds,
    currentAvatarId,
    isLoading,
    error,

    // 計算屬性
    avatarsByRarity,
    currentAvatar,
    currentAvatarUrl,
    unlockedCount,
    totalCount,

    // 方法
    getAvatarUrl,
    isUnlocked,
    fetchAvatars,
    fetchUserAvatars,
    fetchCurrentAvatar,
    initialize,
    checkAndUnlockAvatars,
    unlockAchievementAvatar,
    setCurrentAvatar,
    reset
  }
})

