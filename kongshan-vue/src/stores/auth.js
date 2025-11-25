/**
 * 認證狀態管理 Store
 * 使用 Pinia 管理用戶認證狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  // ========== 狀態 ==========
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const authStatus = ref('initializing') // 'initializing' | 'signed_out' | 'google' | 'other' | 'connecting' | 'error'
  const authMessage = ref('')
  const visitorCount = ref(null)

  // ========== 計算屬性 ==========
  const isAuthenticated = computed(() => {
    return authStatus.value === 'google' || authStatus.value === 'other'
  })

  const isGoogle = computed(() => authStatus.value === 'google')

  const userId = computed(() => user.value?.id || null)

  const userMetadata = computed(() => {
    if (!user.value) return null
    
    const provider = user.value.app_metadata?.provider || 'unknown'
    const fullName = user.value.user_metadata?.full_name || user.value.user_metadata?.name || ''
    const email = user.value.user_metadata?.email || user.value.email || ''
    const avatarUrl = user.value.user_metadata?.avatar_url || ''

    return {
      id: user.value.id,
      provider,
      fullName,
      email,
      avatarUrl,
    }
  })

  // ========== 方法 ==========
  
  /**
   * 初始化認證狀態
   */
  async function initialize() {
    if (!supabase) {
      authStatus.value = 'signed_out'
      loading.value = false
      return
    }

    try {
      authStatus.value = 'connecting'
      
      // 獲取當前 session
      const { data, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (data?.session) {
        session.value = data.session
        user.value = data.session.user
        syncUserState(data.session.user)
      } else {
        authStatus.value = 'signed_out'
      }
    } catch (error) {
      console.error('初始化認證失敗:', error)
      authMessage.value = `初始化失敗：${error.message}`
      authStatus.value = 'error'
    } finally {
      loading.value = false
    }
  }

  /**
   * 設置認證監聽器
   */
  function setupAuthListener() {
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user || null
      
      if (newSession?.user) {
        syncUserState(newSession.user)
      } else {
        authStatus.value = 'signed_out'
        visitorCount.value = null
      }
    })

    return data?.subscription
  }

  /**
   * 同步用戶狀態
   */
  function syncUserState(authUser) {
    if (!authUser) {
      user.value = null
      authStatus.value = 'signed_out'
      visitorCount.value = null
      return
    }

    const provider = authUser.app_metadata?.provider || 'unknown'
    
    if (provider === 'google') {
      authStatus.value = 'google'
      registerTraveler(authUser)
    } else {
      authStatus.value = 'other'
      visitorCount.value = null
    }

    authMessage.value = ''
  }

  /**
   * 註冊旅人（僅 Google 用戶）
   */
  async function registerTraveler(authUser) {
    if (!supabase || !authUser) return

    try {
      const displayName = authUser.user_metadata?.full_name || 
                         authUser.user_metadata?.name || 
                         authUser.email || '旅人'
      const email = authUser.email || authUser.user_metadata?.email || null

      // Upsert 旅人資料
      const { error } = await supabase
        .from('travelers')
        .upsert(
          {
            user_id: authUser.id,
            display_name: displayName,
            email: email,
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.warn('註冊旅人失敗:', error)
        return
      }

      // 獲取旅人總數
      const { count, error: countError } = await supabase
        .from('travelers')
        .select('user_id', { count: 'exact', head: true })

      if (!countError && typeof count === 'number') {
        visitorCount.value = count
      }
    } catch (error) {
      console.warn('註冊旅人異常:', error)
    }
  }

  /**
   * Google 登入
   */
  async function signInWithGoogle() {
    if (!supabase) {
      authMessage.value = '未連接到數據庫'
      return { error: new Error('Supabase 未初始化') }
    }

    try {
      authStatus.value = 'connecting'
      authMessage.value = ''

      // 計算重定向 URL
      const redirectTo = computeRedirectUrl()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Google 登入失敗:', error)
      authMessage.value = `登入失敗：${error.message}`
      authStatus.value = 'error'
      return { error }
    }
  }

  /**
   * 登出
   */
  async function signOut() {
    if (!supabase) return

    try {
      authStatus.value = 'connecting'
      authMessage.value = '正在登出...'

      const { error } = await supabase.auth.signOut()
      
      if (error) throw error

      user.value = null
      session.value = null
      authStatus.value = 'signed_out'
      authMessage.value = ''
      visitorCount.value = null
    } catch (error) {
      console.error('登出失敗:', error)
      authMessage.value = `登出失敗：${error.message}`
      authStatus.value = 'error'
    }
  }

  /**
   * 計算重定向 URL
   */
  function computeRedirectUrl() {
    const { origin, pathname } = window.location
    let normalizedPath = pathname

    // 標準化路徑（Vue Router Hash 模式）
    if (!normalizedPath.endsWith('/') && !normalizedPath.endsWith('.html')) {
      normalizedPath = `${normalizedPath}/`
    }

    if (normalizedPath.endsWith('/')) {
      normalizedPath = `${normalizedPath}index.html`
    }

    return `${origin}${normalizedPath}`
  }

  return {
    // 狀態
    user,
    session,
    loading,
    authStatus,
    authMessage,
    visitorCount,
    // 計算屬性
    isAuthenticated,
    isGoogle,
    userId,
    userMetadata,
    // 方法
    initialize,
    setupAuthListener,
    signInWithGoogle,
    signOut,
  }
})

