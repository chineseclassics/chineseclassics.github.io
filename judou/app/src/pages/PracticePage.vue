<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTextsStore } from '@/stores/textsStore'
import { usePracticeLibraryStore } from '@/stores/practiceLibraryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useAuthStore } from '@/stores/authStore'
import { useUserStatsStore, type ScoreBreakdown } from '@/stores/userStatsStore'
import { useClassStore } from '@/stores/classStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { classicalSpeak, classicalPreload, classicalStopSpeak } from '@/composables/useClassicalTTS'
import type { PracticeText } from '@/types/text'
import { RefreshCw, Clock, Volume2, Square } from 'lucide-vue-next'

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
const classStore = useClassStore()
const avatarStore = useAvatarStore()

// 學生所屬班級的老師 ID 列表（用於過濾可見的私有文章）
const myTeacherIds = ref<Set<string>>(new Set())

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
  beansEarned?: number  // 實際獲得的豆子（增量加分）
  isNewRecord?: boolean  // 是否創下新紀錄
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
const searchQuery = ref('')

const visitorUsername = ref(localStorage.getItem('judou_username') || 'guest')
const visitorDisplayName = ref(localStorage.getItem('judou_display_name') || '訪客學員')

// TTS 朗讀狀態
const isPlayingTTS = ref(false)

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

// 判斷文章是否可見
function isTextVisible(t: PracticeText): boolean {
  // 系統文章：所有人可見
  if (t.is_system === true) return true
  // 自己創建的私有文章
  if (t.created_by === authStore.user?.id) return true
  // 學生可以看到所屬班級老師的私有文章
  if (authStore.isStudent && t.created_by && myTeacherIds.value.has(t.created_by)) return true
  return false
}

// 當前年級的文章列表
const textsInGrade = computed(() => {
  if (!selectedGradeId.value) return []
  return textsStore.texts
    .filter((t) => {
      // 必須屬於當前年級
      if (t.category_id !== selectedGradeId.value) return false
      // 過濾可見文章
      return isTextVisible(t)
    })
    .sort((a, b) => a.title.localeCompare(b.title))
})

// 搜索結果
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  return textsStore.texts
    .filter((t) => {
      // 過濾可見文章
      if (!isTextVisible(t)) return false
      // 搜索匹配
      return (
        t.title.toLowerCase().includes(query) ||
        (t.author && t.author.toLowerCase().includes(query)) ||
        (t.source && t.source.toLowerCase().includes(query))
    )
    })
    .slice(0, 10)
})

// 麵包屑
// 麵包屑：年級 › 文章標題
const breadcrumbText = computed(() => {
  if (!currentText.value) return '尚未選擇練習素材'
  const parts = []
  if (currentText.value.category?.name) {
    parts.push(currentText.value.category.name)
  }
  parts.push(currentText.value.title)
  return parts.join(' › ')
})

// 監聽年級變化，重置模組選擇
// 加載學生所屬班級的老師 ID
async function loadMyTeacherIds() {
  if (!authStore.isStudent || !authStore.isAuthenticated) return
  
  await classStore.fetchStudentClasses()
  
  // 從班級信息中提取老師 ID
  const teacherIds = new Set<string>()
  for (const cls of classStore.classes) {
    if (cls.teacher_id) {
      teacherIds.add(cls.teacher_id)
    }
  }
  myTeacherIds.value = teacherIds
}

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
  
  // 同步選擇器狀態（文章直接關聯到年級）
  if (text.category_id) {
    selectedGradeId.value = text.category_id
  }
}

function pickRandomText() {
  // 過濾可見的練習文章（排除閱讀文章）
  const visibleTexts = textsStore.texts.filter(t => 
    t.text_type === 'practice' && isTextVisible(t)
  )
  if (!visibleTexts.length) {
    toast.value = '尚未有可練習的文章，請先到管理員頁面新增。'
    return
  }
  
  // 排除當前文章，確保每次都選到不同的
  const currentId = currentText.value?.id
  const candidates = visibleTexts.filter(t => t.id !== currentId)
  
  // 如果只有一篇文章，直接選擇它（雖然是同一篇）
  if (!candidates.length) {
    toast.value = '目前只有一篇文章可練習'
    return
  }
  
  const idx = Math.floor(Math.random() * candidates.length)
  const selected = candidates[idx]
  if (selected) {
    selectText(selected)
  }
}

async function ensureDataLoaded() {
  const promises: Promise<void>[] = []
  
  if (!textsStore.texts.length) {
    promises.push(textsStore.fetchTexts())
  }
  if (!libraryStore.state.categories.length) {
    promises.push(libraryStore.fetchLibrary())
  }
  
  // 如果是學生，獲取所屬班級的老師 ID
  if (authStore.isStudent && authStore.isAuthenticated) {
    promises.push(loadMyTeacherIds())
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
  // 如果已經提交過，不允許再修改，需要重新挑戰
  if (evaluation.value) {
    toast.value = '已提交！如要再次嘗試請點擊「重新挑戰」'
    return
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

// 計算得分（新版簡化公式）
// 得分 = 正確斷句數 + 速度獎勵（全對時才有）
function calculateScoreWithBreakdown(correctCount: number, elapsed: number): { score: number; breakdown: ScoreBreakdown } {
  return userStatsStore.calculateScore({
    correctCount,
    totalBreaks: correctBreaks.value.size,
    charCount: characters.value.length,
    elapsedSeconds: elapsed
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
  
  // 停止計時
    stopTimer()
    isTimerStopped.value = true
  const elapsed = timer.value
  
  // 記錄首次提交的數據
  if (attemptCount.value === 1) {
    firstAttemptAccuracy.value = accuracy
    firstAttemptTime.value = elapsed
  }
  
  // 計算得分（新版簡化公式：每次提交都計算）
  // 基礎分 = 正確斷句數，速度獎勵只有全對時才有
  const { score, breakdown } = calculateScoreWithBreakdown(correctCount, elapsed)
  
  evaluation.value = {
    statuses,
    accuracy,
    elapsed,
    score,
    isComplete,
    breakdown
  }
  
  // 構建提示訊息
  if (isComplete) {
    playSuccessSound()
    const speedBonusMsg = breakdown.speedBonus > 0 ? ` + 速度獎勵 ${breakdown.speedBonus}` : ''
    toast.value = `🎉 全對！正確 ${correctCount} 豆${speedBonusMsg} = ${score} 豆`
  } else {
    toast.value = `正確 ${correctCount} 個，遺漏 ${missedCount} 個，多餘 ${extraCount} 個 → 獲得 ${score} 豆`
  }

  // 每次提交都記錄成績（新邏輯）
    try {
      isSubmitting.value = true
      
      // 記錄練習結果到 practice_records
      const recordUsername = authStore.isAuthenticated 
        ? (authStore.user?.email?.split('@')[0] || 'user')
        : visitorUsername.value
      const recordDisplayName = authStore.isAuthenticated 
        ? authStore.displayName 
        : visitorDisplayName.value
      
      const practiceRecordId = await textsStore.recordPracticeResult({
        text_id: currentText.value.id,
        score,
      accuracy,
        elapsed_seconds: elapsed,
        user_breaks: userBreaks.value.size,
        correct_breaks: correctBreaks.value.size,
        username: recordUsername,
        display_name: recordDisplayName,
      user_id: authStore.user?.id || null,
      })
      
    // 如果用戶已登入，記錄到積分系統（增量加分）
      if (authStore.isAuthenticated) {
        const result = await userStatsStore.recordPracticeScore({
          textId: currentText.value.id,
          score,
          textTitle: currentText.value.title
        })
        
        // 更新評估結果
        if (evaluation.value) {
          evaluation.value.beansEarned = result.beansEarned
          evaluation.value.isNewRecord = result.isNewRecord
        }
        
      // 更新 toast 顯示獲得的豆子
        if (result.beansEarned > 0) {
          const bonusMsg = result.isNewRecord ? ' (新紀錄!)' : ''
        toast.value = `${toast.value}${bonusMsg} 實得 +${result.beansEarned} 豆`
        
        // 檢查是否有新頭像解鎖
        const newlyUnlocked = await avatarStore.checkAndUnlockAvatars(userStatsStore.level)
        if (newlyUnlocked.length > 0) {
          // 延遲顯示頭像解鎖提示
          setTimeout(() => {
            toast.value = `🎉 解鎖新頭像：${newlyUnlocked.map(a => a.name).join('、')}`
          }, 2000)
        }
      } else if (result.beansEarned === 0 && !result.isNewRecord) {
        toast.value = `${toast.value}（未超過個人最高記錄，不加分）`
        }
      }
      
      // 如果是作業，記錄到 assignment_completions
      if (assignmentId.value && authStore.isAuthenticated && practiceRecordId) {
        await assignmentStore.recordCompletion(
          assignmentId.value,
          practiceRecordId,
          score,
        accuracy * 100
        )
      }
    } catch (error) {
      console.warn('記錄練習結果失敗', error)
    } finally {
      isSubmitting.value = false
    }
}

// 重新挑戰（完全重置棋盤）
function retryChallenge() {
  if (currentText.value) {
    resetBoard(currentText.value)
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

// TTS 朗讀功能 - 生成分段文本（按句子分割，快速響應）
function getSegmentedTexts(): string[] {
  if (!characters.value.length) return []
  
  const segments: string[] = []
  let currentSegment = ''
  let lastBreakPos = -1
  
  for (let i = 0; i < characters.value.length; i++) {
    currentSegment += characters.value[i]
    
    // 在斷句位置添加停頓標記並可能分段
    if (correctBreaks.value.has(i)) {
      const sentenceLength = i - lastBreakPos
      lastBreakPos = i
      
      // 根據句子長度選擇標點
      if (sentenceLength >= 8) {
        currentSegment += '。'
        // 較長句子作為獨立段落
        segments.push(currentSegment)
        currentSegment = ''
      } else if (sentenceLength >= 4) {
        currentSegment += '，'
      } else {
        currentSegment += '、'
      }
    }
  }
  
  // 處理最後一段
  if (currentSegment.trim()) {
    if (!currentSegment.endsWith('。') && !currentSegment.endsWith('，') && !currentSegment.endsWith('、')) {
      currentSegment += '。'
    }
    segments.push(currentSegment)
  }
  
  // 如果沒有分段（短文本），返回整體
  if (segments.length === 0 && characters.value.length > 0) {
    return [characters.value.join('') + '。']
  }
  
  return segments
}

// 停止標記
let shouldStopTTS = false

function stopTTS() {
  shouldStopTTS = true
  classicalStopSpeak()
  isPlayingTTS.value = false
}

// TTS 配置
const TTS_OPTIONS = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 0.75  // Azure TTS 語速 (-25%)，適合古文朗讀
}

async function toggleReadText() {
  if (!characters.value.length) return
  
  // 如果正在播放，則停止
  if (isPlayingTTS.value) {
    stopTTS()
    return
  }
  
  isPlayingTTS.value = true
  shouldStopTTS = false
  
  const segments = getSegmentedTexts()
  
  try {
    // 逐段播放，同時預加載下一段
    for (let i = 0; i < segments.length; i++) {
      if (shouldStopTTS) break
      
      // 預加載下一段（如果有的話）
      const nextSegment = segments[i + 1]
      if (nextSegment) {
        classicalPreload(nextSegment, TTS_OPTIONS)
      }
      
      // 播放當前段（使用文言文發音修正）
      const currentSegment = segments[i]
      if (currentSegment) {
        await classicalSpeak(currentSegment, TTS_OPTIONS)
      }
    }
  } catch (e) {
    console.error('TTS 播放失敗:', e)
    if (!shouldStopTTS) {
      alert('語音朗讀失敗，請稍後再試')
    }
  } finally {
    isPlayingTTS.value = false
    shouldStopTTS = false
  }
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
  stopTTS()  // 停止朗讀
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
              <router-link 
                v-if="currentText.source_text?.id" 
                :to="{ name: 'reading-detail', params: { id: currentText.source_text.id }}"
                class="source-link"
                @click.stop
              >
                · 來自《{{ currentText.source_text.title }}》
              </router-link>
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

        <!-- 年級選擇器 -->
        <div v-else class="picker-cascade">
          <div class="cascade-row">
            <div class="cascade-select full-width">
              <label>年級</label>
              <select v-model="selectedGradeId">
                <option :value="null" disabled>選擇年級</option>
                <option v-for="grade in gradeOptions" :key="grade.id" :value="grade.id">
                  {{ grade.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 文章列表 -->
          <div class="picker-list">
            <div v-if="!selectedGradeId" class="picker-empty">
              請選擇年級以查看文章
            </div>
            <div v-else-if="!textsInGrade.length" class="picker-empty">
              此年級尚無文章
            </div>
            <div
              v-for="text in textsInGrade"
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
            <!-- 朗讀按鈕（完成後顯示） -->
            <button 
              v-if="evaluation?.isComplete"
              class="tts-btn-small"
              :class="{ playing: isPlayingTTS }"
              @click="toggleReadText"
            >
              <component :is="isPlayingTTS ? Square : Volume2" :size="16" :stroke-width="1.5" />
              <span>{{ isPlayingTTS ? ' 停止' : ' 朗讀' }}</span>
            </button>
            <!-- 橫向豆列 -->
            <div class="bean-inventory" :class="{ shake: beanShake, empty: !hasBeansLeft }">
              <span
                v-for="i in totalBeans"
                :key="i"
                class="inventory-bean"
                :class="{ used: i > remainingBeans }"
              ></span>
            </div>
            <span v-if="userBreaks.size > 0 || evaluation" class="timer-badge">
              <Clock :size="14" :stroke-width="1.5" />
              <span>{{ timer }} 秒</span>
            </span>
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
            <!-- 最後一個字後面不需要斷句熱區 -->
            <!-- 使用 @pointerdown 代替 @click 以獲得更即時的響應 -->
            <button
              v-if="index < characters.length - 1"
              class="bean-slot"
              :class="getBeanClass(index)"
              @pointerdown.prevent="toggleBreak(index)"
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
          <!-- 尚未提交：顯示「提交答案」按鈕 -->
          <button 
            v-if="!evaluation"
            class="edamame-btn edamame-btn-lg edamame-btn-primary"
            :disabled="isSubmitting" 
            @click="submitResult"
          >
            提交答案
          </button>
          
          <!-- 已提交：顯示「重新挑戰」按鈕 -->
          <button 
            v-else
            class="edamame-btn edamame-btn-lg edamame-btn-secondary"
            @click="retryChallenge"
          >
            <RefreshCw :size="18" :stroke-width="1.5" />
            <span> 重新挑戰</span>
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
        <p class="result-label">本次得分</p>
        <p class="result-value" :class="{ placeholder: !evaluation }">
          {{ evaluation ? formatScore(evaluation.score) : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.breakdown">
            正確 {{ evaluation.breakdown.baseScore }} 豆
            <template v-if="evaluation.breakdown.speedBonus > 0">
              + 速度 {{ evaluation.breakdown.speedBonus }} 豆
          </template>
          </template>
          <template v-else>
            對幾個得幾豆
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">正確率</p>
        <p class="result-value" :class="{ placeholder: !evaluation }">
          {{ evaluation ? formatAccuracy(evaluation.accuracy) : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation">
            {{ evaluation.isComplete ? '🎉 全對！' : '繼續加油' }}
          </template>
          <template v-else>
            正確數 ÷ 總斷句數
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">用時</p>
        <p class="result-value" :class="{ placeholder: !evaluation }">
          {{ evaluation ? `${evaluation.elapsed} 秒` : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.breakdown">
            基準 {{ evaluation.breakdown.baseTime }} 秒
            <template v-if="evaluation.breakdown.speedBonus > 0">
              · 節省 {{ evaluation.breakdown.baseTime - evaluation.elapsed }} 秒
          </template>
          </template>
          <template v-else>
            全對才有速度獎勵
          </template>
        </p>
      </article>
      <article class="result-card edamame-glass">
        <p class="result-label">實得豆子</p>
        <p class="result-value" :class="{ placeholder: !evaluation || evaluation.beansEarned === undefined }">
          {{ evaluation?.beansEarned !== undefined ? `+${evaluation.beansEarned}` : '--' }}
        </p>
        <p class="result-desc">
          <template v-if="evaluation?.beansEarned !== undefined">
            <span v-if="evaluation.isNewRecord" class="new-record">🏆 新紀錄！</span>
            <span v-else-if="evaluation.beansEarned === 0">未超過個人最高記錄</span>
            <span v-else>增量加分</span>
          </template>
          <template v-else>
            登入後記錄
          </template>
        </p>
      </article>
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

.source-link {
  color: var(--color-primary-600);
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
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

.cascade-select.full-width {
  flex: 1;
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

/* 朗讀小按鈕 */
.tts-btn-small {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: none;
  background: rgba(139, 178, 79, 0.15);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-primary-700);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tts-btn-small:hover {
  background: rgba(139, 178, 79, 0.25);
}

.tts-btn-small.playing {
  background: var(--color-primary-500);
  color: white;
}

.tts-btn-small.playing:hover {
  background: var(--color-primary-600);
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
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
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
  /* 防止文字選擇干擾點擊 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
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
  width: 28px;
  height: 48px;
  border: none;
  cursor: pointer;
  background: transparent;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 -6px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  /* 確保按鈕可以即時響應 */
  outline: none;
}

/* 點擊時的即時反饋 */
.bean-slot:active {
  transform: scale(0.92);
}

/* 句豆提示 - hover 時顯示 */
.bean-hint {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(139, 178, 79, 0.2);
  opacity: 0;
  transition: opacity 100ms ease, transform 100ms ease, background 100ms ease;
  pointer-events: none;
}

.bean-slot:hover .bean-hint,
.bean-slot:focus .bean-hint {
  opacity: 1;
  background: rgba(139, 178, 79, 0.4);
}

/* 點擊時提示變大變亮 */
.bean-slot:active .bean-hint {
  opacity: 1;
  background: rgba(139, 178, 79, 0.6);
  transform: scale(1.3);
}

/* 句豆本體 - 簡約綠色漸層圓形 */
.bean {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
  box-shadow: 
    0 1px 3px rgba(85, 139, 47, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  position: absolute;
  pointer-events: none;
  /* 更快更有彈性的動畫 */
  animation: bean-pop 150ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* 句豆出現動畫 - 更快更爽 */
@keyframes bean-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.4);
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
    width: 36px;
    height: 52px;
    margin: 0 -8px;
  }
  
  /* 觸控設備上始終顯示提示，方便點擊 */
  .bean-hint {
    width: 12px;
    height: 12px;
    opacity: 0.25;
  }
  
  .bean-slot:active .bean-hint {
    opacity: 1;
    transform: scale(1.5);
  }
  
  .bean {
    width: 13px;
    height: 13px;
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

/* 響應式 */
@media (max-width: 1024px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
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
}
</style>
