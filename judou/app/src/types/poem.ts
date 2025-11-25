export interface Poem {
  id: string
  title: string
  author: string | null
  dynasty?: string | null
  content?: string | null
  created_at?: string | null
}
