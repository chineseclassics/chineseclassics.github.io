/**
 * 農田系統
 * 
 * 太虛幻境種植系統的核心邏輯
 * 包含：農田檢測、種植、收穫、生長計算
 */

import { Tile, Building, FarmData } from '@/types/game';

// ============================================================================
// 常量定義
// ============================================================================

/** 農田類型列表 */
export const FARM_BUILDING_TYPES = ['farmland'] as const;

/** 玩家互動距離（格子數） */
export const INTERACTION_DISTANCE = 1.5;

/** 遊戲時間系統常量（基於二十四節氣） */
export const GAME_YEAR_DAYS = 120; // 1 太虛年 = 120 天（4 季節 × 30 天）
export const SEASON_DAYS = 30; // 每個季節 30 天

/** 季節定義 */
export const SPRING_START = 1;   // 春季：1-30 天
export const SPRING_END = 30;
export const SUMMER_START = 31;  // 夏季：31-60 天
export const SUMMER_END = 60;
export const AUTUMN_START = 61;  // 秋季：61-90 天
export const AUTUMN_END = 90;
export const WINTER_START = 91;  // 冬季：91-120 天
export const WINTER_END = 120;

/** 豆子種植規則 */
export const BEAN_PLANT_SEASON_START = SPRING_START; // 只能在春季播種
export const BEAN_PLANT_SEASON_END = SPRING_END;
export const BEAN_GROWTH_DAYS = 60; // 生長期：60 遊戲天（兩整季）
export const BEAN_HARVEST_SEASON_START = AUTUMN_START; // 在秋季收穫
export const BEAN_HARVEST_SEASON_END = AUTUMN_END;

/** 收穫倍率（種植 N 顆句豆，收穫 N * 倍率 顆田豆） */
export const HARVEST_MULTIPLIER = 3;

// ============================================================================
// 類型定義
// ============================================================================

/** 可互動物件類型 */
export type InteractableType = 'farm_empty' | 'farm_growing' | 'farm_ready' | 'npc';

/** 互動目標信息 */
export interface InteractableTarget {
  /** 互動類型 */
  type: InteractableType;
  /** 目標位置（網格座標） */
  x: number;
  y: number;
  /** 顯示的提示文字 */
  prompt: string;
  /** 動作名稱（用於按鈕顯示） */
  action: string;
  /** 額外數據 */
  data?: {
    farmData?: FarmData;
    growthProgress?: number; // 0-100
  };
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 判斷建築是否為農田
 */
export function isFarmBuilding(buildingType: string): boolean {
  return FARM_BUILDING_TYPES.includes(buildingType as typeof FARM_BUILDING_TYPES[number]);
}

/**
 * 計算絕對遊戲天數（基於 120 天循環）
 * 
 * 將傳統的 12 個月 × 30 天系統轉換為 120 天循環系統
 * 
 * @param year 遊戲年份
 * @param month 遊戲月份（1-12）
 * @param day 遊戲日期（1-30）
 * @returns 絕對遊戲天數（1-120，循環）
 */
export function calculateGameDay(year: number, month: number, day: number): number {
  // 傳統系統：1 年 = 12 個月 × 30 天 = 360 天
  // 新系統：1 年 = 120 天（4 季節 × 30 天）
  // 轉換公式：將傳統日曆映射到 120 天循環
  // 假設從 2024 年開始，每年 360 天，轉換為 120 天循環
  const totalTraditionalDays = ((year - 2024) * 360) + ((month - 1) * 30) + (day - 1);
  // 轉換為 120 天循環（每 360 傳統天對應 120 遊戲天）
  const gameDay = (totalTraditionalDays % GAME_YEAR_DAYS) + 1;
  return gameDay;
}

/**
 * 根據遊戲天數獲取季節
 */
export function getSeason(gameDay: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (gameDay >= SPRING_START && gameDay <= SPRING_END) return 'spring';
  if (gameDay >= SUMMER_START && gameDay <= SUMMER_END) return 'summer';
  if (gameDay >= AUTUMN_START && gameDay <= AUTUMN_END) return 'autumn';
  return 'winter';
}

/**
 * 計算生長階段（1-4）基於遊戲內天數
 * 
 * @param plantedDay 播種時的遊戲天數
 * @param currentDay 當前遊戲天數
 * @returns 生長階段（1-4）
 */
export function getGrowthStage(plantedDay: number | null, currentDay: number): number {
  if (!plantedDay) return 1;
  
  // 計算生長天數（考慮 120 天循環）
  let growthDays = currentDay - plantedDay;
  if (growthDays < 0) {
    // 跨年情況
    growthDays = (GAME_YEAR_DAYS - plantedDay) + currentDay;
  }
  
  // 四階段劃分：每階段 15 遊戲天（60 天 ÷ 4 = 15 天）
  if (growthDays < 15) return 1;  // 階段 1：0-15 天
  if (growthDays < 30) return 2;  // 階段 2：15-30 天
  if (growthDays < 45) return 3;  // 階段 3：30-45 天
  if (growthDays < 60) return 4;  // 階段 4：45-60 天
  return 4; // 成熟（60天以上）
}

/**
 * 根據農田狀態獲取應該顯示的視覺資產 ID
 * 
 * 資產設計（方案 A）：
 * - 空農田：farmland（共用）
 * - 階段 1：farmland_sprout_s1（共用，小綠芽）
 * - 階段 2：farmland_sprout_s2（共用，小苗）
 * - 階段 3：farmland_bean_s3（豆子專用）
 * - 階段 4：farmland_bean_s4（豆子專用）
 * 
 * @param building 建築對象
 * @param currentGameDay 當前遊戲天數（1-112）
 * @returns 應該渲染的資產 ID
 */
export function getFarmVisualAssetId(building: Building, currentGameDay: number): string {
  // 非農田類型，直接返回原始類型
  if (!isFarmBuilding(building.type)) {
    return building.type;
  }
  
  // 沒有農田數據，顯示空農田
  const farmData = building.farmData;
  if (!farmData) {
    return 'farmland';
  }
  
  const { status, cropType, plantedDay } = farmData;
  
  // 空農田或枯萎（未種植）
  if (status === 'empty' || status === 'withered' || !cropType) {
    return 'farmland';
  }
  
  // 生長中的作物 - 根據遊戲內天數計算當前階段
  if (status === 'growing' && plantedDay) {
    const stage = getGrowthStage(plantedDay, currentGameDay);
    
    // 階段 1 和 2 使用共用資產
    if (stage === 1) return 'farmland_sprout_s1';
    if (stage === 2) return 'farmland_sprout_s2';
    
    // 階段 3 和 4 使用專用資產
    if (stage === 3) return `farmland_${cropType}_s3`;
    if (stage === 4) return `farmland_${cropType}_s4`;
    
    return `farmland_${cropType}_s4`; // 默認成熟階段
  }
  
  // 成熟可收穫（也使用 s4 階段的圖片）
  if (status === 'ready') {
    return `farmland_${cropType}_s4`;
  }
  
  return 'farmland';
}

/**
 * 計算兩點之間的距離
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 計算農田的中心位置（考慮多格建築）
 */
function getFarmCenter(x: number, y: number, width: number, height: number): { cx: number; cy: number } {
  return {
    cx: x + width / 2,
    cy: y + height / 2,
  };
}

/**
 * 計算生長進度（0-100）基於遊戲內天數
 */
export function calculateGrowthProgress(plantedDay: number | null, currentDay: number): number {
  if (!plantedDay) return 0;
  
  // 計算生長天數（考慮 112 天循環）
  let growthDays = currentDay - plantedDay;
  if (growthDays < 0) {
    growthDays = (GAME_YEAR_DAYS - plantedDay) + currentDay;
  }
  
  return Math.min(100, Math.floor((growthDays / BEAN_GROWTH_DAYS) * 100));
}

/**
 * 檢查是否可以在當前季節種植豆子
 */
export function canPlantBean(currentGameDay: number): boolean {
  return currentGameDay >= BEAN_PLANT_SEASON_START && currentGameDay <= BEAN_PLANT_SEASON_END;
}

/**
 * 檢查豆子是否可以收穫
 */
export function canHarvestBean(plantedDay: number | null, currentGameDay: number): boolean {
  if (!plantedDay) return false;
  
  // 計算生長天數
  let growthDays = currentGameDay - plantedDay;
  if (growthDays < 0) {
    growthDays = (GAME_YEAR_DAYS - plantedDay) + currentGameDay;
  }
  
  // 必須同時滿足：生長期到了（56天）+ 在收穫季節內
  return growthDays >= BEAN_GROWTH_DAYS && 
         currentGameDay >= BEAN_HARVEST_SEASON_START && 
         currentGameDay <= BEAN_HARVEST_SEASON_END;
}

/**
 * 檢查作物是否枯萎（季節結束時未收穫）
 */
export function isCropWithered(plantedDay: number | null, currentGameDay: number): boolean {
  if (!plantedDay) return false;
  
  // 計算生長天數
  let growthDays = currentGameDay - plantedDay;
  if (growthDays < 0) {
    growthDays = (GAME_YEAR_DAYS - plantedDay) + currentGameDay;
  }
  
  // 如果生長期已過，但不在收穫季節內，則枯萎
  if (growthDays >= BEAN_GROWTH_DAYS) {
    return currentGameDay < BEAN_HARVEST_SEASON_START || currentGameDay > BEAN_HARVEST_SEASON_END;
  }
  
  return false;
}

/**
 * 檢查農田是否已成熟
 */
export function isFarmReady(farmData: FarmData, currentGameDay: number): boolean {
  if (farmData.status !== 'growing' || !farmData.plantedDay) return false;
  return canHarvestBean(farmData.plantedDay, currentGameDay);
}

// ============================================================================
// 互動檢測
// ============================================================================

/**
 * 查找玩家附近的可互動農田
 * 
 * @param playerX 玩家 X 座標
 * @param playerY 玩家 Y 座標
 * @param grid 遊戲網格
 * @param gridSize 網格尺寸
 * @param currentGameDay 當前遊戲天數（1-112）
 * @returns 最近的可互動目標，如果沒有則返回 null
 */
export function findNearbyFarm(
  playerX: number,
  playerY: number,
  grid: Tile[][],
  gridSize: number,
  currentGameDay: number
): InteractableTarget | null {
  let closestTarget: InteractableTarget | null = null;
  let closestDistance = Infinity;

  // 搜索玩家周圍的格子
  const searchRadius = Math.ceil(INTERACTION_DISTANCE) + 2; // 考慮多格建築
  const minX = Math.max(0, Math.floor(playerX) - searchRadius);
  const maxX = Math.min(gridSize - 1, Math.floor(playerX) + searchRadius);
  const minY = Math.max(0, Math.floor(playerY) - searchRadius);
  const maxY = Math.min(gridSize - 1, Math.floor(playerY) + searchRadius);

  // 記錄已檢查的建築起源點（避免多格建築重複計算）
  const checkedOrigins = new Set<string>();

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = grid[y]?.[x];
      if (!tile) continue;

      const building = tile.building;
      
      // 檢查是否為農田
      if (!isFarmBuilding(building.type)) continue;

      // 對於多格建築，找到起源點
      // 農田是 2x2，起源點是左上角
      // 簡化處理：只有當 building.type 是農田且不是 'empty' 時才是起源點
      if (building.type === 'empty') continue;

      const originKey = `${x},${y}`;
      if (checkedOrigins.has(originKey)) continue;
      checkedOrigins.add(originKey);

      // 計算農田中心（2x2 農田）
      const { cx, cy } = getFarmCenter(x, y, 2, 2);
      const distance = getDistance(playerX, playerY, cx, cy);

      // 檢查是否在互動範圍內
      if (distance > INTERACTION_DISTANCE + 1) continue; // +1 考慮多格建築

      // 找最近的農田
      if (distance < closestDistance) {
        closestDistance = distance;

        // 獲取農田數據
        const farmData = building.farmData;
        
        if (!farmData) {
          // 沒有 farmData，視為空農田（兼容舊數據）
          closestTarget = {
            type: 'farm_empty',
            x,
            y,
            prompt: '空置的農田',
            action: '種植',
          };
        } else if (farmData.status === 'empty') {
          closestTarget = {
            type: 'farm_empty',
            x,
            y,
            prompt: '空置的農田',
            action: '種植',
            data: { farmData },
          };
        } else if (farmData.status === 'growing') {
          const progress = calculateGrowthProgress(farmData.plantedDay, currentGameDay);
          const ready = isFarmReady(farmData, currentGameDay);
          const withered = isCropWithered(farmData.plantedDay, currentGameDay);
          
          if (withered) {
            closestTarget = {
              type: 'farm_empty',
              x,
              y,
              prompt: '作物已枯萎',
              action: '清理',
              data: { farmData, growthProgress: 100 },
            };
          } else if (ready) {
            closestTarget = {
              type: 'farm_ready',
              x,
              y,
              prompt: `豆莢已成熟！`,
              action: '收穫',
              data: { farmData, growthProgress: 100 },
            };
          } else {
            closestTarget = {
              type: 'farm_growing',
              x,
              y,
              prompt: `生長中... ${progress}%`,
              action: '查看',
              data: { farmData, growthProgress: progress },
            };
          }
        } else if (farmData.status === 'ready') {
          closestTarget = {
            type: 'farm_ready',
            x,
            y,
            prompt: '可以收穫了！',
            action: '收穫',
            data: { farmData },
          };
        }
      }
    }
  }

  return closestTarget;
}

// ============================================================================
// 種植與收穫
// ============================================================================

/**
 * 種植作物
 * 
 * @param building 農田建築
 * @param seedCount 種植的句豆數量
 * @param currentGameDay 當前遊戲天數（1-112）
 * @returns 更新後的建築對象，如果無法種植則返回原建築
 */
export function plantCrop(building: Building, seedCount: number, currentGameDay: number): Building {
  // 檢查是否在播種季節
  if (!canPlantBean(currentGameDay)) {
    // 返回原建築，不進行種植（調用方應該檢查並提示玩家）
    return building;
  }
  
  return {
    ...building,
    farmData: {
      status: 'growing',
      cropType: 'bean',
      growthStage: 1,
      plantedDay: currentGameDay,
      seedsPlanted: seedCount,
    },
  };
}

/**
 * 收穫作物
 * 
 * @param building 農田建築
 * @returns { building: 更新後的建築, harvestAmount: 收穫的田豆數量 }
 */
export function harvestCrop(building: Building): { building: Building; harvestAmount: number } {
  const farmData = building.farmData;
  if (!farmData || farmData.status !== 'growing' && farmData.status !== 'ready') {
    return { building, harvestAmount: 0 };
  }

  const harvestAmount = farmData.seedsPlanted * HARVEST_MULTIPLIER;

  return {
    building: {
      ...building,
      farmData: {
        status: 'empty',
        cropType: null,
        growthStage: 0,
        plantedDay: null,
        seedsPlanted: 0,
      },
    },
    harvestAmount,
  };
}

/**
 * 更新農田狀態（檢查是否成熟、枯萎）
 * 用於定期更新或渲染時檢查
 * 
 * @param building 建築對象
 * @param currentGameDay 當前遊戲天數（1-112）
 * @returns 更新後的建築對象
 */
export function updateFarmStatus(building: Building, currentGameDay: number): Building {
  const farmData = building.farmData;
  if (!farmData || farmData.status !== 'growing') {
    return building;
  }

  // 檢查是否枯萎
  if (isCropWithered(farmData.plantedDay, currentGameDay)) {
    return {
      ...building,
      farmData: {
        ...farmData,
        status: 'withered',
        growthStage: 4,
      },
    };
  }

  // 檢查是否成熟
  if (isFarmReady(farmData, currentGameDay)) {
    return {
      ...building,
      farmData: {
        ...farmData,
        status: 'ready',
        growthStage: 4, // 成熟階段
      },
    };
  }

  // 更新生長階段（1-4）
  const newStage = getGrowthStage(farmData.plantedDay, currentGameDay);
  
  if (newStage !== farmData.growthStage) {
    return {
      ...building,
      farmData: {
        ...farmData,
        growthStage: newStage,
      },
    };
  }

  return building;
}

