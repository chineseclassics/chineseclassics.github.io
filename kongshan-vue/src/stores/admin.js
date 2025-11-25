/**
 * 管理員權限 Store
 * 使用 Pinia 管理管理員狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAdminStore = defineStore('admin', () => {
  // ========== 狀態 ==========
  const isAdmin = ref(false)
  const adminInfo = ref(null)
  const loading = ref(false)

  // ========== 方法 ==========

  /**
   * 檢查用戶是否為管理員
   */
  async function checkAdmin(userId) {
    if (!supabase || !userId) {
      isAdmin.value = false
      return false
    }

    try {
      loading.value = true

      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.warn('檢查管理員權限失敗:', error)
        isAdmin.value = false
        return false
      }

      if (data) {
        isAdmin.value = true
        adminInfo.value = data
        return true
      } else {
        isAdmin.value = false
        adminInfo.value = null
        return false
      }
    } catch (error) {
      console.error('檢查管理員權限異常:', error)
      isAdmin.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空管理員狀態
   */
  function clear() {
    isAdmin.value = false
    adminInfo.value = null
  }

  return {
    // 狀態
    isAdmin,
    adminInfo,
    loading,
    // 方法
    checkAdmin,
    clear,
  }
})

