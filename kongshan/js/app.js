// =====================================================
// 空山應用主入口
// =====================================================

import { SUPABASE_CONFIG, APP_CONFIG, DEV_CONFIG, validateConfig } from './config.js';
import { PoemManager } from './core/poem-manager.js';
import { AudioEngine } from './core/audio-engine.js';
import { BackgroundRenderer } from './core/background-renderer.js';
import { AtmosphereManager } from './core/atmosphere-manager.js';
import { AdminManager } from './core/admin-manager.js';
import { NotificationManager } from './core/notification-manager.js';
import { SoundMixer } from './features/sound-mixer.js';
import { renderPoemList, renderVerticalPoem } from './features/poem-display.js';
import { renderSoundControls } from './ui/sound-controls-ui.js';
import { showAtmosphereEditor } from './ui/atmosphere-editor-ui.js';
import { AdminDrawer } from './ui/admin-drawer.js';
import { renderRecordingReview } from './ui/admin-recording-review.js';
import { renderPoemManagement } from './ui/admin-poem-management.js';
import { renderSoundManagement } from './ui/admin-sound-management.js';
import { renderUserManagement } from './ui/admin-user-management.js';
import { renderStatistics } from './ui/admin-statistics.js';
import { renderAdminLogs } from './ui/admin-logs.js';
import { NotificationDropdown } from './ui/notification-dropdown.js';
import { UserPanelModal } from './ui/user-panel-modal.js';

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
  adminManager: null,
  notificationManager: null,
  adminDrawer: null,
  userPanelModal: null,
  initialized: false,
  userId: null,
  authStatus: 'initializing',
  authUser: null,
  authMessage: '',
  authSubscription: null,
  visitorCount: null,
  authSubtitleDefault: '',
  activeScreen: 'loading',
  isPreviewMode: false,
  previewAtmosphereData: null,
  baseBackgroundConfig: null,
  atmosphereContext: {
    poemId: null,
    entries: [],
    order: [],
    index: -1,
    userLikedAtmosphereId: null,
    pendingToken: null
  },
  atmosphereStatusTimer: null,
  allPoems: [], // 保存所有詩句（用於搜索）
  searchTimeout: null, // 搜索防抖定時器
  scrollTimeout: null // 滾動停止定時器
};

const ATMOSPHERE_STATUS_DURATION = 3000;
const ATMOSPHERE_STATUS_HIDE_DELAY = 360;

/**
 * 將視覺與聲音狀態還原到基礎狀態
 */
function resetAtmosphereEnvironment() {
  try {
    // 強制清除預覽模式標記（優先執行，確保後續清理邏輯正確執行）
    AppState.isPreviewMode = false;
    
    if (AppState.soundMixer) {
      AppState.soundMixer.clear();
    }

    if (AppState.backgroundRenderer) {
      // 返回首頁時，強制清除所有自定義背景色，恢復默認背景
      // 不依賴 baseBackgroundConfig，確保首頁始終使用默認背景
      AppState.backgroundRenderer.clear();
      // 恢復默認文字顏色
      if (window.applyBackgroundTextColor) {
        window.applyBackgroundTextColor(null);
      }
    }
  } catch (resetError) {
    console.warn('重置聲色環境時發生錯誤:', resetError);
  }

  AppState.currentAtmosphere = null;
}

/**
 * 完全清理音效和音頻資源
 * 用於頁面卸載時確保音效完全停止
 */
async function cleanupAudioResources() {
  try {
    // 清理音效混音器
    if (AppState.soundMixer) {
      AppState.soundMixer.clear();
    }
    
    // 關閉音頻引擎
    if (AppState.audioEngine) {
      await AppState.audioEngine.close();
    }
    
    console.log('✅ 音頻資源已清理');
  } catch (error) {
    console.warn('清理音頻資源時發生錯誤:', error);
  }
}

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
 * 防止移動端縮放和滾動
 */
function preventMobileZoomAndScroll() {
  // 防止雙擊縮放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // 防止手勢縮放（雙指捏合）
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });

  // 防止詩句展示頁面的滾動
  const preventScroll = (e) => {
    const poemViewerScreen = document.getElementById('poem-viewer-screen');
    if (poemViewerScreen && poemViewerScreen.style.display !== 'none') {
      // 允許按鈕點擊，但防止滾動
      const target = e.target;
      const isButton = target.tagName === 'BUTTON' || 
                       target.closest('button') || 
                       target.closest('.sound-controls') ||
                       target.closest('.atmosphere-selector');
      
      if (!isButton) {
        // 在詩句展示頁面時，防止滾動
        if (e.touches && e.touches.length > 1) {
          e.preventDefault(); // 多點觸控（縮放手勢）
        }
      }
    }
  };

  // 監聽詩句展示頁面的觸摸事件
  document.addEventListener('touchstart', preventScroll, { passive: false });
  document.addEventListener('touchmove', preventScroll, { passive: false });
}

async function initializeApp() {
  try {
    console.log('🚀 空山應用初始化開始...');
    
    // 0. 防止移動端縮放和滾動
    preventMobileZoomAndScroll();
    
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
      AppState.adminManager = new AdminManager(AppState.supabase);
      AppState.notificationManager = new NotificationManager(AppState.supabase);
      AppState.audioEngine = new AudioEngine();
      AppState.soundMixer = new SoundMixer(AppState.audioEngine);
      
      // 初始化背景渲染器（包含粒子渲染器）
      const canvas = document.getElementById('background-canvas');
      if (canvas) {
        AppState.backgroundRenderer = new BackgroundRenderer(canvas);
      }

      // 初始化管理後台抽屜
      AppState.adminDrawer = new AdminDrawer(AppState.adminManager, handleAdminViewChange);
      AppState.adminDrawer.init();

      // 初始化用戶面板模態窗口
      AppState.userPanelModal = new UserPanelModal(
        AppState.notificationManager,
        getCurrentUserId,
        updateNotificationBadge,
        handleSignOut,
        () => AppState.authUser,
        () => AppState.visitorCount,
        AppState.supabase
      );
      AppState.userPanelModal.init();
    
    // 4. 隱藏加載畫面
    hideLoadingScreen();
    
    // 5. 顯示詩歌列表
    await showPoemListScreen();
    
    // 6. 設置管理後台和通知按鈕
    await setupAdminPanel();
    
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
    resetAtmosphereEnvironment();
    if (AppState.atmosphereContext) {
      AppState.atmosphereContext.userLikedAtmosphereId = null;
      AppState.atmosphereContext.entries.forEach(entry => {
        if (entry && entry.type !== 'placeholder') {
          entry.likedByCurrent = false;
        }
      });
      AppState.atmosphereContext.order.forEach(entry => {
        if (entry && entry.type !== 'placeholder') {
          entry.likedByCurrent = false;
        }
      });
      updateLikeButtonUI(AppState.atmosphereContext.order[AppState.atmosphereContext.index] || null);
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
  }

  updateAuthUI();
  if (AppState.currentPoem && AppState.supabase) {
    loadAtmosphereSequence(AppState.currentPoem.id).catch(err => {
      console.warn('重新載入聲色意境失敗:', err);
    });
  } else {
    updateLikeButtonUI(AppState.atmosphereContext.order[AppState.atmosphereContext.index] || null);
  }

  setupAdminPanel().catch(err => {
    console.warn('更新管理後台狀態失敗:', err);
  });
}

function getAuthElements() {
  return {
    overlay: document.getElementById('auth-overlay'),
    subtitle: document.querySelector('#auth-overlay .auth-subtitle'),
    googleBtn: document.getElementById('google-login-btn')
  };
}

function getAtmosphereUIElements() {
  return {
    topbar: document.querySelector('.poem-viewer-topbar'),
    cycleBtn: document.getElementById('atmosphere-cycle-btn'),
    statusEl: document.getElementById('atmosphere-status'),
    statusText: document.getElementById('atmosphere-status-text'),
    likeBtn: document.getElementById('atmosphere-like-btn'),
    likeCount: document.getElementById('atmosphere-like-count')
  };
}

function updateAuthUI() {
  const { overlay, subtitle, googleBtn } = getAuthElements();
  if (!overlay || !googleBtn) {
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

  updateAppSwitcherVisibility();
}

function setupAuthUI() {
  const { googleBtn, subtitle } = getAuthElements();
  if (!googleBtn || !subtitle) {
    return;
  }

  if (!AppState.authSubtitleDefault && subtitle) {
    AppState.authSubtitleDefault = subtitle.textContent || '';
  }

  googleBtn.addEventListener('click', handleGoogleLogin);

  updateAuthUI();
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
  const adminScreen = document.getElementById('admin-dashboard-screen');
  
  if (listScreen) listScreen.style.display = 'flex'; // 使用 flex 以匹配 CSS
  if (viewerScreen) viewerScreen.style.display = 'none';
  if (adminScreen) adminScreen.style.display = 'none';
  AppState.activeScreen = 'list';
  
  // 清除任何正在進行的聲色意境載入操作
  if (AppState.atmosphereContext) {
    AppState.atmosphereContext.pendingToken = null;
  }
  
  resetAtmosphereEnvironment();
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
  const adminScreen = document.getElementById('admin-dashboard-screen');
  
  if (listScreen) listScreen.style.display = 'none';
  if (viewerScreen) viewerScreen.style.display = 'flex'; // 使用 flex 以匹配 CSS
  if (adminScreen) adminScreen.style.display = 'none';
  AppState.activeScreen = 'viewer';
  updateAppSwitcherVisibility();
  
  // 加載詩歌內容和聲色意境
  await loadPoem(poemId);
}

/**
 * 離開管理後台，返回詩歌列表畫面
 */
async function exitAdminDashboard() {
  if (AppState.adminDrawer) {
    AppState.adminDrawer.close();
  }
  await showPoemListScreen();
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
    
    // 檢查是否因為 Supabase 未配置而返回空數組
    if (poems.length === 0 && !AppState.supabase) {
      poemList.innerHTML = '<p class="placeholder-text">無法連接到數據庫，請檢查網絡連接或稍後再試</p>';
      return;
    }
    
    // 保存所有詩句（用於搜索）
    AppState.allPoems = poems;
    
    renderPoemList(poemList, poems);
    console.log('詩歌列表渲染完成');
    
    // 初始化搜索和滾動檢測
    setupSearchAndScrollDetection();
  } catch (error) {
    console.error('加載詩歌列表失敗:', error);
    poemList.innerHTML = '<p class="placeholder-text">加載失敗，請刷新頁面重試</p>';
  }
}

/**
 * 設置搜索和滾動檢測
 */
function setupSearchAndScrollDetection() {
  const poemList = document.getElementById('poem-list');
  const searchContainer = document.getElementById('poem-search-container');
  const searchInput = document.getElementById('poem-search-input');
  
  if (!poemList || !searchContainer || !searchInput) {
    return;
  }
  
  // 追蹤搜索框焦點狀態
  let isSearchFocused = false;
  
  // 滾動檢測：顯示/隱藏搜索框
  let isScrolling = false;
  
  poemList.addEventListener('scroll', () => {
    // 如果搜索框有內容或處於焦點狀態，保持顯示
    if (searchInput.value.trim() || isSearchFocused) {
      if (!searchContainer.classList.contains('visible')) {
        searchContainer.classList.remove('hidden');
        searchContainer.classList.add('visible');
      }
      return;
    }
    
    // 顯示搜索框
    if (!isScrolling) {
      isScrolling = true;
      searchContainer.classList.remove('hidden');
      searchContainer.classList.add('visible');
    }
    
    // 清除之前的定時器
    if (AppState.scrollTimeout) {
      clearTimeout(AppState.scrollTimeout);
    }
    
    // 停止滾動 1.5 秒後隱藏（但不在焦點狀態時）
    AppState.scrollTimeout = setTimeout(() => {
      isScrolling = false;
      // 只有在沒有內容且不在焦點狀態時才隱藏
      if (!searchInput.value.trim() && !isSearchFocused) {
        searchContainer.classList.remove('visible');
        searchContainer.classList.add('hidden');
      }
    }, 1500);
  });
  
  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    
    // 清除之前的搜索定時器
    if (AppState.searchTimeout) {
      clearTimeout(AppState.searchTimeout);
    }
    
    // 防抖：300ms 後執行搜索
    AppState.searchTimeout = setTimeout(() => {
      filterPoems(searchTerm);
    }, 300);
  });
  
  poemList.addEventListener('scroll', () => {
    // 如果搜索框有內容或處於焦點狀態，保持顯示
    if (searchInput.value.trim() || isSearchFocused) {
      if (!searchContainer.classList.contains('visible')) {
        searchContainer.classList.add('visible');
      }
      return;
    }
    
    // 顯示搜索框
    if (!isScrolling) {
      isScrolling = true;
      searchContainer.classList.add('visible');
    }
    
    // 清除之前的定時器
    if (AppState.scrollTimeout) {
      clearTimeout(AppState.scrollTimeout);
    }
    
    // 停止滾動 1.5 秒後隱藏（但不在焦點狀態時）
    AppState.scrollTimeout = setTimeout(() => {
      isScrolling = false;
      // 只有在沒有內容且不在焦點狀態時才隱藏
      if (!searchInput.value.trim() && !isSearchFocused) {
        searchContainer.classList.remove('visible');
      }
    }, 1500);
  });
  
  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    
    // 清除之前的搜索定時器
    if (AppState.searchTimeout) {
      clearTimeout(AppState.searchTimeout);
    }
    
    // 防抖：300ms 後執行搜索
    AppState.searchTimeout = setTimeout(() => {
      filterPoems(searchTerm);
    }, 300);
  });
  
  // 搜索框獲得焦點時：保持顯示
  searchInput.addEventListener('focus', () => {
    isSearchFocused = true;
    searchContainer.classList.add('visible');
    
    // 清除滾動隱藏定時器
    if (AppState.scrollTimeout) {
      clearTimeout(AppState.scrollTimeout);
      AppState.scrollTimeout = null;
    }
  });
  
  // 搜索框失去焦點時：允許隱藏（如果沒有內容）
  searchInput.addEventListener('blur', () => {
    isSearchFocused = false;
    
    // 如果沒有內容，延遲隱藏（給用戶一點時間）
    if (!searchInput.value.trim()) {
      setTimeout(() => {
        // 再次檢查是否獲得焦點（防止快速切換）
        if (!isSearchFocused && !searchInput.value.trim()) {
          searchContainer.classList.remove('visible');
        }
      }, 200);
    }
  });
}

/**
 * 過濾詩句
 */
function filterPoems(searchTerm) {
  const poemList = document.getElementById('poem-list');
  if (!poemList) return;
  
  if (!searchTerm) {
    // 沒有搜索詞，顯示所有詩句
    renderPoemList(poemList, AppState.allPoems);
    return;
  }
  
  const searchLower = searchTerm.toLowerCase();
  const filteredPoems = AppState.allPoems.filter(poem => {
    // 搜索詩句內容
    if (poem.content && poem.content.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // 搜索標題
    if (poem.title && poem.title.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // 搜索作者
    if (poem.author && poem.author.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // 搜索朝代
    if (poem.dynasty && poem.dynasty.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  });
  
  // 渲染過濾後的詩句
  if (filteredPoems.length === 0) {
    poemList.innerHTML = '<p class="placeholder-text">未找到匹配的詩句</p>';
  } else {
    renderPoemList(poemList, filteredPoems, false);
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
      await loadAtmosphereSequence(poemId);
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

    // 覆蓋機制：刪除該用戶在該詩句下的舊意境
    // 這樣用戶在同一詩句下只能有一個意境，新意境會自動覆蓋舊的
    const { error: deleteError } = await AppState.supabase
      .from('poem_atmospheres')
      .delete()
      .eq('poem_id', atmosphereData.poem_id)
      .eq('created_by', userId);

    if (deleteError) {
      console.warn('刪除舊意境時發生錯誤（可能沒有舊意境，可忽略）:', deleteError);
      // 不中斷流程，繼續插入新意境
    }

    // 插入新意境到數據庫
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
    await loadAtmosphereSequence(atmosphereData.poem_id);
  } catch (error) {
    console.error('保存聲色意境異常:', error);
    alert('保存失敗，請稍後重試');
  }
}

function buildPlaceholderEntry() {
  return {
    type: 'placeholder',
    message: '目前還沒有聲色意境，歡迎率先創作。'
  };
}

function buildAtmosphereOrder(entries, userId) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [buildPlaceholderEntry()];
  }

  const added = new Set();
  const sequence = [];
  const userEntries = userId
    ? entries.filter(entry => entry.authorId === userId)
    : [];
  userEntries.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });

  const others = entries
    .filter(entry => !userId || entry.authorId !== userId)
    .sort((a, b) => {
      const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
      if (likeDiff !== 0) {
        return likeDiff;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const pushEntry = (entry) => {
    if (!entry || added.has(entry.id)) {
      return;
    }
    sequence.push(entry);
    added.add(entry.id);
  };

  userEntries.forEach(pushEntry);

  const maxLikes = others.length > 0 ? Math.max(...others.map(entry => entry.likeCount || 0)) : 0;
  if (maxLikes > 0) {
    others.forEach(entry => {
      if ((entry.likeCount || 0) === maxLikes) {
        pushEntry(entry);
      }
    });
  } else if (others.length > 0) {
    const earliest = others.reduce((prev, current) => {
      const prevTime = prev.createdAt ? new Date(prev.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return currentTime < prevTime ? current : prev;
    }, others[0]);
    pushEntry(earliest);
  }

  others.forEach(pushEntry);
  entries.forEach(pushEntry);

  return sequence.length > 0 ? sequence : [buildPlaceholderEntry()];
}

function findAtmosphereEntryById(id) {
  if (!id) {
    return null;
  }
  return AppState.atmosphereContext.entries.find(entry => entry.id === id) || null;
}

function updateLikeButtonUI(entry) {
  const { likeBtn, likeCount } = getAtmosphereUIElements();
  if (!likeBtn || !likeCount) {
    return;
  }

  if (!entry || entry.type === 'placeholder') {
    likeBtn.classList.add('is-hidden');
    likeBtn.setAttribute('aria-pressed', 'false');
    likeBtn.disabled = true;
    likeCount.textContent = '0';
    return;
  }

  if (entry.status && entry.status !== 'approved') {
    likeBtn.classList.add('is-hidden');
    likeBtn.setAttribute('aria-pressed', 'false');
    likeBtn.disabled = true;
    likeCount.textContent = String(entry.likeCount || 0);
    return;
  }

  likeBtn.classList.remove('is-hidden');
  likeBtn.setAttribute('aria-pressed', entry.likedByCurrent ? 'true' : 'false');
  likeBtn.disabled = !AppState.userId;
  likeCount.textContent = String(entry.likeCount || 0);
}

function showAtmosphereStatus({ text, showLikeButton }) {
  const { statusEl, statusText, likeBtn } = getAtmosphereUIElements();
  if (!statusEl || !statusText || !likeBtn) {
    return;
  }

  statusText.textContent = text || '';

  if (showLikeButton) {
    likeBtn.classList.remove('is-hidden');
  } else {
    likeBtn.classList.add('is-hidden');
  }

  statusEl.hidden = false;
  statusEl.classList.remove('visible');
  void statusEl.offsetWidth;
  statusEl.classList.add('visible');

  if (AppState.atmosphereStatusTimer) {
    clearTimeout(AppState.atmosphereStatusTimer);
  }

  AppState.atmosphereStatusTimer = setTimeout(() => {
    statusEl.classList.remove('visible');
    setTimeout(() => {
      if (!statusEl.classList.contains('visible')) {
        statusEl.hidden = true;
      }
    }, ATMOSPHERE_STATUS_HIDE_DELAY);
    AppState.atmosphereStatusTimer = null;
  }, ATMOSPHERE_STATUS_DURATION);
}

async function applyAtmosphereEntry(entry, { showStatus = true } = {}) {
  const soundControlsEl = document.getElementById('sound-controls');
  const context = AppState.atmosphereContext;
  const token = Date.now();
  context.pendingToken = token;

  if (soundControlsEl) {
    soundControlsEl.style.display = 'none';
  }

  // 過渡時長配置
  const TRANSITION_DURATION = 600; // 背景和聲音過渡時長（毫秒）
  const FADE_DURATION = 500; // 聲音淡入淡出時長（毫秒）

  if (!entry || entry.type === 'placeholder') {
    // 檢查是否還在正確的狀態（用戶可能已經離開）
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }
    
    // 淡出舊音效
    if (AppState.soundMixer) {
      await AppState.soundMixer.clear(true, FADE_DURATION);
    }
    
    // 再次檢查狀態
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }
    
    // 過渡到基礎背景和文字顏色（只在詩句頁面執行）
    const baseBackgroundPromise = AppState.backgroundRenderer && AppState.baseBackgroundConfig && AppState.activeScreen === 'viewer'
      ? AppState.backgroundRenderer.setConfigWithTransition(
          AppState.baseBackgroundConfig,
          TRANSITION_DURATION
        ).catch(() => {
          // 忽略取消錯誤（用戶可能已經離開）
        })
      : Promise.resolve();
    
    const baseTextColorPromise = window.applyBackgroundTextColor && AppState.activeScreen === 'viewer'
      ? window.applyBackgroundTextColor(AppState.baseBackgroundConfig, TRANSITION_DURATION)
      : Promise.resolve();
    
    // 等待背景和文字顏色過渡完成
    await Promise.all([baseBackgroundPromise, baseTextColorPromise]);
    
    // 最終檢查狀態
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }
    
    AppState.currentAtmosphere = null;
    updateLikeButtonUI(null);
    if (showStatus) {
      const message = entry?.message || '目前還沒有聲色意境，歡迎率先創作。';
      showAtmosphereStatus({ text: message, showLikeButton: false });
    }
    context.pendingToken = null;
    return;
  }

  try {
    const atmosphere = entry.data;
    
    // 檢查是否還在正確的狀態（用戶可能已經離開）
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }
    
    // 確定目標背景配置
    const targetBackgroundConfig = atmosphere.background_config || AppState.baseBackgroundConfig || null;
    
    // 同時開始：1) 淡出舊音效 2) 過渡背景 3) 過渡文字顏色
    // 只在詩句頁面執行背景過渡
    const soundFadeOutPromise = AppState.soundMixer 
      ? AppState.soundMixer.clear(true, FADE_DURATION)
      : Promise.resolve();
    
    const backgroundTransitionPromise = AppState.backgroundRenderer && targetBackgroundConfig && AppState.activeScreen === 'viewer'
      ? AppState.backgroundRenderer.setConfigWithTransition(targetBackgroundConfig, TRANSITION_DURATION).catch(() => {
          // 忽略取消錯誤（用戶可能已經離開）
        })
      : Promise.resolve();
    
    const textColorTransitionPromise = window.applyBackgroundTextColor && targetBackgroundConfig && AppState.activeScreen === 'viewer'
      ? window.applyBackgroundTextColor(targetBackgroundConfig, TRANSITION_DURATION)
      : Promise.resolve();
    
    // 等待淡出、背景過渡和文字顏色過渡完成
    await Promise.all([soundFadeOutPromise, backgroundTransitionPromise, textColorTransitionPromise]);
    
    // 檢查狀態是否還有效
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }
    
    // 載入新音效
    const sounds = await AppState.atmosphereManager.getAtmosphereSounds(atmosphere);
    if (context.pendingToken !== token) {
      return;
    }

    // 檢查是否還在正確的狀態（用戶可能已經離開）
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }

    if (AppState.soundMixer) {
      const loadedTracks = [];
      for (const sound of sounds) {
        // 在每次載入前檢查狀態，如果用戶已經離開，停止載入
        if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
          return;
        }
        
        const track = await AppState.soundMixer.addTrack({
          ...sound,
          volume: sound.volume !== undefined ? sound.volume : 0.7,
          loop: sound.loop !== undefined ? sound.loop : true
        });
        
        // 載入完成後再次檢查狀態
        if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
          // 如果用戶已經離開，清除已載入的音效
          if (AppState.soundMixer) {
            AppState.soundMixer.clear();
          }
          return;
        }
        
        if (track) {
          loadedTracks.push(track);
        }
      }
      
      // 播放前最後一次檢查狀態，使用淡入效果
      if (context.pendingToken === token && AppState.activeScreen === 'viewer' && loadedTracks.length > 0) {
        const playResult = await AppState.soundMixer.playAll(true, FADE_DURATION);
        if (!playResult.success && playResult.needsInteraction) {
          console.log('📱 音效播放需要用戶交互或設備未靜音');
        }
      }
    }

    // 應用背景前檢查狀態（背景過渡已在上面完成）
    if (context.pendingToken !== token || AppState.activeScreen !== 'viewer') {
      return;
    }

    // 文字顏色過渡已在上面完成，這裡不需要再次設置

    AppState.currentAtmosphere = atmosphere;
    AppState.isPreviewMode = false;
    updateLikeButtonUI(entry);

    if (showStatus) {
      const displayName = entry.authorName || '旅人';
      let statusNote = '';
      if (entry.status && entry.status !== 'approved' && entry.authorId === AppState.userId) {
        if (entry.status === 'pending') {
          statusNote = '（待審核）';
        } else if (entry.status === 'rejected') {
          statusNote = '（未通過審核）';
        } else {
          statusNote = '（尚未公開）';
        }
      }
      showAtmosphereStatus({
        text: `${displayName} 的聲色意境${statusNote}`,
        showLikeButton: entry.status === 'approved'
      });
    }
  } catch (error) {
    console.error('套用聲色意境失敗:', error);
    if (showStatus) {
      showAtmosphereStatus({
        text: '套用聲色意境時出現問題，請稍後再試。',
        showLikeButton: false
      });
    }
  } finally {
    if (context.pendingToken === token) {
      context.pendingToken = null;
    }
  }
}

async function loadAtmosphereSequence(poemId) {
  const context = AppState.atmosphereContext;
  context.poemId = poemId;
  context.entries = [];
  context.order = [];
  context.index = -1;
  context.userLikedAtmosphereId = null;
  context.pendingToken = null;

  if (AppState.soundMixer) {
    AppState.soundMixer.clear();
  }
  AppState.currentAtmosphere = null;
  AppState.isPreviewMode = false;

  const soundControlsEl = document.getElementById('sound-controls');
  if (soundControlsEl) {
    soundControlsEl.style.display = 'none';
  }

  if (!AppState.atmosphereManager) {
    const order = buildAtmosphereOrder([], AppState.userId);
    context.order = order;
    context.index = order.length > 0 ? 0 : -1;
    await applyAtmosphereEntry(order[context.index] || null, { showStatus: true });
    return;
  }

  try {
    const includeUserId = AppState.userId || null;
    const atmospheres = await AppState.atmosphereManager.loadAtmospheres(poemId, {
      includeUserId
    });
    if (!Array.isArray(atmospheres) || atmospheres.length === 0) {
      context.order = buildAtmosphereOrder([], AppState.userId);
      context.index = context.order.length > 0 ? 0 : -1;
      await applyAtmosphereEntry(context.order[context.index] || null, { showStatus: true });
      return;
    }

    let entries = atmospheres.map(atmosphere => ({
      id: atmosphere.id,
      data: atmosphere,
      authorId: atmosphere.created_by || null,
      authorName: '旅人',
      createdAt: atmosphere.created_at,
      likeCount: typeof atmosphere.like_count === 'number' ? atmosphere.like_count : 0,
      likedByCurrent: false,
      status: atmosphere.status || 'approved'
    }));

    if (AppState.supabase) {
      const authorIds = [...new Set(entries.map(entry => entry.authorId).filter(Boolean))];
      if (authorIds.length > 0) {
        const { data: travelerRows, error: travelerError } = await AppState.supabase
          .from('travelers')
          .select('user_id, display_name')
          .in('user_id', authorIds);
        if (travelerError) {
          console.warn('載入旅人名稱時發生錯誤:', travelerError);
        } else if (Array.isArray(travelerRows)) {
          const nameMap = new Map(
            travelerRows.map(row => [row.user_id, (row.display_name || '').trim()])
          );
          entries = entries.map(entry => ({
            ...entry,
            authorName: nameMap.get(entry.authorId) || '旅人'
          }));
        }
      }

      const atmosphereIds = entries.map(entry => entry.id);
      if (atmosphereIds.length > 0) {
        const { data: likeRows, error: likeError } = await AppState.supabase
          .from('atmosphere_likes')
          .select('atmosphere_id, user_id')
          .in('atmosphere_id', atmosphereIds);

        if (likeError) {
          console.warn('載入點讚資訊時發生錯誤:', likeError);
        } else if (Array.isArray(likeRows)) {
          const likeMap = new Map();
          likeRows.forEach(row => {
            const targetId = row.atmosphere_id;
            if (!likeMap.has(targetId)) {
              likeMap.set(targetId, { count: 0, likedByCurrent: false });
            }
            const info = likeMap.get(targetId);
            info.count += 1;
            if (AppState.userId && row.user_id === AppState.userId) {
              info.likedByCurrent = true;
            }
          });

          entries = entries.map(entry => {
            const info = likeMap.get(entry.id);
            if (!info) {
              return entry;
            }
            if (info.likedByCurrent) {
              context.userLikedAtmosphereId = entry.id;
            }
            return {
              ...entry,
              likeCount: info.count,
              likedByCurrent: info.likedByCurrent
            };
          });
        }
      }
    }

    if (context.userLikedAtmosphereId) {
      entries = entries.map(entry => ({
        ...entry,
        likedByCurrent: entry.id === context.userLikedAtmosphereId
      }));
    }

    context.entries = entries;
    context.order = buildAtmosphereOrder(entries, AppState.userId);
    context.index = context.order.length > 0 ? 0 : -1;

    await applyAtmosphereEntry(context.order[context.index] || null, { showStatus: true });
  } catch (error) {
    console.error('加載聲色意境列表失敗:', error);
    context.entries = [];
    context.order = buildAtmosphereOrder([], AppState.userId);
    context.index = context.order.length > 0 ? 0 : -1;
    await applyAtmosphereEntry(context.order[context.index] || null, { showStatus: true });
  }
}

function rebuildAtmosphereOrder(preferredId) {
  const context = AppState.atmosphereContext;
  const currentEntry = context.order[context.index] || null;
  const currentId = preferredId
    || (currentEntry && currentEntry.type !== 'placeholder' ? currentEntry.id : null);

  context.order = buildAtmosphereOrder(context.entries, AppState.userId);

  if (context.order.length === 0) {
    context.index = -1;
    return;
  }

  if (currentId) {
    const newIndex = context.order.findIndex(entry => entry.id === currentId);
    context.index = newIndex !== -1 ? newIndex : 0;
  } else {
    context.index = 0;
  }
}

async function handleAtmosphereCycle() {
  const context = AppState.atmosphereContext;
  if (!context.order || context.order.length === 0) {
    showAtmosphereStatus({
      text: '目前還沒有聲色意境，歡迎率先創作。',
      showLikeButton: false
    });
    return;
  }

  if (context.order.length === 1 && context.order[0].type === 'placeholder') {
    showAtmosphereStatus({
      text: context.order[0].message || '目前還沒有聲色意境，歡迎率先創作。',
      showLikeButton: false
    });
    return;
  }

  context.index = (context.index + 1) % context.order.length;
  const entry = context.order[context.index];
  await applyAtmosphereEntry(entry, { showStatus: true });
}

async function handleAtmosphereLike() {
  if (!AppState.userId) {
    return;
  }

  const context = AppState.atmosphereContext;
  const entry = context.order[context.index];
  if (!entry || entry.type === 'placeholder') {
    return;
  }

  await toggleAtmosphereLike(entry);
}

async function toggleAtmosphereLike(entry) {
  if (!entry || entry.type === 'placeholder' || !AppState.supabase || !AppState.userId) {
    return;
  }

  if (entry.status && entry.status !== 'approved') {
    return;
  }

  const context = AppState.atmosphereContext;
  const currentLikedId = context.userLikedAtmosphereId;
  const targetId = entry.id;
  const userId = AppState.userId;
  const adjustments = [];

  try {
    if (currentLikedId && currentLikedId !== targetId) {
      await removeAtmosphereLike(currentLikedId, userId);
      const previousEntry = findAtmosphereEntryById(currentLikedId);
      if (previousEntry) {
        previousEntry.likeCount = Math.max(0, (previousEntry.likeCount || 0) - 1);
        previousEntry.likedByCurrent = false;
        adjustments.push({ id: currentLikedId, count: previousEntry.likeCount });
      }
    }

    if (currentLikedId === targetId) {
      await removeAtmosphereLike(targetId, userId);
      const targetEntry = findAtmosphereEntryById(targetId);
      if (targetEntry) {
        targetEntry.likeCount = Math.max(0, (targetEntry.likeCount || 0) - 1);
        targetEntry.likedByCurrent = false;
        adjustments.push({ id: targetId, count: targetEntry.likeCount });
      }
      context.userLikedAtmosphereId = null;
    } else {
      await addAtmosphereLike(targetId, userId);
      const targetEntry = findAtmosphereEntryById(targetId);
      if (targetEntry) {
        targetEntry.likeCount = (targetEntry.likeCount || 0) + 1;
        targetEntry.likedByCurrent = true;
        adjustments.push({ id: targetId, count: targetEntry.likeCount });
      }
      context.userLikedAtmosphereId = targetId;
    }

    rebuildAtmosphereOrder(entry.id);
    updateLikeButtonUI(context.order[context.index] || null);
    showAtmosphereStatus({
      text: `${entry.authorName || '旅人'} 的聲色意境`,
      showLikeButton: true
    });

    await syncAtmosphereLikeCountOnServer(adjustments);
  } catch (error) {
    console.error('更新點讚狀態失敗:', error);
    showAtmosphereStatus({
      text: '點讚操作失敗，請稍後再試。',
      showLikeButton: true
    });
  }
}

async function addAtmosphereLike(atmosphereId, userId) {
  const { error } = await AppState.supabase
    .from('atmosphere_likes')
    .insert({
      atmosphere_id: atmosphereId,
      user_id: userId
    });

  if (error && error.code !== '23505' && error.code !== '409') {
    throw error;
  }
}

async function removeAtmosphereLike(atmosphereId, userId) {
  const { error } = await AppState.supabase
    .from('atmosphere_likes')
    .delete()
    .eq('atmosphere_id', atmosphereId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function syncAtmosphereLikeCountOnServer(adjustments) {
  if (!Array.isArray(adjustments) || adjustments.length === 0 || !AppState.supabase) {
    return;
  }

  for (const adjustment of adjustments) {
    if (!adjustment || typeof adjustment.count !== 'number') {
      continue;
    }
    const { error } = await AppState.supabase
      .from('poem_atmospheres')
      .update({ like_count: adjustment.count })
      .eq('id', adjustment.id);
    if (error) {
      console.warn('同步點讚數失敗:', error);
    }
  }
}

function setupPoemViewerControls() {
  const { cycleBtn, likeBtn } = getAtmosphereUIElements();

  if (cycleBtn && !cycleBtn.dataset.bound) {
    cycleBtn.addEventListener('click', () => {
      handleAtmosphereCycle().catch(error => {
        console.warn('切換聲色意境失敗:', error);
      });
    });
    cycleBtn.dataset.bound = 'true';
  }

  if (likeBtn && !likeBtn.dataset.bound) {
    likeBtn.addEventListener('click', () => {
      handleAtmosphereLike().catch(error => {
        console.warn('點讚聲色意境失敗:', error);
      });
    });
    likeBtn.dataset.bound = 'true';
  }

  const currentEntry = AppState.atmosphereContext.order[AppState.atmosphereContext.index] || null;
  updateLikeButtonUI(currentEntry || null);
}

// 暴露函數到全局狀態（供其他模塊調用）
AppState.showPoemViewer = showPoemViewerScreen;
AppState.showPoemList = showPoemListScreen;
AppState.handleGoogleLogin = handleGoogleLogin;
AppState.handleSignOut = handleSignOut;

/**
 * 設置管理後台面板
 */
async function setupAdminPanel() {
  const adminBtn = document.getElementById('admin-panel-btn');
  const userPanelBtn = document.getElementById('user-panel-btn');
  const badge = document.getElementById('notification-badge');

  if (!adminBtn || !userPanelBtn) {
    return;
  }

  // 預設隱藏，避免上一位使用者的狀態殘留
  adminBtn.hidden = true;
  userPanelBtn.hidden = true;
  if (badge) {
    badge.hidden = true;
  }

  if (!AppState.adminManager || !AppState.notificationManager) {
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return;
  }

  const isAuthenticated = AppState.authStatus === 'google' || AppState.authStatus === 'other';
  if (isAuthenticated) {
    userPanelBtn.hidden = false;
    
    // 顯示搜索框容器（始終存在，只通過 CSS 類控制可見性）
    const searchContainer = document.getElementById('poem-search-container');
    if (searchContainer) {
      // 移除 hidden 屬性，確保容器始終佔據空間
      searchContainer.removeAttribute('hidden');
      // 初始狀態不顯示（opacity: 0），等待滾動時顯示
    }
    
    if (!userPanelBtn.dataset.bound) {
      userPanelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (AppState.userPanelModal) {
          await AppState.userPanelModal.toggle();
        }
      });
      userPanelBtn.dataset.bound = 'true';
    }
    await updateNotificationBadge();
  }

  const isAdmin = await AppState.adminManager.isAdmin(userId);
  if (isAdmin) {
    adminBtn.hidden = false;
    if (!adminBtn.dataset.bound) {
      adminBtn.addEventListener('click', () => {
        if (!AppState.adminDrawer) {
          return;
        }
        AppState.activeScreen = 'admin';
        updateAppSwitcherVisibility();
        AppState.adminDrawer.open();
      });
      adminBtn.dataset.bound = 'true';
    }
  }
}

/**
 * 更新通知徽章
 */
async function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (!badge || !AppState.notificationManager) {
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    badge.hidden = true;
    return;
  }

  const count = await AppState.notificationManager.checkNotifications(userId);
  if (count > 0) {
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  // 同時更新用戶面板的消息徽章
  if (AppState.userPanelModal) {
    await AppState.userPanelModal.updateMessagesBadge();
  }
}

/**
 * 處理管理後台視圖變更
 * @param {string|null} viewName - 視圖名稱
 */
async function handleAdminViewChange(viewName) {
  if (!viewName || !AppState.adminDrawer) {
    return;
  }

  AppState.adminDrawer.showLoading();

  try {
    if (viewName === 'recording-review') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderRecordingReview(container, {
        adminManager: AppState.adminManager,
        supabase: AppState.supabase,
        getCurrentUserId
      });
      return;
    }

    if (viewName === 'poem-management') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderPoemManagement(container, {
        adminManager: AppState.adminManager,
        getCurrentUserId
      });
      return;
    }

    if (viewName === 'sound-management') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderSoundManagement(container, {
        adminManager: AppState.adminManager,
        supabase: AppState.supabase,
        getCurrentUserId
      });
      return;
    }

    if (viewName === 'user-management') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderUserManagement(container, {
        adminManager: AppState.adminManager,
        getCurrentUserId
      });
      return;
    }

    if (viewName === 'statistics') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderStatistics(container, {
        adminManager: AppState.adminManager
      });
      return;
    }

    if (viewName === 'logs') {
      const container = document.createElement('div');
      container.className = 'admin-view-shell';
      AppState.adminDrawer.setContent(container);
      await renderAdminLogs(container, {
        adminManager: AppState.adminManager
      });
      return;
    }

    // 根據視圖名稱載入對應的內容
    // 這裡先顯示一個佔位符，後續會實現具體的 UI 組件
    AppState.adminDrawer.setContent(`
      <h2 class="admin-section-title">${getAdminViewTitle(viewName)}</h2>
      <p class="admin-empty-state">功能開發中...</p>
    `);
  } catch (error) {
    console.error('載入管理視圖失敗:', error);
    AppState.adminDrawer.showError('載入失敗，請稍後再試');
  }
}

/**
 * 獲取管理視圖標題
 * @param {string} viewName - 視圖名稱
 * @returns {string}
 */
function getAdminViewTitle(viewName) {
  const titles = {
    'recording-review': '音效審核',
    'poem-management': '詩句管理',
    'sound-management': '音效管理',
    'user-management': '用戶管理',
    'statistics': '數據統計',
    'logs': '操作日誌'
  };
  return titles[viewName] || '管理後台';
}

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 設置返回按鈕和編輯按鈕事件監聽
document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();
  setupPoemViewerControls();

  const backButton = document.getElementById('back-to-list-btn');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showPoemListScreen();
    });
  }

  const adminBackBtn = document.getElementById('admin-back-btn');
  if (adminBackBtn) {
    adminBackBtn.addEventListener('click', () => {
      exitAdminDashboard().catch(error => {
        console.warn('返回詩歌列表時發生錯誤:', error);
      });
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

  // 設置頁面卸載和可見性監聽器，確保音效正確清理
  setupPageUnloadListeners();
});

/**
 * 設置頁面卸載和可見性監聽器
 * 確保在頁面卸載或隱藏時清理音效
 */
function setupPageUnloadListeners() {
  // 頁面卸載事件（beforeunload - 同步清理）
  window.addEventListener('beforeunload', () => {
    // beforeunload 中只能執行同步操作
    if (AppState.soundMixer) {
      AppState.soundMixer.stopAll();
    }
    if (AppState.audioEngine) {
      AppState.audioEngine.stopAll();
    }
  });

  // 頁面卸載事件（pagehide - 支持異步清理）
  window.addEventListener('pagehide', (event) => {
    // pagehide 支持異步操作，但時間有限
    // 使用 sendBeacon 或同步清理確保執行
    cleanupAudioResources().catch(() => {
      // 如果異步失敗，至少同步停止
      if (AppState.soundMixer) {
        AppState.soundMixer.stopAll();
      }
      if (AppState.audioEngine) {
        AppState.audioEngine.stopAll();
      }
    });
  });

  // 注意：不處理 visibilitychange 事件
  // 切換標籤時不應該清空聲色意境，讓音效和背景保持連續運行
  // 只有真正的頁面卸載（beforeunload、pagehide）才會清理資源

  console.log('✅ 頁面卸載監聽器已設置');
}

// 導出全局狀態（用於調試）
window.AppState = AppState;

// 導出 renderSoundControls 供編輯器使用
window.renderSoundControls = renderSoundControls;

// 導出 applyAtmosphereEntry 供編輯器使用（恢復聲色意境）
window.applyAtmosphereEntry = applyAtmosphereEntry;

