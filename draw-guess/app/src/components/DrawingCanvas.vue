<template>
  <div class="drawing-canvas-container">
    <canvas
      ref="canvasElement"
      class="drawing-canvas"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDrawing } from '../composables/useDrawing'
import { useRealtime } from '../composables/useRealtime'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import { useDrawingStore } from '../stores/drawing'
import { useGameStore } from '../stores/game'
import type { Stroke } from '../stores/drawing'

const {
  initCanvas,
  startDrawing,
  draw,
  stopDrawing,
  handleDrawingData,
} = useDrawing()

const roomStore = useRoomStore()
const authStore = useAuthStore()
const drawingStore = useDrawingStore()
const gameStore = useGameStore()
const { subscribeDrawing } = useRealtime()

const canvasElement = ref<HTMLCanvasElement | null>(null)

// 本地清空畫布函數 - 直接操作當前組件的 canvas 元素
function localClearCanvas() {
  console.log('[DrawingCanvas] localClearCanvas 被調用')
  
  if (!canvasElement.value) {
    console.warn('[DrawingCanvas] canvas 元素不存在')
    return
  }
  
  const canvas = canvasElement.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.warn('[DrawingCanvas] 無法獲取 ctx')
    return
  }
  
  // 使用 CSS 尺寸清空
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  
  // 重置 canvas 尺寸（這會自動清空內容）
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)
  
  // 填充白色背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, rect.width, rect.height)
  
  // 清空筆觸記錄
  drawingStore.clearStrokes()
  
  console.log('[DrawingCanvas] 畫布已清空')
}

// 監聽 currentRound.id 變化，新輪次開始時清空畫布
// 組件現在始終掛載（不會被 v-if 銷毀），所以簡單 watch 即可
watch(
  () => gameStore.currentRound?.id,
  (newRoundId, oldRoundId) => {
    console.log('[DrawingCanvas] watch currentRound.id:', { oldRoundId, newRoundId })
    
    // 輪次 ID 變化時清空畫布
    if (newRoundId && newRoundId !== oldRoundId) {
      console.log('[DrawingCanvas] 新輪次開始，清空畫布')
      localClearCanvas()
    }
  }
)

// 暴露清空方法給父組件
defineExpose({
  clearCanvas: localClearCanvas
})

// 鼠標事件處理
function handleMouseDown(event: MouseEvent) {
  startDrawing(event)
}

function handleMouseMove(event: MouseEvent) {
  draw(event)
}

function handleMouseUp() {
  stopDrawing()
}

function handleMouseLeave() {
  stopDrawing()
}

// 觸摸事件處理
function handleTouchStart(event: TouchEvent) {
  startDrawing(event)
}

function handleTouchMove(event: TouchEvent) {
  draw(event)
}

function handleTouchEnd() {
  stopDrawing()
}

// 保存取消訂閱函數
let unsubscribeDrawingCallback: (() => void) | null = null

// 訂閱繪畫數據
function setupDrawingSubscription() {
  if (!roomStore.currentRoom || !authStore.user) return

  // subscribeDrawing 現在返回取消訂閱函數
  unsubscribeDrawingCallback = subscribeDrawing(roomStore.currentRoom.code, (stroke: Stroke) => {
    handleDrawingData(stroke)
  })
}

onMounted(() => {
  console.log('[DrawingCanvas] onMounted - 組件掛載')
  
  if (canvasElement.value) {
    // initCanvas 內部會清空畫布並清空 strokes
    initCanvas(canvasElement.value)
  }
  
  setupDrawingSubscription()
})

onUnmounted(() => {
  // 只取消繪畫回調，不取消整個房間訂閱
  if (unsubscribeDrawingCallback) {
    unsubscribeDrawingCallback()
    unsubscribeDrawingCallback = null
  }
})
</script>

<style scoped>
.drawing-canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  position: relative;
  /* 防止移動端觸摸時的意外行為 */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.drawing-canvas {
  width: 100%;
  height: 100%;
  border: none;
  background-color: var(--bg-card);
  background-image: none;
  cursor: crosshair;
  touch-action: none; /* 防止觸摸滾動和縮放 */
  display: block;
  /* 防止移動端長按選擇 */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  /* 優化觸摸繪畫性能 */
  will-change: contents;
}

/* 移動端優化 */
@media (max-width: 768px) {
  .drawing-canvas-container {
    /* 確保觸摸事件正確處理 */
    overflow: hidden;
  }

  .drawing-canvas {
    /* 移動端使用手指圖標 */
    cursor: default;
  }
}
</style>

