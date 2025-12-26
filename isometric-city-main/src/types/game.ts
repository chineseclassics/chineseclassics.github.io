// 太虛幻境 - 古代小鎮經營系統類型定義
// Taixu Huanjing - Ancient Town Management System Type Definitions

/**
 * 建築類型 - 使用 string 以支持動態資產
 * 系統核心類型：empty, grass, water, road, rail, tree
 * 動態資產：從 assets.json 加載，使用資產 ID 作為類型
 */
export type BuildingType = string;

// 系統核心建築類型常量（用於類型檢查）
export const CORE_BUILDING_TYPES = ['empty', 'grass', 'water', 'road', 'rail', 'tree'] as const;
export type CoreBuildingType = typeof CORE_BUILDING_TYPES[number];

// 區域類型：民居、市肆、田園
export type ZoneType = 'none' | 'living' | 'market' | 'farming';

// ============================================================================
// 遊戲模式系統（太虛幻境雙模式）
// ============================================================================

/**
 * 遊戲模式
 * - build: 建造模式（上帝視角，規劃園林）
 * - explore: 遊歷模式（玩家角色，沉浸體驗）
 */
export type GameMode = 'build' | 'explore';

/**
 * 玩家角色方向（8方向）
 */
export type PlayerDirection = 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast' | 'east' | 'southeast';

/**
 * 玩家角色狀態
 */
export type PlayerState = 'idle' | 'walking' | 'interacting';

/**
 * 玩家角色數據
 */
export interface Player {
  // 位置（網格座標，支持小數以實現平滑移動）
  x: number;
  y: number;
  // 方向
  direction: PlayerDirection;
  // 狀態
  state: PlayerState;
  // 移動速度（每秒移動的格子數）
  speed: number;
  // 目標位置（用於點擊移動）
  targetX: number | null;
  targetY: number | null;
  // 點擊移動路徑
  path: { x: number; y: number }[];
  pathIndex: number;
  isAutoMoving: boolean;
  // 外觀（未來擴展用）
  costume: string;
}

/**
 * 工具類型 - 使用 string 以支持動態資產
 * 系統工具：select, move_rotate, bulldoze, road, rail, subway, tree, water, grass
 * 區域工具：zone_living, zone_market, zone_farming, zone_dezone
 * 動態資產：從 assets.json 加載，使用資產 ID 作為工具
 */
export type Tool = string;

// 系統核心工具常量（用於類型檢查）
export const SYSTEM_TOOLS = [
  'select', 'move_rotate', 'bulldoze',
  'road', 'rail', 'subway',
  'tree', 'water', 'grass',
  'zone_living', 'zone_market', 'zone_farming', 'zone_dezone'
] as const;
export type SystemTool = typeof SYSTEM_TOOLS[number];

export interface ToolInfo {
  name: string;
  cost: number;
  description: string;
  size?: number;
  appUrl?: string;        // 應用跳轉路徑
  vibePrompt?: string;    // AI 資產生成提示詞
}

/**
 * 系統工具信息（只包含核心系統工具）
 * 動態資產信息從 assets.json 加載
 */
export const TOOL_INFO: Record<string, ToolInfo> = {
  // 系統工具
  select: { name: '查看', cost: 0, description: '查看地塊詳情' },
  move_rotate: { name: '搬遷/旋轉', cost: 0, description: '搬遷建築或點擊旋轉其朝向' },
  bulldoze: { name: '拆除', cost: 10, description: '移除建築和規劃' },
  road: { name: '街道', cost: 25, description: '修建官道連通小鎮' },
  rail: { name: '軌道', cost: 40, description: '鋪設車馬軌道' },
  subway: { name: '暗渠', cost: 50, description: '開挖地下暗渠' },
  tree: { name: '種樹', cost: 15, description: '植樹造林，淨化環境' },
  water: { name: '水面', cost: 20, description: '開鑿水利，美化景觀' },
  grass: { name: '草地', cost: 5, description: '恢復綠地' },
  // 區域規劃工具
  zone_living: { 
    name: '劃定園林', 
    cost: 50, 
    description: '劃定園林範圍，可命名並指定主人',
    vibePrompt: 'Traditional Chinese residential courtyard house, siheyuan style, gray tiles, white walls, pixel art isometric'
  },
  zone_market: { 
    name: '劃定坊市', 
    cost: 50, 
    description: '劃定坊市區域，建設城鎮中心',
    vibePrompt: 'Ancient Chinese market street, shop fronts with wooden signs, lanterns, pixel art isometric'
  },
  zone_farming: { 
    name: '劃定田園', 
    cost: 50, 
    description: '劃定田園區域，耕種農作',
    vibePrompt: 'Chinese agricultural farmland, rice paddies, traditional farm buildings, pixel art isometric'
  },
  zone_dezone: { name: '撤銷規劃', cost: 0, description: '移除區域規劃' },
};

/**
 * 農田數據（用於種植系統）
 */
export interface FarmData {
  /** 農田狀態 */
  status: 'empty' | 'growing' | 'ready' | 'withered';
  /** 種植的作物類型（null 表示未種植） */
  cropType: 'bean' | null;
  /** 生長階段（1-4，僅 growing 狀態有效） */
  growthStage: number;
  /** 種植時的遊戲天數（基於 112 天循環，1-112） */
  plantedDay: number | null;
  /** 種植的句豆數量 */
  seedsPlanted: number;
}

export interface Building {
  type: BuildingType;
  level: number;
  population: number;  // 居民人口
  powered: boolean;    // 燈火是否通達
  watered: boolean;    // 井水是否通達
  onFire: boolean;
  fireProgress: number;
  age: number;
  constructionProgress: number; // 0-100，建造進度
  abandoned: boolean;  // 是否荒廢
  flipped?: boolean;
  onWater?: boolean;   // 是否在水面上
  visualScale?: number; // 視覺縮放比例 (0.1 ~ 3.0)
  farmData?: FarmData; // 農田專用數據（可選，只有農田類型才有）
}

export interface Tile {
  x: number;
  y: number;
  zone: ZoneType;
  building: Building;
  landValue: number;   // 地價
  pollution: number;   // 荒穢程度
  crime: number;       // 匪患程度
  traffic: number;     // 車馬擁堵
  hasSubway: boolean;
  hasRailOverlay?: boolean;
}

export interface Stats {
  population: number;  // 居民
  money: number;       // 金幣
  income: number;      // 收入
  expenses: number;    // 支出
  happiness: number;   // 民心
  health: number;      // 康健
  education: number;   // 文化
  safety: number;      // 治安
  environment: number; // 風水
  demand: {
    living: number;    // 民居需求 (原 residential)
    market: number;    // 市肆需求 (原 commercial)
    farming: number;   // 田園需求 (原 industrial)
  };
}

export interface BudgetCategory {
  name: string;
  funding: number;
  cost: number;
}

export interface Budget {
  health: BudgetCategory;      // 醫療
  education: BudgetCategory;   // 教育
  transportation: BudgetCategory; // 交通
  parks: BudgetCategory;       // 園林
  power: BudgetCategory;       // 燈火
  water: BudgetCategory;       // 井水
}

export interface ServiceCoverage {
  health: number[][];   // 醫館覆蓋
  education: number[][]; // 私塾覆蓋
  power: boolean[][];   // 燈火覆蓋
  water: boolean[][];   // 井水覆蓋
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  icon: string;
  timestamp: number;
}

export interface AdvisorMessage {
  name: string;
  icon: string;
  messages: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface HistoryPoint {
  year: number;
  month: number;
  population: number;
  money: number;
  happiness: number;
}

export interface AdjacentCity {
  id: string;
  name: string;
  direction: 'north' | 'south' | 'east' | 'west';
  connected: boolean;
  discovered: boolean;
}

export interface WaterBody {
  id: string;
  name: string;
  type: 'lake' | 'ocean';
  tiles: { x: number; y: number }[];
  centerX: number;
  centerY: number;
}

export interface GameState {
  id: string;
  grid: Tile[][];
  gridSize: number;
  cityName: string;      // 小鎮名稱
  year: number;          // 傳統年份（保留用於兼容）
  month: number;         // 傳統月份（保留用於兼容）
  day: number;           // 傳統日期（保留用於兼容）
  gameDay: number;       // 遊戲天數（1-120，循環）
  gameYear: number;      // 遊戲年份（從 1 開始，太虛元年）
  hour: number;
  tick: number;
  speed: 0 | 1 | 2 | 3;
  selectedTool: Tool;
  taxRate: number;       // 賦稅
  effectiveTaxRate: number;
  stats: Stats;
  budget: Budget;
  services: ServiceCoverage;
  notifications: Notification[];
  advisorMessages: AdvisorMessage[];
  history: HistoryPoint[];
  activePanel: 'none' | 'budget' | 'statistics' | 'advisors' | 'settings';
  disastersEnabled: boolean;
  adjacentCities: AdjacentCity[];
  waterBodies: WaterBody[];
  gameVersion: number;
  roadVisualScale: number; // 道路貼圖的全局視覺比例 (0.1 ~ 3.0)
}

// 存檔元數據
export interface SavedCityMeta {
  id: string;
  cityName: string;
  population: number;
  money: number;
  year: number;
  month: number;
  gridSize: number;
  savedAt: number;
}

/**
 * 建築演化路徑 - 根據區域和等級
 * 注意：這些建築類型將從 assets.json 動態加載
 * 這裡保留作為演化系統的引用
 */
export const LIVING_BUILDINGS: BuildingType[] = ['house_small'];
export const MARKET_BUILDINGS: BuildingType[] = ['shop_small'];
export const FARMING_BUILDINGS: BuildingType[] = ['farm_small'];

// 保持向後兼容的別名
export const RESIDENTIAL_BUILDINGS = LIVING_BUILDINGS;
export const COMMERCIAL_BUILDINGS = MARKET_BUILDINGS;
export const INDUSTRIAL_BUILDINGS = FARMING_BUILDINGS;

/**
 * 系統核心建築屬性（只包含核心類型）
 * 動態資產使用默認值
 */
const CORE_BUILDING_STATS: Record<string, { maxPop: number; pollution: number; landValue: number }> = {
  empty: { maxPop: 0, pollution: 0, landValue: 0 },
  grass: { maxPop: 0, pollution: 0, landValue: 0 },
  water: { maxPop: 0, pollution: 0, landValue: 5 },
  road: { maxPop: 0, pollution: 2, landValue: 0 },
  rail: { maxPop: 0, pollution: 1, landValue: -2 },
  tree: { maxPop: 0, pollution: -5, landValue: 2 },
};

// 默認建築屬性（用於動態資產）
const DEFAULT_BUILDING_STATS = { maxPop: 0, pollution: 0, landValue: 10 };

/**
 * 獲取建築屬性（支持動態資產）
 */
export function getBuildingStats(buildingType: string): { maxPop: number; pollution: number; landValue: number } {
  return CORE_BUILDING_STATS[buildingType] || DEFAULT_BUILDING_STATS;
}

// 保持向後兼容：使用 Proxy 實現動態查找
export const BUILDING_STATS: Record<string, { maxPop: number; pollution: number; landValue: number }> = new Proxy(
  CORE_BUILDING_STATS,
  {
    get(target, prop: string) {
      return target[prop] || DEFAULT_BUILDING_STATS;
    }
  }
);
