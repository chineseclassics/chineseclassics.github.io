'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Tool, TOOL_INFO } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CloseIcon,
  RoadIcon,
  RailIcon,
  SubwayIcon,
  TreeIcon,
  PowerIcon,
  WaterIcon,
  BudgetIcon,
  ChartIcon,
  AdvisorIcon,
  TrophyIcon,
  SettingsIcon,
  FireIcon,
  HealthIcon,
  EducationIcon,
  SafetyIcon,
} from '@/components/ui/Icons';

// Tool category icons
const CategoryIcons: Record<string, React.ReactNode> = {
  'TOOLS': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  'ZONES': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  'SERVICES': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </svg>
  ),
  'PARKS': <TreeIcon size={20} />,
  'SPORTS': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  ),
  'RECREATION': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  'WATERFRONT': <WaterIcon size={20} />,
  'COMMUNITY': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'UTILITIES': <PowerIcon size={20} />,
  'SPECIAL': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

// Tool icons for quick access (Partial because not all tools need custom icons)
const QuickToolIcons: Partial<Record<Tool, React.ReactNode>> = {
  select: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4l16 8-8 3-3 8z" />
    </svg>
  ),
  bulldoze: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  ),
  road: <RoadIcon size={20} />,
  rail: <RailIcon size={20} />,
  subway: <SubwayIcon size={20} />,
  tree: <TreeIcon size={20} />,
  zone_living: (
    <div className="w-5 h-5 rounded-sm bg-green-500 flex items-center justify-center text-[10px] font-bold text-white">居</div>
  ),
  zone_market: (
    <div className="w-5 h-5 rounded-sm bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">市</div>
  ),
  zone_farming: (
    <div className="w-5 h-5 rounded-sm bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">田</div>
  ),
  zone_dezone: (
    <div className="w-5 h-5 rounded-sm bg-gray-500 flex items-center justify-center text-[10px] font-bold text-white">X</div>
  ),
  police_station: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1l9 4v6c0 5.5-3.8 10.7-9 12-5.2-1.3-9-6.5-9-12V5l9-4z" />
    </svg>
  ),
  fire_station: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1.5 4-1.5 6 0 8 1.5-2 1.5-4 0-8zM8 10c-2 4-2 6 0 10 2-4 2-6 0-10zM16 10c-2 4-2 6 0 10 2-4 2-6 0-10z" />
    </svg>
  ),
  hospital: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  university: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M5 20V8l7-4 7 4v12" />
      <path d="M9 20v-4h6v4" />
    </svg>
  ),
  park: <TreeIcon size={20} />,
  park_large: <TreeIcon size={20} />,
  tennis: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.5 4.5c5 5 10 5 15 0" />
      <path d="M4.5 19.5c5-5 10-5 15 0" />
    </svg>
  ),
  power_plant: <PowerIcon size={20} />,
  water_tower: <WaterIcon size={20} />,
  subway_station: <SubwayIcon size={20} />,
  stadium: <TrophyIcon size={20} />,
  museum: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M4 20v-6h4v6" />
      <path d="M10 20v-6h4v6" />
      <path d="M16 20v-6h4v6" />
      <path d="M2 14h20" />
      <path d="M12 3l10 7H2l10-7z" />
    </svg>
  ),
  airport: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
  space_program: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 5v6.5c0 6 5.5 10.5 8 11.5 2.5-1 8-5.5 8-11.5V5l-8-3z" />
    </svg>
  ),
  city_hall: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M4 20v-8l8-8 8 8v8" />
      <rect x="9" y="14" width="6" height="6" />
    </svg>
  ),
  amusement_park: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// 新分類：自然 | 道路 | 規劃 | 園林 | 坊市 | 農事 | 裝飾
const toolCategories = {
  '自然': ['tree', 'water', 'grass'] as Tool[],
  '道路': ['road'] as Tool[],
  '規劃': ['zone_living', 'zone_market', 'zone_farming', 'zone_dezone'] as Tool[],
  '園林': [
    // 居所
    'house_small', 'house_medium', 'mansion',
    // 亭台樓閣
    'park', 'park_large', 'tennis',
    // 其他園林建築
    'playground_small', 'playground_large', 'pond_park', 'park_gate', 'greenhouse_garden',
    // 橋
    'pier_large', 'marina_docks_small',
  ] as Tool[],
  '坊市': [
    // 商業
    'shop_small', 'shop_medium', 'office_low', 'office_high', 'mall',
    // 餐飲
    'community_center',
    // 公共
    'police_station', 'fire_station', 'hospital', 'water_tower',
    // 文教
    'school', 'university', 'museum',
    // 名勝
    'stadium', 'airport', 'space_program', 'city_hall', 'amusement_park',
  ] as Tool[],
  '農事': [
    // 糧食作物
    'farm_01', 'farm_02', 'farm_03', 'farm_04', 'farm_05',
    // 經濟作物
    'farm_06', 'farm_07', 'farm_08', 'farm_09', 'farm_10',
    // 園藝
    'farm_11', 'farm_12', 'farm_13', 'farm_14', 'farm_15',
    // 畜牧水產
    'animal_pens_farm',
    // 設施
    'factory_small', 'factory_medium', 'factory_large', 'warehouse',
  ] as Tool[],
  '點綴': [
    // 傢俱擺設
    'community_garden',
    // 假山石
    'mountain_lodge', 'mountain_trailhead',
    // 其他裝飾
    'cabin_house', 'campground',
    'basketball_courts', 'baseball_field_small', 'soccer_field_small',
    'football_field', 'baseball_stadium', 'swimming_pool', 'skate_park',
    'mini_golf_course', 'bleachers_field', 'go_kart_track', 'amphitheater',
    'roller_coaster_small', 'office_building_small',
  ] as Tool[],
};

// 太虛幻境：已移除 fire 和 police 覆蓋
type OverlayMode = 'none' | 'power' | 'water' | 'health' | 'education' | 'subway';

interface MobileToolbarProps {
  onOpenPanel: (panel: 'budget' | 'statistics' | 'advisors' | 'settings') => void;
  overlayMode?: OverlayMode;
  setOverlayMode?: (mode: OverlayMode) => void;
}

export function MobileToolbar({ onOpenPanel, overlayMode = 'none', setOverlayMode }: MobileToolbarProps) {
  const { state, setTool } = useGame();
  const { selectedTool, stats } = state;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleCategoryClick = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const handleToolSelect = (tool: Tool, closeMenu: boolean = false) => {
    // If the tool is already selected and it's not 'select', toggle back to select
    if (selectedTool === tool && tool !== 'select') {
      setTool('select');
    } else {
      setTool(tool);
    }
    setExpandedCategory(null);
    if (closeMenu) {
      setShowMenu(false);
    }
  };

  return (
    <>
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <Card className="rounded-none border-x-0 border-b-0 bg-card/95 backdrop-blur-sm">
          {/* Selected tool info - now above the toolbar */}
          {selectedTool && TOOL_INFO[selectedTool] && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-sidebar-border/50 bg-secondary/30 text-xs">
              <span className="text-foreground font-medium">
                {TOOL_INFO[selectedTool].name}
              </span>
              {TOOL_INFO[selectedTool].cost > 0 && (
                <span className={`font-mono ${stats.money >= TOOL_INFO[selectedTool].cost ? 'text-green-400' : 'text-red-400'}`}>
                  ${TOOL_INFO[selectedTool].cost}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-around px-2 py-2 gap-1">
            {/* Quick access tools */}
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('select')}
            >
              {QuickToolIcons.select}
            </Button>

            <Button
              variant={selectedTool === 'bulldoze' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11 text-red-400"
              onClick={() => handleToolSelect('bulldoze')}
            >
              {QuickToolIcons.bulldoze}
            </Button>

            <Button
              variant={selectedTool === 'road' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('road')}
            >
              {QuickToolIcons.road}
            </Button>

            <Button
              variant={selectedTool === 'tree' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('tree')}
            >
              {QuickToolIcons.tree}
            </Button>

            {/* 區域規劃按鈕 */}
            <Button
              variant={selectedTool === 'zone_living' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('zone_living')}
            >
              {QuickToolIcons.zone_living}
            </Button>

            <Button
              variant={selectedTool === 'zone_market' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('zone_market')}
            >
              {QuickToolIcons.zone_market}
            </Button>

            <Button
              variant={selectedTool === 'zone_farming' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleToolSelect('zone_farming')}
            >
              {QuickToolIcons.zone_farming}
            </Button>

            {/* More tools menu button */}
            <Button
              variant={showMenu ? 'default' : 'secondary'}
              size="icon"
              className="h-11 w-11"
              onClick={() => setShowMenu(!showMenu)}
            >
              {showMenu ? (
                <CloseIcon size={20} />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Expanded Tool Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <Card
            className="absolute bottom-20 left-2 right-2 max-h-[70vh] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 小鎮管理 */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                小鎮管理
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('budget'); setShowMenu(false); }}
                >
                  賬簿
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('statistics'); setShowMenu(false); }}
                >
                  數據
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('advisors'); setShowMenu(false); }}
                >
                  顧問
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('settings'); setShowMenu(false); }}
                >
                  設定
                </Button>
              </div>
            </div>

            {/* Overlay Toggle Section */}
            {setOverlayMode && (
              <div className="p-3 border-b border-border flex-shrink-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  地圖視圖
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={overlayMode === 'none' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-10 w-full text-xs"
                    onClick={() => setOverlayMode('none')}
                  >
                    全覽
                  </Button>
                  <Button
                    variant={overlayMode === 'power' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'power' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                    onClick={() => setOverlayMode('power')}
                  >
                    燈火
                  </Button>
                  <Button
                    variant={overlayMode === 'water' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'water' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    onClick={() => setOverlayMode('water')}
                  >
                    井水
                  </Button>
                  <Button
                    variant={overlayMode === 'health' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'health' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => setOverlayMode('health')}
                  >
                    醫療
                  </Button>
                  <Button
                    variant={overlayMode === 'education' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'education' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
                    onClick={() => setOverlayMode('education')}
                  >
                    文教
                  </Button>
                  <Button
                    variant={overlayMode === 'subway' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'subway' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                    onClick={() => setOverlayMode('subway')}
                  >
                    暗渠
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-2 space-y-1 pb-4">
                {/* Category buttons */}
                {Object.entries(toolCategories).map(([category, tools]) => (
                  <div key={category}>
                    <Button
                      variant={expandedCategory === category ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <span className="flex-1 text-left font-medium">{category}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </Button>

                    {/* Expanded tools */}
                    {expandedCategory === category && (
                      <div className="pl-4 py-1 space-y-0.5">
                        {tools.map((tool) => {
                          const info = TOOL_INFO[tool];
                          if (!info) return null;
                          const canAfford = stats.money >= info.cost;

                          return (
                            <Button
                              key={tool}
                              variant={selectedTool === tool ? 'default' : 'ghost'}
                              className="w-full justify-start gap-3 h-11"
                              disabled={!canAfford && info.cost > 0}
                              onClick={() => handleToolSelect(tool, true)}
                            >
                              <span className="flex-1 text-left">{info.name}</span>
                              {info.cost > 0 && (
                                <span className={`text-xs font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                  ${info.cost}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default MobileToolbar;
