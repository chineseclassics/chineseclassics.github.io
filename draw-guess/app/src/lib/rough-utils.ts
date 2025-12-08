/**
 * 手繪風格工具函數 - 使用 Rough.js 生成手繪風格圖形
 * 
 * 注意：Rough.js 主要用於 Canvas 繪圖，這裡提供一些輔助函數
 * 實際的手繪風格邊框主要通過 CSS 實現
 */
import rough from 'roughjs'

/**
 * 在 Canvas 上繪製手繪風格的矩形
 * @param canvas Canvas 元素
 * @param x X 座標
 * @param y Y 座標
 * @param width 寬度
 * @param height 高度
 * @param options 選項
 */
export function drawHandDrawnRect(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    roughness?: number
    stroke?: string
    strokeWidth?: number
    fill?: string
    fillStyle?: 'hachure' | 'cross-hatch' | 'zigzag' | 'dots' | 'dashed' | 'solid'
  } = {}
) {
  const rc = rough.canvas(canvas)
  const {
    roughness = 1.5,
    stroke = '#6B5B4F',
    strokeWidth = 2,
    fill,
    fillStyle = 'hachure',
  } = options

  rc.rectangle(x, y, width, height, {
    roughness,
    stroke,
    strokeWidth,
    fill: fill || undefined,
    fillStyle,
  })
}

/**
 * 在 Canvas 上繪製手繪風格的圓形
 */
export function drawHandDrawnCircle(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  diameter: number,
  options: {
    roughness?: number
    stroke?: string
    strokeWidth?: number
    fill?: string
  } = {}
) {
  const rc = rough.canvas(canvas)
  const {
    roughness = 1.5,
    stroke = '#6B5B4F',
    strokeWidth = 2,
    fill,
  } = options

  rc.circle(x, y, diameter, {
    roughness,
    stroke,
    strokeWidth,
    fill: fill || undefined,
  })
}

/**
 * 在 Canvas 上繪製手繪風格的線條
 */
export function drawHandDrawnLine(
  canvas: HTMLCanvasElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    roughness?: number
    stroke?: string
    strokeWidth?: number
  } = {}
) {
  const rc = rough.canvas(canvas)
  const {
    roughness = 1.2,
    stroke = '#6B5B4F',
    strokeWidth = 2,
  } = options

  rc.line(x1, y1, x2, y2, {
    roughness,
    stroke,
    strokeWidth,
  })
}

/**
 * 生成手繪風格的隨機旋轉角度（用於元素輕微傾斜）
 */
export function getRandomRotation(): number {
  return (Math.random() - 0.5) * 1 // -0.5 到 0.5 度
}

/**
 * 生成手繪風格的不規則圓角值
 */
export function getHandDrawnBorderRadius(): string {
  const values = [
    Math.floor(Math.random() * 8) + 6,
    Math.floor(Math.random() * 8) + 10,
    Math.floor(Math.random() * 8) + 4,
    Math.floor(Math.random() * 8) + 8,
  ]
  return values.map(v => `${v}px`).join(' ')
}

