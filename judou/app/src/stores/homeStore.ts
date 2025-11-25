import { defineStore } from 'pinia'
import { useSupabase } from '../composables/useSupabase'

interface PracticeText {
  id: string
  title: string
  author: string | null
  source: string | null
  created_at: string
}

interface HomeState {
  topPoems: PracticeText[]
  poemsLoading: boolean
  poemsError: string | null
}

export const useHomeStore = defineStore('home', {
  state: (): HomeState => ({
    topPoems: [],
    poemsLoading: false,
    poemsError: null,
  }),
  actions: {
    async fetchLatestPoems(limit = 3) {
      this.poemsLoading = true
      this.poemsError = null

      try {
        const client = useSupabase()
        const { data, error } = await client
          .from('practice_texts')
          .select('id, title, author, source, created_at')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          throw error
        }

        this.topPoems = data ?? []
      } catch (err) {
        this.poemsError = err instanceof Error ? err.message : '讀取資料時發生未知錯誤'
      } finally {
        this.poemsLoading = false
      }
    },
  },
})
