import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import type {
  PracticeCategory,
  PracticeCategoryInput,
  PracticeLibraryState,
  PracticeLibraryText,
} from '@/types/practiceLibrary'

// 備用數據：簡化為單層年級結構
const FALLBACK_CATEGORIES: PracticeCategory[] = [
  {
    id: 'grade-7',
    name: '七年級',
    slug: 'grade-7',
    parent_id: null,
    level: 1,
    type: 'grade',
    description: '適合初階練習者，聚焦於啟蒙經典與日常應用題材。',
    order_index: 1,
  },
  {
    id: 'grade-8',
    name: '八年級',
    slug: 'grade-8',
    parent_id: null,
    level: 1,
    type: 'grade',
    description: '中階練習，接觸更多古文體裁。',
    order_index: 2,
  },
]

const FALLBACK_TEXTS: PracticeLibraryText[] = [
  {
    id: 'text-lunyu-01',
    title: '論語・學而篇',
    author: '孔子及弟子',
    category_id: 'grade-7',
    difficulty: 1,
    summary: '子曰：「弟子入則孝...」',
    word_count: 86,
    content: '子曰|弟子入則孝|出則弟|謹而信|汎愛眾|而親仁',
  },
  {
    id: 'text-lunyu-02',
    title: '論語・為政篇',
    author: '孔子及弟子',
    category_id: 'grade-7',
    difficulty: 2,
    summary: '溫故而知新，可以為師矣。',
    word_count: 95,
    content: '子曰|溫故而知新|可以為師矣|學而不思則罔|思而不學則殆',
  },
]

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `category-${Date.now()}`
}

export const usePracticeLibraryStore = defineStore('practice-library', () => {
  const supabase = useSupabase()
  const state = ref<PracticeLibraryState>({
    categories: [],
    texts: [],
    selectedGradeId: null,
    selectedTextId: null,
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function applyFallbackData() {
    state.value.categories = [...FALLBACK_CATEGORIES]
    state.value.texts = [...FALLBACK_TEXTS]
    state.value.selectedGradeId =
      state.value.selectedGradeId ?? FALLBACK_CATEGORIES.find((c) => c.level === 1)?.id ?? null
  }

  async function fetchLibrary() {
    isLoading.value = true
    error.value = null
    try {
      if (!supabase) {
        applyFallbackData()
        return
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('practice_categories')
        .select('*')
        .order('level', { ascending: true })
        .order('order_index', { ascending: true })

      if (categoriesError) throw categoriesError

      if (!categories?.length) {
        applyFallbackData()
        return
      }

      const { data: texts, error: textsError } = await supabase
        .from('practice_texts')
        .select('*')
        .order('title', { ascending: true })

      if (textsError) throw textsError

      state.value.categories = categories as PracticeCategory[]
      state.value.texts = (texts || []) as PracticeLibraryText[]
      state.value.selectedGradeId =
        state.value.selectedGradeId ?? state.value.categories.find((category) => category.level === 1)?.id ?? null
    } catch (err: any) {
      console.error('Failed to load practice library', err)
      error.value = err?.message ?? '無法載入練習庫'
      applyFallbackData()
    } finally {
      isLoading.value = false
    }
  }

  function resetSelections() {
    state.value.selectedTextId = null
  }

  const sortedCategories = computed(() =>
    [...state.value.categories].sort((a, b) => {
      if (a.level === b.level) {
        return a.order_index - b.order_index
      }
      return a.level - b.level
    })
  )

  // 根分類（年級）
  const rootCategories = computed(() => sortedCategories.value.filter((category) => category.level === 1))

  // 當前年級下的文章
  const visibleTexts = computed(() => {
    if (!state.value.selectedGradeId) return []
    return state.value.texts.filter((text) => text.category_id === state.value.selectedGradeId)
  })

  const selectedText = computed(() =>
    state.value.texts.find((text) => text.id === state.value.selectedTextId) ?? null
  )

  function selectGrade(id: string) {
    if (state.value.selectedGradeId !== id) {
      state.value.selectedGradeId = id
      resetSelections()
    }
  }

  function selectText(id: string) {
    state.value.selectedTextId = id
  }

  async function addCategory(payload: PracticeCategoryInput, userId?: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    
    // 簡化為單層結構：只支持年級
    const level = 1
    const type = payload.type ?? 'grade'
    
    // 根據 is_system 參數決定是系統分類還是私有分類
    const isSystem = payload.is_system ?? true
    const createdBy = isSystem ? null : userId
    
    // 為私有分類的 slug 添加用戶 ID 後綴，避免與系統分類衝突
    let slug = slugify(payload.name)
    if (!isSystem && userId) {
      // 取用戶 ID 的前 8 位作為後綴
      slug = `${slug}-${userId.slice(0, 8)}`
    }

    const { data, error: insertError } = await supabase
      .from('practice_categories')
      .insert({
        name: payload.name,
        slug,
        parent_id: payload.parent_id,
        level,
        type,
        description: payload.description ?? null,
        order_index: payload.order_index ?? 0,
        is_system: isSystem,
        created_by: createdBy,
      })
      .select('*')
      .single()

    if (insertError) throw insertError
    if (data) {
      state.value.categories.push(data as PracticeCategory)
    }
    return data as PracticeCategory
  }

  async function updateCategory(id: string, payload: { name?: string; description?: string; order_index?: number }) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    const updateData: Record<string, unknown> = {}
    if (payload.name !== undefined) {
      updateData.name = payload.name
      updateData.slug = slugify(payload.name)
    }
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.order_index !== undefined) updateData.order_index = payload.order_index

    const { data, error: updateError } = await supabase
      .from('practice_categories')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError
    if (data) {
      const idx = state.value.categories.findIndex((cat) => cat.id === id)
      if (idx !== -1) {
        state.value.categories[idx] = data as PracticeCategory
      }
    }
    return data as PracticeCategory
  }

  async function deleteCategory(id: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')

    // 檢查是否有子分類
    const hasChildren = state.value.categories.some((cat) => cat.parent_id === id)
    if (hasChildren) {
      throw new Error('此分類下還有子分類，請先刪除子分類')
    }

    // 檢查是否有文章使用此分類
    const { count, error: countError } = await supabase
      .from('practice_texts')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (countError) throw countError
    if (count && count > 0) {
      throw new Error(`此分類下還有 ${count} 篇文章，請先移除或重新分類`)
    }

    const { error: deleteError } = await supabase.from('practice_categories').delete().eq('id', id)
    if (deleteError) throw deleteError

    // 更新本地狀態
    state.value.categories = state.value.categories.filter((cat) => cat.id !== id)
    if (state.value.selectedGradeId === id) {
      state.value.selectedGradeId = null
    }
  }

  return {
    state,
    isLoading,
    error,
    rootCategories,
    visibleTexts,
    selectedText,
    fetchLibrary,
    selectGrade,
    selectText,
    addCategory,
    updateCategory,
    deleteCategory,
  }
})
