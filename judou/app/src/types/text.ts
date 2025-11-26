export interface PracticeText {
  id: string
  title: string
  author: string | null
  source: string | null
  summary: string | null
  category_id: string | null
  category?: {
    id: string
    name: string
    slug: string
    level: number
  } | null
  content: string
  difficulty: number
  word_count?: number | null
  is_system?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface TextInput {
  title: string
  author?: string | null
  source?: string | null
  summary?: string | null
  category_id: string | null
  content: string
}

export interface PracticeResultPayload {
  text_id: string
  score: number
  accuracy: number
  elapsed_seconds: number
  user_breaks: number
  correct_breaks: number
  profile_id?: string | null
  username?: string | null
  display_name?: string | null
  user_id?: string | null
}

