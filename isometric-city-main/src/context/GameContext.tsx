// Consolidated GameContext for the SimCity-like game
'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import {
  Budget,
  BuildingType,
  GameState,
  SavedCityMeta,
  Tool,
  TOOL_INFO,
  ZoneType,
  GameMode,
  Player,
} from '@/types/game';
import {
  createInitialPlayer,
  findPlayerSpawnPosition,
} from '@/components/game/playerSystem';
import {
  InteractableTarget,
  findNearbyFarm,
  plantCrop,
  harvestCrop,
  isFarmReady,
  calculateGameDay,
  canPlantBean,
} from '@/components/game/farmSystem';
import { convertToGameDay } from '@/lib/timeSystem';
import {
  bulldozeTile,
  createInitialGameState,
  DEFAULT_GRID_SIZE,
  placeBuilding,
  rotateBuilding,
  moveBuilding,
  findBuildingOrigin,
  getBuildingSize,
  placeSubway,
  simulateTick,
  checkForDiscoverableCities,
  generateRandomAdvancedCity,
  IS_CREATOR_MODE,
  initDynamicAssetSizes,
  setDynamicAssetSize,
} from '@/lib/simulation';
import {
  SPRITE_PACKS,
  DEFAULT_SPRITE_PACK_ID,
  getSpritePack,
  setActiveSpritePack,
  SpritePack,
} from '@/lib/renderConfig';

const STORAGE_KEY = 'isocity-game-state';
const SAVED_CITY_STORAGE_KEY = 'isocity-saved-city'; // For restoring after viewing shared city
const SAVED_CITIES_INDEX_KEY = 'isocity-saved-cities-index'; // Index of all saved cities
const SAVED_CITY_PREFIX = 'isocity-city-'; // Prefix for individual saved city states
const SPRITE_PACK_STORAGE_KEY = 'isocity-sprite-pack';
const DAY_NIGHT_MODE_STORAGE_KEY = 'isocity-day-night-mode';

export type DayNightMode = 'auto' | 'day' | 'night';

// Info about a saved city (for restore functionality)
export type SavedCityInfo = {
  cityName: string;
  population: number;
  money: number;
  savedAt: number;
} | null;

type GameContextValue = {
  state: GameState;
  setTool: (tool: Tool) => void;
  setSpeed: (speed: 0 | 1 | 2 | 3) => void;
  setTaxRate: (rate: number) => void;
  setActivePanel: (panel: GameState['activePanel']) => void;
  setBudgetFunding: (key: keyof Budget, funding: number) => void;
  placeAtTile: (x: number, y: number) => void;
  connectToCity: (cityId: string) => void;
  discoverCity: (cityId: string) => void;
  checkAndDiscoverCities: (onDiscover?: (city: { id: string; direction: 'north' | 'south' | 'east' | 'west'; name: string }) => void) => void;
  setDisastersEnabled: (enabled: boolean) => void;
  newGame: (name?: string, size?: number) => void;
  loadState: (stateString: string) => boolean;
  exportState: () => string;
  generateRandomCity: () => void;
  hasExistingGame: boolean;
  isSaving: boolean;
  addMoney: (amount: number) => void;
  addNotification: (title: string, description: string, icon: string) => void;
  movingFrom: { x: number, y: number } | null;
  // Moving building state (for drag-to-move preview)
  movingBuilding: {
    type: BuildingType;
    originX: number;
    originY: number;
    flipped: boolean;
    width: number;
    height: number;
  } | null;
  // Sprite pack management
  currentSpritePack: SpritePack;
  availableSpritePacks: SpritePack[];
  setSpritePack: (packId: string) => void;
  // Day/night mode override
  dayNightMode: DayNightMode;
  setDayNightMode: (mode: DayNightMode) => void;
  visualHour: number; // The hour to use for rendering (respects day/night mode override)
  // Save/restore city for shared links
  saveCurrentCityForRestore: () => void;
  restoreSavedCity: () => boolean;
  getSavedCityInfo: () => SavedCityInfo;
  clearSavedCity: () => void;
  // Multi-city save system
  savedCities: SavedCityMeta[];
  saveCity: () => void;
  loadSavedCity: (cityId: string) => boolean;
  deleteSavedCity: (cityId: string) => void;
  renameSavedCity: (cityId: string, newName: string) => void;
  updateBuildingScale: (x: number, y: number, scale: number) => void;
  rotateBuildingAt: (x: number, y: number) => void;
  pickUpBuildingAt: (x: number, y: number) => void;
  updateRoadVisualScale: (scale: number) => void;
  // 遊戲模式系統（太虛幻境雙模式）
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  player: Player;
  updatePlayer: (player: Player) => void;
  // 農田互動系統
  nearbyInteractable: InteractableTarget | null;
  updateNearbyInteractable: (playerX: number, playerY: number) => void;
  doFarmInteraction: () => { success: boolean; message: string };
  // 玩家資源（句豆、田豆、文錢）
  playerResources: {
    judou: number;    // 句豆（種子，從句豆應用獲得）
    tiandou: number;  // 田豆（收穫物）
    wenqian: number;  // 文錢（貨幣）
  };
  addPlayerResource: (type: 'judou' | 'tiandou' | 'wenqian', amount: number) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// 系統內置工具映射（只保留核心系統工具）
// 動態資產會直接使用工具 ID 作為建築類型
const SYSTEM_TOOLS: Partial<Record<Tool, BuildingType>> = {
  road: 'road',
  rail: 'rail',
  tree: 'tree',
  water: 'water',
  grass: 'grass',
};

// 判斷工具是否可以放置建築（系統工具或動態資產）
// 動態資產：工具 ID 直接作為建築類型
function getToolBuildingType(tool: Tool): BuildingType | undefined {
  // 首先檢查系統內置工具
  if (SYSTEM_TOOLS[tool]) {
    return SYSTEM_TOOLS[tool];
  }
  // 非系統工具：如果不是特殊工具（select, bulldoze 等），則視為動態資產
  const nonBuildingTools = ['select', 'move_rotate', 'bulldoze', 'subway', 'zone_living', 'zone_market', 'zone_farming', 'zone_dezone'];
  if (!nonBuildingTools.includes(tool)) {
    // 動態資產：直接將工具 ID 作為建築類型
    return tool as BuildingType;
  }
  return undefined;
}

// 動態資產緩存（從 assets.json 加載）
let dynamicAssetsCache: Array<{
  id: string;
  name: string;
  cost: number;
  description?: string;
  gridSize: { width: number; height: number };
}> = [];

// 加載動態資產配置
async function loadDynamicAssets() {
  try {
    const response = await fetch('/assets/assets.json');
    if (response.ok) {
      const data = await response.json();
      dynamicAssetsCache = data.assets || [];
      
      // 同時設置動態資產尺寸到 simulation 模塊
      for (const asset of dynamicAssetsCache) {
        if (asset.id && asset.gridSize) {
          setDynamicAssetSize(
            asset.id,
            asset.gridSize.width || 1,
            asset.gridSize.height || 1
          );
        }
      }
      
      console.log(`已加載 ${dynamicAssetsCache.length} 個動態資產（含尺寸信息）`);
    }
  } catch (e) {
    console.error('加載動態資產失敗:', e);
  }
}

// 獲取工具信息（支持系統工具和動態資產）
function getToolInfo(tool: Tool): { name: string; cost: number; description: string; size?: number } {
  // 首先檢查靜態 TOOL_INFO
  if (TOOL_INFO[tool]) {
    return TOOL_INFO[tool];
  }
  // 然後檢查動態資產緩存
  const asset = dynamicAssetsCache.find(a => a.id === tool);
  if (asset) {
    return {
      name: asset.name,
      cost: asset.cost,
      description: asset.description || '',
      size: asset.gridSize.width,
    };
  }
  // 默認值
  return { name: tool, cost: 0, description: '' };
}

// 區域工具映射：翰墨境、錦繡境、豆田境
const toolZoneMap: Partial<Record<Tool, ZoneType>> = {
  zone_living: 'living',      // 翰墨境 / 民居
  zone_market: 'market',      // 錦繡境 / 市肆
  zone_farming: 'farming',    // 豆田境 / 田園
  zone_dezone: 'none',
};

// Load game state from localStorage
function loadGameState(): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // 檢測是否為新的壓縮格式（v: 2）
      if (parsed && parsed.v === 2) {
        console.log(`載入壓縮存檔: ${parsed.tiles?.length || 0} 個非草地格子`);
        return decompressGameState(parsed as CompressedSave);
      }
      
      // 舊格式：清除並創建新地圖（不再支持舊格式）
      console.log('檢測到舊格式存檔，將創建新地圖');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted game state:', clearError);
    }
  }
  return null;
}

// 太虛幻境：壓縮存檔格式
// 只保存非草地的 tile，大幅減少存檔大小
interface CompressedTile {
  x: number;
  y: number;
  t: string;  // building type
  z?: string; // zone (省略 'none')
  f?: boolean; // flipped
  w?: boolean; // onWater
  s?: number;  // visualScale
}

interface CompressedSave {
  v: 2; // 版本號
  id: string;
  name: string;
  size: number;
  tiles: CompressedTile[];
  // 保留基本狀態
  year: number;
  month: number;
  day: number;
  hour: number;
  money: number;
}

function compressGameState(state: GameState): CompressedSave {
  const tiles: CompressedTile[] = [];
  
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const tile = state.grid[y][x];
      // 只保存非草地的 tile
      if (tile.building.type !== 'grass') {
        const ct: CompressedTile = {
          x,
          y,
          t: tile.building.type,
        };
        if (tile.zone !== 'none') ct.z = tile.zone;
        if (tile.building.flipped) ct.f = true;
        if (tile.building.onWater) ct.w = true;
        if (tile.building.visualScale && tile.building.visualScale !== 1) ct.s = tile.building.visualScale;
        tiles.push(ct);
      }
    }
  }
  
  return {
    v: 2,
    id: state.id,
    name: state.cityName,
    size: state.gridSize,
    tiles,
    year: state.year,
    month: state.month,
    day: state.day,
    hour: state.hour,
    money: state.stats.money,
  };
}

function decompressGameState(compressed: CompressedSave): GameState {
  // 創建基礎狀態
  const baseState = createInitialGameState(compressed.size, compressed.name);
  
  // 還原保存的 tile
  for (const ct of compressed.tiles) {
    const tile = baseState.grid[ct.y][ct.x];
    tile.building.type = ct.t as BuildingType;
    if (ct.z) tile.zone = ct.z as ZoneType;
    if (ct.f) tile.building.flipped = true;
    if (ct.w) tile.building.onWater = true;
    if (ct.s) tile.building.visualScale = ct.s;
  }
  
  // 還原其他狀態
  baseState.id = compressed.id;
  baseState.year = compressed.year;
  baseState.month = compressed.month;
  baseState.day = compressed.day;
  baseState.hour = compressed.hour;
  baseState.stats.money = compressed.money;
  
  return baseState;
}

// Save game state to localStorage
function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    // Validate state before saving
    if (!state || !state.grid || !state.gridSize || !state.stats) {
      console.error('Invalid game state, cannot save', { state, hasGrid: !!state?.grid, hasGridSize: !!state?.gridSize, hasStats: !!state?.stats });
      return;
    }
    
    // 使用壓縮格式
    const compressed = compressGameState(state);
    const serialized = JSON.stringify(compressed);
    
    // 記錄存檔大小（用於調試）
    const sizeInKB = (serialized.length / 1024).toFixed(2);
    console.log(`存檔大小: ${sizeInKB} KB (${compressed.tiles.length} 個非草地格子)`);
    
    // Check if data is too large (localStorage has ~5-10MB limit)
    if (serialized.length > 5 * 1024 * 1024) {
      console.error(`存檔太大 (${sizeInKB} KB)，無法保存！`);
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log('遊戲已保存');
  } catch (e) {
    // Handle quota exceeded errors
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014)) {
      console.error('localStorage quota exceeded, cannot save game state');
    } else {
      console.error('Failed to save game state:', e);
    }
  }
}

// Clear saved game state
function clearGameState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear game state:', e);
  }
}

// Load sprite pack from localStorage
function loadSpritePackId(): string {
  if (typeof window === 'undefined') return DEFAULT_SPRITE_PACK_ID;
  try {
    const saved = localStorage.getItem(SPRITE_PACK_STORAGE_KEY);
    if (saved && SPRITE_PACKS.some(p => p.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load sprite pack preference:', e);
  }
  return DEFAULT_SPRITE_PACK_ID;
}

// Save sprite pack to localStorage
function saveSpritePackId(packId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPRITE_PACK_STORAGE_KEY, packId);
  } catch (e) {
    console.error('Failed to save sprite pack preference:', e);
  }
}

// Load day/night mode from localStorage
function loadDayNightMode(): DayNightMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(DAY_NIGHT_MODE_STORAGE_KEY);
    if (saved === 'auto' || saved === 'day' || saved === 'night') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load day/night mode preference:', e);
  }
  return 'auto';
}

// Save day/night mode to localStorage
function saveDayNightMode(mode: DayNightMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAY_NIGHT_MODE_STORAGE_KEY, mode);
  } catch (e) {
    console.error('Failed to save day/night mode preference:', e);
  }
}

// Save current city for later restoration (when viewing shared cities)
function saveCityForRestore(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    const savedData = {
      state: state,
      info: {
        cityName: state.cityName,
        population: state.stats.population,
        money: state.stats.money,
        savedAt: Date.now(),
      },
    };
    localStorage.setItem(SAVED_CITY_STORAGE_KEY, JSON.stringify(savedData));
  } catch (e) {
    console.error('Failed to save city for restore:', e);
  }
}

// Load saved city info (just metadata, not full state)
function loadSavedCityInfo(): SavedCityInfo {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SAVED_CITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.info) {
        return parsed.info as SavedCityInfo;
      }
    }
  } catch (e) {
    console.error('Failed to load saved city info:', e);
  }
  return null;
}

// Load full saved city state
function loadSavedCityState(): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SAVED_CITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.state && parsed.state.grid && parsed.state.gridSize && parsed.state.stats) {
        return parsed.state as GameState;
      }
    }
  } catch (e) {
    console.error('Failed to load saved city state:', e);
  }
  return null;
}

// Clear saved city
function clearSavedCityStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAVED_CITY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear saved city:', e);
  }
}

// Generate a UUID v4
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Load saved cities index from localStorage
function loadSavedCitiesIndex(): SavedCityMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SAVED_CITIES_INDEX_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as SavedCityMeta[];
      }
    }
  } catch (e) {
    console.error('Failed to load saved cities index:', e);
  }
  return [];
}

// Save saved cities index to localStorage
function saveSavedCitiesIndex(cities: SavedCityMeta[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_CITIES_INDEX_KEY, JSON.stringify(cities));
  } catch (e) {
    console.error('Failed to save cities index:', e);
  }
}

// Save a city state to localStorage
function saveCityState(cityId: string, state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(state);
    // Check if data is too large
    if (serialized.length > 5 * 1024 * 1024) {
      console.error('City state too large to save');
      return;
    }
    localStorage.setItem(SAVED_CITY_PREFIX + cityId, serialized);
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014)) {
      console.error('localStorage quota exceeded');
    } else {
      console.error('Failed to save city state:', e);
    }
  }
}

// Load a saved city state from localStorage
function loadCityState(cityId: string): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SAVED_CITY_PREFIX + cityId);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.grid && parsed.gridSize && parsed.stats) {
        return parsed as GameState;
      }
    }
  } catch (e) {
    console.error('Failed to load city state:', e);
  }
  return null;
}

// Delete a saved city from localStorage
function deleteCityState(cityId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAVED_CITY_PREFIX + cityId);
  } catch (e) {
    console.error('Failed to delete city state:', e);
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Start with a default state, we'll load from localStorage after mount
  const [state, setState] = useState<GameState>(() => createInitialGameState(DEFAULT_GRID_SIZE, '太虛小鎮'));
  
  const [hasExistingGame, setHasExistingGame] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [movingFrom, setMovingFrom] = useState<{ x: number, y: number } | null>(null);
  const [movingBuilding, setMovingBuilding] = useState<{
    type: BuildingType;
    originX: number;
    originY: number;
    flipped: boolean;
    width: number;
    height: number;
  } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(false);
  const hasLoadedRef = useRef(false);
  
  // Sprite pack state
  const [currentSpritePack, setCurrentSpritePack] = useState<SpritePack>(() => getSpritePack(DEFAULT_SPRITE_PACK_ID));
  
  // Day/night mode state
  const [dayNightMode, setDayNightModeState] = useState<DayNightMode>('auto');
  
  // Saved cities state for multi-city save system
  const [savedCities, setSavedCities] = useState<SavedCityMeta[]>([]);
  
  // 遊戲模式狀態（太虛幻境雙模式）
  const [gameMode, setGameModeState] = useState<GameMode>('build');
  
  // 玩家角色狀態（初始位置在道路附近，確保在視野中可見）
  const [player, setPlayer] = useState<Player>(() => createInitialPlayer(28, 28));
  
  // 農田互動狀態
  const [nearbyInteractable, setNearbyInteractable] = useState<InteractableTarget | null>(null);
  
  // 玩家資源狀態（暫時使用測試數據，後續與句豆應用聯動）
  const [playerResources, setPlayerResources] = useState({
    judou: 100,   // 句豆（測試用，給 100 顆）
    tiandou: 0,   // 田豆
    wenqian: 1000, // 文錢
  });
  
  // Load game state and sprite pack from localStorage on mount (client-side only)
  useEffect(() => {
    // 加載動態資產配置（優先加載，以便工具欄和放置邏輯使用）
    loadDynamicAssets();
    
    // Load sprite pack preference
    const savedPackId = loadSpritePackId();
    const pack = getSpritePack(savedPackId);
    setCurrentSpritePack(pack);
    setActiveSpritePack(pack);
    
    // Load day/night mode preference
    const savedDayNightMode = loadDayNightMode();
    setDayNightModeState(savedDayNightMode);
    
    // Load saved cities index
    const cities = loadSavedCitiesIndex();
    setSavedCities(cities);
    
    // Load game state
    const saved = loadGameState();
    if (saved) {
      skipNextSaveRef.current = true; // Set skip flag BEFORE updating state
      
      // 處理舊存檔兼容性：如果沒有 gameDay 和 gameYear，從傳統年月日轉換
      if (saved.gameDay === undefined || saved.gameYear === undefined) {
        saved.gameDay = convertToGameDay(saved.year, saved.month, saved.day);
        // 計算遊戲年份：假設從 2024 年開始為太虛元年
        saved.gameYear = saved.year >= 2024 ? (saved.year - 2024 + 1) : 1;
      }
      
      setState(saved);
      setHasExistingGame(true);
    } else {
      setHasExistingGame(false);
    }
    // Mark as loaded immediately - the skipNextSaveRef will handle skipping the first save
    hasLoadedRef.current = true;
  }, []);
  
  // Track the state that needs to be saved
  const stateToSaveRef = useRef<GameState | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Update the state to save whenever state changes
  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }
    
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      lastSaveTimeRef.current = Date.now();
      return;
    }
    
    // Store current state for saving (deep copy)
    stateToSaveRef.current = JSON.parse(JSON.stringify(state));
  }, [state]);
  
  // Separate effect that actually performs saves on an interval
  useEffect(() => {
    // Wait for initial load
    const checkLoaded = setInterval(() => {
      if (!hasLoadedRef.current) {
        return;
      }
      
      // Clear the check interval
      clearInterval(checkLoaded);
      
      // Clear any existing save interval
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      
      // Set up interval to save every 3 seconds if there's pending state
      saveIntervalRef.current = setInterval(() => {
        // Don't save if we just loaded
        if (skipNextSaveRef.current) {
          return;
        }
        
        // Don't save too frequently
        const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
        if (timeSinceLastSave < 2000) {
          return;
        }
        
        // Don't save if there's no state to save
        if (!stateToSaveRef.current) {
          return;
        }
        
        // Perform the save
        setIsSaving(true);
        try {
          saveGameState(stateToSaveRef.current);
          lastSaveTimeRef.current = Date.now();
          setHasExistingGame(true);
        } finally {
          setIsSaving(false);
        }
      }, 3000); // Check every 3 seconds
    }, 100);
    
    return () => {
      clearInterval(checkLoaded);
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // Simulation loop - with mobile performance optimization
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (state.speed > 0) {
      // Check if running on mobile for performance optimization
      const isMobileDevice = typeof window !== 'undefined' && (
        window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
      
      // Slower tick intervals on mobile to reduce CPU load
      // 星露谷時間設定：1 遊戲日 = 14 分鐘 = 840,000ms
      // 30 ticks = 1 遊戲日，所以 1 tick = 28,000ms
      // 速度1：28秒/tick（正常速度）
      // 速度2：14秒/tick（2倍速）
      // 速度3：7秒/tick（4倍速）
      // Mobile: 50% slower
      const interval = isMobileDevice
        ? (state.speed === 1 ? 42000 : state.speed === 2 ? 21000 : 10500)
        : (state.speed === 1 ? 28000 : state.speed === 2 ? 14000 : 7000);
        
      timer = setInterval(() => {
        setState((prev) => simulateTick(prev));
      }, interval);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [state.speed]);

  const setTool = useCallback((tool: Tool) => {
    setMovingFrom(null); // Reset moving state when changing tools
    setMovingBuilding(null); // Also clear any building being carried
    setState((prev) => ({ ...prev, selectedTool: tool, activePanel: 'none' }));
  }, []);

  const setSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const setTaxRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, taxRate: clamp(rate, 0, 100) }));
  }, []);

  const setActivePanel = useCallback(
    (panel: GameState['activePanel']) => {
      setState((prev) => ({ ...prev, activePanel: panel }));
    },
    [],
  );

  const setBudgetFunding = useCallback(
    (key: keyof Budget, funding: number) => {
      const clamped = clamp(funding, 0, 100);
      setState((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          [key]: { ...prev.budget[key], funding: clamped },
        },
      }));
    },
    [],
  );

  const placeAtTile = useCallback((x: number, y: number) => {
    setState((prev) => {
      const tool = prev.selectedTool;
      if (tool === 'select') {
        const tile = prev.grid[y]?.[x];
        // 如果點擊的是空地（草地、水面、空地），則不執行選擇邏輯，讓畫布處理拖動
        if (!tile || tile.building.type === 'grass' || tile.building.type === 'water' || tile.building.type === 'empty') {
          return prev;
        }
        return { ...prev, activePanel: 'none' }; // 這裡交由 Canvas 決定是否打開面板
      }

      // 使用動態工具信息（支持系統工具和動態資產）
      const info = getToolInfo(tool);
      const cost = info?.cost ?? 0;
      const tile = prev.grid[y]?.[x];

      if (!tile) return prev;
      
      // 創造者模式：忽略預算限制
      if (!IS_CREATOR_MODE && cost > 0 && prev.stats.money < cost) return prev;

      // Prevent wasted spend if nothing would change
      if (tool === 'bulldoze' && tile.building.type === 'grass' && tile.zone === 'none') {
        return prev;
      }

      // 使用動態建築類型（支持系統工具和動態資產）
      const building = getToolBuildingType(tool);
      const zone = toolZoneMap[tool];

      // Handle Move/Rotate tool
      if (tool === 'move_rotate') {
        const tile = prev.grid[y]?.[x];
        if (!tile) return prev;

        // Find the actual origin of the building clicked (if any)
        const clickedOrigin = findBuildingOrigin(prev.grid, x, y, prev.gridSize);
        const actualX = clickedOrigin ? clickedOrigin.originX : x;
        const actualY = clickedOrigin ? clickedOrigin.originY : y;
        const actualTile = prev.grid[actualY]?.[actualX];

        // If we're currently holding a building to move
        if (movingBuilding) {
          // Check if clicked on original position -> Rotate
          if (actualX === movingBuilding.originX && actualY === movingBuilding.originY) {
            // Toggle flip and place back
            setMovingBuilding(null);
            setMovingFrom(null);
            // First restore the building, then rotate it
            let nextState = placeBuilding(prev, movingBuilding.originX, movingBuilding.originY, movingBuilding.type, null);
            // Apply the flipped state
            if (nextState.grid[movingBuilding.originY]?.[movingBuilding.originX]) {
              const newGrid = nextState.grid.map(row => row.map(t => ({ ...t, building: { ...t.building } })));
              newGrid[movingBuilding.originY][movingBuilding.originX].building.flipped = !movingBuilding.flipped;
              nextState = { ...nextState, grid: newGrid, selectedTool: 'select' as Tool };
            }
            return nextState;
          }

          // Check if destination is valid (grass or tree)
          const destClear = (() => {
            for (let dy = 0; dy < movingBuilding.height; dy++) {
              for (let dx = 0; dx < movingBuilding.width; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= prev.gridSize || ty >= prev.gridSize) return false;
                const t = prev.grid[ty]?.[tx];
                if (!t) return false;
                if (t.building.type !== 'grass' && t.building.type !== 'tree') return false;
              }
            }
            return true;
          })();

          if (destClear) {
            // Place building at new location
            let nextState = placeBuilding(prev, x, y, movingBuilding.type, null);
            // Apply the flipped state
            if (nextState.grid[y]?.[x]) {
              const newGrid = nextState.grid.map(row => row.map(t => ({ ...t, building: { ...t.building } })));
              newGrid[y][x].building.flipped = movingBuilding.flipped;
              nextState = { ...nextState, grid: newGrid, selectedTool: 'select' as Tool };
            }
            setMovingBuilding(null);
            setMovingFrom(null);
            return nextState;
          }
          // Can't place here, keep holding
          return prev;
        } else {
          // Not holding anything -> Try to pick up a building
          if (!actualTile) return prev;
          const buildingType = actualTile.building.type;
          if (buildingType === 'grass' || buildingType === 'tree' || buildingType === 'water' || buildingType === 'empty') {
            return prev; // Nothing to pick up
          }

          // Get building info before removing
          const size = getBuildingSize(buildingType);
          const isFlipped = actualTile.building.flipped || false;

          // Pick up the building (remove from map)
          setMovingBuilding({
            type: buildingType,
            originX: actualX,
            originY: actualY,
            flipped: isFlipped,
            width: size.width,
            height: size.height,
          });
          setMovingFrom({ x: actualX, y: actualY });

          // Remove the building from the map
          return bulldozeTile(prev, actualX, actualY);
        }
      }

      if (zone && tile.zone === zone) return prev;
      if (building && tile.building.type === building) return prev;
      
      // Handle subway tool separately (underground placement)
      if (tool === 'subway') {
        // Can't place subway under water
        if (tile.building.type === 'water') return prev;
        // Already has subway
        if (tile.hasSubway) return prev;
        
        const nextState = placeSubway(prev, x, y);
        if (nextState === prev) return prev;
        
        // 創造者模式：不扣費
        if (IS_CREATOR_MODE) return nextState;
        
        return {
          ...nextState,
          stats: { ...nextState.stats, money: nextState.stats.money - cost },
        };
      }

      let nextState: GameState;

      if (tool === 'bulldoze') {
        nextState = bulldozeTile(prev, x, y);
      } else if (zone) {
        nextState = placeBuilding(prev, x, y, null, zone);
      } else if (building) {
        nextState = placeBuilding(prev, x, y, building, null);
      } else {
        // 動態資產支持：如果 tool 不在已知映射中，嘗試作為自定義資產 ID 處理
        // 自定義資產的 ID 直接作為 BuildingType 使用
        const customBuildingType = tool as BuildingType;
        // 檢查是否有對應的圖片文件（通過嘗試放置來驗證）
        nextState = placeBuilding(prev, x, y, customBuildingType, null);
        if (nextState === prev) return prev;
      }

      if (nextState === prev) return prev;

      // 創造者模式：不扣費
      if (!IS_CREATOR_MODE && cost > 0) {
        nextState = {
          ...nextState,
          stats: { ...nextState.stats, money: nextState.stats.money - cost },
        };
      }

      return nextState;
    });
  }, [movingBuilding]);

  const connectToCity = useCallback((cityId: string) => {
    setState((prev) => {
      const city = prev.adjacentCities.find(c => c.id === cityId);
      if (!city || city.connected) return prev;

      // Mark city as connected (and discovered if not already) and add trade income
      const updatedCities = prev.adjacentCities.map(c =>
        c.id === cityId ? { ...c, connected: true, discovered: true } : c
      );

      // Add trade income bonus (one-time bonus + monthly income)
      const tradeBonus = 5000;
      const tradeIncome = 200; // Monthly income from trade

      return {
        ...prev,
        adjacentCities: updatedCities,
        stats: {
          ...prev.stats,
          money: prev.stats.money + tradeBonus,
          income: prev.stats.income + tradeIncome,
        },
        notifications: [
          {
            id: `city-connect-${Date.now()}`,
            title: 'City Connected!',
            description: `Trade route established with ${city.name}. +$${tradeBonus} bonus and +$${tradeIncome}/month income.`,
            icon: 'road',
            timestamp: Date.now(),
          },
          ...prev.notifications.slice(0, 9), // Keep only 10 most recent
        ],
      };
    });
  }, []);

  const discoverCity = useCallback((cityId: string) => {
    setState((prev) => {
      const city = prev.adjacentCities.find(c => c.id === cityId);
      if (!city || city.discovered) return prev;

      // Mark city as discovered
      const updatedCities = prev.adjacentCities.map(c =>
        c.id === cityId ? { ...c, discovered: true } : c
      );

      return {
        ...prev,
        adjacentCities: updatedCities,
        notifications: [
          {
            id: `city-discover-${Date.now()}`,
            title: 'City Discovered!',
            description: `Your road has reached the ${city.direction} border! You can now connect to ${city.name}.`,
            icon: 'road',
            timestamp: Date.now(),
          },
          ...prev.notifications.slice(0, 9), // Keep only 10 most recent
        ],
      };
    });
  }, []);

  // Check for cities that should be discovered based on roads reaching edges
  // Calls onDiscover callback with city info if a new city was discovered
  const checkAndDiscoverCities = useCallback((onDiscover?: (city: { id: string; direction: 'north' | 'south' | 'east' | 'west'; name: string }) => void): void => {
    setState((prev) => {
      const newlyDiscovered = checkForDiscoverableCities(prev.grid, prev.gridSize, prev.adjacentCities);
      
      if (newlyDiscovered.length === 0) return prev;
      
      // Discover the first city found
      const cityToDiscover = newlyDiscovered[0];
      
      const updatedCities = prev.adjacentCities.map(c =>
        c.id === cityToDiscover.id ? { ...c, discovered: true } : c
      );
      
      // Call the callback after state update is scheduled
      if (onDiscover) {
        setTimeout(() => {
          onDiscover({
            id: cityToDiscover.id,
            direction: cityToDiscover.direction,
            name: cityToDiscover.name,
          });
        }, 0);
      }
      
      return {
        ...prev,
        adjacentCities: updatedCities,
      };
    });
  }, []);

  const setDisastersEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, disastersEnabled: enabled }));
  }, []);

  const setSpritePack = useCallback((packId: string) => {
    const pack = getSpritePack(packId);
    setCurrentSpritePack(pack);
    setActiveSpritePack(pack);
    saveSpritePackId(packId);
  }, []);

  const setDayNightMode = useCallback((mode: DayNightMode) => {
    setDayNightModeState(mode);
    saveDayNightMode(mode);
  }, []);

  // Compute the visual hour based on the day/night mode override
  // This doesn't affect time progression, just the rendering
  const visualHour = dayNightMode === 'auto' 
    ? state.hour 
    : dayNightMode === 'day' 
      ? 12  // Noon - full daylight
      : 22; // Night time

  const newGame = useCallback((name?: string, size?: number) => {
    clearGameState(); // Clear saved state when starting fresh
    const fresh = createInitialGameState(size ?? DEFAULT_GRID_SIZE, name || '太虛小鎮');
    // Increment gameVersion from current state to ensure vehicles/entities are cleared
    setState((prev) => ({
      ...fresh,
      gameVersion: (prev.gameVersion ?? 0) + 1,
    }));
  }, []);

  const loadState = useCallback((stateString: string): boolean => {
    try {
      const parsed = JSON.parse(stateString);
      // Validate it has essential properties
      if (parsed && 
          parsed.grid && 
          Array.isArray(parsed.grid) &&
          parsed.gridSize && 
          typeof parsed.gridSize === 'number' &&
          parsed.stats &&
          parsed.stats.money !== undefined &&
          parsed.stats.population !== undefined) {
        // Ensure new fields exist for backward compatibility
        if (!parsed.adjacentCities) {
          parsed.adjacentCities = [];
        }
        // Migrate adjacentCities to have 'discovered' property
        for (const city of parsed.adjacentCities) {
          if (city.discovered === undefined) {
            // Old cities that exist are implicitly discovered (they were visible in the old system)
            city.discovered = true;
          }
        }
        if (!parsed.waterBodies) {
          parsed.waterBodies = [];
        }
        // Ensure effectiveTaxRate exists for lagging tax effect
        if (parsed.effectiveTaxRate === undefined) {
          parsed.effectiveTaxRate = parsed.taxRate ?? 9;
        }
        // Migrate constructionProgress for existing buildings (they're already built)
        if (parsed.grid) {
          for (let y = 0; y < parsed.grid.length; y++) {
            for (let x = 0; x < parsed.grid[y].length; x++) {
              if (parsed.grid[y][x]?.building && parsed.grid[y][x].building.constructionProgress === undefined) {
                parsed.grid[y][x].building.constructionProgress = 100; // Existing buildings are complete
              }
              // Migrate abandoned property for existing buildings (they're not abandoned)
              if (parsed.grid[y][x]?.building && parsed.grid[y][x].building.abandoned === undefined) {
                parsed.grid[y][x].building.abandoned = false;
              }
            }
          }
        }
        // Increment gameVersion to clear vehicles/entities when loading a new state
        setState((prev) => ({
          ...(parsed as GameState),
          gameVersion: (prev.gameVersion ?? 0) + 1,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const exportState = useCallback((): string => {
    return JSON.stringify(state);
  }, [state]);

  const generateRandomCity = useCallback(() => {
    clearGameState(); // Clear saved state when generating a new city
    const randomCity = generateRandomAdvancedCity(DEFAULT_GRID_SIZE);
    // Increment gameVersion to ensure vehicles/entities are cleared
    setState((prev) => ({
      ...randomCity,
      gameVersion: (prev.gameVersion ?? 0) + 1,
    }));
  }, []);

  const addMoney = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        money: prev.stats.money + amount,
      },
    }));
  }, []);

  const addNotification = useCallback((title: string, description: string, icon: string) => {
    setState((prev) => {
      const newNotifications = [
        {
          id: `cheat-${Date.now()}-${Math.random()}`,
          title,
          description,
          icon,
          timestamp: Date.now(),
        },
        ...prev.notifications,
      ];
      // Keep only recent notifications
      while (newNotifications.length > 10) {
        newNotifications.pop();
      }
      return {
        ...prev,
        notifications: newNotifications,
      };
    });
  }, []);

  // Save current city for restore (when viewing shared cities)
  const saveCurrentCityForRestore = useCallback(() => {
    saveCityForRestore(state);
  }, [state]);

  // Restore saved city
  const restoreSavedCity = useCallback((): boolean => {
    const savedState = loadSavedCityState();
    if (savedState) {
      skipNextSaveRef.current = true;
      setState(savedState);
      clearSavedCityStorage();
      return true;
    }
    return false;
  }, []);

  // Get saved city info
  const getSavedCityInfo = useCallback((): SavedCityInfo => {
    return loadSavedCityInfo();
  }, []);

  // Clear saved city
  const clearSavedCity = useCallback(() => {
    clearSavedCityStorage();
  }, []);

  // Save current city to the multi-save system
  const saveCity = useCallback(() => {
    const cityMeta: SavedCityMeta = {
      id: state.id,
      cityName: state.cityName,
      population: state.stats.population,
      money: state.stats.money,
      year: state.year,
      month: state.month,
      gridSize: state.gridSize,
      savedAt: Date.now(),
    };
    
    // Save the city state
    saveCityState(state.id, state);
    
    // Update the index
    setSavedCities((prev) => {
      // Check if this city already exists in the list
      const existingIndex = prev.findIndex((c) => c.id === state.id);
      let newCities: SavedCityMeta[];
      
      if (existingIndex >= 0) {
        // Update existing entry
        newCities = [...prev];
        newCities[existingIndex] = cityMeta;
      } else {
        // Add new entry
        newCities = [...prev, cityMeta];
      }
      
      // Sort by savedAt descending (most recent first)
      newCities.sort((a, b) => b.savedAt - a.savedAt);
      
      // Persist to localStorage
      saveSavedCitiesIndex(newCities);
      
      return newCities;
    });
  }, [state]);

  // Load a saved city from the multi-save system
  const loadSavedCity = useCallback((cityId: string): boolean => {
    const cityState = loadCityState(cityId);
    if (!cityState) return false;
    
    // Ensure the loaded state has an ID
    if (!cityState.id) {
      cityState.id = cityId;
    }
    
    // Perform migrations for backward compatibility
    if (!cityState.adjacentCities) {
      cityState.adjacentCities = [];
    }
    for (const city of cityState.adjacentCities) {
      if (city.discovered === undefined) {
        city.discovered = true;
      }
    }
    if (!cityState.waterBodies) {
      cityState.waterBodies = [];
    }
    if (cityState.effectiveTaxRate === undefined) {
      cityState.effectiveTaxRate = cityState.taxRate ?? 9;
    }
    if (cityState.grid) {
      for (let y = 0; y < cityState.grid.length; y++) {
        for (let x = 0; x < cityState.grid[y].length; x++) {
          if (cityState.grid[y][x]?.building && cityState.grid[y][x].building.constructionProgress === undefined) {
            cityState.grid[y][x].building.constructionProgress = 100;
          }
          if (cityState.grid[y][x]?.building && cityState.grid[y][x].building.abandoned === undefined) {
            cityState.grid[y][x].building.abandoned = false;
          }
        }
      }
    }
    
    skipNextSaveRef.current = true;
    setState((prev) => ({
      ...cityState,
      gameVersion: (prev.gameVersion ?? 0) + 1,
    }));
    
    // Also update the current game in local storage
    saveGameState(cityState);
    
    return true;
  }, []);

  // Delete a saved city from the multi-save system
  const deleteSavedCity = useCallback((cityId: string) => {
    // Delete the city state
    deleteCityState(cityId);
    
    // Update the index
    setSavedCities((prev) => {
      const newCities = prev.filter((c) => c.id !== cityId);
      saveSavedCitiesIndex(newCities);
      return newCities;
    });
  }, []);

  // Rename a saved city
  const renameSavedCity = useCallback((cityId: string, newName: string) => {
    // Load the city state, update the name, and save it back
    const cityState = loadCityState(cityId);
    if (cityState) {
      cityState.cityName = newName;
      saveCityState(cityId, cityState);
    }
    
    // Update the index
    setSavedCities((prev) => {
      const newCities = prev.map((c) =>
        c.id === cityId ? { ...c, cityName: newName } : c
      );
      saveSavedCitiesIndex(newCities);
      return newCities;
    });
    
    // If the current game is the one being renamed, update its state too
    if (state.id === cityId) {
      setState((prev) => ({ ...prev, cityName: newName }));
    }
  }, [state.id]);

  const updateBuildingScale = useCallback((x: number, y: number, scale: number) => {
    setState((prev) => {
      const tile = prev.grid[y]?.[x];
      if (!tile || tile.building.type === 'empty' || tile.building.type === 'grass' || tile.building.type === 'water') {
        return prev;
      }

      const newGrid = prev.grid.map(row => row.map(t => ({ ...t, building: { ...t.building } })));
      
      // 找出建築起源點（處理多地塊建築）
      const origin = findBuildingOrigin(newGrid, x, y, prev.gridSize);
      const targetX = origin ? origin.originX : x;
      const targetY = origin ? origin.originY : y;
      
      // 更新起源點的縮放比例
      newGrid[targetY][targetX].building.visualScale = scale;
      
      // 如果是多地塊建築，同步更新所有子地塊的縮放標記（雖然渲染主要看起源，但同步更穩健）
      const buildingType = newGrid[targetY][targetX].building.type;
      const size = getBuildingSize(buildingType);
      if (size.width > 1 || size.height > 1) {
        for (let dy = 0; dy < size.height; dy++) {
          for (let dx = 0; dx < size.width; dx++) {
            const tx = targetX + dx;
            const ty = targetY + dy;
            if (newGrid[ty]?.[tx]) {
              newGrid[ty][tx].building.visualScale = scale;
            }
          }
        }
      }

      return { ...prev, grid: newGrid };
    });
  }, []);

  const rotateBuildingAt = useCallback((x: number, y: number) => {
    setState((prev) => {
      const nextState = rotateBuilding(prev, x, y);
      return nextState;
    });
  }, []);

  const pickUpBuildingAt = useCallback((x: number, y: number) => {
    setState((prev) => {
      const tile = prev.grid[y]?.[x];
      if (!tile) return prev;

      // 找出實際起源點
      const origin = findBuildingOrigin(prev.grid, x, y, prev.gridSize);
      const actualX = origin ? origin.originX : x;
      const actualY = origin ? origin.originY : y;
      const actualTile = prev.grid[actualY]?.[actualX];

      if (!actualTile) return prev;
      const buildingType = actualTile.building.type;
      if (buildingType === 'grass' || buildingType === 'tree' || buildingType === 'water' || buildingType === 'empty') {
        return prev;
      }

      const size = getBuildingSize(buildingType);
      const isFlipped = actualTile.building.flipped || false;

      // 設置搬遷狀態
      setMovingBuilding({
        type: buildingType,
        originX: actualX,
        originY: actualY,
        flipped: isFlipped,
        width: size.width,
        height: size.height,
      });
      setMovingFrom({ x: actualX, y: actualY });

      // 切換工具為搬遷，並拆除原位置建築
      const nextState = bulldozeTile(prev, actualX, actualY);
      return { ...nextState, selectedTool: 'move_rotate' as Tool };
    });
  }, []);

  const updateRoadVisualScale = useCallback((scale: number) => {
    setState((prev) => ({
      ...prev,
      roadVisualScale: Math.max(0.05, Math.min(3.0, scale)),
    }));
  }, []);

  // 設置遊戲模式
  const setGameMode = useCallback((mode: GameMode) => {
    setGameModeState(mode);
    
    // 切換到遊歷模式時，確保玩家位置有效
    if (mode === 'explore') {
      setPlayer((prevPlayer) => {
        // 檢查當前位置是否有效，如果無效則重新定位
        const gridSize = state.gridSize;
        const grid = state.grid;
        const x = Math.floor(prevPlayer.x);
        const y = Math.floor(prevPlayer.y);
        
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
          const spawn = findPlayerSpawnPosition(grid, gridSize);
          return { ...prevPlayer, x: spawn.x, y: spawn.y };
        }
        return prevPlayer;
      });
    }
  }, [state.grid, state.gridSize]);

  // 更新玩家狀態
  const updatePlayer = useCallback((newPlayer: Player) => {
    setPlayer(newPlayer);
  }, []);

  // 更新玩家附近的可互動目標（每次玩家移動時調用）
  const updateNearbyInteractable = useCallback((playerX: number, playerY: number) => {
    // 計算當前遊戲天數（基於 120 天循環）
    const currentGameDay = state.gameDay ?? calculateGameDay(state.year, state.month, state.day);
    const target = findNearbyFarm(playerX, playerY, state.grid, state.gridSize, currentGameDay);
    setNearbyInteractable(target);
  }, [state.grid, state.gridSize, state.year, state.month, state.day]);

  // 執行農田互動（種植或收穫）
  const doFarmInteraction = useCallback((): { success: boolean; message: string } => {
    if (!nearbyInteractable) {
      return { success: false, message: '附近沒有可互動的對象' };
    }

    const { type, x, y } = nearbyInteractable;

    if (type === 'farm_empty') {
      // 種植
      if (playerResources.judou < 10) {
        return { success: false, message: '句豆不足！需要 10 顆句豆' };
      }

      // 計算當前遊戲天數並檢查是否在播種季節
      const currentGameDay = state.gameDay ?? calculateGameDay(state.year, state.month, state.day);
      if (!canPlantBean(currentGameDay)) {
        const season = currentGameDay >= 1 && currentGameDay <= 30 ? '春季' :
                       currentGameDay >= 31 && currentGameDay <= 60 ? '夏季' :
                       currentGameDay >= 61 && currentGameDay <= 90 ? '秋季' : '冬季';
        return { success: false, message: `現在是${season}，不是豆子的播種季節（只能在春季播種）` };
      }

      // 更新農田狀態
      setState((prev) => {
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t, building: { ...t.building } })));
        const tile = newGrid[y]?.[x];
        if (tile && tile.building.farmData) {
          const currentDay = prev.gameDay ?? calculateGameDay(prev.year, prev.month, prev.day);
          tile.building = plantCrop(tile.building, 10, currentDay);
        }
        return { ...prev, grid: newGrid };
      });

      // 扣除句豆
      setPlayerResources(prev => ({ ...prev, judou: prev.judou - 10 }));
      
      // 清除互動目標（會在下次移動時重新檢測）
      setNearbyInteractable(null);
      
      return { success: true, message: '種下了 10 顆句豆！' };
    }

    if (type === 'farm_ready') {
      // 收穫
      setState((prev) => {
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t, building: { ...t.building } })));
        const tile = newGrid[y]?.[x];
        if (tile && tile.building.farmData) {
          const { building: newBuilding, harvestAmount } = harvestCrop(tile.building);
          tile.building = newBuilding;
          
          // 增加田豆
          setPlayerResources(prevRes => ({ ...prevRes, tiandou: prevRes.tiandou + harvestAmount }));
        }
        return { ...prev, grid: newGrid };
      });
      
      // 清除互動目標
      setNearbyInteractable(null);
      
      return { success: true, message: '收穫成功！' };
    }

    if (type === 'farm_growing') {
      return { success: false, message: `作物還在生長中... ${nearbyInteractable.data?.growthProgress || 0}%` };
    }

    return { success: false, message: '無法互動' };
  }, [nearbyInteractable, playerResources.judou]);

  // 增加玩家資源
  const addPlayerResource = useCallback((type: 'judou' | 'tiandou' | 'wenqian', amount: number) => {
    setPlayerResources(prev => ({
      ...prev,
      [type]: prev[type] + amount,
    }));
  }, []);

  const value: GameContextValue = {
    state,
    setTool,
    setSpeed,
    setTaxRate,
    setActivePanel,
    setBudgetFunding,
    placeAtTile,
    connectToCity,
    discoverCity,
    checkAndDiscoverCities,
    setDisastersEnabled,
    newGame,
    loadState,
    exportState,
    generateRandomCity,
    hasExistingGame,
    isSaving,
    addMoney,
    addNotification,
    movingFrom,
    movingBuilding,
    // Sprite pack management
    currentSpritePack,
    availableSpritePacks: SPRITE_PACKS,
    setSpritePack,
    // Day/night mode override
    dayNightMode,
    setDayNightMode,
    visualHour,
    // Save/restore city for shared links
    saveCurrentCityForRestore,
    restoreSavedCity,
    getSavedCityInfo,
    clearSavedCity,
    // Multi-city save system
    savedCities,
    saveCity,
    loadSavedCity,
    deleteSavedCity,
    renameSavedCity,
    updateBuildingScale,
    rotateBuildingAt,
    pickUpBuildingAt,
    updateRoadVisualScale,
    // 遊戲模式系統（太虛幻境雙模式）
    gameMode,
    setGameMode,
    player,
    updatePlayer,
    // 農田互動系統
    nearbyInteractable,
    updateNearbyInteractable,
    doFarmInteraction,
    // 玩家資源
    playerResources,
    addPlayerResource,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}




