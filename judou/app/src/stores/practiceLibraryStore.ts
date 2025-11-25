import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import type {
  PracticeCategory,
  PracticeCategoryInput,
  PracticeLibraryState,
  PracticeLibraryText,
} from '@/types/practiceLibrary'

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
    id: 'grade-7-module-lunyu',
    name: '論語讀本',
    slug: 'grade-7-module-lunyu',
    parent_id: 'grade-7',
    level: 2,
    type: 'module',
    description: '以語錄題材培養句型感與節奏感。',
    order_index: 1,
  },
  {
    id: 'grade-7-theme-renyi',
    name: '仁義篇',
    slug: 'grade-7-theme-renyi',
    parent_id: 'grade-7-module-lunyu',
    level: 3,
    type: 'theme',
    description: '圍繞「仁」與「義」的章句，適合練習短句斷讀。',
    order_index: 1,
  },
  {
    id: 'grade-7-theme-xuexi',
    name: '學習篇',
    slug: 'grade-7-theme-xuexi',
    parent_id: 'grade-7-module-lunyu',
    level: 3,
    type: 'theme',
    description: '關於求學與修身的篇章，句式多變。',
    order_index: 2,
  },
  {
    id: 'anthology-guwenguan-zhi',
    name: '古文觀止',
    slug: 'anthology-guwenguan-zhi',
    parent_id: null,
    level: 1,
    type: 'grade',
    description: '以主題式選編進行高階訓練。',
    order_index: 2,
  },
  {
    id: 'anthology-guwenguan-zhi-warring',
    name: '戰國策',
    slug: 'anthology-guwenguan-zhi-warring',
    parent_id: 'anthology-guwenguan-zhi',
    level: 2,
    type: 'module',
    description: '戰國時期縱橫家精彩篇章，節奏快速。',
    order_index: 1,
  },
  {
    id: 'anthology-guwenguan-zhi-warring-theme',
    name: '遊說名篇',
    slug: 'anthology-guwenguan-zhi-warring-theme',
    parent_id: 'anthology-guwenguan-zhi-warring',
    level: 3,
    type: 'theme',
    description: '以遊說篇章作為高階斷句挑戰。',
    order_index: 1,
  },
]

const FALLBACK_TEXTS: PracticeLibraryText[] = [
  {
    id: 'text-renyi-01',
    title: '論語・學而篇',
    author: '孔子及弟子',
    category_id: 'grade-7-theme-renyi',
    difficulty: 1,
    summary: '子曰：「弟子入則孝...」',
    word_count: 86,
    content: '子曰|弟子入則孝||出則弟|信而好|犯而不|怨...',
  },
  {
    id: 'text-renyi-02',
    title: '論語・里仁篇',
    author: '孔子及弟子',
    category_id: 'grade-7-theme-renyi',
    difficulty: 2,
    summary: '里仁為美，擇其善者而從之。',
    word_count: 120,
    content: '子曰|里仁為美|擇不處仁|焉得知||仁者安仁|知者利仁',
  },
  {
    id: 'text-xuexi-01',
    title: '論語・為政篇',
    author: '孔子及弟子',
    category_id: 'grade-7-theme-xuexi',
    difficulty: 2,
    summary: '溫故而知新，可以為師矣。',
    word_count: 95,
    content: '子曰|溫故而知新|可以為師矣|學而不思則罔|思而不學則殆',
  },
  {
    id: 'text-warring-01',
    title: '蘇秦說齊王',
    author: '蘇秦',
    category_id: 'anthology-guwenguan-zhi-warring-theme',
    difficulty: 3,
    summary: '以合縱策略說服齊王，語勢跌宕。',
    word_count: 260,
    content: '蘇秦曰|大王處東海之濱|南有江淮之饒|北有燕代之利|...',
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
    selectedModuleId: null,
    selectedThemeId: null,
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

  function resetSelections(level: 'grade' | 'module' | 'theme') {
    if (level === 'grade') {
      state.value.selectedModuleId = null
      state.value.selectedThemeId = null
    }

    if (level !== 'theme') {
      state.value.selectedTextId = null
    }

    if (level === 'module') {
      state.value.selectedThemeId = null
    }
  }

  const sortedCategories = computed(() =>
    [...state.value.categories].sort((a, b) => {
      if (a.level === b.level) {
        return a.order_index - b.order_index
      }
      return a.level - b.level
    })
  )

  const rootCategories = computed(() => sortedCategories.value.filter((category) => category.level === 1))

  const modules = computed(() =>
    state.value.categories.filter((category) => category.parent_id === state.value.selectedGradeId)
  )

  const themes = computed(() =>
    state.value.categories.filter((category) => category.parent_id === state.value.selectedModuleId)
  )

  const visibleTexts = computed(() => {
    const activeCategoryId = state.value.selectedThemeId ?? state.value.selectedModuleId ?? state.value.selectedGradeId
    if (!activeCategoryId) return []
    return state.value.texts.filter((text) => text.category_id === activeCategoryId)
  })

  const selectedText = computed(() =>
    state.value.texts.find((text) => text.id === state.value.selectedTextId) ?? null
  )

  function selectGrade(id: string) {
    if (state.value.selectedGradeId !== id) {
      state.value.selectedGradeId = id
      resetSelections('grade')
    }
  }

  function selectModule(id: string) {
    if (state.value.selectedModuleId !== id) {
      state.value.selectedModuleId = id
      resetSelections('module')
    }
  }

  function selectTheme(id: string) {
    if (state.value.selectedThemeId !== id) {
      state.value.selectedThemeId = id
      resetSelections('theme')
    }
  }

  function selectText(id: string) {
    state.value.selectedTextId = id
  }

  async function addCategory(payload: PracticeCategoryInput) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    const parent = payload.parent_id ? state.value.categories.find((cat) => cat.id === payload.parent_id) : null

    if (payload.type !== 'grade' && !parent) {
      throw new Error('請選擇上層分類')
    }

    if (parent && parent.level >= 3) {
      throw new Error('目前僅支援三級分類')
    }

    const level = parent ? parent.level + 1 : 1
    const type = payload.type ?? (parent ? (parent.level === 1 ? 'module' : 'theme') : 'grade')

    const { data, error: insertError } = await supabase
      .from('practice_categories')
      .insert({
        name: payload.name,
        slug: slugify(payload.name),
        parent_id: payload.parent_id,
        level,
        type,
        description: payload.description ?? null,
        order_index: payload.order_index ?? 0,
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
    if (state.value.selectedModuleId === id) {
      state.value.selectedModuleId = null
    }
    if (state.value.selectedThemeId === id) {
      state.value.selectedThemeId = null
    }
  }

  return {
    state,
    isLoading,
    error,
    rootCategories,
    modules,
    themes,
    visibleTexts,
    selectedText,
    fetchLibrary,
    selectGrade,
    selectModule,
    selectTheme,
    selectText,
    addCategory,
    updateCategory,
    deleteCategory,
  }
})
