import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useAuthStore } from './authStore'
import type { PracticeResultPayload, PracticeText, TextInput } from '@/types/text'

const PUNCTUATION_BREAKS = /[。！？；，：]/g
const QUOTES = /[「」『』“”"']/g
const MULTIPLE_BREAKS = /\|{2,}/g

function sanitizeContent(raw: string) {
  if (!raw) return ''
  const withoutQuotes = raw.replace(QUOTES, '')
  const withBreaks = withoutQuotes.replace(PUNCTUATION_BREAKS, '|')
  const collapsed = withBreaks.replace(MULTIPLE_BREAKS, '|').trim()
  return collapsed.endsWith('|') ? collapsed.slice(0, -1) : collapsed
}

function estimateDifficulty(content: string) {
  const len = content.replace(/\|/g, '').length
  if (len <= 70) return 1
  if (len <= 150) return 2
  return 3
}

function countCharacters(content: string) {
  return content.replace(/\|/g, '').length
}

export const useTextsStore = defineStore('texts', () => {
  const supabase = useSupabase()
  const authStore = useAuthStore()
  const texts = ref<PracticeText[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedTexts = computed(() =>
    [...texts.value].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  )

  async function fetchTexts() {
    if (!supabase) {
      error.value = 'Supabase 尚未配置'
      return
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('practice_texts')
        .select(
          `
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          ),
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `
        )
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      // 處理 source_text 可能是數組的情況（Supabase 關聯查詢有時返回數組）
      // 處理 practice_categories 關聯
      texts.value = (data || []).map((item: any) => {
        const sourceText = Array.isArray(item.source_text) 
          ? item.source_text[0] 
          : item.source_text
        
        // 處理多選分類
        const practiceCategories = Array.isArray(item.text_practice_categories)
          ? item.text_practice_categories
              .map((tpc: any) => tpc.category)
              .filter(Boolean)
          : []
        
        return {
          ...item,
          source_text: sourceText || null,
          practice_categories: practiceCategories,
          text_practice_categories: undefined
        }
      }) as PracticeText[]
    } catch (err: any) {
      error.value = err.message ?? '無法載入文章'
    } finally {
      isLoading.value = false
    }
  }

  async function addText(payload: TextInput, isSystem: boolean = false) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    
    const sanitized = sanitizeContent(payload.content)
    const difficulty = estimateDifficulty(sanitized)
    const word_count = countCharacters(sanitized)
    
    // 如果是系統文章，必須是管理員
    if (isSystem && !authStore.isAdmin) {
      throw new Error('只有管理員可以創建系統文章')
    }
    
    // 如果是私有文章，必須是老師
    if (!isSystem && !authStore.isTeacher) {
      throw new Error('只有老師可以創建私有文章')
    }
    
    // 優先使用多選分類，如果沒有則使用單一分類（向後兼容）
    const categoryId = payload.practice_category_ids && payload.practice_category_ids.length > 0
      ? payload.practice_category_ids[0]  // 使用第一個分類作為主分類（向後兼容）
      : payload.category_id || null
    
    const { data, error: insertError } = await supabase
      .from('practice_texts')
      .insert({
        title: payload.title,
        author: payload.author ?? null,
        source: payload.source ?? null,
        summary: payload.summary ?? null,
        category_id: categoryId,
        content: sanitized,
        difficulty,
        word_count,
        is_system: isSystem,
        created_by: isSystem ? null : authStore.user.id,
      })
      .select(
        `
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `
      )
      .single()

    if (insertError) throw insertError
    
    // 處理多選分類關聯
    if (data && payload.practice_category_ids && payload.practice_category_ids.length > 0) {
      const { error: categoryError } = await supabase
        .from('text_practice_categories')
        .insert(payload.practice_category_ids.map(catId => ({
          text_id: data.id,
          category_id: catId
        })))
      
      if (categoryError) throw categoryError
      
      // 重新獲取包含多選分類的完整數據
      const { data: fullData, error: fetchError } = await supabase
        .from('practice_texts')
        .select(
          `
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          )
        `
        )
        .eq('id', data.id)
        .single()
      
      if (fetchError) throw fetchError
      
      if (fullData) {
        const practiceCategories = Array.isArray(fullData.text_practice_categories)
          ? fullData.text_practice_categories
              .map((tpc: any) => tpc.category)
              .filter(Boolean)
          : []
        
        const textWithCategories = {
          ...fullData,
          practice_categories: practiceCategories,
          text_practice_categories: undefined
        } as PracticeText
        
        texts.value.unshift(textWithCategories)
      }
    } else if (data) {
      texts.value.unshift(data as PracticeText)
    }
  }

  async function updateText(id: string, payload: TextInput) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    
    // 檢查權限：查找文章是否為系統文章
    const { data: existingText } = await supabase
      .from('practice_texts')
      .select('is_system, created_by')
      .eq('id', id)
      .single()
    
    if (existingText) {
      // 系統文章只能由管理員更新
      if (existingText.is_system && !authStore.isAdmin) {
        throw new Error('只有管理員可以更新系統文章')
      }
      // 私有文章只能由創建者更新
      if (!existingText.is_system && existingText.created_by !== authStore.user.id) {
        throw new Error('只能更新自己創建的文章')
      }
    }
    
    const sanitized = sanitizeContent(payload.content)
    const difficulty = estimateDifficulty(sanitized)
    const word_count = countCharacters(sanitized)
    
    // 優先使用多選分類，如果沒有則使用單一分類（向後兼容）
    const categoryId = payload.practice_category_ids && payload.practice_category_ids.length > 0
      ? payload.practice_category_ids[0]  // 使用第一個分類作為主分類（向後兼容）
      : payload.category_id || null
    
    const { data, error: updateError } = await supabase
      .from('practice_texts')
      .update({
        title: payload.title,
        author: payload.author ?? null,
        source: payload.source ?? null,
        summary: payload.summary ?? null,
        category_id: categoryId,
        content: sanitized,
        difficulty,
        word_count,
      })
      .eq('id', id)
      .select(
        `
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `
      )
      .single()

    if (updateError) throw updateError
    
    // 處理多選分類關聯
    if (payload.practice_category_ids !== undefined) {
      // 先刪除現有關聯
      const { error: deleteError } = await supabase
        .from('text_practice_categories')
        .delete()
        .eq('text_id', id)
      
      if (deleteError) throw deleteError
      
      // 添加新關聯
      if (payload.practice_category_ids.length > 0) {
        const { error: insertError } = await supabase
          .from('text_practice_categories')
          .insert(payload.practice_category_ids.map(catId => ({
            text_id: id,
            category_id: catId
          })))
        
        if (insertError) throw insertError
      }
      
      // 重新獲取包含多選分類的完整數據
      const { data: fullData, error: fetchError } = await supabase
        .from('practice_texts')
        .select(
          `
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          )
        `
        )
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      
      if (fullData) {
        const practiceCategories = Array.isArray(fullData.text_practice_categories)
          ? fullData.text_practice_categories
              .map((tpc: any) => tpc.category)
              .filter(Boolean)
          : []
        
        const textWithCategories = {
          ...fullData,
          practice_categories: practiceCategories,
          text_practice_categories: undefined
        } as PracticeText
        
        texts.value = texts.value.map((item) => (item.id === id ? textWithCategories : item))
      }
    } else if (data) {
      texts.value = texts.value.map((item) => (item.id === id ? (data as PracticeText) : item))
    }
  }

  async function deleteText(id: string) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    if (!authStore.user) throw new Error('請先登入')
    
    // 檢查權限：查找文章是否為系統文章
    const { data: existingText } = await supabase
      .from('practice_texts')
      .select('is_system, created_by')
      .eq('id', id)
      .single()
    
    if (existingText) {
      // 系統文章只能由管理員刪除
      if (existingText.is_system && !authStore.isAdmin) {
        throw new Error('只有管理員可以刪除系統文章')
      }
      // 私有文章只能由創建者刪除
      if (!existingText.is_system && existingText.created_by !== authStore.user.id) {
        throw new Error('只能刪除自己創建的文章')
      }
    }
    
    const { error: deleteError } = await supabase.from('practice_texts').delete().eq('id', id)
    if (deleteError) throw deleteError
    texts.value = texts.value.filter((item) => item.id !== id)
  }

  async function recordPracticeResult(payload: PracticeResultPayload): Promise<string | null> {
    if (!supabase) return null
    const username = payload.username ?? 'anonymous_user'
    const display_name = payload.display_name ?? '匿名學員'
    const { data, error } = await supabase
      .from('practice_records')
      .insert({ ...payload, username, display_name })
      .select('id')
      .single()
    
    if (error) {
      console.error('記錄練習結果失敗:', error)
      return null
    }
    
    return data?.id || null
  }

  function getRandomText() {
    if (!texts.value.length) return null
    const idx = Math.floor(Math.random() * texts.value.length)
    return texts.value[idx]
  }

  return {
    texts,
    sortedTexts,
    isLoading,
    error,
    fetchTexts,
    addText,
    updateText,
    deleteText,
    recordPracticeResult,
    getRandomText,
  }
})
