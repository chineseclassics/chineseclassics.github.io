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
import { ref, onMounted, onUnmounted } from 'vue'
import { useDrawing } from '../composables/useDrawing'
import { useRealtime } from '../composables/useRealtime'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import type { Stroke } from '../stores/drawing'

const {
  initCanvas,
  startDrawing,
  draw,
  stopDrawing,
  handleDrawingData,
  clearCanvas,
} = useDrawing()

const roomStore = useRoomStore()
const authStore = useAuthStore()
const { subscribeDrawing } = useRealtime()

const canvasElement = ref<HTMLCanvasElement | null>(null)

// 監聽清空畫布事件
function handleClearCanvasEvent() {
  console.log('[DrawingCanvas] 收到清空畫布事件')
  clearCanvas()
}

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
  if (canvasElement.value) {
    initCanvas(canvasElement.value)
  }
  setupDrawingSubscription()
  
  // 監聽清空畫布事件
  window.addEventListener('clearCanvas', handleClearCanvasEvent)
})

onUnmounted(() => {
  // 只取消繪畫回調，不取消整個房間訂閱
  if (unsubscribeDrawingCallback) {
    unsubscribeDrawingCallback()
    unsubscribeDrawingCallback = null
  }
  
  // 移除清空畫布事件監聽
  window.removeEventListener('clearCanvas', handleClearCanvasEvent)
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
}

.drawing-canvas {
  width: 100%;
  height: 100%;
  border: none;
  background-color: var(--bg-card);
  background-image: none;
  cursor: crosshair;
  touch-action: none; /* 防止觸摸滾動 */
  display: block;
}
</style>

