/**
 * Supabase 客戶端單例
 * 從原版 kongshan 遷移，確保全局只有一個 Supabase 實例
 */

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabase.js'

let supabaseClient = null

/**
 * 獲取 Supabase 客戶端實例
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabaseClient() {
  if (!supabaseClient && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    )
    console.log('✅ Supabase 客戶端初始化成功')
  }
  return supabaseClient
}

/**
 * 導出便捷訪問
 */
export const supabase = getSupabaseClient()

