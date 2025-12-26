// 太虛幻境 - 資產管理系統類型定義
// Taixu Huanjing - Asset Management System Type Definitions

/**
 * 資產分類（與遊戲工具欄一致）
 */
export type AssetCategory = 
  | 'nature'    // 自然
  | 'road'      // 道路
  | 'garden'    // 園林（民居、亭臺樓閣）
  | 'fangshi'   // 坊市（市肆、公共設施）
  | 'farming'   // 農事
  | 'props';    // 點綴

/**
 * 風格標籤
 */
export type AssetStyle = 
  | 'hand_drawn'  // 手繪風
  | 'ink_wash'    // 水墨風
  | 'pixel'       // 像素風
  | 'realistic'   // 寫實風
  | 'minimalist'; // 簡約風

/**
 * 每幀的偏移配置
 */
export interface FrameOffset {
  x: number;
  y: number;
}

/**
 * 精靈圖動畫配置
 */
export interface SpriteAnimationConfig {
  /** 是否為動態資產 */
  animated: true;
  /** 精靈圖文件路徑（相對於 /assets/） */
  spriteSheet: string;
  /** 精靈圖佈局 */
  layout: {
    /** 列數 */
    columns: number;
    /** 行數 */
    rows: number;
  };
  /** 總幀數（如果不等於 columns × rows，可指定實際幀數） */
  frameCount?: number;
  /** 幀間隔（毫秒），默認 100ms */
  frameInterval?: number;
  /** 是否循環播放，默認 true */
  loop?: boolean;
  /** 是否隨機起始幀（避免同步動畫），默認 true */
  randomStartFrame?: boolean;
  /** 每幀的偏移調整（用於對齊動畫） */
  frameOffsets?: FrameOffset[];
}

/**
 * 資產配置
 */
export interface AssetConfig {
  /** 資產 ID（英文，唯一標識符） */
  id: string;
  /** 中文名稱 */
  name: string;
  /** 功能分類 */
  category: AssetCategory;
  /** 風格標籤 */
  style: AssetStyle;
  /** 格數（寬 × 高） */
  gridSize: {
    width: number;
    height: number;
  };
  /** 成本 */
  cost: number;
  /** 描述 */
  description?: string;
  /** 渲染偏移量（舊版，保留兼容） */
  offsets?: {
    vertical: number;
    horizontal: number;
  };
  /** 渲染縮放（舊版，保留兼容） */
  scale?: number;
  /** 渲染位移（編輯器調整後保存，遊戲渲染時應用） */
  renderOffset?: {
    x: number;
    y: number;
  };
  /** 渲染縮放（編輯器調整後保存，遊戲渲染時應用） */
  renderScale?: number;
  /** 應用跳轉路徑 */
  appUrl?: string;
  /** AI 生成提示詞（舊版，保留兼容） */
  vibePrompt?: string;
  /** 生成此資產時使用的完整 Prompt */
  generationPrompt?: string;
  /** 動畫配置（如果是動態資產） */
  animation?: SpriteAnimationConfig;
}

/**
 * Prompt 模板配置
 */
export interface PromptTemplates {
  /** 基礎模板（靜態資產：遊戲級通用要求） */
  base: string;
  /** 基礎模板（動態資產：精靈圖動畫專用） */
  baseAnimated: string;
  /** 各風格的模板 */
  styles: Record<AssetStyle, string>;
}

/**
 * 資產配置文件結構
 */
export interface AssetsFile {
  /** 版本號 */
  version: number;
  /** 分類定義 */
  categories: Record<AssetCategory, string>;
  /** 風格定義 */
  styles: Record<AssetStyle, string>;
  /** Prompt 模板 */
  promptTemplates?: PromptTemplates;
  /** 資產列表 */
  assets: AssetConfig[];
}

// 向後兼容別名
export type BuiltinAssetsFile = AssetsFile;

/**
 * 分類信息（帶中文名稱，與遊戲工具欄一致）
 */
export const ASSET_CATEGORIES: Record<AssetCategory, string> = {
  nature: '自然',
  road: '道路',
  garden: '園林',
  fangshi: '坊市',
  farming: '農事',
  props: '點綴',
};

/**
 * 風格信息（帶中文名稱）
 */
export const ASSET_STYLES: Record<AssetStyle, string> = {
  hand_drawn: '手繪風',
  ink_wash: '水墨風',
  pixel: '像素風',
  realistic: '寫實風',
  minimalist: '簡約風',
};

/**
 * 默認資產配置
 */
export const DEFAULT_ASSET_CONFIG: Partial<AssetConfig> = {
  category: 'garden',
  style: 'hand_drawn',
  gridSize: { width: 1, height: 1 },
  cost: 100,
  scale: 1.0,
  offsets: { vertical: 0, horizontal: 0 },
};

