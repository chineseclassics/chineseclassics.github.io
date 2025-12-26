/**
 * 玩家角色系統
 * 
 * 太虛幻境遊歷模式的核心系統
 * 
 * 設計理念：
 * - 玩家始終固定在視口中心
 * - WASD 控制地圖拖動，而非玩家移動
 * - 點擊移動：計算路徑，逐步移動地圖偏移
 * - 玩家的網格座標由當前視口中心反推得出
 */

import { Player, PlayerDirection, Tile } from '@/types/game';
import { TILE_WIDTH, TILE_HEIGHT } from './types';

// ============================================================================
// 常量定義
// ============================================================================

/** 
 * 玩家移動速度（每秒移動的格子數）
 * 基於 1格=1.5m 的比例，5格/秒 ≈ 7.5m/s ≈ 27km/h（約為現實走路的5倍加速）
 */
export const PLAYER_MOVE_SPEED = 5;

/** 玩家書生顏色配置 */
const PLAYER_COLORS = {
  robe: '#5B7C99',      // 長袍顏色（青灰色）
  innerRobe: '#E8DDD0', // 內襯顏色（米白色）
  skin: '#F5D6BA',      // 膚色
  hair: '#2C1810',      // 髮色
  pants: '#3D4F5F',     // 褲子顏色（深青灰）
  book: '#8B6914',      // 書本顏色
};

// ============================================================================
// 玩家創建和初始化
// ============================================================================

/**
 * 創建初始玩家狀態
 */
export function createInitialPlayer(startX: number, startY: number): Player {
  return {
    x: startX,
    y: startY,
    direction: 'south',
    state: 'idle',
    speed: PLAYER_MOVE_SPEED,
    targetX: null,
    targetY: null,
    path: [],
    pathIndex: 0,
    isAutoMoving: false,
    costume: 'scholar_basic',
  };
}

/**
 * 尋找玩家的初始生成位置
 * 優先選擇：道路 > 草地 > 任意可行走位置
 */
export function findPlayerSpawnPosition(grid: Tile[][], gridSize: number): { x: number; y: number } {
  // 從地圖中心開始尋找
  const centerX = Math.floor(gridSize / 2);
  const centerY = Math.floor(gridSize / 2);
  
  // 螺旋搜索找到合適位置
  for (let radius = 0; radius < gridSize / 2; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          const tile = grid[y][x];
          // 優先選擇道路或草地
          if (tile.building.type === 'road' || tile.building.type === 'grass' || tile.building.type === 'empty') {
            return { x, y };
          }
        }
      }
    }
  }
  
  // 找不到合適位置，返回中心
  return { x: centerX, y: centerY };
}

// ============================================================================
// 玩家渲染（書生形象）
// ============================================================================

/**
 * 繪製書生髮髻
 */
function drawScholarHair(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  headRadius: number
): void {
  ctx.fillStyle = PLAYER_COLORS.hair;
  
  // 頭髮基礎
  ctx.beginPath();
  ctx.arc(headX, headY - headRadius * 0.3, headRadius * 1.1, Math.PI, 0);
  ctx.fill();
  
  // 髮髻（古代書生的特徵）
  ctx.beginPath();
  ctx.ellipse(headX, headY - headRadius * 1.3, headRadius * 0.35, headRadius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 髮簪
  ctx.strokeStyle = '#C4A777';
  ctx.lineWidth = headRadius * 0.08;
  ctx.beginPath();
  ctx.moveTo(headX - headRadius * 0.5, headY - headRadius * 1.3);
  ctx.lineTo(headX + headRadius * 0.5, headY - headRadius * 1.3);
  ctx.stroke();
}

/**
 * 檢查位置是否可行走
 */
export function isWalkable(grid: Tile[][], gridSize: number, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);

  // 邊界檢查
  if (tx < 0 || tx >= gridSize || ty < 0 || ty >= gridSize) {
    return false;
  }

  const tile = grid[ty][tx];
  const type = tile.building.type;

  // 1. 完全禁止的類型
  if (type === 'water') return false;

  // 2. 允許通行的基礎類型
  const basicWalkable = ['empty', 'grass', 'road', 'rail', 'pavement', 'grass_dark', 'grass_light'];
  if (basicWalkable.includes(type)) return true;

  // 3. 允許通行的公園/景觀類（書生可以去逛公園）
  const parkTypes = [
    'park', 'park_large', 'tennis', 'basketball_courts', 'playground_small',
    'playground_large', 'baseball_field_small', 'soccer_field_small',
    'pond_park', 'community_garden', 'amphitheater', 'plaza'
  ];
  if (parkTypes.includes(type)) return true;

  // 4. 其他有實體建築的格子（暫定不可通行，除非是道路）
  return false;
}

// ============================================================================
// 尋路算法（A* / BFS）
// ============================================================================

/**
 * 通用尋路函數（BFS 實現）
 * 在所有可行走的格子上尋找最短路徑
 */
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  grid: Tile[][],
  gridSize: number
): { x: number; y: number }[] | null {
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  const ex = Math.round(endX);
  const ey = Math.round(endY);

  // 邊界和可達性檢查
  if (!isWalkable(grid, gridSize, ex, ey)) {
    return null;
  }

  // 如果起點和終點相同
  if (sx === ex && sy === ey) {
    return [{ x: ex, y: ey }];
  }

  // BFS 尋路
  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
  
  queue.push({ x: sx, y: sy, path: [{ x: sx, y: sy }] });
  visited.add(`${sx},${sy}`);

  // 4 方向移動（網格坐標系）
  const dx = [0, 0, 1, -1];
  const dy = [1, -1, 0, 0];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (let i = 0; i < 4; i++) {
      const nx = current.x + dx[i];
      const ny = current.y + dy[i];
      const key = `${nx},${ny}`;

      if (visited.has(key)) continue;
      if (!isWalkable(grid, gridSize, nx, ny)) continue;

      const newPath = [...current.path, { x: nx, y: ny }];

      if (nx === ex && ny === ey) {
        return newPath;
      }

      visited.add(key);
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }

  // 無法到達
  return null;
}

/**
 * 計算讓某個網格點成為視口中心所需的 offset
 */
export function calculateOffsetForCenter(
  gridX: number,
  gridY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number
): { x: number; y: number } {
  // 網格坐標 → 世界坐標（瓦片中心）
  // gridToScreen 公式: x = (gridX - gridY) * HW, y = (gridX + gridY) * HH
  const worldCenterX = (gridX - gridY) * (TILE_WIDTH / 2) + TILE_WIDTH / 2;
  const worldCenterY = (gridX + gridY) * (TILE_HEIGHT / 2) + TILE_HEIGHT / 2;

  // 反推 offset
  // 屏幕中心 = 世界坐標 * zoom + offset
  // offset = 屏幕中心 - 世界坐標 * zoom
  const offsetX = (canvasWidth / 2) - worldCenterX * zoom;
  const offsetY = (canvasHeight / 2) - worldCenterY * zoom;

  return { x: offsetX, y: offsetY };
}

/**
 * 根據移動方向計算玩家朝向
 */
export function getDirectionFromMovement(fromX: number, fromY: number, toX: number, toY: number): PlayerDirection {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // 網格坐標系中的方向映射
  if (dx < 0 && dy === 0) return 'northwest';
  if (dx > 0 && dy === 0) return 'southeast';
  if (dx === 0 && dy < 0) return 'northeast';
  if (dx === 0 && dy > 0) return 'southwest';
  if (dx < 0 && dy < 0) return 'north';
  if (dx > 0 && dy > 0) return 'south';
  if (dx < 0 && dy > 0) return 'west';
  if (dx > 0 && dy < 0) return 'east';

  return 'south'; // 默認
}

/**
 * 在屏幕中心繪製玩家
 * 
 * 這是遊歷模式的核心渲染函數。
 * 玩家始終繪製在視口中心，地圖則根據 WASD 移動。
 */
export function drawPlayerAtCenter(
  ctx: CanvasRenderingContext2D,
  player: Player,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  animationFrame: number = 0
): void {
  const dpr = window.devicePixelRatio || 1;
  
  ctx.save();
  // 設置 transform：DPR 縮放 * 地圖縮放，讓玩家與地圖比例一致
  ctx.scale(dpr * zoom, dpr * zoom);
  
  // 移動到屏幕中心（邏輯座標，需要除以 zoom 因為 ctx.scale 已經包含了 zoom）
  ctx.translate((canvasWidth / 2) / zoom, (canvasHeight / 2) / zoom);
  
  // 繪製參數
  const scale = 1.2; 
  const walkOffset = animationFrame * 8;
  const walkBob = player.state === 'walking' ? Math.sin(walkOffset) * 0.8 : 0;
  const walkSway = player.state === 'walking' ? Math.sin(walkOffset * 0.5) * 0.5 : 0;
  const legSwing = player.state === 'walking' ? Math.sin(walkOffset) * 3 : 0;

  ctx.lineCap = 'round';
  
  // 繪製陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 10 * scale, 12 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // ===== 頭部 =====
  ctx.fillStyle = PLAYER_COLORS.skin;
  ctx.beginPath();
  ctx.arc(walkSway * scale, (-14 + walkBob) * scale, 3.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  drawScholarHair(ctx, walkSway * scale, (-14 + walkBob) * scale, 3.5 * scale);
  
  // ===== 身體和長袍 =====
  ctx.fillStyle = PLAYER_COLORS.robe;
  ctx.beginPath();
  ctx.ellipse(walkSway * scale, (-5 + walkBob) * scale, 4 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 領口
  ctx.strokeStyle = PLAYER_COLORS.innerRobe;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo((walkSway - 1) * scale, (-11 + walkBob) * scale);
  ctx.lineTo((walkSway + 1) * scale, (-5 + walkBob) * scale);
  ctx.moveTo((walkSway + 1) * scale, (-11 + walkBob) * scale);
  ctx.lineTo((walkSway - 1) * scale, (-5 + walkBob) * scale);
  ctx.stroke();

  // ===== 腿部 =====
  ctx.strokeStyle = PLAYER_COLORS.pants;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(walkSway * scale, (1 + walkBob) * scale);
  ctx.lineTo((walkSway - 1.5 + legSwing) * scale, (10 + walkBob) * scale);
  ctx.moveTo(walkSway * scale, (1 + walkBob) * scale);
  ctx.lineTo((walkSway + 1.5 - legSwing) * scale, (10 + walkBob) * scale);
  ctx.stroke();

  // ===== 手臂（抱書） =====
  ctx.strokeStyle = PLAYER_COLORS.skin;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo((walkSway - 3.5) * scale, (-7 + walkBob) * scale);
  ctx.lineTo((walkSway - 4.5) * scale, (-2 + walkBob) * scale);
  ctx.stroke();
  
  // 書本
  ctx.fillStyle = '#f0ead6';
  ctx.fillRect((walkSway - 6) * scale, (-3 + walkBob) * scale, 4 * scale, 5 * scale);
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 0.5 * scale;
  ctx.strokeRect((walkSway - 6) * scale, (-3 + walkBob) * scale, 4 * scale, 5 * scale);

  ctx.restore();
}
