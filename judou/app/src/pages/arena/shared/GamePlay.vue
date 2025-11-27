<script setup lang="ts">
/**
 * 共享組件 - 對戰做題頁面（多篇文章版）
 * 
 * 支持多篇文章連續作答：
 * - 做完一篇自動進入下一篇
 * - 計分 = 累計正確斷句位置總數
 * - 時間到自動提交
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'

interface TextItem {
  id: string
  title: string
  author: string | null
  content: string
}

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)
const room = computed(() => gameStore.currentRoom)

// =====================================================
// 多篇文章管理
// =====================================================
const texts = ref<TextItem[]>([])
const currentTextIndex = ref(0)
const currentText = computed(() => texts.value[currentTextIndex.value])

// 倒計時
const remainingTime = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// 句讀遊戲狀態（當前文章）
const userBreaks = ref<Set<number>>(new Set())
const correctBreaks = ref<Set<number>>(new Set())
const attemptCount = ref(0)

// 全局累計
const totalCorrectBreaks = ref(0)  // 累計正確斷句數
const completedTextsCount = ref(0)  // 已完成文章數
const totalAttempts = ref(0)  // 總嘗試次數

const isSubmitted = ref(false)
const isLoading = ref(true)

// =====================================================
// 解析與計算
// =====================================================

// 解析正確斷點（標點符號位置）
function parseCorrectBreaks(rawContent: string): { text: string; breaks: Set<number> } {
  const breaks = new Set<number>()
  let cleanText = ''
  let position = 0
  
  for (let i = 0; i < rawContent.length; i++) {
    const char = rawContent[i] ?? ''
    // 標點符號作為斷點
    if ('，。！？；：、'.includes(char)) {
      if (position > 0) {  // 確保斷點在字符之後
        breaks.add(position - 1)
      }
    } else {
      cleanText += char
      position++
    }
  }
  
  return { text: cleanText, breaks }
}

// 獲取當前乾淨文本
const cleanText = computed(() => {
  if (!currentText.value?.content) return ''
  return currentText.value.content.replace(/[，。！？；：、]/g, '')
})

// =====================================================
// 遊戲邏輯
// =====================================================

// 初始化當前文章
function initCurrentText() {
  if (!currentText.value?.content) return
  
  const parsed = parseCorrectBreaks(currentText.value.content)
  correctBreaks.value = parsed.breaks
  userBreaks.value = new Set()
  attemptCount.value = 0
}

// 點擊字符間隙
function toggleBreak(index: number) {
  if (isSubmitted.value) return
  
  attemptCount.value++
  totalAttempts.value++
  
  if (userBreaks.value.has(index)) {
    userBreaks.value.delete(index)
  } else {
    userBreaks.value.add(index)
  }
  
  // 強制更新
  userBreaks.value = new Set(userBreaks.value)
  
  // 檢查是否完成當前文章
  checkCurrentTextCompletion()
}

// 檢查當前文章是否完成
function checkCurrentTextCompletion() {
  const correct = correctBreaks.value
  const user = userBreaks.value
  
  // 完全匹配
  if (correct.size === user.size && [...correct].every(b => user.has(b))) {
    completeCurrentText()
  }
}

// 完成當前文章
async function completeCurrentText() {
  // 計算這篇的正確數
  const correct = correctBreaks.value
  const user = userBreaks.value
  
  let correctCount = 0
  let wrongCount = 0
  
  for (const b of user) {
    if (correct.has(b)) {
      correctCount++
    } else {
      wrongCount++
    }
  }
  
  // 累加到總分
  totalCorrectBreaks.value += correctCount
  completedTextsCount.value++
  
  // 提交這篇的進度
  if (currentText.value) {
    await gameStore.submitTextProgress({
      roomId: roomId.value,
      textId: currentText.value.id,
      textIndex: currentTextIndex.value,
      correctCount,
      wrongCount,
      timeSpent: Math.round((Date.now() - startTime) / 1000),
    })
  }
  
  // 如果還有下一篇，繼續
  if (currentTextIndex.value < texts.value.length - 1) {
    currentTextIndex.value++
    initCurrentText()
  } else {
    // 所有文章都完成了
    submitFinalScore()
  }
}

// 手動提交當前進度（點擊提交按鈕或時間到）
async function submitCurrentProgress() {
  if (isSubmitted.value) return
  
  // 計算當前文章的正確數
  const correct = correctBreaks.value
  const user = userBreaks.value
  
  let correctCount = 0
  let wrongCount = 0
  
  for (const b of user) {
    if (correct.has(b)) {
      correctCount++
    } else {
      wrongCount++
    }
  }
  
  // 加到總分（只算正確的）
  totalCorrectBreaks.value += correctCount
  
  // 提交最終成績
  submitFinalScore()
}

// 提交最終成績
let startTime = 0

async function submitFinalScore() {
  if (isSubmitted.value) return
  isSubmitted.value = true
  
  const timeSpent = Math.round((Date.now() - startTime) / 1000)
  
  // 計算正確率（基於總正確數 / 總斷點數）
  const totalBreaks = texts.value.reduce((sum, t) => {
    const parsed = parseCorrectBreaks(t.content)
    return sum + parsed.breaks.size
  }, 0)
  
  const accuracy = totalBreaks > 0 ? (totalCorrectBreaks.value / totalBreaks) * 100 : 0
  
  await gameStore.submitScore({
    roomId: roomId.value,
    score: totalCorrectBreaks.value,  // 分數 = 正確斷句總數
    accuracy,
    timeSpent,
    firstAccuracy: accuracy,  // 簡化處理
    attemptCount: totalAttempts.value,
  })
  
  // 跳轉到結果頁
  router.push({ name: 'arena-result', params: { roomId: roomId.value } })
}

// =====================================================
// 倒計時
// =====================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function startCountdown() {
  if (!room.value?.started_at || !room.value?.time_limit) return
  
  const updateTime = () => {
    const startedAt = new Date(room.value!.started_at!).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    remainingTime.value = Math.max(0, room.value!.time_limit - elapsed)
    
    if (remainingTime.value === 0 && !isSubmitted.value) {
      // 時間到，自動提交當前進度
      submitCurrentProgress()
    }
  }
  
  updateTime()
  countdownInterval = setInterval(updateTime, 1000)
}

// =====================================================
// 生命週期
// =====================================================

// 監聯房間狀態
watch(() => room.value?.status, (status) => {
  if (status === 'finished') {
    router.push({ name: 'arena-result', params: { roomId: roomId.value } })
  }
})

onMounted(async () => {
  gameStore.subscribeToRoom(roomId.value)
  
  // 加載所有文章
  if (room.value?.text_ids && room.value.text_ids.length > 0) {
    texts.value = await gameStore.fetchTexts(room.value.text_ids)
  } else if (room.value?.text_id) {
    // 向後兼容：單篇文章
    texts.value = await gameStore.fetchTexts([room.value.text_id])
  }
  
  isLoading.value = false
  
  if (texts.value.length > 0) {
    initCurrentText()
    startTime = Date.now()
    startCountdown()
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<template>
  <div class="game-play">
    <!-- 加載中 -->
    <div v-if="isLoading" class="loading-container">
      <span class="loading-spinner">⏳</span>
      <span>載入題目中...</span>
    </div>

    <template v-else>
      <!-- 頂部狀態欄 -->
      <header class="play-header">
        <div class="header-left">
          <span class="text-title">{{ currentText?.title }}</span>
          <span v-if="texts.length > 1" class="text-progress">
            （{{ currentTextIndex + 1 }} / {{ texts.length }}）
          </span>
        </div>
        
        <div class="countdown" :class="{ warning: remainingTime < 30 }">
          <span class="countdown-time">{{ formatTime(remainingTime) }}</span>
        </div>
        
        <div class="header-right">
          <span class="score-display">
            <span class="score-icon">🫘</span>
            <span class="score-value">{{ totalCorrectBreaks }}</span>
          </span>
        </div>
      </header>

      <!-- 多篇進度條（僅當多篇時顯示） -->
      <div v-if="texts.length > 1" class="multi-text-progress">
        <div 
          v-for="(t, index) in texts" 
          :key="t.id"
          class="progress-dot"
          :class="{ 
            completed: index < currentTextIndex,
            current: index === currentTextIndex,
            pending: index > currentTextIndex
          }"
        >
          <span v-if="index < currentTextIndex" class="dot-icon">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
      </div>

      <!-- 做題區域 -->
      <main class="play-main">
        <div class="text-container">
          <div class="text-content">
            <template v-for="(char, index) in cleanText" :key="index">
              <span 
                class="char-wrapper"
                @click="toggleBreak(index)"
              >
                <span class="char">{{ char }}</span>
                <span 
                  v-if="index < cleanText.length - 1"
                  class="gap"
                  :class="{ 
                    marked: userBreaks.has(index),
                    correct: isSubmitted && correctBreaks.has(index) && userBreaks.has(index),
                    wrong: isSubmitted && !correctBreaks.has(index) && userBreaks.has(index),
                    missed: isSubmitted && correctBreaks.has(index) && !userBreaks.has(index),
                  }"
                >
                  <span v-if="userBreaks.has(index)" class="break-mark">|</span>
                </span>
              </span>
            </template>
          </div>
        </div>

        <!-- 進度提示 -->
        <div class="progress-hint">
          <span>已標記 {{ userBreaks.size }} / {{ correctBreaks.size }} 處</span>
          <span v-if="completedTextsCount > 0" class="divider">·</span>
          <span v-if="completedTextsCount > 0">已完成 {{ completedTextsCount }} 篇</span>
        </div>
      </main>

      <!-- 底部操作欄 -->
      <footer class="play-footer">
        <button 
          class="btn-primary btn-large"
          :disabled="isSubmitted || userBreaks.size === 0"
          @click="submitCurrentProgress"
        >
          {{ isSubmitted ? '已提交' : '提交當前進度' }}
        </button>
        <p class="footer-hint">
          做完自動進入下一篇，或點擊按鈕提交當前進度
        </p>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.game-play {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
}

/* 加載狀態 */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.1rem;
  color: var(--color-neutral-600);
}

.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 頂部狀態欄 */
.play-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.text-title {
  font-weight: 600;
}

.text-progress {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.countdown {
  padding: 0.5rem 1.5rem;
  background: var(--color-primary-100);
  border-radius: 20px;
}

.countdown.warning {
  background: #fee2e2;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.countdown-time {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.countdown.warning .countdown-time {
  color: #dc2626;
}

.header-right {
  display: flex;
  align-items: center;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 1rem;
  background: var(--color-primary-50);
  border-radius: 20px;
  font-weight: 600;
}

.score-icon {
  font-size: 1.25rem;
}

.score-value {
  font-size: 1.25rem;
  color: var(--color-primary-600);
}

/* 多篇進度條 */
.multi-text-progress {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-bottom: 1px solid var(--color-neutral-100);
}

.progress-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.progress-dot.completed {
  background: #22c55e;
  color: white;
}

.progress-dot.current {
  background: var(--color-primary-500);
  color: white;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px var(--color-primary-100);
}

.progress-dot.pending {
  background: var(--color-neutral-200);
  color: var(--color-neutral-500);
}

.dot-icon {
  font-size: 0.875rem;
}

/* 做題區域 */
.play-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.text-container {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.text-content {
  font-size: 1.75rem;
  line-height: 2.5;
  text-align: justify;
  font-family: 'Noto Serif SC', serif;
  user-select: none;
}

.char-wrapper {
  display: inline;
  cursor: pointer;
  position: relative;
}

.char {
  transition: color 0.2s;
}

.char-wrapper:hover .char {
  color: var(--color-primary-600);
}

.gap {
  display: inline-block;
  width: 4px;
  position: relative;
}

.gap.marked {
  width: 8px;
}

.break-mark {
  color: var(--color-primary-500);
  font-weight: 700;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.gap.correct .break-mark {
  color: #22c55e;
}

.gap.wrong .break-mark {
  color: #ef4444;
  text-decoration: line-through;
}

.gap.missed::after {
  content: '|';
  color: #f59e0b;
  font-weight: 700;
}

/* 進度提示 */
.progress-hint {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.divider {
  margin: 0 0.5rem;
}

/* 底部 */
.play-footer {
  padding: 1.25rem 2rem;
  background: white;
  text-align: center;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}

.footer-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-neutral-400);
}

.btn-primary {
  padding: 1rem 3rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500-rgb), 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.btn-large {
  padding: 1rem 4rem;
  font-size: 1.2rem;
}
</style>
