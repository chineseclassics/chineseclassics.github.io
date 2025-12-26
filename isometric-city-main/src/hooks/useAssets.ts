// 太虛幻境 - 資產加載鉤子
// 從 assets.json 動態加載資產配置

import { useState, useEffect, useCallback } from 'react';
import { AssetConfig, AssetCategory, AssetStyle, ASSET_CATEGORIES, ASSET_STYLES } from '@/types/assets';

interface AssetsState {
  assets: AssetConfig[];
  categories: Record<AssetCategory, string>;
  styles: Record<AssetStyle, string>;
  loading: boolean;
  error: string | null;
}

interface UseAssetsReturn extends AssetsState {
  /** 重新加載資產 */
  reload: () => Promise<void>;
  /** 按分類獲取資產 */
  getByCategory: (category: AssetCategory) => AssetConfig[];
  /** 按風格獲取資產 */
  getByStyle: (style: AssetStyle) => AssetConfig[];
  /** 按 ID 獲取資產 */
  getById: (id: string) => AssetConfig | undefined;
  /** 檢查資產是否存在 */
  hasAsset: (id: string) => boolean;
}

/**
 * 資產加載鉤子
 * 從 /assets/assets.json 動態加載資產配置
 */
export function useAssets(): UseAssetsReturn {
  const [state, setState] = useState<AssetsState>({
    assets: [],
    categories: ASSET_CATEGORIES,
    styles: ASSET_STYLES,
    loading: true,
    error: null,
  });

  const loadAssets = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/assets/assets.json');
      if (!response.ok) {
        throw new Error(`Failed to load assets: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState({
        assets: data.assets || [],
        categories: data.categories || ASSET_CATEGORIES,
        styles: data.styles || ASSET_STYLES,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('加載資產失敗:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '未知錯誤',
      }));
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const getByCategory = useCallback((category: AssetCategory) => {
    return state.assets.filter(asset => asset.category === category);
  }, [state.assets]);

  const getByStyle = useCallback((style: AssetStyle) => {
    return state.assets.filter(asset => asset.style === style);
  }, [state.assets]);

  const getById = useCallback((id: string) => {
    return state.assets.find(asset => asset.id === id);
  }, [state.assets]);

  const hasAsset = useCallback((id: string) => {
    return state.assets.some(asset => asset.id === id);
  }, [state.assets]);

  return {
    ...state,
    reload: loadAssets,
    getByCategory,
    getByStyle,
    getById,
    hasAsset,
  };
}

/**
 * 獲取資產的工具信息（用於工具欄顯示）
 */
export function getAssetToolInfo(asset: AssetConfig) {
  return {
    name: asset.name,
    cost: asset.cost,
    description: asset.description || '',
    size: asset.gridSize.width,
    appUrl: asset.appUrl,
    vibePrompt: asset.vibePrompt,
  };
}

/**
 * 獲取資產的圖片路徑
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
 * 預加載資產圖片
 */
export async function preloadAssetImage(assetId: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = getAssetImagePath(assetId);
  });
}
