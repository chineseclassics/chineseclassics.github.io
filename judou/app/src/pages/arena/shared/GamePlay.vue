<script setup lang="ts">
/**
 * 共享組件 - 對戰做題頁面
 * 
 * 顯示倒計時、文本內容、斷句操作
 * 完成後自動提交分數
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../../../stores/gameStore'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId as string)
const room = computed(() => gameStore.currentRoom)
const text = computed(() => room.value?.text)

// 倒計時
const remainingTime = ref(0)
let countdownInterval: any = null

// 句讀遊戲狀態
const content = computed(() => text.value?.content ?? '')
const userBreaks = ref<Set<number>>(new Set())
const correctBreaks = ref<Set<number>>(new Set())
const attemptCount = ref(0)
const startTime = ref<number>(0)
const isSubmitted = ref(false)

// 解析正確斷點
function parseCorrectBreaks(rawContent: string): { text: string; breaks: Set<number> } {
  const breaks = new Set<number>()
  let cleanText = ''
  let position = 0
  
  for (let i = 0; i < rawContent.length; i++) {
    const char = rawContent[i] ?? ''
    // 標點符號作為斷點
    if ('，。！？；：、'.includes(char)) {
      breaks.add(position)
    } else {
      cleanText += char
      position++
    }
  }
  
  return { text: cleanText, breaks }
}

// 初始化
function initGame() {
  if (!content.value) return
  
  const parsed = parseCorrectBreaks(content.value)
  correctBreaks.value = parsed.breaks
  userBreaks.value = new Set()
  attemptCount.value = 0
  startTime.value = Date.now()
  isSubmitted.value = false
}

// 點擊字符間隙
function toggleBreak(index: number) {
  if (isSubmitted.value) return
  
  attemptCount.value++
  
  if (userBreaks.value.has(index)) {
    userBreaks.value.delete(index)
  } else {
    userBreaks.value.add(index)
  }
  
  // 強制更新
  userBreaks.value = new Set(userBreaks.value)
  
  // 檢查是否完成
  checkCompletion()
}

// 檢查是否完成
function checkCompletion() {
  const correct = correctBreaks.value
  const user = userBreaks.value
  
  // 完全匹配
  if (correct.size === user.size && [...correct].every(b => user.has(b))) {
    submitScore()
  }
}

// 計算分數
function calculateScore(): { score: number; accuracy: number; firstAccuracy: number } {
  const correct = correctBreaks.value
  const user = userBreaks.value
  
  let correctCount = 0
  let wrongCount = 0
  
  // 計算正確和錯誤
  for (const b of user) {
    if (correct.has(b)) {
      correctCount++
    } else {
      wrongCount++
    }
  }
  
  // 漏掉的斷點
  const missedCount = correct.size - correctCount
  
  // 正確率
  const accuracy = correct.size > 0 ? (correctCount / correct.size) * 100 : 0
  
  // 首次正確率（考慮嘗試次數的懲罰）
  const penalty = Math.max(0, attemptCount.value - correct.size) * 2
  const firstAccuracy = Math.max(0, accuracy - penalty)
  
  // 分數計算：基礎分 + 時間獎勵
  const baseScore = Math.round(correctCount * 10 - wrongCount * 5 - missedCount * 5)
  const timeBonus = Math.max(0, Math.round(remainingTime.value / 10))
  const score = Math.max(0, baseScore + timeBonus)
  
  return { score, accuracy, firstAccuracy }
}

// 提交分數
async function submitScore() {
  if (isSubmitted.value) return
  isSubmitted.value = true
  
  const { score, accuracy, firstAccuracy } = calculateScore()
  const timeSpent = Math.round((Date.now() - startTime.value) / 1000)
  
  await gameStore.submitScore({
    roomId: roomId.value,
    score,
    accuracy,
    timeSpent,
    firstAccuracy,
    attemptCount: attemptCount.value,
  })
  
  // 跳轉到結果頁
  router.push({ name: 'arena-result', params: { roomId: roomId.value } })
}

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 開始倒計時
function startCountdown() {
  if (!room.value?.started_at || !room.value?.time_limit) return
  
  const updateTime = () => {
    const startedAt = new Date(room.value!.started_at!).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    remainingTime.value = Math.max(0, room.value!.time_limit - elapsed)
    
    if (remainingTime.value === 0 && !isSubmitted.value) {
      // 時間到，自動提交
      submitScore()
    }
  }
  
  updateTime()
  countdownInterval = setInterval(updateTime, 1000)
}

// 獲取乾淨文本
const cleanText = computed(() => {
  return content.value.replace(/[，。！？；：、]/g, '')
})

// 監聯房間狀態
watch(() => room.value?.status, (status) => {
  if (status === 'finished') {
    router.push({ name: 'arena-result', params: { roomId: roomId.value } })
  }
})

onMounted(() => {
  gameStore.subscribeToRoom(roomId.value)
  initGame()
  startCountdown()
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<template>
  <div class="game-play">
    <!-- 頂部狀態欄 -->
    <header class="play-header">
      <div class="header-left">
        <span class="text-title">{{ text?.title }}</span>
      </div>
      
      <div class="countdown" :class="{ warning: remainingTime < 30 }">
        <span class="countdown-time">{{ formatTime(remainingTime) }}</span>
      </div>
      
      <div class="header-right">
        <span class="attempt-count">嘗試 {{ attemptCount }} 次</span>
      </div>
    </header>

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
        <span>已標記 {{ userBreaks.size }} 處斷點</span>
        <span class="divider">·</span>
        <span>需要 {{ correctBreaks.size }} 處</span>
      </div>
    </main>

    <!-- 提交按鈕 -->
    <footer class="play-footer">
      <button 
        class="btn-primary btn-large"
        :disabled="isSubmitted || userBreaks.size === 0"
        @click="submitScore"
      >
        {{ isSubmitted ? '已提交' : '提交答案' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.game-play {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
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

.text-title {
  font-weight: 600;
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

.attempt-count {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
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
  padding: 1.5rem 2rem;
  background: white;
  text-align: center;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
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

