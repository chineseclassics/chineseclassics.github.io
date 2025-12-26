// 太虛資產管理 API
// 處理資產的增刪改查操作

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AssetConfig, BuiltinAssetsFile, AssetCategory, AssetStyle } from '@/types/assets';

// 配置文件路徑（資產現在按分類存儲，不再使用 buildings 目錄）
const ASSETS_BASE_DIR = path.join(process.cwd(), 'public', 'assets');
const CONFIG_FILE = path.join(process.cwd(), 'public', 'assets', 'assets.json');

// 默認配置文件內容
const DEFAULT_CONFIG: BuiltinAssetsFile = {
  version: 2,
  categories: {
    nature: '自然',
    road: '道路',
    garden: '園林',
    fangshi: '坊市',
    farming: '農事',
    props: '點綴',
  },
  styles: {
    hand_drawn: '手繪風',
    ink_wash: '水墨風',
    pixel: '像素風',
    realistic: '寫實風',
    minimalist: '簡約風',
  },
  assets: [],
};

/**
 * 讀取配置文件
 */
async function readConfig(): Promise<BuiltinAssetsFile> {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configData);
    // 確保版本兼容
    if (config.version < 2) {
      return { ...DEFAULT_CONFIG, assets: config.assets || [] };
    }
    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 寫入配置文件
 */
async function writeConfig(config: BuiltinAssetsFile): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * GET: 獲取資產列表
 * 支持查詢參數：
 * - category: 按分類篩選
 * - style: 按風格篩選
 * - id: 獲取單個資產
 */
export async function GET(request: NextRequest) {
  try {
    const config = await readConfig();
    const { searchParams } = new URL(request.url);
    
    const id = searchParams.get('id');
    const category = searchParams.get('category') as AssetCategory | null;
    const style = searchParams.get('style') as AssetStyle | null;

    // 如果指定了 ID，返回單個資產
    if (id) {
      const asset = config.assets.find(a => a.id === id);
      if (!asset) {
        return NextResponse.json(
          { error: '資產不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(asset);
    }

    // 篩選資產
    let filteredAssets = config.assets;
    
    if (category) {
      filteredAssets = filteredAssets.filter(a => a.category === category);
    }
    
    if (style) {
      filteredAssets = filteredAssets.filter(a => a.style === style);
    }

    return NextResponse.json({
      categories: config.categories,
      styles: config.styles,
      promptTemplates: config.promptTemplates, // 返回 Prompt 模板
      assets: filteredAssets,
      total: filteredAssets.length,
    });
  } catch (error) {
    console.error('讀取資產配置失敗:', error);
    return NextResponse.json(
      { error: '讀取配置失敗' },
      { status: 500 }
    );
  }
}

// 精靈圖存儲路徑（現在也按分類存儲）
const SPRITES_DIR = ASSETS_BASE_DIR;

/**
 * POST: 創建新資產
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      category, 
      style = 'hand_drawn',
      gridSize, 
      cost = 100,
      description = '',
      offsets,
      scale,
      renderOffset,     // 編輯器設定的渲染位移
      renderScale,      // 編輯器設定的渲染縮放
      appUrl,
      vibePrompt,
      generationPrompt, // AI 生成 Prompt
      imageData,
      animation,        // 動態資產配置
      spriteSheetData,  // 精靈圖 base64 數據
    } = body;

    // 驗證必要欄位
    if (!id || !name || !category || !gridSize) {
      return NextResponse.json(
        { error: '缺少必要欄位：id, name, category, gridSize' },
        { status: 400 }
      );
    }

    // 驗證 ID 格式（只允許小寫英文、數字、下劃線，必須以字母開頭）
    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
      return NextResponse.json(
        { error: 'ID 格式不正確，只能使用小寫英文、數字和下劃線，且必須以字母開頭' },
        { status: 400 }
      );
    }

    // 讀取現有配置
    const config = await readConfig();

    // 檢查是否已存在同 ID 的資產
    if (config.assets.some(a => a.id === id)) {
      return NextResponse.json(
        { error: `資產 ID "${id}" 已存在` },
        { status: 409 }
      );
    }

    // 如果是動態資產，保存精靈圖（只有當提供了新的 base64 數據時）
    if (animation && spriteSheetData && spriteSheetData.startsWith('data:')) {
      // 使用分類目錄保存精靈圖
      const categoryDir = path.join(SPRITES_DIR, category);
      await fs.mkdir(categoryDir, { recursive: true });
      const base64Data = spriteSheetData.replace(/^data:image\/[^;]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const spritePath = path.join(categoryDir, `${id}_sprite.png`);
      await fs.writeFile(spritePath, imageBuffer);
      console.log(`[API] 已保存精靈圖: ${spritePath} (${imageBuffer.length} bytes)`);
    }
    // 如果是靜態資產，保存圖片（只有當提供了新的 base64 數據時）
    else if (imageData && imageData.startsWith('data:')) {
      // 使用分類目錄保存圖片
      const categoryDir = path.join(ASSETS_BASE_DIR, category);
      await fs.mkdir(categoryDir, { recursive: true });
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imagePath = path.join(categoryDir, `${id}.png`);
      await fs.writeFile(imagePath, imageBuffer);
      console.log(`[API] 已保存圖片: ${imagePath} (${imageBuffer.length} bytes)`);
    }

    // 創建新資產
    const newAsset: AssetConfig = {
      id,
      name,
      category,
      style,
      gridSize,
      cost,
      description,
      ...(offsets && { offsets }),
      ...(scale && { scale }),
      ...(renderOffset && { renderOffset }),
      ...(renderScale !== undefined && { renderScale }),
      ...(appUrl && { appUrl }),
      ...(vibePrompt && { vibePrompt }),
      ...(generationPrompt && { generationPrompt }),
      ...(animation && { animation }),
    };

    config.assets.push(newAsset);
    await writeConfig(config);

    return NextResponse.json({
      success: true,
      message: `資產 "${name}" (${id}) 已創建`,
      asset: newAsset,
      imagePath: animation ? `/assets/${category}/${id}_sprite.png` : `/assets/${category}/${id}.png`,
    });

  } catch (error) {
    console.error('創建資產失敗:', error);
    return NextResponse.json(
      { error: '創建資產失敗' },
      { status: 500 }
    );
  }
}

/**
 * PUT: 更新資產
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id,
      name, 
      category, 
      style,
      gridSize, 
      cost,
      description,
      offsets,
      scale,
      renderOffset,     // 編輯器設定的渲染位移
      renderScale,      // 編輯器設定的渲染縮放
      appUrl,
      vibePrompt,
      generationPrompt, // AI 生成 Prompt
      imageData,
      animation,        // 動態資產配置
      spriteSheetData,  // 精靈圖 base64 數據
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少資產 ID' },
        { status: 400 }
      );
    }

    const config = await readConfig();
    const assetIndex = config.assets.findIndex(a => a.id === id);

    if (assetIndex < 0) {
      return NextResponse.json(
        { error: `資產 "${id}" 不存在` },
        { status: 404 }
      );
    }

    // 獲取現有資產和更新後的 category
    const existingAsset = config.assets[assetIndex];
    const finalCategory = category !== undefined ? category : existingAsset.category;
    const categoryChanged = category !== undefined && category !== existingAsset.category;
    
    // 如果是動態資產，保存精靈圖（只有當提供了新的 base64 數據時）
    if (animation && spriteSheetData && spriteSheetData.startsWith('data:')) {
      // 如果分類改變了，先刪除舊的精靈圖
      if (categoryChanged && existingAsset.animation?.spriteSheet) {
        const oldSpritePath = existingAsset.animation.spriteSheet.includes('/')
          ? path.join(ASSETS_BASE_DIR, existingAsset.animation.spriteSheet)
          : path.join(ASSETS_BASE_DIR, existingAsset.category, existingAsset.animation.spriteSheet);
        try {
          await fs.unlink(oldSpritePath);
        } catch {
          // 舊文件可能不存在，忽略錯誤
        }
      }
      
      // 使用新的分類目錄保存精靈圖
      const categoryDir = path.join(SPRITES_DIR, finalCategory);
      await fs.mkdir(categoryDir, { recursive: true });
      const base64Data = spriteSheetData.replace(/^data:image\/[^;]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const spritePath = path.join(categoryDir, `${id}_sprite.png`);
      await fs.writeFile(spritePath, imageBuffer);
      console.log(`[API] 已更新精靈圖: ${spritePath} (${imageBuffer.length} bytes)`);
    }
    // 如果是靜態資產，保存圖片（只有當提供了新的 base64 數據時）
    else if (imageData && imageData.startsWith('data:')) {
      // 如果分類改變了，先刪除舊的圖片
      if (categoryChanged) {
        const oldImagePath = path.join(ASSETS_BASE_DIR, existingAsset.category, `${id}.png`);
        try {
          await fs.unlink(oldImagePath);
        } catch {
          // 舊文件可能不存在，忽略錯誤
        }
      }
      
      // 使用新的分類目錄保存圖片
      const categoryDir = path.join(ASSETS_BASE_DIR, finalCategory);
      await fs.mkdir(categoryDir, { recursive: true });
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imagePath = path.join(categoryDir, `${id}.png`);
      await fs.writeFile(imagePath, imageBuffer);
      console.log(`[API] 已更新圖片: ${imagePath} (${imageBuffer.length} bytes)`);
    }
    // 如果只是修改了分類但沒有上傳新圖片，需要移動現有文件
    else if (categoryChanged) {
      // 移動靜態圖片
      const oldImagePath = path.join(ASSETS_BASE_DIR, existingAsset.category, `${id}.png`);
      const newImagePath = path.join(ASSETS_BASE_DIR, finalCategory, `${id}.png`);
      try {
        await fs.mkdir(path.join(ASSETS_BASE_DIR, finalCategory), { recursive: true });
        await fs.rename(oldImagePath, newImagePath);
        console.log(`[API] 已移動圖片: ${oldImagePath} -> ${newImagePath}`);
      } catch (error) {
        // 文件可能不存在，忽略錯誤
        console.warn(`[API] 移動圖片失敗: ${error}`);
      }
      
      // 如果是動態資產，也移動 sprite 文件
      if (existingAsset.animation?.spriteSheet) {
        const oldSpritePath = existingAsset.animation.spriteSheet.includes('/')
          ? path.join(ASSETS_BASE_DIR, existingAsset.animation.spriteSheet)
          : path.join(ASSETS_BASE_DIR, existingAsset.category, existingAsset.animation.spriteSheet);
        const spriteFileName = existingAsset.animation.spriteSheet.includes('/')
          ? existingAsset.animation.spriteSheet.split('/').pop()!
          : existingAsset.animation.spriteSheet;
        const newSpritePath = path.join(ASSETS_BASE_DIR, finalCategory, spriteFileName);
        try {
          await fs.mkdir(path.join(ASSETS_BASE_DIR, finalCategory), { recursive: true });
          await fs.rename(oldSpritePath, newSpritePath);
          console.log(`[API] 已移動精靈圖: ${oldSpritePath} -> ${newSpritePath}`);
        } catch (error) {
          // 文件可能不存在，忽略錯誤
          console.warn(`[API] 移動精靈圖失敗: ${error}`);
        }
      }
    }

    // 更新資產配置（只更新提供的欄位）
    const updatedAsset: AssetConfig = {
      ...existingAsset,
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(style !== undefined && { style }),
      ...(gridSize !== undefined && { gridSize }),
      ...(cost !== undefined && { cost }),
      ...(description !== undefined && { description }),
      ...(offsets !== undefined && { offsets }),
      ...(scale !== undefined && { scale }),
      ...(renderOffset !== undefined && { renderOffset }),
      ...(renderScale !== undefined && { renderScale }),
      ...(appUrl !== undefined && { appUrl }),
      ...(vibePrompt !== undefined && { vibePrompt }),
      ...(generationPrompt !== undefined && { generationPrompt }),
      ...(animation !== undefined && { animation }),
    };

    // 如果從動態轉為靜態，移除 animation 配置
    if (animation === null) {
      delete updatedAsset.animation;
    }
    
    // 如果分類改變了且是動態資產，更新 spriteSheet 路徑
    if (categoryChanged && updatedAsset.animation?.spriteSheet) {
      const spriteFileName = updatedAsset.animation.spriteSheet.includes('/')
        ? updatedAsset.animation.spriteSheet.split('/').pop()!
        : updatedAsset.animation.spriteSheet;
      updatedAsset.animation.spriteSheet = `${finalCategory}/${spriteFileName}`;
    }

    config.assets[assetIndex] = updatedAsset;
    await writeConfig(config);

    return NextResponse.json({
      success: true,
      message: `資產 "${updatedAsset.name}" (${id}) 已更新`,
      asset: updatedAsset,
    });

  } catch (error) {
    console.error('更新資產失敗:', error);
    return NextResponse.json(
      { error: '更新資產失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 刪除資產
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteImage = searchParams.get('deleteImage') !== 'false'; // 默認刪除圖片

    if (!id) {
      return NextResponse.json(
        { error: '缺少資產 ID' },
        { status: 400 }
      );
    }

    const config = await readConfig();
    const assetIndex = config.assets.findIndex(a => a.id === id);

    if (assetIndex < 0) {
      return NextResponse.json(
        { error: `資產 "${id}" 不存在` },
        { status: 404 }
      );
    }

    const deletedAsset = config.assets[assetIndex];

    // 刪除圖片文件（如果需要，使用分類目錄）
    if (deleteImage) {
      const category = deletedAsset.category;
      
      // 刪除靜態圖片
      const imagePath = path.join(ASSETS_BASE_DIR, category, `${id}.png`);
      try {
        await fs.unlink(imagePath);
      } catch {
        // 圖片可能不存在，忽略錯誤
      }
      
      // 如果是動態資產，也刪除 sprite 文件
      if (deletedAsset.animation?.spriteSheet) {
        // spriteSheet 路徑可能包含分類目錄（如 "nature/willow_sprite.png"）
        // 或者只是文件名（如 "willow_sprite.png"）
        const spriteSheetPath = deletedAsset.animation.spriteSheet.includes('/')
          ? path.join(ASSETS_BASE_DIR, deletedAsset.animation.spriteSheet)
          : path.join(ASSETS_BASE_DIR, category, deletedAsset.animation.spriteSheet);
        try {
          await fs.unlink(spriteSheetPath);
        } catch {
          // sprite 文件可能不存在，忽略錯誤
        }
      }
    }

    // 從配置中移除
    config.assets.splice(assetIndex, 1);
    await writeConfig(config);

    return NextResponse.json({
      success: true,
      message: `資產 "${deletedAsset.name}" (${id}) 已刪除`,
    });

  } catch (error) {
    console.error('刪除資產失敗:', error);
    return NextResponse.json(
      { error: '刪除資產失敗' },
      { status: 500 }
    );
  }
}
