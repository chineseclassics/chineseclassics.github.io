import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sylsqdkkshkeicaxhisq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bHNxZGtrc2hrZWljYXhoaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTAyNjgsImV4cCI6MjA4MDY2NjI2OH0.ZqcDaGIr4fCxGmgQm00zUdZei50HGs3Aa_SlWEPBA6A'

// Supabase 配置日誌已移除（僅在開發環境需要時啟用）
if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SUPABASE === 'true') {
  console.log('🔧 Supabase 配置:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length,
    keyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
    envUrl: import.meta.env.VITE_SUPABASE_URL,
    envKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '已設置' : '未設置',
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // 禁用 URL 中的 session 檢測，避免卡住
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
  db: {
    schema: 'public',
  },
})

// 測試函數已移除 - 不再需要自動測試，因為我們已經改用 fetch 直接調用

