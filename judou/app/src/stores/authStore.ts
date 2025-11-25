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
      // 先設置監聯器，確保能捕獲所有狀態變化
      supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('[Auth] 狀態變化:', event, newSession?.user?.email)
        session.value = newSession
        user.value = newSession?.user ?? null
        
        // 不等待 syncUser，避免阻塞
        if (newSession?.user) {
          syncUser(newSession.user).catch(e => console.warn('[Auth] syncUser 錯誤:', e))
        }
      })

      // 檢查 URL 是否有 OAuth 回調參數
      const hash = window.location.hash
      const hasOAuthCallback = hash.includes('access_token') || hash.includes('error')
      
      if (hasOAuthCallback) {
        console.log('[Auth] 檢測到 OAuth 回調')
      }

      // 獲取會話（這會自動處理 URL 中的 token）
      console.log('[Auth] 獲取會話...')
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[Auth] 獲取會話錯誤:', sessionError)
        error.value = sessionError.message
      } else if (data.session) {
        console.log('[Auth] 已獲取會話:', data.session.user.email)
        session.value = data.session
        user.value = data.session.user
        // 不等待 syncUser，避免阻塞應用啟動
        syncUser(data.session.user).catch(e => console.warn('[Auth] syncUser 錯誤:', e))
      } else {
        console.log('[Auth] 無會話')
      }

      // 清理 URL（在處理完成後）
      if (hasOAuthCallback) {
        window.history.replaceState(null, '', window.location.pathname)
      }

      initialized.value = true
      console.log('[Auth] 初始化完成')
    } catch (e) {
      console.error('[Auth] 初始化錯誤:', e)
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
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

