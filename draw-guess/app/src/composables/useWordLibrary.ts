import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface WordCollection {
  id: string
  slug: string
  title: string
  description: string | null
  entry_count: number
  is_active: boolean
}

export interface WordEntry {
  id: string
  collection_id: string
  text: string
  category: string | null
}

// 全域狀態：保持單例，避免重複請求
const collections = ref<WordCollection[]>([])
const entriesMap = ref<Record<string, WordEntry[]>>({})
const loadingCollections = ref(false)
const loadingEntries = ref<Record<string, boolean>>({})
const error = ref<string | null>(null)
const isAdmin = ref(false)

export function useWordLibrary() {
  const authStore = useAuthStore()

  // 是否已登入且為詞庫管理員
  const canManage = computed(() => isAdmin.value)

  // 重新檢查管理員身份（依據 email）
  async function refreshAdminStatus(force = false) {
    if (!authStore.profile?.email) {
      isAdmin.value = false
      return false
    }

    if (isAdmin.value && !force) return true

    const { data, error: adminError } = await supabase
      .from('word_library_admins')
      .select('email')
      .eq('email', authStore.profile.email)
      .maybeSingle()

    if (adminError) {
      console.warn('[WordLibrary] 檢查管理員權限失敗:', adminError)
      isAdmin.value = false
      return false
    }

    isAdmin.value = !!data
    return isAdmin.value
  }

  // 讀取主題列表
  async function loadCollections(options: { includeInactive?: boolean } = {}) {
    try {
      loadingCollections.value = true
      error.value = null

      let query = supabase
        .from('word_collections')
        .select('id, slug, title, description, entry_count, is_active')
        .order('title', { ascending: true })

      if (!options.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      collections.value = (data || []) as WordCollection[]
      return collections.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入詞句庫失敗'
      return []
    } finally {
      loadingCollections.value = false
    }
  }

  // 讀取指定主題的條目，結果緩存於 entriesMap
  async function loadEntries(collectionId: string, force = false) {
    if (!force && entriesMap.value[collectionId]) {
      return entriesMap.value[collectionId]
    }

    loadingEntries.value[collectionId] = true
    try {
      const { data, error: fetchError } = await supabase
        .from('word_entries')
        .select('id, collection_id, text, category')
        .eq('collection_id', collectionId)
        .order('text', { ascending: true })

      if (fetchError) throw fetchError

      entriesMap.value[collectionId] = (data || []) as WordEntry[]
      return entriesMap.value[collectionId]
    } catch (err) {
      error.value = err instanceof Error ? err.message : '載入詞句條目失敗'
      entriesMap.value[collectionId] = []
      return []
    } finally {
      loadingEntries.value[collectionId] = false
    }
  }

  // 新增主題
  async function addCollection(payload: { title: string; slug?: string; description?: string }) {
    await refreshAdminStatus()
    if (!isAdmin.value) {
      return { success: false, error: '您沒有管理員權限' }
    }

    const slug = payload.slug || payload.title.trim().toLowerCase().replace(/\s+/g, '-')
    const insertData = {
      title: payload.title.trim(),
      slug,
      description: payload.description?.trim() || null,
    }

    const { data, error: insertError } = await supabase
      .from('word_collections')
      .insert(insertData)
      .select('id, slug, title, description, entry_count, is_active')
      .single()

    if (insertError) {
      return { success: false, error: insertError.message || '新增主題失敗' }
    }

    collections.value = [...collections.value, data as WordCollection]
    return { success: true, collection: data as WordCollection }
  }

  // 新增條目
  async function addEntry(collectionId: string, text: string, category?: string) {
    await refreshAdminStatus()
    if (!isAdmin.value) {
      return { success: false, error: '您沒有管理員權限' }
    }

    const cleanText = text.trim()
    if (!cleanText) {
      return { success: false, error: '詞句不可為空' }
    }

    const { data, error: insertError } = await supabase
      .from('word_entries')
      .insert({
        collection_id: collectionId,
        text: cleanText,
        category: category?.trim() || null,
      })
      .select('id, collection_id, text, category')
      .single()

    if (insertError) {
      return { success: false, error: insertError.message || '新增條目失敗' }
    }

    const entry = data as WordEntry
    const existing = entriesMap.value[collectionId] || []
    entriesMap.value[collectionId] = [...existing, entry]

    // 同步更新計數
    collections.value = collections.value.map(c =>
      c.id === collectionId ? { ...c, entry_count: (c.entry_count || 0) + 1 } : c
    )

    return { success: true, entry }
  }

  // 刪除條目
  async function deleteEntry(entryId: string, collectionId: string) {
    await refreshAdminStatus()
    if (!isAdmin.value) {
      return { success: false, error: '您沒有管理員權限' }
    }

    const { error: deleteError } = await supabase
      .from('word_entries')
      .delete()
      .eq('id', entryId)

    if (deleteError) {
      return { success: false, error: deleteError.message || '刪除失敗' }
    }

    const existing = entriesMap.value[collectionId] || []
    entriesMap.value[collectionId] = existing.filter(e => e.id !== entryId)
    collections.value = collections.value.map(c =>
      c.id === collectionId ? { ...c, entry_count: Math.max(0, (c.entry_count || 1) - 1) } : c
    )

    return { success: true }
  }

  // 切換主題啟用狀態
  async function toggleCollectionActive(collectionId: string, isActive: boolean) {
    await refreshAdminStatus()
    if (!isAdmin.value) {
      return { success: false, error: '您沒有管理員權限' }
    }

    const { error: updateError } = await supabase
      .from('word_collections')
      .update({ is_active: isActive })
      .eq('id', collectionId)

    if (updateError) {
      return { success: false, error: updateError.message || '更新狀態失敗' }
    }

    collections.value = collections.value.map(c =>
      c.id === collectionId ? { ...c, is_active: isActive } : c
    )

    return { success: true }
  }

  return {
    collections,
    entriesMap,
    loadingCollections,
    loadingEntries,
    error,
    isAdmin: canManage,
    refreshAdminStatus,
    loadCollections,
    loadEntries,
    addCollection,
    addEntry,
    deleteEntry,
    toggleCollectionActive,
  }
}




