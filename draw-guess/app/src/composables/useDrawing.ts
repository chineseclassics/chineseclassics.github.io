import { ref, computed } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { getCanvasCoordinates, drawStroke, generateStrokeId, redrawCanvas, type Stroke } from '../lib/canvas-utils'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import { useRealtime } from './useRealtime'

// 模組級單例 - 確保所有 useDrawing() 調用共享同一個 canvas 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctxRef = ref<CanvasRenderingContext2D | null>(null)
const currentStroke = ref<Stroke | null>(null)
const lastPoint = ref<{ x: number; y: number } | null>(null)

export function useDrawing() {
  const drawingStore = useDrawingStore()
  const roomStore = useRoomStore()
  const authStore = useAuthStore()
  const { sendDrawing } = useRealtime()
  
  // 判斷當前用戶是否為畫家
  const isCurrentDrawer = computed(() => {
    if (!authStore.user || !roomStore.currentRoom) return false
    return roomStore.currentRoom.current_drawer_id === authStore.user.id
  })

  // 節流相關
  let throttleTimer: number | null = null
  const THROTTLE_DELAY = 50 // 50ms 節流

  // 初始化 Canvas
  function initCanvas(canvas: HTMLCanvasElement) {
    console.log('[useDrawing] initCanvas 被調用')
    
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

    // 設置實際像素尺寸
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    // 縮放上下文以匹配 CSS 尺寸
    // 這樣繪製時使用 CSS 坐標即可，ctx 會自動縮放到實際像素
    ctx.scale(dpr, dpr)

    // 設置默認樣式（使用 CSS 尺寸）- 乾淨的白色畫布
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    // 初始化時清空筆觸記錄，確保新遊戲不會有舊筆觸
    // 注意：不在這裡重繪 strokes，因為每輪開始都應該是乾淨的畫布
    drawingStore.clearStrokes()
    console.log('[useDrawing] Canvas 初始化完成，筆觸已清空')

    // 監聽窗口大小變化，重新調整 canvas
    const resizeObserver = new ResizeObserver(() => {
      if (!canvasRef.value || !ctxRef.value) return
      
      const newRect = canvasRef.value.getBoundingClientRect()
      const newDpr = window.devicePixelRatio || 1
      
      // 重新設置尺寸
      canvasRef.value.width = newRect.width * newDpr
      canvasRef.value.height = newRect.height * newDpr
      ctxRef.value.scale(newDpr, newDpr)
      
      // 重繪白色背景和所有筆觸
      ctxRef.value.fillStyle = '#FFFFFF'
      ctxRef.value.fillRect(0, 0, newRect.width, newRect.height)
      redrawCanvas(canvasRef.value, drawingStore.strokes)
    })
    
    resizeObserver.observe(canvas)
  }

  // 開始繪畫
  function startDrawing(event: MouseEvent | TouchEvent) {
    if (!canvasRef.value) return
    
    // 只有當前畫家可以繪畫
    if (!isCurrentDrawer.value) {
      console.log('[useDrawing] 非畫家不能繪畫')
      return
    }

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
  function handleDrawingData(data: (Stroke & { userId?: string }) | { type: 'clear'; userId: string }) {
    if (!canvasRef.value || !ctxRef.value) return

    // 過濾自己發送的消息
    if (data.userId && authStore.user && data.userId === authStore.user.id) {
      console.log('[handleDrawingData] 忽略自己的數據')
      return
    }

    // 處理清空畫布指令
    if ('type' in data && data.type === 'clear') {
      console.log('[handleDrawingData] 收到清空畫布指令')
      clearCanvasLocal()
      return
    }

    // 處理普通筆觸
    const stroke = data as Stroke
    console.log('[handleDrawingData] 接收到其他玩家的筆觸:', stroke.id)

    // 添加到筆觸列表
    drawingStore.addStroke(stroke)

    // 立即繪製
    drawStroke(ctxRef.value, stroke)
  }

  // 本地清空畫布（不廣播，用於輪次切換等）
  function clearCanvasLocal() {
    console.log('[useDrawing] clearCanvasLocal 被調用')
    
    if (!canvasRef.value || !ctxRef.value) {
      console.warn('[useDrawing] clearCanvasLocal: canvas 或 ctx 不存在')
      return
    }

    const ctx = ctxRef.value
    const canvas = canvasRef.value
    
    // 使用 CSS 尺寸（因為 ctx 已經被 scale 過）
    const rect = canvas.getBoundingClientRect()
    
    console.log('[useDrawing] 清空畫布，尺寸:', rect.width, 'x', rect.height)

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 清空筆觸記錄
    drawingStore.clearStrokes()
    console.log('[useDrawing] 畫布已清空')
  }

  // 清空畫布（畫家使用，會廣播給其他玩家）
  async function clearCanvas() {
    console.log('[useDrawing] clearCanvas 被調用')
    
    // 先本地清空
    clearCanvasLocal()
    
    // 如果是畫家，廣播清空指令給其他玩家
    if (isCurrentDrawer.value && roomStore.currentRoom && authStore.user) {
      console.log('[useDrawing] 畫家清空畫布，廣播給其他玩家')
      try {
        await sendDrawing(roomStore.currentRoom.code, {
          type: 'clear',
          userId: authStore.user.id,
        })
      } catch (error) {
        console.error('[useDrawing] 廣播清空指令失敗:', error)
      }
    }
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
    clearCanvasLocal,
    setTool,
    setColor,
    setLineWidth,
    handleDrawingData,
    redrawStrokes,
  }
}

