import { defineStore } from 'pinia'
import { useSupabase } from '../composables/useSupabase'

export interface LatestItem {
  id: string
  title: string
  author: string | null
  source: string | null
  created_at: string
  type: 'practice' | 'reading' // 句豆（練習）或 品豆（閱讀）
}

interface HomeState {
  latestItems: LatestItem[]
  latestLoading: boolean
  latestError: string | null
}

export const useHomeStore = defineStore('home', {
  state: (): HomeState => ({
    latestItems: [],
    latestLoading: false,
    latestError: null,
  }),
  actions: {
    async fetchLatestItems(limit = 5) {
      this.latestLoading = true
      this.latestError = null

      try {
        const client = useSupabase()
        
        // 並行獲取最新的練習文章和閱讀文章
        const [practiceResult, readingResult] = await Promise.all([
          // 獲取最新的練習文章（句豆）
          client
            .from('practice_texts')
            .select('id, title, author, source, created_at')
            .eq('text_type', 'practice')
            .order('created_at', { ascending: false })
            .limit(limit),
          
          // 獲取最新的閱讀文章（品豆）
          client
            .from('practice_texts')
            .select('id, title, author, source, created_at')
            .eq('text_type', 'reading')
            .order('created_at', { ascending: false })
            .limit(limit)
        ])

        if (practiceResult.error) throw practiceResult.error
        if (readingResult.error) throw readingResult.error

        // 合併並標記類型
        const practiceItems: LatestItem[] = (practiceResult.data || []).map(item => ({
          ...item,
          type: 'practice' as const
        }))
        
        const readingItems: LatestItem[] = (readingResult.data || []).map(item => ({
          ...item,
          type: 'reading' as const
        }))

        // 合併並按創建時間排序
        const allItems = [...practiceItems, ...readingItems]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)

        this.latestItems = allItems
      } catch (err) {
        this.latestError = err instanceof Error ? err.message : '讀取資料時發生未知錯誤'
      } finally {
        this.latestLoading = false
      }
    },
  },
})
