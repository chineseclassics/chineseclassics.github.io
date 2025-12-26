'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { GameProvider } from '@/context/GameContext';
import Game from '@/components/Game';
import { AssetEditor } from '@/components/AssetEditor';
import { useMobile } from '@/hooks/useMobile';
import { getAssetImagePath } from '@/lib/renderConfig';
import { SavedCityMeta } from '@/types/game';

// 應用模式類型
type AppMode = 'home' | 'game' | 'asset-editor';

const STORAGE_KEY = 'isocity-game-state';
const SAVED_CITIES_INDEX_KEY = 'isocity-saved-cities-index';

// 資產畫廊 - 從 assets.json 加載資產並顯示
function AssetGallery({ count = 16, cols = 4, cellSize = 120 }: { count?: number; cols?: number; cellSize?: number }) {
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([]);
  
  useEffect(() => {
    fetch('/assets/assets.json')
      .then(res => res.json())
      .then(data => {
        if (data.assets && Array.isArray(data.assets)) {
          setAssets(data.assets.slice(0, count));
        }
      })
      .catch(() => {
        // 靜默忽略錯誤
      });
  }, [count]);
  
  const rows = Math.ceil(Math.max(assets.length, 1) / cols);
  const canvasWidth = cols * cellSize;
  const canvasHeight = rows * cellSize;
  
  if (assets.length === 0) {
    // 沒有資產時顯示佔位符
    return (
      <div 
        className="flex items-center justify-center opacity-30"
        style={{ width: canvasWidth, height: cellSize }}
      >
        <span className="text-white/50 text-sm">資產加載中...</span>
      </div>
    );
  }
  
  return (
    <div 
      className="grid gap-2"
      style={{ 
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        width: canvasWidth 
      }}
    >
      {assets.map(asset => (
        <div 
          key={asset.id}
          className="relative flex items-center justify-center bg-white/5 rounded"
          style={{ width: cellSize, height: cellSize }}
        >
          <img 
            src={getAssetImagePath(asset.id, asset.category)}
            alt={asset.name}
            className="max-w-full max-h-full object-contain"
            style={{ maxWidth: cellSize - 16, maxHeight: cellSize - 16 }}
          />
        </div>
      ))}
    </div>
  );
}

// 向後兼容的 SpriteGallery 別名
const SpriteGallery = AssetGallery;


// Check if there's a saved game in localStorage
function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.grid && parsed.gridSize && parsed.stats;
    }
  } catch {
    return false;
  }
  return false;
}

// Load saved cities index from localStorage
function loadSavedCities(): SavedCityMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SAVED_CITIES_INDEX_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as SavedCityMeta[];
      }
    }
  } catch {
    return [];
  }
  return [];
}

// Saved City Card Component
function SavedCityCard({ city, onLoad }: { city: SavedCityMeta; onLoad: () => void }) {
  return (
    <button
      onClick={onLoad}
      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-none transition-all duration-200 group"
    >
      <h3 className="text-white font-medium truncate group-hover:text-white/90 text-sm">
        {city.cityName}
      </h3>
      <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
        <span>Pop: {city.population.toLocaleString()}</span>
        <span>${city.money.toLocaleString()}</span>
      </div>
    </button>
  );
}

const SAVED_CITY_PREFIX = 'isocity-city-';

export default function HomePage() {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [isChecking, setIsChecking] = useState(true);
  const [savedCities, setSavedCities] = useState<SavedCityMeta[]>([]);
  const { isMobileDevice, isSmallScreen } = useMobile();
  const isMobile = isMobileDevice || isSmallScreen;

  // Check for saved game after mount (client-side only)
  useEffect(() => {
    const checkSavedGame = () => {
      setIsChecking(false);
      setSavedCities(loadSavedCities());
      if (hasSavedGame()) {
        setAppMode('game');
      }
    };
    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(checkSavedGame);
  }, []);

  // Handle exit from game - refresh saved cities list
  const handleExitGame = () => {
    setAppMode('home');
    setSavedCities(loadSavedCities());
  };

  // Load a saved city
  const loadSavedCity = (cityId: string) => {
    try {
      const saved = localStorage.getItem(SAVED_CITY_PREFIX + cityId);
      if (saved) {
        localStorage.setItem(STORAGE_KEY, saved);
        setAppMode('game');
      }
    } catch {
      console.error('Failed to load saved city');
    }
  };

  if (isChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </main>
    );
  }

  // 資產編輯器模式
  if (appMode === 'asset-editor') {
    return <AssetEditor onClose={() => setAppMode('home')} />;
  }

  // 遊戲模式
  if (appMode === 'game') {
    return (
      <GameProvider>
        <main className="h-screen w-screen overflow-hidden">
          <Game onExit={handleExitGame} />
        </main>
      </GameProvider>
    );
  }

  // Mobile landing page
  if (isMobile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom overflow-y-auto">
        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-light tracking-wider text-white/90 mb-6">
          太虛幻境
        </h1>
        
        {/* Sprite Gallery - keep visible even when saves exist */}
        <div className="mb-6">
          <SpriteGallery count={9} cols={3} cellSize={72} />
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => setAppMode('game')}
            className="w-full py-6 text-xl font-light tracking-wide bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none transition-all duration-300"
          >
            進入太虛
          </Button>
        </div>
        
        {/* Saved Cities */}
        {savedCities.length > 0 && (
          <div className="w-full max-w-xs mt-4">
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
              已存小鎮
            </h2>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {savedCities.slice(0, 5).map((city) => (
                <SavedCityCard
                  key={city.id}
                  city={city}
                  onLoad={() => loadSavedCity(city.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  // Desktop landing page
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left - Title and Start Button */}
        <div className="flex flex-col items-center lg:items-start justify-center space-y-12">
          <h1 className="text-8xl font-light tracking-wider text-white/90">
            太虛幻境
          </h1>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setAppMode('game')}
              className="w-64 py-8 text-2xl font-light tracking-wide bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none transition-all duration-300"
            >
              進入太虛
            </Button>
            <Button 
              onClick={() => setAppMode('asset-editor')}
              variant="outline"
              className="w-64 py-4 text-lg font-light tracking-wide text-white/70 border-white/20 hover:bg-white/10 hover:text-white rounded-none transition-all duration-300"
            >
              資產編輯器
            </Button>
          </div>
          
          {/* Saved Cities */}
          {savedCities.length > 0 && (
            <div className="w-64">
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                已存小鎮
              </h2>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {savedCities.slice(0, 5).map((city) => (
                  <SavedCityCard
                    key={city.id}
                    city={city}
                    onLoad={() => loadSavedCity(city.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Sprite Gallery */}
        <div className="flex justify-center lg:justify-end">
          <SpriteGallery count={16} />
        </div>
      </div>
    </main>
  );
}
