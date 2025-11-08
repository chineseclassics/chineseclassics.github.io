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
  userId: null,
  authStatus: 'initializing',
  authUser: null,
  authMessage: '',
  authSubscription: null,
  visitorCount: null,
  authSubtitleDefault: '',
  activeScreen: 'loading'
};

/**
 * 更新太虛幻境切換器可見性
 */
function updateAppSwitcherVisibility() {
  const isAuthenticated = AppState.authStatus === 'google' || AppState.authStatus === 'other';
  const shouldShow = isAuthenticated && AppState.activeScreen === 'list';
  window.__taixuDesiredVisibility = shouldShow;

  if (typeof window.setAppSwitcherVisibility === 'function') {
    window.setAppSwitcherVisibility(shouldShow);
  }
}

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
        AppState.authStatus = 'connecting';
        updateAuthUI();
        setupAuthListener();
        await initializeAuthSession();
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

async function initializeAuthSession() {
  if (!AppState.supabase) {
    return;
  }

  try {
    AppState.authStatus = 'connecting';
    updateAuthUI();

    const { data, error } = await AppState.supabase.auth.getSession();
    if (error) {
      throw error;
    }

    const user = data?.session?.user || null;
    syncUserState(user);

    if (!user) {
      AppState.authStatus = 'signed_out';
      AppState.authMessage = '';
      updateAuthUI();
    }
  } catch (error) {
    console.error('初始化登入狀態失敗:', error);
    AppState.authMessage = `初始化登入狀態失敗：${error.message || '請稍後再試'}`;
    AppState.authStatus = 'error';
    updateAuthUI();
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
    if (!AppState.authUser || AppState.authUser.id !== data.user.id) {
      syncUserState(data.user);
    }
    return data.user.id;
  } catch (error) {
    console.warn('取得使用者資訊失敗:', error);
    return null;
  }
}

function setupAuthListener() {
  if (!AppState.supabase || AppState.authSubscription) {
    return;
  }

  const { data } = AppState.supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    syncUserState(user);
  });

  if (data?.subscription) {
    AppState.authSubscription = data.subscription;
  }
}

function syncUserState(user) {
  if (!user) {
    AppState.userId = null;
    AppState.authUser = null;
    AppState.visitorCount = null;
    if (!AppState.supabase) {
      AppState.authStatus = 'initializing';
    } else if (AppState.authStatus !== 'connecting') {
      AppState.authStatus = 'signed_out';
    }
    updateAuthUI();
    return;
  }

  const provider = user.app_metadata?.provider || 'unknown';
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.user_metadata?.email || user.email || '';

  AppState.userId = user.id;
  AppState.authUser = {
    id: user.id,
    provider,
    fullName,
    email,
    avatarUrl: user.user_metadata?.avatar_url || ''
  };
  AppState.authMessage = '';

  if (provider === 'google') {
    AppState.authStatus = 'google';
    registerTraveler(user).catch(err => {
      console.warn('旅人統計更新時發生錯誤:', err);
    });
  } else {
    AppState.authStatus = 'other';
    AppState.visitorCount = null;
    updateVisitorMessage();
  }

  updateAuthUI();
}

function getAuthElements() {
  return {
    overlay: document.getElementById('auth-overlay'),
    subtitle: document.querySelector('#auth-overlay .auth-subtitle'),
    googleBtn: document.getElementById('google-login-btn'),
    visitorMessage: document.getElementById('visitor-message'),
    visitorText: document.getElementById('visitor-text'),
    signOutBtn: document.getElementById('sign-out-btn')
  };
}

function updateAuthUI() {
  const { overlay, subtitle, googleBtn, signOutBtn } = getAuthElements();
  if (!overlay || !googleBtn || !signOutBtn) {
    return;
  }

  const isAuthenticated = AppState.authStatus === 'google' || AppState.authStatus === 'other';

  overlay.classList.toggle('hidden', isAuthenticated ? true : false);

  if (subtitle) {
    if (AppState.authStatus === 'error' && AppState.authMessage) {
      subtitle.textContent = AppState.authMessage;
    } else {
      subtitle.textContent = AppState.authSubtitleDefault || '以聲色意境，迎接每一位旅人';
    }
  }

  let googleDisabled = false;

  switch (AppState.authStatus) {
    case 'initializing':
    case 'connecting':
      googleDisabled = true;
      break;
    case 'signed_out':
    case 'error':
      googleDisabled = false;
      break;
    default:
      googleDisabled = !AppState.supabase;
      break;
  }

  googleBtn.disabled = googleDisabled || !AppState.supabase;
  googleBtn.setAttribute('aria-disabled', googleBtn.disabled ? 'true' : 'false');

  if (isAuthenticated) {
    signOutBtn.hidden = false;
    signOutBtn.disabled = false;
  } else {
    signOutBtn.hidden = true;
    signOutBtn.disabled = true;
  }

  updateVisitorMessage();
  updateAppSwitcherVisibility();
}

function setupAuthUI() {
  const { googleBtn, signOutBtn, subtitle } = getAuthElements();
  if (!googleBtn || !signOutBtn) {
    return;
  }

  if (!AppState.authSubtitleDefault && subtitle) {
    AppState.authSubtitleDefault = subtitle.textContent || '';
  }

  googleBtn.addEventListener('click', handleGoogleLogin);
  signOutBtn.addEventListener('click', handleSignOut);

  updateAuthUI();
}

function updateVisitorMessage() {
  const { visitorMessage, visitorText, signOutBtn } = getAuthElements();
  if (!visitorMessage || !visitorText || !signOutBtn) {
    return;
  }

  const isAuthenticated = AppState.authStatus === 'google' || AppState.authStatus === 'other';

  if (!isAuthenticated || !AppState.authUser) {
    visitorMessage.hidden = true;
    return;
  }

  const name = AppState.authUser.fullName || AppState.authUser.email || '旅人';
  const count = AppState.visitorCount;
  const countText = count ? `你是第 ${count} 位進入空山的旅人` : '歡迎來到空山';

  visitorText.textContent = `${name}，${countText}`;
  visitorMessage.hidden = false;
}

async function registerTraveler(user) {
  if (!AppState.supabase || !user) {
    return;
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '旅人';
  const email = user.email || user.user_metadata?.email || null;

  const payload = {
    user_id: user.id,
    display_name: displayName,
    email
  };

  const { error } = await AppState.supabase
    .from('travelers')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.warn('旅人資料更新失敗:', error);
  }

  const { count, error: countError } = await AppState.supabase
    .from('travelers')
    .select('user_id', { count: 'exact', head: true });

  if (!countError && typeof count === 'number') {
    AppState.visitorCount = count;
  } else {
    AppState.visitorCount = null;
  }

  updateVisitorMessage();
}

function computeRedirectUrl() {
  const { origin, pathname } = window.location;
  let normalisedPath = pathname;

  if (!normalisedPath.endsWith('/') && !normalisedPath.endsWith('.html')) {
    normalisedPath = `${normalisedPath}/`;
  }

  if (normalisedPath.endsWith('/')) {
    normalisedPath = `${normalisedPath}index.html`;
  }

  return `${origin}${normalisedPath}`;
}

function handleGoogleLogin() {
  if (!AppState.supabase) {
    return;
  }

  AppState.authMessage = '';
  if (AppState.authStatus !== 'google') {
    AppState.authStatus = 'connecting';
  }
  updateAuthUI();

  const redirectTo = computeRedirectUrl();

  AppState.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  }).catch(error => {
    console.error('Google 登入失敗:', error);
    AppState.authMessage = `Google 登入失敗：${error.message || '請稍後再試'}`;
    if (!AppState.authUser) {
      AppState.authStatus = 'error';
    }
    updateAuthUI();
  });
}

async function handleSignOut() {
  if (!AppState.supabase) {
    return;
  }

  AppState.authMessage = '正在登出...';
  AppState.authStatus = 'connecting';
  updateAuthUI();

  try {
    await AppState.supabase.auth.signOut();
    AppState.authMessage = '';
  } catch (error) {
    console.error('登出失敗:', error);
    AppState.authMessage = `登出失敗：${error.message || '請稍後再試'}`;
    if (!AppState.authUser) {
      AppState.authStatus = 'error';
    }
    updateAuthUI();
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
  AppState.activeScreen = 'list';
  updateAppSwitcherVisibility();
  
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
  AppState.activeScreen = 'viewer';
  updateAppSwitcherVisibility();
  
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
AppState.handleGoogleLogin = handleGoogleLogin;
AppState.handleSignOut = handleSignOut;

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 設置返回按鈕和編輯按鈕事件監聽
document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();

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

