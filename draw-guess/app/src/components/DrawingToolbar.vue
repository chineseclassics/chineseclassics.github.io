<template>
  <div class="drawing-toolbar">
    <!-- 工具切換 -->
    <div class="flex gap-2 mb-4">
      <button
        @click="setTool('pen')"
        :class="[
          'btn-minimal px-3 py-2',
          tool === 'pen' ? 'bg-bg-secondary border-border-medium' : ''
        ]"
      >
        畫筆
      </button>
      <button
        @click="setTool('eraser')"
        :class="[
          'btn-minimal px-3 py-2',
          tool === 'eraser' ? 'bg-bg-secondary border-border-medium' : ''
        ]"
      >
        橡皮擦
      </button>
    </div>

    <!-- 顏色選擇 -->
    <div v-if="tool === 'pen'" class="mb-4">
      <label class="block text-xs text-text-secondary mb-2">顏色</label>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="c in colors"
          :key="c"
          @click="setColor(c)"
          :class="[
            'w-8 h-8 rounded-minimal border-thin transition-all',
            color === c ? 'border-border-medium scale-110' : 'border-border-light'
          ]"
          :style="{ backgroundColor: c }"
          :aria-label="`選擇顏色 ${c}`"
        />
      </div>
    </div>

    <!-- 粗細調整 -->
    <div class="mb-4">
      <label class="block text-xs text-text-secondary mb-2">
        粗細: {{ lineWidth }}px
      </label>
      <input
        v-model.number="lineWidth"
        @input="handleLineWidthChange"
        type="range"
        min="1"
        max="20"
        class="w-full"
      />
    </div>

    <!-- 清空按鈕 -->
    <button
      @click="handleClear"
      class="btn-minimal w-full"
    >
      清空畫布
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { useDrawing } from '../composables/useDrawing'

const drawingStore = useDrawingStore()
const { setTool: setDrawingTool, setColor: setDrawingColor, setLineWidth: setDrawingLineWidth, clearCanvas } = useDrawing()

// 預設顏色
const colors = [
  '#000000', // 黑色
  '#FF0000', // 紅色
  '#00FF00', // 綠色
  '#0000FF', // 藍色
  '#FFFF00', // 黃色
  '#FF00FF', // 洋紅
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#808080', // 灰色
]

const tool = computed(() => drawingStore.tool)
const color = computed(() => drawingStore.color)
const lineWidth = computed({
  get: () => drawingStore.lineWidth,
  set: (value) => drawingStore.setLineWidth(value),
})

function handleLineWidthChange() {
  setDrawingLineWidth(lineWidth.value)
}

function setTool(tool: 'pen' | 'eraser') {
  setDrawingTool(tool)
}

function setColor(newColor: string) {
  setDrawingColor(newColor)
}

function handleClear() {
  if (confirm('確定要清空畫布嗎？')) {
    clearCanvas()
  }
}
</script>

<style scoped>
.drawing-toolbar {
  @apply p-4 card-minimal;
  min-width: 200px;
}

input[type="range"] {
  @apply appearance-none h-1 bg-bg-secondary rounded-minimal;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 rounded-full bg-text-primary cursor-pointer;
}

input[type="range"]::-moz-range-thumb {
  @apply w-4 h-4 rounded-full bg-text-primary cursor-pointer border-none;
}
</style>

