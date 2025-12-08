import type { Stroke } from '../stores/drawing'

export type { Stroke }

// 獲取 Canvas 坐標（考慮縮放和偏移）
export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  event: MouseEvent | TouchEvent
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  let clientX: number
  let clientY: number

  if (event instanceof MouseEvent) {
    clientX = event.clientX
    clientY = event.clientY
  } else if (event instanceof TouchEvent && event.touches.length > 0 && event.touches[0]) {
    clientX = event.touches[0].clientX
    clientY = event.touches[0].clientY
  } else {
    return null
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

// 繪製筆觸
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke
) {
  if (stroke.points.length < 2) return

  ctx.save()

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

  // 清空畫布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

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

