<template>
  <div :class="['drawing-toolbar', { 'toolbar-horizontal': horizontal }]">
    <!-- 工具按鈕 -->
    <div class="toolbar-section tools-section">
      <!-- 畫筆 -->
      <button
        @click="setTool('pen')"
        :class="['tool-btn', { active: tool === 'pen' }]"
        title="畫筆"
      >
        <PhPencilSimple :size="20" weight="bold" />
      </button>

      <!-- 橡皮擦 -->
      <button
        @click="setTool('eraser')"
        :class="['tool-btn', { active: tool === 'eraser', eraser: true }]"
        title="橡皮擦"
      >
        <PhEraser :size="20" weight="bold" />
      </button>

      <!-- 清空按鈕 -->
      <button @click="handleClear" class="tool-btn clear-btn" title="清空畫布">
        <PhTrash :size="20" weight="bold" />
      </button>
    </div>

    <!-- 顏色調色板 -->
    <div v-if="tool === 'pen'" class="toolbar-section colors-section">
      <div :class="['color-grid', { 'color-grid-horizontal': horizontal }]">
        <div
          v-for="c in colors"
          :key="c"
          @click="setColor(c)"
          :class="['color-cell', { selected: color === c }]"
          :style="{ backgroundColor: c }"
          :title="c"
        ></div>
      </div>
    </div>

    <!-- 畫筆大小 -->
    <div class="toolbar-section size-section">
      <div :class="['size-dots', { 'size-dots-horizontal': horizontal }]">
        <div 
          v-for="size in [2, 5, 10, 15]" 
          :key="size"
          @click="setLineWidthValue(size)"
          :class="['size-dot', { active: lineWidth === size }]"
          :style="{ width: `${size + 8}px`, height: `${size + 8}px` }"
          :title="`${size}px`"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhPencilSimple, PhEraser, PhTrash } from '@phosphor-icons/vue'
import { useDrawingStore } from '../stores/drawing'
import { useDrawing } from '../composables/useDrawing'

defineProps<{
  compact?: boolean
  horizontal?: boolean
}>()

const drawingStore = useDrawingStore()
const { setTool: setDrawingTool, setColor: setDrawingColor, setLineWidth: setDrawingLineWidth, clearCanvas } = useDrawing()

// 24色調色板（參考 Gartic.io）
const colors = [
  '#000000', '#FFFFFF', '#808080', '#C0C0C0',
  '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
  '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
  '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
  '#800000', '#804000', '#808000', '#008000',
  '#008080', '#000080', '#800080', '#400040',
]

const tool = computed(() => drawingStore.tool)
const color = computed(() => drawingStore.color)
const lineWidth = computed(() => drawingStore.lineWidth)

function setTool(newTool: 'pen' | 'eraser') {
  setDrawingTool(newTool)
}

function setColor(newColor: string) {
  setDrawingColor(newColor)
}

function setLineWidthValue(size: number) {
  drawingStore.setLineWidth(size)
  setDrawingLineWidth(size)
}

async function handleClear() {
  if (confirm('確定要清空畫布嗎？')) {
    await clearCanvas()
  }
}
</script>

<style scoped>
.drawing-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem;
}

/* 橫向佈局 */
.toolbar-horizontal {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 0.6rem 1rem;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toolbar-horizontal .toolbar-section {
  flex-direction: row;
  align-items: center;
}

.toolbar-horizontal .tools-section {
  gap: 0.35rem;
}

/* 工具按鈕 */
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.6rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
  width: 44px;
  height: 44px;
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.tool-btn:hover {
  background: var(--bg-hover);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.tool-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--shadow-color);
}

.tool-btn.active {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
  color: white;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2);
}

.tool-btn.active.eraser {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.tool-btn.clear-btn {
  background: var(--bg-secondary);
}

.tool-btn.clear-btn:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

/* 顏色網格 */
.colors-section {
  padding: 0.25rem 0;
}

.toolbar-horizontal .colors-section {
  padding: 0;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.color-grid-horizontal {
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.color-cell {
  width: 100%;
  aspect-ratio: 1;
  min-width: 20px;
  min-height: 20px;
  border: 2px solid var(--border-light);
  border-radius: 6px;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

.color-cell:hover {
  transform: scale(1.15);
  z-index: 1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.color-cell.selected {
  border: 3px solid var(--text-primary);
  box-shadow: 0 0 0 2px white inset, 0 2px 8px rgba(0,0,0,0.3);
  transform: scale(1.1);
}

/* 畫筆大小 */
.size-section {
  padding: 0.5rem 0;
  border-top: 2px dashed var(--border-light);
  border-bottom: 2px dashed var(--border-light);
}

.toolbar-horizontal .size-section {
  padding: 0 0.75rem;
  border-top: none;
  border-bottom: none;
  border-left: 2px dashed var(--border-light);
  border-right: 2px dashed var(--border-light);
}

.size-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.size-dots-horizontal {
  flex-direction: row;
}

.size-dot {
  background: var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.size-dot:hover {
  opacity: 0.7;
  transform: scale(1.1);
}

.size-dot.active {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px var(--bg-card), 0 0 0 5px var(--color-secondary);
}
</style>

