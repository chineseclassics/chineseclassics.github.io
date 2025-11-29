<script setup lang="ts">
/**
 * 共享組件 - 對戰做題頁面（多篇文章版）
 * 
 * 核心邏輯：
 * - 多篇文章自由切換（不自動跳轉）
 * - 手動提交或時間到提交整局成績
 * - 提交前可隨時修改任何一篇
 * - UI 與練習界面保持一致
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

// 每篇文章的答題狀態
interface TextState {
  characters: string[]
  correctBreaks: Set<number>
  userBreaks: Set<number>
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
const textStates = ref<Map<string, TextState>>(new Map())  // 每篇文章的狀態
const currentTextIndex = ref(0)
const currentText = computed(() => texts.value[currentTextIndex.value])

// 當前文章的狀態（從 Map 中獲取）
const currentState = computed(() => {
  if (!currentText.value) return null
  return textStates.value.get(currentText.value.id) || null
})

// 當前文章的字符和斷點
const characters = computed(() => currentState.value?.characters || [])
const correctBreaks = computed(() => currentState.value?.correctBreaks || new Set<number>())
const userBreaks = computed({
  get: () => currentState.value?.userBreaks || new Set<number>(),
  set: (val) => {
    if (currentText.value && textStates.value.has(currentText.value.id)) {
      const state = textStates.value.get(currentText.value.id)!
      state.userBreaks = val
    }
  }
})

// 倒計時
const remainingTime = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// 豆子相關計算
const totalBeans = computed(() => correctBreaks.value.size)
const usedBeans = computed(() => userBreaks.value.size)
const remainingBeans = computed(() => Math.max(0, totalBeans.value - usedBeans.value))
const hasBeansLeft = computed(() => remainingBeans.value > 0)
const beanShake = ref(false)

// 提交狀態
const isSubmitted = ref(false)
const isLoading = ref(true)
let startTime = 0

// 提交後的狀態檢查（備用機制）
let statusCheckInterval: ReturnType<typeof setInterval> | null = null
let statusCheckTimeout: ReturnType<typeof setTimeout> | null = null
const STATUS_CHECK_INTERVAL = 3000  // 每 3 秒檢查一次
const STATUS_CHECK_TIMEOUT = 60000  // 最多等待 60 秒後強制跳轉

// =====================================================
// 解析內容（使用 | 作為斷點標記，和練習頁面一致）
// =====================================================

function parseContent(raw: string): { chars: string[]; breaks: Set<number> } {
  const chars: string[] = []
  const breaks = new Set<number>()
  let pointer = 0
  
  // 先去除末尾的 | 和空白字符，因為文章最後的斷句點沒有意義
  const trimmed = raw.replace(/[\|\s]+$/, '')
  
  for (const char of trimmed) {
    if (char === '|') {
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
// 初始化
// =====================================================

function initAllTexts() {
  textStates.value.clear()
  
  for (const text of texts.value) {
    const parsed = parseContent(text.content)
    textStates.value.set(text.id, {
      characters: parsed.chars,
      correctBreaks: parsed.breaks,
      userBreaks: new Set(),
    })
  }
}

// =====================================================
// 切換文章
// =====================================================

function switchToText(index: number) {
  if (index >= 0 && index < texts.value.length) {
    currentTextIndex.value = index
  }
}

function prevText() {
  if (currentTextIndex.value > 0) {
    currentTextIndex.value--
  }
}

function nextText() {
  if (currentTextIndex.value < texts.value.length - 1) {
    currentTextIndex.value++
  }
}

// =====================================================
// 音效
// =====================================================

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

// =====================================================
// 斷句操作
// =====================================================

function toggleBreak(index: number) {
  if (isSubmitted.value) return
  if (!currentText.value) return
  
  const state = textStates.value.get(currentText.value.id)
  if (!state) return
  
  const newSet = new Set(state.userBreaks)
  const isRemoving = newSet.has(index)
  
  // 如果是添加新斷句，檢查是否還有豆子
  if (!isRemoving && newSet.size >= state.correctBreaks.size) {
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
  
  state.userBreaks = newSet
  // 觸發響應式更新
  textStates.value = new Map(textStates.value)
}

// 獲取豆子槽的樣式類
function getBeanClass(index: number) {
  const hasBreak = userBreaks.value.has(index)
  return {
    'has-bean': hasBreak,
  }
}

// 計算每篇文章的完成狀態
function getTextStatus(textId: string): 'empty' | 'partial' | 'complete' {
  const state = textStates.value.get(textId)
  if (!state) return 'empty'
  
  const userSize = state.userBreaks.size
  const correctSize = state.correctBreaks.size
  
  if (userSize === 0) return 'empty'
  if (userSize === correctSize && [...state.correctBreaks].every(b => state.userBreaks.has(b))) {
    return 'complete'
  }
  return 'partial'
}

// =====================================================
// 提交整局成績
// =====================================================

async function submitGame() {
  if (isSubmitted.value) return
  isSubmitted.value = true
  
  const timeSpent = Math.round((Date.now() - startTime) / 1000)
  
  // 計算總分和詳細結果
  let totalCorrect = 0
  let totalBreaks = 0
  const resultsData: Array<{
    textId: string
    userBreaks: number[]
    correctBreaks: number[]
    correctCount: number
    wrongCount: number
    missedCount: number
  }> = []
  
  for (const text of texts.value) {
    const state = textStates.value.get(text.id)
    if (!state) continue
    
    const correct = state.correctBreaks
    const user = state.userBreaks
    
    let correctCount = 0
    let wrongCount = 0
    
    for (const b of user) {
      if (correct.has(b)) {
        correctCount++
      } else {
        wrongCount++
      }
    }
    
    const missedCount = correct.size - correctCount
    
    totalCorrect += correctCount
    totalBreaks += correct.size
    
    resultsData.push({
      textId: text.id,
      userBreaks: [...user],
      correctBreaks: [...correct],
      correctCount,
      wrongCount,
      missedCount,
    })
  }
  
  const accuracy = totalBreaks > 0 ? (totalCorrect / totalBreaks) * 100 : 0
  
  // 保存詳細結果到 sessionStorage，供結果頁使用
  sessionStorage.setItem(`game-result-${roomId.value}`, JSON.stringify({
    texts: texts.value,
    results: resultsData,
    totalCorrect,
    totalBreaks,
    accuracy,
    timeSpent,
  }))
  
  // 提交成績（gameStore 會檢查是否所有人都完成）
  await gameStore.submitScore({
    roomId: roomId.value,
    score: totalCorrect,
    accuracy,
    timeSpent,
    firstAccuracy: accuracy,
    attemptCount: 1,
  })
  
  // 啟動備用狀態檢查（防止 Realtime 失敗時無法跳轉）
  startStatusCheck()
}

// =====================================================
// 備用狀態檢查機制
// =====================================================

/**
 * 啟動狀態檢查（提交後調用）
 * 每隔 3 秒主動檢查房間狀態，防止 Realtime 失敗時卡住
 */
function startStatusCheck() {
  console.log('[GamePlay] 啟動備用狀態檢查機制')
  
  // 清理之前的檢查（如果有）
  stopStatusCheck()
  
  // 定期檢查房間狀態
  statusCheckInterval = setInterval(async () => {
    await checkRoomStatusAndNavigate()
  }, STATUS_CHECK_INTERVAL)
  
  // 設置超時：超過 60 秒後強制跳轉
  statusCheckTimeout = setTimeout(() => {
    console.log('[GamePlay] 狀態檢查超時，強制跳轉到結果頁')
    stopStatusCheck()
    router.push({ name: 'arena-result', params: { roomId: roomId.value } })
  }, STATUS_CHECK_TIMEOUT)
  
  // 立即執行一次檢查
  checkRoomStatusAndNavigate()
}

/**
 * 停止狀態檢查
 */
function stopStatusCheck() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
    statusCheckInterval = null
  }
  if (statusCheckTimeout) {
    clearTimeout(statusCheckTimeout)
    statusCheckTimeout = null
  }
}

/**
 * 檢查房間狀態並在需要時跳轉
 */
async function checkRoomStatusAndNavigate() {
  if (!gameStore.currentRoom) return
  
  // 如果本地狀態已經是 finished，立即跳轉
  if (gameStore.currentRoom.status === 'finished') {
    console.log('[GamePlay] 本地狀態為 finished，跳轉到結果頁')
    stopStatusCheck()
    router.push({ name: 'arena-result', params: { roomId: roomId.value } })
    return
  }
  
  // 主動從數據庫查詢最新狀態
  try {
    const { supabase } = await import('../../../lib/supabaseClient')
    if (!supabase) return
    
    const { data: latestRoom } = await supabase
      .from('game_rooms')
      .select('status')
      .eq('id', roomId.value)
      .single()
    
    if (latestRoom?.status === 'finished') {
      console.log('[GamePlay] 數據庫狀態為 finished，跳轉到結果頁')
      stopStatusCheck()
      router.push({ name: 'arena-result', params: { roomId: roomId.value } })
    } else {
      console.log('[GamePlay] 狀態檢查: 當前狀態為', latestRoom?.status)
    }
  } catch (e) {
    console.error('[GamePlay] 狀態檢查錯誤:', e)
  }
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
      submitGame()
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
    console.log('[GamePlay] watch 檢測到 finished 狀態，跳轉到結果頁')
    stopStatusCheck()  // 停止備用檢查
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
    initAllTexts()
    startTime = Date.now()
    startCountdown()
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  // 停止狀態檢查
  stopStatusCheck()
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
          <div class="countdown" :class="{ warning: remainingTime < 30 }">
            <span class="countdown-label">剩餘時間</span>
            <span class="countdown-time">{{ formatTime(remainingTime) }}</span>
          </div>
        </div>
        
        <div class="header-center">
          <span class="text-title">{{ currentText?.title }}</span>
          <span v-if="currentText?.author" class="text-author">{{ currentText.author }}</span>
        </div>
        
        <div class="header-right">
          <button 
            class="submit-btn"
            :class="{ waiting: isSubmitted }"
            :disabled="isSubmitted"
            @click="submitGame"
          >
            <template v-if="isSubmitted">
              <span class="waiting-spinner">⏳</span> 等待其他玩家...
            </template>
            <template v-else>
              提交答案
            </template>
          </button>
        </div>
      </header>

      <!-- 多篇切換標籤（僅當多篇時顯示） -->
      <div v-if="texts.length > 1" class="text-tabs">
        <button 
          v-for="(t, index) in texts" 
          :key="t.id"
          class="text-tab"
          :class="{ 
            active: index === currentTextIndex,
            empty: getTextStatus(t.id) === 'empty',
            partial: getTextStatus(t.id) === 'partial',
            complete: getTextStatus(t.id) === 'complete',
          }"
          @click="switchToText(index)"
        >
          <span class="tab-number">{{ index + 1 }}</span>
          <span class="tab-title">{{ t.title }}</span>
          <span v-if="getTextStatus(t.id) === 'complete'" class="tab-check">✓</span>
        </button>
      </div>

      <!-- 做題區域 -->
      <main class="play-main">
        <!-- 豆子提示欄 -->
        <div class="board-header">
          <p class="board-hint">點擊字間空隙種下句豆來斷句</p>
          <div class="board-header-right">
            <div class="bean-inventory" :class="{ shake: beanShake, empty: !hasBeansLeft }">
              <span
                v-for="i in totalBeans"
                :key="i"
                class="inventory-bean"
                :class="{ used: i > remainingBeans }"
              ></span>
            </div>
          </div>
        </div>

        <!-- 斷句區域 -->
        <div class="practice-board">
          <div class="practice-line" v-if="characters.length">
            <span
              v-for="(char, index) in characters"
              :key="index"
              class="char-unit"
            >
              <span class="char">{{ char }}</span>
              <button
                v-if="index < characters.length - 1"
                class="bean-slot"
                :class="getBeanClass(index)"
                @click="toggleBreak(index)"
                :aria-label="`在「${char}」後${userBreaks.has(index) ? '移除' : '添加'}斷句`"
              >
                <span class="bean" v-if="userBreaks.has(index)"></span>
                <span class="bean-hint"></span>
              </button>
            </span>
          </div>
        </div>

        <!-- 進度提示 -->
        <div class="progress-hint">
          <span>已標記 {{ userBreaks.size }} / {{ correctBreaks.size }} 處</span>
        </div>

        <!-- 多篇導航按鈕 -->
        <div v-if="texts.length > 1" class="text-nav">
          <button 
            class="nav-btn" 
            :disabled="currentTextIndex === 0"
            @click="prevText"
          >
            ← 上一篇
          </button>
          <span class="nav-info">{{ currentTextIndex + 1 }} / {{ texts.length }}</span>
          <button 
            class="nav-btn" 
            :disabled="currentTextIndex === texts.length - 1"
            @click="nextText"
          >
            下一篇 →
          </button>
        </div>
      </main>

      <!-- 底部提示 -->
      <footer class="play-footer">
        <p v-if="isSubmitted" class="footer-hint submitted">
          ✅ 已提交答案，等待其他玩家完成或時間結束...
        </p>
        <p v-else class="footer-hint">
          完成所有文章後點擊「提交答案」，或等待時間結束自動提交
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
  padding: 0.75rem 1.5rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left, .header-right {
  flex: 0 0 auto;
}

.header-center {
  flex: 1;
  text-align: center;
}

.text-title {
  font-weight: 600;
  font-size: 1.1rem;
}

.text-author {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 倒計時 */
.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--color-primary-50);
  border-radius: 12px;
}

.countdown.warning {
  background: #fee2e2;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.countdown-label {
  font-size: 0.7rem;
  color: var(--color-neutral-500);
}

.countdown-time {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.countdown.warning .countdown-time {
  color: #dc2626;
}

/* 提交按鈕 */
.submit-btn {
  padding: 0.625rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-500-rgb), 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-btn.waiting {
  background: linear-gradient(135deg, #10b981, #059669);
  animation: pulse-waiting 2s infinite;
}

.waiting-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes pulse-waiting {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.footer-hint.submitted {
  color: #10b981;
  font-weight: 500;
}

/* 多篇切換標籤 */
.text-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid var(--color-neutral-100);
  overflow-x: auto;
}

.text-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: var(--color-neutral-100);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.text-tab:hover {
  background: var(--color-neutral-200);
}

.text-tab.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.text-tab.complete {
  background: #d1fae5;
}

.text-tab.complete.active {
  background: #a7f3d0;
  border-color: #10b981;
}

.tab-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-300);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}

.text-tab.active .tab-number {
  background: var(--color-primary-500);
  color: white;
}

.text-tab.complete .tab-number {
  background: #10b981;
  color: white;
}

.tab-title {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-check {
  color: #10b981;
  font-weight: 700;
}

/* 做題區域 */
.play-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
}

/* 豆子提示欄 - 與練習頁面一致 */
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
  margin-bottom: 1rem;
}

.board-hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

.board-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 豆子庫存 - 與練習頁面一致 */
.bean-inventory {
  display: flex;
  gap: 4px;
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
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
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
  box-shadow: 
    0 1px 3px rgba(85, 139, 47, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
}

.inventory-bean.used {
  background: var(--color-neutral-300);
  box-shadow: none;
  opacity: 0.4;
}

/* 斷句練習板 - 與練習頁面一致 */
.practice-board {
  background: rgba(255, 255, 255, 0.85);
  border-radius: var(--radius-xl, 16px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.practice-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  line-height: 2.4;
  user-select: none;
}

.char-unit {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  position: relative;
}

.char {
  font-size: var(--text-2xl, 24px);
  font-family: var(--font-main, 'Noto Serif TC', serif);
  color: var(--color-neutral-800);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-block;
}

/* 句豆熱區 - 與練習頁面一致 */
.bean-slot {
  width: 24px;
  height: 44px;
  border: none;
  cursor: pointer;
  background: transparent;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 -4px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* 句豆提示 */
.bean-hint {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(139, 178, 79, 0.15);
  opacity: 0;
  transition: opacity 150ms ease, transform 150ms ease;
}

.bean-slot:hover .bean-hint,
.bean-slot:focus .bean-hint {
  opacity: 1;
  background: rgba(139, 178, 79, 0.35);
}

/* 句豆本體 - 與練習頁面一致 */
.bean {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
  box-shadow: 
    0 1px 3px rgba(85, 139, 47, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  position: absolute;
  animation: bean-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bean-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.bean-slot.has-bean .bean-hint {
  opacity: 0;
}

/* 進度提示 */
.progress-hint {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 多篇導航 */
.text-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-neutral-50);
  border-color: var(--color-neutral-300);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-info {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
}

/* 底部 */
.play-footer {
  padding: 1rem 2rem;
  background: white;
  text-align: center;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}

.footer-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-neutral-400);
}

/* 觸控設備優化 - 與練習頁面一致 */
@media (hover: none) and (pointer: coarse) {
  .bean-slot {
    width: 32px;
    height: 48px;
  }
  
  .bean-hint {
    width: 10px;
    height: 10px;
    opacity: 0.3;
  }
  
  .bean {
    width: 12px;
    height: 12px;
  }
  
  .char {
    font-size: var(--text-xl, 20px);
  }
}

/* 響應式 */
@media (max-width: 640px) {
  .play-header {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  
  .header-center {
    order: -1;
    flex-basis: 100%;
    margin-bottom: 0.5rem;
  }
  
  .practice-board {
    padding: 1.25rem;
  }
  
  .text-tabs {
    padding: 0.5rem 1rem;
  }
  
  .text-tab {
    padding: 0.375rem 0.625rem;
  }
  
  .tab-title {
    display: none;
  }
}
</style>
