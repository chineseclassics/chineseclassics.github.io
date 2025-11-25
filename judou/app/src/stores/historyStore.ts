import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import type { PracticeHistoryEntry } from '@/types/history'

const LIMIT_OPTIONS = [10, 20, 50] as const
type LimitOption = (typeof LIMIT_OPTIONS)[number]

export const useHistoryStore = defineStore('history', () => {
  const supabase = useSupabase()
  const entries = ref<PracticeHistoryEntry[]>([])
  const limit = ref<LimitOption>(10)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchHistory(customLimit?: LimitOption) {
    if (customLimit) {
      limit.value = customLimit
    }

    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('practice_records')
        .select('id, display_name, username, score, accuracy, elapsed_seconds, created_at, texts(name, category)')
        .order('created_at', { ascending: false })
        .limit(limit.value)

      if (fetchError) {
        throw fetchError
      }

      entries.value =
        (data || []).map((item) => {
          const textInfo = Array.isArray(item.texts) ? item.texts[0] : item.texts
          return {
            id: item.id,
            display_name: item.display_name,
            username: item.username,
            score: item.score,
            accuracy: item.accuracy,
            elapsed_seconds: item.elapsed_seconds,
            created_at: item.created_at,
            text: textInfo ? { title: textInfo.name, category_name: textInfo.category } : null,
          }
        }) ?? []
    } catch (err: any) {
      console.error('Failed to load history', err)
      error.value = err.message ?? '無法載入歷史紀錄'
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
    fetchHistory,
    getLimitOptions,
  }
})

