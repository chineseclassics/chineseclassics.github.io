/**
 * Traffic System - Sophisticated road network with traffic lights and merged roads
 * Handles avenue/highway detection, traffic light state, and road rendering
 */

import { Tile } from '@/types/game';
import { TILE_WIDTH, TILE_HEIGHT, CarDirection } from './types';
import { 
  TRAFFIC_LIGHT_MIN_ZOOM, 
  DIRECTION_ARROWS_MIN_ZOOM, 
  MEDIAN_PLANTS_MIN_ZOOM,
  LANE_MARKINGS_MEDIAN_MIN_ZOOM,
} from './constants';

// ============================================================================
// Types
// ============================================================================

/** Traffic light state */
export type TrafficLightState = 'green_ns' | 'yellow_ns' | 'green_ew' | 'yellow_ew';

/** Road type based on adjacent road analysis */
export type RoadType = 'single' | 'avenue' | 'highway';

/** Direction of a merged road segment */
export type RoadOrientation = 'ns' | 'ew' | 'intersection';

/** Merged road info for a tile */
export interface MergedRoadInfo {
  type: RoadType;
  orientation: RoadOrientation;
  laneCount: number; // 1-4 depending on merge
  hasMedian: boolean;
  medianType: 'none' | 'line' | 'plants' | 'barrier';
  // Position within merged road (0 = leftmost/top, increasing to right/bottom)
  positionInMerge: number;
  mergeWidth: number; // Total tiles in this merged section
  // Which side of the road this tile represents (for proper lane directions)
  side: 'left' | 'right' | 'center' | 'single';
}

/** Traffic light at an intersection */
export interface TrafficLight {
  tileX: number;
  tileY: number;
  state: TrafficLightState;
  timer: number;
  isIntersection: boolean;
  // Which directions have roads
  hasNorth: boolean;
  hasEast: boolean;
  hasSouth: boolean;
  hasWest: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Traffic light timing (in seconds) */
export const TRAFFIC_LIGHT_TIMING = {
  GREEN_DURATION: 3.0,    // Time for green light (faster cycle)
  YELLOW_DURATION: 0.8,   // Time for yellow light
  TOTAL_CYCLE: 7.6,       // Full cycle time (2 green + 2 yellow)
};

/** Road rendering constants */
export const ROAD_CONFIG = {
  SINGLE_LANE_WIDTH: 0.16,   // 土路稍微寬一點，顯得自然
  AVENUE_LANE_WIDTH: 0.12,
  HIGHWAY_LANE_WIDTH: 0.10,
  MEDIAN_WIDTH: 0.08,
  SIDEWALK_WIDTH: 0.05,      // 鄉村土路幾乎沒有人行道
};

/** Colors for road rendering - Traditional Chinese Ancient Style */
export const ROAD_COLORS = {
  ASPHALT: '#c2a382',         // 主路：黃褐色土路
  ASPHALT_DARK: '#a68564',    // 深色土
  ASPHALT_LIGHT: '#dcc1a5',   // 淺色乾燥土
  LANE_MARKING: 'rgba(0,0,0,0)', // 隱藏標線
  CENTER_LINE: 'rgba(0,0,0,0)',  // 隱藏中心線
  MEDIAN_CONCRETE: '#8b7355',
  MEDIAN_PLANTS: '#4a7c3f',
  SIDEWALK: '#b29372',        // 土質路邊
  CURB: '#8b7355',
  TRAFFIC_LIGHT_POLE: '#5d4037', // 木質桿子
  TRAFFIC_LIGHT_RED: 'rgba(0,0,0,0)',
  TRAFFIC_LIGHT_YELLOW: 'rgba(0,0,0,0)',
  TRAFFIC_LIGHT_GREEN: 'rgba(0,0,0,0)',
  TRAFFIC_LIGHT_OFF: 'rgba(0,0,0,0)',
};

// ============================================================================
// Road Analysis Functions
// ============================================================================

/**
 * Check if a tile is a road
 */
function isRoad(grid: Tile[][], gridSize: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  return grid[y][x].building.type === 'road';
}

/**
 * Get adjacent road info for a tile
 */
export function getAdjacentRoads(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): { north: boolean; east: boolean; south: boolean; west: boolean } {
  return {
    north: isRoad(grid, gridSize, x - 1, y),
    east: isRoad(grid, gridSize, x, y - 1),
    south: isRoad(grid, gridSize, x + 1, y),
    west: isRoad(grid, gridSize, x, y + 1),
  };
}

/**
 * Check if a tile is part of a parallel road group (potential avenue/highway)
 * Returns info about the merged road configuration
 */
export function analyzeMergedRoad(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): MergedRoadInfo {
  if (!isRoad(grid, gridSize, x, y)) {
    return {
      type: 'single',
      orientation: 'intersection',
      laneCount: 1,
      hasMedian: false,
      medianType: 'none',
      positionInMerge: 0,
      mergeWidth: 1,
      side: 'single',
    };
  }

  const adj = getAdjacentRoads(grid, gridSize, x, y);
  
  // Count connections - intersection detection
  const connectionCount = [adj.north, adj.east, adj.south, adj.west].filter(Boolean).length;
  
  // Check for parallel roads in each perpendicular direction
  // For a road running NS (north-south), check for parallel roads to E and W
  // For a road running EW (east-west), check for parallel roads to N and S
  
  const isNSRoad = adj.north || adj.south;
  const isEWRoad = adj.east || adj.west;
  
  // If this is an intersection (3+ connections), don't merge
  if (connectionCount >= 3) {
    return {
      type: 'single',
      orientation: 'intersection',
      laneCount: 2,
      hasMedian: false,
      medianType: 'none',
      positionInMerge: 0,
      mergeWidth: 1,
      side: 'center',
    };
  }
  
  // Analyze parallel roads
  let parallelCount = 0;
  let positionInMerge = 0;
  let side: 'left' | 'right' | 'center' | 'single' = 'single';
  
  if (isNSRoad && !isEWRoad) {
    // Road runs north-south, check east-west for parallel roads
    // Check west (gridY+1) and east (gridY-1) for parallel NS roads
    const hasParallelWest = isRoad(grid, gridSize, x, y + 1) && 
      (isRoad(grid, gridSize, x - 1, y + 1) || isRoad(grid, gridSize, x + 1, y + 1));
    const hasParallelEast = isRoad(grid, gridSize, x, y - 1) && 
      (isRoad(grid, gridSize, x - 1, y - 1) || isRoad(grid, gridSize, x + 1, y - 1));
    
    // Count how many parallel roads exist in a row
    let westCount = 0;
    let eastCount = 0;
    
    // Count westward parallel NS roads
    for (let dy = 1; dy <= 3; dy++) {
      if (isRoad(grid, gridSize, x, y + dy)) {
        const parallelAdj = getAdjacentRoads(grid, gridSize, x, y + dy);
        if (parallelAdj.north || parallelAdj.south) {
          westCount++;
        } else break;
      } else break;
    }
    
    // Count eastward parallel NS roads
    for (let dy = 1; dy <= 3; dy++) {
      if (isRoad(grid, gridSize, x, y - dy)) {
        const parallelAdj = getAdjacentRoads(grid, gridSize, x, y - dy);
        if (parallelAdj.north || parallelAdj.south) {
          eastCount++;
        } else break;
      } else break;
    }
    
    parallelCount = westCount + eastCount + 1;
    positionInMerge = eastCount; // Position from the east side
    
    // Determine side based on position
    if (parallelCount > 1) {
      if (positionInMerge === 0) side = 'right';
      else if (positionInMerge === parallelCount - 1) side = 'left';
      else side = 'center';
    }
    
    // Determine road type
    const roadType = parallelCount >= 4 ? 'highway' : parallelCount >= 2 ? 'avenue' : 'single';
    
    return {
      type: roadType,
      orientation: 'ns',
      laneCount: Math.min(parallelCount * 2, 6),
      hasMedian: parallelCount >= 2,
      medianType: parallelCount >= 3 ? 'plants' : parallelCount >= 2 ? 'line' : 'none',
      positionInMerge,
      mergeWidth: parallelCount,
      side,
    };
  }
  
  if (isEWRoad && !isNSRoad) {
    // Road runs east-west, check north-south for parallel roads
    const hasParallelNorth = isRoad(grid, gridSize, x - 1, y) && 
      (isRoad(grid, gridSize, x - 1, y - 1) || isRoad(grid, gridSize, x - 1, y + 1));
    const hasParallelSouth = isRoad(grid, gridSize, x + 1, y) && 
      (isRoad(grid, gridSize, x + 1, y - 1) || isRoad(grid, gridSize, x + 1, y + 1));
    
    // Count how many parallel roads exist
    let northCount = 0;
    let southCount = 0;
    
    // Count northward parallel EW roads
    for (let dx = 1; dx <= 3; dx++) {
      if (isRoad(grid, gridSize, x - dx, y)) {
        const parallelAdj = getAdjacentRoads(grid, gridSize, x - dx, y);
        if (parallelAdj.east || parallelAdj.west) {
          northCount++;
        } else break;
      } else break;
    }
    
    // Count southward parallel EW roads
    for (let dx = 1; dx <= 3; dx++) {
      if (isRoad(grid, gridSize, x + dx, y)) {
        const parallelAdj = getAdjacentRoads(grid, gridSize, x + dx, y);
        if (parallelAdj.east || parallelAdj.west) {
          southCount++;
        } else break;
      } else break;
    }
    
    parallelCount = northCount + southCount + 1;
    positionInMerge = northCount; // Position from the north side
    
    // Determine side based on position
    if (parallelCount > 1) {
      if (positionInMerge === 0) side = 'left';
      else if (positionInMerge === parallelCount - 1) side = 'right';
      else side = 'center';
    }
    
    // Determine road type
    const roadType = parallelCount >= 4 ? 'highway' : parallelCount >= 2 ? 'avenue' : 'single';
    
    return {
      type: roadType,
      orientation: 'ew',
      laneCount: Math.min(parallelCount * 2, 6),
      hasMedian: parallelCount >= 2,
      medianType: parallelCount >= 3 ? 'plants' : parallelCount >= 2 ? 'line' : 'none',
      positionInMerge,
      mergeWidth: parallelCount,
      side,
    };
  }
  
  // Default single road
  return {
    type: 'single',
    orientation: connectionCount >= 2 ? 'intersection' : 'ns',
    laneCount: 1,
    hasMedian: false,
    medianType: 'none',
    positionInMerge: 0,
    mergeWidth: 1,
    side: 'single',
  };
}

/**
 * Determine if an intersection should have traffic lights
 * Traffic lights are placed at 3+ way intersections
 */
export function shouldHaveTrafficLight(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): boolean {
  if (!isRoad(grid, gridSize, x, y)) return false;
  
  const adj = getAdjacentRoads(grid, gridSize, x, y);
  const connectionCount = [adj.north, adj.east, adj.south, adj.west].filter(Boolean).length;
  
  // Traffic lights at 3+ way intersections
  return connectionCount >= 3;
}

/**
 * Calculate traffic light state based on time
 */
export function getTrafficLightState(time: number): TrafficLightState {
  const cycleTime = time % TRAFFIC_LIGHT_TIMING.TOTAL_CYCLE;
  
  if (cycleTime < TRAFFIC_LIGHT_TIMING.GREEN_DURATION) {
    return 'green_ns'; // North-South green
  } else if (cycleTime < TRAFFIC_LIGHT_TIMING.GREEN_DURATION + TRAFFIC_LIGHT_TIMING.YELLOW_DURATION) {
    return 'yellow_ns'; // North-South yellow
  } else if (cycleTime < TRAFFIC_LIGHT_TIMING.GREEN_DURATION * 2 + TRAFFIC_LIGHT_TIMING.YELLOW_DURATION) {
    return 'green_ew'; // East-West green
  } else {
    return 'yellow_ew'; // East-West yellow
  }
}

/**
 * Check if a vehicle can proceed through an intersection
 */
export function canProceedThroughIntersection(
  direction: CarDirection,
  lightState: TrafficLightState
): boolean {
  // North and South directions can go on green_ns or yellow_ns
  if (direction === 'north' || direction === 'south') {
    return lightState === 'green_ns' || lightState === 'yellow_ns';
  }
  // East and West directions can go on green_ew or yellow_ew
  return lightState === 'green_ew' || lightState === 'yellow_ew';
}

// ============================================================================
// Road Drawing Functions
// ============================================================================

/**
 * Draw a traffic light at an intersection
 */
export function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lightState: TrafficLightState,
  position: 'nw' | 'ne' | 'sw' | 'se', // Corner position
  zoom: number
): void {
  // DISABLED for Ancient Style
  return;
}

/**
 * Draw avenue/highway median with optional plants or barriers
 */
export function drawMedian(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  medianType: 'line' | 'plants' | 'barrier',
  zoom: number
): void {
  const medianWidth = TILE_WIDTH * 0.04;
  
  if (medianType === 'line') {
    // Double yellow line
    ctx.strokeStyle = ROAD_COLORS.CENTER_LINE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    
    // Calculate perpendicular offset
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const perpX = -dy / len * 2;
    const perpY = dx / len * 2;
    
    ctx.beginPath();
    ctx.moveTo(startX + perpX, startY + perpY);
    ctx.lineTo(endX + perpX, endY + perpY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(startX - perpX, startY - perpY);
    ctx.lineTo(endX - perpX, endY - perpY);
    ctx.stroke();
  } else if (medianType === 'plants') {
    // Raised median with plants
    ctx.fillStyle = ROAD_COLORS.MEDIAN_CONCRETE;
    ctx.strokeStyle = ROAD_COLORS.CURB;
    ctx.lineWidth = 1;
    
    // Draw concrete base
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const perpX = -dy / len * medianWidth;
    const perpY = dx / len * medianWidth;
    
    ctx.beginPath();
    ctx.moveTo(startX + perpX, startY + perpY);
    ctx.lineTo(endX + perpX, endY + perpY);
    ctx.lineTo(endX - perpX, endY - perpY);
    ctx.lineTo(startX - perpX, startY - perpY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw plants/trees at intervals
    if (zoom >= MEDIAN_PLANTS_MIN_ZOOM) {
      const plantSpacing = 8;
      const numPlants = Math.floor(len / plantSpacing);
      
      ctx.fillStyle = ROAD_COLORS.MEDIAN_PLANTS;
      for (let i = 1; i < numPlants; i++) {
        const t = i / numPlants;
        const px = startX + dx * t;
        const py = startY + dy * t;
        
        // Simple circular bush
        ctx.beginPath();
        ctx.arc(px, py - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (medianType === 'barrier') {
    // Concrete barrier (for highways)
    ctx.fillStyle = ROAD_COLORS.MEDIAN_CONCRETE;
    ctx.strokeStyle = ROAD_COLORS.CURB;
    ctx.lineWidth = 1;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const perpX = -dy / len * medianWidth * 0.6;
    const perpY = dx / len * medianWidth * 0.6;
    
    ctx.beginPath();
    ctx.moveTo(startX + perpX, startY + perpY);
    ctx.lineTo(endX + perpX, endY + perpY);
    ctx.lineTo(endX - perpX, endY - perpY);
    ctx.lineTo(startX - perpX, startY - perpY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draw lane markings (white dashed or solid)
 */
export function drawLaneMarkings(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isSolid: boolean = false
): void {
  ctx.strokeStyle = ROAD_COLORS.LANE_MARKING;
  ctx.lineWidth = 0.8;
  
  if (isSolid) {
    ctx.setLineDash([]);
  } else {
    ctx.setLineDash([3, 4]);
  }
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

/**
 * Draw directional arrow on road surface
 */
export function drawRoadArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'north' | 'south' | 'east' | 'west',
  zoom: number
): void {
  if (zoom < 0.8) return; // Only show when zoomed in
  
  ctx.save();
  ctx.translate(x, y);
  
  // Rotate based on direction
  const rotations = {
    north: -Math.PI * 0.75,  // Top-left
    east: -Math.PI * 0.25,   // Top-right
    south: Math.PI * 0.25,   // Bottom-right
    west: Math.PI * 0.75,    // Bottom-left
  };
  ctx.rotate(rotations[direction]);
  
  // Draw arrow
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(3, 0);
  ctx.lineTo(1, 0);
  ctx.lineTo(1, 5);
  ctx.lineTo(-1, 5);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-3, 0);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

/**
 * Get the expected traffic flow direction for a road tile based on its position in a merged road
 */
export function getTrafficFlowDirection(
  mergeInfo: MergedRoadInfo
): CarDirection[] {
  if (mergeInfo.type === 'single') {
    // Single roads are bidirectional
    if (mergeInfo.orientation === 'ns') return ['north', 'south'];
    if (mergeInfo.orientation === 'ew') return ['east', 'west'];
    return ['north', 'south', 'east', 'west'];
  }
  
  // For merged roads, direction depends on which side of the road
  if (mergeInfo.orientation === 'ns') {
    // In NS roads: right side goes north, left side goes south (driving on right)
    if (mergeInfo.side === 'right') return ['north'];
    if (mergeInfo.side === 'left') return ['south'];
    return ['north', 'south']; // Center handles both
  }
  
  if (mergeInfo.orientation === 'ew') {
    // In EW roads: right side goes east, left side goes west
    if (mergeInfo.side === 'right') return ['east'];
    if (mergeInfo.side === 'left') return ['west'];
    return ['east', 'west'];
  }
  
  return ['north', 'south', 'east', 'west'];
}

// ============================================================================
// Main Road Drawing Function for Merged Roads
// ============================================================================

/**
 * Draw a merged road segment (avenue or highway)
 */
export function drawMergedRoadSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mergeInfo: MergedRoadInfo,
  adj: { north: boolean; east: boolean; south: boolean; west: boolean },
  trafficLightTime: number,
  zoom: number
): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  
  // Diamond corner points
  const topCorner = { x: x + w / 2, y: y };
  const rightCorner = { x: x + w, y: y + h / 2 };
  const bottomCorner = { x: x + w / 2, y: y + h };
  const leftCorner = { x: x, y: y + h / 2 };
  
  // Edge midpoints
  const northEdgeX = x + w * 0.25;
  const northEdgeY = y + h * 0.25;
  const eastEdgeX = x + w * 0.75;
  const eastEdgeY = y + h * 0.25;
  const southEdgeX = x + w * 0.75;
  const southEdgeY = y + h * 0.75;
  const westEdgeX = x + w * 0.25;
  const westEdgeY = y + h * 0.75;
  
  // Road segment width based on type
  const laneWidth = mergeInfo.type === 'highway' ? ROAD_CONFIG.HIGHWAY_LANE_WIDTH :
                    mergeInfo.type === 'avenue' ? ROAD_CONFIG.AVENUE_LANE_WIDTH :
                    ROAD_CONFIG.SINGLE_LANE_WIDTH;
  const roadW = w * laneWidth * 2;
  
  // DISABLED sidewalks for Ancient Style
  const drawSidewalks = false;
  
  if (drawSidewalks) {
    // Only draw sidewalk on the outer edge of merged roads
    const sidewalkWidth = w * ROAD_CONFIG.SIDEWALK_WIDTH;
    ctx.fillStyle = ROAD_COLORS.SIDEWALK;
    ctx.strokeStyle = ROAD_COLORS.CURB;
    ctx.lineWidth = 1;
    
    if (mergeInfo.orientation === 'ns') {
      // NS road - draw sidewalks on east/west edges if this is an outer tile
      if (mergeInfo.side === 'right' && !adj.east) {
        // East sidewalk (top-right edge)
        ctx.beginPath();
        ctx.moveTo(topCorner.x, topCorner.y);
        ctx.lineTo(rightCorner.x, rightCorner.y);
        ctx.lineTo(rightCorner.x - sidewalkWidth * 0.707, rightCorner.y + sidewalkWidth * 0.707);
        ctx.lineTo(topCorner.x - sidewalkWidth * 0.707, topCorner.y + sidewalkWidth * 0.707);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (mergeInfo.side === 'left' && !adj.west) {
        // West sidewalk (bottom-left edge)
        ctx.beginPath();
        ctx.moveTo(bottomCorner.x, bottomCorner.y);
        ctx.lineTo(leftCorner.x, leftCorner.y);
        ctx.lineTo(leftCorner.x + sidewalkWidth * 0.707, leftCorner.y - sidewalkWidth * 0.707);
        ctx.lineTo(bottomCorner.x + sidewalkWidth * 0.707, bottomCorner.y - sidewalkWidth * 0.707);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (mergeInfo.orientation === 'ew') {
      // EW road - draw sidewalks on north/south edges if this is an outer tile
      if (mergeInfo.side === 'left' && !adj.north) {
        // North sidewalk (top-left edge)
        ctx.beginPath();
        ctx.moveTo(leftCorner.x, leftCorner.y);
        ctx.lineTo(topCorner.x, topCorner.y);
        ctx.lineTo(topCorner.x + sidewalkWidth * 0.707, topCorner.y + sidewalkWidth * 0.707);
        ctx.lineTo(leftCorner.x + sidewalkWidth * 0.707, leftCorner.y + sidewalkWidth * 0.707);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (mergeInfo.side === 'right' && !adj.south) {
        // South sidewalk (bottom-right edge)
        ctx.beginPath();
        ctx.moveTo(rightCorner.x, rightCorner.y);
        ctx.lineTo(bottomCorner.x, bottomCorner.y);
        ctx.lineTo(bottomCorner.x - sidewalkWidth * 0.707, bottomCorner.y - sidewalkWidth * 0.707);
        ctx.lineTo(rightCorner.x - sidewalkWidth * 0.707, rightCorner.y - sidewalkWidth * 0.707);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  
  // 1. Draw the surrounding grass "shoulders" first (to cover the base tile)
  ctx.fillStyle = '#4a7c3f'; // Match game grass color
  ctx.beginPath();
  ctx.moveTo(topCorner.x, topCorner.y);
  ctx.lineTo(rightCorner.x, rightCorner.y);
  ctx.lineTo(bottomCorner.x, bottomCorner.y);
  ctx.lineTo(leftCorner.x, leftCorner.y);
  ctx.closePath();
  ctx.fill();

  // 2. Draw the main dirt path (Narrower and more natural)
  // Calculate a narrower path based on orientation
  const pathWidth = 0.65; // Dirt path takes 65% of tile width
  ctx.fillStyle = ROAD_COLORS.ASPHALT;
  ctx.beginPath();
  
  if (mergeInfo.orientation === 'ns') {
    // North-South Path: Connect North and South edges
    const nw = w * (1 - pathWidth) / 2;
    ctx.moveTo(topCorner.x, topCorner.y);
    ctx.lineTo(topCorner.x + nw, topCorner.y + nw/2); // Right shoulder
    ctx.lineTo(bottomCorner.x + nw, bottomCorner.y - nw/2);
    ctx.lineTo(bottomCorner.x, bottomCorner.y);
    ctx.lineTo(bottomCorner.x - nw, bottomCorner.y - nw/2); // Left shoulder
    ctx.lineTo(topCorner.x - nw, topCorner.y + nw/2);
  } else if (mergeInfo.orientation === 'ew') {
    // East-West Path
    const nw = w * (1 - pathWidth) / 2;
    ctx.moveTo(leftCorner.x, leftCorner.y);
    ctx.lineTo(leftCorner.x + nw, leftCorner.y - nw/2); // Top shoulder
    ctx.lineTo(rightCorner.x - nw, rightCorner.y - nw/2);
    ctx.lineTo(rightCorner.x, rightCorner.y);
    ctx.lineTo(rightCorner.x - nw, rightCorner.y + nw/2); // Bottom shoulder
    ctx.lineTo(leftCorner.x + nw, leftCorner.y + nw/2);
  } else {
    // Intersection: Center fill
    ctx.moveTo(topCorner.x, topCorner.y);
    ctx.lineTo(rightCorner.x, rightCorner.y);
    ctx.lineTo(bottomCorner.x, bottomCorner.y);
    ctx.lineTo(leftCorner.x, leftCorner.y);
  }
  ctx.closePath();
  ctx.fill();

  // 3. Add random flowers and grass tufts on the shoulders
  if (zoom >= 0.7) {
    const seed = (x * 31 + y * 17) % 100;
    const numDecorations = 4 + (seed % 4);
    
    for (let i = 0; i < numDecorations; i++) {
      const decSeed = (seed + i * 23) % 100;
      // Position decorations specifically on the grass shoulders (away from center path)
      let dx, dy;
      if (decSeed < 50) {
        // Left/Top side
        dx = w * (0.1 + (decSeed % 20) / 100);
        dy = h * (0.1 + (decSeed % 30) / 100);
      } else {
        // Right/Bottom side
        dx = w * (0.7 + (decSeed % 20) / 100);
        dy = h * (0.6 + (decSeed % 30) / 100);
      }

      const px = x + dx;
      const py = y + dy;

      // Draw a grass tuft
      ctx.fillStyle = decSeed % 3 === 0 ? '#3d6b32' : '#5a8c4a';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 1, py - 2);
      ctx.lineTo(px + 1, py - 2);
      ctx.fill();

      // Occasionally draw a tiny wild flower
      if (decSeed % 7 === 0) {
        ctx.fillStyle = decSeed % 2 === 0 ? '#fde047' : '#f87171'; // Yellow or Red flowers
        ctx.beginPath();
        ctx.arc(px, py - 3, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ADD: Natural dirt texture (subtle dark spots)
  if (zoom >= 0.8) {
    ctx.fillStyle = ROAD_COLORS.ASPHALT_DARK;
    const seed = (x * 7 + y * 13) % 100;
    for (let i = 0; i < 3; i++) {
      const px = x + w * (0.3 + ( (seed + i * 20) % 40) / 100);
      const py = y + h * (0.3 + ( (seed * 1.5 + i * 15) % 40) / 100);
      ctx.beginPath();
      ctx.ellipse(px, py, 2, 1, Math.PI/4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw lane markings based on road type
  if (zoom >= LANE_MARKINGS_MEDIAN_MIN_ZOOM) {
    if (mergeInfo.type !== 'single' && mergeInfo.hasMedian) {
      // Draw median for avenues/highways
      if (mergeInfo.side === 'center' || 
          (mergeInfo.mergeWidth === 2 && mergeInfo.positionInMerge === 0)) {
        // Draw median on the boundary between lanes
        if (mergeInfo.orientation === 'ns') {
          // Median runs NS (perpendicular to tile boundary)
          // Draw on the east edge if this is the left tile of a pair
          if (mergeInfo.positionInMerge === Math.floor(mergeInfo.mergeWidth / 2) - 1) {
            const medianType = mergeInfo.medianType === 'none' ? 'line' : mergeInfo.medianType;
            drawMedian(ctx, northEdgeX, northEdgeY, southEdgeX, southEdgeY, medianType, zoom);
          }
        } else {
          // Median runs EW
          if (mergeInfo.positionInMerge === Math.floor(mergeInfo.mergeWidth / 2) - 1) {
            const medianType = mergeInfo.medianType === 'none' ? 'line' : mergeInfo.medianType;
            drawMedian(ctx, eastEdgeX, eastEdgeY, westEdgeX, westEdgeY, medianType, zoom);
          }
        }
      }
    }
    
    // Draw direction arrows
    if (zoom >= DIRECTION_ARROWS_MIN_ZOOM && mergeInfo.type !== 'single') {
      const flowDirs = getTrafficFlowDirection(mergeInfo);
      if (flowDirs.length === 1) {
        drawRoadArrow(ctx, cx, cy, flowDirs[0], zoom);
      }
    }
    
    // Draw center line for single roads
    if (mergeInfo.type === 'single') {
      ctx.strokeStyle = ROAD_COLORS.CENTER_LINE;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1.5, 2]);
      
      if (adj.north) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(northEdgeX, northEdgeY);
        ctx.stroke();
      }
      if (adj.east) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(eastEdgeX, eastEdgeY);
        ctx.stroke();
      }
      if (adj.south) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(southEdgeX, southEdgeY);
        ctx.stroke();
      }
      if (adj.west) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(westEdgeX, westEdgeY);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }
  
  // Draw traffic lights at intersections
  const connectionCount = [adj.north, adj.east, adj.south, adj.west].filter(Boolean).length;
  if (connectionCount >= 3 && zoom >= TRAFFIC_LIGHT_MIN_ZOOM) {
    const lightState = getTrafficLightState(trafficLightTime);
    
    // Draw traffic lights at appropriate corners based on which roads exist
    if (adj.north && adj.east) {
      drawTrafficLight(ctx, x, y, lightState, 'ne', zoom);
    }
    if (adj.north && adj.west) {
      drawTrafficLight(ctx, x, y, lightState, 'nw', zoom);
    }
    if (adj.south && adj.east) {
      drawTrafficLight(ctx, x, y, lightState, 'se', zoom);
    }
    if (adj.south && adj.west) {
      drawTrafficLight(ctx, x, y, lightState, 'sw', zoom);
    }
  }
}

// ============================================================================
// Crosswalk Drawing
// ============================================================================

export interface CrosswalkParams {
  ctx: CanvasRenderingContext2D;
  x: number;  // Screen x of tile top-left
  y: number;  // Screen y of tile top-left
  gridX: number;
  gridY: number;
  zoom: number;
  roadW: number;  // Road width (varies by road type)
  adj: { north: boolean; east: boolean; south: boolean; west: boolean };
  hasRoad: (gx: number, gy: number) => boolean;
}

/**
 * Draw crosswalks on tiles adjacent to intersections
 * DISABLED for Ancient Style
 */
export function drawCrosswalks(params: CrosswalkParams): void {
  return; // No crosswalks in ancient village
}
