// =====================================================
// 空山應用主入口
// =====================================================

import { SUPABASE_CONFIG, APP_CONFIG, DEV_CONFIG, validateConfig } from './config.js';
import { PoemManager } from './core/poem-manager.js';
import { AudioEngine } from './core/audio-engine.js';
import { BackgroundRenderer } from './core/background-renderer.js';
import { renderPoemList, renderVerticalPoem } from './features/poem-display.js';

// 全局狀態
const AppState = {
  supabase: null,
  currentPoem: null,
  currentAtmosphere: null,
  audioEngine: null,
  backgroundRenderer: null,
  poemManager: null,
  initialized: false
};

/**
 * 初始化應用
 */
async function initializeApp() {
  try {
    console.log('🚀 空山應用初始化開始...');
    
    // 1. 驗證配置
    const configValid = validateConfig();
    if (!configValid && !DEV_CONFIG.mockData) {
      console.warn('⚠️ 配置未完成，部分功能可能無法使用');
    }
    
    // 2. 初始化 Supabase 客戶端（如果已配置）
    if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
      // 檢查 Supabase 庫是否已加載
      if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
        console.warn('⚠️ Supabase 庫未加載，將使用模擬數據');
      } else {
        const supabaseLib = supabase || window.supabase;
        AppState.supabase = supabaseLib.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey
        );
        console.log('✅ Supabase 客戶端初始化成功');
      }
    } else {
      console.warn('⚠️ Supabase 未配置，將使用模擬數據');
    }
    
    // 3. 初始化核心模塊
    AppState.poemManager = new PoemManager(AppState.supabase);
    AppState.audioEngine = new AudioEngine();
    
    // 初始化背景渲染器
    const canvas = document.getElementById('background-canvas');
    if (canvas) {
      AppState.backgroundRenderer = new BackgroundRenderer(canvas);
    }
    
    // 4. 隱藏加載畫面
    hideLoadingScreen();
    
    // 5. 顯示詩歌列表
    await showPoemListScreen();
    
    AppState.initialized = true;
    console.log('✅ 應用初始化完成');
    
  } catch (error) {
    console.error('❌ 應用初始化失敗:', error);
    showError('應用初始化失敗，請刷新頁面重試');
  }
}

/**
 * 隱藏加載畫面
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

/**
 * 顯示錯誤信息
 */
function showError(message) {
  console.error(message);
  // TODO: 實現錯誤提示 UI
}


/**
 * 顯示詩歌列表畫面
 */
async function showPoemListScreen() {
  const listScreen = document.getElementById('poem-list-screen');
  const viewerScreen = document.getElementById('poem-viewer-screen');
  
  if (listScreen) listScreen.style.display = 'flex'; // 使用 flex 以匹配 CSS
  if (viewerScreen) viewerScreen.style.display = 'none';
  
  // 加載詩歌列表
  await loadPoemList();
}

/**
 * 顯示詩歌欣賞畫面
 */
async function showPoemViewerScreen(poemId) {
  const listScreen = document.getElementById('poem-list-screen');
  const viewerScreen = document.getElementById('poem-viewer-screen');
  
  if (listScreen) listScreen.style.display = 'none';
  if (viewerScreen) viewerScreen.style.display = 'flex'; // 使用 flex 以匹配 CSS
  
  // 加載詩歌內容和聲色意境
  await loadPoem(poemId);
}

/**
 * 加載詩歌列表
 */
async function loadPoemList() {
  const poemList = document.getElementById('poem-list');
  if (!poemList) {
    console.error('找不到詩歌列表容器');
    return;
  }
  
  poemList.innerHTML = '<p class="placeholder-text">詩歌列表加載中...</p>';
  
  try {
    console.log('開始加載詩歌列表...');
    const poems = await AppState.poemManager.loadPoems();
    console.log('加載到的詩歌:', poems);
    renderPoemList(poemList, poems);
    console.log('詩歌列表渲染完成');
  } catch (error) {
    console.error('加載詩歌列表失敗:', error);
    poemList.innerHTML = '<p class="placeholder-text">加載失敗，請刷新頁面重試</p>';
  }
}

/**
 * 加載詩歌內容
 */
async function loadPoem(poemId) {
  const poemContent = document.getElementById('poem-content');
  if (!poemContent) return;
  
  try {
    const poem = await AppState.poemManager.loadPoemById(poemId);
    if (poem) {
      AppState.currentPoem = poem;
      renderVerticalPoem(poemContent, poem);
      
      // TODO: 加載聲色意境
      // await loadAtmospheres(poemId);
    }
  } catch (error) {
    console.error('加載詩歌失敗:', error);
  }
}

// 暴露函數到全局狀態（供其他模塊調用）
AppState.showPoemViewer = showPoemViewerScreen;

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 導出全局狀態（用於調試）
window.AppState = AppState;

