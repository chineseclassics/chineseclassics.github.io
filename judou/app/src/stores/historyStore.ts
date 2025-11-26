import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from './authStore'
import type { PracticeHistoryEntry } from '@/types/history'

const LIMIT_OPTIONS = [10, 20, 50] as const
type LimitOption = (typeof LIMIT_OPTIONS)[number]

export const useHistoryStore = defineStore('history', () => {
  const supabase = useSupabase()
  const authStore = useAuthStore()
  const entries = ref<PracticeHistoryEntry[]>([])
  const limit = ref<LimitOption>(10)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchHistory(customLimit?: LimitOption) {
    if (customLimit) {
      limit.value = customLimit
    }

    // 必須登入才能查看歷史記錄
    if (!authStore.isAuthenticated || !authStore.user?.id) {
      entries.value = []
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('practice_records')
        .select('id, display_name, username, score, accuracy, elapsed_seconds, created_at, practice_texts(title, practice_categories(name))')
        .eq('user_id', authStore.user.id) // 只獲取當前用戶的記錄
        .order('created_at', { ascending: false })
        .limit(limit.value)

      if (fetchError) {
        throw fetchError
      }

      entries.value =
        (data || []).map((item: any) => {
          const textInfo = Array.isArray(item.practice_texts) ? item.practice_texts[0] : item.practice_texts
          // 從嵌套的 practice_categories 中獲取分類名稱
          const categoryInfo = textInfo?.practice_categories
          const categoryName = Array.isArray(categoryInfo) ? categoryInfo[0]?.name : categoryInfo?.name
          return {
            id: item.id,
            display_name: item.display_name,
            username: item.username,
            score: item.score,
            accuracy: item.accuracy,
            elapsed_seconds: item.elapsed_seconds,
            created_at: item.created_at,
            text: textInfo ? { title: textInfo.title, category_name: categoryName || null } : null,
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

