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
// scale: 統一縮放比例（保持圖畫比例不變形）
// offsetX, offsetY: 偏移量（用於居中顯示）
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
) {
  ctx.save()

  // 填充工具：填充整個畫布（使用當前畫布尺寸，不是原始尺寸）
  if (stroke.tool === 'fill') {
    // 獲取畫布的 CSS 尺寸
    const canvas = ctx.canvas
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = stroke.color
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.restore()
    return
  }

  if (stroke.points.length < 2) {
    ctx.restore()
    return
  }

  if (stroke.tool === 'pen') {
    ctx.strokeStyle = stroke.color
    // 線寬按統一比例縮放
    ctx.lineWidth = stroke.lineWidth * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = stroke.lineWidth * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  ctx.beginPath()
  if (stroke.points[0]) {
    ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY)
  }

  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i]
    if (point) {
      ctx.lineTo(point.x * scale + offsetX, point.y * scale + offsetY)
    }
  }

  ctx.stroke()
  ctx.restore()
}

// 計算等比縮放參數（保持圖畫比例，居中顯示）
export function calculateScaleParams(
  currentWidth: number,
  currentHeight: number,
  originalWidth: number,
  originalHeight: number
): { scale: number; offsetX: number; offsetY: number } {
  const scaleX = currentWidth / originalWidth
  const scaleY = currentHeight / originalHeight
  
  // 使用較小的縮放比例，確保圖畫完全可見且不變形
  const scale = Math.min(scaleX, scaleY)
  
  // 計算偏移量，讓圖畫居中
  const scaledWidth = originalWidth * scale
  const scaledHeight = originalHeight * scale
  const offsetX = (currentWidth - scaledWidth) / 2
  const offsetY = (currentHeight - scaledHeight) / 2
  
  return { scale, offsetX, offsetY }
}

// 重繪所有筆觸（支持窗口縮放，保持圖畫比例）
export function redrawCanvas(
  canvas: HTMLCanvasElement,
  strokes: Stroke[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 獲取當前 CSS 尺寸
  const rect = canvas.getBoundingClientRect()
  const currentWidth = rect.width
  const currentHeight = rect.height

  // 清空畫布（使用實際像素尺寸）
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 填充白色背景（使用 CSS 尺寸，因為 ctx 已經 scale 過了）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, currentWidth, currentHeight)

  // 重繪所有筆觸
  strokes.forEach(stroke => {
    let scale = 1
    let offsetX = 0
    let offsetY = 0
    
    if (stroke.canvasSize) {
      // 計算等比縮放參數
      const params = calculateScaleParams(
        currentWidth,
        currentHeight,
        stroke.canvasSize.width,
        stroke.canvasSize.height
      )
      scale = params.scale
      offsetX = params.offsetX
      offsetY = params.offsetY
    }
    
    drawStroke(ctx, stroke, scale, offsetX, offsetY)
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

