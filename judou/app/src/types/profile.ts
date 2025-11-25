export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_seed?: string | null
  grade?: string | null
  final_score: number
  monthly_score: number
  streak: number
  updated_at: string
}

