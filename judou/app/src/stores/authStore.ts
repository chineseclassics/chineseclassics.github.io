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

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: 'teacher' | 'student'
  is_admin: boolean
  is_super_admin: boolean
}

export type AuthResult = 
  | { success: true; needsEmailConfirmation?: boolean; message?: string }
  | { success: false; error: string }

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const userProfile = ref<UserProfile | null>(null)
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
  
  const isAdmin = computed(() => {
    return userProfile.value?.is_admin === true || userProfile.value?.is_super_admin === true
  })
  
  const isSuperAdmin = computed(() => {
    return userProfile.value?.is_super_admin === true
  })
  
  const displayName = computed(() => {
    if (userProfile.value) {
      return userProfile.value.display_name
    }
    if (!user.value) return ''
    return user.value.user_metadata?.full_name || 
           user.value.email?.split('@')[0] || 
           '用戶'
  })
  
  const avatarUrl = computed(() => {
    if (userProfile.value?.avatar_url) {
      return userProfile.value.avatar_url
    }
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
          fetchUserProfile(newSession.user.id).catch(e => console.warn('[Auth] fetchUserProfile 錯誤:', e))
        } else {
          userProfile.value = null
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
        fetchUserProfile(data.session.user.id).catch(e => console.warn('[Auth] fetchUserProfile 錯誤:', e))
      } else {
        console.log('[Auth] 無會話')
        userProfile.value = null
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

  // Email 註冊
  async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult> {
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      return { success: false, error: error.value }
    }

    error.value = null

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || email.split('@')[0]
          },
          emailRedirectTo: AUTH_CONFIG.redirectTo
        }
      })

      if (signUpError) {
        error.value = signUpError.message
        return { success: false, error: signUpError.message }
      }

      // 如果用戶已經確認，立即同步到數據庫
      if (data.user && data.session) {
        await syncUser(data.user)
      }

      return { 
        success: true, 
        needsEmailConfirmation: !data.session,
        message: data.session ? '註冊成功' : '請檢查您的郵箱以確認註冊'
      }
    } catch (e) {
      const errorMessage = (e as Error).message
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  // Email 登入
  async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      return { success: false, error: error.value }
    }

    error.value = null

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        error.value = signInError.message
        return { success: false, error: signInError.message }
      }

      if (data.user) {
        await syncUser(data.user)
      }

      return { success: true, message: '登入成功' }
    } catch (e) {
      const errorMessage = (e as Error).message
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
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
    userProfile.value = null
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
    
    // 同步後立即獲取用戶資料（包括 is_admin）
    await fetchUserProfile(authUser.id)
    
    // 學生登入時，自動激活待加入的班級
    if (role === 'student' && authUser.email) {
      await activatePendingClasses(authUser.id, authUser.email)
    }
  }

  // 激活學生的待加入班級
  async function activatePendingClasses(userId: string, email: string) {
    if (!supabase) return

    try {
      // 查找該郵箱在 pending_students 中的所有記錄
      const { data: pendingRecords, error: fetchError } = await supabase
        .from('pending_students')
        .select('id, class_id, added_by')
        .eq('email', email.toLowerCase())

      if (fetchError || !pendingRecords || pendingRecords.length === 0) {
        return // 沒有待激活的班級
      }

      console.log(`[Auth] 發現 ${pendingRecords.length} 個待激活班級`)

      // 將每個待激活記錄轉移到 class_members
      for (const pending of pendingRecords) {
        // 添加到 class_members
        const { error: addError } = await supabase
          .from('class_members')
          .insert({
            class_id: pending.class_id,
            student_id: userId,
            added_by: pending.added_by
          })

        if (addError) {
          if (addError.code === '23505') {
            // 已經是成員，跳過
            console.log(`[Auth] 學生已在班級 ${pending.class_id} 中`)
          } else {
            console.warn(`[Auth] 添加到班級失敗:`, addError)
            continue
          }
        }

        // 刪除 pending_students 記錄
        await supabase
          .from('pending_students')
          .delete()
          .eq('id', pending.id)
      }

      console.log('[Auth] 班級激活完成')
    } catch (e) {
      console.warn('[Auth] 激活班級失敗:', e)
    }
  }

  // 獲取用戶資料（包括 is_admin 和 is_super_admin）
  async function fetchUserProfile(userId: string) {
    if (!supabase) return

    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, role, is_admin, is_super_admin')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.warn('[Auth] 獲取用戶資料失敗:', fetchError)
      return
    }

    if (data) {
      userProfile.value = data as UserProfile
    }
  }

  return {
    // 狀態
    user,
    session,
    userProfile,
    loading,
    error,
    initialized,
    
    // 計算屬性
    isAuthenticated,
    userRole,
    isTeacher,
    isStudent,
    isAdmin,
    isSuperAdmin,
    displayName,
    avatarUrl,
    
    // 方法
    init,
    loginWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    logout,
    fetchUserProfile
  }
})

