/**
 * 聲色意境 Composable
 * 提供組件中使用的聲色意境相關功能
 */

import { storeToRefs } from 'pinia'
import { useAtmosphereStore } from '../stores/atmospheres'

export function useAtmospheres() {
  const atmosphereStore = useAtmosphereStore()

  // 將狀態轉為 refs（保持響應性）
  const {
    atmospheres,
    currentAtmosphere,
    currentPoemId,
    currentIndex,
    loading,
    error,
    userLikedAtmosphereId,
    approvedAtmospheres,
    hasAtmospheres,
    isCurrentLiked,
  } = storeToRefs(atmosphereStore)

  // 方法直接引用
  const {
    loadAtmospheres,
    nextAtmosphere,
    previousAtmosphere,
    setCurrentAtmosphereById,
    toggleLike,
    saveAtmosphere,
    clear,
    userAtmospheres,
  } = atmosphereStore

  return {
    // 狀態
    atmospheres,
    currentAtmosphere,
    currentPoemId,
    currentIndex,
    loading,
    error,
    userLikedAtmosphereId,
    // 計算屬性
    approvedAtmospheres,
    hasAtmospheres,
    isCurrentLiked,
    userAtmospheres,
    // 方法
    loadAtmospheres,
    nextAtmosphere,
    previousAtmosphere,
    setCurrentAtmosphereById,
    toggleLike,
    saveAtmosphere,
    clear,
  }
}

