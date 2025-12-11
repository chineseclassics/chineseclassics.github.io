import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// 用戶資料接口
export interface UserProfile {
  id: string
  email: string | null
  display_name: string
  avatar_url: string | null
  user_type: 'registered' | 'anonymous'
  total_score?: number // 用戶累積總積分
}

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性
  const isAuthenticated = computed(() => user.value !== null)
  const isAnonymous = computed(() => profile.value?.user_type === 'anonymous')
  const isRegistered = computed(() => profile.value?.user_type === 'registered')

  // 初始化（參考句豆的實現）
  async function init() {
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      // 先設置監聽器，確保能捕獲所有狀態變化（參考句豆）
      setupAuthListener()

      // 獲取會話（這會自動處理 URL 中的 token）
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        error.value = sessionError.message
      } else if (data.session) {
        session.value = data.session
        user.value = data.session.user
        // 不等待 loadUserProfile，避免阻塞應用啟動（參考句豆）
        loadUserProfile(data.session.user.id, false).catch(e => 
          console.warn('載入用戶資料錯誤:', e)
        )
      } else {
        profile.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化認證失敗'
    } finally {
      loading.value = false
    }
  }

  // 載入用戶資料（包含統計數據）
  async function loadUserProfile(userId: string, setLoading = false) {
    try {
      if (setLoading) {
        loading.value = true
      }
      const { data, error: profileError } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, user_type, total_score, created_at, last_login_at')
        .eq('id', userId)
        .single()

      if (profileError) {
        // 如果用戶資料不存在，創建新資料
        if (profileError.code === 'PGRST116') {
          await createUserProfile(userId)
          return
        }
        throw profileError
      }

      profile.value = {
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        user_type: data.user_type,
        total_score: data.total_score || 0,
      } as UserProfile
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入用戶資料失敗'
    } finally {
      if (setLoading) {
        loading.value = false
      }
    }
  }

  // 創建用戶資料
  async function createUserProfile(userId: string) {
    try {
      const userData = user.value
      if (!userData) {
        console.warn('無法創建用戶資料：用戶數據不存在')
        return
      }

      const profileData = {
        id: userId,
        email: userData.email || null,
        display_name: userData.user_metadata?.full_name || userData.user_metadata?.name || '用戶',
        avatar_url: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || null,
        user_type: userData.is_anonymous ? 'anonymous' : 'registered',
        total_score: 0, // 新用戶初始積分為 0
      }

      const { data, error: insertError } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single()

      if (insertError) {
        // 如果是重複鍵錯誤，嘗試重新載入
        if (insertError.code === '23505') {
          await loadUserProfile(userId, false)
          return
        }
        throw insertError
      }

      profile.value = data as UserProfile

      // 創建身份關聯記錄（不阻塞，失敗也不影響主流程）
      try {
        await createUserIdentity(userId, userData.is_anonymous ? 'anonymous' : 'google')
      } catch (identityErr) {
        console.warn('創建身份關聯失敗（非關鍵錯誤）:', identityErr)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '創建用戶資料失敗'
      // 即使創建失敗，也嘗試重新載入（可能已經被其他進程創建）
      try {
        await loadUserProfile(userId, false)
      } catch {
        // 忽略重試失敗
      }
    }
  }

  // 創建用戶身份關聯
  async function createUserIdentity(userId: string, provider: 'google' | 'anonymous') {
    try {
      const userData = user.value
      if (!userData) return

      const identityData = {
        user_id: userId,
        provider: provider,
        provider_id: userData.id,
        provider_data: userData.user_metadata || {},
      }

      const { error: identityError } = await supabase
        .from('user_identities')
        .insert(identityData)

      if (identityError && identityError.code !== '23505') { // 忽略重複鍵錯誤
        throw identityError
      }
    } catch {
      // 身份創建失敗不影響主流程
    }
  }

  // 匿名登入
  async function signInAnonymously(nickname?: string) {
    try {
      loading.value = true
      error.value = null

      // 使用 Supabase 匿名認證
      const { data, error: authError } = await supabase.auth.signInAnonymously()

      if (authError) throw authError

      if (data.user && data.session) {
        session.value = data.session
        user.value = data.user

        // 生成臨時暱稱
        const displayName = nickname || `訪客${Math.floor(Math.random() * 10000)}`
        
        // 檢查用戶資料是否存在（使用 maybeSingle 避免 406 錯誤）
        const { data: existingProfile, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        // 忽略 PGRST116（沒有找到記錄）錯誤
        if (selectError && selectError.code !== 'PGRST116') {
          console.warn('[Auth] 查詢用戶資料錯誤:', selectError.code)
        }

        if (existingProfile) {
          // 如果已存在，更新暱稱（如果提供了新暱稱）
          if (nickname) {
            await updateProfile({ display_name: nickname })
          } else {
            profile.value = existingProfile as UserProfile
          }
        } else {
          // 如果不存在，創建新資料（使用 upsert 避免競爭條件）
          const profileData = {
            id: data.user.id,
            email: null,
            display_name: displayName,
            avatar_url: null,
            user_type: 'anonymous' as const,
            total_score: 0, // 匿名用戶初始積分為 0（但不會累積）
          }

          const { data: newProfile, error: upsertError } = await supabase
            .from('users')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single()

          if (upsertError) {
            // 不拋出錯誤，嘗試重新查詢
            const { data: retryProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle()
            
            if (retryProfile) {
              profile.value = retryProfile as UserProfile
            }
          } else if (newProfile) {
            profile.value = newProfile as UserProfile
          }

          // 創建身份關聯（忽略重複錯誤）
          await createUserIdentity(data.user.id, 'anonymous')
        }

        return { success: true }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '匿名登入失敗'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Google 登入
  async function signInWithGoogle() {
    try {
      loading.value = true
      error.value = null

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (authError) throw authError

      // OAuth 會跳轉，這裡不需要等待結果
      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Google 登入失敗'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 登出（完全參考句豆的實現）
  async function signOut() {
    if (!supabase) {
      error.value = 'Supabase 未初始化'
      return { success: false, error: error.value }
    }

    loading.value = true
    error.value = null

    try {
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        error.value = signOutError.message
        // 即使出錯，也清除本地狀態
        user.value = null
        session.value = null
        profile.value = null
        return { success: false, error: signOutError.message }
      }

      // 清除狀態（auth listener 也會處理，但這裡確保清除）
      user.value = null
      session.value = null
      profile.value = null

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登出失敗'
      // 即使出錯，也清除本地狀態
      user.value = null
      session.value = null
      profile.value = null
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 更新用戶資料
  async function updateProfile(updates: Partial<UserProfile>) {
    try {
      if (!user.value) throw new Error('用戶未登入')

      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      profile.value = data as UserProfile
      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新用戶資料失敗'
      return { success: false, error: error.value }
    }
  }

  // 監聽認證狀態變化（參考句豆的實現）
  function setupAuthListener() {
    if (!supabase) return

    supabase.auth.onAuthStateChange((event, newSession) => {
      if (import.meta.env.DEV) console.log('[Auth]', event)
      session.value = newSession
      user.value = newSession?.user ?? null
      
      if (newSession?.user) {
        // 不等待 loadUserProfile，避免阻塞（參考句豆）
        loadUserProfile(newSession.user.id, false).catch(e => 
          console.warn('[Auth] 載入用戶資料錯誤:', e)
        )
      } else {
        profile.value = null
      }
    })
  }

  return {
    // 狀態
    user,
    session,
    profile,
    loading,
    error,
    // 計算屬性
    isAuthenticated,
    isAnonymous,
    isRegistered,
    // 方法
    init,
    signInAnonymously,
    signInWithGoogle,
    signOut,
    updateProfile,
    setupAuthListener,
    loadUserProfile, // 導出以便其他 store 使用
  }
})

