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
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `
        )
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      texts.value = (data || []) as PracticeText[]
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
    
    const { data, error: insertError } = await supabase
      .from('practice_texts')
      .insert({
        title: payload.title,
        author: payload.author ?? null,
        source: payload.source ?? null,
        summary: payload.summary ?? null,
        category_id: payload.category_id || null,
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
    if (data) {
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
    const { data, error: updateError } = await supabase
      .from('practice_texts')
      .update({
        title: payload.title,
        author: payload.author ?? null,
        source: payload.source ?? null,
        summary: payload.summary ?? null,
        category_id: payload.category_id || null,
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
    if (data) {
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
