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
    detectSessionInUrl: true, // 改為 true，與句豆一致
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
  db: {
    schema: 'public',
  },
  // Realtime 配置 - 針對 Safari 等瀏覽器的兼容性優化
  realtime: {
    params: {
      eventsPerSecond: 10, // 限制每秒事件數，減少連接壓力
    },
    heartbeatIntervalMs: 15000, // 每 15 秒發送一次心跳，保持連接活躍
    timeout: 30000, // 連接超時設置為 30 秒
    reconnectAfterMs: (attempts: number) => {
      // 指數退避重連策略，Safari 給予更長的延遲
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const baseDelay = isSafari ? 1500 : 1000
      const delay = Math.min(baseDelay * Math.pow(1.5, attempts), 30000)
      console.log('[Supabase Realtime] 重連延遲:', delay, 'ms (嘗試次數:', attempts, ', Safari:', isSafari, ')')
      return delay
    },
  },
})

// 超時包裝器：為 Supabase 客戶端添加超時保護
export async function supabaseWithTimeout<T>(
  query: Promise<{ data: T | null; error: any }>,
  timeout = 10000
): Promise<{ data: T | null; error: any }> {
  return Promise.race([
    query,
    new Promise<{ data: null; error: any }>((_, reject) =>
      setTimeout(() => reject({ data: null, error: { message: '請求超時', code: 'TIMEOUT' } }), timeout)
    )
  ])
}

