/**
 * useStoryboard Composable - 分鏡接龍模式核心邏輯
 * 
 * 實現句子提交、畫布截圖上傳和故事鏈更新邏輯
 * Requirements: 4.4, 4.7, 4.8, 6.4, 6.5
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useStoryStore } from '../stores/story'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { isBlankSentence, isOverLimit } from '../types/storyboard'
import type { StoryChainItem, Submission } from '../types/storyboard'

/** 句子字數限制 */
const SENTENCE_MAX_LENGTH = 100

/** 操作結果類型 */
interface Result<T = void> {
  success: boolean
  error?: string
  data?: T
}

export function useStoryboard() {
  const storyStore = useStoryStore()
  const roomStore = useRoomStore()
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  // ============================================
  // 本地狀態
  // ============================================

  /** 句子輸入框內容 */
  const sentenceInput = ref('')

  /** 提交狀態 */
  const isSubmitting = ref(false)

  /** 上傳狀態 */
  const isUploading = ref(false)

  /** 錯誤信息 */
  const error = ref<string | null>(null)

  // ============================================
  // 計算屬性
  // ============================================

  /** 故事鏈 */
  const storyChain = computed(() => storyStore.storyChain)

  /** 當前輪次的句子提交列表 */
  const submissions = computed(() => storyStore.submissions)

  /** 當前用戶的提交 */
  const mySubmission = computed(() => storyStore.mySubmission)

  /** 最新的故事句子（用於畫家繪畫題目） */
  const latestSentence = computed(() => storyStore.latestSentence)

  /** 故事開頭 */
  const storyOpening = computed(() => storyStore.storyOpening)

  /** 當前階段 */
  const currentPhase = computed(() => storyStore.currentPhase)

  /** 是否已提交句子 */
  const hasSubmitted = computed(() => mySubmission.value !== null)

  /** 輸入字數 */
  const inputLength = computed(() => sentenceInput.value.length)

  /** 是否超過字數限制 */
  const isInputOverLimit = computed(() => isOverLimit(sentenceInput.value, SENTENCE_MAX_LENGTH))

  /** 是否可以提交（非空、未超限、在編劇階段） */
  const canSubmit = computed(() => {
    return !isBlankSentence(sentenceInput.value) &&
           !isInputOverLimit.value &&
           currentPhase.value === 'writing' &&
           !isSubmitting.value
  })

  // ============================================
  // 句子提交邏輯
  // Requirements: 4.4, 4.7, 4.8
  // ============================================

  /**
   * 驗證句子輸入
   * Requirements: 4.7, 4.8
   */
  function validateSentence(sentence: string): Result {
    // 檢查空白
    if (isBlankSentence(sentence)) {
      return { success: false, error: '句子不能為空' }
    }

    // 檢查字數限制
    if (isOverLimit(sentence, SENTENCE_MAX_LENGTH)) {
      return { success: false, error: `句子不能超過 ${SENTENCE_MAX_LENGTH} 個字符` }
    }

    return { success: true }
  }

  /**
   * 提交句子
   * Requirements: 4.4, 4.7, 4.8
   * 
   * @param sentence 要提交的句子（可選，默認使用 sentenceInput）
   */
  async function submitSentence(sentence?: string): Promise<Result<Submission>> {
    const textToSubmit = sentence ?? sentenceInput.value

    // 驗證輸入
    const validation = validateSentence(textToSubmit)
    if (!validation.success) {
      error.value = validation.error || '驗證失敗'
      return validation as Result<Submission>
    }

    // 檢查用戶登錄狀態
    if (!authStore.user) {
      error.value = '用戶未登錄'
      return { success: false, error: '用戶未登錄' }
    }

    // 檢查當前輪次
    if (!gameStore.currentRound) {
      error.value = '沒有當前輪次'
      return { success: false, error: '沒有當前輪次' }
    }

    // 檢查階段（只有編劇階段可以提交）
    if (currentPhase.value !== 'writing') {
      error.value = '當前階段不允許提交句子'
      return { success: false, error: '當前階段不允許提交句子' }
    }

    try {
      isSubmitting.value = true
      error.value = null

      const result = await storyStore.submitSentence(
        gameStore.currentRound.id,
        textToSubmit.trim()
      )

      if (result.success) {
        // 提交成功後清空輸入框
        sentenceInput.value = ''
        console.log('[useStoryboard] 句子提交成功')
      } else {
        error.value = result.error || '提交失敗'
      }

      return result as Result<Submission>
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '提交句子失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 提交句子錯誤:', err)
      return { success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 更新已提交的句子
   * Requirements: 4.9 - 允許編劇在編劇階段修改句子
   * 
   * @param newSentence 新的句子內容
   */
  async function updateSubmission(newSentence: string): Promise<Result<Submission>> {
    // 驗證輸入
    const validation = validateSentence(newSentence)
    if (!validation.success) {
      error.value = validation.error || '驗證失敗'
      return validation as Result<Submission>
    }

    // 檢查是否已有提交
    if (!mySubmission.value) {
      // 如果沒有提交過，則創建新提交
      return submitSentence(newSentence)
    }

    // 檢查階段（只有編劇階段可以修改）
    if (currentPhase.value !== 'writing') {
      error.value = '當前階段不允許修改句子'
      return { success: false, error: '當前階段不允許修改句子' }
    }

    try {
      isSubmitting.value = true
      error.value = null

      // 使用 store 的 submitSentence 方法（內部使用 upsert）
      const result = await storyStore.submitSentence(
        mySubmission.value.roundId,
        newSentence.trim()
      )

      if (result.success) {
        console.log('[useStoryboard] 句子更新成功')
      } else {
        error.value = result.error || '更新失敗'
      }

      return result as Result<Submission>
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '更新句子失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 更新句子錯誤:', err)
      return { success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }


  // ============================================
  // 畫布截圖上傳邏輯
  // Requirements: 6.4
  // ============================================

  /**
   * 上傳畫布截圖到 Supabase Storage
   * Requirements: 6.4
   * 
   * @param canvas HTML Canvas 元素
   * @param roomId 房間 ID
   * @param roundNumber 輪次號
   * @returns 上傳後的圖片 URL
   */
  async function uploadCanvasSnapshot(
    canvas: HTMLCanvasElement,
    roomId: string,
    roundNumber: number
  ): Promise<Result<string>> {
    try {
      isUploading.value = true
      error.value = null

      // 將 canvas 轉換為 Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9)
      })

      if (!blob) {
        throw new Error('無法將畫布轉換為圖片')
      }

      // 生成唯一的文件名
      const timestamp = Date.now()
      const fileName = `storyboard/${roomId}/round_${roundNumber}_${timestamp}.png`

      // 上傳到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('canvas-snapshots')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // 獲取公開 URL
      const { data: urlData } = supabase.storage
        .from('canvas-snapshots')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      console.log('[useStoryboard] 畫布截圖上傳成功:', publicUrl)
      return { success: true, data: publicUrl }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上傳畫布截圖失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 上傳畫布截圖錯誤:', err)
      return { success: false, error: errorMsg }
    } finally {
      isUploading.value = false
    }
  }

  // ============================================
  // Story_Chain 更新邏輯
  // Requirements: 6.5
  // ============================================

  /**
   * 添加勝出句子到故事鏈
   * Requirements: 6.5
   * 
   * @param sentence 勝出的句子
   * @param authorId 作者 ID
   * @param authorName 作者名稱
   * @param roundNumber 輪次號
   */
  async function addWinningSentenceToChain(
    sentence: string,
    authorId: string,
    authorName: string,
    roundNumber: number
  ): Promise<Result<StoryChainItem>> {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    try {
      const result = await storyStore.addStoryChainItem({
        roomId: roomStore.currentRoom.id,
        roundNumber,
        itemType: 'text',
        content: sentence,
        authorId,
        authorName,
      })

      if (result.success) {
        console.log('[useStoryboard] 勝出句子已添加到故事鏈')
      }

      return result as Result<StoryChainItem>
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '添加勝出句子失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 添加勝出句子錯誤:', err)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 添加畫布截圖到故事鏈
   * Requirements: 6.5
   * 
   * @param imageUrl 圖片 URL
   * @param authorId 畫家 ID
   * @param authorName 畫家名稱
   * @param roundNumber 輪次號
   */
  async function addCanvasSnapshotToChain(
    imageUrl: string,
    authorId: string,
    authorName: string,
    roundNumber: number
  ): Promise<Result<StoryChainItem>> {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    try {
      const result = await storyStore.addStoryChainItem({
        roomId: roomStore.currentRoom.id,
        roundNumber,
        itemType: 'image',
        content: imageUrl,
        authorId,
        authorName,
      })

      if (result.success) {
        console.log('[useStoryboard] 畫布截圖已添加到故事鏈')
      }

      return result as Result<StoryChainItem>
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '添加畫布截圖失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 添加畫布截圖錯誤:', err)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 完成輪次結算：上傳截圖並更新故事鏈
   * Requirements: 6.4, 6.5
   * 
   * 此方法整合了截圖上傳和故事鏈更新的完整流程
   * 
   * @param canvas 畫布元素
   * @param winningSentence 勝出的句子
   * @param sentenceAuthorId 句子作者 ID
   * @param sentenceAuthorName 句子作者名稱
   * @param drawerId 畫家 ID
   * @param drawerName 畫家名稱
   * @param roundNumber 輪次號
   */
  async function finalizeRound(
    canvas: HTMLCanvasElement,
    winningSentence: string,
    sentenceAuthorId: string,
    sentenceAuthorName: string,
    drawerId: string,
    drawerName: string,
    roundNumber: number
  ): Promise<Result> {
    if (!roomStore.currentRoom) {
      return { success: false, error: '沒有當前房間' }
    }

    try {
      // 1. 上傳畫布截圖
      const uploadResult = await uploadCanvasSnapshot(
        canvas,
        roomStore.currentRoom.id,
        roundNumber
      )

      if (!uploadResult.success || !uploadResult.data) {
        // 如果上傳失敗，使用佔位圖
        console.warn('[useStoryboard] 截圖上傳失敗，使用佔位圖')
      }

      const imageUrl = uploadResult.data || '/placeholder-image.png'

      // 2. 添加畫布截圖到故事鏈
      const imageResult = await addCanvasSnapshotToChain(
        imageUrl,
        drawerId,
        drawerName,
        roundNumber
      )

      if (!imageResult.success) {
        console.error('[useStoryboard] 添加截圖到故事鏈失敗:', imageResult.error)
      }

      // 3. 添加勝出句子到故事鏈
      const sentenceResult = await addWinningSentenceToChain(
        winningSentence,
        sentenceAuthorId,
        sentenceAuthorName,
        roundNumber
      )

      if (!sentenceResult.success) {
        console.error('[useStoryboard] 添加勝出句子到故事鏈失敗:', sentenceResult.error)
      }

      console.log('[useStoryboard] 輪次結算完成')
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '輪次結算失敗'
      error.value = errorMsg
      console.error('[useStoryboard] 輪次結算錯誤:', err)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 獲取最新的故事句子（用於畫家繪畫題目）
   */
  function getLatestSentence(): string | null {
    return latestSentence.value?.content || null
  }

  /**
   * 載入房間的故事鏈
   */
  async function loadStoryChain(roomId: string): Promise<Result<StoryChainItem[]>> {
    return storyStore.loadStoryChain(roomId) as Promise<Result<StoryChainItem[]>>
  }

  /**
   * 載入當前輪次的提交
   */
  async function loadSubmissions(roundId: string): Promise<Result<Submission[]>> {
    return storyStore.loadSubmissions(roundId) as Promise<Result<Submission[]>>
  }

  /**
   * 清空輸入
   */
  function clearInput() {
    sentenceInput.value = ''
    error.value = null
  }

  /**
   * 清除錯誤
   */
  function clearError() {
    error.value = null
  }

  return {
    // 狀態
    sentenceInput,
    isSubmitting,
    isUploading,
    error,

    // 計算屬性
    storyChain,
    submissions,
    mySubmission,
    latestSentence,
    storyOpening,
    currentPhase,
    hasSubmitted,
    inputLength,
    isInputOverLimit,
    canSubmit,

    // 常量
    SENTENCE_MAX_LENGTH,

    // 句子提交方法
    validateSentence,
    submitSentence,
    updateSubmission,

    // 畫布截圖方法
    uploadCanvasSnapshot,

    // 故事鏈方法
    addWinningSentenceToChain,
    addCanvasSnapshotToChain,
    finalizeRound,
    getLatestSentence,
    loadStoryChain,
    loadSubmissions,

    // 工具方法
    clearInput,
    clearError,
  }
}
