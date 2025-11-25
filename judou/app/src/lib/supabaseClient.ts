import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} else {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未設定，請參考 env.example 建立環境變數。',
  )
}

export { supabase }

