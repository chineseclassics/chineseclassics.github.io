import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from './authStore'
import type { 
  PracticeText, 
  TextAnnotation, 
  ReadingProgress, 
  ReadingText,
  ReadingCategory,
  AnnotationInput,
  ReadingTextInput
} from '@/types/text'

export const useReadingStore = defineStore('reading', () => {
  const supabase = useSupabase()
  const authStore = useAuthStore()
  
  // 狀態
  const readingTexts = ref<ReadingText[]>([])
  const currentText = ref<ReadingText | null>(null)
  const readingCategories = ref<ReadingCategory[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // 書籤列表
  const bookmarkedTexts = computed(() => 
    readingTexts.value.filter(t => t.progress?.bookmarked)
  )
  
  // 獲取閱讀文章列表（text_type 為 'reading'）
  async function fetchReadingTexts() {
    if (!supabase) {
      error.value = 'Supabase 尚未配置'
      return
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('practice_texts')
        .select(`
          *,
          text_reading_categories (
            category:reading_categories (
              id,
              name,
              description,
              order_index
            )
          ),
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `)
        .eq('text_type', 'reading')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      // 如果用戶已登入，獲取閱讀進度
      let progressMap: Map<string, ReadingProgress> = new Map()
      if (authStore.isAuthenticated && authStore.user?.id) {
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', authStore.user.id)
        
        if (progressData) {
          progressData.forEach((p: ReadingProgress) => {
            progressMap.set(p.text_id, p)
          })
        }
      }
      
      // 合併文章和進度，並轉換文集數據格式
      readingTexts.value = (data || []).map((text: any) => {
        // 將 text_reading_categories 轉換為 reading_categories 數組
        const reading_categories = text.text_reading_categories
          ?.map((trc: any) => trc.category)
          .filter(Boolean) || []
        
        return {
          ...text,
          reading_categories,
          text_reading_categories: undefined, // 移除原始關聯數據
          progress: progressMap.get(text.id) || null
        }
      })
      
    } catch (err: any) {
      error.value = err.message ?? '無法載入閱讀文章'
    } finally {
      isLoading.value = false
    }
  }
  
  // 獲取單篇文章詳情（包含註釋）
  async function fetchTextDetail(textId: string) {
    if (!supabase) {
      error.value = 'Supabase 尚未配置'
      return null
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // 獲取文章
      const { data: textData, error: textError } = await supabase
        .from('practice_texts')
        .select(`
          *,
          text_reading_categories (
            category:reading_categories (
              id,
              name,
              description,
              order_index
            )
          ),
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `)
        .eq('id', textId)
        .single()
      
      if (textError) throw textError
      
      // 獲取註釋
      const { data: annotationsData } = await supabase
        .from('text_annotations')
        .select('*')
        .eq('text_id', textId)
        .order('start_index', { ascending: true })
      
      // 獲取閱讀進度
      let progress: ReadingProgress | null = null
      if (authStore.isAuthenticated && authStore.user?.id) {
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('text_id', textId)
          .eq('user_id', authStore.user.id)
          .maybeSingle()
        
        progress = progressData || null
      }
      
      // 轉換文集數據格式
      const reading_categories = (textData as any).text_reading_categories
        ?.map((trc: any) => trc.category)
        .filter(Boolean) || []
      
      currentText.value = {
        ...textData,
        reading_categories,
        text_reading_categories: undefined,
        annotations: annotationsData || [],
        progress
      }
      
      return currentText.value
      
    } catch (err: any) {
      error.value = err.message ?? '無法載入文章詳情'
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  // 更新閱讀進度
  async function updateProgress(textId: string, progressPercent: number, lastParagraph: number) {
    if (!supabase || !authStore.isAuthenticated || !authStore.user?.id) return
    
    try {
      const { data, error: upsertError } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: authStore.user.id,
          text_id: textId,
          progress_percent: progressPercent,
          last_paragraph: lastParagraph,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,text_id'
        })
        .select()
        .single()
      
      if (upsertError) throw upsertError
      
      // 更新本地狀態
      if (currentText.value?.id === textId) {
        currentText.value.progress = data
      }
      
      // 更新列表中的進度
      const idx = readingTexts.value.findIndex(t => t.id === textId)
      if (idx !== -1) {
        readingTexts.value[idx].progress = data
      }
      
    } catch (err: any) {
      console.error('更新閱讀進度失敗:', err)
    }
  }
  
  // 切換書籤狀態
  async function toggleBookmark(textId: string) {
    if (!supabase || !authStore.isAuthenticated || !authStore.user?.id) return
    
    // 找到當前書籤狀態
    const text = readingTexts.value.find(t => t.id === textId) || currentText.value
    const currentBookmarked = text?.progress?.bookmarked ?? false
    
    try {
      const { data, error: upsertError } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: authStore.user.id,
          text_id: textId,
          bookmarked: !currentBookmarked,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,text_id'
        })
        .select()
        .single()
      
      if (upsertError) throw upsertError
      
      // 更新本地狀態
      if (currentText.value?.id === textId) {
        currentText.value.progress = data
      }
      
      const idx = readingTexts.value.findIndex(t => t.id === textId)
      if (idx !== -1) {
        readingTexts.value[idx].progress = data
      }
      
      return data?.bookmarked
      
    } catch (err: any) {
      console.error('切換書籤失敗:', err)
      return null
    }
  }
  
  // 添加註釋（老師/管理員）
  async function addAnnotation(input: AnnotationInput) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    if (!authStore.isTeacher && !authStore.isAdmin) {
      throw new Error('只有老師或管理員可以添加註釋')
    }
    
    const { data, error: insertError } = await supabase
      .from('text_annotations')
      .insert({
        ...input,
        created_by: authStore.user.id
      })
      .select()
      .single()
    
    if (insertError) throw insertError
    
    // 更新當前文章的註釋列表
    if (currentText.value?.id === input.text_id && data) {
      currentText.value.annotations = [
        ...(currentText.value.annotations || []),
        data
      ].sort((a, b) => a.start_index - b.start_index)
    }
    
    return data
  }
  
  // 更新註釋
  async function updateAnnotation(id: string, annotation: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    
    const { data, error: updateError } = await supabase
      .from('text_annotations')
      .update({ annotation })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    // 更新當前文章的註釋
    if (currentText.value?.annotations) {
      const idx = currentText.value.annotations.findIndex(a => a.id === id)
      if (idx !== -1) {
        currentText.value.annotations[idx] = data
      }
    }
    
    return data
  }
  
  // 刪除註釋
  async function deleteAnnotation(id: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    
    const { error: deleteError } = await supabase
      .from('text_annotations')
      .delete()
      .eq('id', id)
    
    if (deleteError) throw deleteError
    
    // 從當前文章中移除
    if (currentText.value?.annotations) {
      currentText.value.annotations = currentText.value.annotations.filter(a => a.id !== id)
    }
  }
  
  // 創建閱讀文章
  async function createReadingText(
    input: ReadingTextInput & { reading_category_ids?: string[] }, 
    isSystem: boolean = false
  ) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    
    // 創建文章
    const { data, error: insertError } = await supabase
      .from('practice_texts')
      .insert({
        title: input.title,
        author: input.author ?? null,
        source: input.source ?? null,
        summary: input.summary ?? null,
        category_id: input.category_id || null,
        content: input.content,
        text_type: 'reading', // 固定為 reading
        source_text_id: input.source_text_id || null,
        source_start_index: input.source_start_index ?? null,
        source_end_index: input.source_end_index ?? null,
        is_system: isSystem,
        created_by: isSystem ? null : authStore.user.id,
      })
      .select('*')
      .single()
    
    if (insertError) throw insertError
    
    // 如果有選擇文集，創建關聯
    const categoryIds = input.reading_category_ids || []
    if (data && categoryIds.length > 0) {
      const { error: linkError } = await supabase
        .from('text_reading_categories')
        .insert(categoryIds.map(catId => ({
          text_id: data.id,
          category_id: catId
        })))
      
      if (linkError) {
        console.error('關聯文集失敗:', linkError)
      }
    }
    
    // 獲取關聯的文集信息
    const reading_categories = categoryIds.length > 0
      ? readingCategories.value.filter(c => categoryIds.includes(c.id))
      : []
    
    if (data) {
      readingTexts.value.unshift({ 
        ...data, 
        reading_categories,
        progress: null, 
        annotations: [] 
      })
    }
    
    return data
  }
  
  // 從閱讀文章提取練習片段
  async function extractPracticeFragment(
    sourceTextId: string,
    startIndex: number,
    endIndex: number,
    fragmentContent: string,
    metadata: {
      title: string
      category_id?: string | null
      difficulty?: number
    }
  ) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    
    // 獲取來源文章信息
    const sourceText = readingTexts.value.find(t => t.id === sourceTextId) || currentText.value
    
    const { data, error: insertError } = await supabase
      .from('practice_texts')
      .insert({
        title: metadata.title,
        author: sourceText?.author ?? null,
        source: sourceText?.source ?? null,
        category_id: metadata.category_id || null,
        content: fragmentContent,
        difficulty: metadata.difficulty || 2,
        text_type: 'practice',
        source_text_id: sourceTextId,
        source_start_index: startIndex,
        source_end_index: endIndex,
        is_system: false,
        created_by: authStore.user.id,
      })
      .select()
      .single()
    
    if (insertError) throw insertError
    
    return data
  }
  
  // 清理
  function clearCurrentText() {
    currentText.value = null
  }
  
  // 更新文章的文集關聯
  async function updateTextCategories(textId: string, categoryIds: string[]) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.isAdmin) throw new Error('只有管理員可以更新文集')
    
    // 先刪除現有關聯
    const { error: deleteError } = await supabase
      .from('text_reading_categories')
      .delete()
      .eq('text_id', textId)
    
    if (deleteError) throw deleteError
    
    // 添加新關聯
    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('text_reading_categories')
        .insert(categoryIds.map(catId => ({
          text_id: textId,
          category_id: catId
        })))
      
      if (insertError) throw insertError
    }
    
    // 更新本地狀態
    const reading_categories = readingCategories.value.filter(c => categoryIds.includes(c.id))
    
    if (currentText.value?.id === textId) {
      currentText.value.reading_categories = reading_categories
    }
    
    const idx = readingTexts.value.findIndex(t => t.id === textId)
    if (idx !== -1) {
      readingTexts.value[idx].reading_categories = reading_categories
    }
  }
  
  // ===== 閱讀分類（文集）管理 =====
  
  // 獲取閱讀分類列表
  async function fetchReadingCategories() {
    if (!supabase) return
    
    try {
      const { data, error: fetchError } = await supabase
        .from('reading_categories')
        .select('*')
        .order('order_index', { ascending: true })
      
      if (fetchError) throw fetchError
      
      readingCategories.value = data || []
    } catch (err: any) {
      console.error('獲取閱讀分類失敗:', err)
    }
  }
  
  // 創建閱讀分類
  async function createReadingCategory(name: string, description?: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.isAdmin) throw new Error('只有管理員可以創建分類')
    
    // 獲取當前最大的 order_index
    const maxOrder = readingCategories.value.reduce((max, c) => Math.max(max, c.order_index), 0)
    
    const { data, error: insertError } = await supabase
      .from('reading_categories')
      .insert({
        name,
        description: description || null,
        order_index: maxOrder + 1,
        created_by: authStore.user?.id
      })
      .select()
      .single()
    
    if (insertError) throw insertError
    
    if (data) {
      readingCategories.value.push(data)
    }
    
    return data
  }
  
  // 更新閱讀分類
  async function updateReadingCategory(id: string, updates: { name?: string; description?: string }) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.isAdmin) throw new Error('只有管理員可以更新分類')
    
    const { data, error: updateError } = await supabase
      .from('reading_categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    // 更新本地狀態
    const idx = readingCategories.value.findIndex(c => c.id === id)
    if (idx !== -1 && data) {
      readingCategories.value[idx] = data
    }
    
    return data
  }
  
  // 刪除閱讀分類
  async function deleteReadingCategory(id: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.isAdmin) throw new Error('只有管理員可以刪除分類')
    
    const { error: deleteError } = await supabase
      .from('reading_categories')
      .delete()
      .eq('id', id)
    
    if (deleteError) throw deleteError
    
    // 從本地狀態移除
    readingCategories.value = readingCategories.value.filter(c => c.id !== id)
  }
  
  return {
    // 狀態
    readingTexts,
    currentText,
    readingCategories,
    bookmarkedTexts,
    isLoading,
    error,
    // 文章操作
    fetchReadingTexts,
    fetchTextDetail,
    createReadingText,
    extractPracticeFragment,
    clearCurrentText,
    // 進度和書籤
    updateProgress,
    toggleBookmark,
    // 註釋操作
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    // 閱讀分類（文集）
    fetchReadingCategories,
    createReadingCategory,
    updateReadingCategory,
    deleteReadingCategory,
    updateTextCategories,
  }
})

