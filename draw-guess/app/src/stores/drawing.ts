import { defineStore } from 'pinia'
import { ref } from 'vue'

// 繪畫工具類型
export type DrawingTool = 'pen' | 'eraser'

// 筆觸數據接口
export interface Stroke {
  id: string
  tool: DrawingTool
  color: string
  lineWidth: number
  points: Array<{ x: number; y: number }>
  timestamp: number
}

export const useDrawingStore = defineStore('drawing', () => {
  // 繪畫工具狀態
  const tool = ref<DrawingTool>('pen')
  const color = ref('#000000') // 默認黑色
  const lineWidth = ref(3) // 默認粗細
  const isDrawing = ref(false)

  // 繪畫歷史（用於重繪和同步）
  const strokes = ref<Stroke[]>([])

  // 工具切換
  function setTool(newTool: DrawingTool) {
    tool.value = newTool
  }

  // 顏色設置
  function setColor(newColor: string) {
    color.value = newColor
  }

  // 粗細設置
  function setLineWidth(width: number) {
    lineWidth.value = Math.max(1, Math.min(20, width))
  }

  // 添加筆觸
  function addStroke(stroke: Stroke) {
    strokes.value.push(stroke)
  }

  // 清空所有筆觸
  function clearStrokes() {
    strokes.value = []
  }

  // 設置繪畫狀態
  function setDrawing(drawing: boolean) {
    isDrawing.value = drawing
  }

  return {
    // 狀態
    tool,
    color,
    lineWidth,
    isDrawing,
    strokes,
    // 方法
    setTool,
    setColor,
    setLineWidth,
    addStroke,
    clearStrokes,
    setDrawing,
  }
})

