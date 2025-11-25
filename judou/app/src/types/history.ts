export interface PracticeHistoryEntry {
  id: string
  display_name: string | null
  username: string | null
  score: number
  accuracy: number
  elapsed_seconds: number
  created_at: string
  text?: {
    title: string
    category_name: string | null
  } | null
}

