<template>
  <div class="drawing-toolbar">
    <!-- 工具按鈕 -->
    <div class="margin-bottom-small">
      <!-- 畫筆 -->
      <button
        @click="setTool('pen')"
        :class="[
          'paper-btn btn-block margin-bottom-small',
          tool === 'pen' ? 'btn-primary' : 'btn-secondary'
        ]"
        title="畫筆"
      >
        ✏️ 畫筆
      </button>

      <!-- 橡皮擦 -->
      <button
        @click="setTool('eraser')"
        :class="[
          'paper-btn btn-block',
          tool === 'eraser' ? 'btn-danger' : 'btn-secondary'
        ]"
        title="橡皮擦"
      >
        🧹 橡皮擦
      </button>
    </div>

    <!-- 顏色調色板（24色網格） -->
    <div v-if="tool === 'pen'" class="margin-bottom-small">
      <label class="text-small">顏色</label>
      <div class="row" style="margin-top: 0.5rem;">
        <div
          v-for="c in colors"
          :key="c"
          @click="setColor(c)"
          :class="[
            'col-3',
            color === c ? 'border' : ''
          ]"
          :style="{
            backgroundColor: c,
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            border: color === c ? `3px solid var(--border-color)` : `1px solid var(--border-light)`,
            margin: '2px'
          }"
          :aria-label="`選擇顏色 ${c}`"
        ></div>
      </div>

      <!-- 當前選中顏色（大色塊） -->
      <div class="margin-top-small">
        <label class="text-small">當前顏色</label>
        <div
          class="border"
          style="width: 100%; height: 50px; margin-top: 0.5rem; border-color: var(--border-color);"
          :style="{ backgroundColor: color }"
        ></div>
      </div>
    </div>

    <!-- 畫筆大小 -->
    <div class="margin-bottom-small">
      <label class="text-small">畫筆大小: {{ lineWidth }}px</label>
      <input
        v-model.number="lineWidth"
        @input="handleLineWidthChange"
        type="range"
        min="1"
        max="20"
        class="margin-top-small"
      />
    </div>

    <!-- 清空按鈕 -->
    <div>
      <button
        @click="handleClear"
        class="paper-btn btn-danger btn-block"
        title="清空畫布"
      >
        🗑️ 清空
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
  width: 100%;
}
</style>

