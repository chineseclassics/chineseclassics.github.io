import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export const useSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase client 尚未初始化，請確認環境變數已設定。')
  }
  return supabase
}

