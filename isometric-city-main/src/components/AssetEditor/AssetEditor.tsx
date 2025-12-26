'use client';

// 太虛資產管理中心 - React 組件
// 開發者工具：管理遊戲內建資產
// 包含：瀏覽、篩選、編輯、創建、刪除功能
// 支持靜態資產和動態資產（精靈圖動畫）

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  AssetConfig, 
  AssetCategory, 
  AssetStyle,
  PromptTemplates,
  ASSET_CATEGORIES, 
  ASSET_STYLES,
  DEFAULT_ASSET_CONFIG 
} from '@/types/assets';
import { spriteAnimationManager } from '@/components/game/spriteAnimationSystem';

// 格數選項
const GRID_SIZES = [1, 2, 3, 4, 5, 6] as const;

// 畫布尺寸（與遊戲保持一致的邏輯尺寸）
const CANVAS_SIZE = 512;
// 高分辨率渲染倍數（提高畫布實際像素，保持清晰度）
const CANVAS_DPR = 4;

// 格子尺寸（與遊戲完全一致）
const TILE_WIDTH = 64;
const TILE_HEIGHT = 38.4;

// 遊戲中的渲染參數
const SPRITE_SCALE = 1.3;      // 建築基礎縮放比例
const BASE_OFFSET_FACTOR = 0.90; // 底部偏移係數（留 10% 空間）

// 動態資產默認值
const DEFAULT_FRAME_INTERVAL = 150; // 毫秒
const DEFAULT_COLUMNS = 4;
const DEFAULT_ROWS = 3;

interface AssetEditorProps {
  onClose: () => void;
}

// 視圖模式
type ViewMode = 'list' | 'create' | 'edit';

// 資產類型
type AssetType = 'static' | 'animated';

// 每幀的偏移配置
interface FrameOffset {
  x: number;
  y: number;
}

export function AssetEditor({ onClose }: AssetEditorProps) {
  // ============================================================================
  // 狀態：資產列表
  // ============================================================================
  const [assets, setAssets] = useState<AssetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<AssetConfig | null>(null);
  
  // 篩選狀態
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'all'>('all');
  const [filterStyle, setFilterStyle] = useState<AssetStyle | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 視圖模式
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // ============================================================================
  // 狀態：圖片編輯
  // ============================================================================
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 調整參數
  const [scale, setScale] = useState(0.8);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [tolerance, setTolerance] = useState(30);

  // ============================================================================
  // 狀態：動態資產（精靈圖動畫）
  // ============================================================================
  const [assetType, setAssetType] = useState<AssetType>('static');
  const [spriteColumns, setSpriteColumns] = useState(DEFAULT_COLUMNS);
  const [spriteRows, setSpriteRows] = useState(DEFAULT_ROWS);
  const [frameInterval, setFrameInterval] = useState(DEFAULT_FRAME_INTERVAL);
  const [frameOffsets, setFrameOffsets] = useState<FrameOffset[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimFrame, setCurrentAnimFrame] = useState(0);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 預渲染的幀 Canvas（去除白色背景後）
  const [processedFrames, setProcessedFrames] = useState<HTMLCanvasElement[]>([]);
  
  // 疊加預覽模式
  const [showOverlay, setShowOverlay] = useState(false);
  
  // 動畫預覽 Canvas
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  // ============================================================================
  // 狀態：資產屬性
  // ============================================================================
  const [assetId, setAssetId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('garden');
  const [style, setStyle] = useState<AssetStyle>('hand_drawn');
  const [gridSize, setGridSize] = useState<number>(1);
  const [cost, setCost] = useState(100);
  const [description, setDescription] = useState('');
  
  // ============================================================================
  // 狀態：Prompt 模板系統
  // ============================================================================
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplates | null>(null);
  const [assetDescription, setAssetDescription] = useState(''); // 資產具體描述
  const [generationPrompt, setGenerationPrompt] = useState(''); // 完整的生成 Prompt
  const [showPromptBuilder, setShowPromptBuilder] = useState(true); // 是否顯示 Prompt 構建器

  // UI 狀態
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 預覽縮放（僅用於 CSS 顯示，不影響內部像素計算）
  // 畫布邏輯尺寸 512px，通過 CSS 放大以便觀看
  const [previewZoom, setPreviewZoom] = useState(1.5);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ============================================================================
  // 數據加載
  // ============================================================================
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        // 同時加載 Prompt 模板
        if (data.promptTemplates) {
          setPromptTemplates(data.promptTemplates);
        }
      }
    } catch (error) {
      console.error('加載資產失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // ============================================================================
  // Prompt 構建
  // ============================================================================
  
  // 構建完整的 Prompt
  const buildFullPrompt = useCallback(() => {
    if (!promptTemplates) return '';
    
    const displayName = assetName || '{資產名稱}';
    
    let basePrompt: string;
    
    if (assetType === 'animated') {
      // 動態資產：使用精靈圖模板
      const totalFrames = spriteColumns * spriteRows;
      basePrompt = (promptTemplates.baseAnimated || promptTemplates.base)
        .replace('{ASSET_NAME}', displayName)
        .replace('{COLUMNS}', String(spriteColumns))
        .replace('{ROWS}', String(spriteRows))
        .replace('{TOTAL_FRAMES}', String(totalFrames));
    } else {
      // 靜態資產：使用普通模板
      basePrompt = promptTemplates.base.replace('{ASSET_NAME}', displayName);
    }
    
    // 風格模板
    const stylePrompt = promptTemplates.styles[style] || '';
    
    // 資產描述
    const descPrompt = assetDescription.trim();
    
    // 組合完整 Prompt
    const parts = [basePrompt];
    if (stylePrompt) parts.push(stylePrompt);
    if (descPrompt) {
      if (assetType === 'animated') {
        parts.push(`\n## SUBJECT DESCRIPTION:\n${descPrompt}`);
      } else {
        parts.push(`\nAppearance: ${descPrompt}`);
      }
    }
    
    return parts.join('\n\n');
  }, [promptTemplates, assetName, style, assetDescription, assetType, spriteColumns, spriteRows]);
  
  // 當相關狀態改變時，更新完整 Prompt
  useEffect(() => {
    const fullPrompt = buildFullPrompt();
    setGenerationPrompt(fullPrompt);
  }, [buildFullPrompt]);
  
  // 複製 Prompt 到剪貼板
  const copyPromptToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generationPrompt);
      setMessage({ type: 'success', text: 'Prompt 已複製到剪貼板！' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: '複製失敗，請手動複製' });
    }
  }, [generationPrompt]);

  // ============================================================================
  // 篩選邏輯
  // ============================================================================
  const filteredAssets = assets.filter(asset => {
    if (filterCategory !== 'all' && asset.category !== filterCategory) return false;
    if (filterStyle !== 'all' && asset.style !== filterStyle) return false;
    if (searchTerm && !asset.name.includes(searchTerm) && !asset.id.includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // ============================================================================
  // 圖片處理
  // ============================================================================
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 先標記圖片未加載，防止 draw 使用舊圖片
    setImageLoaded(false);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        // 圖片加載完成後，更新引用和狀態
        imageRef.current = img;
        setImageSrc(src);  // 先更新 src
        setImageLoaded(true);  // 最後設置為已加載，觸發 draw
      };
      img.onerror = () => {
        console.error('[AssetEditor] 圖片加載失敗');
        setImageLoaded(false);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    
    // 重置文件輸入，允許選擇相同文件
    e.target.value = '';
  }, []);

  // 加載現有資產圖片
  // savedConfig: 如果提供，圖片加載後設置為這些值（用於編輯現有資產）
  const loadAssetImage = useCallback(async (
    assetId: string, 
    savedConfig?: { offset: { x: number; y: number }; scale: number },
    category?: string
  ) => {
    // 使用分類目錄，如果沒有提供則嘗試從 selectedAsset 獲取
    const assetCategory = category || selectedAsset?.category || 'props';
    const imagePath = `/assets/${assetCategory}/${assetId}.png`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSrc(imagePath);
      setImageLoaded(true);
      // 設置調整參數
      setScale(savedConfig?.scale ?? 1.0);
      setOffsetX(savedConfig?.offset.x ?? 0);
      setOffsetY(savedConfig?.offset.y ?? 0);
      setTolerance(0);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageSrc(null);
    };
    img.src = imagePath;
  }, []);

  // ============================================================================
  // 精靈圖處理：分割並去除白色背景
  // ============================================================================
  const processSpriteSheet = useCallback(() => {
    const img = imageRef.current;
    if (!img || !imageLoaded || assetType !== 'animated') return;
    
    const frameWidth = Math.floor(img.width / spriteColumns);
    const frameHeight = Math.floor(img.height / spriteRows);
    const totalFrames = spriteColumns * spriteRows;
    
    const frames: HTMLCanvasElement[] = [];
    const newOffsets: FrameOffset[] = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const col = i % spriteColumns;
      const row = Math.floor(i / spriteColumns);
      const srcX = col * frameWidth;
      const srcY = row * frameHeight;
      
      // 創建 Canvas 處理這一幀
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, srcX, srcY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        
        // 去除白色背景
        if (tolerance > 0) {
          const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
          const data = imageData.data;
          
          for (let j = 0; j < data.length; j += 4) {
            if (
              data[j] > 255 - tolerance &&
              data[j + 1] > 255 - tolerance &&
              data[j + 2] > 255 - tolerance
            ) {
              data[j + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }
      }
      
      frames.push(canvas);
      
      // 初始化偏移（保留現有偏移或使用默認值）
      newOffsets.push(frameOffsets[i] || { x: 0, y: 0 });
    }
    
    setProcessedFrames(frames);
    setFrameOffsets(newOffsets);
    
    // 重置選中幀
    if (selectedFrame >= totalFrames) {
      setSelectedFrame(0);
    }
  }, [imageLoaded, assetType, spriteColumns, spriteRows, tolerance, frameOffsets, selectedFrame]);
  
  // 當精靈圖參數變化時重新處理
  useEffect(() => {
    if (assetType === 'animated' && imageLoaded) {
      processSpriteSheet();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, spriteColumns, spriteRows, tolerance, imageLoaded]);

  // ============================================================================
  // 動畫播放控制
  // ============================================================================
  useEffect(() => {
    if (isPlaying && processedFrames.length > 0) {
      animationTimerRef.current = setInterval(() => {
        setCurrentAnimFrame(prev => (prev + 1) % processedFrames.length);
      }, frameInterval);
    } else {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    }
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }
    };
  }, [isPlaying, frameInterval, processedFrames.length]);

  // ============================================================================
  // 繪製動畫預覽 - 使用與遊戲完全相同的渲染邏輯
  // ============================================================================
  const drawAnimationPreview = useCallback(() => {
    const canvas = animCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || processedFrames.length === 0) return;
    
    // 高 DPI 渲染：清除整個畫布並設置縮放
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE * CANVAS_DPR, CANVAS_SIZE * CANVAS_DPR);
    ctx.scale(CANVAS_DPR, CANVAS_DPR);
    
    const frame0 = processedFrames[0];
    if (!frame0) return;
    
    // ========================================
    // 使用與遊戲完全相同的座標計算邏輯
    // 遊戲中 gridToScreen: screenX = (gx - gy) * (TILE_WIDTH / 2)
    //                      screenY = (gx + gy) * (TILE_HEIGHT / 2)
    // ========================================
    
    const tileW = TILE_WIDTH;   // 64
    const tileH = TILE_HEIGHT;  // 38.4
    
    // 計算主格子 (0, 0) 的遊戲座標（遊戲中的 gridToScreen）
    const mainGridScreenX = 0;  // (0 - 0) * 32 = 0
    const mainGridScreenY = 0;  // (0 + 0) * 19.2 = 0
    
    // 計算整個網格區域的範圍（用於居中顯示）
    // 在 gridSize x gridSize 的等軸測網格中：
    // - 最左邊的格子是 (0, gridSize-1)：screenX = -(gridSize-1) * 32
    // - 最右邊的格子是 (gridSize-1, 0)：screenX = (gridSize-1) * 32
    // - 最上邊的格子是 (0, 0)：screenY = 0
    // - 最下邊的格子是 (gridSize-1, gridSize-1)：screenY = (gridSize-1) * 2 * 19.2
    const gridMinX = -(gridSize - 1) * (tileW / 2);
    const gridMaxX = (gridSize - 1) * (tileW / 2) + tileW;
    const gridMinY = 0;
    const gridMaxY = (gridSize - 1) * 2 * (tileH / 2) + tileH;
    
    // 計算網格中心
    const gridCenterX = (gridMinX + gridMaxX) / 2;
    const gridCenterY = (gridMinY + gridMaxY) / 2;
    
    // 計算偏移量，使網格居中顯示在畫布中央
    const offsetToCenter_X = CANVAS_SIZE / 2 - gridCenterX;
    const offsetToCenter_Y = CANVAS_SIZE / 2 - gridCenterY;
    
    // 主格子 (0, 0) 在畫布上的實際座標
    const x = mainGridScreenX + offsetToCenter_X;
    const y = mainGridScreenY + offsetToCenter_Y;
    const w = tileW;
    const h = tileH;
    
    // ========================================
    // 使用與遊戲完全相同的渲染公式
    // destWidth = TILE_WIDTH * spriteScale
    // drawX = x + (w - destWidth) / 2
    // drawY = y + h - (destHeight * baseOffsetFactor)
    // ========================================
    
    const aspectRatio = frame0.height / frame0.width;
    const destWidth = tileW * SPRITE_SCALE * scale;
    const destHeight = destWidth * aspectRatio;
    
    // 與遊戲完全一致的定位公式
    const baseX = x + (w - destWidth) / 2 + offsetX;
    const baseY = y + h - (destHeight * BASE_OFFSET_FACTOR) + offsetY;
    
    if (showOverlay && !isPlaying) {
      // 疊加預覽模式：繪製所有幀（半透明）
      processedFrames.forEach((frame, index) => {
        const offset = frameOffsets[index] || { x: 0, y: 0 };
        const x = baseX + offset.x;
        const y = baseY + offset.y;
        
        ctx.globalAlpha = index === selectedFrame ? 1.0 : 0.2;
        ctx.drawImage(frame, 0, 0, frame.width, frame.height, x, y, destWidth, destHeight);
      });
      ctx.globalAlpha = 1.0;
      
      // 在疊加模式下，高亮顯示當前選中幀的輪廓
      const selectedOffset = frameOffsets[selectedFrame] || { x: 0, y: 0 };
      ctx.strokeStyle = 'rgba(0, 128, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(baseX + selectedOffset.x, baseY + selectedOffset.y, destWidth, destHeight);
    } else {
      // 單幀預覽模式
      const frameIndex = isPlaying ? currentAnimFrame : selectedFrame;
      const frame = processedFrames[frameIndex];
      if (!frame) return;
      
      const offset = frameOffsets[frameIndex] || { x: 0, y: 0 };
      const x = baseX + offset.x;
      const y = baseY + offset.y;
      
      ctx.drawImage(frame, 0, 0, frame.width, frame.height, x, y, destWidth, destHeight);
    }
  }, [processedFrames, currentAnimFrame, selectedFrame, isPlaying, frameOffsets, scale, offsetX, offsetY, showOverlay, gridSize]);
  
  useEffect(() => {
    if (assetType === 'animated') {
      drawAnimationPreview();
    }
  }, [assetType, drawAnimationPreview, currentAnimFrame, showOverlay, selectedFrame]);

  // ============================================================================
  // 更新單幀偏移
  // ============================================================================
  const updateFrameOffset = useCallback((frameIndex: number, axis: 'x' | 'y', value: number) => {
    setFrameOffsets(prev => {
      const newOffsets = [...prev];
      if (!newOffsets[frameIndex]) {
        newOffsets[frameIndex] = { x: 0, y: 0 };
      }
      newOffsets[frameIndex] = { ...newOffsets[frameIndex], [axis]: value };
      return newOffsets;
    });
  }, []);
  
  // 批量應用偏移到所有幀
  const applyOffsetToAllFrames = useCallback((axis: 'x' | 'y', value: number) => {
    setFrameOffsets(prev => prev.map(offset => ({
      ...offset,
      [axis]: value
    })));
  }, []);
  
  // 按行調整偏移（增量）
  const adjustRowOffset = useCallback((rowIndex: number, axis: 'x' | 'y', delta: number) => {
    setFrameOffsets(prev => {
      const newOffsets = [...prev];
      const startIndex = rowIndex * spriteColumns;
      const endIndex = Math.min(startIndex + spriteColumns, prev.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        if (!newOffsets[i]) {
          newOffsets[i] = { x: 0, y: 0 };
        }
        newOffsets[i] = {
          ...newOffsets[i],
          [axis]: (newOffsets[i][axis] || 0) + delta
        };
      }
      return newOffsets;
    });
  }, [spriteColumns]);
  
  // 將當前幀的偏移應用到同一行
  const applyCurrentToRow = useCallback(() => {
    const rowIndex = Math.floor(selectedFrame / spriteColumns);
    const current = frameOffsets[selectedFrame] || { x: 0, y: 0 };
    
    setFrameOffsets(prev => {
      const newOffsets = [...prev];
      const startIndex = rowIndex * spriteColumns;
      const endIndex = Math.min(startIndex + spriteColumns, prev.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        newOffsets[i] = { ...current };
      }
      return newOffsets;
    });
  }, [selectedFrame, spriteColumns, frameOffsets]);

  // 繪製畫布（靜態資產）- 模擬遊戲中的實際渲染邏輯
  const draw = useCallback(() => {
    if (assetType === 'animated') return; // 動態資產使用單獨的繪製邏輯
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageLoaded) return;

    // 高 DPI 渲染：清除整個畫布並設置縮放
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE * CANVAS_DPR, CANVAS_SIZE * CANVAS_DPR);
    ctx.scale(CANVAS_DPR, CANVAS_DPR);

    // ========================================
    // 使用與遊戲完全相同的座標計算邏輯
    // 遊戲中 gridToScreen: screenX = (gx - gy) * (TILE_WIDTH / 2)
    //                      screenY = (gx + gy) * (TILE_HEIGHT / 2)
    // ========================================
    
    const tileW = TILE_WIDTH;   // 64
    const tileH = TILE_HEIGHT;  // 38.4
    
    // 計算主格子 (0, 0) 的遊戲座標（遊戲中的 gridToScreen）
    const mainGridScreenX = 0;  // (0 - 0) * 32 = 0
    const mainGridScreenY = 0;  // (0 + 0) * 19.2 = 0
    
    // 計算整個網格區域的範圍（用於居中顯示）
    const gridMinX = -(gridSize - 1) * (tileW / 2);
    const gridMaxX = (gridSize - 1) * (tileW / 2) + tileW;
    const gridMinY = 0;
    const gridMaxY = (gridSize - 1) * 2 * (tileH / 2) + tileH;
    
    // 計算網格中心
    const gridCenterX = (gridMinX + gridMaxX) / 2;
    const gridCenterY = (gridMinY + gridMaxY) / 2;
    
    // 計算偏移量，使網格居中顯示在畫布中央
    const offsetToCenter_X = CANVAS_SIZE / 2 - gridCenterX;
    const offsetToCenter_Y = CANVAS_SIZE / 2 - gridCenterY;
    
    // 主格子 (0, 0) 在畫布上的實際座標（等同於遊戲中的 screenX, screenY）
    const x = mainGridScreenX + offsetToCenter_X;
    const y = mainGridScreenY + offsetToCenter_Y;
    const w = tileW;
    const h = tileH;
    
    // ========================================
    // 使用與遊戲完全相同的渲染公式
    // ========================================
    
    const imgW = img.width;
    const imgH = img.height;
    const aspectRatio = imgH / imgW;
    
    const destWidth = tileW * SPRITE_SCALE * scale;
    const destHeight = destWidth * aspectRatio;
    
    // 與遊戲完全一致的定位公式
    const drawX = x + (w - destWidth) / 2 + offsetX;
    const drawY = y + h - (destHeight * BASE_OFFSET_FACTOR) + offsetY;

    // 去除白色背景處理
    if (tolerance > 0) {
      // 創建臨時畫布處理去背景
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      tCtx.drawImage(img, 0, 0);
      const imageData = tCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] > 255 - tolerance &&
          data[i + 1] > 255 - tolerance &&
          data[i + 2] > 255 - tolerance
        ) {
          data[i + 3] = 0;
        }
      }

      tCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, drawX, drawY, destWidth, destHeight);
    } else {
      ctx.drawImage(img, drawX, drawY, destWidth, destHeight);
    }
  }, [assetType, scale, offsetX, offsetY, tolerance, imageLoaded, gridSize, imageSrc]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ============================================================================
  // 操作：創建新資產
  // ============================================================================
  const handleStartCreate = useCallback(() => {
    setSelectedAsset(null);
    setViewMode('create');
    // 重置表單
    setAssetId('');
    setAssetName('');
    setCategory('garden');
    setStyle('hand_drawn');
    setGridSize(1);
    setCost(100);
    setDescription('');
    setImageLoaded(false);
    setImageSrc(null);
    imageRef.current = null;
    setScale(0.8);
    setOffsetX(0);
    setOffsetY(0);
    setTolerance(30);
    setMessage(null);
    // 重置動態資產狀態
    setAssetType('static');
    setSpriteColumns(DEFAULT_COLUMNS);
    setSpriteRows(DEFAULT_ROWS);
    setFrameInterval(DEFAULT_FRAME_INTERVAL);
    setFrameOffsets([]);
    setProcessedFrames([]);
    setSelectedFrame(0);
    setIsPlaying(false);
    // 重置 Prompt 狀態
    setAssetDescription('');
    setGenerationPrompt('');
    setShowPromptBuilder(true);
  }, []);

  // ============================================================================
  // 操作：編輯現有資產
  // ============================================================================
  const handleEditAsset = useCallback((asset: AssetConfig) => {
    setSelectedAsset(asset);
    setViewMode('edit');
    // 填充表單
    setAssetId(asset.id);
    setAssetName(asset.name);
    setCategory(asset.category);
    setStyle(asset.style || 'hand_drawn');
    setGridSize(asset.gridSize.width);
    setCost(asset.cost);
    setDescription(asset.description || '');
    setMessage(null);
    // 加載 Prompt
    setGenerationPrompt(asset.generationPrompt || '');
    setAssetDescription(''); // 編輯模式下不分離描述
    setShowPromptBuilder(false); // 編輯模式下默認顯示完整 Prompt
    
    // 獲取保存的渲染配置（如果有）
    const savedOffset = asset.renderOffset || { x: 0, y: 0 };
    const savedScale = asset.renderScale ?? 1.0;
    
    // 檢查是否為動態資產
    if (asset.animation?.animated) {
      setAssetType('animated');
      setSpriteColumns(asset.animation.layout.columns);
      setSpriteRows(asset.animation.layout.rows);
      setFrameInterval(asset.animation.frameInterval || DEFAULT_FRAME_INTERVAL);
      setFrameOffsets(asset.animation.frameOffsets || []);
      // 加載精靈圖
      const spritePath = `/assets/${asset.animation.spriteSheet}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageSrc(spritePath);
        setImageLoaded(true);
        // 設置保存的渲染配置
        setScale(savedScale);
        setOffsetX(savedOffset.x);
        setOffsetY(savedOffset.y);
        setTolerance(0);
      };
      img.onerror = () => {
        setImageLoaded(false);
        setImageSrc(null);
      };
      img.src = spritePath;
    } else {
      setAssetType('static');
      setFrameOffsets([]);
      setProcessedFrames([]);
      // 加載靜態圖片（傳遞保存的渲染配置和 category）
      loadAssetImage(asset.id, { offset: savedOffset, scale: savedScale }, asset.category);
    }
  }, [loadAssetImage]);

  // ============================================================================
  // 操作：返回列表
  // ============================================================================
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedAsset(null);
    setMessage(null);
  }, []);

  // ============================================================================
  // 操作：保存資產
  // ============================================================================
  const getCanvasData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // 自動生成資產 ID（基於時間戳和隨機字符串）
  const generateAssetId = useCallback(() => {
    const timestamp = Date.now().toString(36); // 時間戳轉為 36 進制，更短
    const random = Math.random().toString(36).substring(2, 6); // 4 位隨機字符
    return `asset_${timestamp}_${random}`;
  }, []);

  const handleSave = useCallback(async () => {
    // 驗證：只需要資產名稱
    if (!assetName) {
      setMessage({ type: 'error', text: '請輸入資產名稱' });
      return;
    }

    // 如果沒有輸入 ID，自動生成一個
    const finalAssetId = assetId.trim() || generateAssetId();

    setSaving(true);
    setMessage(null);

    try {
      const isEdit = viewMode === 'edit';
      const method = isEdit ? 'PUT' : 'POST';
      
      // 準備數據
      const body: Record<string, unknown> = {
        id: finalAssetId,
        name: assetName,
        category,
        style,
        gridSize: { width: gridSize, height: gridSize },
        cost,
        description,
        generationPrompt: generationPrompt || undefined, // 保存生成 Prompt
        // 保存渲染配置，遊戲渲染時需要讀取並應用
        renderOffset: { x: offsetX, y: offsetY },
        renderScale: scale,
      };

      // 動態資產配置（spriteSheet 路徑包含分類目錄）
      if (assetType === 'animated' && imageLoaded) {
        body.animation = {
          animated: true,
          spriteSheet: `${category}/${finalAssetId}_sprite.png`,
          layout: {
            columns: spriteColumns,
            rows: spriteRows,
          },
          frameCount: spriteColumns * spriteRows,
          frameInterval: frameInterval,
          loop: true,
          randomStartFrame: true,
          frameOffsets: frameOffsets,
        };
        // 保存原始精靈圖
        body.spriteSheetData = imageSrc;
      } else if (imageLoaded) {
        // 靜態資產：保存處理後的圖片（已應用 scale/offset，並裁剪透明邊緣）
        // 這是一次性工具處理，生成適合遊戲的最終資產圖片
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 獲取畫布數據並找到非透明區域的邊界
            const fullWidth = CANVAS_SIZE * CANVAS_DPR;
            const fullHeight = CANVAS_SIZE * CANVAS_DPR;
            const imageData = ctx.getImageData(0, 0, fullWidth, fullHeight);
            const data = imageData.data;
            
            let minX = fullWidth, minY = fullHeight, maxX = 0, maxY = 0;
            
            // 掃描找到非透明像素的邊界
            for (let y = 0; y < fullHeight; y++) {
              for (let x = 0; x < fullWidth; x++) {
                const alpha = data[(y * fullWidth + x) * 4 + 3];
                if (alpha > 0) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            
            // 如果找到非透明區域，裁剪並保存
            if (maxX >= minX && maxY >= minY) {
              const cropWidth = maxX - minX + 1;
              const cropHeight = maxY - minY + 1;
              
              // 創建裁剪後的畫布
              const croppedCanvas = document.createElement('canvas');
              croppedCanvas.width = cropWidth;
              croppedCanvas.height = cropHeight;
              const croppedCtx = croppedCanvas.getContext('2d');
              
              if (croppedCtx) {
                // 複製裁剪區域
                const croppedData = ctx.getImageData(minX, minY, cropWidth, cropHeight);
                croppedCtx.putImageData(croppedData, 0, 0);
                
                // 保存裁剪後的圖片（大幅減小文件大小）
                body.imageData = croppedCanvas.toDataURL('image/png');
                console.log(`[AssetEditor] 圖片已裁剪: ${fullWidth}x${fullHeight} -> ${cropWidth}x${cropHeight}`);
              }
            } else {
              // 沒有非透明像素，保存空白提示
              console.warn('[AssetEditor] 警告：畫布中沒有可見內容');
            }
          }
        }
      }

      const response = await fetch('/api/assets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: isEdit ? `✓ 資產「${assetName}」已更新` : `✓ 資產「${assetName}」已創建` 
        });
        
        // 立即更新動畫系統的資產緩存，使新資產可以正確渲染
        // 這樣無需刷新頁面，資產的 renderOffset 和 renderScale 就會生效
        const savedConfig: AssetConfig = {
          id: finalAssetId,
          name: assetName,
          category,
          style,
          gridSize: { width: gridSize, height: gridSize },
          cost,
          description,
          renderOffset: { x: offsetX, y: offsetY },
          renderScale: scale,
        };
        
        // 如果是動態資產，添加動畫配置（spriteSheet 路徑包含分類目錄）
        if (assetType === 'animated' && imageSrc) {
          // 如果 imageSrc 已經包含完整路徑，提取文件名；否則使用分類目錄構建路徑
          const spriteName = imageSrc.includes('/') && !imageSrc.startsWith('data:')
            ? imageSrc.split('/').pop() || `${finalAssetId}_sprite.png`
            : `${finalAssetId}_sprite.png`;
          savedConfig.animation = {
            animated: true,
            spriteSheet: `${category}/${spriteName}`,
            layout: { columns: spriteColumns, rows: spriteRows },
            frameCount: spriteColumns * spriteRows,
            frameInterval,
            loop: true,
            randomStartFrame: true,
            frameOffsets,
          };
        }
        
        spriteAnimationManager.updateAssetConfig(savedConfig);
        
        // 重新加載資產列表
        await loadAssets();
        
        if (!isEdit) {
          // 創建成功後清空表單
          setAssetId('');
          setAssetName('');
        }
      } else {
        setMessage({ type: 'error', text: result.error || '保存失敗' });
      }
    } catch (error) {
      console.error('保存資產失敗:', error);
      setMessage({ type: 'error', text: '網絡錯誤，請重試' });
    } finally {
      setSaving(false);
    }
  }, [assetId, assetName, category, style, gridSize, cost, description, imageLoaded, viewMode, loadAssets, assetType, spriteColumns, spriteRows, frameInterval, frameOffsets, imageSrc, generationPrompt, offsetX, offsetY, scale, generateAssetId]);

  // ============================================================================
  // 操作：刪除資產
  // ============================================================================
  const handleDelete = useCallback(async () => {
    if (!selectedAsset) return;
    
    if (!confirm(`確定要刪除資產「${selectedAsset.name}」嗎？此操作無法撤銷。`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/assets?id=${selectedAsset.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `資產「${selectedAsset.name}」已刪除` });
        await loadAssets();
        handleBackToList();
      } else {
        const result = await response.json();
        setMessage({ type: 'error', text: result.error || '刪除失敗' });
      }
    } catch (error) {
      console.error('刪除資產失敗:', error);
      setMessage({ type: 'error', text: '網絡錯誤，請重試' });
    } finally {
      setSaving(false);
    }
  }, [selectedAsset, loadAssets, handleBackToList]);

  // ============================================================================
  // 操作：導出 PNG
  // ============================================================================
  const handleExport = useCallback(() => {
    const data = getCanvasData();
    if (!data) return;

    const link = document.createElement('a');
    link.download = `${assetId || 'asset'}_${Date.now()}.png`;
    link.href = data;
    link.click();
  }, [assetId, getCanvasData]);

  // ============================================================================
  // 菱形網格 SVG（使用與遊戲完全相同的座標計算邏輯）
  // ============================================================================
  const getGridOverlaySVG = useCallback(() => {
    const tileW = TILE_WIDTH;
    const tileH = TILE_HEIGHT;
    
    // 計算整個網格區域的範圍（用於居中顯示）
    const gridMinX = -(gridSize - 1) * (tileW / 2);
    const gridMaxX = (gridSize - 1) * (tileW / 2) + tileW;
    const gridMinY = 0;
    const gridMaxY = (gridSize - 1) * 2 * (tileH / 2) + tileH;
    
    // 計算網格中心
    const gridCenterX = (gridMinX + gridMaxX) / 2;
    const gridCenterY = (gridMinY + gridMaxY) / 2;
    
    // 計算偏移量，使網格居中顯示在畫布中央
    const offsetToCenter_X = CANVAS_SIZE / 2 - gridCenterX;
    const offsetToCenter_Y = CANVAS_SIZE / 2 - gridCenterY;
    
    const paths: string[] = [];
    
    // 使用與遊戲相同的 gridToScreen 邏輯
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        // 遊戲中的 gridToScreen 公式
        const screenX = (gx - gy) * (tileW / 2);
        const screenY = (gx + gy) * (tileH / 2);
        
        // 加上居中偏移
        const x = screenX + offsetToCenter_X;
        const y = screenY + offsetToCenter_Y;
        
        // 菱形格子的四個頂點（基於 bounding box 的左上角）
        const top = `${x + tileW / 2},${y}`;
        const right = `${x + tileW},${y + tileH / 2}`;
        const bottom = `${x + tileW / 2},${y + tileH}`;
        const left = `${x},${y + tileH / 2}`;
        
        paths.push(`M${top} L${right} L${bottom} L${left} Z`);
      }
    }
    
    return paths.join(' ');
  }, [gridSize]);
  
  // 計算建築實際渲染區域的參考框
  const getRenderGuideRect = useCallback(() => {
    const tileW = TILE_WIDTH;
    const tileH = TILE_HEIGHT;
    
    // 計算整個網格區域的範圍（與繪製邏輯一致）
    const gridMinX = -(gridSize - 1) * (tileW / 2);
    const gridMaxX = (gridSize - 1) * (tileW / 2) + tileW;
    const gridMinY = 0;
    const gridMaxY = (gridSize - 1) * 2 * (tileH / 2) + tileH;
    
    const gridCenterX = (gridMinX + gridMaxX) / 2;
    const gridCenterY = (gridMinY + gridMaxY) / 2;
    
    const offsetToCenter_X = CANVAS_SIZE / 2 - gridCenterX;
    const offsetToCenter_Y = CANVAS_SIZE / 2 - gridCenterY;
    
    // 主格子 (0, 0) 在畫布上的座標
    const x = 0 + offsetToCenter_X;
    const y = 0 + offsetToCenter_Y;
    
    // 建築渲染寬度 = 格子寬度 * spriteScale
    const renderWidth = tileW * SPRITE_SCALE;
    
    // 底部對齊線的位置（與遊戲渲染公式一致：y + h）
    const renderBottom = y + tileH;
    
    return {
      centerX: x + tileW / 2,
      bottomY: renderBottom,
      width: renderWidth,
    };
  }, [gridSize]);

  // ============================================================================
  // 渲染：資產列表項
  // ============================================================================
  const renderAssetItem = (asset: AssetConfig) => (
    <button
      key={asset.id}
      onClick={() => handleEditAsset(asset)}
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all
        hover:bg-accent/50 text-left w-full
        ${selectedAsset?.id === asset.id ? 'bg-accent ring-2 ring-primary' : 'bg-card/50'}
      `}
    >
      {/* 縮略圖 */}
      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
        <img 
          src={
            asset.animation?.spriteSheet 
              ? `/assets/${asset.animation.spriteSheet}` // 動態資產使用 spriteSheet
              : `/assets/${asset.category}/${asset.id}.png` // 靜態資產使用普通圖片
          }
          alt={asset.name}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{asset.name}</div>
        <div className="text-xs text-muted-foreground flex gap-2">
          <span>{ASSET_CATEGORIES[asset.category]}</span>
          <span>•</span>
          <span>{ASSET_STYLES[asset.style] || '手繪風'}</span>
          <span>•</span>
          <span>{asset.gridSize.width}×{asset.gridSize.height}</span>
        </div>
      </div>
      
      {/* 成本 */}
      <div className="text-sm text-muted-foreground">
        ${asset.cost}
      </div>
    </button>
  );

  // ============================================================================
  // 渲染：列表視圖
  // ============================================================================
  const renderListView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* 資產列表 */}
      <div className="w-96 border-r flex flex-col">
        {/* 篩選欄 */}
        <div className="p-4 border-b space-y-3">
          {/* 搜索 */}
          <Input
            placeholder="搜索資產..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* 分類篩選 */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('all')}
            >
              全部
            </Button>
            {Object.entries(ASSET_CATEGORIES).map(([key, name]) => (
              <Button
                key={key}
                variant={filterCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(key as AssetCategory)}
              >
                {name}
              </Button>
            ))}
          </div>
          
          {/* 風格篩選 */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant={filterStyle === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterStyle('all')}
            >
              所有風格
            </Button>
            {Object.entries(ASSET_STYLES).map(([key, name]) => (
              <Button
                key={key}
                variant={filterStyle === key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterStyle(key as AssetStyle)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
        
        {/* 資產列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">加載中...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {assets.length === 0 ? '暫無資產' : '沒有符合條件的資產'}
            </div>
          ) : (
            filteredAssets.map(renderAssetItem)
          )}
        </div>
        
        {/* 新建按鈕 */}
        <div className="p-3 border-t">
          <Button onClick={handleStartCreate} className="w-full" size="lg">
            + 創建新資產
          </Button>
        </div>
      </div>
      
      {/* 右側預覽/提示區 */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-xl font-medium mb-2">資產管理中心</h3>
          <p>點擊左側資產進行編輯</p>
          <p>或創建新資產</p>
          <div className="mt-4 text-sm">
            共 {assets.length} 個資產
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // 渲染：編輯/創建視圖
  // ============================================================================
  const renderEditorView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* 左側控制面板 */}
      <div className="w-96 bg-card p-6 overflow-y-auto border-r flex flex-col gap-6">
        {/* 返回按鈕 */}
        <Button variant="ghost" onClick={handleBackToList} className="justify-start -ml-2">
          ← 返回列表
        </Button>

        {/* 0. Prompt 工作區（創建模式）或 Prompt 查看區（編輯模式） */}
        <section className="space-y-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">✨ AI 生成 Prompt</h3>
            {viewMode === 'create' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptBuilder(!showPromptBuilder)}
              >
                {showPromptBuilder ? '收起' : '展開'}
              </Button>
            )}
          </div>
          
          {/* 創建模式：Prompt 構建器 */}
          {viewMode === 'create' && showPromptBuilder && promptTemplates && (
            <div className="space-y-4">
              {/* 動態資產提示 */}
              {assetType === 'animated' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs">
                  <div className="font-medium text-amber-600 mb-1">🎬 精靈圖模式</div>
                  <div className="text-muted-foreground">
                    當前設置：{spriteColumns} 列 × {spriteRows} 行 = {spriteColumns * spriteRows} 幀
                  </div>
                  <div className="text-muted-foreground mt-1">
                    請先在下方「精靈圖設置」中調整列數和行數，模板會自動更新
                  </div>
                </div>
              )}
              
              {/* 基礎模板（只讀） */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {assetType === 'animated' ? '🎬 精靈圖基礎模板' : '🎮 基礎模板（遊戲級）'}
                </Label>
                <div className="bg-muted/50 p-2 rounded text-xs font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {assetType === 'animated' 
                    ? (promptTemplates.baseAnimated || promptTemplates.base)
                        .replace('{ASSET_NAME}', assetName || '{資產名稱}')
                        .replace('{COLUMNS}', String(spriteColumns))
                        .replace('{ROWS}', String(spriteRows))
                        .replace('{TOTAL_FRAMES}', String(spriteColumns * spriteRows))
                    : promptTemplates.base.replace('{ASSET_NAME}', assetName || '{資產名稱}')
                  }
                </div>
              </div>
              
              {/* 風格模板（隨風格選擇自動更新） */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🎨 風格模板（{ASSET_STYLES[style]}）</Label>
                <div className="bg-muted/50 p-2 rounded text-xs font-mono max-h-20 overflow-y-auto">
                  {promptTemplates.styles[style] || '（無此風格模板）'}
                </div>
              </div>
              
              {/* 資產描述（用戶編輯） */}
              <div className="space-y-1">
                <Label className="text-xs">
                  {assetType === 'animated' ? '🌿 動畫主體描述' : '🏛️ 資產外觀描述'}
                </Label>
                <textarea
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                  placeholder={assetType === 'animated' 
                    ? "描述動畫主體的外觀和動作...&#10;例如：A graceful willow tree with long, flowing branches gently swaying in a light breeze. The leaves cascade downward in elegant curves..."
                    : "描述建築的外觀、材質、細節...&#10;例如：A humble cottage with a thick, layered thatched roof showing visible straw textures..."
                  }
                  className="w-full h-24 p-2 rounded border bg-background text-sm resize-none"
                />
              </div>
            </div>
          )}
          
          {/* 完整 Prompt 預覽/編輯 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {viewMode === 'create' ? '📝 完整 Prompt 預覽' : '📝 生成此資產的 Prompt'}
              </Label>
              <span className="text-xs text-muted-foreground">
                {generationPrompt.length} 字符
              </span>
            </div>
            <textarea
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              className="w-full h-32 p-2 rounded border bg-background text-xs font-mono resize-none"
              placeholder={viewMode === 'edit' ? '此資產沒有保存生成 Prompt' : '填寫上方信息以生成 Prompt...'}
            />
            <Button
              onClick={copyPromptToClipboard}
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={!generationPrompt}
            >
              📋 複製 Prompt 到剪貼板
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {viewMode === 'create' 
              ? (assetType === 'animated'
                  ? '💡 先設置精靈圖布局（列×行），編寫描述，然後複製 Prompt 去 AI 生成精靈圖'
                  : '💡 先設置風格和資產名稱，編寫描述，然後複製 Prompt 去 AI 生成圖片')
              : '💡 可編輯此 Prompt 並複製用於重新生成資產'}
          </p>
        </section>

        {/* 1. 資產類型選擇 */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">資產類型</h3>
          <div className="flex gap-2">
            <Button
              variant={assetType === 'static' ? 'default' : 'outline'}
              onClick={() => setAssetType('static')}
              className="flex-1"
            >
              🖼️ 靜態資產
            </Button>
            <Button
              variant={assetType === 'animated' ? 'default' : 'outline'}
              onClick={() => setAssetType('animated')}
              className="flex-1"
            >
              🎬 動態資產
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {assetType === 'static' 
              ? '單張圖片，適用於建築、裝飾等' 
              : '精靈圖動畫，適用於樹木搖擺、水波等動態效果'}
          </p>
        </section>

        {/* 1. 上傳圖片 */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">
            {assetType === 'animated' ? '上載精靈圖' : (viewMode === 'edit' ? '更換圖片' : '1. 上載圖片')}
          </h3>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="cursor-pointer"
          />
          {assetType === 'animated' && (
            <p className="text-xs text-muted-foreground">
              精靈圖格式：多幀動畫排列成網格，從左到右、從上到下播放
            </p>
          )}
        </section>

        {/* 動態資產：精靈圖設置 */}
        {assetType === 'animated' && (
          <section className="space-y-4 bg-accent/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">精靈圖設置</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>列數（橫向幀數）</Label>
                <Input
                  type="number"
                  value={spriteColumns}
                  onChange={(e) => setSpriteColumns(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <Label>行數（縱向幀數）</Label>
                <Input
                  type="number"
                  value={spriteRows}
                  onChange={(e) => setSpriteRows(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              總幀數：{spriteColumns * spriteRows} 幀
              {processedFrames.length > 0 && (
                <span className="text-green-600 ml-2">
                  ✓ 已處理 {processedFrames.length} 幀
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>幀間隔（毫秒）</Label>
                <span className="text-sm text-muted-foreground">{frameInterval}ms</span>
              </div>
              <Slider
                value={[frameInterval]}
                onValueChange={([v]) => setFrameInterval(v)}
                min={50}
                max={500}
                step={10}
              />
            </div>
            
            {/* 動畫播放控制 */}
            <div className="flex gap-2">
              <Button
                variant={isPlaying ? 'destructive' : 'default'}
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1"
              >
                {isPlaying ? '⏹️ 停止' : '▶️ 播放動畫'}
              </Button>
            </div>
          </section>
        )}

        {/* 動態資產：幀選擇和偏移調整 */}
        {assetType === 'animated' && processedFrames.length > 0 && (
          <section className="space-y-4 bg-accent/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg border-b pb-2">🎯 幀對齊調整</h3>
            
            {/* 預覽模式切換 */}
            <div className="flex gap-2 mb-2">
              <Button
                variant={!showOverlay ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOverlay(false)}
              >
                單幀預覽
              </Button>
              <Button
                variant={showOverlay ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOverlay(true)}
              >
                疊加預覽
              </Button>
            </div>
            
            {showOverlay && (
              <p className="text-xs text-muted-foreground">
                💡 疊加模式：所有幀疊在一起顯示，方便發現對齊問題
              </p>
            )}
            
            {/* 幀縮略圖列表（按行分組） */}
            <div className="space-y-2">
              {Array.from({ length: spriteRows }).map((_, rowIndex) => (
                <div key={rowIndex} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">第 {rowIndex + 1} 行</span>
                    {/* 按行批量調整 Y 偏移 */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => adjustRowOffset(rowIndex, 'y', -5)}
                      >
                        ↑5
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => adjustRowOffset(rowIndex, 'y', 5)}
                      >
                        ↓5
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {processedFrames
                      .slice(rowIndex * spriteColumns, (rowIndex + 1) * spriteColumns)
                      .map((frame, colIndex) => {
                        const frameIndex = rowIndex * spriteColumns + colIndex;
                        const offset = frameOffsets[frameIndex] || { x: 0, y: 0 };
                        const hasOffset = offset.x !== 0 || offset.y !== 0;
                        return (
                          <button
                            key={frameIndex}
                            onClick={() => { setSelectedFrame(frameIndex); setIsPlaying(false); }}
                            className={`
                              relative aspect-square border-2 rounded overflow-hidden
                              ${selectedFrame === frameIndex ? 'border-primary ring-2 ring-primary' : 'border-muted'}
                              ${hasOffset ? 'bg-yellow-100/50' : ''}
                            `}
                          >
                            <img
                              src={frame.toDataURL()}
                              alt={`幀 ${frameIndex + 1}`}
                              className="w-full h-full object-contain bg-white/50"
                            />
                            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1">
                              {frameIndex + 1}
                            </span>
                            {hasOffset && (
                              <span className="absolute top-0 left-0 bg-yellow-500 text-black text-xs px-0.5">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 當前幀偏移調整 */}
            <div className="space-y-3 p-3 bg-background/50 rounded border-2 border-primary/30">
              <div className="flex justify-between items-center">
                <Label className="font-medium text-primary">幀 {selectedFrame + 1} 偏移調整</Label>
              </div>
              
              {/* Y 偏移（垂直，最常用） */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Y 偏移（垂直）</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'y', (frameOffsets[selectedFrame]?.y || 0) - 10)}
                    >
                      -10
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'y', (frameOffsets[selectedFrame]?.y || 0) - 1)}
                    >
                      -1
                    </Button>
                    <span className="text-sm font-mono w-10 text-center">
                      {frameOffsets[selectedFrame]?.y || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'y', (frameOffsets[selectedFrame]?.y || 0) + 1)}
                    >
                      +1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'y', (frameOffsets[selectedFrame]?.y || 0) + 10)}
                    >
                      +10
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[frameOffsets[selectedFrame]?.y || 0]}
                  onValueChange={([v]) => updateFrameOffset(selectedFrame, 'y', v)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
              
              {/* X 偏移（水平） */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>X 偏移（水平）</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'x', (frameOffsets[selectedFrame]?.x || 0) - 10)}
                    >
                      -10
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'x', (frameOffsets[selectedFrame]?.x || 0) - 1)}
                    >
                      -1
                    </Button>
                    <span className="text-sm font-mono w-10 text-center">
                      {frameOffsets[selectedFrame]?.x || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'x', (frameOffsets[selectedFrame]?.x || 0) + 1)}
                    >
                      +1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-8 p-0"
                      onClick={() => updateFrameOffset(selectedFrame, 'x', (frameOffsets[selectedFrame]?.x || 0) + 10)}
                    >
                      +10
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[frameOffsets[selectedFrame]?.x || 0]}
                  onValueChange={([v]) => updateFrameOffset(selectedFrame, 'x', v)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
              
              {/* 快速操作 */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { updateFrameOffset(selectedFrame, 'x', 0); updateFrameOffset(selectedFrame, 'y', 0); }}
                >
                  重置此幀
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyCurrentToRow()}
                >
                  應用到同行
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = frameOffsets[selectedFrame] || { x: 0, y: 0 };
                    applyOffsetToAllFrames('x', current.x);
                    applyOffsetToAllFrames('y', current.y);
                  }}
                >
                  應用到全部
                </Button>
              </div>
            </div>
            
            {/* 偏移狀態概覽 */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <div className="font-medium mb-1">偏移狀態概覽：</div>
              <div className="grid grid-cols-4 gap-1">
                {frameOffsets.map((offset, i) => (
                  <span key={i} className={offset?.x !== 0 || offset?.y !== 0 ? 'text-yellow-600' : ''}>
                    {i + 1}: ({offset?.x || 0}, {offset?.y || 0})
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 2. 資產微調（通用） */}
        <section className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">
            {assetType === 'animated' ? '整體調整' : '2. 資產微調'}
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>縮放</Label>
              <span className="text-sm text-muted-foreground">{scale.toFixed(2)}</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={0.1}
              max={4}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>水平位移 (X)</Label>
              <span className="text-sm text-muted-foreground">{offsetX}</span>
            </div>
            <Slider
              value={[offsetX]}
              onValueChange={([v]) => setOffsetX(v)}
              min={-300}
              max={300}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>垂直位移 (Y)</Label>
              <span className="text-sm text-muted-foreground">{offsetY}</span>
            </div>
            <Slider
              value={[offsetY]}
              onValueChange={([v]) => setOffsetY(v)}
              min={-300}
              max={300}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>去背強度</Label>
              <span className="text-sm text-muted-foreground">{tolerance}</span>
            </div>
            <Slider
              value={[tolerance]}
              onValueChange={([v]) => setTolerance(v)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </section>

        {/* 3. 資產屬性 */}
        <section className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">3. 資產屬性</h3>
          
          {/* 資產名稱（主要欄位） */}
          <div className="space-y-2">
            <Label>資產名稱（必填）</Label>
            <Input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="小亭"
            />
          </div>

          {/* 資產 ID（可選） */}
          <div className="space-y-2">
            <Label>資產 ID（可選，留空則自動生成）</Label>
            <Input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="自動生成，或輸入自訂 ID 如 pavilion_small"
              disabled={viewMode === 'edit'}
            />
            {viewMode === 'edit' ? (
              <p className="text-xs text-muted-foreground">編輯模式下不可修改 ID</p>
            ) : (
              <p className="text-xs text-muted-foreground">留空則自動生成唯一 ID，也可手動指定英文 ID</p>
            )}
          </div>

          {/* 分類選擇 */}
          <div className="space-y-2">
            <Label>功能分類</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ASSET_CATEGORIES).map(([key, name]) => (
                <Button
                  key={key}
                  variant={category === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(key as AssetCategory)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          {/* 風格選擇 */}
          <div className="space-y-2">
            <Label>風格標籤</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ASSET_STYLES).map(([key, name]) => (
                <Button
                  key={key}
                  variant={style === key ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStyle(key as AssetStyle)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          {/* 格數選擇 */}
          <div className="space-y-2">
            <Label>格數</Label>
            <div className="flex gap-2">
              {GRID_SIZES.map((size) => (
                <Button
                  key={size}
                  variant={gridSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGridSize(size)}
                  className="w-12"
                >
                  {size}×{size}
                </Button>
              ))}
            </div>
          </div>

          {/* 成本 */}
          <div className="space-y-2">
            <Label>成本</Label>
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label>描述（可選）</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="建築描述..."
            />
          </div>
        </section>

        {/* 4. 操作按鈕 */}
        <section className="space-y-3 mt-auto">
          {message && (
            <div className={`p-3 rounded text-sm ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? '保存中...' : viewMode === 'edit' ? '保存修改' : '創建資產'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!imageLoaded}
            className="w-full"
          >
            導出 PNG（本地下載）
          </Button>

          {viewMode === 'edit' && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="w-full"
            >
              刪除資產
            </Button>
          )}
        </section>
      </div>

      {/* 右側預覽區域 */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 relative overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), 
            linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
            linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        {/* 預覽縮放控制器 */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border">
            <span className="text-xs text-muted-foreground">預覽縮放</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.2))}
              disabled={previewZoom <= 0.5}
            >
              −
            </Button>
            <span className="text-sm font-mono w-12 text-center">{previewZoom.toFixed(1)}×</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPreviewZoom(z => Math.min(3, z + 0.2))}
              disabled={previewZoom >= 3}
            >
              +
            </Button>
          </div>
          <div className="text-xs text-muted-foreground bg-background/70 backdrop-blur-sm rounded px-2 py-1">
            高清預覽（{CANVAS_DPR}×DPI）
          </div>
        </div>

        <div 
          className="relative"
          style={{
            transform: `scale(${previewZoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Canvas - 靜態資產（高 DPI 渲染） */}
          {assetType === 'static' && (
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE * CANVAS_DPR}
              height={CANVAS_SIZE * CANVAS_DPR}
              className="border-2 border-primary shadow-xl bg-transparent"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            />
          )}
          
          {/* Canvas - 動態資產動畫預覽（高 DPI 渲染） */}
          {assetType === 'animated' && (
            <canvas
              ref={animCanvasRef}
              width={CANVAS_SIZE * CANVAS_DPR}
              height={CANVAS_SIZE * CANVAS_DPR}
              className="border-2 border-primary shadow-xl bg-transparent"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            />
          )}
          
          {/* 菱形網格疊加層 */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          >
            {/* 等軸測菱形格子 */}
            <path
              d={getGridOverlaySVG()}
              fill="rgba(255, 0, 0, 0.1)"
              stroke="red"
              strokeWidth="2"
              opacity="0.7"
            />
            
            {/* 建築渲染寬度參考線（模擬 spriteScale = 1.3） */}
            {(() => {
              const guide = getRenderGuideRect();
              const lineY = guide.bottomY;
              return (
                <>
                  {/* 底部對齊線 */}
                  <line
                    x1={guide.centerX - guide.width / 2}
                    y1={lineY}
                    x2={guide.centerX + guide.width / 2}
                    y2={lineY}
                    stroke="#00aa00"
                    strokeWidth="2"
                    strokeDasharray="5,3"
                    opacity="0.8"
                  />
                  {/* 左右寬度標記 */}
                  <line
                    x1={guide.centerX - guide.width / 2}
                    y1={lineY - 10}
                    x2={guide.centerX - guide.width / 2}
                    y2={lineY + 10}
                    stroke="#00aa00"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                  <line
                    x1={guide.centerX + guide.width / 2}
                    y1={lineY - 10}
                    x2={guide.centerX + guide.width / 2}
                    y2={lineY + 10}
                    stroke="#00aa00"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                </>
              );
            })()}
          </svg>

        </div>

        {/* 動態資產：當前幀信息 */}
        {assetType === 'animated' && processedFrames.length > 0 && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
            {isPlaying 
              ? `▶ 播放中: ${currentAnimFrame + 1}/${processedFrames.length}`
              : `幀 ${selectedFrame + 1}/${processedFrames.length}`
            }
          </div>
        )}

        {/* 提示信息 */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <p className="text-muted-foreground text-lg">
              {assetType === 'animated' ? '請上傳精靈圖開始編輯' : '請上傳圖片開始編輯'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // 主渲染
  // ============================================================================
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* 頂部標題欄 */}
      <header className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-2xl font-bold">太虛資產管理中心</h1>
          <p className="text-sm opacity-80">
            {viewMode === 'list' && '瀏覽和管理遊戲資產'}
            {viewMode === 'create' && '創建新資產'}
            {viewMode === 'edit' && `編輯：${selectedAsset?.name || ''}`}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={onClose} 
          className="text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10"
        >
          返回首頁
        </Button>
      </header>

      {/* 內容區域 */}
      {viewMode === 'list' ? renderListView() : renderEditorView()}
    </div>
  );
}

export default AssetEditor;
