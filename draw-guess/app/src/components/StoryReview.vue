<template>
  <div class="story-review">
    <div class="review-container">
      <!-- 標題區域 -->
      <header class="review-header">
        <h1 class="story-title">
          <PhBookOpenText :size="28" weight="duotone" class="title-icon" />
          {{ displayTitle }}
        </h1>
        <div class="story-meta">
          <span class="meta-item">
            <PhUsers :size="16" weight="fill" />
            {{ participants.length }} 位創作者
          </span>
          <span class="meta-item">
            <PhFilmStrip :size="16" weight="fill" />
            {{ panelCount }} 個分鏡
          </span>
        </div>
      </header>

      <!-- 分鏡漫畫展示區域 -->
      <div class="storyboard-panels" ref="panelsRef">
        <!-- 故事開頭 -->
        <div 
          v-if="storyOpening" 
          class="story-panel opening-panel"
        >
          <div class="panel-badge opening-badge">
            <PhSparkle :size="14" weight="fill" /> 故事開頭
          </div>
          <div class="panel-content text-panel">
            <p class="panel-text opening-text">{{ storyOpening.content }}</p>
          </div>
          <div class="panel-author" v-if="storyOpening.authorName">
            <PhPen :size="14" weight="fill" />
            <span>{{ storyOpening.authorName }}</span>
          </div>
        </div>

        <!-- 分鏡內容（圖文合併顯示） -->
        <div 
          v-for="(panel, index) in comicPanels" 
          :key="panel.roundNumber"
          class="story-panel comic-panel"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <!-- 分鏡標籤 -->
          <div class="panel-badge comic-badge">
            <PhFilmStrip :size="14" weight="fill" /> 第 {{ panel.roundNumber }} 鏡
          </div>
          
          <!-- 圖像區域 -->
          <div class="panel-content comic-image-section" v-if="panel.image">
            <img 
              :src="panel.image.content" 
              :alt="`第 ${panel.roundNumber} 鏡畫作`"
              class="panel-image"
              loading="lazy"
              @error="handleImageError"
            />
            <div class="image-author" v-if="panel.image.authorName">
              <PhPaintBrush :size="12" weight="fill" />
              <span>{{ panel.image.authorName }}</span>
            </div>
          </div>
          
          <!-- 文字區域（對話氣泡風格） -->
          <div class="panel-content comic-text-section" v-if="panel.text">
            <div class="comic-speech-bubble">
              <p class="panel-text">{{ panel.text.content }}</p>
            </div>
            <div class="text-author" v-if="panel.text.authorName">
              <PhPen :size="12" weight="fill" />
              <span>{{ panel.text.authorName }}</span>
            </div>
          </div>
        </div>

        <!-- 故事結尾（如果有） -->
        <div 
          v-if="storyEnding" 
          class="story-panel ending-panel"
        >
          <div class="panel-badge ending-badge">
            <PhStar :size="14" weight="fill" /> 故事結尾
          </div>
          <div class="panel-content text-panel">
            <p class="panel-text ending-text">{{ storyEnding.content }}</p>
          </div>
          <div class="panel-author" v-if="storyEnding.authorName">
            <PhPen :size="14" weight="fill" />
            <span>{{ storyEnding.authorName }}</span>
          </div>
        </div>

        <!-- 完結標記 -->
        <div class="story-end-mark">
          <PhSealCheck :size="32" weight="duotone" class="end-icon" />
          <span class="end-text">完</span>
        </div>
      </div>

      <!-- 排行榜和貢獻統計 -->
      <div class="stats-section" v-if="scores.length > 0">
        <h2 class="section-title">
          <PhTrophy :size="22" weight="duotone" class="section-icon" />
          創作者排行榜
        </h2>
        <div class="leaderboard">
          <div 
            v-for="(player, index) in sortedScores" 
            :key="player.userId"
            class="leaderboard-item"
            :class="{ 
              'is-first': index === 0,
              'is-second': index === 1,
              'is-third': index === 2
            }"
          >
            <div class="rank-badge">
              <PhCrown v-if="index === 0" :size="18" weight="fill" class="crown-icon" />
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
            <div class="player-info">
              <span class="player-name">{{ player.nickname }}</span>
              <div class="player-stats">
                <span class="stat-item" v-if="player.sentenceWins > 0">
                  <PhPen :size="12" weight="fill" /> {{ player.sentenceWins }} 句勝出
                </span>
                <span class="stat-item" v-if="player.drawingCount > 0">
                  <PhPaintBrush :size="12" weight="fill" /> {{ player.drawingCount }} 幅畫作
                </span>
              </div>
            </div>
            <div class="player-score">
              {{ player.totalScore }} 分
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按鈕區域 -->
      <div class="action-buttons">
        <button 
          class="action-btn btn-primary"
          :disabled="isSaving"
          @click="handleSaveAsPdf"
        >
          <PhDownloadSimple v-if="!isSaving" :size="20" weight="bold" />
          <PhSpinnerGap v-else :size="20" weight="bold" class="spin-icon" />
          {{ isSaving ? '生成中...' : '保存故事' }}
        </button>
        <button 
          class="action-btn btn-secondary"
          @click="handleGoHome"
        >
          <PhHouse :size="20" weight="bold" />
          返回首頁
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
/**
 * StoryReview 組件 - 分鏡接龍模式的故事回顧頁面
 * 
 * 以分鏡漫畫形式展示完整的故事鏈，包含：
 * - 圖文交替的分鏡展示
 * - 每個分鏡的作者標註
 * - 創作者排行榜和貢獻統計
 * - 重新開始和返回首頁按鈕
 * 
 * Requirements: 8.2, 8.3, 8.4, 8.6, 8.7
 */

import { ref, computed } from 'vue'
import {
  PhBookOpenText,
  PhUsers,
  PhFilmStrip,
  PhSparkle,
  PhPaintBrush,
  PhPen,
  PhStar,
  PhSealCheck,
  PhTrophy,
  PhCrown,
  PhDownloadSimple,
  PhSpinnerGap,
  PhHouse
} from '@phosphor-icons/vue'
import type { StoryChainItem, PlayerScore, Participant } from '../types/storyboard'

// ============================================
// Props 定義
// Requirements: 8.2, 8.3, 8.4, 8.7
// ============================================

interface Props {
  /** 故事鏈數據 */
  storyChain: StoryChainItem[]
  /** 故事標題（房間名稱或故事開頭） */
  title: string
  /** 參與者列表 */
  participants: Participant[]
  /** 玩家得分和貢獻統計 */
  scores: PlayerScore[]
}

const props = withDefaults(defineProps<Props>(), {
  storyChain: () => [],
  title: '',
  participants: () => [],
  scores: () => []
})

// ============================================
// Emits 定義
// Requirements: 8.6
// ============================================

const emit = defineEmits<{
  /** 返回首頁 */
  (e: 'go-home'): void
}>()

// ============================================
// Refs
// ============================================

const panelsRef = ref<HTMLElement | null>(null)

// ============================================
// 狀態
// ============================================

const isSaving = ref(false)

// ============================================
// 計算屬性
// ============================================

/**
 * 顯示的標題
 * Requirements: 8.7 - 使用房間名稱或故事開頭
 */
const displayTitle = computed(() => {
  if (props.title) return props.title
  // 如果沒有標題，使用故事開頭的前 20 個字符
  if (storyOpening.value) {
    const content = storyOpening.value.content
    return content.length > 20 ? content.slice(0, 20) + '...' : content
  }
  return '我們的故事'
})

/**
 * 故事開頭（第一個文字項目，roundNumber = 0）
 */
const storyOpening = computed(() => {
  return props.storyChain.find(
    item => item.itemType === 'text' && item.roundNumber === 0
  ) || null
})

/**
 * 故事結尾（最後一個 roundNumber 為 -1 的文字項目，如果有的話）
 */
const storyEnding = computed(() => {
  return props.storyChain.find(
    item => item.itemType === 'text' && item.roundNumber === -1
  ) || null
})

/**
 * 漫畫分鏡數據（將圖像和對應文字配對）
 * 每個分鏡包含同一輪次的圖像和文字
 * Requirements: 8.2, 8.3 - 圖文合併展示
 */
interface ComicPanel {
  roundNumber: number
  image: StoryChainItem | null
  text: StoryChainItem | null
}

const comicPanels = computed<ComicPanel[]>(() => {
  // 過濾掉故事開頭（roundNumber = 0）和結尾（roundNumber = -1）
  const panels = props.storyChain.filter(
    item => item.roundNumber > 0 && item.roundNumber !== -1
  )
  
  // 按輪次分組
  const panelMap = new Map<number, ComicPanel>()
  
  for (const item of panels) {
    if (!panelMap.has(item.roundNumber)) {
      panelMap.set(item.roundNumber, {
        roundNumber: item.roundNumber,
        image: null,
        text: null
      })
    }
    
    const panel = panelMap.get(item.roundNumber)!
    if (item.itemType === 'image') {
      panel.image = item
    } else if (item.itemType === 'text') {
      panel.text = item
    }
  }
  
  // 按輪次排序返回
  return Array.from(panelMap.values()).sort((a, b) => a.roundNumber - b.roundNumber)
})

/**
 * 分鏡數量
 */
const panelCount = computed(() => {
  return props.storyChain.filter(item => item.itemType === 'image').length
})

/**
 * 按得分排序的玩家列表
 * Requirements: 9.5 - 最終排行榜
 */
const sortedScores = computed(() => {
  return [...props.scores].sort((a, b) => b.totalScore - a.totalScore)
})

// ============================================
// 方法
// ============================================

/**
 * 處理圖片載入錯誤
 */
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect fill="%23f0f0f0" width="200" height="150"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E圖片載入失敗%3C/text%3E%3C/svg%3E'
}

/**
 * 將圖片 URL 載入為 Image 對象
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`圖片載入失敗: ${url}`))
    img.src = url
  })
}

/**
 * 處理保存為 PDF
 * 使用 Canvas 渲染，與頁面顯示風格完全一致
 * 每頁容納 2 個分鏡
 */
async function handleSaveAsPdf() {
  if (isSaving.value) return
  
  isSaving.value = true
  
  try {
    // 動態導入 jsPDF
    const { jsPDF } = await import('jspdf')
    
    // Canvas 尺寸（高解析度）
    const SCALE = 2.5
    const PAGE_WIDTH_PX = 595 * SCALE
    const PAGE_HEIGHT_PX = 842 * SCALE
    const MARGIN_PX = 35 * SCALE
    const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - (MARGIN_PX * 2)
    
    // 佈局常量
    const HEADER_HEIGHT_PX = 90 * SCALE      // 標題卡片高度
    const OPENING_HEIGHT_PX = 85 * SCALE     // 開頭區域高度
    const PANEL_IMAGE_HEIGHT_PX = 180 * SCALE // 分鏡圖片高度
    const PANEL_TEXT_HEIGHT_PX = 90 * SCALE   // 分鏡文字高度
    const PANEL_GAP_PX = 15 * SCALE           // 分鏡間距
    const PANEL_TOTAL_HEIGHT_PX = PANEL_IMAGE_HEIGHT_PX + PANEL_TEXT_HEIGHT_PX + PANEL_GAP_PX + 25 * SCALE
    const ENDING_HEIGHT_PX = 90 * SCALE
    
    // 顏色定義（與頁面一致）
    const COLORS = {
      bgPrimary: '#f8f4e8',
      bgCard: '#fffef9',
      bgHighlight: '#fff9e6',
      bgSecondary: '#f5f0e6',
      borderColor: '#3a3a3a',
      borderLight: '#d0c8b8',
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      textPrimary: '#2c2c2c',
      textSecondary: '#666666',
      textTertiary: '#888888',
      colorPrimary: '#e07b67',
      colorSecondary: '#6fb3b5',
      colorSuccess: '#4caf50',
      colorWarning: '#f5c518',
    }
    
    // 字體設置
    const FONT_FAMILY = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif'
    const TITLE_FONT_SIZE = 22 * SCALE
    const BADGE_FONT_SIZE = 11 * SCALE
    const TEXT_FONT_SIZE = 14 * SCALE
    const AUTHOR_FONT_SIZE = 10 * SCALE
    const META_FONT_SIZE = 11 * SCALE
    const LINE_HEIGHT = 1.6
    
    // 創建 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    })
    
    // 創建頁面 canvas（帶背景）
    function createPageCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
      const canvas = document.createElement('canvas')
      canvas.width = PAGE_WIDTH_PX
      canvas.height = PAGE_HEIGHT_PX
      const ctx = canvas.getContext('2d')!
      // 繪製漸變背景（與頁面一致）
      const gradient = ctx.createLinearGradient(0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX)
      gradient.addColorStop(0, COLORS.bgPrimary)
      gradient.addColorStop(1, COLORS.bgSecondary)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX)
      return { canvas, ctx }
    }
    
    // 輔助函數：繪製自動換行文字
    function drawWrappedText(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      fontSize: number,
      color: string = COLORS.textPrimary,
      fontWeight: string = 'normal'
    ): number {
      ctx.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`
      ctx.fillStyle = color
      ctx.textBaseline = 'top'
      
      const lineHeight = fontSize * LINE_HEIGHT
      const chars = text.split('')
      let line = ''
      let currentY = y
      
      for (const char of chars) {
        const testLine = line + char
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, x, currentY)
          line = char
          currentY += lineHeight
        } else {
          line = testLine
        }
      }
      if (line) {
        ctx.fillText(line, x, currentY)
        currentY += lineHeight
      }
      
      return currentY - y
    }
    
    // 輔助函數：繪製帶陰影的卡片（與頁面 paper.css 風格一致）
    function drawCard(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      options: {
        fillColor?: string
        borderWidth?: number
        shadowOffset?: number
      } = {}
    ) {
      const { 
        fillColor = COLORS.bgCard, 
        borderWidth = 3 * SCALE,
        shadowOffset = 5 * SCALE 
      } = options
      
      // 繪製陰影
      ctx.fillStyle = COLORS.shadowColor
      ctx.fillRect(x + shadowOffset, y + shadowOffset, width, height)
      
      // 繪製卡片背景
      ctx.fillStyle = fillColor
      ctx.fillRect(x, y, width, height)
      
      // 繪製邊框
      ctx.strokeStyle = COLORS.borderColor
      ctx.lineWidth = borderWidth
      ctx.strokeRect(x, y, width, height)
    }
    
    // 輔助函數：繪製分鏡標籤
    function drawBadge(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      text: string,
      bgColor: string
    ) {
      ctx.font = `bold ${BADGE_FONT_SIZE}px ${FONT_FAMILY}`
      const textWidth = ctx.measureText(text).width
      const padding = 8 * SCALE
      const height = BADGE_FONT_SIZE + padding * 2
      const width = textWidth + padding * 2
      
      // 繪製背景
      ctx.fillStyle = bgColor
      ctx.fillRect(x, y, width, height)
      
      // 繪製文字
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, x + padding, y + height / 2)
    }
    
    // 輔助函數：繪製對話氣泡
    function drawSpeechBubble(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number
    ) {
      const radius = 10 * SCALE
      const arrowSize = 10 * SCALE
      
      // 繪製陰影
      ctx.fillStyle = COLORS.shadowColor
      ctx.beginPath()
      ctx.roundRect(x + 3 * SCALE, y + 3 * SCALE, width, height, radius)
      ctx.fill()
      
      // 繪製氣泡主體
      ctx.fillStyle = COLORS.bgCard
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, radius)
      ctx.fill()
      
      // 繪製邊框
      ctx.strokeStyle = COLORS.borderLight
      ctx.lineWidth = 2 * SCALE
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, radius)
      ctx.stroke()
      
      // 繪製三角形尖角（指向上方）
      const arrowX = x + 25 * SCALE
      ctx.fillStyle = COLORS.bgCard
      ctx.beginPath()
      ctx.moveTo(arrowX, y - arrowSize + 2)
      ctx.lineTo(arrowX + arrowSize, y + 2)
      ctx.lineTo(arrowX - arrowSize, y + 2)
      ctx.closePath()
      ctx.fill()
      
      ctx.strokeStyle = COLORS.borderLight
      ctx.beginPath()
      ctx.moveTo(arrowX - arrowSize, y)
      ctx.lineTo(arrowX, y - arrowSize)
      ctx.lineTo(arrowX + arrowSize, y)
      ctx.stroke()
    }
    
    // 收集所有頁面
    const pages: HTMLCanvasElement[] = []
    let { canvas: currentCanvas, ctx } = createPageCanvas()
    let currentY = MARGIN_PX
    let panelsOnCurrentPage = 0
    
    function needNewPage(requiredHeight: number): boolean {
      return currentY + requiredHeight > PAGE_HEIGHT_PX - MARGIN_PX
    }
    
    function addNewPage() {
      pages.push(currentCanvas)
      const newPage = createPageCanvas()
      currentCanvas = newPage.canvas
      ctx = newPage.ctx
      currentY = MARGIN_PX
      panelsOnCurrentPage = 0
    }
    
    // ========== 1. 繪製標題卡片 ==========
    const title = displayTitle.value || '分鏡故事'
    drawCard(ctx, MARGIN_PX, currentY, CONTENT_WIDTH_PX, HEADER_HEIGHT_PX)
    
    // 標題文字
    ctx.font = `bold ${TITLE_FONT_SIZE}px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, PAGE_WIDTH_PX / 2, currentY + HEADER_HEIGHT_PX / 2 - 10 * SCALE)
    
    // 元信息
    ctx.font = `${META_FONT_SIZE}px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.textSecondary
    const metaText = `${props.participants.length} 位創作者 · ${panelCount.value} 個分鏡`
    ctx.fillText(metaText, PAGE_WIDTH_PX / 2, currentY + HEADER_HEIGHT_PX / 2 + 20 * SCALE)
    ctx.textAlign = 'left'
    
    currentY += HEADER_HEIGHT_PX + 20 * SCALE
    
    // ========== 2. 繪製故事開頭 ==========
    if (storyOpening.value) {
      drawCard(ctx, MARGIN_PX, currentY, CONTENT_WIDTH_PX, OPENING_HEIGHT_PX, {
        fillColor: COLORS.bgCard
      })
      
      // 開頭標籤（金色漸變，與邊框保持距離）
      drawBadge(ctx, MARGIN_PX + 8 * SCALE, currentY + 8 * SCALE, '✦ 故事開頭', COLORS.colorWarning)
      
      // 內容（標籤偏移後，文字也相應下移）
      drawWrappedText(
        ctx,
        storyOpening.value.content,
        MARGIN_PX + 15 * SCALE,
        currentY + 45 * SCALE,
        CONTENT_WIDTH_PX - 30 * SCALE,
        TEXT_FONT_SIZE,
        COLORS.textPrimary
      )
      
      // 作者（增加與底部邊框的距離）
      if (storyOpening.value.authorName) {
        ctx.font = `${AUTHOR_FONT_SIZE}px ${FONT_FAMILY}`
        ctx.fillStyle = COLORS.textTertiary
        ctx.textAlign = 'right'
        ctx.fillText(`— ${storyOpening.value.authorName}`, MARGIN_PX + CONTENT_WIDTH_PX - 20 * SCALE, currentY + OPENING_HEIGHT_PX - 18 * SCALE)
        ctx.textAlign = 'left'
      }
      
      currentY += OPENING_HEIGHT_PX + 15 * SCALE
    }
    
    // ========== 3. 繪製分鏡 ==========
    const panels = comicPanels.value
    const BADGE_HEIGHT = BADGE_FONT_SIZE + 16 * SCALE // 標籤高度
    
    for (const panel of panels) {
      if (panelsOnCurrentPage >= 2 || needNewPage(PANEL_TOTAL_HEIGHT_PX)) {
        addNewPage()
      }
      
      // 繪製分鏡卡片（留出標籤空間和氣泡空間）
      // 計算：標籤高度 + 間距 + 圖片高度 + 間距 + 氣泡高度 + 底部間距
      const bubbleHeight = PANEL_TEXT_HEIGHT_PX + 5 * SCALE
      const cardHeight = BADGE_HEIGHT + 5 * SCALE + PANEL_IMAGE_HEIGHT_PX + 15 * SCALE + bubbleHeight + 10 * SCALE
      drawCard(ctx, MARGIN_PX, currentY, CONTENT_WIDTH_PX, cardHeight)
      
      // 分鏡標籤（在卡片內部，與邊框保持距離）
      drawBadge(ctx, MARGIN_PX + 8 * SCALE, currentY + 8 * SCALE, `🎬 第 ${panel.roundNumber} 鏡`, COLORS.colorSecondary)
      
      // 圖片區域背景（在標籤下方）
      const imageY = currentY + BADGE_HEIGHT + 5 * SCALE
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(MARGIN_PX + 3 * SCALE, imageY, CONTENT_WIDTH_PX - 6 * SCALE, PANEL_IMAGE_HEIGHT_PX)
      
      // 載入並繪製圖片
      const panelImage = panel.image
      if (panelImage?.content) {
        try {
          const img = await loadImage(panelImage.content)
          const imgMaxWidth = CONTENT_WIDTH_PX - 20 * SCALE
          const imgMaxHeight = PANEL_IMAGE_HEIGHT_PX - 15 * SCALE
          let imgWidth = imgMaxWidth
          let imgHeight = (img.naturalHeight / img.naturalWidth) * imgWidth
          if (imgHeight > imgMaxHeight) {
            imgHeight = imgMaxHeight
            imgWidth = (img.naturalWidth / img.naturalHeight) * imgHeight
          }
          const imgX = MARGIN_PX + (CONTENT_WIDTH_PX - imgWidth) / 2
          const imgY = imageY + (PANEL_IMAGE_HEIGHT_PX - imgHeight) / 2
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)
        } catch (err) {
          console.warn(`[PDF] 圖片載入失敗`, err)
          ctx.font = `${TEXT_FONT_SIZE}px ${FONT_FAMILY}`
          ctx.fillStyle = COLORS.textTertiary
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('圖片載入失敗', MARGIN_PX + CONTENT_WIDTH_PX / 2, imageY + PANEL_IMAGE_HEIGHT_PX / 2)
          ctx.textAlign = 'left'
        }
        
        // 圖片作者標籤
        if (panelImage.authorName) {
          const authorText = `🎨 ${panelImage.authorName}`
          ctx.font = `${AUTHOR_FONT_SIZE}px ${FONT_FAMILY}`
          const authorWidth = ctx.measureText(authorText).width + 10 * SCALE
          const authorX = MARGIN_PX + CONTENT_WIDTH_PX - authorWidth - 10 * SCALE
          const authorY = imageY + PANEL_IMAGE_HEIGHT_PX - 25 * SCALE
          
          // 背景
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.fillRect(authorX, authorY, authorWidth, 20 * SCALE)
          
          ctx.fillStyle = COLORS.textSecondary
          ctx.textBaseline = 'middle'
          ctx.fillText(authorText, authorX + 5 * SCALE, authorY + 10 * SCALE)
        }
      }
      
      // 繪製文字區域（對話氣泡）
      const textY = imageY + PANEL_IMAGE_HEIGHT_PX + 15 * SCALE
      drawSpeechBubble(ctx, MARGIN_PX + 10 * SCALE, textY, CONTENT_WIDTH_PX - 20 * SCALE, bubbleHeight)
      
      const panelText = panel.text
      if (panelText?.content) {
        drawWrappedText(
          ctx,
          panelText.content,
          MARGIN_PX + 25 * SCALE,
          textY + 15 * SCALE,
          CONTENT_WIDTH_PX - 50 * SCALE,
          TEXT_FONT_SIZE,
          COLORS.textPrimary
        )
        
        // 文字作者（增加與底部邊框的距離）
        if (panelText.authorName) {
          ctx.font = `${AUTHOR_FONT_SIZE}px ${FONT_FAMILY}`
          ctx.fillStyle = COLORS.textTertiary
          ctx.textAlign = 'right'
          ctx.fillText(`✍️ ${panelText.authorName}`, MARGIN_PX + CONTENT_WIDTH_PX - 30 * SCALE, textY + bubbleHeight - 15 * SCALE)
          ctx.textAlign = 'left'
        }
      }
      
      currentY += cardHeight + PANEL_GAP_PX
      panelsOnCurrentPage++
    }
    
    // ========== 4. 繪製故事結尾 ==========
    if (storyEnding.value) {
      if (needNewPage(ENDING_HEIGHT_PX + 30 * SCALE)) {
        addNewPage()
      }
      
      currentY += 10 * SCALE
      
      drawCard(ctx, MARGIN_PX, currentY, CONTENT_WIDTH_PX, ENDING_HEIGHT_PX, {
        fillColor: COLORS.bgCard
      })
      
      // 結尾標籤（紅色，與邊框保持距離）
      drawBadge(ctx, MARGIN_PX + 8 * SCALE, currentY + 8 * SCALE, '★ 故事結尾', COLORS.colorPrimary)
      
      // 內容（標籤偏移後，文字也相應下移）
      drawWrappedText(
        ctx,
        storyEnding.value.content,
        MARGIN_PX + 15 * SCALE,
        currentY + 45 * SCALE,
        CONTENT_WIDTH_PX - 30 * SCALE,
        TEXT_FONT_SIZE,
        COLORS.textPrimary
      )
      
      if (storyEnding.value.authorName) {
        ctx.font = `${AUTHOR_FONT_SIZE}px ${FONT_FAMILY}`
        ctx.fillStyle = COLORS.textTertiary
        ctx.textAlign = 'right'
        ctx.fillText(`— ${storyEnding.value.authorName}`, MARGIN_PX + CONTENT_WIDTH_PX - 20 * SCALE, currentY + ENDING_HEIGHT_PX - 18 * SCALE)
        ctx.textAlign = 'left'
      }
      
      currentY += ENDING_HEIGHT_PX + 20 * SCALE
    }
    
    // ========== 5. 繪製完結標記 ==========
    if (needNewPage(60 * SCALE)) {
      addNewPage()
    }
    currentY += 25 * SCALE
    
    // 完結卡片
    const endCardWidth = 100 * SCALE
    const endCardHeight = 50 * SCALE
    const endCardX = (PAGE_WIDTH_PX - endCardWidth) / 2
    drawCard(ctx, endCardX, currentY, endCardWidth, endCardHeight)
    
    ctx.font = `bold ${TITLE_FONT_SIZE}px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.textSecondary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('完', PAGE_WIDTH_PX / 2, currentY + endCardHeight / 2)
    ctx.textAlign = 'left'
    
    // 添加最後一頁
    pages.push(currentCanvas)
    
    // ========== 6. 將所有 Canvas 頁面轉為 PDF ==========
    for (let i = 0; i < pages.length; i++) {
      const pageCanvas = pages[i]
      if (!pageCanvas) continue
      if (i > 0) pdf.addPage()
      const pageData = pageCanvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(pageData, 'JPEG', 0, 0, 595, 842)
    }
    
    // 保存 PDF
    const filename = `${title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')}_分鏡故事.pdf`
    pdf.save(filename)
    
    console.log('[StoryReview] PDF 已生成並下載:', filename, `共 ${pages.length} 頁`)
  } catch (err) {
    console.error('[StoryReview] PDF 生成失敗:', err)
    alert('PDF 生成失敗，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

/**
 * 處理返回首頁
 * Requirements: 8.6
 */
function handleGoHome() {
  emit('go-home')
}
</script>



<style scoped>
/* ============================================
   基礎佈局
   ============================================ */

.story-review {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding: 1rem;
  overflow-y: auto;
}

.review-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ============================================
   標題區域
   Requirements: 8.7 - 顯示故事標題
   ============================================ */

.review-header {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--shadow-color);
  animation: headerFadeIn 0.6s ease-out;
}

@keyframes headerFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.story-title {
  font-size: 1.8rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  line-height: 1.3;
}

.title-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.story-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* ============================================
   分鏡漫畫展示區域
   Requirements: 8.2, 8.3, 8.4
   ============================================ */

.storyboard-panels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 分鏡面板基礎樣式 */
.story-panel {
  background: var(--bg-card);
  border: 3px solid var(--border-color);
  border-radius: 0;
  box-shadow: 4px 4px 0 var(--shadow-color);
  overflow: hidden;
  animation: panelSlideIn 0.5s ease-out both;
  position: relative;
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 分鏡標籤 */
.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-head);
  color: white;
  background: var(--color-secondary);
  padding: 0.35rem 0.75rem;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.opening-badge {
  background: linear-gradient(135deg, #f5c518, #e6a800);
  color: #333;
}

.ending-badge {
  background: linear-gradient(135deg, #e07b67, #c9604c);
}

/* 分鏡內容區域 */
.panel-content {
  padding: 0;
}

/* ============================================
   漫畫分鏡樣式 - 圖文合併顯示
   ============================================ */

.comic-panel {
  overflow: visible;
}

.comic-badge {
  background: linear-gradient(135deg, var(--color-secondary), #5a9ea0);
}

/* 圖像區域 */
.comic-image-section {
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  position: relative;
}

.panel-image {
  width: 100%;
  height: auto;
  max-height: 350px;
  object-fit: contain;
  display: block;
  /* 覆蓋 PaperCSS 的手繪風格圖片邊框 */
  border: none;
  border-radius: 0;
}

.image-author {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.9);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* 文字區域 - 對話氣泡風格 */
.comic-text-section {
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
  border-top: 2px dashed var(--border-light);
}

.comic-speech-bubble {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

/* 對話氣泡尖角指向上方的圖像 */
.comic-speech-bubble::before {
  content: '';
  position: absolute;
  left: 24px;
  top: -10px;
  border-width: 0 10px 10px 10px;
  border-style: solid;
  border-color: transparent transparent var(--border-light) transparent;
}

.comic-speech-bubble::after {
  content: '';
  position: absolute;
  left: 26px;
  top: -7px;
  border-width: 0 8px 8px 8px;
  border-style: solid;
  border-color: transparent transparent var(--bg-card) transparent;
}

.text-author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

.panel-text {
  font-family: var(--font-body);
  font-size: 1.1rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

/* 舊的文字分鏡樣式（保留兼容性） */
.text-panel {
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--bg-highlight), var(--bg-secondary));
}

.text-panel-wrapper .text-panel {
  padding: 1rem 1.5rem;
}

.speech-bubble {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.speech-bubble::before {
  content: '';
  position: absolute;
  left: 20px;
  top: -10px;
  border-width: 0 10px 10px 10px;
  border-style: solid;
  border-color: transparent transparent var(--border-light) transparent;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  left: 22px;
  top: -7px;
  border-width: 0 8px 8px 8px;
  border-style: solid;
  border-color: transparent transparent var(--bg-card) transparent;
}

.opening-text {
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
}

.ending-text {
  font-size: 1.15rem;
  font-style: italic;
  text-align: center;
}

/* 故事開頭面板 */
.opening-panel {
  border-color: #f5c518;
  box-shadow: 4px 4px 0 rgba(245, 197, 24, 0.4);
}

.opening-panel .text-panel {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
}

/* 故事結尾面板 */
.ending-panel {
  border-color: var(--color-primary);
  box-shadow: 4px 4px 0 rgba(224, 123, 103, 0.4);
}

.ending-panel .text-panel {
  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
}

/* 作者標註 */
/* Requirements: 8.4 - 標註作者名稱 */
.panel-author {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-top: 2px dashed var(--border-light);
}

/* 完結標記 */
.story-end-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-tertiary);
  animation: endMarkFadeIn 0.8s ease-out 0.5s both;
}

@keyframes endMarkFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.end-icon {
  color: var(--color-success);
}

.end-text {
  font-size: 1.5rem;
  font-family: var(--font-head);
  font-weight: bold;
  color: var(--text-secondary);
}

/* ============================================
   排行榜和貢獻統計
   Requirements: 9.5, 9.6
   ============================================ */

.stats-section {
  background: var(--bg-card);
  border: 4px solid var(--border-color);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--shadow-color);
  padding: 1.25rem;
  animation: statsFadeIn 0.6s ease-out 0.3s both;
}

@keyframes statsFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-family: var(--font-head);
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.section-icon {
  color: var(--color-warning);
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: 0;
  transition: all 0.2s ease;
}

.leaderboard-item:hover {
  transform: translateX(4px);
  border-color: var(--border-color);
}

.leaderboard-item.is-first {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-color: #f5c518;
}

.leaderboard-item.is-second {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
  border-color: #bdbdbd;
}

.leaderboard-item.is-third {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-color: #ffb74d;
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.leaderboard-item.is-first .rank-badge {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #333;
}

.leaderboard-item.is-second .rank-badge {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.leaderboard-item.is-third .rank-badge {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}

.crown-icon {
  color: #333;
}

.rank-number {
  font-family: var(--font-head);
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 0.25rem;
}

.player-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.player-score {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: var(--font-head);
  color: var(--color-success);
  flex-shrink: 0;
}

/* ============================================
   操作按鈕區域
   Requirements: 8.6
   ============================================ */

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1rem 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  border: 3px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.action-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--shadow-color);
}

.action-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background: #c9604c;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

/* 旋轉動畫 */
.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================
   滾動條樣式
   ============================================ */

.story-review::-webkit-scrollbar {
  width: 8px;
}

.story-review::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.story-review::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 4px;
}

.story-review::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

/* ============================================
   移動端優化
   ============================================ */

@media (max-width: 768px) {
  .story-review {
    padding: 0.5rem;
  }

  .review-container {
    gap: 1rem;
  }

  .review-header {
    padding: 1rem;
    box-shadow: 4px 4px 0 var(--shadow-color);
  }

  .story-title {
    font-size: 1.4rem;
    flex-direction: column;
    gap: 0.35rem;
  }

  .story-meta {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .story-panel {
    box-shadow: 3px 3px 0 var(--shadow-color);
  }

  .panel-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }

  .panel-text {
    font-size: 1rem;
  }

  .opening-text,
  .ending-text {
    font-size: 1.05rem;
  }

  .text-panel {
    padding: 1rem;
  }

  .speech-bubble {
    padding: 0.75rem 1rem;
  }

  .panel-author {
    font-size: 0.75rem;
    padding: 0.4rem 0.6rem;
  }

  .stats-section {
    padding: 1rem;
    box-shadow: 4px 4px 0 var(--shadow-color);
  }

  .section-title {
    font-size: 1.1rem;
  }

  .leaderboard-item {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .rank-badge {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }

  .player-name {
    font-size: 0.9rem;
  }

  .player-stats {
    gap: 0.5rem;
  }

  .stat-item {
    font-size: 0.7rem;
  }

  .player-score {
    font-size: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    box-shadow: 3px 3px 0 var(--shadow-color);
  }
}

/* 小屏幕進一步優化 */
@media (max-width: 480px) {
  .review-header {
    padding: 0.75rem;
  }

  .story-title {
    font-size: 1.2rem;
  }

  .image-panel .panel-content {
    min-height: 150px;
  }

  .panel-image {
    max-height: 300px;
  }

  .story-end-mark {
    padding: 1.5rem;
  }

  .end-text {
    font-size: 1.2rem;
  }
}
</style>
