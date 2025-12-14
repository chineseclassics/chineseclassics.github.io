/**
 * AI 智能詞語生成 Composable
 * 調用 Edge Function 生成適合「你畫我猜」遊戲的詞語
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

// 速率限制配置
const RATE_LIMIT_KEY = 'ai-word-generator-rate-limit'
const MAX_CALLS_PER_WINDOW = 10
const WINDOW_DURATION_MS = 5 * 60 * 1000 // 5 分鐘

// API 超時配置
const API_TIMEOUT_MS = 15000 // 15 秒

// 響應類型
interface GenerateWordsResponse {
  success: boolean
  words?: string[]
  isThemeAdjusted?: boolean
  adjustedTheme?: string
  error?: string
}

export interface AIWordGeneratorResult {
  words: string[]
  isThemeAdjusted: boolean
  adjustedTheme?: string
}

// 速率限制記錄
interface RateLimitRecord {
  calls: number[] // 調用時間戳數組
}

// 全域狀態
const isGenerating = ref(false)
const error = ref<string | null>(null)

/**
 * 從 localStorage 讀取速率限制記錄
 */
function loadRateLimitRecord(): RateLimitRecord {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // 忽略解析錯誤
  }
  return { calls: [] }
}

/**
 * 保存速率限制記錄到 localStorage
 */
function saveRateLimitRecord(record: RateLimitRecord): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(record))
  } catch {
    // 忽略存儲錯誤
  }
}

/**
 * 清理過期的調用記錄
 */
function cleanExpiredCalls(calls: number[]): number[] {
  const now = Date.now()
  const windowStart = now - WINDOW_DURATION_MS
  return calls.filter(timestamp => timestamp > windowStart)
}

/**
 * 檢查是否被速率限制
 */
function checkRateLimit(): { isLimited: boolean; remainingCalls: number } {
  const record = loadRateLimitRecord()
  const validCalls = cleanExpiredCalls(record.calls)
  
  // 更新記錄（清理過期的）
  if (validCalls.length !== record.calls.length) {
    saveRateLimitRecord({ calls: validCalls })
  }
  
  const remainingCalls = Math.max(0, MAX_CALLS_PER_WINDOW - validCalls.length)
  return {
    isLimited: validCalls.length >= MAX_CALLS_PER_WINDOW,
    remainingCalls
  }
}

/**
 * 記錄一次調用
 */
function recordCall(): void {
  const record = loadRateLimitRecord()
  const validCalls = cleanExpiredCalls(record.calls)
  validCalls.push(Date.now())
  saveRateLimitRecord({ calls: validCalls })
}

/**
 * 將詞語列表格式化為逗號分隔的字符串
 */
export function formatWordsForInput(words: string[]): string {
  return words
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .join('，')
}

export function useAIWordGenerator() {
  // 計算屬性：是否被速率限制
  const rateLimitStatus = computed(() => checkRateLimit())
  const isRateLimited = computed(() => rateLimitStatus.value.isLimited)
  const remainingCalls = computed(() => rateLimitStatus.value.remainingCalls)

  /**
   * 生成詞語
   * @param theme 房間主題
   * @returns 生成結果或 null（如果失敗）
   */
  async function generateWords(theme: string): Promise<AIWordGeneratorResult | null> {
    // 檢查主題
    if (!theme || theme.trim().length === 0) {
      error.value = '請先輸入房間主題'
      return null
    }

    // 檢查速率限制
    const { isLimited } = checkRateLimit()
    if (isLimited) {
      error.value = '請求次數已達上限，請 5 分鐘後再試'
      return null
    }

    isGenerating.value = true
    error.value = null

    try {
      // 記錄調用
      recordCall()

      // 創建超時 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), API_TIMEOUT_MS)
      })

      // 調用 Edge Function
      const fetchPromise = supabase.functions.invoke('generate-words', {
        body: { theme: theme.trim() }
      })

      // 競速：API 調用 vs 超時
      const { data, error: invokeError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as { data: GenerateWordsResponse | null; error: Error | null }

      if (invokeError) {
        throw invokeError
      }

      if (!data || !data.success) {
        error.value = data?.error || 'AI 服務暫時不可用，請稍後再試或手動輸入詞語'
        return null
      }

      return {
        words: data.words || [],
        isThemeAdjusted: data.isThemeAdjusted || false,
        adjustedTheme: data.adjustedTheme
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'TIMEOUT') {
          error.value = 'AI 服務響應超時，請稍後再試'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          error.value = '網絡連接失敗，請檢查網絡後重試'
        } else {
          error.value = 'AI 服務暫時不可用，請稍後再試或手動輸入詞語'
        }
      } else {
        error.value = 'AI 服務暫時不可用，請稍後再試或手動輸入詞語'
      }
      return null
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * 重置速率限制（僅用於測試）
   */
  function resetRateLimit(): void {
    localStorage.removeItem(RATE_LIMIT_KEY)
  }

  return {
    // 狀態
    isGenerating,
    isRateLimited,
    remainingCalls,
    error,
    
    // 方法
    generateWords,
    formatWordsForInput,
    resetRateLimit
  }
}
