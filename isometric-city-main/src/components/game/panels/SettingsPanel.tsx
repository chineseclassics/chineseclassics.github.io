'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGame, DayNightMode } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SavedCityMeta } from '@/types/game';

// Format a date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Format population for display
function formatPopulation(pop: number): string {
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
  return pop.toString();
}

// Format money for display
function formatMoney(money: number): string {
  if (money >= 1000000) return `$${(money / 1000000).toFixed(1)}M`;
  if (money >= 1000) return `$${(money / 1000).toFixed(1)}K`;
  return `$${money}`;
}

export function SettingsPanel() {
  const { state, setActivePanel, setDisastersEnabled, newGame, loadState, exportState, dayNightMode, setDayNightMode, getSavedCityInfo, restoreSavedCity, clearSavedCity, savedCities, saveCity, loadSavedCity, deleteSavedCity, renameSavedCity } = useGame();
  const { disastersEnabled, cityName, gridSize, id: currentCityId } = state;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newCityName, setNewCityName] = useState(cityName);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [saveCitySuccess, setSaveCitySuccess] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<SavedCityMeta | null>(null);
  const [cityToRename, setCityToRename] = useState<SavedCityMeta | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importValue, setImportValue] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  const [importError, setImportError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [savedCityInfo, setSavedCityInfo] = useState(getSavedCityInfo());
  
  // Refresh saved city info when panel opens
  React.useEffect(() => {
    setSavedCityInfo(getSavedCityInfo());
  }, [getSavedCityInfo]);
  
  
  const handleCopyExport = async () => {
    const exported = exportState();
    await navigator.clipboard.writeText(exported);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };
  
  const handleImport = () => {
    setImportError(false);
    setImportSuccess(false);
    if (importValue.trim()) {
      const success = loadState(importValue.trim());
      if (success) {
        setImportSuccess(true);
        setImportValue('');
        setTimeout(() => setImportSuccess(false), 2000);
      } else {
        setImportError(true);
      }
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
      <DialogContent className="max-w-[400px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Game Settings</div>
            
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex-1 min-w-0">
                <Label>Disasters</Label>
                <p className="text-muted-foreground text-xs">Enable random fires and disasters</p>
              </div>
              <Switch
                checked={disastersEnabled}
                onCheckedChange={setDisastersEnabled}
              />
            </div>
            
          </div>
          
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">City Information</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>City Name</span>
                <span className="text-foreground">{cityName}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Grid Size</span>
                <span className="text-foreground">{gridSize} x {gridSize}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Auto-Save</span>
                <span className="text-green-400">Enabled</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Saved Cities Section */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Saved Cities</div>
            <p className="text-muted-foreground text-xs mb-3">Save multiple cities and switch between them</p>
            
            {/* Save Current City Button */}
            <Button
              variant="default"
              className="w-full mb-3"
              onClick={() => {
                saveCity();
                setSaveCitySuccess(true);
                setTimeout(() => setSaveCitySuccess(false), 2000);
              }}
            >
              {saveCitySuccess ? '✓ City Saved!' : `Save "${cityName}"`}
            </Button>
            
            {/* Saved Cities List */}
            {savedCities.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {savedCities.map((city) => (
                  <div
                    key={city.id}
                    className={`p-3 rounded-md border transition-colors ${
                      city.id === currentCityId
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    {cityToRename?.id === city.id ? (
                      <div className="space-y-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          placeholder="New city name..."
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setCityToRename(null);
                              setRenameValue('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              if (renameValue.trim()) {
                                renameSavedCity(city.id, renameValue.trim());
                              }
                              setCityToRename(null);
                              setRenameValue('');
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : cityToDelete?.id === city.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground text-center">Delete this city?</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setCityToDelete(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              deleteSavedCity(city.id);
                              setCityToDelete(null);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-sm truncate flex-1">
                            {city.cityName}
                            {city.id === currentCityId && (
                              <span className="ml-2 text-[10px] text-primary">(current)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>Pop: {formatPopulation(city.population)}</span>
                          <span>{formatMoney(city.money)}</span>
                          <span>{city.gridSize}×{city.gridSize}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-2">
                          Saved {formatDate(city.savedAt)}
                        </div>
                        <div className="flex gap-2">
                          {city.id !== currentCityId && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={() => {
                                loadSavedCity(city.id);
                                setActivePanel('none');
                              }}
                            >
                              Load
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setCityToRename(city);
                              setRenameValue(city.cityName);
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setCityToDelete(city)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs text-center py-3 border border-dashed rounded-md">
                No saved cities yet.
              </p>
            )}
          </div>
          
          {/* Restore saved city button - shown if there's a saved city from before viewing a shared city */}
          {savedCityInfo && (
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  restoreSavedCity();
                  setSavedCityInfo(null);
                  setActivePanel('none');
                }}
              >
                Restore {savedCityInfo.cityName}
              </Button>
              <p className="text-muted-foreground text-xs text-center">
                Your city was saved before viewing a shared city
              </p>
              <Separator />
            </div>
          )}
          
          {!showNewGameConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowNewGameConfirm(true)}
            >
              Start New Game
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm text-center">Are you sure? This will reset all progress.</p>
              <Input
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="New city name..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewGameConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    newGame(newCityName || '太虛小鎮', gridSize);
                    setActivePanel('none');
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Export Game</div>
            <p className="text-muted-foreground text-xs mb-2">Copy your game state to share or backup</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyExport}
            >
              {exportCopied ? '✓ Copied!' : 'Copy Game State'}
            </Button>
          </div>
          
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Import Game</div>
            <p className="text-muted-foreground text-xs mb-2">Paste a game state to load it</p>
            <textarea
              className="w-full h-20 bg-background border border-border rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Paste game state here..."
              value={importValue}
              onChange={(e) => {
                setImportValue(e.target.value);
                setImportError(false);
                setImportSuccess(false);
              }}
            />
            {importError && (
              <p className="text-red-400 text-xs mt-1">Invalid game state. Please check and try again.</p>
            )}
            {importSuccess && (
              <p className="text-green-400 text-xs mt-1">Game loaded successfully!</p>
            )}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={handleImport}
              disabled={!importValue.trim()}
            >
              Load Game State
            </Button>
          </div>
          
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Developer Tools</div>
            <div>
              <Label>Day/Night Mode</Label>
              <p className="text-muted-foreground text-xs mb-2">Override the time-of-day appearance without affecting time progression</p>
              <div className="flex rounded-md border border-border overflow-hidden">
                {(['auto', 'day', 'night'] as DayNightMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDayNightMode(mode)}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      dayNightMode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'auto' && 'Auto'}
                    {mode === 'day' && 'Day'}
                    {mode === 'night' && 'Night'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
