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

  // 初始化：檢查現有會話
  async function init() {
    try {
      loading.value = true
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        // 初始化時載入用戶資料，不設置 loading（因為已經在 init 中設置了）
        await loadUserProfile(currentSession.user.id, false)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化認證失敗'
      console.error('認證初始化錯誤:', err)
    } finally {
      loading.value = false
    }
  }

  // 載入用戶資料
  async function loadUserProfile(userId: string, setLoading = false) {
    try {
      if (setLoading) {
        loading.value = true
      }
      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
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

      profile.value = data as UserProfile
    } catch (err) {
      console.error('載入用戶資料錯誤:', err)
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
      }

      const { data, error: insertError } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single()

      if (insertError) {
        // 如果是重複鍵錯誤，嘗試重新載入
        if (insertError.code === '23505') {
          console.log('用戶資料已存在，重新載入')
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
      console.error('創建用戶資料錯誤:', err)
      error.value = err instanceof Error ? err.message : '創建用戶資料失敗'
      // 即使創建失敗，也嘗試重新載入（可能已經被其他進程創建）
      try {
        await loadUserProfile(userId, false)
      } catch (loadErr) {
        console.error('重新載入用戶資料也失敗:', loadErr)
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
    } catch (err) {
      console.error('創建用戶身份錯誤:', err)
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
        
        // 檢查用戶資料是否存在
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (existingProfile) {
          // 如果已存在，更新暱稱（如果提供了新暱稱）
          if (nickname) {
            await updateProfile({ display_name: nickname })
          } else {
            profile.value = existingProfile as UserProfile
          }
        } else {
          // 如果不存在，創建新資料
          const profileData = {
            id: data.user.id,
            email: null,
            display_name: displayName,
            avatar_url: null,
            user_type: 'anonymous' as const,
          }

          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert(profileData)
            .select()
            .single()

          if (insertError) throw insertError

          profile.value = newProfile as UserProfile

          // 創建身份關聯
          await createUserIdentity(data.user.id, 'anonymous')
        }

        return { success: true }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '匿名登入失敗'
      console.error('匿名登入錯誤:', err)
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
      console.error('Google 登入錯誤:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 登出
  async function signOut() {
    try {
      loading.value = true
      error.value = null

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) throw signOutError

      // 清除狀態
      user.value = null
      session.value = null
      profile.value = null

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登出失敗'
      console.error('登出錯誤:', err)
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
      console.error('更新用戶資料錯誤:', err)
      return { success: false, error: error.value }
    }
  }

  // 監聽認證狀態變化
  function setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      // 僅在開發環境且啟用調試時輸出日誌
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.log('認證狀態變化:', event, newSession)
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession) {
          session.value = newSession
          user.value = newSession.user
          // 監聽器中的載入不需要設置 loading，避免影響 UI
          // 確保在載入前 loading 是 false
          if (loading.value) {
            loading.value = false
          }
          await loadUserProfile(newSession.user.id, false)
          // 載入完成後再次確保 loading 是 false
          loading.value = false
        }
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        session.value = null
        profile.value = null
        loading.value = false // 確保登出時重置 loading
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
  }
})

