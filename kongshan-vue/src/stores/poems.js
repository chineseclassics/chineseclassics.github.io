/**
 * 詩歌數據管理 Store
 * 使用 Pinia 管理詩歌列表和當前詩歌狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const usePoemStore = defineStore('poems', () => {
  // ========== 狀態 ==========
  const poems = ref([])
  const currentPoem = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')

  // ========== 計算屬性 ==========
  
  /**
   * 過濾後的詩歌列表（根據搜索）
   */
  const filteredPoems = computed(() => {
    if (!searchQuery.value.trim()) {
      return poems.value
    }

    const query = searchQuery.value.toLowerCase()
    return poems.value.filter(poem => {
      return (
        poem.content?.toLowerCase().includes(query) ||
        poem.title?.toLowerCase().includes(query) ||
        poem.author?.toLowerCase().includes(query) ||
        poem.dynasty?.toLowerCase().includes(query)
      )
    })
  })

  /**
   * 有聲色意境的詩歌
   */
  const poemsWithAtmosphere = computed(() => {
    return poems.value.filter(p => p.hasAtmosphere)
  })

  /**
   * 沒有聲色意境的詩歌
   */
  const poemsWithoutAtmosphere = computed(() => {
    return poems.value.filter(p => !p.hasAtmosphere)
  })

  // ========== 方法 ==========

  /**
   * 加載所有詩歌列表
   * 排序規則：
   * 1. 有聲色意境的詩句，按最新聲色意境的創建時間降序排列
   * 2. 沒有聲色意境的詩句，隨機排序
   */
  async function loadPoems() {
    if (!supabase) {
      error.value = 'Supabase 未配置，無法加載詩歌數據'
      return []
    }

    try {
      loading.value = true
      error.value = null

      console.log('從 Supabase 加載詩歌...')

      // 並行查詢：同時獲取所有詩句和所有已審核通過的聲色意境
      const [poemsResult, atmospheresResult] = await Promise.all([
        supabase.from('poems').select('*'),
        supabase
          .from('poem_atmospheres')
          .select('poem_id, created_at')
          .eq('status', 'approved'),
      ])

      // 處理詩句查詢結果
      if (poemsResult.error) {
        throw poemsResult.error
      }

      const allPoems = poemsResult.data || []
      if (allPoems.length === 0) {
        error.value = '數據庫中沒有詩歌數據'
        return []
      }

      // 處理聲色意境查詢結果
      const atmospheres = atmospheresResult.data || []

      // 計算每個詩句的最新聲色意境時間
      const poemLatestAtmosphere = new Map()
      atmospheres.forEach((atm) => {
        const poemId = atm.poem_id
        const createdAt = new Date(atm.created_at).getTime()
        const existing = poemLatestAtmosphere.get(poemId)
        if (!existing || createdAt > existing) {
          poemLatestAtmosphere.set(poemId, createdAt)
        }
      })

      // 分組：有聲色意境的 vs 沒有聲色意境的
      const withAtmosphere = []
      const withoutAtmosphere = []

      allPoems.forEach((poem) => {
        const latestAtmosphereTime = poemLatestAtmosphere.get(poem.id)
        if (latestAtmosphereTime) {
          withAtmosphere.push({
            ...poem,
            latest_atmosphere_time: latestAtmosphereTime,
          })
        } else {
          withoutAtmosphere.push(poem)
        }
      })

      // 有聲色意境的詩句，按最新聲色意境時間降序排序
      withAtmosphere.sort((a, b) => b.latest_atmosphere_time - a.latest_atmosphere_time)

      // 沒有聲色意境的詩句，隨機排序
      const shuffledWithout = shuffleArray(withoutAtmosphere)

      // 合併：有聲色意境的在前，沒有聲色意境的在後
      const sortedPoems = [
        ...withAtmosphere.map(({ latest_atmosphere_time, ...poem }) => ({
          ...poem,
          hasAtmosphere: true,
        })),
        ...shuffledWithout.map((poem) => ({
          ...poem,
          hasAtmosphere: false,
        })),
      ]

      console.log('詩句排序完成:', {
        有聲色意境: withAtmosphere.length,
        無聲色意境: shuffledWithout.length,
      })

      poems.value = sortedPoems
      return sortedPoems
    } catch (err) {
      console.error('❌ 加載詩歌列表失敗:', err)
      error.value = err.message || '加載詩歌失敗'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 根據 ID 加載詩歌
   */
  async function loadPoemById(poemId) {
    if (!supabase) {
      error.value = 'Supabase 未配置'
      return null
    }

    try {
      loading.value = true
      error.value = null

      const { data, error: queryError } = await supabase
        .from('poems')
        .select('*')
        .eq('id', poemId)
        .single()

      if (queryError) throw queryError

      currentPoem.value = data
      return data
    } catch (err) {
      console.error('加載詩歌失敗:', err)
      error.value = err.message || '加載詩歌失敗'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 設置當前詩歌
   */
  function setCurrentPoem(poem) {
    currentPoem.value = poem
  }

  /**
   * 清空當前詩歌
   */
  function clearCurrentPoem() {
    currentPoem.value = null
  }

  /**
   * 設置搜索關鍵詞
   */
  function setSearchQuery(query) {
    searchQuery.value = query
  }

  /**
   * 隨機打亂數組順序（Fisher-Yates 洗牌算法）
   */
  function shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  return {
    // 狀態
    poems,
    currentPoem,
    loading,
    error,
    searchQuery,
    // 計算屬性
    filteredPoems,
    poemsWithAtmosphere,
    poemsWithoutAtmosphere,
    // 方法
    loadPoems,
    loadPoemById,
    setCurrentPoem,
    clearCurrentPoem,
    setSearchQuery,
  }
})

