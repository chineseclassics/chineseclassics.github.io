/**
 * 時文寶鑑 - 主應用入口
 * 
 * 功能：
 * - 初始化 Supabase 客戶端
 * - 管理應用狀態和路由
 * - 處理用戶認證流程
 */

import { SUPABASE_CONFIG, RUN_MODE } from './config/supabase-config.js';
import { initializeEssayEditor } from './student/essay-writer.js';

// ================================
// 全局狀態管理
// ================================

const AppState = {
    supabase: null,
    currentUser: null,
    userRole: null, // 'teacher' | 'student' | 'anonymous'
    currentScreen: null,
    initialized: false
};

// ================================
// 初始化應用
// ================================

async function initializeApp() {
    console.log('🚀 時文寶鑑初始化開始...');
    console.log(`📍 運行模式: ${RUN_MODE}`);
    
    try {
        // 1. 初始化 Supabase 客戶端
        AppState.supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('✅ Supabase 客戶端初始化成功');
        
        // 2. 檢查現有會話
        const { data: { session }, error } = await AppState.supabase.auth.getSession();
        
        if (error) {
            console.error('❌ 獲取會話失敗:', error);
            showLoginScreen();
            return;
        }
        
        if (session) {
            console.log('✅ 發現現有會話');
            await handleAuthenticatedUser(session.user);
        } else {
            console.log('ℹ️ 無現有會話，顯示登錄頁面');
            showLoginScreen();
        }
        
        // 3. 設置認證狀態監聽器
        AppState.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔔 認證狀態變化:', event);
            
            if (event === 'SIGNED_IN' && session) {
                handleAuthenticatedUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                handleSignOut();
            }
        });
        
        // 4. 綁定登錄按鈕事件
        setupLoginHandlers();
        
        // 5. 綁定登出按鈕事件
        setupLogoutHandlers();
        
        AppState.initialized = true;
        console.log('✅ 應用初始化完成');
        
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        showError('應用初始化失敗，請重新整理頁面');
    }
}

// ================================
// 認證處理
// ================================

/**
 * 處理已認證用戶
 */
async function handleAuthenticatedUser(user) {
    console.log('👤 處理已認證用戶:', user.email || '匿名用戶');
    
    AppState.currentUser = user;
    
    // 確保 users 表中有記錄
    await ensureUserRecord(user);
    
    // 識別用戶角色
    AppState.userRole = detectUserRole(user);
    console.log('🎭 用戶角色:', AppState.userRole);
    
    // 根據角色顯示對應儀表板
    if (AppState.userRole === 'teacher') {
        await showTeacherDashboard();
    } else if (AppState.userRole === 'student') {
        await showStudentDashboard();
    } else {
        // 匿名用戶默認顯示學生界面（測試用）
        await showStudentDashboard();
    }
}

/**
 * 識別用戶角色
 */
function detectUserRole(user) {
    // 匿名用戶
    if (user.is_anonymous) {
        return 'anonymous';
    }
    
    const email = user.email;
    
    // 根據郵箱格式識別
    if (/@isf\.edu\.hk$/.test(email)) {
        return 'teacher';
    } else if (/@student\.isf\.edu\.hk$/.test(email)) {
        return 'student';
    }
    
    // 默認為學生（用於其他郵箱格式）
    return 'student';
}

/**
 * 確保 users 表中有用戶記錄
 */
async function ensureUserRecord(user) {
    try {
        // 檢查用戶是否已存在
        const { data: existingUser, error: checkError } = await AppState.supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
        
        if (existingUser) {
            console.log('✅ 用戶記錄已存在');
            return;
        }
        
        // 創建用戶記錄
        const userRole = detectUserRole(user);
        const userRecord = {
            id: user.id,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || (user.is_anonymous ? '匿名測試' : null),
            role: userRole === 'teacher' ? 'teacher' : 'student',
            user_type: user.is_anonymous ? 'anonymous' : 'google'
        };
        
        const { error: insertError } = await AppState.supabase
            .from('users')
            .insert(userRecord);
        
        if (insertError) {
            console.error('❌ 創建用戶記錄失敗:', insertError);
            // 不拋出錯誤，允許繼續（可能是權限問題）
            return;
        }
        
        console.log('✅ 已創建用戶記錄:', userRole);
        
    } catch (error) {
        console.error('❌ 確保用戶記錄異常:', error);
        // 不拋出錯誤，允許繼續
    }
}

/**
 * 處理登出
 */
function handleSignOut() {
    console.log('👋 用戶登出');
    
    AppState.currentUser = null;
    AppState.userRole = null;
    
    showLoginScreen();
}

// ================================
// 登錄處理器
// ================================

function setupLoginHandlers() {
    // Google 登錄
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // 匿名登錄
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }
}

/**
 * Google 登錄處理
 */
async function handleGoogleLogin() {
    console.log('🔐 開始 Google 登錄...');
    
    try {
        showLoading(true);
        
        const { data, error } = await AppState.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/shiwen-baojian/index.html',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        
        if (error) {
            console.error('❌ Google 登錄失敗:', error);
            showError('Google 登錄失敗: ' + error.message);
            showLoading(false);
            return;
        }
        
        console.log('✅ 正在重定向到 Google...');
        
    } catch (error) {
        console.error('❌ Google 登錄異常:', error);
        showError('Google 登錄失敗');
        showLoading(false);
    }
}

/**
 * 匿名登錄處理
 */
async function handleAnonymousLogin() {
    console.log('🎭 開始匿名登錄...');
    
    try {
        showLoading(true);
        
        const { data, error } = await AppState.supabase.auth.signInAnonymously();
        
        if (error) {
            console.error('❌ 匿名登錄失敗:', error);
            showError('匿名登錄失敗: ' + error.message);
            showLoading(false);
            return;
        }
        
        console.log('✅ 匿名登錄成功');
        
        // 確保 users 表中有記錄
        await ensureUserRecord(data.user);
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ 匿名登錄異常:', error);
        showError('匿名登錄失敗');
        showLoading(false);
    }
}

// ================================
// 登出處理器
// ================================

function setupLogoutHandlers() {
    // 老師端登出
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 學生端登出
    const studentLogoutBtn = document.getElementById('student-logout-btn');
    if (studentLogoutBtn) {
        studentLogoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * 登出處理
 */
async function handleLogout() {
    console.log('👋 開始登出...');
    
    try {
        showLoading(true);
        
        const { error } = await AppState.supabase.auth.signOut();
        
        if (error) {
            console.error('❌ 登出失敗:', error);
            showError('登出失敗: ' + error.message);
            showLoading(false);
            return;
        }
        
        console.log('✅ 登出成功');
        showLoading(false);
        
    } catch (error) {
        console.error('❌ 登出異常:', error);
        showError('登出失敗');
        showLoading(false);
    }
}

// ================================
// 頁面切換
// ================================

/**
 * 顯示登錄頁面
 */
function showLoginScreen() {
    hideAllScreens();
    document.getElementById('login-screen').classList.remove('hidden');
    AppState.currentScreen = 'login';
}

/**
 * 顯示老師儀表板
 */
async function showTeacherDashboard() {
    hideAllScreens();
    
    const dashboard = document.getElementById('teacher-dashboard');
    dashboard.classList.remove('hidden');
    
    // 更新用戶信息顯示
    const nameEl = document.getElementById('teacher-name');
    const emailEl = document.getElementById('teacher-email');
    
    if (nameEl) {
        nameEl.textContent = AppState.currentUser.user_metadata?.full_name || '老師';
    }
    if (emailEl) {
        emailEl.textContent = AppState.currentUser.email || '-';
    }
    
    AppState.currentScreen = 'teacher-dashboard';
}

/**
 * 顯示學生儀表板
 */
async function showStudentDashboard() {
    hideAllScreens();
    
    const dashboard = document.getElementById('student-dashboard');
    dashboard.classList.remove('hidden');
    
    // 更新用戶信息顯示
    const nameEl = document.getElementById('student-name');
    const emailEl = document.getElementById('student-email');
    
    if (nameEl) {
        nameEl.textContent = AppState.currentUser.user_metadata?.full_name || 
                             (AppState.userRole === 'anonymous' ? '匿名測試' : '學生');
    }
    if (emailEl) {
        emailEl.textContent = AppState.currentUser.email || '匿名用戶';
    }
    
    AppState.currentScreen = 'student-dashboard';
    
    // 初始化論文編輯器
    await initializeEssayEditor();
}

/**
 * 隱藏所有頁面
 */
function hideAllScreens() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('teacher-dashboard').classList.add('hidden');
    document.getElementById('student-dashboard').classList.add('hidden');
}

// ================================
// UI 輔助函數
// ================================

/**
 * 顯示/隱藏全局加載指示器
 */
function showLoading(show = true) {
    const loading = document.getElementById('global-loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

/**
 * 顯示錯誤消息
 */
function showError(message) {
    alert(message); // 臨時使用 alert，後續替換為更優雅的提示
}

// ================================
// 應用啟動
// ================================

// 等待 DOM 加載完成後初始化應用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// 導出供其他模組使用
export { AppState };

