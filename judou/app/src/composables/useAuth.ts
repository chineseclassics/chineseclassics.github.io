/**
 * 句豆 - 認證 Composable
 * 
 * 處理 Google OAuth 登入、登出、會話管理
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

// 認證配置
const AUTH_CONFIG = {
  // 老師郵箱格式（可根據學校調整）
  teacherEmailPattern: /@isf\.edu\.hk$/,
  // 學生郵箱格式
  studentEmailPattern: /@student\.isf\.edu\.hk$/,
  // 重定向 URL
  redirectTo: window.location.origin + '/judou/'
}

// 響應式狀態
const currentUser = ref<User | null>(null)
const currentSession = ref<Session | null>(null)
const isLoading = ref(true)
const authError = ref<string | null>(null)

// 計算屬性
const isAuthenticated = computed(() => !!currentUser.value)
const userRole = computed(() => {
  if (!currentUser.value?.email) return null
  if (AUTH_CONFIG.teacherEmailPattern.test(currentUser.value.email)) return 'teacher'
  if (AUTH_CONFIG.studentEmailPattern.test(currentUser.value.email)) return 'student'
  return 'student' // 默認為學生
})
const isTeacher = computed(() => userRole.value === 'teacher')
const isStudent = computed(() => userRole.value === 'student')

/**
 * 初始化認證狀態
 */
async function initAuth() {
  if (!supabase) {
    authError.value = 'Supabase 未初始化'
    isLoading.value = false
    return
  }

  try {
    // 檢查 OAuth 回調
    await handleOAuthCallback()

    // 獲取當前會話
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ 獲取會話失敗:', error)
      authError.value = error.message
    } else if (session) {
      currentSession.value = session
      currentUser.value = session.user
      console.log('✅ 已登入:', session.user.email)
      
      // 同步用戶到數據庫
      await syncUserToDatabase(session.user)
    }

    // 監聽認證狀態變化
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 認證狀態變化:', event)
      currentSession.value = session
      currentUser.value = session?.user ?? null
      
      if (session?.user) {
        await syncUserToDatabase(session.user)
      }
    })

  } catch (error) {
    console.error('❌ 初始化認證失敗:', error)
    authError.value = (error as Error).message
  } finally {
    isLoading.value = false
  }
}

/**
 * 處理 OAuth 回調
 */
async function handleOAuthCallback() {
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const hasAuthParams = hashParams.has('access_token') || hashParams.has('error')
  
  if (!hasAuthParams) return

  console.log('🔍 檢測到 OAuth 回調')

  // 檢查錯誤
  const error = hashParams.get('error')
  if (error) {
    authError.value = hashParams.get('error_description') || error
    cleanUrl()
    return
  }

  // 清理 URL
  cleanUrl()
}

/**
 * 清理 URL 中的認證參數
 */
function cleanUrl() {
  if (window.location.hash) {
    window.history.replaceState(
      null,
      document.title,
      window.location.pathname + window.location.search
    )
  }
}

/**
 * Google 登入
 */
async function signInWithGoogle() {
  if (!supabase) {
    authError.value = 'Supabase 未初始化'
    return { success: false, error: authError.value }
  }

  try {
    authError.value = null
    console.log('🔐 開始 Google 登入...')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      console.error('❌ Google 登入失敗:', error)
      authError.value = error.message
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('❌ Google 登入異常:', error)
    authError.value = (error as Error).message
    return { success: false, error: authError.value }
  }
}

/**
 * 登出
 */
async function signOut() {
  if (!supabase) return { success: false }

  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ 登出失敗:', error)
      authError.value = error.message
      return { success: false, error: error.message }
    }

    currentUser.value = null
    currentSession.value = null
    console.log('✅ 已登出')
    
    return { success: true }
  } catch (error) {
    console.error('❌ 登出異常:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * 同步用戶到數據庫
 */
async function syncUserToDatabase(user: User) {
  if (!supabase) return

  try {
    const role = AUTH_CONFIG.teacherEmailPattern.test(user.email || '')
      ? 'teacher'
      : 'student'

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '用戶',
        avatar_url: user.user_metadata?.avatar_url,
        role: role,
        last_login: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('❌ 同步用戶失敗:', error)
    } else {
      console.log('✅ 用戶已同步到數據庫')
    }
  } catch (error) {
    console.error('❌ 同步用戶異常:', error)
  }
}

/**
 * 導出 composable
 */
export function useAuth() {
  return {
    // 狀態
    currentUser,
    currentSession,
    isLoading,
    authError,
    
    // 計算屬性
    isAuthenticated,
    userRole,
    isTeacher,
    isStudent,
    
    // 方法
    initAuth,
    signInWithGoogle,
    signOut
  }
}

