export interface PracticeCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  level: number
  type: 'grade' | 'module' | 'theme' | 'custom'
  description?: string | null
  order_index: number
}

export interface PracticeLibraryText {
  id: string
  title: string
  author: string | null
  category_id: string
  difficulty: 1 | 2 | 3
  source?: string | null
  summary?: string | null
  word_count?: number | null
  content?: string | null
  fallback_content?: string | null
}

export interface PracticeCategoryInput {
  name: string
  parent_id: string | null
  type: PracticeCategory['type']
  description?: string | null
  order_index?: number
}

export interface PracticeLibraryState {
  categories: PracticeCategory[]
  texts: PracticeLibraryText[]
  selectedGradeId: string | null
  selectedModuleId: string | null
  selectedThemeId: string | null
  selectedTextId: string | null
}

