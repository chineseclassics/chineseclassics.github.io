'use client';

import React from 'react';
import { Tile } from '@/types/game';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { CloseIcon } from '@/components/ui/Icons';

interface TileInfoPanelProps {
  tile: Tile;
  services: {
    health: number[][];
    education: number[][];
    power: boolean[][];
    water: boolean[][];
  };
  onClose: () => void;
  isMobile?: boolean;
}

export function TileInfoPanel({ 
  tile, 
  services, 
  onClose,
  isMobile = false
}: TileInfoPanelProps) {
  const { state, updateBuildingScale, rotateBuildingAt, pickUpBuildingAt, updateRoadVisualScale } = useGame();
  const { x, y } = tile;
  
  const currentScale = tile.building.visualScale || 1.0;
  const isBaseTerrain = tile.building.type === 'grass' || tile.building.type === 'water' || tile.building.type === 'empty';
  const isRoad = tile.building.type === 'road';
  const roadVisualScale = state.roadVisualScale || 1.0;

  return (
    <Card 
      className={`${isMobile ? 'fixed left-0 right-0 w-full rounded-none border-x-0 border-t border-b z-30' : 'absolute top-4 right-4 w-72'}`} 
      style={isMobile ? { top: 'calc(72px + env(safe-area-inset-top, 0px))' } : undefined}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-sans">地塊 ({x}, {y})</CardTitle>
        <div className="flex gap-1">
          {!isBaseTerrain && (
            <>
              <Button 
                variant="outline" 
                size="icon-sm" 
                className="h-7 w-7"
                onClick={() => rotateBuildingAt(x, y)}
                title="旋轉"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
              <Button 
                variant="outline" 
                size="icon-sm" 
                className="h-7 w-7"
                onClick={() => pickUpBuildingAt(x, y)}
                title="搬遷"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <CloseIcon size={14} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">建築</span>
          <span className="capitalize">{tile.building.type.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">區域</span>
          <Badge variant={
            tile.zone === 'living' ? 'default' :
            tile.zone === 'market' ? 'secondary' :
            tile.zone === 'farming' ? 'outline' : 'secondary'
          } className={
            tile.zone === 'living' ? 'bg-green-500/20 text-green-400' :
            tile.zone === 'market' ? 'bg-blue-500/20 text-blue-400' :
            tile.zone === 'farming' ? 'bg-amber-500/20 text-amber-400' : ''
          }>
            {tile.zone === 'none' ? '未規劃' : tile.zone === 'living' ? '翰墨境' : tile.zone === 'market' ? '錦繡境' : '豆田境'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">等級</span>
          <span>{tile.building.level}/5</span>
        </div>

        {!isBaseTerrain && !isRoad && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">視覺比例</span>
              <span className="font-mono text-xs">{currentScale.toFixed(2)}x</span>
            </div>
            <Slider
              value={[currentScale]}
              onValueChange={(v) => updateBuildingScale(x, y, v[0])}
              min={0.2}
              max={2.5}
              step={0.05}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground text-center">縮小可露出地塊顏色，實現盆景效果</p>
          </div>
        )}

        {isRoad && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">石板大小</span>
              <span className="font-mono text-xs">{roadVisualScale.toFixed(2)}x</span>
            </div>
            <Slider
              value={[roadVisualScale]}
              onValueChange={(v) => updateRoadVisualScale(v[0])}
              min={0.1}
              max={1.0}
              step={0.05}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground text-center">← 石板變大　　石板變小 →</p>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">人口</span>
          <span>{tile.building.population}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">燈火</span>
          <Badge variant={tile.building.powered ? 'default' : 'destructive'}>
            {tile.building.powered ? '已通' : '未通'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">井水</span>
          <Badge variant={tile.building.watered ? 'default' : 'destructive'} className={tile.building.watered ? 'bg-cyan-500/20 text-cyan-400' : ''}>
            {tile.building.watered ? '已通' : '未通'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">地價</span>
          <span>{tile.landValue} 幣</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">荒穢</span>
          <span className={tile.pollution > 50 ? 'text-red-400' : tile.pollution > 25 ? 'text-amber-400' : 'text-green-400'}>
            {Math.round(tile.pollution)}%
          </span>
        </div>
        
        {tile.building.onFire && (
          <>
            <Separator />
            <div className="flex justify-between text-red-400">
              <span>火災中！</span>
              <span>損毀 {Math.round(tile.building.fireProgress)}%</span>
            </div>
          </>
        )}
        
        <Separator />
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">公共覆蓋</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">醫療</span>
            <span>{Math.round(services.health[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">文教</span>
            <span>{Math.round(services.education[y][x])}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
