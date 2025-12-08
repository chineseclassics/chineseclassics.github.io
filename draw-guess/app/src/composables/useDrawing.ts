import { ref } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { getCanvasCoordinates, drawStroke, generateStrokeId, redrawCanvas, type Stroke } from '../lib/canvas-utils'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import { useRealtime } from './useRealtime'

export function useDrawing() {
  const drawingStore = useDrawingStore()
  const roomStore = useRoomStore()
  const authStore = useAuthStore()
  const { sendDrawing } = useRealtime()

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const ctxRef = ref<CanvasRenderingContext2D | null>(null)
  const currentStroke = ref<Stroke | null>(null)
  const lastPoint = ref<{ x: number; y: number } | null>(null)

  // 節流相關
  let throttleTimer: number | null = null
  const THROTTLE_DELAY = 50 // 50ms 節流

  // 初始化 Canvas
  function initCanvas(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      console.error('無法獲取 Canvas 上下文')
      return
    }

    ctxRef.value = ctx

    // 設置 Canvas 尺寸（考慮高 DPI）
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)
    ctx.canvas.width = rect.width
    ctx.canvas.height = rect.height

    // 設置默認樣式
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 重繪已有筆觸
    if (canvasRef.value) {
      redrawCanvas(canvasRef.value, drawingStore.strokes)
    }
  }

  // 開始繪畫
  function startDrawing(event: MouseEvent | TouchEvent) {
    if (!canvasRef.value) return

    event.preventDefault()
    drawingStore.setDrawing(true)

    const coords = getCanvasCoordinates(canvasRef.value, event)
    if (!coords) return

    // 創建新筆觸
    currentStroke.value = {
      id: generateStrokeId(),
      tool: drawingStore.tool,
      color: drawingStore.color,
      lineWidth: drawingStore.lineWidth,
      points: [coords],
      timestamp: Date.now(),
    }

    lastPoint.value = coords
  }

  // 繪畫中
  function draw(event: MouseEvent | TouchEvent) {
    if (!canvasRef.value || !ctxRef.value || !drawingStore.isDrawing || !currentStroke.value) return

    event.preventDefault()
    const coords = getCanvasCoordinates(canvasRef.value, event)
    if (!coords || !lastPoint.value) return

    // 繪製線條
    const ctx = ctxRef.value
    ctx.save()

    if (currentStroke.value.tool === 'pen') {
      ctx.strokeStyle = currentStroke.value.color
      ctx.lineWidth = currentStroke.value.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    } else if (currentStroke.value.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = currentStroke.value.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    ctx.beginPath()
    ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    ctx.restore()

    // 添加到筆觸點列表
    currentStroke.value.points.push(coords)
    lastPoint.value = coords

    // 節流發送數據
    if (throttleTimer === null) {
      throttleTimer = window.setTimeout(() => {
        sendStrokeData()
        throttleTimer = null
      }, THROTTLE_DELAY)
    }
  }

  // 結束繪畫
  function stopDrawing() {
    if (!drawingStore.isDrawing || !currentStroke.value) return

    drawingStore.setDrawing(false)

    // 發送最後的筆觸數據
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    sendStrokeData()

    currentStroke.value = null
    lastPoint.value = null
  }

  // 發送筆觸數據（通過 Supabase Realtime）
  async function sendStrokeData() {
    if (!currentStroke.value || !roomStore.currentRoom || !authStore.user) return

    try {
      // 包含用戶 ID，讓接收端可以過濾自己的消息
      const strokeWithUser = {
        ...currentStroke.value,
        userId: authStore.user.id,
      }
      console.log('[sendStrokeData] 發送筆觸數據:', strokeWithUser.id)
      await sendDrawing(roomStore.currentRoom.code, strokeWithUser)
    } catch (error) {
      console.error('[sendStrokeData] 發送繪畫數據失敗:', error)
    }
  }

  // 接收繪畫數據（來自其他玩家）
  function handleDrawingData(stroke: Stroke & { userId?: string }) {
    if (!canvasRef.value || !ctxRef.value) return

    // 過濾自己發送的消息
    if (stroke.userId && authStore.user && stroke.userId === authStore.user.id) {
      console.log('[handleDrawingData] 忽略自己的筆觸:', stroke.id)
      return
    }

    console.log('[handleDrawingData] 接收到其他玩家的筆觸:', stroke.id)

    // 添加到筆觸列表
    drawingStore.addStroke(stroke)

    // 立即繪製
    drawStroke(ctxRef.value, stroke)
  }

  // 清空畫布
  function clearCanvas() {
    if (!canvasRef.value || !ctxRef.value) return

    const ctx = ctxRef.value
    const canvas = canvasRef.value

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawingStore.clearStrokes()
  }

  // 設置工具
  function setTool(tool: 'pen' | 'eraser') {
    drawingStore.setTool(tool)
  }

  // 設置顏色
  function setColor(color: string) {
    drawingStore.setColor(color)
  }

  // 設置粗細
  function setLineWidth(width: number) {
    drawingStore.setLineWidth(width)
  }

  // 重繪所有筆觸
  function redrawStrokes() {
    if (!canvasRef.value) return
    redrawCanvas(canvasRef.value, drawingStore.strokes)
  }

  return {
    canvasRef,
    initCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    setTool,
    setColor,
    setLineWidth,
    handleDrawingData,
    redrawStrokes,
  }
}

