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
  canvasRef: _canvasRef,
  initCanvas,
  startDrawing,
  draw,
  stopDrawing,
  handleDrawingData,
} = useDrawing()

// canvasRef 在模板中使用，但 TypeScript 無法檢測到
// 使用 void 運算符避免未使用警告
void _canvasRef

const roomStore = useRoomStore()
const authStore = useAuthStore()
const { subscribeDrawing, unsubscribeRoom } = useRealtime()

const canvasElement = ref<HTMLCanvasElement | null>(null)

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

// 訂閱繪畫數據
function setupDrawingSubscription() {
  if (!roomStore.currentRoom || !authStore.user) return

  subscribeDrawing(roomStore.currentRoom.code, (stroke: Stroke) => {
    handleDrawingData(stroke)
  })
}

onMounted(() => {
  if (canvasElement.value) {
    initCanvas(canvasElement.value)
  }
  setupDrawingSubscription()
})

onUnmounted(() => {
  if (roomStore.currentRoom) {
    unsubscribeRoom(roomStore.currentRoom.code)
  }
})
</script>

<style scoped>
.drawing-canvas-container {
  @apply w-full h-full flex items-center justify-center bg-bg-primary;
}

.drawing-canvas {
  @apply border-thin border-border-light;
  background-color: #FFFFFF;
  cursor: crosshair;
  touch-action: none; /* 防止觸摸滾動 */
  max-width: 100%;
  max-height: 100%;
}
</style>

