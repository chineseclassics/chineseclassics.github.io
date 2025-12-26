/**
 * 太虛幻境時間系統
 * 
 * 基於二十四節氣的時間系統：
 * - 1 太虛年 = 120 遊戲天 = 12 個月（每 10 天一個月）
 * - 1 季節 = 30 天 = 3 個月
 * - 1 節氣 = 5 天（24 節氣）
 */

// ============================================================================
// 常量定義
// ============================================================================

/** 1 太虛年 = 120 遊戲天 */
export const GAME_YEAR_DAYS = 120;

/** 1 季節 = 30 天 */
export const SEASON_DAYS = 30;

/** 1 個月 = 10 天 */
export const MONTH_DAYS = 10;

/** 1 節氣 = 5 天 */
export const SOLAR_TERM_DAYS = 5;

/** 二十四節氣序列 */
export const SOLAR_TERMS = [
  '立春', '雨水', '驚蟄', '春分', '清明', '穀雨',      // 春季（1-30天）
  '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',      // 夏季（31-60天）
  '立秋', '處暑', '白露', '秋分', '寒露', '霜降',      // 秋季（61-90天）
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',      // 冬季（91-120天）
] as const;

/** 季節名稱 */
export const SEASON_NAMES = ['春', '夏', '秋', '冬'] as const;

/** 月份名稱（12 個月） */
export const MONTH_NAMES = [
  '正月', '二月', '三月',      // 春季
  '四月', '五月', '六月',      // 夏季
  '七月', '八月', '九月',      // 秋季
  '十月', '冬月', '臘月',      // 冬季
] as const;

/** 季節範圍 */
export const SPRING_START = 1;
export const SPRING_END = 30;
export const SUMMER_START = 31;
export const SUMMER_END = 60;
export const AUTUMN_START = 61;
export const AUTUMN_END = 90;
export const WINTER_START = 91;
export const WINTER_END = 120;

// ============================================================================
// 類型定義
// ============================================================================

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SolarTerm = typeof SOLAR_TERMS[number];
export type MonthName = typeof MONTH_NAMES[number];
export type SeasonName = typeof SEASON_NAMES[number];

export interface TimeDisplay {
  /** 年份顯示（如「太虛元年」） */
  year: string;
  /** 月份名稱（如「正月」） */
  month: string;
  /** 當前節氣名稱（如「立春」） */
  solarTerm: SolarTerm;
  /** 季節進度（0-1，用於進度條） */
  seasonProgress: number;
  /** 節氣進度（0-1，當前節氣內進度） */
  solarTermProgress: number;
  /** 季節索引（0-3） */
  seasonIndex: number;
  /** 月份索引（0-11） */
  monthIndex: number;
  /** 節氣索引（0-23） */
  solarTermIndex: number;
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 根據遊戲天數獲取季節
 */
export function getSeason(gameDay: number): Season {
  if (gameDay >= SPRING_START && gameDay <= SPRING_END) return 'spring';
  if (gameDay >= SUMMER_START && gameDay <= SUMMER_END) return 'summer';
  if (gameDay >= AUTUMN_START && gameDay <= AUTUMN_END) return 'autumn';
  return 'winter';
}

/**
 * 獲取季節顯示名稱（中文）
 */
export function getSeasonName(season: Season): SeasonName {
  const map: Record<Season, SeasonName> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬',
  };
  return map[season];
}

/**
 * 計算時間顯示信息
 * 
 * @param gameDay 遊戲天數（1-120，循環）
 * @param gameYear 遊戲年份（從 1 開始）
 * @returns 時間顯示信息
 */
export function getTimeDisplay(gameDay: number, gameYear: number): TimeDisplay {
  // 確保 gameDay 在有效範圍內（1-120）
  const normalizedDay = ((gameDay - 1) % GAME_YEAR_DAYS) + 1;
  
  // 計算季節索引（0-3）
  const seasonIndex = Math.floor((normalizedDay - 1) / SEASON_DAYS);
  const season = getSeason(normalizedDay);
  
  // 計算季節內天數（1-30）
  const dayInSeason = ((normalizedDay - 1) % SEASON_DAYS) + 1;
  
  // 計算月份索引（0-11，每年12個月）
  const monthIndex = Math.floor((normalizedDay - 1) / MONTH_DAYS);
  const monthName = MONTH_NAMES[monthIndex];
  
  // 計算節氣索引（0-23）
  const solarTermIndex = Math.floor((normalizedDay - 1) / SOLAR_TERM_DAYS);
  
  // 計算季節進度（0-1）
  const seasonProgress = (dayInSeason - 1) / SEASON_DAYS;
  
  // 計算節氣進度（0-1）
  const dayInSolarTerm = ((normalizedDay - 1) % SOLAR_TERM_DAYS) + 1;
  const solarTermProgress = (dayInSolarTerm - 1) / SOLAR_TERM_DAYS;
  
  return {
    year: `太虛${gameYear}年`,
    month: monthName,
    solarTerm: SOLAR_TERMS[solarTermIndex],
    seasonProgress,
    solarTermProgress,
    seasonIndex,
    monthIndex,
    solarTermIndex,
  };
}

/**
 * 從傳統年月日轉換為遊戲天數（用於兼容舊存檔）
 * 
 * @param year 傳統年份
 * @param month 傳統月份（1-12）
 * @param day 傳統日期（1-30）
 * @returns 遊戲天數（1-120）
 */
export function convertToGameDay(year: number, month: number, day: number): number {
  // 假設從 2024 年開始，每年 360 天（12個月×30天）
  // 轉換為 120 天循環
  const totalTraditionalDays = ((year - 2024) * 360) + ((month - 1) * 30) + (day - 1);
  const gameDay = (totalTraditionalDays % GAME_YEAR_DAYS) + 1;
  return gameDay;
}

/**
 * 從遊戲天數和年份計算傳統年月日（用於兼容舊系統）
 */
export function convertToTraditionalDate(gameDay: number, gameYear: number): {
  year: number;
  month: number;
  day: number;
} {
  // 假設 1 太虛年 = 1 傳統年
  // 將 120 天映射到 360 天（12個月×30天）
  const normalizedDay = ((gameDay - 1) % GAME_YEAR_DAYS) + 1;
  const traditionalDay = Math.ceil((normalizedDay / GAME_YEAR_DAYS) * 360);
  const year = 2024 + (gameYear - 1);
  const month = Math.floor((traditionalDay - 1) / 30) + 1;
  const day = ((traditionalDay - 1) % 30) + 1;
  
  return { year, month, day };
}

