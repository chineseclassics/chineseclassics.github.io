// 太虛幻境 - 渲染配置
// 此文件已簡化，sprite sheet 系統已廢棄
// 所有資產現在使用獨立圖片文件渲染

// ============================================================================
// 資產路徑配置
// ============================================================================

/**
 * 獲取資產圖片路徑
 * 
 * @param assetId 資產 ID
 * @param category 資產分類（可選，如果提供則使用分類目錄，否則使用默認路徑）
 */
export function getAssetImagePath(assetId: string, category?: string): string {
  if (category) {
    return `/assets/${category}/${assetId}.png`;
  }
  // 向後兼容：如果沒有提供 category，嘗試使用舊路徑
  // 但建議所有調用處都提供 category
  return `/assets/buildings/${assetId}.png`;
}

/**
 * 獲取道路貼圖路徑（使用分類目錄）
 */
export function getRoadTexturePath(roadType: string): string {
  return `/assets/road/${roadType}.png`;
}

// ============================================================================
// 向後兼容的空導出（防止其他文件引用報錯）
// ============================================================================

// 已廢棄的 SpritePack 類型（保留定義以避免類型錯誤）
export interface SpritePack {
  id: string;
  name: string;
  src: string;
  cols: number;
  rows: number;
  layout: 'row' | 'column';
  spriteOrder: readonly string[];
  verticalOffsets: Record<string, number>;
  horizontalOffsets: Record<string, number>;
  buildingToSprite: Record<string, string>;
}

// 空的默認 sprite pack（已廢棄，僅供類型兼容）
const EMPTY_SPRITE_PACK: SpritePack = {
  id: 'empty',
  name: '空白',
  src: '',
  cols: 1,
  rows: 1,
  layout: 'row',
  spriteOrder: [],
  verticalOffsets: {},
  horizontalOffsets: {},
  buildingToSprite: {},
};

// 空的 sprite pack 列表（已廢棄）
export const SPRITE_PACKS: SpritePack[] = [EMPTY_SPRITE_PACK];
export const DEFAULT_SPRITE_PACK_ID = 'empty';

// 返回空 pack 的函數（已廢棄）
export function getSpritePack(_id: string): SpritePack {
  return EMPTY_SPRITE_PACK;
}

// 空的活動 sprite pack 設置（已廢棄）
export function setActiveSpritePack(_pack: SpritePack | null) {
  // 不做任何事情，sprite sheet 系統已廢棄
}

export function getActiveSpritePack(): SpritePack {
  return EMPTY_SPRITE_PACK;
}

// 空的遺留導出（已廢棄）
export const SPRITE_SHEET = {
  src: '',
  cols: 0,
  rows: 0,
  layout: 'row' as const,
};

export const SPRITE_ORDER: readonly string[] = [];

export const SPRITE_VERTICAL_OFFSETS: Record<string, number> = {};
export const SPRITE_HORIZONTAL_OFFSETS: Record<string, number> = {};

// 返回 undefined 的映射，表示資產不在 sprite sheet 中
export const BUILDING_TO_SPRITE: Record<string, string | undefined> = new Proxy({}, {
  get() {
    return undefined;
  },
  has() {
    return false;
  },
});

// 總是返回 null，表示沒有 sprite sheet 坐標
export function getSpriteCoords(
  _buildingType: string,
  _spriteSheetWidth: number,
  _spriteSheetHeight: number,
  _pack?: SpritePack
): null {
  return null;
}

// 返回零偏移量
export function getSpriteOffsets(
  _buildingType: string,
  _pack?: SpritePack
): { vertical: number; horizontal: number } {
  return { vertical: 0, horizontal: 0 };
}
