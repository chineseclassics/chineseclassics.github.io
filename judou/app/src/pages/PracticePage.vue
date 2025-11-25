<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTextsStore } from '@/stores/textsStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useAuthStore } from '@/stores/authStore'
import { useUserStatsStore, type ScoreBreakdown } from '@/stores/userStatsStore'
import type { PracticeText } from '@/types/text'

interface SlotStatus {
  index: number
  state: 'pending' | 'correct' | 'missed' | 'extra'
}

const route = useRoute()
const textsStore = useTextsStore()
const libraryStore = usePracticeLibraryStore()
const assignmentStore = useAssignmentStore()
const authStore = useAuthStore()
const userStatsStore = useUserStatsStore()

// 作業相關
const assignmentId = computed(() => route.query.assignmentId as string | undefined)
const textId = computed(() => route.query.textId as string | undefined)

// 練習狀態
const currentText = ref<PracticeText | null>(null)
const characters = ref<string[]>([])
const correctBreaks = ref<Set<number>>(new Set())
const userBreaks = ref<Set<number>>(new Set())
const evaluation = ref<{
  statuses: SlotStatus[]
  accuracy: number
  elapsed: number
  score: number
  isComplete: boolean  // 是否全對
  breakdown?: ScoreBreakdown  // 得分明細
  beansEarned?: number  // 實際獲得的豆子（最高分制）
  isNewRecord?: boolean  // 是否創下新紀錄
  isFirstClear?: boolean  // 是否首次完成
} | null>(null)
const timer = ref(0)
const toast = ref<string | null>(null)
const isSubmitting = ref(false)

// 多次嘗試相關狀態
const attemptCount = ref(0)           // 嘗試次數
const firstAttemptAccuracy = ref(0)   // 首次正確率
const firstAttemptTime = ref(0)       // 首次提交時間
const isTimerStopped = ref(false)     // 計時器是否已停止（首次提交後停止）

// 豆子庫存相關
const beanShake = ref(false)          // 豆列抖動狀態

// 計算屬性：總豆子數、已用數、剩餘數
const totalBeans = computed(() => correctBreaks.value.size)
const usedBeans = computed(() => userBreaks.value.size)
const remainingBeans = computed(() => Math.max(0, totalBeans.value - usedBeans.value))
const hasBeansLeft = computed(() => remainingBeans.value > 0)

// 素材選擇器狀態
const isPickerExpanded = ref(false)
const selectedGradeId = ref<string | null>(null)
const selectedModuleId = ref<string | null>(null)
const searchQuery = ref('')

const visitorUsername = ref(localStorage.getItem('judou_username') || 'guest')
const visitorDisplayName = ref(localStorage.getItem('judou_display_name') || '訪客學員')

let timerId: number | null = null

// 音效 - 使用 Web Audio API 生成簡單音效
const audioContext = ref<AudioContext | null>(null)

function initAudio() {
  if (!audioContext.value) {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

function playBeanSound(type: 'add' | 'remove') {
  if (!audioContext.value) initAudio()
  if (!audioContext.value) return

  const ctx = audioContext.value
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  if (type === 'add') {
    // 種豆音效：短促的「噗」聲
    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } else {
    // 移除音效：輕微的「嗶」聲
    oscillator.frequency.setValueAtTime(300, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08)
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.08)
  }
}

// 震動反饋（觸摸設備）
function vibrate(duration: number = 10) {
  if (navigator.vibrate) {
    navigator.vibrate(duration)
  }
}

// 計算屬性 - 分類選項
const gradeOptions = computed(() =>
  libraryStore.state.categories
    .filter((c) => c.level === 1)
    .sort((a, b) => a.order_index - b.order_index)
)

const moduleOptions = computed(() => {
  if (!selectedGradeId.value) return []
  return libraryStore.state.categories
    .filter((c) => c.level === 2 && c.parent_id === selectedGradeId.value)
    .sort((a, b) => a.order_index - b.order_index)
})

const textsInModule = computed(() => {
  if (!selectedModuleId.value) return []
  return textsStore.texts
    .filter((t) => t.category_id === selectedModuleId.value)
    .sort((a, b) => a.title.localeCompare(b.title))
})

// 搜索結果
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  return textsStore.texts
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.author && t.author.toLowerCase().includes(query)) ||
        (t.source && t.source.toLowerCase().includes(query))
    )
    .slice(0, 10)
})

// 麵包屑
const breadcrumbText = computed(() => {
  if (!currentText.value) return '尚未選擇練習素材'
  const parts = []
  if (currentText.value.category?.name) {
    // 找到模組的父級（年級）
    const module = libraryStore.state.categories.find((c) => c.id === currentText.value?.category_id)
    if (module?.parent_id) {
      const grade = libraryStore.state.categories.find((c) => c.id === module.parent_id)
      if (grade) parts.push(grade.name)
    }
    parts.push(currentText.value.category.name)
  }
  parts.push(currentText.value.title)
  return parts.join(' › ')
})

// 監聽年級變化，重置模組選擇
watch(selectedGradeId, () => {
  selectedModuleId.value = null
})

// 核心函數
function parseContent(raw: string) {
  const chars: string[] = []
  const breaks = new Set<number>()
  let pointer = 0
  for (const char of raw) {
    if (char === '|') {
      // 斷句標記在「前一個字的後面」，所以用 pointer - 1
      // 例如 "林|盡" 表示在「林」後面斷句，即 index = 0
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

function startTimer() {
  stopTimer()
  timer.value = 0
  timerId = window.setInterval(() => {
    timer.value += 1
  }, 1000)
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function resetBoard(text: PracticeText) {
  const { chars, breaks } = parseContent(text.content)
  characters.value = chars
  correctBreaks.value = breaks
  userBreaks.value = new Set()
  evaluation.value = null
  toast.value = null
  stopTimer()
  timer.value = 0
  // 重置多次嘗試狀態
  attemptCount.value = 0
  firstAttemptAccuracy.value = 0
  firstAttemptTime.value = 0
  isTimerStopped.value = false
}

function selectText(text: PracticeText) {
  currentText.value = text
  resetBoard(text)
  isPickerExpanded.value = false
  searchQuery.value = ''
  
  // 同步選擇器狀態
  if (text.category_id) {
    const module = libraryStore.state.categories.find((c) => c.id === text.category_id)
    if (module) {
      selectedModuleId.value = module.id
      selectedGradeId.value = module.parent_id ?? null
    }
  }
}

function pickRandomText() {
  const candidate = textsStore.getRandomText()
  if (!candidate) {
    toast.value = '尚未有可練習的文章，請先到管理員頁面新增。'
    return
  }
  selectText(candidate)
}

async function ensureDataLoaded() {
  const promises: Promise<void>[] = []
  
  if (!textsStore.texts.length) {
    promises.push(textsStore.fetchTexts())
  }
  if (!libraryStore.state.categories.length) {
    promises.push(libraryStore.fetchLibrary())
  }
  
  await Promise.all(promises)
  
  // 如果 URL 中有 textId 和 assignmentId，載入該文章
  if (textId.value && assignmentId.value) {
    const text = textsStore.texts.find(t => t.id === textId.value)
    if (text) {
      selectText(text)
      return
    }
  }
  
  if (!currentText.value && textsStore.texts.length) {
    pickRandomText()
  }
  // 預設選中第一個年級
  if (!selectedGradeId.value && gradeOptions.value.length) {
    const firstGrade = gradeOptions.value[0]
    if (firstGrade) {
      selectedGradeId.value = firstGrade.id
    }
  }
}

function toggleBreak(index: number) {
  // 如果已經全對，不允許再修改
  if (evaluation.value?.isComplete) {
    toast.value = '已完成！如要重新練習請點擊重新開始。'
    return
  }
  
  // 如果有評分結果但還沒全對，清除評分狀態以允許修改
  if (evaluation.value && !evaluation.value.isComplete) {
    evaluation.value = null
  }
  
  const newSet = new Set(userBreaks.value)
  const isRemoving = newSet.has(index)
  
  // 如果是添加新斷句，檢查是否還有豆子
  if (!isRemoving && !hasBeansLeft.value) {
    // 豆子用完了，觸發抖動動畫和提示
    triggerBeanShake()
    toast.value = '豆子用完了！請先移除多餘的斷句。'
    return
  }
  
  // 第一次點擊時開始計時（只有在計時器還沒停止的情況下）
  if (userBreaks.value.size === 0 && !timerId && !isTimerStopped.value) {
    startTimer()
  }
  
  if (isRemoving) {
    newSet.delete(index)
    playBeanSound('remove')
  } else {
    newSet.add(index)
    playBeanSound('add')
    vibrate(10)
  }
  userBreaks.value = newSet
  toast.value = null  // 清除之前的提示
}

// 觸發豆列抖動
function triggerBeanShake() {
  beanShake.value = true
  playBeanSound('remove')  // 用移除音效表示「不行」
  vibrate(50)
  setTimeout(() => {
    beanShake.value = false
  }, 400)
}

// 計算字符偏移量（用於文字避讓效果）
function getCharOffset(index: number): string {
  if (!evaluation.value) {
    const hasLeftBean = index > 0 && userBreaks.value.has(index - 1)
    const hasRightBean = userBreaks.value.has(index)
    
    if (hasLeftBean && hasRightBean) {
      return 'translateX(0)'
    } else if (hasLeftBean) {
      return 'translateX(4px)'
    } else if (hasRightBean) {
      return 'translateX(-4px)'
    }
  }
  return 'translateX(0)'
}

// 獲取句豆狀態類
function getBeanClass(index: number) {
  const classes: string[] = []
  const hasBean = userBreaks.value.has(index)
  
  if (hasBean) {
    classes.push('has-bean')
  }
  
  // 只對用戶放置的豆子顯示評分狀態（correct 或 extra）
  // missed 狀態不顯示，因為不能直接告訴用戶答案位置
  if (evaluation.value && hasBean) {
    const status = evaluation.value.statuses.find((item) => item.index === index)
    if (status && (status.state === 'correct' || status.state === 'extra')) {
      classes.push(status.state)
    }
  }
  
  return classes
}

function formatScore(score: number) {
  return `${score} 豆`
}

function formatAccuracy(value: number) {
  return `${Math.round(value * 100)}%`
}

function getContentPreview(text: PracticeText) {
  return text.content.replace(/\|/g, '').slice(0, 30) + '...'
}

// 計算得分（使用新的積分系統）
function calculateScoreWithBreakdown(elapsed: number, attempts: number, isFirstClear: boolean): { score: number; breakdown: ScoreBreakdown } {
  return userStatsStore.calculateScore({
    breakCount: correctBreaks.value.size,
    charCount: characters.value.length,
    elapsedSeconds: elapsed,
    attemptCount: attempts,
    isFirstClear
  })
}

async function submitResult() {
  if (!currentText.value) return
  if (!userBreaks.value.size) {
    toast.value = '至少設定一個斷句位置再提交唷！'
    return
  }
  
  // 增加嘗試次數
  attemptCount.value++
  
  // 評估結果
  const statuses: SlotStatus[] = []
  let correctCount = 0
  let missedCount = 0
  let extraCount = 0
  
  for (let i = 0; i <= characters.value.length; i++) {
    const userHas = userBreaks.value.has(i)
    const correctHas = correctBreaks.value.has(i)
    if (userHas && correctHas) {
      statuses.push({ index: i, state: 'correct' })
      correctCount++
    } else if (!userHas && correctHas) {
      statuses.push({ index: i, state: 'missed' })
      missedCount++
    } else if (userHas && !correctHas) {
      statuses.push({ index: i, state: 'extra' })
      extraCount++
    } else {
      statuses.push({ index: i, state: 'pending' })
    }
  }

  const accuracy = correctBreaks.value.size
    ? correctCount / correctBreaks.value.size
    : userBreaks.value.size
    ? 0
    : 1
  
  // 判斷是否全對
  const isComplete = missedCount === 0 && extraCount === 0
  
  // 首次提交時記錄數據並停止計時
  if (attemptCount.value === 1) {
    firstAttemptAccuracy.value = accuracy
    firstAttemptTime.value = timer.value
    stopTimer()
    isTimerStopped.value = true
  }
  
  // 計算得分（只在全對時計算最終得分）
  const elapsed = firstAttemptTime.value || timer.value
  
  // 檢查是否首次完成該文章（用於首次完成加成）
  let isFirstClear = false
  if (isComplete && authStore.isAuthenticated) {
    isFirstClear = await userStatsStore.checkFirstClear(currentText.value.id)
  }
  
  // 使用新的計分系統
  const { score, breakdown } = isComplete 
    ? calculateScoreWithBreakdown(elapsed, attemptCount.value, isFirstClear)
    : { score: 0, breakdown: undefined as ScoreBreakdown | undefined }
  
  evaluation.value = {
    statuses,
    accuracy,
    elapsed,
    score,
    isComplete,
    breakdown,
    isFirstClear
  }
  
  // 播放反饋音效
  if (isComplete) {
    playSuccessSound()
    
    // 構建提示訊息
    let toastMsg = attemptCount.value === 1 
      ? '🎉 一次過關！太厲害了！' 
      : `✅ 完成！共嘗試 ${attemptCount.value} 次`
    
    if (isFirstClear) {
      toastMsg += ' 🌟 首次完成獎勵！'
    }
    
    toast.value = toastMsg
  } else {
    toast.value = `還有 ${missedCount} 個遺漏、${extraCount} 個多餘，請修正後再次提交`
  }

  // 只在全對時記錄成績
  if (isComplete) {
    try {
      isSubmitting.value = true
      
      // 記錄練習結果到 practice_records
      // 優先使用已登入用戶的真實信息，否則使用訪客信息
      const recordUsername = authStore.isAuthenticated 
        ? (authStore.user?.email?.split('@')[0] || 'user')
        : visitorUsername.value
      const recordDisplayName = authStore.isAuthenticated 
        ? authStore.displayName 
        : visitorDisplayName.value
      
      const practiceRecordId = await textsStore.recordPracticeResult({
        text_id: currentText.value.id,
        score,
        accuracy: firstAttemptAccuracy.value,
        elapsed_seconds: elapsed,
        user_breaks: userBreaks.value.size,
        correct_breaks: correctBreaks.value.size,
        username: recordUsername,
        display_name: recordDisplayName,
      })
      
      // 如果用戶已登入，記錄到新的積分系統
      if (authStore.isAuthenticated) {
        const result = await userStatsStore.recordPracticeScore({
          textId: currentText.value.id,
          score,
          isFirstClear
        })
        
        // 更新評估結果
        if (evaluation.value) {
          evaluation.value.beansEarned = result.beansEarned
          evaluation.value.isNewRecord = result.isNewRecord
        }
        
        // 顯示獲得的豆子
        if (result.beansEarned > 0) {
          const bonusMsg = result.isNewRecord ? ' (新紀錄!)' : ''
          toast.value = `${toast.value} 獲得 ${result.beansEarned} 豆${bonusMsg}`
        }
      }
      
      // 如果是作業，記錄到 assignment_completions
      if (assignmentId.value && authStore.isAuthenticated && practiceRecordId) {
        await assignmentStore.recordCompletion(
          assignmentId.value,
          practiceRecordId,
          score,
          firstAttemptAccuracy.value * 100
        )
      }
    } catch (error) {
      console.warn('記錄練習結果失敗', error)
    } finally {
      isSubmitting.value = false
    }
  }
}

// 成功音效
function playSuccessSound() {
  if (!audioContext.value) initAudio()
  if (!audioContext.value) return

  const ctx = audioContext.value
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  // 勝利音效：上升的音調
  oscillator.frequency.setValueAtTime(400, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2)
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.3)
}

function resetPractice() {
  if (currentText.value) {
    resetBoard(currentText.value)
  }
}

onMounted(() => {
  ensureDataLoaded()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <div class="practice-shell">
    <!-- 素材選擇器 -->
    <section class="picker-section edamame-glass">
      <div class="picker-header" @click="isPickerExpanded = !isPickerExpanded">
        <div class="picker-current">
          <span class="picker-icon">📖</span>
          <div class="picker-info">
            <span class="picker-breadcrumb">{{ breadcrumbText }}</span>
            <span v-if="currentText" class="picker-meta">
              {{ currentText.author || '佚名' }}
              <span v-if="currentText.source"> · {{ currentText.source }}</span>
            </span>
          </div>
        </div>
        <button class="picker-toggle" :class="{ expanded: isPickerExpanded }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div v-if="isPickerExpanded" class="picker-panel">
        <!-- 搜索框 -->
        <div class="picker-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文章標題、作者..."
            class="search-input"
          />
        </div>

        <!-- 搜索結果 -->
        <div v-if="searchQuery.trim()" class="picker-results">
          <div v-if="!searchResults.length" class="picker-empty">
            找不到符合「{{ searchQuery }}」的文章
          </div>
          <div
            v-for="text in searchResults"
            :key="text.id"
            class="picker-item"
            @click="selectText(text)"
          >
            <div class="item-main">
              <span class="item-title">{{ text.title }}</span>
              <span class="item-author">{{ text.author || '佚名' }}</span>
            </div>
            <span class="item-preview">{{ getContentPreview(text) }}</span>
          </div>
        </div>

        <!-- 級聯選擇器 -->
        <div v-else class="picker-cascade">
          <div class="cascade-row">
            <div class="cascade-select">
              <label>年級</label>
              <select v-model="selectedGradeId">
                <option :value="null" disabled>選擇年級</option>
                <option v-for="grade in gradeOptions" :key="grade.id" :value="grade.id">
                  {{ grade.name }}
                </option>
              </select>
            </div>
            <div class="cascade-select">
              <label>單元</label>
              <select v-model="selectedModuleId" :disabled="!selectedGradeId">
                <option :value="null" disabled>{{ selectedGradeId ? '選擇單元' : '請先選年級' }}</option>
                <option v-for="module in moduleOptions" :key="module.id" :value="module.id">
                  {{ module.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 文章列表 -->
          <div class="picker-list">
            <div v-if="!selectedModuleId" class="picker-empty">
              請選擇年級和單元以查看文章
            </div>
            <div v-else-if="!textsInModule.length" class="picker-empty">
              此單元尚無文章
            </div>
            <div
              v-for="text in textsInModule"
              :key="text.id"
              class="picker-item"
              :class="{ active: currentText?.id === text.id }"
              @click="selectText(text)"
            >
              <div class="item-main">
                <span class="item-title">{{ text.title }}</span>
                <span class="item-author">{{ text.author || '佚名' }}</span>
                <span class="item-difficulty" :class="`diff-${text.difficulty}`">
                  {{ text.difficulty === 1 ? '初級' : text.difficulty === 2 ? '中級' : '高級' }}
                </span>
              </div>
              <span class="item-preview">{{ getContentPreview(text) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 操作按鈕 -->
    <div class="hero-actions">
      <button class="edamame-btn edamame-btn-secondary" @click="resetPractice" :disabled="!currentText">
        重新開始
      </button>
      <button class="edamame-btn edamame-btn-primary" @click="pickRandomText">
        隨機一篇
      </button>
    </div>

    <!-- 練習板 -->
    <section class="board-card edamame-glass">
      <div v-if="currentText" class="practice-board">
        <div class="board-header">
          <p class="board-hint">點擊字間空隙種下句豆來斷句</p>
          <div class="board-header-right">
            <!-- 橫向豆列 -->
            <div class="bean-inventory" :class="{ shake: beanShake, empty: !hasBeansLeft }">
              <span
                v-for="i in totalBeans"
                :key="i"
                class="inventory-bean"
                :class="{ used: i > remainingBeans }"
              ></span>
            </div>
            <span v-if="userBreaks.size > 0 || evaluation" class="timer-badge">⏱ {{ timer }} 秒</span>
          </div>
        </div>
        <div class="practice-line" v-if="characters.length">
          <!-- 每個字和其後的句豆熱區包成一個不可分割的單元 -->
          <span
            v-for="(char, index) in characters"
            :key="index"
            class="char-unit"
          >
            <span
              class="char"
              :style="{ transform: getCharOffset(index) }"
            >{{ char }}</span>
            <button
              class="bean-slot"
              :class="getBeanClass(index)"
              @click="toggleBreak(index)"
              :aria-label="`在「${char}」後${userBreaks.has(index) ? '移除' : '添加'}斷句`"
            >
              <!-- 只顯示用戶放置的豆子，遺漏的不顯示（不能直接告訴答案） -->
              <span class="bean" v-if="userBreaks.has(index)"></span>
              <span class="bean-hint"></span>
            </button>
          </span>
        </div>
        <div v-else class="state-info">尚無可顯示的文字內容。</div>

        <div class="board-actions">
          <button 
            class="edamame-btn edamame-btn-lg" 
            :class="evaluation?.isComplete ? 'edamame-btn-success' : 'edamame-btn-primary'"
            :disabled="isSubmitting || evaluation?.isComplete" 
            @click="submitResult"
          >
            <template v-if="evaluation?.isComplete">
              ✓ 完成！
            </template>
            <template v-else-if="attemptCount > 0">
              再次提交 ({{ attemptCount + 1 }})
            </template>
            <template v-else>
              提交答案
            </template>
          </button>
        </div>
        <p v-if="toast" class="toast" :class="{ success: evaluation?.isComplete }">{{ toast }}</p>
      </div>
      <div v-else class="board-empty">
        <p>請從上方選擇練習素材，或點擊「隨機一篇」開始練習</p>
      </div>
    </section>

    <!-- 結果區域 -->
    <section class="results-grid">
      <article class="result-card edamame-glass">
        <p class="result-label">得分</p>
        <p class="result-value" :class="{ placeholder: !evaluation?.isComplete }">
          {{ evaluation?.isComplete ? formatScore(evaluation.score) : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.isComplete && evaluation?.beansEarned !== undefined">
            <span v-if="evaluation.isNewRecord" class="new-record">🏆 新紀錄！</span>
            <span v-else>已是最高分</span>
            +{{ evaluation.beansEarned }} 豆
          </template>
          <template v-else-if="evaluation?.isComplete && attemptCount > 1">
            嘗試 {{ attemptCount }} 次後完成
          </template>
          <template v-else>
            全對後顯示最終得分
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">首次正確率</p>
        <p class="result-value" :class="{ placeholder: attemptCount === 0 }">
          {{ attemptCount > 0 ? formatAccuracy(firstAttemptAccuracy) : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="attemptCount > 0 && !evaluation?.isComplete">
            當前：{{ formatAccuracy(evaluation?.accuracy || 0) }}
          </template>
          <template v-else>
            反映真實水平
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">用時</p>
        <p class="result-value" :class="{ placeholder: attemptCount === 0 }">
          {{ attemptCount > 0 ? `${firstAttemptTime} 秒` : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.isComplete && evaluation?.breakdown">
            時間係數：×{{ evaluation.breakdown.timeFactor }}
          </template>
          <template v-else-if="attemptCount > 0">
            首次提交時記錄
          </template>
          <template v-else>
            計時至首次提交
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">嘗試次數</p>
        <p class="result-value" :class="{ placeholder: attemptCount === 0 }">
          {{ attemptCount > 0 ? attemptCount : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.isComplete && evaluation?.breakdown">
            嘗試係數：×{{ evaluation.breakdown.attemptFactor }}
          </template>
          <template v-else-if="evaluation?.isComplete">
            {{ attemptCount === 1 ? '一次過關！' : '堅持就是勝利' }}
          </template>
          <template v-else>
            可多次嘗試直到全對
          </template>
        </p>
      </article>
    </section>
    
    <!-- 得分明細（僅在完成後顯示） -->
    <section v-if="evaluation?.isComplete && evaluation?.breakdown" class="score-breakdown edamame-glass">
      <h3 class="breakdown-title">📊 得分明細</h3>
      <div class="breakdown-grid">
        <div class="breakdown-item">
          <span class="breakdown-label">基礎分</span>
          <span class="breakdown-value">{{ evaluation.breakdown.baseScore }}</span>
          <span class="breakdown-formula">{{ correctBreaks.size }} 斷句 × 2</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">時間係數</span>
          <span class="breakdown-value">×{{ evaluation.breakdown.timeFactor }}</span>
          <span class="breakdown-formula">{{ evaluation.breakdown.avgTimePerChar }} 秒/字</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">嘗試係數</span>
          <span class="breakdown-value">×{{ evaluation.breakdown.attemptFactor }}</span>
          <span class="breakdown-formula">第 {{ attemptCount }} 次</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">連續天數</span>
          <span class="breakdown-value">×{{ evaluation.breakdown.streakFactor }}</span>
          <span class="breakdown-formula">{{ userStatsStore.profile?.streak_days || 0 }} 天</span>
        </div>
        <div v-if="evaluation.isFirstClear" class="breakdown-item highlight">
          <span class="breakdown-label">首次完成</span>
          <span class="breakdown-value">×{{ evaluation.breakdown.firstClearFactor }}</span>
          <span class="breakdown-formula">🌟 首通獎勵</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.practice-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 素材選擇器 */
.picker-section {
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: background var(--duration-base) ease;
}

.picker-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.picker-current {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.picker-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.picker-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.picker-breadcrumb {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-neutral-700);
}

.picker-meta {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.picker-toggle {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-500);
  transition: all var(--duration-base) ease;
}

.picker-toggle:hover {
  background: rgba(0, 0, 0, 0.08);
}

.picker-toggle.expanded {
  transform: rotate(180deg);
}

.picker-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 1rem 1.25rem;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.picker-search {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.8);
  transition: all var(--duration-base) ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px rgba(139, 178, 79, 0.15);
}

.picker-cascade {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cascade-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.cascade-select {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cascade-select label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cascade-select select {
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all var(--duration-base) ease;
}

.cascade-select select:focus {
  outline: none;
  border-color: var(--color-primary-400);
}

.cascade-select select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-list,
.picker-results {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-neutral-400);
  font-size: var(--text-sm);
}

.picker-item {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all var(--duration-base) ease;
}

.picker-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--color-primary-200);
  transform: translateX(4px);
}

.picker-item.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.item-title {
  font-weight: var(--font-medium);
  color: var(--color-neutral-800);
}

.item-author {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.item-difficulty {
  font-size: var(--text-xs);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.item-difficulty.diff-1 {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.item-difficulty.diff-2 {
  background: rgba(234, 179, 8, 0.15);
  color: #a16207;
}

.item-difficulty.diff-3 {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}

.item-preview {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  display: block;
}

/* 操作按鈕 */
.hero-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

/* 練習板 */
.board-card {
  padding: 1.5rem;
}

.practice-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.board-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 橫向豆列 */
.bean-inventory {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  background: rgba(139, 178, 79, 0.08);
  border-radius: var(--radius-full);
  transition: all 200ms ease;
}

.bean-inventory.empty {
  background: rgba(239, 68, 68, 0.08);
}

.bean-inventory.shake {
  animation: inventory-shake 400ms ease;
}

@keyframes inventory-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.inventory-bean {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
  box-shadow: 0 1px 2px rgba(85, 139, 47, 0.3);
  transition: all 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.inventory-bean.used {
  background: rgba(0, 0, 0, 0.1);
  box-shadow: none;
  transform: scale(0.8);
}

.board-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  line-height: 32px;
}

.timer-badge {
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-full);
  background: rgba(139, 178, 79, 0.12);
  color: var(--color-primary-700);
  font-family: var(--font-mono, monospace);
  font-size: var(--text-sm);
  white-space: nowrap;
  line-height: 1.4;
  animation: fade-in 150ms ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 練習區域 - 模擬古書無標點樣式 */
.practice-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 1.5rem 1.25rem;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.85);
  line-height: 2.4;
  user-select: none;
}

/* 字 + 句豆熱區的不可分割單元 */
.char-unit {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  position: relative;
}

/* 文字樣式 */
.char {
  font-size: var(--text-2xl, 24px);
  font-family: var(--font-main, 'Noto Serif TC', serif);
  color: var(--color-neutral-800);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-block;
}

/* 句豆熱區 - 點擊區域 */
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

/* 句豆提示 - hover 時顯示 */
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

/* 句豆本體 - 簡約綠色漸層圓形 */
.bean {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
  box-shadow: 
    0 1px 3px rgba(85, 139, 47, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  position: absolute;
  animation: bean-pop 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* 句豆出現動畫 */
@keyframes bean-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 有句豆時隱藏提示 */
.bean-slot.has-bean .bean-hint {
  opacity: 0;
}

/* 評分後的狀態 - 正確（綠豆） */
.bean-slot.correct .bean {
  background: linear-gradient(145deg, #6dd400 0%, #43a047 50%, #2e7d32 100%);
  box-shadow: 
    0 0 8px rgba(67, 160, 71, 0.6),
    0 2px 4px rgba(46, 125, 50, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  animation: bean-correct 400ms ease forwards;
}

@keyframes bean-correct {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* 評分後的狀態 - 遺漏（黃豆閃爍） */
.bean-slot.missed .bean {
  background: linear-gradient(145deg, #ffeb3b 0%, #fbc02d 50%, #f9a825 100%);
  box-shadow: 
    0 0 8px rgba(251, 192, 45, 0.6),
    0 2px 4px rgba(249, 168, 37, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  animation: bean-missed 600ms ease-in-out infinite;
}

@keyframes bean-missed {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* 評分後的狀態 - 多餘（紅豆抖動） */
.bean-slot.extra .bean {
  background: linear-gradient(145deg, #ff6b6b 0%, #e53935 50%, #c62828 100%);
  box-shadow: 
    0 0 8px rgba(229, 57, 53, 0.5),
    0 2px 4px rgba(198, 40, 40, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  animation: bean-shake 400ms ease-in-out;
}

@keyframes bean-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

/* 觸控設備優化 */
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

.board-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
}

.toast {
  text-align: center;
  color: var(--color-neutral-600);
  font-size: var(--text-sm);
  margin: 0;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-lg);
  background: rgba(0, 0, 0, 0.04);
}

.toast.success {
  color: var(--color-success, #16a34a);
  background: rgba(22, 163, 74, 0.1);
}

/* 成功按鈕樣式 */
.edamame-btn-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  cursor: default;
}

.edamame-btn-success:hover {
  transform: none;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
}

.board-empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-neutral-400);
}

.state-info {
  color: var(--color-neutral-500);
  text-align: center;
  padding: 2rem;
}

/* 結果區域 */
.results-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.result-card {
  padding: 1.25rem;
  text-align: center;
}

.result-label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-neutral-600);
}

.result-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: 0.5rem 0;
  color: var(--color-primary-700);
}

.result-value.placeholder {
  color: var(--color-neutral-300);
}

.result-desc {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* 新紀錄標記 */
.new-record {
  color: var(--color-warning, #f59e0b);
  font-weight: var(--font-semibold);
}

/* 得分明細區域 */
.score-breakdown {
  padding: 1.25rem;
  margin-top: 1rem;
}

.breakdown-title {
  margin: 0 0 1rem 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-neutral-700);
}

.breakdown-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.breakdown-item {
  flex: 1;
  min-width: 100px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-align: center;
}

.breakdown-item.highlight {
  background: rgba(139, 178, 79, 0.1);
  border-color: var(--color-primary-200);
}

.breakdown-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-bottom: 0.25rem;
}

.breakdown-value {
  display: block;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary-700);
}

.breakdown-formula {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  margin-top: 0.25rem;
}

/* 響應式 */
@media (max-width: 1024px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .breakdown-grid {
    flex-wrap: wrap;
  }
  
  .breakdown-item {
    min-width: calc(50% - 0.375rem);
  }
}

@media (max-width: 768px) {
  .cascade-row {
    grid-template-columns: 1fr;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    width: 100%;
    justify-content: stretch;
  }

  .hero-actions button {
    flex: 1;
  }

  .board-actions {
    flex-wrap: wrap;
  }
  
  .breakdown-item {
    min-width: 100%;
  }
}
</style>
