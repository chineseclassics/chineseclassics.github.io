<script setup lang="ts">
/**
 * 共享組件 - 對戰做題頁面（多篇文章版）
 * 
 * 使用和練習頁面一致的斷句界面：
 * - 句豆種植方式
 * - 顯示剩餘豆子數量
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
const characters = ref<string[]>([])
const userBreaks = ref<Set<number>>(new Set())
const correctBreaks = ref<Set<number>>(new Set())

// 豆子相關計算
const totalBeans = computed(() => correctBreaks.value.size)
const usedBeans = computed(() => userBreaks.value.size)
const remainingBeans = computed(() => Math.max(0, totalBeans.value - usedBeans.value))
const hasBeansLeft = computed(() => remainingBeans.value > 0)
const beanShake = ref(false)

// 全局累計
const totalCorrectBreaks = ref(0)  // 累計正確斷句數
const completedTextsCount = ref(0)  // 已完成文章數

const isSubmitted = ref(false)
const isLoading = ref(true)
let startTime = 0

// =====================================================
// 解析與計算（使用 | 作為斷點標記，和練習頁面一致）
// =====================================================

function parseContent(raw: string): { chars: string[]; breaks: Set<number> } {
  const chars: string[] = []
  const breaks = new Set<number>()
  let pointer = 0
  
  for (const char of raw) {
    if (char === '|') {
      // 斷句標記在「前一個字的後面」
      if (pointer > 0) {
        breaks.add(pointer - 1)
      }
    } else if (char !== '\n' && char !== '\r') {
      chars.push(char)
      pointer++
    }
  }
  
  return { chars, breaks }
}

// =====================================================
// 遊戲邏輯
// =====================================================

// 初始化當前文章
function initCurrentText() {
  if (!currentText.value?.content) return
  
  const parsed = parseContent(currentText.value.content)
  characters.value = parsed.chars
  correctBreaks.value = parsed.breaks
  userBreaks.value = new Set()
}

// 音效
let audioCtx: AudioContext | null = null

function playSound(type: 'add' | 'remove' | 'error') {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    const ctx = audioCtx
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'

    if (type === 'add') {
      oscillator.frequency.setValueAtTime(400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } else if (type === 'remove') {
      oscillator.frequency.setValueAtTime(300, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08)
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.08)
    } else {
      // error: 沒有豆子了
      oscillator.frequency.setValueAtTime(200, ctx.currentTime)
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    }
  } catch {
    // 忽略音效錯誤
  }
}

// 震動反饋
function vibrate(duration: number = 10) {
  if (navigator.vibrate) {
    navigator.vibrate(duration)
  }
}

// 點擊字符間隙
function toggleBreak(index: number) {
  if (isSubmitted.value) return
  
  const newSet = new Set(userBreaks.value)
  const isRemoving = newSet.has(index)
  
  // 如果是添加新斷句，檢查是否還有豆子
  if (!isRemoving && !hasBeansLeft.value) {
    playSound('error')
    beanShake.value = true
    setTimeout(() => { beanShake.value = false }, 300)
    vibrate(50)
    return
  }
  
  if (isRemoving) {
    newSet.delete(index)
    playSound('remove')
    vibrate(5)
  } else {
    newSet.add(index)
    playSound('add')
    vibrate(10)
  }
  
  userBreaks.value = newSet
  
  // 檢查是否完成當前文章
  checkCurrentTextCompletion()
}

// 獲取豆子槽的樣式類
function getBeanClass(index: number) {
  const hasBreak = userBreaks.value.has(index)
  return {
    'has-bean': hasBreak,
  }
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
  
  for (const b of user) {
    if (correct.has(b)) {
      correctCount++
    }
  }
  
  // 加到總分（只算正確的）
  totalCorrectBreaks.value += correctCount
  
  // 提交最終成績
  submitFinalScore()
}

// 提交最終成績
async function submitFinalScore() {
  if (isSubmitted.value) return
  isSubmitted.value = true
  
  const timeSpent = Math.round((Date.now() - startTime) / 1000)
  
  // 計算正確率（基於總正確數 / 總斷點數）
  const totalBreaks = texts.value.reduce((sum, t) => {
    const parsed = parseContent(t.content)
    return sum + parsed.breaks.size
  }, 0)
  
  const accuracy = totalBreaks > 0 ? (totalCorrectBreaks.value / totalBreaks) * 100 : 0
  
  await gameStore.submitScore({
    roomId: roomId.value,
    score: totalCorrectBreaks.value,  // 分數 = 正確斷句總數
    accuracy,
    timeSpent,
    firstAccuracy: accuracy,
    attemptCount: 1,
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
      submitCurrentProgress()
    }
  }
  
  updateTime()
  countdownInterval = setInterval(updateTime, 1000)
}

// =====================================================
// 生命週期
// =====================================================

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
          <span v-if="currentText?.author" class="text-author">{{ currentText.author }}</span>
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

      <!-- 多篇進度條 -->
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
        <!-- 豆子庫存顯示 -->
        <div class="bean-header">
          <span class="bean-hint">點擊字間空隙種下句豆</span>
          <div class="bean-inventory" :class="{ shake: beanShake, empty: !hasBeansLeft }">
            <span
              v-for="i in totalBeans"
              :key="i"
              class="inventory-bean"
              :class="{ used: i > remainingBeans }"
            ></span>
          </div>
        </div>

        <!-- 斷句區域 -->
        <div class="text-container">
          <div class="practice-line" v-if="characters.length">
            <span
              v-for="(char, index) in characters"
              :key="index"
              class="char-unit"
            >
              <span class="char">{{ char }}</span>
              <!-- 最後一個字後面不需要斷句熱區 -->
              <button
                v-if="index < characters.length - 1"
                class="bean-slot"
                :class="getBeanClass(index)"
                @click="toggleBreak(index)"
                :aria-label="`在「${char}」後${userBreaks.has(index) ? '移除' : '添加'}斷句`"
              >
                <span class="bean" v-if="userBreaks.has(index)"></span>
                <span class="bean-hint-dot"></span>
              </button>
            </span>
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
  font-size: 1.1rem;
}

.text-author {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
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
  padding: 1.5rem 2rem;
}

/* 豆子庫存顯示 */
.bean-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 800px;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.bean-hint {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.bean-inventory {
  display: flex;
  gap: 4px;
  padding: 0.375rem 0.75rem;
  background: var(--color-neutral-100);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.bean-inventory.shake {
  animation: shake 0.3s ease-in-out;
}

.bean-inventory.empty {
  background: #fee2e2;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.inventory-bean {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.inventory-bean.used {
  background: var(--color-neutral-300);
  box-shadow: none;
  opacity: 0.5;
}

/* 斷句區域 */
.text-container {
  background: white;
  border-radius: 20px;
  padding: 2rem 2.5rem;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.practice-line {
  font-size: 1.75rem;
  line-height: 2.8;
  text-align: justify;
  user-select: none;
}

.char-unit {
  display: inline;
  white-space: nowrap;
}

.char {
  display: inline;
  transition: color 0.2s;
}

/* 豆子槽 */
.bean-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 1.75rem;
  vertical-align: middle;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  position: relative;
}

.bean-slot:hover {
  background: rgba(34, 197, 94, 0.1);
  border-radius: 4px;
}

.bean-slot .bean-hint-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-neutral-200);
  opacity: 0;
  transition: opacity 0.2s;
}

.bean-slot:hover .bean-hint-dot {
  opacity: 1;
}

.bean-slot.has-bean .bean-hint-dot {
  display: none;
}

/* 種下的豆子 */
.bean {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 
    inset 0 -3px 6px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.15);
  animation: popIn 0.2s ease-out;
}

@keyframes popIn {
  0% { 
    transform: scale(0);
    opacity: 0;
  }
  50% { 
    transform: scale(1.2);
  }
  100% { 
    transform: scale(1);
    opacity: 1;
  }
}

/* 進度提示 */
.progress-hint {
  margin-top: 1rem;
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

/* 響應式 */
@media (max-width: 640px) {
  .play-header {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }
  
  .header-left {
    flex: 1;
    min-width: 100%;
    justify-content: center;
  }
  
  .countdown {
    order: -1;
  }
  
  .text-container {
    padding: 1.5rem;
  }
  
  .practice-line {
    font-size: 1.5rem;
    line-height: 2.5;
  }
  
  .bean-slot {
    width: 16px;
  }
  
  .bean {
    width: 14px;
    height: 14px;
  }
}
</style>
