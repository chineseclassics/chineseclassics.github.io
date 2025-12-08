<template>
  <div class="drawing-toolbar">
    <!-- 工具按鈕（垂直排列，參考 Gartic.io） -->
    <div class="flex flex-col gap-1 p-2">
      <!-- 畫筆 -->
      <button
        @click="setTool('pen')"
        :class="[
          'w-12 h-12 rounded-lg flex items-center justify-center transition-all',
          tool === 'pen' 
            ? 'bg-blue-500 text-white shadow-md' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        title="畫筆"
      >
        <i class="fas fa-pencil-alt text-lg"></i>
      </button>

      <!-- 橡皮擦 -->
      <button
        @click="setTool('eraser')"
        :class="[
          'w-12 h-12 rounded-lg flex items-center justify-center transition-all',
          tool === 'eraser' 
            ? 'bg-blue-500 text-white shadow-md' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        title="橡皮擦"
      >
        <i class="fas fa-eraser text-lg"></i>
      </button>
    </div>

    <!-- 分隔線 -->
    <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

    <!-- 顏色調色板（24色網格，參考 Gartic.io） -->
    <div v-if="tool === 'pen'" class="p-2">
      <div class="grid grid-cols-4 gap-1 mb-2">
        <button
          v-for="c in colors"
          :key="c"
          @click="setColor(c)"
          :class="[
            'w-8 h-8 rounded border-2 transition-all',
            color === c 
              ? 'border-gray-800 dark:border-gray-200 scale-110 shadow-md' 
              : 'border-gray-300 dark:border-gray-600 hover:scale-105'
          ]"
          :style="{ backgroundColor: c }"
          :aria-label="`選擇顏色 ${c}`"
        />
      </div>

      <!-- 當前選中顏色（大色塊） -->
      <div class="mt-2">
        <div
          class="w-full h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
          :style="{ backgroundColor: color }"
        ></div>
      </div>
    </div>

    <!-- 分隔線 -->
    <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

    <!-- 畫筆大小（垂直滑塊，參考 Gartic.io） -->
    <div class="p-2">
      <div class="flex flex-col items-center gap-2">
        <input
          v-model.number="lineWidth"
          @input="handleLineWidthChange"
          type="range"
          min="1"
          max="20"
          orient="vertical"
          class="w-2 h-32 vertical-slider"
        />
        <div class="text-xs text-text-secondary">{{ lineWidth }}px</div>
      </div>

      <!-- 畫筆大小指示器（4個點） -->
      <div class="flex flex-col items-center gap-1 mt-2">
        <div
          v-for="(size, index) in brushSizes"
          :key="index"
          :class="[
            'rounded-full border-2 transition-all',
            lineWidth >= size.min && lineWidth <= size.max
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700'
          ]"
          :style="{ width: `${size.size}px`, height: `${size.size}px` }"
        ></div>
      </div>
    </div>

    <!-- 分隔線 -->
    <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

    <!-- 清空按鈕 -->
    <div class="p-2">
      <button
        @click="handleClear"
        class="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
        title="清空畫布"
      >
        <i class="fas fa-trash-alt mr-1"></i>
        清空
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { useDrawing } from '../composables/useDrawing'

const drawingStore = useDrawingStore()
const { setTool: setDrawingTool, setColor: setDrawingColor, setLineWidth: setDrawingLineWidth, clearCanvas } = useDrawing()

// 24色調色板（參考 Gartic.io）
const colors = [
  '#000000', // 黑色
  '#FFFFFF', // 白色
  '#808080', // 灰色
  '#C0C0C0', // 淺灰
  '#FF0000', // 紅色
  '#FF8000', // 橙色
  '#FFFF00', // 黃色
  '#80FF00', // 黃綠
  '#00FF00', // 綠色
  '#00FF80', // 青綠
  '#00FFFF', // 青色
  '#0080FF', // 天藍
  '#0000FF', // 藍色
  '#8000FF', // 紫藍
  '#FF00FF', // 洋紅
  '#FF0080', // 粉紅
  '#800000', // 深紅
  '#804000', // 棕色
  '#808000', // 橄欖
  '#008000', // 深綠
  '#008080', // 深青
  '#000080', // 深藍
  '#800080', // 紫色
  '#400040', // 深紫
]

// 畫筆大小指示器
const brushSizes = [
  { min: 1, max: 5, size: 4 },
  { min: 6, max: 10, size: 8 },
  { min: 11, max: 15, size: 12 },
  { min: 16, max: 20, size: 16 },
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
  @apply h-full flex flex-col bg-white dark:bg-gray-800;
  overflow-y: auto;
}

/* 垂直滑塊樣式 */
.vertical-slider {
  writing-mode: bt-lr; /* IE */
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  width: 8px;
  height: 128px;
  outline: none;
}

.vertical-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.vertical-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.vertical-slider::-webkit-slider-runnable-track {
  width: 8px;
  background: #e5e7eb;
  border-radius: 4px;
}

.vertical-slider::-moz-range-track {
  width: 8px;
  background: #e5e7eb;
  border-radius: 4px;
}
</style>

