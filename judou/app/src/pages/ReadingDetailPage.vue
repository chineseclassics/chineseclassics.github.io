<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReadingStore } from '@/stores/readingStore'
import { useAuthStore } from '@/stores/authStore'
import { classicalSpeak, classicalPreload, classicalStopSpeak } from '@/composables/useClassicalTTS'
import type { TextAnnotation } from '@/types/text'
import { Volume2, Square } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  hideBackButton?: boolean
  textIdProp?: string
}>(), {
  hideBackButton: false,
  textIdProp: undefined
})

const route = useRoute()
const router = useRouter()
const readingStore = useReadingStore()
const authStore = useAuthStore()

// 文章 ID：優先使用 prop，否則使用路由參數
const textId = computed(() => props.textIdProp || (route.params.id as string))

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
// 將原文按 \n\n 或 || 分段，並記錄每個字符的全局位置和斷句信息（向後兼容）
const parsedContent = computed(() => {
  if (!readingStore.currentText) return { paragraphs: [], allChars: [], allBreaks: new Set<number>() }
  
  const content = readingStore.currentText.content
  
  // 支持新的 \n\n 格式和舊的 || 格式
  const separator = content.includes('||') ? '||' : /\n\n+/
  const rawParagraphs = content.split(separator)
  
  const paragraphs: { chars: string[]; breaks: Set<number>; startIdx: number; endIdx: number }[] = []
  const allChars: string[] = []
  const allBreaks = new Set<number>()
  let globalPointer = 0
  
  for (const rawPara of rawParagraphs) {
    const paraChars: string[] = []
    const paraBreaks = new Set<number>()
    const paraStartIdx = globalPointer
    
    // 先去除段落末尾的 | 和空白字符，因為段落最後的斷句點沒有意義
    const trimmedPara = rawPara.replace(/[\|\s]+$/, '')
    
    for (const char of trimmedPara) {
      if (char === '|') {
        // 記錄斷句位置（相對於前一個字符）
        if (globalPointer > 0) {
          allBreaks.add(globalPointer - 1)
          paraBreaks.add(paraChars.length - 1)
        }
      } else if (char !== '\n' && char !== '\r') {
        allChars.push(char)
        paraChars.push(char)
        globalPointer++
      }
    }
    
    if (paraChars.length > 0) {
      paragraphs.push({
        chars: paraChars,
        breaks: paraBreaks,
        startIdx: paraStartIdx,
        endIdx: globalPointer - 1
      })
    }
  }
  
  return { paragraphs, allChars, allBreaks }
})

// 文章段落（基於 \n\n 分隔符）
const paragraphs = computed(() => {
  return parsedContent.value.paragraphs
})

// 當前閱讀進度（用於保存）
const currentParagraphIdx = ref(0)

// 獲取字符的註釋（如果有）
function getAnnotationForChar(globalIdx: number): TextAnnotation | null {
  if (!readingStore.currentText?.annotations) return null
  return readingStore.currentText.annotations.find(
    a => globalIdx >= a.start_index && globalIdx < a.end_index
  ) || null
}

// 當前懸停的註釋 ID
const hoveredAnnotationId = ref<string | null>(null)

// 檢測是否為移動設備
const isMobile = ref(false)

// 檢查字符是否屬於當前懸停的註釋
function isCharInHoveredAnnotation(globalIdx: number): boolean {
  if (!hoveredAnnotationId.value) return false
  const ann = getAnnotationForChar(globalIdx)
  return ann?.id === hoveredAnnotationId.value
}

// 檢查字符是否是註釋的第一個字
function isAnnotationStart(globalIdx: number): boolean {
  const ann = getAnnotationForChar(globalIdx)
  return ann?.start_index === globalIdx
}

// 檢查字符是否是註釋的最後一個字
function isAnnotationEnd(globalIdx: number): boolean {
  const ann = getAnnotationForChar(globalIdx)
  return ann ? (ann.end_index - 1 === globalIdx) : false
}

// 處理滑鼠進入字符（桌面版）
function handleCharMouseEnter(globalIdx: number, event: MouseEvent) {
  // 移動設備不使用滑鼠懸停
  if (isMobile.value) return
  
  const ann = getAnnotationForChar(globalIdx)
  if (ann) {
    hoveredAnnotationId.value = ann.id
    showTooltip(ann, event)
  }
}

// 處理滑鼠離開字符（桌面版）
function handleCharMouseLeave() {
  // 移動設備不使用滑鼠懸停
  if (isMobile.value) return
  
  hoveredAnnotationId.value = null
  hideTooltip()
}

// 處理字符點擊（移動版）
function handleCharClick(globalIdx: number, event: MouseEvent | TouchEvent) {
  const ann = getAnnotationForChar(globalIdx)
  if (!ann) return
  
  // 防止事件冒泡（避免觸發斷句操作）
  event.stopPropagation()
  
  // 如果點擊的是當前已顯示的註釋，則關閉
  if (activeTooltip.value && activeTooltip.value.annotation.id === ann.id) {
    hideTooltip()
    return
  }
  
  // 顯示 tooltip
  hoveredAnnotationId.value = ann.id
  
  // 等待 DOM 更新後計算位置（確保高亮狀態已更新）
  nextTick(() => {
    // 找到該註釋的第一個字符元素（使用 data-global-index 屬性）
    const firstCharElement = document.querySelector(
      `.char[data-global-index="${ann.start_index}"]`
    ) as HTMLElement
    
    // 找到該註釋的最後一個字符元素
    const lastCharElement = document.querySelector(
      `.char[data-global-index="${ann.end_index - 1}"]`
    ) as HTMLElement
    
    let clientX = 0
    let clientY = 0
    
    if (firstCharElement && lastCharElement) {
      // 計算整個註釋詞組的 bounding box
      const firstRect = firstCharElement.getBoundingClientRect()
      const lastRect = lastCharElement.getBoundingClientRect()
      
      // 使用詞組的水平中心位置
      clientX = (firstRect.left + lastRect.right) / 2
      clientY = firstRect.top
    } else if (firstCharElement) {
      // 如果只有第一個元素（單字符註釋）
      const rect = firstCharElement.getBoundingClientRect()
      clientX = rect.left + rect.width / 2
      clientY = rect.top
    } else {
      // 後備方案：使用被點擊元素的位置
      const target = event.target as HTMLElement
      if (target) {
        const rect = target.getBoundingClientRect()
        clientX = rect.left + rect.width / 2
        clientY = rect.top
      }
    }
    
    showTooltip(ann, { clientX, clientY } as MouseEvent)
  })
}

// 切換用戶斷句（使用全局索引）
function toggleUserBreak(globalIdx: number) {
  if (showPunctuation.value) return // 顯示模式下不允許操作
  
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

// 驗證全文斷句
function verifyAllBreaks() {
  const { allBreaks: correctBreaks, allChars } = parsedContent.value
  if (!allChars.length) return
  
  const correct: number[] = []
  const missed: number[] = []
  const extra: number[] = []
  
  // 檢查所有字符位置的斷句
  for (let i = 0; i < allChars.length; i++) {
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
  
  const totalCorrect = correctBreaks.size
  const accuracy = totalCorrect > 0 ? correct.length / totalCorrect : 1
  
  verificationResult.value = { correct, missed, extra, accuracy }
}

// 顯示正確答案
function showAnswer() {
  showPunctuation.value = true
  verificationResult.value = null
}

// 重置所有用戶斷句
function resetAllBreaks() {
  userBreaks.value = new Set()
  verificationResult.value = null
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
  hoveredAnnotationId.value = null
  activeTooltip.value = null
}

// 處理點擊外部區域關閉 tooltip（僅移動設備）
function handleClickOutside(event: MouseEvent | TouchEvent) {
  if (!isMobile.value || !activeTooltip.value) return
  
  const target = event.target as HTMLElement
  
  // 如果點擊的不是帶註釋的文字或 tooltip 本身，則關閉
  if (!target.closest('.char.has-annotation') && !target.closest('.annotation-tooltip')) {
    hideTooltip()
  }
}

// 生成分段的朗讀文本（按段落分割，每段帶停頓標記）
function getSegmentedTexts(): string[] {
  const { allChars, allBreaks, paragraphs } = parsedContent.value
  if (!allChars.length) return []
  
  const segments: string[] = []
  
  for (const para of paragraphs) {
    let segmentText = ''
    let lastBreakPos = para.startIdx - 1
    
    for (let i = para.startIdx; i <= para.endIdx; i++) {
      const localIdx = i - para.startIdx
      segmentText += para.chars[localIdx]
      
      const isBreak = allBreaks.has(i)
      const isParagraphEnd = i === para.endIdx
      
      // 段落結尾必須添加停頓
      if (isParagraphEnd) {
        segmentText += '。'
      } else if (isBreak) {
        const sentenceLength = i - lastBreakPos
        lastBreakPos = i
        
        // 根據句子長度選擇標點
        if (sentenceLength >= 8) {
          segmentText += '。'
        } else if (sentenceLength >= 4) {
          segmentText += '，'
        } else {
          segmentText += '、'
        }
      }
    }
    
    if (segmentText.trim()) {
      segments.push(segmentText)
    }
  }
  
  return segments
}

// 停止標記（用於中斷分段播放）
let shouldStopPlaying = false

// 停止朗讀
function stopReading() {
  shouldStopPlaying = true
  classicalStopSpeak()
  isPlaying.value = false
}

// TTS 配置
const TTS_OPTIONS = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 0.75  // Azure TTS 語速 (-25%)，適合古文朗讀
}

// 朗讀全文 / 停止朗讀（分段播放 + 預加載，快速響應）
async function toggleReadFullText() {
  if (!parsedContent.value.allChars.length) return
  
  // 如果正在播放，則停止
  if (isPlaying.value) {
    stopReading()
    return
  }
  
  isPlaying.value = true
  shouldStopPlaying = false
  
  const segments = getSegmentedTexts()
  
  try {
    // 逐段播放，同時預加載下一段
    for (let i = 0; i < segments.length; i++) {
      if (shouldStopPlaying) break
      
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
    if (!shouldStopPlaying) {
      alert('語音朗讀失敗，請稍後再試')
    }
  } finally {
    isPlaying.value = false
    shouldStopPlaying = false
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
  const { allBreaks: correctBreaks } = parsedContent.value
  
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

// 檢測移動設備
function detectMobile() {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768 ||
                   ('ontouchstart' in window || navigator.maxTouchPoints > 0)
}

// 載入文章
onMounted(async () => {
  // 檢測移動設備
  detectMobile()
  
  // 監聽窗口大小變化
  window.addEventListener('resize', detectMobile)
  
  // 移動設備：添加點擊外部關閉功能
  if (isMobile.value) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)
  }
  
  await readingStore.fetchTextDetail(textId.value)
  
  // 開始追蹤閱讀時長
  readingStore.startReadingTracking()
  
  // 恢復閱讀進度
  if (readingStore.currentText?.progress) {
    currentParagraphIdx.value = readingStore.currentText.progress.last_paragraph
  }
  
  // 等待 Vue 響應式更新完成後，預加載第一段音頻
  await nextTick()
  const segments = getSegmentedTexts()
  const firstSegment = segments[0]
  if (firstSegment) {
    // 後台預加載，不阻塞頁面（使用文言文發音修正）
    classicalPreload(firstSegment, TTS_OPTIONS)
  }
})

// 計算當前閱讀進度（基於驗證結果或顯示模式）
function calculateProgress(): number {
  if (verificationResult.value) {
    return Math.round(verificationResult.value.accuracy * 100)
  }
  if (showPunctuation.value) {
    // 在顯示模式下，假設用戶正在學習
    return 50
  }
  return 0
}

// 清理
onUnmounted(() => {
  stopReading()
  
  // 移除事件監聽器
  window.removeEventListener('resize', detectMobile)
  if (isMobile.value) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('touchend', handleClickOutside)
  }
  
  // 保存閱讀記錄
  if (textId.value && authStore.isAuthenticated) {
    const progress = calculateProgress()
    const completed = verificationResult.value?.accuracy === 1
    readingStore.saveReadingRecord(textId.value, progress, completed)
  }
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
      <button v-if="!hideBackButton" class="back-btn" @click="goBack">
        ← 返回
      </button>
      <div v-else class="back-btn-placeholder"></div>
      
      <div class="header-title">
        <h1>{{ readingStore.currentText?.title || '載入中...' }}</h1>
        <div class="title-meta">
          <span v-if="readingStore.currentText?.author" class="author">
            {{ readingStore.currentText.author }}
          </span>
          <span 
            v-if="readingStore.currentText?.source_text?.title" 
            class="source-tag"
          >
            · 選自《{{ readingStore.currentText.source_text.title }}》
          </span>
        </div>
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
      <button 
        class="punctuation-toggle" 
        @click="showPunctuation = !showPunctuation"
        :aria-pressed="showPunctuation"
        type="button"
      >
        <span class="toggle-label">顯示斷句</span>
        <span class="toggle-switch">
          <span class="toggle-track" :class="{ active: showPunctuation }">
            <span class="toggle-thumb"></span>
          </span>
        </span>
      </button>
      
      <button 
        class="tts-btn"
        :class="{ playing: isPlaying }"
        @click="toggleReadFullText"
      >
        <component :is="isPlaying ? Square : Volume2" :size="18" :stroke-width="1.5" />
        <span>{{ isPlaying ? ' 停止朗讀' : ' 朗讀全文' }}</span>
      </button>
    </section>
    
    <!-- 閱讀區域 -->
    <section class="reading-content edamame-glass" v-if="readingStore.currentText && paragraphs.length > 0">
      <!-- 全文顯示，每個段落一個區塊 -->
      <div 
        v-for="(paragraph, paraIdx) in paragraphs" 
        :key="paraIdx"
        class="paragraph-block"
      >
        <div class="reading-line">
          <span
            v-for="(char, localIdx) in paragraph.chars"
            :key="localIdx"
            class="char-unit"
          >
            <!-- 字符 -->
            <span 
              class="char"
              :class="{ 
                'has-annotation': getAnnotationForChar(paragraph.startIdx + localIdx),
                'annotation-hovered': isCharInHoveredAnnotation(paragraph.startIdx + localIdx),
                'annotation-start': isAnnotationStart(paragraph.startIdx + localIdx),
                'annotation-end': isAnnotationEnd(paragraph.startIdx + localIdx)
              }"
              :data-global-index="paragraph.startIdx + localIdx"
              @mouseenter="(e) => handleCharMouseEnter(paragraph.startIdx + localIdx, e)"
              @mouseleave="handleCharMouseLeave"
              @click="(e) => handleCharClick(paragraph.startIdx + localIdx, e)"
              @touchend="(e) => handleCharClick(paragraph.startIdx + localIdx, e)"
            >{{ char }}</span>
            
            <!-- 斷句位置（最後一個字後面不需要） -->
            <button
              v-if="localIdx < paragraph.chars.length - 1"
              class="break-slot"
              :class="getBreakClass(paragraph.startIdx + localIdx)"
              @click="toggleUserBreak(paragraph.startIdx + localIdx)"
              :disabled="showPunctuation"
            >
              <span class="break-marker"></span>
            </button>
          </span>
        </div>
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
          <button class="edamame-btn edamame-btn-secondary" @click="resetAllBreaks">
            重置
          </button>
          <button 
            class="edamame-btn edamame-btn-primary" 
            @click="verifyAllBreaks"
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
    
    
    <!-- 註釋 Tooltip -->
    <Teleport to="body">
      <div 
        v-if="activeTooltip"
        class="annotation-tooltip"
        :class="{ 'mobile-tooltip': isMobile }"
        :style="{ 
          left: activeTooltip.x + 'px', 
          top: (activeTooltip.y + 16) + 'px' 
        }"
        @click.stop
      >
        <button 
          v-if="isMobile" 
          class="tooltip-close-btn"
          @click="hideTooltip"
          aria-label="關閉註釋"
        >
          ✕
        </button>
        <div class="tooltip-term">
          {{ activeTooltip.annotation.term }}
          <span v-if="activeTooltip.annotation.pinyin" class="tooltip-pinyin">（{{ activeTooltip.annotation.pinyin }}）</span>
        </div>
        <div class="tooltip-content">{{ activeTooltip.annotation.annotation }}</div>
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
  width: 100%;
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

.back-btn-placeholder {
  width: 0;
  flex-shrink: 0;
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

.title-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.header-title .author {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
}

.header-title .source-tag {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
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

/* 斷句開關 */
.punctuation-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(139, 178, 79, 0.2);
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.punctuation-toggle:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(139, 178, 79, 0.3);
}

.toggle-label {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  font-weight: var(--font-medium);
}

.toggle-switch {
  display: inline-flex;
  align-items: center;
}

.toggle-track {
  width: 36px;
  height: 20px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-track.active {
  background: linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-500) 100%);
  box-shadow: 0 2px 6px rgba(139, 178, 79, 0.35);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-track.active .toggle-thumb {
  transform: translateX(16px);
}

.tts-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tts-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.tts-btn.playing {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.tts-btn.playing:hover {
  background: var(--color-primary-200);
}

/* 閱讀區域 */
.reading-content {
  padding: 1.5rem;
}

/* 段落區塊 */
.paragraph-block {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px dashed rgba(139, 178, 79, 0.2);
}

.paragraph-block:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.reading-line {
  line-height: 2.2;
  padding: 0.5rem 0;
  padding-left: 2em; /* 首行縮進 */
}

.char-unit {
  display: inline-flex;
  align-items: center;
  vertical-align: baseline;
}

.char {
  font-size: var(--text-xl);
  font-family: var(--font-main, 'LXGW WenKai TC', serif);
  color: var(--color-neutral-800);
  transition: all 0.2s ease;
  letter-spacing: 0.12em;
}

/* 帶註釋的字符 */
.char.has-annotation {
  color: var(--color-primary-700);
  cursor: help;
  transition: all 0.15s ease;
  position: relative;
  user-select: none; /* 防止移動設備上選中文字 */
  -webkit-tap-highlight-color: transparent; /* 移除移動設備點擊高亮 */
}

/* 移動設備上的註釋字符 */
@media (max-width: 768px) {
  .char.has-annotation {
    cursor: pointer;
    touch-action: manipulation; /* 優化觸摸響應 */
  }
}

/* 使用偽元素創建連續底線 */
.char.has-annotation::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: -0.12em; /* 延伸到字間距區域 */
  height: 1.5px;
  background: repeating-linear-gradient(
    to right,
    var(--color-primary-400) 0,
    var(--color-primary-400) 3px,
    transparent 3px,
    transparent 5px
  );
}

/* 最後一個字的底線不延伸 */
.char.has-annotation.annotation-end::after {
  right: 0;
}

/* 整個詞組懸停時高亮 */
.char.has-annotation.annotation-hovered {
  color: var(--color-primary-800);
  background: rgba(139, 178, 79, 0.15);
}

/* 詞組首尾字的圓角 */
.char.has-annotation.annotation-hovered.annotation-start {
  border-radius: 3px 0 0 3px;
}

.char.has-annotation.annotation-hovered.annotation-end {
  border-radius: 0 3px 3px 0;
}

/* 單字註釋的圓角 */
.char.has-annotation.annotation-hovered.annotation-start.annotation-end {
  border-radius: 3px;
}

/* 斷句位置 */
.break-slot {
  width: 10px;
  height: 1em;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  padding: 0;
  margin: 0 1px;
  position: relative;
}

.break-slot:disabled {
  cursor: default;
}

.break-marker {
  width: 6px;
  height: 6px;
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



/* 註釋 Tooltip */
.annotation-tooltip {
  position: fixed;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(139, 178, 79, 0.25);
  border-radius: 4px;
  box-shadow: 0 3px 12px rgba(85, 139, 47, 0.15), 0 1px 4px rgba(0, 0, 0, 0.05);
  padding: 0.5rem 0.75rem;
  max-width: 280px;
  animation: tooltip-in 0.12s ease-out;
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  line-height: 1.5;
  pointer-events: auto; /* 移動設備上允許交互 */
}

/* 移動設備上的 Tooltip */
.annotation-tooltip.mobile-tooltip {
  position: fixed;
  max-width: calc(100vw - 2rem);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 178, 79, 0.4);
}

/* Tooltip 關閉按鈕 */
.tooltip-close-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-600);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tooltip-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.tooltip-close-btn:active {
  transform: scale(0.95);
}

/* 移動設備上 tooltip 內容需要右側留出關閉按鈕空間 */
.annotation-tooltip.mobile-tooltip .tooltip-term,
.annotation-tooltip.mobile-tooltip .tooltip-content {
  padding-right: 1.5rem;
}

.tooltip-term {
  font-weight: var(--font-medium);
  margin-bottom: 0.25rem;
  color: var(--color-primary-600);
}

.tooltip-pinyin {
  font-size: 0.9em;
  color: var(--color-primary-500);
  margin-left: 0.25rem;
  font-weight: var(--font-normal);
}

.tooltip-content {
  color: var(--color-neutral-700);
}

@keyframes tooltip-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: nowrap;
    align-items: center;
  }
  
  .punctuation-toggle {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.625rem;
    gap: 0.5rem;
  }
  
  .toggle-label {
    font-size: var(--text-xs);
    white-space: nowrap;
  }
  
  .toggle-switch {
    flex-shrink: 0;
  }
  
  .tts-btn {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    font-size: var(--text-xs);
    gap: 0.375rem;
  }
  
  .tts-btn span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

