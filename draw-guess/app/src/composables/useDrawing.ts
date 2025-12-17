import { ref, computed } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { getCanvasCoordinates, drawStroke, generateStrokeId, redrawCanvas, calculateScaleParams, type Stroke } from '../lib/canvas-utils'
import { useRoomStore } from '../stores/room'
import { useAuthStore } from '../stores/auth'
import { useStoryStore } from '../stores/story'
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
  const storyStore = useStoryStore()
  const { sendDrawing } = useRealtime()
  
  // 判斷當前用戶是否為畫家
  const isCurrentDrawer = computed(() => {
    if (!authStore.user || !roomStore.currentRoom) return false
    return roomStore.currentRoom.current_drawer_id === authStore.user.id
  })
  
  // 判斷當前是否可以繪畫
  // 分鏡模式下只有 drawing 階段可以繪畫，編劇/投票/結算階段禁止
  const canDraw = computed(() => {
    if (!isCurrentDrawer.value) return false
    
    // 分鏡模式：只有 drawing 階段可以繪畫
    if (roomStore.currentRoom?.game_mode === 'storyboard') {
      return storyStore.currentPhase === 'drawing'
    }
    
    // 經典模式：畫家在繪畫階段可以繪畫
    return true
  })

  // 節流相關
  let throttleTimer: number | null = null
  const THROTTLE_DELAY = 50 // 50ms 節流
  
  // 觸摸設備檢測
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

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
    
    // 檢查是否可以繪畫（考慮分鏡模式階段）
    if (!canDraw.value) {
      console.log('[useDrawing] 當前不能繪畫（非畫家或非繪畫階段）')
      return
    }

    // 阻止默認行為（防止觸摸滾動和縮放）
    event.preventDefault()
    
    // 觸摸設備：阻止多點觸控（安全檢測，避免 TouchEvent 不存在的問題）
    if ('touches' in event && event.touches.length > 1) {
      return
    }
    
    drawingStore.setDrawing(true)

    const coords = getCanvasCoordinates(canvasRef.value, event)
    if (!coords) return

    // 獲取當前 canvas 的 CSS 尺寸（用於後續縮放）
    const rect = canvasRef.value.getBoundingClientRect()
    
    // 創建新筆觸（記錄繪製時的 canvas 尺寸）
    currentStroke.value = {
      id: generateStrokeId(),
      tool: drawingStore.tool,
      color: drawingStore.color,
      lineWidth: drawingStore.lineWidth,
      points: [coords],
      timestamp: Date.now(),
      canvasSize: { width: rect.width, height: rect.height },
    }

    lastPoint.value = coords
    
    // 觸摸設備：立即繪製起點（提升響應感）
    if ('touches' in event && ctxRef.value) {
      const ctx = ctxRef.value
      ctx.save()
      if (currentStroke.value.tool === 'pen') {
        ctx.fillStyle = currentStroke.value.color
        ctx.beginPath()
        ctx.arc(coords.x, coords.y, currentStroke.value.lineWidth / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  // 繪畫中
  function draw(event: MouseEvent | TouchEvent) {
    if (!canvasRef.value || !ctxRef.value || !drawingStore.isDrawing || !currentStroke.value) return

    // 阻止默認行為
    event.preventDefault()
    
    // 觸摸設備：只處理單點觸控（安全檢測）
    if ('touches' in event && event.touches.length > 1) {
      return
    }
    
    const coords = getCanvasCoordinates(canvasRef.value, event)
    if (!coords || !lastPoint.value) return

    // 計算與上一點的距離，過濾抖動
    const dx = coords.x - lastPoint.value.x
    const dy = coords.y - lastPoint.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 觸摸設備：過濾微小移動（減少抖動）
    if (isTouchDevice && distance < 1) {
      return
    }

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

    // 節流發送數據（觸摸設備使用更短的延遲以提升同步性）
    const delay = isTouchDevice ? 30 : THROTTLE_DELAY
    if (throttleTimer === null) {
      throttleTimer = window.setTimeout(() => {
        sendStrokeData()
        throttleTimer = null
      }, delay)
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
    
    // 將完成的筆觸添加到 store（用於 resize 時重繪）
    if (currentStroke.value.points.length > 0) {
      drawingStore.addStroke({ ...currentStroke.value })
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

    console.log('[handleDrawingData] 接收到其他玩家的筆觸:', stroke.id, stroke.tool)

    // 添加到筆觸列表
    drawingStore.addStroke(stroke)

    // 計算等比縮放參數（保持圖畫比例，居中顯示）
    let scale = 1
    let offsetX = 0
    let offsetY = 0
    if (stroke.canvasSize) {
      const rect = canvasRef.value.getBoundingClientRect()
      const params = calculateScaleParams(
        rect.width,
        rect.height,
        stroke.canvasSize.width,
        stroke.canvasSize.height
      )
      scale = params.scale
      offsetX = params.offsetX
      offsetY = params.offsetY
    }

    // 立即繪製（應用等比縮放和居中偏移）
    drawStroke(ctxRef.value, stroke, scale, offsetX, offsetY)
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

  // 清空畫布（畫家使用，發送一個 fill 白色筆觸，會同步給其他玩家）
  async function clearCanvas() {
    console.log('[useDrawing] clearCanvas 被調用')
    
    if (!canvasRef.value || !ctxRef.value || !roomStore.currentRoom || !authStore.user) {
      console.warn('[useDrawing] clearCanvas: 缺少必要條件')
      return
    }

    const rect = canvasRef.value.getBoundingClientRect()
    
    // 創建一個 fill 白色的筆觸
    const fillStroke: Stroke = {
      id: generateStrokeId(),
      tool: 'fill',
      color: '#FFFFFF',
      lineWidth: 0,
      points: [],
      timestamp: Date.now(),
      canvasSize: { width: rect.width, height: rect.height },
    }

    // 本地繪製
    drawStroke(ctxRef.value, fillStroke)
    drawingStore.addStroke(fillStroke)

    // 廣播給其他玩家（作為普通筆觸同步）
    try {
      const strokeWithUser = {
        ...fillStroke,
        userId: authStore.user.id,
      }
      await sendDrawing(roomStore.currentRoom.code, strokeWithUser)
      console.log('[useDrawing] 清空畫布筆觸已廣播')
    } catch (error) {
      console.error('[useDrawing] 廣播清空筆觸失敗:', error)
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

