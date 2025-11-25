/**
 * 通知管理 Store
 * 使用 Pinia 管理用戶通知
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useNotificationStore = defineStore('notifications', () => {
  // ========== 狀態 ==========
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)

  // ========== 計算屬性 ==========
  const hasUnread = computed(() => unreadCount.value > 0)

  const unreadNotifications = computed(() => {
    return notifications.value.filter((n) => !n.is_read)
  })

  // ========== 方法 ==========

  /**
   * 檢查通知數量
   */
  async function checkNotifications(userId) {
    if (!supabase || !userId) return 0

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error

      unreadCount.value = count || 0
      return count || 0
    } catch (error) {
      console.error('檢查通知失敗:', error)
      return 0
    }
  }

  /**
   * 加載通知列表
   */
  async function loadNotifications(userId) {
    if (!supabase || !userId) return []

    try {
      loading.value = true

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      notifications.value = data || []
      unreadCount.value = notifications.value.filter((n) => !n.is_read).length

      return data || []
    } catch (error) {
      console.error('加載通知失敗:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 標記通知為已讀
   */
  async function markAsRead(notificationId, userId) {
    if (!supabase || !userId) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error

      // 更新本地狀態
      const notification = notifications.value.find((n) => n.id === notificationId)
      if (notification) {
        notification.is_read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }

      return true
    } catch (error) {
      console.error('標記通知已讀失敗:', error)
      return false
    }
  }

  /**
   * 標記所有通知為已讀
   */
  async function markAllAsRead(userId) {
    if (!supabase || !userId) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error

      // 更新本地狀態
      notifications.value.forEach((n) => {
        n.is_read = true
      })
      unreadCount.value = 0

      return true
    } catch (error) {
      console.error('標記所有通知已讀失敗:', error)
      return false
    }
  }

  return {
    // 狀態
    notifications,
    unreadCount,
    loading,
    // 計算屬性
    hasUnread,
    unreadNotifications,
    // 方法
    checkNotifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  }
})

