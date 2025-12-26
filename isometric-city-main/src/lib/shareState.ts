// Share state utility - compress game state for URL sharing
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { GameState, Tile, Building, ZoneType, BuildingType } from '@/types/game';

// Short key mappings for maximum compression
const ZONE_MAP: Record<ZoneType, number> = { 'none': 0, 'living': 1, 'market': 2, 'farming': 3 };
const ZONE_REVERSE: Record<number, ZoneType> = { 0: 'none', 1: 'living', 2: 'market', 3: 'farming' };

// Building types mapped to numbers for compression
const BUILDING_TYPES: BuildingType[] = [
  'empty', 'grass', 'water', 'road', 'rail', 'tree',
  'house_small', 'house_medium', 'mansion', 'apartment_low', 'apartment_high',
  'shop_small', 'shop_medium', 'office_low', 'office_high', 'mall',
  'factory_small', 'factory_medium', 'factory_large', 'warehouse',
  'police_station', 'fire_station', 'hospital', 'school', 'university',
  'park', 'park_large', 'tennis', 'power_plant', 'water_tower', 'subway_station',
  'rail_station', 'stadium', 'museum', 'airport', 'space_program', 'city_hall', 'amusement_park',
  'basketball_courts', 'playground_small', 'playground_large', 'baseball_field_small',
  'soccer_field_small', 'football_field', 'baseball_stadium', 'community_center',
  'office_building_small', 'swimming_pool', 'skate_park', 'mini_golf_course',
  'bleachers_field', 'go_kart_track', 'amphitheater', 'greenhouse_garden',
  'animal_pens_farm', 'cabin_house', 'campground', 'marina_docks_small', 'pier_large',
  'roller_coaster_small', 'community_garden', 'pond_park', 'park_gate',
  'mountain_lodge', 'mountain_trailhead'
];

const BUILDING_MAP: Record<BuildingType, number> = BUILDING_TYPES.reduce((acc, type, idx) => {
  acc[type] = idx;
  return acc;
}, {} as Record<BuildingType, number>);

const BUILDING_REVERSE: Record<number, BuildingType> = BUILDING_TYPES.reduce((acc, type, idx) => {
  acc[idx] = type;
  return acc;
}, {} as Record<number, BuildingType>);

// Minified tile representation: [zone, buildingType, level, population, powered, watered, landValue, hasSubway, constructionProgress, abandoned, flipped, hasRailOverlay]
// 注意：已移除 jobs 欄位，舊存檔會在 expandTile 中兼容處理
type MinTile = [number, number, number, number, number, number, number, number, number, number, number, number];

// Minified state for sharing
interface MinState {
  v: number; // version
  n: string; // cityName
  s: number; // gridSize
  y: number; // year
  m: number; // month
  d: number; // day
  h: number; // hour
  t: number; // taxRate
  $: number; // money
  g: MinTile[][]; // grid (minified)
  ac?: { id: string; n: string; dir: string; c: boolean; d: boolean }[]; // adjacentCities
}

function minifyTile(tile: Tile): MinTile {
  return [
    ZONE_MAP[tile.zone],
    BUILDING_MAP[tile.building.type],
    tile.building.level,
    tile.building.population,
    tile.building.powered ? 1 : 0,
    tile.building.watered ? 1 : 0,
    tile.landValue,
    tile.hasSubway ? 1 : 0,
    tile.building.constructionProgress ?? 100,
    tile.building.abandoned ? 1 : 0,
    tile.building.flipped ? 1 : 0,
    tile.hasRailOverlay ? 1 : 0,
  ];
}

function expandTile(min: MinTile, x: number, y: number): Tile {
  // 太虛幻境：新版存檔格式（12 個元素，已移除 jobs）
  // 索引：[zone, buildingType, level, population, powered, watered, landValue, hasSubway, constructionProgress, abandoned, flipped, hasRailOverlay]
  const building: Building = {
    type: BUILDING_REVERSE[min[1]] ?? 'grass',
    level: min[2],
    population: min[3],
    powered: min[4] === 1,
    watered: min[5] === 1,
    onFire: false,
    fireProgress: 0,
    age: 0,
    constructionProgress: min[8] ?? 100,
    abandoned: min[9] === 1,
    flipped: min[10] === 1,
  };

  return {
    x,
    y,
    zone: ZONE_REVERSE[min[0]] ?? 'none',
    building,
    landValue: min[6],
    pollution: 0,
    crime: 0,
    traffic: 0,
    hasSubway: min[7] === 1,
    hasRailOverlay: min[11] === 1,
  };
}

/**
 * Compress game state to URL-safe string
 */
export function compressGameState(state: GameState): string {
  const minState: MinState = {
    v: 1, // version for future compatibility
    n: state.cityName,
    s: state.gridSize,
    y: state.year,
    m: state.month,
    d: state.day,
    h: state.hour,
    t: state.taxRate,
    $: state.stats.money,
    g: state.grid.map(row => row.map(tile => minifyTile(tile))),
  };

  // Include adjacent cities if any are discovered
  if (state.adjacentCities && state.adjacentCities.length > 0) {
    minState.ac = state.adjacentCities.map(city => ({
      id: city.id,
      n: city.name,
      dir: city.direction[0], // just first letter
      c: city.connected,
      d: city.discovered,
    }));
  }

  const json = JSON.stringify(minState);
  return compressToEncodedURIComponent(json);
}

/**
 * Decompress URL string back to partial game state
 * Returns partial state that should be merged with a fresh game state
 */
export function decompressGameState(compressed: string): Partial<GameState> | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const min: MinState = JSON.parse(json);
    
    // Version check for future compatibility
    if (min.v !== 1) {
      console.warn('Unknown share state version:', min.v);
    }

    // Rebuild the grid
    const grid: Tile[][] = min.g.map((row, y) => 
      row.map((minTile, x) => expandTile(minTile, x, y))
    );

    // Rebuild adjacent cities
    const adjacentCities = min.ac?.map(city => ({
      id: city.id,
      name: city.n,
      direction: (city.dir === 'n' ? 'north' : city.dir === 's' ? 'south' : city.dir === 'e' ? 'east' : 'west') as 'north' | 'south' | 'east' | 'west',
      connected: city.c,
      discovered: city.d,
    })) ?? [];

    return {
      cityName: min.n,
      gridSize: min.s,
      year: min.y,
      month: min.m,
      day: min.d,
      hour: min.h,
      taxRate: min.t,
      effectiveTaxRate: min.t,
      grid,
      adjacentCities,
      stats: {
        money: min.$,
        population: 0, // Will be recalculated
        income: 0,
        expenses: 0,
        happiness: 50,
        health: 50,
        education: 50,
        safety: 50,
        environment: 50,
        demand: { living: 0, market: 0, farming: 0 },
      },
    };
  } catch (e) {
    console.error('Failed to decompress game state:', e);
    return null;
  }
}

/**
 * Create a shareable URL for the current game state
 */
export function createShareUrl(state: GameState): string {
  const compressed = compressGameState(state);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${baseUrl}#s=${compressed}`;
}

/**
 * Extract compressed state from URL hash if present
 */
export function getStateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#s=')) return null;
  
  return hash.substring(3); // Remove '#s='
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareUrl(state: GameState): Promise<boolean> {
  try {
    const url = createShareUrl(state);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (e) {
    console.error('Failed to copy share URL:', e);
    return false;
  }
}
