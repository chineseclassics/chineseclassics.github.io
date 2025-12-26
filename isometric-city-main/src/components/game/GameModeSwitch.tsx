'use client';

/**
 * 遊戲模式切換按鈕
 * 
 * 提供建造模式和遊歷模式之間的切換
 */

import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// 建造模式圖標（錘子/規劃工具）
const BuildIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

// 遊歷模式圖標（人物/走動）
const ExploreIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v6" />
    <path d="M9 20l3-6 3 6" />
    <path d="M8 13l4 1 4-1" />
  </svg>
);

/**
 * 遊戲模式切換組件
 * 浮動在右上角，提供建造/遊歷模式切換
 */
export function GameModeSwitch() {
  const { gameMode, setGameMode } = useGame();
  
  const isBuildMode = gameMode === 'build';
  
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border shadow-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isBuildMode ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setGameMode('build')}
            className={`h-10 w-10 ${isBuildMode ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <BuildIcon size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-medium">建造模式</p>
          <p className="text-xs text-muted-foreground">規劃園林、放置建築</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={!isBuildMode ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setGameMode('explore')}
            className={`h-10 w-10 ${!isBuildMode ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <ExploreIcon size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-medium">遊歷模式</p>
          <p className="text-xs text-muted-foreground">探索園林、與文人對話</p>
        </TooltipContent>
      </Tooltip>
      
      {/* 當前模式提示 */}
      <div className="text-center text-xs text-muted-foreground mt-1 px-1">
        {isBuildMode ? '建造' : '遊歷'}
      </div>
    </div>
  );
}

/**
 * 遊歷模式 UI 覆蓋層
 * 在遊歷模式下顯示操作提示和控制界面
 */
export function ExploreOverlay() {
  const { gameMode, player, nearbyInteractable, playerResources } = useGame();
  
  if (gameMode !== 'explore') {
    return null;
  }
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* 玩家資源顯示 */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-lg">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-amber-500">🫘</span>
            <span className="font-medium">{playerResources.judou}</span>
            <span className="text-muted-foreground text-xs">句豆</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">🌱</span>
            <span className="font-medium">{playerResources.tiandou}</span>
            <span className="text-muted-foreground text-xs">田豆</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">💰</span>
            <span className="font-medium">{playerResources.wenqian}</span>
            <span className="text-muted-foreground text-xs">文錢</span>
          </div>
        </div>
      </div>
      
      {/* 互動提示（當靠近可互動對象時顯示） */}
      {nearbyInteractable && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-primary/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary-foreground/20 shadow-lg animate-pulse">
            <div className="text-center">
              <div className="text-primary-foreground font-medium mb-1">
                {nearbyInteractable.prompt}
              </div>
              <div className="text-primary-foreground/80 text-sm">
                按 <span className="font-bold border border-primary-foreground/50 rounded px-1.5 py-0.5 mx-1">E</span> {nearbyInteractable.action}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 底部操作提示 */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-lg">
          <div className="text-center text-sm text-muted-foreground">
            <span className="text-foreground font-medium">WASD</span> 或 <span className="text-foreground font-medium">方向鍵</span> 移動
            <span className="mx-2">|</span>
            <span className="text-foreground font-medium">E</span> 互動
          </div>
        </div>
      </div>
      
      {/* 玩家狀態指示（調試用，後續可移除） */}
      <div className="absolute bottom-4 left-4 bg-card/80 rounded px-2 py-1 text-xs text-muted-foreground">
        位置: ({typeof player.x === 'number' ? player.x.toFixed(1) : '?'}, {typeof player.y === 'number' ? player.y.toFixed(1) : '?'}) | 狀態: {player.state}
      </div>
    </div>
  );
}

