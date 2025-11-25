/**
 * 句豆 - 認證 Store
 * 
 * 使用 Pinia 管理全局認證狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

// 認證配置
const AUTH_CONFIG = {
  teacherEmailPattern: /@isf\.edu\.hk$/,
  studentEmailPattern: /@student\.isf\.edu\.hk$/,
  redirectTo: window.location.origin + '/judou/'
}

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // 計算屬性
  const isAuthenticated = computed(() => !!user.value)
  
  const userRole = computed(() => {
    if (!user.value?.email) return null
    if (AUTH_CONFIG.teacherEmailPattern.test(user.value.email)) return 'teacher'
    if (AUTH_CONFIG.studentEmailPattern.test(user.value.email)) return 'student'
    return 'student'
  })
  
  const isTeacher = computed(() => userRole.value === 'teacher')
  const isStudent = computed(() => userRole.value === 'student')
  
  const displayName = computed(() => {
    if (!user.value) return ''
    return user.value.user_metadata?.full_name || 
           user.value.email?.split('@')[0] || 
           '用戶'
  })
  
  const avatarUrl = computed(() => {
    return user.value?.user_metadata?.avatar_url || null
  })

  // 初始化
  async function init() {
    if (initialized.value) return
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      loading.value = false
      return
    }

    try {
      // 處理 OAuth 回調
      await handleCallback()

      // 獲取會話
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        error.value = sessionError.message
      } else if (data.session) {
        session.value = data.session
        user.value = data.session.user
        await syncUser(data.session.user)
      }

      // 監聽變化
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        
        if (newSession?.user) {
          await syncUser(newSession.user)
        }
      })

      initialized.value = true
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // 處理 OAuth 回調
  async function handleCallback() {
    const hash = window.location.hash
    if (!hash.includes('access_token') && !hash.includes('error')) return

    const params = new URLSearchParams(hash.substring(1))
    const callbackError = params.get('error')
    
    if (callbackError) {
      error.value = params.get('error_description') || callbackError
    }

    // 清理 URL
    window.history.replaceState(null, '', window.location.pathname)
  }

  // Google 登入
  async function loginWithGoogle() {
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      return false
    }

    error.value = null
    
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (authError) {
      error.value = authError.message
      return false
    }

    return true
  }

  // 登出
  async function logout() {
    if (!supabase) return false

    const { error: logoutError } = await supabase.auth.signOut()
    
    if (logoutError) {
      error.value = logoutError.message
      return false
    }

    user.value = null
    session.value = null
    return true
  }

  // 同步用戶到數據庫
  async function syncUser(authUser: User) {
    if (!supabase) return

    const role = AUTH_CONFIG.teacherEmailPattern.test(authUser.email || '')
      ? 'teacher'
      : 'student'

    await supabase.from('users').upsert({
      id: authUser.id,
      email: authUser.email,
      display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
      avatar_url: authUser.user_metadata?.avatar_url,
      role: role,
      last_login: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  return {
    // 狀態
    user,
    session,
    loading,
    error,
    initialized,
    
    // 計算屬性
    isAuthenticated,
    userRole,
    isTeacher,
    isStudent,
    displayName,
    avatarUrl,
    
    // 方法
    init,
    loginWithGoogle,
    logout
  }
})

