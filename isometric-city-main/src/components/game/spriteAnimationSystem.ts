// 太虛幻境 - 精靈圖動畫系統
// Sprite Animation System for Dynamic Assets

import { AssetConfig, SpriteAnimationConfig, FrameOffset } from '@/types/assets';

// 白色背景過濾閾值（顏色距離）
const WHITE_BACKGROUND_THRESHOLD = 50;

/**
 * 動畫資產的運行時狀態
 */
interface AnimatedAssetState {
  /** 資產 ID */
  assetId: string;
  /** 當前幀索引 */
  currentFrame: number;
  /** 上次更新時間 */
  lastFrameTime: number;
  /** 幀間隔（毫秒） */
  frameInterval: number;
  /** 總幀數 */
  totalFrames: number;
  /** 是否循環 */
  loop: boolean;
}

/**
 * 精靈圖動畫管理器
 * 管理所有動態資產的動畫狀態
 */
class SpriteAnimationManager {
  /** 動態資產配置緩存（用於動畫） */
  private assetConfigs: Map<string, AssetConfig> = new Map();
  
  /** 所有資產配置緩存（用於渲染偏移等） */
  private allAssetConfigs: Map<string, AssetConfig> = new Map();
  
  /** 每個放置實例的動畫狀態（key: `${gridX}_${gridY}`） */
  private instanceStates: Map<string, AnimatedAssetState> = new Map();
  
  /** 預渲染的幀緩存（每幀一個處理過的 ImageBitmap） */
  private frameCache: Map<string, HTMLCanvasElement[]> = new Map();
  
  /** 幀尺寸緩存 */
  private frameSizeCache: Map<string, { width: number; height: number }> = new Map();
  
  /** 幀偏移緩存 */
  private frameOffsetsCache: Map<string, FrameOffset[]> = new Map();
  
  /** 全局動畫時間 */
  private globalTime: number = 0;
  
  /** 是否需要重繪的標記 */
  private _needsRedraw: boolean = false;

  /**
   * 註冊資產配置
   */
  registerAssetConfig(config: AssetConfig) {
    // 存儲所有資產配置（用於 renderOffset 等）
    this.allAssetConfigs.set(config.id, config);
    
    // 動態資產額外存儲到動畫配置緩存
    if (config.animation?.animated) {
      this.assetConfigs.set(config.id, config);
    }
  }

  /**
   * 批量註冊資產配置
   */
  registerAssetConfigs(configs: AssetConfig[]) {
    configs.forEach(config => this.registerAssetConfig(config));
  }

  /**
   * 更新或添加單個資產配置（供資產編輯器保存後調用）
   * 這樣新保存的資產可以立即在遊戲中正確渲染，無需刷新頁面
   */
  updateAssetConfig(config: AssetConfig) {
    this.registerAssetConfig(config);
    console.log(`[動畫系統] 已更新資產配置: ${config.id}`);
  }

  /**
   * 檢查資產是否為動態資產
   */
  isAnimatedAsset(assetId: string): boolean {
    return this.assetConfigs.has(assetId);
  }

  /**
   * 獲取資產的動畫配置
   */
  getAnimationConfig(assetId: string): SpriteAnimationConfig | undefined {
    return this.assetConfigs.get(assetId)?.animation;
  }

  /**
   * 獲取資產的渲染偏移
   */
  getRenderOffset(assetId: string): { x: number; y: number } {
    const config = this.allAssetConfigs.get(assetId);
    return config?.renderOffset || { x: 0, y: 0 };
  }

  /**
   * 獲取資產的渲染縮放
   */
  getRenderScale(assetId: string): number {
    const config = this.allAssetConfigs.get(assetId);
    return config?.renderScale ?? 1.0;
  }

  /**
   * 去除白色背景
   */
  private removeWhiteBackground(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 計算與白色(255,255,255)的距離
      const distance = Math.sqrt(
        Math.pow(r - 255, 2) +
        Math.pow(g - 255, 2) +
        Math.pow(b - 255, 2)
      );
      
      // 如果接近白色，設為透明
      if (distance <= WHITE_BACKGROUND_THRESHOLD) {
        data[i + 3] = 0;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 加載並處理精靈圖
   */
  async loadSpriteSheet(assetId: string): Promise<boolean> {
    // 檢查緩存
    if (this.frameCache.has(assetId)) {
      return true;
    }

    const config = this.assetConfigs.get(assetId);
    if (!config?.animation) return false;

    const spritePath = `/assets/${config.animation.spriteSheet}`;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // 預渲染所有幀並去除白色背景
        this.prerenderFrames(assetId, img, config.animation!);
        console.log(`[動畫系統] 已處理精靈圖: ${assetId}`);
        resolve(true);
      };
      img.onerror = () => {
        console.warn(`[動畫系統] 無法加載精靈圖: ${spritePath}`);
        resolve(false);
      };
      img.src = spritePath;
    });
  }

  /**
   * 預渲染幀並去除白色背景
   */
  private prerenderFrames(
    assetId: string, 
    spriteSheet: HTMLImageElement, 
    config: SpriteAnimationConfig
  ) {
    const { columns, rows } = config.layout;
    const totalFrames = config.frameCount || (columns * rows);
    const frameWidth = Math.floor(spriteSheet.width / columns);
    const frameHeight = Math.floor(spriteSheet.height / rows);

    // 緩存幀尺寸
    this.frameSizeCache.set(assetId, { width: frameWidth, height: frameHeight });

    const frames: HTMLCanvasElement[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const srcX = col * frameWidth;
      const srcY = row * frameHeight;

      // 創建 Canvas 來處理這一幀
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 繪製這一幀
        ctx.drawImage(
          spriteSheet,
          srcX, srcY, frameWidth, frameHeight,
          0, 0, frameWidth, frameHeight
        );
        
        // 去除白色背景
        this.removeWhiteBackground(ctx, frameWidth, frameHeight);
      }
      
      frames.push(canvas);
    }

    this.frameCache.set(assetId, frames);
    
    // 緩存幀偏移
    if (config.frameOffsets) {
      this.frameOffsetsCache.set(assetId, config.frameOffsets);
    }
    
    console.log(`[動畫系統] ${assetId}: 預渲染 ${frames.length} 幀, 尺寸 ${frameWidth}x${frameHeight}`);
  }

  /**
   * 獲取當前幀的偏移
   */
  getCurrentFrameOffset(
    assetId: string,
    gridX: number,
    gridY: number
  ): FrameOffset {
    const state = this.getOrCreateInstanceState(assetId, gridX, gridY);
    if (!state) return { x: 0, y: 0 };
    
    const offsets = this.frameOffsetsCache.get(assetId);
    if (!offsets || offsets.length === 0) return { x: 0, y: 0 };
    
    return offsets[state.currentFrame] || { x: 0, y: 0 };
  }

  /**
   * 創建或獲取實例的動畫狀態
   */
  getOrCreateInstanceState(
    assetId: string, 
    gridX: number, 
    gridY: number
  ): AnimatedAssetState | null {
    const key = `${gridX}_${gridY}`;
    
    if (this.instanceStates.has(key)) {
      return this.instanceStates.get(key)!;
    }

    const config = this.assetConfigs.get(assetId);
    if (!config?.animation) return null;

    const anim = config.animation;
    const totalFrames = anim.frameCount || (anim.layout.columns * anim.layout.rows);
    
    // 隨機起始幀（避免同步動畫）
    const startFrame = anim.randomStartFrame !== false 
      ? Math.floor(Math.random() * totalFrames)
      : 0;

    const state: AnimatedAssetState = {
      assetId,
      currentFrame: startFrame,
      lastFrameTime: this.globalTime,
      frameInterval: anim.frameInterval || 100,
      totalFrames,
      loop: anim.loop !== false,
    };

    this.instanceStates.set(key, state);
    return state;
  }

  /**
   * 移除實例的動畫狀態（當建築被拆除時）
   */
  removeInstanceState(gridX: number, gridY: number) {
    const key = `${gridX}_${gridY}`;
    this.instanceStates.delete(key);
  }

  /**
   * 更新全局動畫時間
   * @returns 是否有任何動畫需要重繪
   */
  update(deltaTime: number): boolean {
    this.globalTime += deltaTime;
    
    let needsRedraw = false;
    
    this.instanceStates.forEach((state) => {
      const elapsed = this.globalTime - state.lastFrameTime;
      
      if (elapsed >= state.frameInterval) {
        // 計算經過了多少幀
        const framesPassed = Math.floor(elapsed / state.frameInterval);
        
        if (state.loop) {
          state.currentFrame = (state.currentFrame + framesPassed) % state.totalFrames;
        } else {
          state.currentFrame = Math.min(
            state.currentFrame + framesPassed, 
            state.totalFrames - 1
          );
        }
        
        state.lastFrameTime = this.globalTime;
        needsRedraw = true;
      }
    });
    
    this._needsRedraw = needsRedraw;
    return needsRedraw;
  }

  /**
   * 獲取當前是否需要重繪
   */
  get needsRedraw(): boolean {
    return this._needsRedraw;
  }

  /**
   * 重置重繪標記
   */
  resetRedrawFlag() {
    this._needsRedraw = false;
  }

  /**
   * 獲取當前幀的 Canvas（用於繪製）
   */
  getCurrentFrameCanvas(
    assetId: string, 
    gridX: number, 
    gridY: number
  ): HTMLCanvasElement | null {
    const state = this.getOrCreateInstanceState(assetId, gridX, gridY);
    if (!state) return null;

    const frames = this.frameCache.get(assetId);
    if (!frames || frames.length === 0) return null;

    return frames[state.currentFrame];
  }

  /**
   * 獲取幀尺寸
   */
  getFrameSize(assetId: string): { width: number; height: number } | null {
    return this.frameSizeCache.get(assetId) || null;
  }

  /**
   * 獲取所有活動的動態資產實例
   */
  getActiveInstances(): Map<string, AnimatedAssetState> {
    return this.instanceStates;
  }

  /**
   * 清理所有狀態
   */
  clear() {
    this.instanceStates.clear();
  }

  /**
   * 獲取統計信息（調試用）
   */
  getStats() {
    return {
      registeredAssets: this.assetConfigs.size,
      cachedFrames: this.frameCache.size,
      activeInstances: this.instanceStates.size,
      frameSizes: Array.from(this.frameSizeCache.entries()),
    };
  }
}

// 導出單例
export const spriteAnimationManager = new SpriteAnimationManager();

/**
 * 繪製動態資產到 Canvas
 * @returns 是否成功繪製
 */
export function drawAnimatedAsset(
  ctx: CanvasRenderingContext2D,
  assetId: string,
  gridX: number,
  gridY: number,
  drawX: number,
  drawY: number,
  destWidth: number,
  flipped: boolean = false
): boolean {
  const frameCanvas = spriteAnimationManager.getCurrentFrameCanvas(assetId, gridX, gridY);
  
  if (!frameCanvas) {
    return false; // 返回 false 表示動畫未就緒
  }

  // 使用幀的原始比例計算高度
  const aspectRatio = frameCanvas.height / frameCanvas.width;
  const destHeight = destWidth * aspectRatio;

  ctx.save();
  
  if (flipped) {
    const centerX = Math.round(drawX + destWidth / 2);
    ctx.translate(centerX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-centerX, 0);
  }

  ctx.drawImage(
    frameCanvas,
    0, 0, frameCanvas.width, frameCanvas.height,
    Math.round(drawX), Math.round(drawY),
    Math.round(destWidth), Math.round(destHeight)
  );

  ctx.restore();
  
  return true;
}

/**
 * 初始化動畫系統
 * 從 assets.json 加載配置並預加載精靈圖
 */
export async function initAnimationSystem(): Promise<void> {
  try {
    const response = await fetch('/assets/assets.json');
    if (!response.ok) {
      throw new Error(`Failed to load assets.json: ${response.statusText}`);
    }
    
    const data = await response.json();
    const assets: AssetConfig[] = data.assets || [];
    
    // 註冊所有資產配置
    spriteAnimationManager.registerAssetConfigs(assets);
    
    // 預加載所有動態資產的精靈圖
    const animatedAssets = assets.filter(a => a.animation?.animated);
    await Promise.all(
      animatedAssets.map(asset => spriteAnimationManager.loadSpriteSheet(asset.id))
    );
    
    console.log(`[動畫系統] 已加載 ${animatedAssets.length} 個動態資產`);
  } catch (error) {
    console.error('[動畫系統] 初始化失敗:', error);
  }
}
