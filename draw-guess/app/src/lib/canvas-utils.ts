import type { Stroke } from '../stores/drawing'

export type { Stroke }

// 獲取 Canvas 坐標（考慮縮放和偏移）
// 修復：返回 CSS 坐標（不需要額外縮放，因為 ctx 已經 scale 過了）
export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  event: MouseEvent | TouchEvent
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect()

  let clientX: number
  let clientY: number

  // 安全檢測事件類型（某些瀏覽器環境可能沒有 TouchEvent）
  if ('clientX' in event && 'clientY' in event) {
    // MouseEvent
    clientX = event.clientX
    clientY = event.clientY
  } else if ('touches' in event && event.touches.length > 0 && event.touches[0]) {
    // TouchEvent
    clientX = event.touches[0].clientX
    clientY = event.touches[0].clientY
  } else {
    return null
  }

  // 返回相對於 canvas CSS 尺寸的坐標
  // 因為 ctx.scale(dpr, dpr) 已經處理了高 DPI，這裡不需要再縮放
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

// 繪製筆觸
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke
) {
  ctx.save()

  // 填充工具：填充整個畫布
  if (stroke.tool === 'fill') {
    if (stroke.canvasSize) {
      ctx.fillStyle = stroke.color
      ctx.fillRect(0, 0, stroke.canvasSize.width, stroke.canvasSize.height)
    }
    ctx.restore()
    return
  }

  if (stroke.points.length < 2) {
    ctx.restore()
    return
  }

  if (stroke.tool === 'pen') {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = stroke.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  ctx.beginPath()
  if (stroke.points[0]) {
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
  }

  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i]
    if (point) {
      ctx.lineTo(point.x, point.y)
    }
  }

  ctx.stroke()
  ctx.restore()
}

// 重繪所有筆觸
export function redrawCanvas(
  canvas: HTMLCanvasElement,
  strokes: Stroke[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 獲取 CSS 尺寸用於填充背景
  const rect = canvas.getBoundingClientRect()

  // 清空畫布（使用實際像素尺寸）
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 填充白色背景（使用 CSS 尺寸，因為 ctx 已經 scale 過了）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, rect.width, rect.height)

  // 重繪所有筆觸
  strokes.forEach(stroke => {
    drawStroke(ctx, stroke)
  })
}

// 序列化筆觸數據（用於傳輸）
export function serializeStroke(stroke: Stroke): string {
  return JSON.stringify({
    id: stroke.id,
    tool: stroke.tool,
    color: stroke.color,
    lineWidth: stroke.lineWidth,
    points: stroke.points,
    timestamp: stroke.timestamp,
  })
}

// 反序列化筆觸數據
export function deserializeStroke(data: string): Stroke | null {
  try {
    const parsed = JSON.parse(data)
    return {
      id: parsed.id,
      tool: parsed.tool,
      color: parsed.color,
      lineWidth: parsed.lineWidth,
      points: parsed.points,
      timestamp: parsed.timestamp,
    }
  } catch (error) {
    console.error('反序列化筆觸數據失敗:', error)
    return null
  }
}

// 生成唯一 ID
export function generateStrokeId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

