import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import type { Profile } from '@/types/profile'

const LIMIT_OPTIONS = [10, 20, 50] as const
type LimitOption = (typeof LIMIT_OPTIONS)[number]

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const supabase = useSupabase()
  const entries = ref<Profile[]>([])
  const limit = ref<LimitOption>(20)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLeaderboard(customLimit?: LimitOption) {
    if (customLimit) {
      limit.value = customLimit
    }

    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('final_score', { ascending: false })
        .limit(limit.value)

      if (fetchError) {
        throw fetchError
      }

      entries.value = (data || []) as Profile[]
    } catch (err: any) {
      console.error('Failed to load leaderboard', err)
      error.value = err.message ?? '無法載入排行榜'
    } finally {
      isLoading.value = false
    }
  }

  function getLimitOptions() {
    return LIMIT_OPTIONS
  }

  return {
    entries,
    limit,
    isLoading,
    error,
    fetchLeaderboard,
    getLimitOptions,
  }
})

