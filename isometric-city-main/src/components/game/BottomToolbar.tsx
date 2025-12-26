'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { Tool, TOOL_INFO, BuildingType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { getAssetImagePath } from '@/lib/renderConfig';
import { getCachedImage, onImageLoaded } from '@/components/game/imageLoader';

// 內建資產配置類型（從 assets.ts 導入）
import { AssetConfig } from '@/types/assets';

// ============================================================================
// 類型定義
// ============================================================================

interface ToolCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  tools: Tool[];
}

// ============================================================================
// 圖標組件
// ============================================================================

// 選擇工具圖標
const SelectIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

// 拆除工具圖標
const BulldozeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// 道路圖標
const RoadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

// 規劃圖標
const ZoneIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

// 商業圖標（坊市）
const ShopIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

// 農業圖標
const FarmIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// 自然圖標（植物、水系、地貌）
const NatureIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c3 2 4 4.5 4 6.5A4 4 0 0 1 12 14a4 4 0 0 1-4-4.5C8 7.5 9 5 12 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v5" />
  </svg>
);

// 點綴圖標（Props）
const PropsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

// 園林建築圖標
const GardenBuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M6 21V10l6-4 6 4v11M9 21v-4h6v4" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3L2 9h20L12 3z" />
  </svg>
);


// ============================================================================
// 資產預覽組件
// ============================================================================

const AssetPreview = React.memo(function AssetPreview({ 
  tool, 
  isSelected,
  onClick,
  money,
  assetInfo // 動態資產的信息
}: { 
  tool: Tool;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  assetInfo?: { name: string; cost: number; description?: string; category?: string };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(0);
  // 優先使用傳入的動態資產信息，如果沒有則從系統 TOOL_INFO 獲取
  const info = assetInfo || TOOL_INFO[tool];
  const canAfford = money >= (info?.cost || 0);
  
  // 監聽圖像加載事件以重新繪製
  useEffect(() => {
    return onImageLoaded(() => {
      setImgLoaded(prev => prev + 1);
    });
  }, []);

  // 繪製資產預覽（使用獨立圖片，sprite sheet 系統已廢棄）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const buildingType = tool as BuildingType;

    // 特殊處理：草地
    if (buildingType === 'grass') {
      ctx.fillStyle = '#4a7c3f';
      ctx.beginPath();
      ctx.moveTo(32, 16);
      ctx.lineTo(56, 32);
      ctx.lineTo(32, 48);
      ctx.lineTo(8, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2d4a26';
      ctx.stroke();
      return;
    }
    
    // 特殊處理：水面
    if (buildingType === 'water') {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(32, 16);
      ctx.lineTo(56, 32);
      ctx.lineTo(32, 48);
      ctx.lineTo(8, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.stroke();
      return;
    }

    // 嘗試加載獨立圖片資產（使用 assetInfo 中的 category）
    const assetPath = getAssetImagePath(buildingType, assetInfo?.category);
    const assetImg = getCachedImage(assetPath);
    
    if (assetImg) {
      const imgW = assetImg.naturalWidth || assetImg.width;
      const imgH = assetImg.naturalHeight || assetImg.height;
      
      // 計算縮放以適合 64x64 的畫布（留邊距）
      const maxSize = 56;
      const scale = Math.min(maxSize / imgW, maxSize / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (64 - dw) / 2;
      const dy = (64 - dh) / 2;
      
      ctx.drawImage(assetImg, 0, 0, imgW, imgH, dx, dy, dw, dh);
      return;
    }

    // 沒有獨立圖片，顯示佔位符
    ctx.fillStyle = isSelected ? '#60a5fa' : '#374151';
    ctx.fillRect(8, 8, 48, 48);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(info?.name?.slice(0, 4) || tool.slice(0, 4), 32, 36);
  }, [tool, isSelected, info?.name, imgLoaded]);
  
  // 如果沒有任何工具信息，使用工具 ID 作為名稱
  const displayName = info?.name || tool;
  const displayCost = info?.cost || 0;
  
  return (
    <button
      onClick={onClick}
      disabled={!canAfford && displayCost > 0}
      className={`
        relative flex flex-col items-center p-1 rounded-lg transition-all duration-150
        min-w-[72px] flex-shrink-0
        ${isSelected 
          ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background' 
          : 'bg-card/60 hover:bg-card/90 border border-border/50'
        }
        ${!canAfford && displayCost > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={`${displayName}${displayCost > 0 ? ` - $${displayCost}` : ''}`}
    >
      <canvas 
        ref={canvasRef} 
        width={64} 
        height={64} 
        className="rounded"
      />
      <span className={`text-[10px] mt-1 truncate w-full text-center ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
        {displayName}
      </span>
      {displayCost > 0 && (
        <span className={`text-[9px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
          ${displayCost.toLocaleString()}
        </span>
      )}
    </button>
  );
});

// ============================================================================
// 工具欄項目組件
// ============================================================================

const ToolbarItem = React.memo(function ToolbarItem({
  category,
  isActive,
  hasSelectedTool,
  onClick
}: {
  category: ToolCategory;
  isActive: boolean;
  hasSelectedTool: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-150
        min-w-[56px] h-[56px]
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
          : hasSelectedTool 
            ? 'bg-primary/30 text-primary-foreground hover:bg-primary/50'
            : 'bg-card/60 hover:bg-card/90 text-foreground border border-border/30'
        }
      `}
      title={category.label}
    >
      {category.icon}
      <span className="text-[9px] mt-1 font-medium">{category.label}</span>
    </button>
  );
});

// ============================================================================
// 展開面板組件
// ============================================================================

const ExpandedPanel = React.memo(function ExpandedPanel({
  category,
  selectedTool,
  money,
  onSelectTool,
  onClose,
  builtinAssets
}: {
  category: ToolCategory;
  selectedTool: Tool;
  money: number;
  onSelectTool: (tool: Tool) => void;
  onClose: () => void;
  builtinAssets: AssetConfig[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 創建動態資產信息查找表（包含 category 用於路徑生成）
  const assetInfoMap = useMemo(() => {
    const map: Record<string, { name: string; cost: number; description?: string; category?: string }> = {};
    for (const asset of builtinAssets) {
      map[asset.id] = { 
        name: asset.name, 
        cost: asset.cost, 
        description: asset.description,
        category: asset.category 
      };
    }
    return map;
  }, [builtinAssets]);
  
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 animate-in slide-in-from-bottom-2 duration-200">
      <div className="bg-card/95 backdrop-blur-md rounded-xl border border-border/50 shadow-2xl overflow-hidden">
        {/* 標題欄 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
          <span className="text-sm font-semibold text-foreground">{category.label}</span>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 水平滾動區域 */}
        <div 
          ref={scrollRef}
          className="flex gap-2 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {category.tools.map(tool => (
            <AssetPreview
              key={tool}
              tool={tool}
              isSelected={selectedTool === tool}
              onClick={() => onSelectTool(tool)}
              money={money}
              assetInfo={assetInfoMap[tool]}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 功能按鈕圖標
// ============================================================================

// 統計圖標
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// 顧問圖標
const AdvisorIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

// 設定圖標
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// 退出圖標
const ExitIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// ============================================================================
// 功能按鈕組件
// ============================================================================

const FunctionButton = React.memo(function FunctionButton({
  icon,
  label,
  isActive,
  onClick,
  variant = 'default'
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-150
        min-w-[48px] h-[48px]
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-lg' 
          : variant === 'danger'
            ? 'bg-card/60 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-border/30'
            : 'bg-card/60 hover:bg-card/90 text-foreground border border-border/30'
        }
      `}
      title={label}
    >
      {icon}
      <span className="text-[8px] mt-0.5 font-medium">{label}</span>
    </button>
  );
});

// ============================================================================
// 主組件
// ============================================================================

// 資產分類（與 assets.json 中的分類一致）
// nature, road, garden, fangshi, farming, props

export const BottomToolbar = React.memo(function BottomToolbar({ 
  onExit 
}: { 
  onExit?: () => void 
}) {
  const { state, setTool, setActivePanel } = useGame();
  const { selectedTool, stats, activePanel } = state;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [builtinAssets, setBuiltinAssets] = useState<AssetConfig[]>([]);

  // 讀取內建資產配置
  useEffect(() => {
    fetch('/assets/assets.json')
      .then(res => res.json())
      .then(data => {
        console.log('[BottomToolbar] 加載資產配置:', data);
        if (data.assets && Array.isArray(data.assets)) {
          console.log('[BottomToolbar] 設置資產:', data.assets);
          setBuiltinAssets(data.assets);
        }
      })
      .catch(err => {
        console.log('未找到內建資產配置:', err);
      });
  }, []);
  
  // 基礎工具定義（只保留系統內置的基礎類型，所有建築資產從 assets.json 動態加載）
  const baseCategories = useMemo(() => ({
    nature: ['tree', 'water', 'grass'] as Tool[],  // 系統內置的自然類型
    road: ['road'] as Tool[],                       // 系統內置的道路類型
    garden: [] as Tool[],   // 從 assets.json 動態加載
    fangshi: [] as Tool[],  // 從 assets.json 動態加載
    farming: [] as Tool[],  // 從 assets.json 動態加載
    props: [] as Tool[],    // 從 assets.json 動態加載
  }), []);

  // 資產類別定義（動態包含內建資產）
  // 分類：自然 | 道路 | 園林 | 坊市 | 農事 | 點綴
  const categories: ToolCategory[] = useMemo(() => {
    // 將內建資產按分類分組（assets.json 中的分類已與工具欄一致）
    const builtinByCategory: Record<string, Tool[]> = {};
    console.log('[BottomToolbar] 構建分類，builtinAssets 長度:', builtinAssets.length);
    for (const asset of builtinAssets) {
      const category = asset.category || 'props';
      console.log(`[BottomToolbar] 資產 ${asset.id} 分類: ${category}`);
      if (!builtinByCategory[category]) {
        builtinByCategory[category] = [];
      }
      builtinByCategory[category].push(asset.id as Tool);
    }
    console.log('[BottomToolbar] 分類結果:', builtinByCategory);

    return [
      {
        id: 'nature',
        label: '自然',
        icon: <NatureIcon />,
        tools: [...baseCategories.nature, ...(builtinByCategory['nature'] || [])],
      },
      {
        id: 'road',
        label: '道路',
        icon: <RoadIcon />,
        tools: [...baseCategories.road, ...(builtinByCategory['road'] || [])],
      },
      {
        id: 'garden',
        label: '園林',
        icon: <GardenBuildingIcon />,
        tools: [...baseCategories.garden, ...(builtinByCategory['garden'] || [])],
      },
      {
        id: 'fangshi',
        label: '坊市',
        icon: <ShopIcon />,
        tools: [...baseCategories.fangshi, ...(builtinByCategory['fangshi'] || [])],
      },
      {
        id: 'farming',
        label: '農事',
        icon: <FarmIcon />,
        tools: [...baseCategories.farming, ...(builtinByCategory['farming'] || [])],
      },
      {
        id: 'props',
        label: '點綴',
        icon: <PropsIcon />,
        tools: [...baseCategories.props, ...(builtinByCategory['props'] || [])],
      },
    ];
  }, [baseCategories, builtinAssets]);
  
  // 規劃工具類別（不對應具體資產的工具）
  const zoneCategory: ToolCategory = useMemo(() => ({
    id: 'zone',
    label: '規劃',
    icon: <ZoneIcon />,
    tools: ['zone_living', 'zone_market', 'zone_farming', 'zone_dezone'] as Tool[],
  }), []);
  
  // 找出當前選中的工具所屬的類別
  const selectedCategory = useMemo(() => {
    // 檢查規劃類別
    if (zoneCategory.tools.includes(selectedTool)) {
      return zoneCategory.id;
    }
    // 檢查資產類別
    for (const cat of categories) {
      if (cat.tools.includes(selectedTool)) {
        return cat.id;
      }
    }
    return null;
  }, [categories, zoneCategory, selectedTool]);
  
  // 處理類別點擊
  const handleCategoryClick = useCallback((categoryId: string) => {
    if (categoryId === 'select') {
      setTool('select');
      setActiveCategory(null);
      return;
    }
    if (categoryId === 'bulldoze') {
      setTool('bulldoze');
      setActiveCategory(null);
      return;
    }
    if (activeCategory === categoryId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryId);
    }
  }, [activeCategory, setTool]);
  
  // 處理工具選擇
  const handleToolSelect = useCallback((tool: Tool) => {
    setTool(tool);
    // 選擇工具後保持面板開啟，方便連續選擇
  }, [setTool]);
  
  // 點擊外部關閉
  const handleClose = useCallback(() => {
    setActiveCategory(null);
  }, []);
  
  // 獲取當前活動的類別
  const activeCategoryData = useMemo(() => {
    if (activeCategory === 'zone') {
      return zoneCategory;
    }
    return categories.find(c => c.id === activeCategory);
  }, [categories, zoneCategory, activeCategory]);
  
  // 處理面板切換
  const handlePanelToggle = useCallback((panel: 'statistics' | 'advisors' | 'settings') => {
    setActivePanel(activePanel === panel ? 'none' : panel);
    setActiveCategory(null); // 關閉工具選擇面板
  }, [activePanel, setActivePanel]);
  
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      {/* 展開的面板 */}
      {activeCategoryData && activeCategory !== 'custom' && (
        <ExpandedPanel
          category={activeCategoryData}
          selectedTool={selectedTool}
          money={stats.money}
          onSelectTool={handleToolSelect}
          onClose={handleClose}
          builtinAssets={builtinAssets}
        />
      )}
      
      
      {/* 主工具欄 */}
      <div className="flex items-center gap-2 p-2 bg-card/90 backdrop-blur-md rounded-xl border border-border/50 shadow-2xl">
        {/* 工具類（不對應具體資產）：查看、拆除、規劃 */}
        <div className="flex items-center gap-1">
          <ToolbarItem
            category={{ id: 'select', label: '查看', icon: <SelectIcon />, tools: [] }}
            isActive={false}
            hasSelectedTool={selectedTool === 'select'}
            onClick={() => handleCategoryClick('select')}
          />
          <ToolbarItem
            category={{ id: 'bulldoze', label: '拆除', icon: <BulldozeIcon />, tools: [] }}
            isActive={false}
            hasSelectedTool={selectedTool === 'bulldoze'}
            onClick={() => handleCategoryClick('bulldoze')}
          />
          <ToolbarItem
            category={zoneCategory}
            isActive={activeCategory === 'zone'}
            hasSelectedTool={selectedCategory === 'zone'}
            onClick={() => handleCategoryClick('zone')}
          />
        </div>

        {/* 分隔線 */}
        <div className="w-px h-10 bg-border/50" />

        {/* 資產類別（對應具體資產） */}
        <div className="flex items-center gap-1">
          {categories.map(category => (
            <ToolbarItem
              key={category.id}
              category={category}
              isActive={activeCategory === category.id}
              hasSelectedTool={selectedCategory === category.id}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
          
        </div>
        
        {/* 分隔線 */}
        <div className="w-px h-10 bg-border/50" />
        
        {/* 功能按鈕區域 */}
        <div className="flex items-center gap-1">
          <FunctionButton
            icon={<ChartIcon />}
            label="統計"
            isActive={activePanel === 'statistics'}
            onClick={() => handlePanelToggle('statistics')}
          />
          <FunctionButton
            icon={<AdvisorIcon />}
            label="幕僚"
            isActive={activePanel === 'advisors'}
            onClick={() => handlePanelToggle('advisors')}
          />
          <FunctionButton
            icon={<SettingsIcon />}
            label="設定"
            isActive={activePanel === 'settings'}
            onClick={() => handlePanelToggle('settings')}
          />
          {onExit && (
            <FunctionButton
              icon={<ExitIcon />}
              label="離開"
              onClick={onExit}
              variant="danger"
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default BottomToolbar;

