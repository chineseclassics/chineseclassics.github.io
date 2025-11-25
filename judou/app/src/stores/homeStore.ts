import { defineStore } from 'pinia'
import type { Poem } from '../types/poem'
import { useSupabase } from '../composables/useSupabase'

interface HomeState {
  topPoems: Poem[]
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
          .from('poems')
          .select('id,title,author,dynasty,content,created_at')
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
