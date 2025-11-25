/**
 * 認證 Composable
 * 提供組件中使用的認證相關功能
 */

import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'

export function useAuth() {
  const authStore = useAuthStore()
  
  // 將狀態轉為 refs（保持響應性）
  const {
    user,
    loading,
    authStatus,
    authMessage,
    visitorCount,
    isAuthenticated,
    isGoogle,
    userId,
    userMetadata,
  } = storeToRefs(authStore)

  // 方法直接引用（不需要 ref）
  const {
    initialize,
    setupAuthListener,
    signInWithGoogle,
    signOut,
  } = authStore

  return {
    // 狀態
    user,
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
}

