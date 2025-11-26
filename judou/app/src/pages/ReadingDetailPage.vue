<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReadingStore } from '@/stores/readingStore'
import { useAuthStore } from '@/stores/authStore'
import type { TextAnnotation } from '@/types/text'

const route = useRoute()
const router = useRouter()
const readingStore = useReadingStore()
const authStore = useAuthStore()

// 文章 ID
const textId = computed(() => route.params.id as string)

// 顯示模式：顯示斷句 / 隱藏斷句
const showPunctuation = ref(true)

// 用戶自己標記的斷句位置
const userBreaks = ref<Set<number>>(new Set())

// 驗證結果
const verificationResult = ref<{
  correct: number[]
  missed: number[]
  extra: number[]
  accuracy: number
} | null>(null)

// 當前顯示的 tooltip
const activeTooltip = ref<{
  annotation: TextAnnotation
  x: number
  y: number
} | null>(null)

// TTS 播放狀態
const isPlaying = ref(false)

// 解析文章內容
const parsedContent = computed(() => {
  if (!readingStore.currentText) return { chars: [], breaks: new Set<number>() }
  
  const content = readingStore.currentText.content
  const chars: string[] = []
  const breaks = new Set<number>()
  let pointer = 0
  
  for (const char of content) {
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
})

// 將文章分段（以句號、問號、感嘆號為段落結尾）
const paragraphs = computed(() => {
  const { chars, breaks } = parsedContent.value
  if (!chars.length) return []
  
  const paragraphList: { startIdx: number; endIdx: number; chars: string[] }[] = []
  let currentStart = 0
  
  // 簡單的分段邏輯：每 100 字左右或遇到大段落結束
  const PARAGRAPH_SIZE = 80
  
  for (let i = 0; i < chars.length; i++) {
    const isBreak = breaks.has(i)
    const isMajorBreak = isBreak && (chars[i] === '。' || chars[i] === '？' || chars[i] === '！')
    const isLongEnough = i - currentStart >= PARAGRAPH_SIZE
    
    // 在主要斷點且長度足夠時分段
    if (isMajorBreak && isLongEnough) {
      paragraphList.push({
        startIdx: currentStart,
        endIdx: i,
        chars: chars.slice(currentStart, i + 1)
      })
      currentStart = i + 1
    }
  }
  
  // 添加最後一段
  if (currentStart < chars.length) {
    paragraphList.push({
      startIdx: currentStart,
      endIdx: chars.length - 1,
      chars: chars.slice(currentStart)
    })
  }
  
  return paragraphList
})

// 當前段落索引
const currentParagraphIdx = ref(0)

// 當前段落
const currentParagraph = computed(() => paragraphs.value[currentParagraphIdx.value] || null)

// 獲取字符的註釋（如果有）
function getAnnotationForChar(globalIdx: number): TextAnnotation | null {
  if (!readingStore.currentText?.annotations) return null
  return readingStore.currentText.annotations.find(
    a => globalIdx >= a.start_index && globalIdx < a.end_index
  ) || null
}

// 檢查字符是否是註釋的起始位置
function isAnnotationStart(globalIdx: number): boolean {
  if (!readingStore.currentText?.annotations) return false
  return readingStore.currentText.annotations.some(a => a.start_index === globalIdx)
}

// 切換用戶斷句
function toggleUserBreak(localIdx: number) {
  if (showPunctuation.value) return // 顯示模式下不允許操作
  
  const paragraph = currentParagraph.value
  if (!paragraph) return
  
  // 轉換為全局索引
  const globalIdx = paragraph.startIdx + localIdx
  
  const newSet = new Set(userBreaks.value)
  if (newSet.has(globalIdx)) {
    newSet.delete(globalIdx)
  } else {
    newSet.add(globalIdx)
  }
  userBreaks.value = newSet
  
  // 清除之前的驗證結果
  verificationResult.value = null
}

// 驗證當前段落的斷句
function verifyParagraph() {
  const paragraph = currentParagraph.value
  if (!paragraph) return
  
  const { breaks: correctBreaks } = parsedContent.value
  
  const correct: number[] = []
  const missed: number[] = []
  const extra: number[] = []
  
  // 檢查當前段落範圍內的斷句
  for (let i = paragraph.startIdx; i <= paragraph.endIdx; i++) {
    const isCorrect = correctBreaks.has(i)
    const isUserMarked = userBreaks.value.has(i)
    
    if (isCorrect && isUserMarked) {
      correct.push(i)
    } else if (isCorrect && !isUserMarked) {
      missed.push(i)
    } else if (!isCorrect && isUserMarked) {
      extra.push(i)
    }
  }
  
  const totalCorrectInParagraph = [...correctBreaks].filter(
    b => b >= paragraph.startIdx && b <= paragraph.endIdx
  ).length
  
  const accuracy = totalCorrectInParagraph > 0 
    ? correct.length / totalCorrectInParagraph 
    : 1
  
  verificationResult.value = { correct, missed, extra, accuracy }
}

// 顯示正確答案
function showAnswer() {
  showPunctuation.value = true
  verificationResult.value = null
}

// 重置當前段落的斷句
function resetParagraph() {
  const paragraph = currentParagraph.value
  if (!paragraph) return
  
  // 移除當前段落範圍內的用戶斷句
  const newSet = new Set(userBreaks.value)
  for (let i = paragraph.startIdx; i <= paragraph.endIdx; i++) {
    newSet.delete(i)
  }
  userBreaks.value = newSet
  verificationResult.value = null
}

// 切換段落
function goToParagraph(idx: number) {
  if (idx < 0 || idx >= paragraphs.value.length) return
  currentParagraphIdx.value = idx
  verificationResult.value = null
  
  // 更新閱讀進度
  const progress = ((idx + 1) / paragraphs.value.length) * 100
  readingStore.updateProgress(textId.value, progress, idx)
}

// 顯示註釋 tooltip
function showTooltip(annotation: TextAnnotation, event: MouseEvent) {
  activeTooltip.value = {
    annotation,
    x: event.clientX,
    y: event.clientY
  }
}

// 隱藏 tooltip
function hideTooltip() {
  activeTooltip.value = null
}

// 朗讀當前段落
async function readCurrentParagraph() {
  if (!currentParagraph.value || isPlaying.value) return
  
  isPlaying.value = true
  const text = currentParagraph.value.chars.join('')
  
  try {
    // 使用太虛幻境 TTS
    if (typeof window !== 'undefined' && (window as any).taixuSpeak) {
      await (window as any).taixuSpeak(text, { voice: 'zh-CN-XiaoxiaoNeural' })
    } else {
      // 回退到瀏覽器語音
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.8
      utterance.onend = () => { isPlaying.value = false }
      speechSynthesis.speak(utterance)
      return
    }
  } catch (e) {
    console.error('TTS 播放失敗:', e)
  } finally {
    isPlaying.value = false
  }
}

// 切換書籤
async function toggleBookmark() {
  if (!authStore.isAuthenticated) {
    alert('請先登入以使用書籤功能')
    return
  }
  await readingStore.toggleBookmark(textId.value)
}

// 返回列表
function goBack() {
  router.push({ name: 'reading-list' })
}

// 獲取斷句狀態類
function getBreakClass(globalIdx: number) {
  const classes: string[] = []
  const { breaks: correctBreaks } = parsedContent.value
  
  if (showPunctuation.value) {
    // 顯示模式：顯示正確斷句
    if (correctBreaks.has(globalIdx)) {
      classes.push('has-break', 'correct')
    }
  } else {
    // 隱藏模式：顯示用戶斷句
    if (userBreaks.value.has(globalIdx)) {
      classes.push('has-break', 'user-marked')
      
      // 如果有驗證結果，顯示對錯
      if (verificationResult.value) {
        if (verificationResult.value.correct.includes(globalIdx)) {
          classes.push('verified-correct')
        } else if (verificationResult.value.extra.includes(globalIdx)) {
          classes.push('verified-extra')
        }
      }
    } else if (verificationResult.value?.missed.includes(globalIdx)) {
      // 顯示遺漏的位置
      classes.push('has-break', 'verified-missed')
    }
  }
  
  return classes
}

// 載入文章
onMounted(async () => {
  await readingStore.fetchTextDetail(textId.value)
  
  // 恢復閱讀進度
  if (readingStore.currentText?.progress) {
    currentParagraphIdx.value = readingStore.currentText.progress.last_paragraph
  }
})

// 清理
onUnmounted(() => {
  speechSynthesis.cancel()
})

// 監聽顯示模式切換
watch(showPunctuation, (newVal) => {
  if (newVal) {
    // 切換到顯示模式時清除驗證結果
    verificationResult.value = null
  }
})
</script>

<template>
  <div class="reading-detail-page">
    <!-- 頂部工具列 -->
    <header class="reading-header edamame-glass">
      <button class="back-btn" @click="goBack">
        ← 返回
      </button>
      
      <div class="header-title">
        <h1>{{ readingStore.currentText?.title || '載入中...' }}</h1>
        <span v-if="readingStore.currentText?.author" class="author">
          {{ readingStore.currentText.author }}
        </span>
      </div>
      
      <div class="header-actions">
        <button 
          class="action-btn bookmark-btn"
          :class="{ active: readingStore.currentText?.progress?.bookmarked }"
          @click="toggleBookmark"
          title="收藏"
        >
          {{ readingStore.currentText?.progress?.bookmarked ? '⭐' : '☆' }}
        </button>
      </div>
    </header>
    
    <!-- 控制列 -->
    <section class="control-bar edamame-glass">
      <div class="mode-toggle">
        <button 
          class="mode-btn"
          :class="{ active: showPunctuation }"
          @click="showPunctuation = true"
        >
          🔘 顯示斷句
        </button>
        <button 
          class="mode-btn"
          :class="{ active: !showPunctuation }"
          @click="showPunctuation = false"
        >
          ○ 隱藏斷句
        </button>
      </div>
      
      <button 
        class="tts-btn"
        :disabled="isPlaying"
        @click="readCurrentParagraph"
      >
        🔊 {{ isPlaying ? '播放中...' : '朗讀' }}
      </button>
    </section>
    
    <!-- 閱讀區域 -->
    <section class="reading-content edamame-glass" v-if="readingStore.currentText && currentParagraph">
      <div class="content-hint" v-if="!showPunctuation">
        點擊字間空隙添加斷句，完成後點擊「驗證」
      </div>
      
      <div class="reading-line">
        <span
          v-for="(char, localIdx) in currentParagraph.chars"
          :key="localIdx"
          class="char-unit"
        >
          <!-- 字符 -->
          <span 
            class="char"
            :class="{ 
              'has-annotation': isAnnotationStart(currentParagraph.startIdx + localIdx),
              'annotation-range': getAnnotationForChar(currentParagraph.startIdx + localIdx)
            }"
            @mouseenter="(e) => {
              const ann = getAnnotationForChar(currentParagraph.startIdx + localIdx)
              if (ann && isAnnotationStart(currentParagraph.startIdx + localIdx)) showTooltip(ann, e)
            }"
            @mouseleave="hideTooltip"
            @click="(e) => {
              const ann = getAnnotationForChar(currentParagraph.startIdx + localIdx)
              if (ann) {
                e.stopPropagation()
                showTooltip(ann, e)
              }
            }"
          >{{ char }}</span>
          
          <!-- 斷句位置（最後一個字後面不需要） -->
          <button
            v-if="localIdx < currentParagraph.chars.length - 1"
            class="break-slot"
            :class="getBreakClass(currentParagraph.startIdx + localIdx)"
            @click="toggleUserBreak(localIdx)"
            :disabled="showPunctuation"
          >
            <span class="break-marker"></span>
          </button>
        </span>
      </div>
      
      <!-- 驗證結果 -->
      <div v-if="verificationResult" class="verification-result">
        <div class="result-stats">
          <span class="stat correct">✓ 正確：{{ verificationResult.correct.length }}</span>
          <span class="stat missed">○ 遺漏：{{ verificationResult.missed.length }}</span>
          <span class="stat extra">✗ 多餘：{{ verificationResult.extra.length }}</span>
          <span class="stat accuracy">
            正確率：{{ Math.round(verificationResult.accuracy * 100) }}%
          </span>
        </div>
        <button class="show-answer-btn" @click="showAnswer">
          查看正確答案
        </button>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="content-actions">
        <template v-if="!showPunctuation">
          <button class="edamame-btn edamame-btn-secondary" @click="resetParagraph">
            重置
          </button>
          <button 
            class="edamame-btn edamame-btn-primary" 
            @click="verifyParagraph"
            :disabled="userBreaks.size === 0"
          >
            ✓ 驗證我的斷句
          </button>
        </template>
      </div>
    </section>
    
    <!-- 載入中 -->
    <section v-else-if="readingStore.isLoading" class="loading-state edamame-glass">
      <span class="loading-spinner"></span>
      載入中...
    </section>
    
    <!-- 段落導航 -->
    <section class="paragraph-nav edamame-glass" v-if="paragraphs.length > 1">
      <button 
        class="nav-btn prev"
        :disabled="currentParagraphIdx === 0"
        @click="goToParagraph(currentParagraphIdx - 1)"
      >
        ← 上一段
      </button>
      
      <span class="nav-info">
        段落 {{ currentParagraphIdx + 1 }} / {{ paragraphs.length }}
      </span>
      
      <button 
        class="nav-btn next"
        :disabled="currentParagraphIdx === paragraphs.length - 1"
        @click="goToParagraph(currentParagraphIdx + 1)"
      >
        下一段 →
      </button>
    </section>
    
    <!-- 來源關聯 -->
    <section 
      v-if="readingStore.currentText?.source_text" 
      class="source-link edamame-glass"
    >
      來自《{{ readingStore.currentText.source_text.title }}》
      <router-link 
        :to="{ name: 'reading-detail', params: { id: readingStore.currentText.source_text.id }}"
      >
        閱讀全文 →
      </router-link>
    </section>
    
    <!-- 註釋 Tooltip -->
    <Teleport to="body">
      <div 
        v-if="activeTooltip"
        class="annotation-tooltip"
        :style="{ 
          left: activeTooltip.x + 'px', 
          top: (activeTooltip.y + 20) + 'px' 
        }"
        @click.stop
      >
        <div class="tooltip-term">{{ activeTooltip.annotation.term }}</div>
        <div class="tooltip-content">{{ activeTooltip.annotation.annotation }}</div>
        <button class="tooltip-close" @click="hideTooltip">×</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.reading-detail-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

/* 頂部工具列 */
.reading-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.back-btn {
  border: none;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.header-title {
  flex: 1;
  text-align: center;
}

.header-title h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--color-neutral-800);
}

.header-title .author {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  border: none;
  background: rgba(0, 0, 0, 0.04);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.bookmark-btn.active {
  background: rgba(255, 193, 7, 0.15);
}

/* 控制列 */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
}

.mode-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.mode-btn.active {
  background: var(--color-primary-500);
  color: white;
}

.tts-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tts-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.tts-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 閱讀區域 */
.reading-content {
  padding: 1.5rem;
}

.content-hint {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(139, 178, 79, 0.1);
  border-radius: var(--radius-md);
}

.reading-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  line-height: 2.4;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.char-unit {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.char {
  font-size: var(--text-2xl);
  font-family: var(--font-main, 'Noto Serif TC', serif);
  color: var(--color-neutral-800);
  transition: all 0.2s ease;
}

/* 帶註釋的字符 */
.char.has-annotation {
  border-bottom: 2px dotted var(--color-primary-400);
  cursor: help;
}

.char.annotation-range {
  color: var(--color-primary-700);
}

.char.has-annotation:hover {
  background: rgba(139, 178, 79, 0.15);
}

/* 斷句位置 */
.break-slot {
  width: 20px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 -2px;
  position: relative;
}

.break-slot:disabled {
  cursor: default;
}

.break-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s ease;
}

.break-slot:not(:disabled):hover .break-marker {
  background: rgba(139, 178, 79, 0.3);
}

/* 顯示斷句的狀態 */
.break-slot.has-break .break-marker {
  background: var(--color-primary-500);
  box-shadow: 0 1px 3px rgba(85, 139, 47, 0.4);
}

.break-slot.correct .break-marker {
  background: linear-gradient(145deg, #a8d45a 0%, #7cb342 50%, #558b2f 100%);
}

.break-slot.user-marked .break-marker {
  background: var(--color-primary-400);
}

/* 驗證後的狀態 */
.break-slot.verified-correct .break-marker {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.break-slot.verified-extra .break-marker {
  background: #ef4444;
  animation: shake 0.3s ease;
}

.break-slot.verified-missed .break-marker {
  background: #f59e0b;
  animation: pulse 1s ease infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

/* 驗證結果 */
.verification-result {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  text-align: center;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.stat {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.stat.correct { color: #22c55e; }
.stat.missed { color: #f59e0b; }
.stat.extra { color: #ef4444; }
.stat.accuracy { color: var(--color-primary-600); }

.show-answer-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.show-answer-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 操作按鈕 */
.content-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

/* 載入狀態 */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-neutral-500);
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary-200);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 段落導航 */
.paragraph-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-info {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

/* 來源關聯 */
.source-link {
  padding: 0.75rem 1rem;
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  text-align: center;
}

.source-link a {
  color: var(--color-primary-600);
  text-decoration: none;
  margin-left: 0.5rem;
}

.source-link a:hover {
  text-decoration: underline;
}

/* 註釋 Tooltip */
.annotation-tooltip {
  position: fixed;
  z-index: 1000;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 0.75rem 1rem;
  max-width: 280px;
  animation: tooltip-in 0.2s ease;
}

@keyframes tooltip-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-term {
  font-weight: var(--font-semibold);
  color: var(--color-primary-700);
  margin-bottom: 0.25rem;
}

.tooltip-content {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  line-height: 1.5;
}

.tooltip-close {
  position: absolute;
  top: 0.25rem;
  right: 0.5rem;
  border: none;
  background: none;
  font-size: 1.25rem;
  color: var(--color-neutral-400);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tooltip-close:hover {
  color: var(--color-neutral-600);
}

/* 響應式 */
@media (max-width: 768px) {
  .reading-header {
    flex-wrap: wrap;
  }
  
  .header-title {
    order: 3;
    width: 100%;
    margin-top: 0.5rem;
  }
  
  .control-bar {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .char {
    font-size: var(--text-xl);
  }
  
  .result-stats {
    gap: 0.75rem;
  }
  
  .content-actions {
    flex-direction: column;
  }
  
  .content-actions button {
    width: 100%;
  }
}
</style>

