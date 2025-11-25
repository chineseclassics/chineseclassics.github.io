/**
 * 聲色意境管理 Store
 * 使用 Pinia 管理聲色意境數據和狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAtmosphereStore = defineStore('atmospheres', () => {
  // ========== 狀態 ==========
  const atmospheres = ref([])
  const currentAtmosphere = ref(null)
  const currentPoemId = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  // 點讚相關
  const userLikedAtmosphereId = ref(null)
  
  // 當前意境索引（用於切換）
  const currentIndex = ref(0)

  // ========== 計算屬性 ==========
  
  /**
   * 已審核通過的意境
   */
  const approvedAtmospheres = computed(() => {
    return atmospheres.value.filter(a => a.status === 'approved')
  })

  /**
   * 用戶自己創作的意境（包括待審核）
   */
  const userAtmospheres = computed(() => (userId) => {
    if (!userId) return []
    return atmospheres.value.filter(a => a.created_by === userId)
  })

  /**
   * 是否有意境
   */
  const hasAtmospheres = computed(() => {
    return atmospheres.value.length > 0
  })

  /**
   * 當前意境是否被當前用戶點讚
   */
  const isCurrentLiked = computed(() => {
    return currentAtmosphere.value?.id === userLikedAtmosphereId.value
  })

  // ========== 方法 ==========

  /**
   * 加載詩歌的所有聲色意境
   * @param {string} poemId - 詩歌 ID
   * @param {string|null} userId - 當前用戶 ID（可選）
   */
  async function loadAtmospheres(poemId, userId = null) {
    if (!supabase) {
      error.value = 'Supabase 未配置'
      return []
    }

    try {
      loading.value = true
      error.value = null
      currentPoemId.value = poemId

      console.log('加載聲色意境:', poemId)

      // 構建查詢
      let query = supabase
        .from('poem_atmospheres')
        .select('*')
        .eq('poem_id', poemId)

      // 如果有用戶 ID，包含該用戶的未審核意境
      if (userId) {
        query = query.or(`status.eq.approved,created_by.eq.${userId}`)
      } else {
        query = query.eq('status', 'approved')
      }

      // 按點讚數降序，創建時間升序
      query = query.order('like_count', { ascending: false }).order('created_at', { ascending: true })

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      atmospheres.value = data || []
      
      // 如果有意境，設置第一個為當前意境
      if (atmospheres.value.length > 0) {
        currentIndex.value = 0
        currentAtmosphere.value = atmospheres.value[0]
      } else {
        currentIndex.value = -1
        currentAtmosphere.value = null
      }

      // 加載用戶點讚狀態
      if (userId) {
        await loadUserLikeStatus(userId)
      }

      console.log(`加載到 ${atmospheres.value.length} 個聲色意境`)
      return data || []
    } catch (err) {
      console.error('❌ 加載聲色意境失敗:', err)
      error.value = err.message || '加載失敗'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 加載用戶點讚狀態
   */
  async function loadUserLikeStatus(userId) {
    if (!supabase || !userId || atmospheres.value.length === 0) return

    try {
      const atmosphereIds = atmospheres.value.map(a => a.id)

      const { data, error: likeError } = await supabase
        .from('atmosphere_likes')
        .select('atmosphere_id')
        .in('atmosphere_id', atmosphereIds)
        .eq('user_id', userId)

      if (!likeError && data && data.length > 0) {
        userLikedAtmosphereId.value = data[0].atmosphere_id
      } else {
        userLikedAtmosphereId.value = null
      }
    } catch (err) {
      console.warn('加載點讚狀態失敗:', err)
    }
  }

  /**
   * 切換到下一個意境
   */
  function nextAtmosphere() {
    if (atmospheres.value.length === 0) return null

    currentIndex.value = (currentIndex.value + 1) % atmospheres.value.length
    currentAtmosphere.value = atmospheres.value[currentIndex.value]
    return currentAtmosphere.value
  }

  /**
   * 切換到上一個意境
   */
  function previousAtmosphere() {
    if (atmospheres.value.length === 0) return null

    currentIndex.value = (currentIndex.value - 1 + atmospheres.value.length) % atmospheres.value.length
    currentAtmosphere.value = atmospheres.value[currentIndex.value]
    return currentAtmosphere.value
  }

  /**
   * 設置當前意境（通過 ID）
   */
  function setCurrentAtmosphereById(atmosphereId) {
    const index = atmospheres.value.findIndex(a => a.id === atmosphereId)
    if (index !== -1) {
      currentIndex.value = index
      currentAtmosphere.value = atmospheres.value[index]
      return currentAtmosphere.value
    }
    return null
  }

  /**
   * 點讚/取消點讚
   * @param {string} atmosphereId - 意境 ID
   * @param {string} userId - 用戶 ID
   */
  async function toggleLike(atmosphereId, userId) {
    if (!supabase || !userId) return false

    try {
      const atmosphere = atmospheres.value.find(a => a.id === atmosphereId)
      if (!atmosphere) return false

      // 如果已經點讚其他意境，先取消
      if (userLikedAtmosphereId.value && userLikedAtmosphereId.value !== atmosphereId) {
        await unlikeAtmosphere(userLikedAtmosphereId.value, userId)
      }

      // 切換當前意境的點讚狀態
      if (userLikedAtmosphereId.value === atmosphereId) {
        // 取消點讚
        await unlikeAtmosphere(atmosphereId, userId)
        userLikedAtmosphereId.value = null
      } else {
        // 點讚
        await likeAtmosphere(atmosphereId, userId)
        userLikedAtmosphereId.value = atmosphereId
      }

      return true
    } catch (err) {
      console.error('點讚操作失敗:', err)
      return false
    }
  }

  /**
   * 點讚意境
   */
  async function likeAtmosphere(atmosphereId, userId) {
    const { error: insertError } = await supabase
      .from('atmosphere_likes')
      .insert({
        atmosphere_id: atmosphereId,
        user_id: userId,
      })

    if (insertError && insertError.code !== '23505') {
      throw insertError
    }

    // 更新本地計數
    const atmosphere = atmospheres.value.find(a => a.id === atmosphereId)
    if (atmosphere) {
      atmosphere.like_count = (atmosphere.like_count || 0) + 1
    }

    // 更新數據庫計數
    await supabase
      .from('poem_atmospheres')
      .update({ like_count: atmosphere.like_count })
      .eq('id', atmosphereId)
  }

  /**
   * 取消點讚
   */
  async function unlikeAtmosphere(atmosphereId, userId) {
    const { error: deleteError } = await supabase
      .from('atmosphere_likes')
      .delete()
      .eq('atmosphere_id', atmosphereId)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // 更新本地計數
    const atmosphere = atmospheres.value.find(a => a.id === atmosphereId)
    if (atmosphere) {
      atmosphere.like_count = Math.max(0, (atmosphere.like_count || 0) - 1)
    }

    // 更新數據庫計數
    await supabase
      .from('poem_atmospheres')
      .update({ like_count: atmosphere.like_count })
      .eq('id', atmosphereId)
  }

  /**
   * 保存新的聲色意境
   */
  async function saveAtmosphere(atmosphereData, userId) {
    if (!supabase || !userId) {
      throw new Error('無法保存：未登入或 Supabase 未配置')
    }

    try {
      loading.value = true

      // 刪除該用戶在該詩句下的舊意境（覆蓋機制）
      await supabase
        .from('poem_atmospheres')
        .delete()
        .eq('poem_id', atmosphereData.poem_id)
        .eq('created_by', userId)

      // 插入新意境
      const { data, error: insertError } = await supabase
        .from('poem_atmospheres')
        .insert([{
          poem_id: atmosphereData.poem_id,
          name: atmosphereData.name,
          description: atmosphereData.description,
          sound_combination: atmosphereData.sound_combination,
          background_config: atmosphereData.background_config,
          source: atmosphereData.source || 'user',
          status: atmosphereData.status || 'pending',
          is_ai_generated: atmosphereData.is_ai_generated || false,
          created_by: userId,
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // 重新加載意境列表
      await loadAtmospheres(atmosphereData.poem_id, userId)

      return data
    } catch (err) {
      console.error('保存聲色意境失敗:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空狀態
   */
  function clear() {
    atmospheres.value = []
    currentAtmosphere.value = null
    currentPoemId.value = null
    currentIndex.value = 0
    userLikedAtmosphereId.value = null
    error.value = null
  }

  return {
    // 狀態
    atmospheres,
    currentAtmosphere,
    currentPoemId,
    currentIndex,
    loading,
    error,
    userLikedAtmosphereId,
    // 計算屬性
    approvedAtmospheres,
    userAtmospheres,
    hasAtmospheres,
    isCurrentLiked,
    // 方法
    loadAtmospheres,
    nextAtmosphere,
    previousAtmosphere,
    setCurrentAtmosphereById,
    toggleLike,
    saveAtmosphere,
    clear,
  }
})

