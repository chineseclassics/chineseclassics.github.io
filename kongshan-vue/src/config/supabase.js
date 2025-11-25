/**
 * Supabase 配置文件
 * 從原版 kongshan/js/config.js 遷移
 */

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://hithpeekxopcipqhkhyu.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdGhwZWVreG9wY2lwcWhraHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTg1MjUsImV4cCI6MjA3ODA5NDUyNX0.bc1sMs6cT8NcnWFA3qVDHJWniW-aWEar9FTb975MlwQ',
}

export const APP_CONFIG = {
  name: '空山',
  description: '詩歌聲音意境欣賞',
  version: '2.0.0-vue',
}

export const DEV_CONFIG = {
  mockData: !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey,
}

/**
 * 驗證配置是否完整
 */
export function validateConfig() {
  if (!SUPABASE_CONFIG.url) {
    console.warn('⚠️ VITE_SUPABASE_URL 未設置')
    return false
  }
  if (!SUPABASE_CONFIG.anonKey) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY 未設置')
    return false
  }
  return true
}

