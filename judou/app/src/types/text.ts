// 文章類型
export type TextType = 'practice' | 'reading'

// 閱讀文庫分類（文集）
export interface ReadingCategory {
  id: string
  name: string
  description?: string | null
  order_index: number
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface PracticeText {
  id: string
  title: string
  author: string | null
  source: string | null
  summary: string | null
  category_id: string | null  // 保留向後兼容（單一分類）
  category?: {
    id: string
    name: string
    slug: string
    level: number
  } | null
  practice_categories?: Array<{  // 多選分類（新）
    id: string
    name: string
    slug: string
    level: number
  }>
  content: string
  difficulty: number
  word_count?: number | null
  is_system?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
  // 閱讀模式相關欄位
  text_type?: TextType
  reading_category_id?: string | null  // 閱讀文庫分類 ID（舊，單一）
  reading_category?: ReadingCategory | null  // 閱讀文庫分類（舊，單一）
  reading_categories?: ReadingCategory[]  // 閱讀文庫分類（新，多個文集）
  source_text_id?: string | null  // 來源文章 ID（如果是提取的片段）
  source_start_index?: number | null
  source_end_index?: number | null
  // 關聯的來源文章（用於顯示「來自《xxx》」）
  source_text?: {
    id: string
    title: string
  } | null
  // 從該文章提取的練習片段數量
  extracted_count?: number
}

export interface TextInput {
  title: string
  author?: string | null
  source?: string | null
  summary?: string | null
  category_id: string | null  // 保留向後兼容（單一分類）
  practice_category_ids?: string[]  // 多選分類（新）
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

// 文章註釋
export interface TextAnnotation {
  id: string
  text_id: string
  start_index: number  // 註釋起始字符位置（不含斷句符）
  end_index: number    // 註釋結束字符位置
  term: string         // 被註釋的字/詞
  annotation: string   // 註釋內容
  pinyin?: string | null  // 拼音（可選，主要用於難讀字）
  source?: 'ai' | 'manual'  // 註釋來源：ai=AI 生成，manual=用戶手動添加
  is_edited?: boolean  // 是否被用戶編輯過
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface AnnotationInput {
  text_id: string
  start_index: number
  end_index: number
  term: string
  annotation: string
  pinyin?: string | null  // 拼音（可選）
  source?: 'ai' | 'manual'  // 註釋來源（可選，默認 'manual'）
}

// 閱讀進度
export interface ReadingProgress {
  id: string
  user_id: string
  text_id: string
  progress_percent: number  // 0-100
  last_paragraph: number    // 段落索引
  bookmarked: boolean
  created_at?: string
  updated_at?: string
}

// 閱讀文章（帶進度和註釋的完整文章）
export interface ReadingText extends PracticeText {
  annotations?: TextAnnotation[]
  progress?: ReadingProgress | null
}

// 文章輸入（擴展支持閱讀模式）
export interface ReadingTextInput extends TextInput {
  text_type?: TextType
  reading_category_id?: string | null  // 閱讀文庫分類
  source_text_id?: string | null
  source_start_index?: number | null
  source_end_index?: number | null
}

