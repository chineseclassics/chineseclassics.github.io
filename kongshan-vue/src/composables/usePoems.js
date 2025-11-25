/**
 * 詩歌 Composable
 * 提供組件中使用的詩歌相關功能
 */

import { storeToRefs } from 'pinia'
import { usePoemStore } from '../stores/poems'

export function usePoems() {
  const poemStore = usePoemStore()

  // 將狀態轉為 refs（保持響應性）
  const {
    poems,
    currentPoem,
    loading,
    error,
    searchQuery,
    filteredPoems,
    poemsWithAtmosphere,
    poemsWithoutAtmosphere,
  } = storeToRefs(poemStore)

  // 方法直接引用
  const {
    loadPoems,
    loadPoemById,
    setCurrentPoem,
    clearCurrentPoem,
    setSearchQuery,
  } = poemStore

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
}

