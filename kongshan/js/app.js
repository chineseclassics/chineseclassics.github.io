// =====================================================
// 空山應用主入口
// =====================================================

import { SUPABASE_CONFIG, APP_CONFIG, DEV_CONFIG, validateConfig } from './config.js';
import { PoemManager } from './core/poem-manager.js';
import { AudioEngine } from './core/audio-engine.js';
import { BackgroundRenderer } from './core/background-renderer.js';
import { AtmosphereManager } from './core/atmosphere-manager.js';
import { SoundMixer } from './features/sound-mixer.js';
import { renderPoemList, renderVerticalPoem } from './features/poem-display.js';
import { renderSoundControls } from './ui/sound-controls-ui.js';
import { showAtmosphereEditor } from './ui/atmosphere-editor-ui.js';

// 全局狀態
const AppState = {
  supabase: null,
  currentPoem: null,
  currentAtmosphere: null,
  audioEngine: null,
  soundMixer: null,
  backgroundRenderer: null,
  poemManager: null,
  atmosphereManager: null,
  initialized: false,
  userId: null
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

        await ensureAnonymousSession();
      }
    } else {
      console.warn('⚠️ Supabase 未配置，將使用模擬數據');
    }
    
      // 3. 初始化核心模塊
      AppState.poemManager = new PoemManager(AppState.supabase);
      AppState.atmosphereManager = new AtmosphereManager(AppState.supabase);
      AppState.audioEngine = new AudioEngine();
      AppState.soundMixer = new SoundMixer(AppState.audioEngine);
      
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

async function ensureAnonymousSession() {
  if (!AppState.supabase) {
    return;
  }

  try {
    const { data: sessionData, error: sessionError } = await AppState.supabase.auth.getSession();
    if (!sessionError && sessionData?.session?.user) {
      AppState.userId = sessionData.session.user.id;
    }

    if (!sessionData?.session) {
      if (typeof AppState.supabase.auth.signInAnonymously !== 'function') {
        console.warn('當前 Supabase 客戶端不支援匿名登入 API，請確認版本或改用其他登入方式。');
        return;
      }
      const { data, error } = await AppState.supabase.auth.signInAnonymously();
      if (error) {
        throw error;
      }
      if (data?.user?.id) {
        AppState.userId = data.user.id;
      }
    }

    AppState.supabase.auth.onAuthStateChange((_event, session) => {
      AppState.userId = session?.user?.id || null;
    });
  } catch (error) {
    console.error('匿名登入初始化失敗:', error);
  }
}

async function getCurrentUserId() {
  if (AppState.userId) {
    return AppState.userId;
  }

  if (!AppState.supabase) {
    return null;
  }

  try {
    const { data, error } = await AppState.supabase.auth.getUser();
    if (error || !data?.user) {
      return null;
    }
    AppState.userId = data.user.id;
    return data.user.id;
  } catch (error) {
    console.warn('取得使用者資訊失敗:', error);
    return null;
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
      
      // 加載聲色意境
      await loadAtmosphere(poemId);
    }
  } catch (error) {
    console.error('加載詩歌失敗:', error);
  }
}

/**
 * 處理聲色意境保存
 */
async function handleAtmosphereSave(atmosphereData) {
  try {
    console.log('保存聲色意境:', atmosphereData);
    
    if (!AppState.supabase) {
      alert('未連接到數據庫，無法保存');
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      alert('目前尚未取得使用者身份，請稍後重試。');
      return;
    }

    // 插入到數據庫
    const { data, error } = await AppState.supabase
      .from('poem_atmospheres')
      .insert([{
        poem_id: atmosphereData.poem_id,
        name: atmosphereData.name,
        description: atmosphereData.description,
        sound_combination: atmosphereData.sound_combination,
        background_config: atmosphereData.background_config,
        source: atmosphereData.source,
        status: atmosphereData.status,
        is_ai_generated: atmosphereData.is_ai_generated,
        created_by: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('保存失敗:', error);
      alert('保存失敗：' + error.message);
      return;
    }

    console.log('保存成功:', data);
    
    // 重新加載當前詩歌的聲色意境
    await loadAtmosphere(atmosphereData.poem_id);
  } catch (error) {
    console.error('保存聲色意境異常:', error);
    alert('保存失敗，請稍後重試');
  }
}

/**
 * 加載詩歌的聲色意境
 */
async function loadAtmosphere(poemId) {
  const soundControlsEl = document.getElementById('sound-controls');
  if (!soundControlsEl) return;

  // 清空現有的音效
  AppState.soundMixer.clear();

  try {
    // 從數據庫加載默認聲色意境
    const atmosphere = await AppState.atmosphereManager.loadDefaultAtmosphere(poemId);
    
    if (atmosphere) {
      AppState.currentAtmosphere = atmosphere;
      
      // 獲取聲色意境的音效列表
      const sounds = await AppState.atmosphereManager.getAtmosphereSounds(atmosphere);
      
      console.log(`📀 加載聲色意境: ${atmosphere.name}，包含 ${sounds.length} 個音效`);
      
      if (sounds.length > 0) {
        // 添加音效到混音器
        for (const sound of sounds) {
          await AppState.soundMixer.addTrack(sound);
        }
        
        // 不顯示音效控制面板（用戶要求隱藏）
        soundControlsEl.style.display = 'none';
        
        // 應用背景配置
        if (atmosphere.background_config && AppState.backgroundRenderer) {
          AppState.backgroundRenderer.setConfig(atmosphere.background_config);
        }
      } else {
        console.warn('聲色意境沒有音效');
        soundControlsEl.style.display = 'none';
      }
    } else {
      console.log('沒有找到默認聲色意境');
      soundControlsEl.style.display = 'none';
    }
  } catch (error) {
    console.error('加載聲色意境失敗:', error);
    soundControlsEl.style.display = 'none';
  }
}

// 暴露函數到全局狀態（供其他模塊調用）
AppState.showPoemViewer = showPoemViewerScreen;
AppState.showPoemList = showPoemListScreen;

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 設置返回按鈕和編輯按鈕事件監聽
document.addEventListener('DOMContentLoaded', () => {
  const backButton = document.getElementById('back-to-list-btn');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showPoemListScreen();
    });
  }

  const editButton = document.getElementById('edit-atmosphere-btn');
  if (editButton) {
    editButton.addEventListener('click', () => {
      if (AppState.currentPoem) {
        // 如果有預覽數據，恢復編輯狀態
        const previewData = AppState.previewAtmosphereData;
        showAtmosphereEditor(
          AppState.currentPoem,
          previewData || AppState.currentAtmosphere,
          handleAtmosphereSave
        );
      }
    });
  }
});

// 導出全局狀態（用於調試）
window.AppState = AppState;

// 導出 renderSoundControls 供編輯器使用
window.renderSoundControls = renderSoundControls;

