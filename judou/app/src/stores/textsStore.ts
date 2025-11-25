import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
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

  async function addText(payload: TextInput) {
    if (!supabase) throw new Error('Supabase 尚未配置')
    const sanitized = sanitizeContent(payload.content)
    const difficulty = estimateDifficulty(sanitized)
    const word_count = countCharacters(sanitized)
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
    const { error: deleteError } = await supabase.from('practice_texts').delete().eq('id', id)
    if (deleteError) throw deleteError
    texts.value = texts.value.filter((item) => item.id !== id)
  }

  async function recordPracticeResult(payload: PracticeResultPayload) {
    if (!supabase) return
    const username = payload.username ?? 'anonymous_user'
    const display_name = payload.display_name ?? '匿名學員'
    await supabase.from('practice_records').insert({ ...payload, username, display_name })
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
