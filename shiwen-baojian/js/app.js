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
import { applyParagraphAnchors } from './features/paragraph-anchors.js';
import TeacherDashboard from './teacher/teacher-dashboard.js';
import toast from './ui/toast.js';

// ================================
// 全局狀態管理
// ================================

const AppState = {
    supabase: null,
    currentUser: null,
    userRole: null, // 'teacher' | 'student' | 'anonymous'
    currentScreen: null,
    initialized: false,
    
    // ✅ 數據緩存
    cache: {
        // 靜態數據
        formatTemplates: {},           // { templateName: templateData }
        
        // 半靜態數據（可刷新）
        assignmentsList: [],           // 任務列表
        practiceEssaysList: [],        // 練筆列表
        classList: [],                 // 班級列表
        lastRefreshTime: null,         // 上次刷新時間
        
        // AI 反饋緩存（智能緩存）
        aiFeedbackCache: {},           // { paragraphId: { contentHash: xxx, feedback: {...} } }
    },
    
    // 當前編輯狀態
    currentAssignmentId: null,
    currentPracticeEssayId: null,
    currentEssayContent: null,
    currentPracticeContent: null,
    currentFormatSpec: null
};

// 暴露到 window 對象，供其他模組使用
window.AppState = AppState;

// ================================
// 初始化應用
// ================================

// 防止重複初始化的全局標誌
let appInitialized = false;
let appInitializing = false;

async function initializeApp() {
    // 防止重複初始化
    if (appInitialized || appInitializing) {
        console.warn('⚠️ 應用已初始化或正在初始化中，跳過重複調用');
        console.trace('調用堆棧：');
        return;
    }
    
    appInitializing = true;
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
            
            // 只在真正登入或登出時處理，忽略 token 刷新和初始會話事件
            if (event === 'SIGNED_IN' && session && !AppState.currentUser) {
                // 只有在沒有當前用戶時才處理（避免重複處理）
                handleAuthenticatedUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                handleSignOut();
            } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                // Token 刷新和初始會話不需要重新初始化界面
                console.log('ℹ️ Token 刷新或初始會話，無需重新初始化');
            }
        });
        
        // 4. 綁定登錄按鈕事件
        setupLoginHandlers();
        
        // 5. 綁定登出按鈕事件
        setupLogoutHandlers();
        
        AppState.initialized = true;
        appInitialized = true;  // 標記為已初始化
        console.log('✅ 應用初始化完成');
        
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        showError('應用初始化失敗，請重新整理頁面');
    } finally {
        appInitializing = false;  // 無論成功失敗都重置標誌
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
    console.log('🔍 開始檢查用戶記錄...', {
        userId: user.id,
        email: user.email,
        isAnonymous: user.is_anonymous
    });
    
    try {
        // 先通過 ID 查找
        let { data: existingUser, error: checkError } = await AppState.supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (checkError) {
            console.error('❌ 檢查用戶記錄失敗:', checkError);
        }
        
        // 如果通過 ID 沒找到，且有郵箱，嘗試通過郵箱查找（處理老師預先添加的情況）
        if (!existingUser && user.email && !user.is_anonymous) {
            console.log('🔍 通過郵箱查找已存在的記錄...');
            
            const { data: emailMatch, error: emailError } = await AppState.supabase
                .from('users')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();
            
            if (emailError) {
                console.error('❌ 通過郵箱查找失敗:', emailError);
            }
            
            if (emailMatch) {
                console.log('✅ 找到老師預先添加的記錄，更新 ID...');
                
                // 更新記錄的 ID 為 Auth ID，並更新其他信息
                const { error: updateError } = await AppState.supabase
                    .from('users')
                    .update({
                        id: user.id,
                        display_name: user.user_metadata?.full_name || emailMatch.display_name,
                        status: 'active',
                        last_login_at: new Date().toISOString()
                    })
                    .eq('email', user.email);
                
                if (updateError) {
                    console.error('❌ 更新用戶 ID 失敗:', updateError);
                } else {
                    console.log('✅ 已將預添加記錄與 Auth 用戶關聯');
                }
                
                return;
            }
        }
        
        if (existingUser) {
            console.log('✅ 用戶記錄已存在:', existingUser.id);
            
            // 檢測用戶角色（使用已有記錄的角色）
            const userRole = existingUser.role;
            
            // 更新最后登录时间和姓名（如果 Google 提供了新信息）
            const updates = {
                last_login_at: new Date().toISOString()
            };
            
            if (user.user_metadata?.full_name && existingUser.display_name !== user.user_metadata.full_name) {
                updates.display_name = user.user_metadata.full_name;
                console.log('🔄 更新用戶姓名為:', user.user_metadata.full_name);
            }
            
            if (existingUser.status === 'pending') {
                updates.status = 'active';
            }
            
            await AppState.supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);
            
            // 如果是學生，檢查是否有待激活的班級（即使用戶已存在）
            if (userRole === 'student' && user.email && !user.is_anonymous) {
                console.log('🔍 檢查待激活的班級（已有用戶）...');
                
                try {
                    const { data: activationResult, error: activateError } = await AppState.supabase
                        .rpc('activate_pending_student', {
                            student_email: user.email,
                            student_auth_id: user.id
                        });
                    
                    if (activateError) {
                        console.error('❌ 激活待加入班級失敗:', activateError);
                    } else if (activationResult && activationResult.length > 0 && activationResult[0].activated) {
                        console.log('✅ 已自動加入班級:', activationResult[0].class_ids);
                        console.log('📢', activationResult[0].display_name);
                    } else {
                        console.log('ℹ️ 無待加入班級');
                    }
                } catch (activateError) {
                    console.error('❌ 激活流程異常:', activateError);
                }
            }
            
            return;
        }
        
        console.log('📝 用戶記錄不存在，準備創建...');
        
        // 創建用戶記錄
        const userRole = detectUserRole(user);
        const userRecord = {
            id: user.id,
            email: user.email || `anonymous-${user.id}@test.local`,
            display_name: user.user_metadata?.full_name || (user.is_anonymous ? '匿名測試' : '學生'),
            role: userRole === 'teacher' ? 'teacher' : 'student',
            status: 'active',
            last_login_at: new Date().toISOString()
        };
        
        console.log('💾 準備插入用戶記錄:', userRecord);
        
        const { data: insertedUser, error: insertError } = await AppState.supabase
            .from('users')
            .insert(userRecord)
            .select();
        
        if (insertError) {
            console.error('❌ 創建用戶記錄失敗:', {
                error: insertError,
                message: insertError.message,
                code: insertError.code,
                details: insertError.details
            });
            return;
        }
        
        console.log('✅ 已創建用戶記錄:', {
            role: userRole,
            user: insertedUser
        });
        
        // 如果是学生，检查是否有待激活的班级（老师预先添加的邮箱）
        if (userRole === 'student' && user.email && !user.is_anonymous) {
            console.log('🔍 檢查待激活的班級...');
            
            try {
                const { data: activationResult, error: activateError } = await AppState.supabase
                    .rpc('activate_pending_student', {
                        student_email: user.email,
                        student_auth_id: user.id
                    });
                
                if (activateError) {
                    console.error('❌ 激活待加入班級失敗:', activateError);
                } else if (activationResult && activationResult.length > 0 && activationResult[0].activated) {
                    console.log('✅ 已自動加入班級:', activationResult[0].class_ids);
                    console.log('📢', activationResult[0].display_name);
                } else {
                    console.log('ℹ️ 無待加入班級');
                }
            } catch (activateError) {
                console.error('❌ 激活流程異常:', activateError);
            }
        }
        
    } catch (error) {
        console.error('❌ 確保用戶記錄異常:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
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
    
    // 初始化老師端功能
    await initializeTeacherModules();
}

/**
 * 初始化老師端功能模塊
 */
async function initializeTeacherModules() {
    console.log('📚 初始化老師端功能...');
    
    try {
        // 獲取老師儀表板容器
        const container = document.getElementById('teacher-dashboard-content');
        
        if (!container) {
            console.error('❌ 找不到老師儀表板容器');
            return;
        }
        
        // 創建並初始化老師端儀表板
        const teacherDashboard = new TeacherDashboard(AppState.supabase);
        await teacherDashboard.initialize(container);
        
        console.log('✅ 老師端功能初始化完成');
        
    } catch (error) {
        console.error('❌ 老師端功能初始化失敗:', error);
        showError('老師端功能初始化失敗: ' + error.message);
    }
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
    
    // ✅ 修改：先顯示任務列表，而非直接顯示編輯器
    await initializeStudentModules();
}

/**
 * 初始化學生端功能模組
 */
async function initializeStudentModules() {
    console.log('📚 初始化學生端功能...');
    
    try {
        // ✅ 清理所有編輯狀態（返回列表時重置）
        AppState.currentAssignmentId = null;
        AppState.currentPracticeEssayId = null;
        AppState.currentFormatSpec = null;
        AppState.currentEssayContent = null;  // ✅ 清除任務內容
        AppState.currentPracticeContent = null;  // ✅ 清除練筆內容
        
        // ✅ 同時清理 essay-storage 的狀態和 localStorage
        const { StorageState } = await import('./student/essay-storage.js');
        if (StorageState) {
            StorageState.currentEssayId = null;
        }
        localStorage.removeItem('current-essay-id');  // ✅ 清除 localStorage 中的 essay ID
        
        const container = document.getElementById('student-dashboard-content');
        if (!container) {
            console.error('❌ 找不到學生儀表板容器');
            // 降級：使用舊的編輯器初始化
            await initializeEssayEditor();
            const { initializeAntiCheat } = await import('./features/anti-cheat.js');
            initializeAntiCheat();
            return;
        }
        
        // 動態加載任務查看器
        const { default: StudentAssignmentViewer } = await import('./student/assignment-viewer.js');
        const assignmentViewer = new StudentAssignmentViewer(AppState.supabase);
        await assignmentViewer.render(container);
        
        // 初始化防作弊系統
        const { initializeAntiCheat } = await import('./features/anti-cheat.js');
        initializeAntiCheat();

        // 設置學生端導航（只綁定一次）
        setupStudentNavigation();
        
        console.log('✅ 學生端功能初始化完成');
    } catch (error) {
        console.error('❌ 學生端功能初始化失敗:', error);
        showError('學生端功能初始化失敗: ' + error.message);
    }
}

/**
 * 顯示任務列表（不重新初始化所有模組）
 * @param {boolean} forceRefresh - 是否強制刷新（不使用緩存）
 */
async function showAssignmentList(forceRefresh = false) {
    console.log('📋 顯示任務列表...', forceRefresh ? '（強制刷新）' : '');
    
    try {
        // ✅ 清理編輯狀態
        AppState.currentAssignmentId = null;
        AppState.currentPracticeEssayId = null;
        AppState.currentFormatSpec = null;
        AppState.currentEssayContent = null;
        AppState.currentPracticeContent = null;
        
        // ✅ 清理 essay-storage 的狀態
        const { StorageState } = await import('./student/essay-storage.js');
        if (StorageState) {
            StorageState.currentEssayId = null;
        }
        localStorage.removeItem('current-essay-id');
        
        const container = document.getElementById('student-dashboard-content');
        if (!container) {
            console.error('❌ 找不到學生儀表板容器');
            return;
        }
        
        // ✅ 重新渲染任務列表（可選擇是否使用緩存）
        const { default: StudentAssignmentViewer } = await import('./student/assignment-viewer.js');
        const assignmentViewer = new StudentAssignmentViewer(AppState.supabase);
        
        // 直接調用 render 會使用緩存，我們需要手動控制
        assignmentViewer.container = container;
        assignmentViewer.practiceEssays = [];
        await assignmentViewer.loadAndRenderAssignments(!forceRefresh);  // 反轉參數：forceRefresh=true → useCache=false
        
        console.log('✅ 任務列表顯示完成');
    } catch (error) {
        console.error('❌ 顯示任務列表失敗:', error);
        showError('顯示任務列表失敗: ' + error.message);
    }
}

/**
 * 設置學生端導航
 */
let navigationHandlerBound = false;  // ✅ 防止重複綁定
let isNavigating = false;  // ✅ 防止導航循環

function setupStudentNavigation() {
    // ✅ 只綁定一次事件監聽器
    if (navigationHandlerBound) {
        console.log('⏸️ 導航處理器已綁定，跳過');
        return;
    }
    
    window.addEventListener('navigate', async (e) => {
        // ✅ 防止重複導航
        if (isNavigating) {
            console.log('⏸️ 正在導航中，跳過重複請求');
            return;
        }
        
        const { page, assignmentId, mode, formatTemplate, essayId, forceRefresh, editable } = e.detail;
        
        console.log('🧭 學生端導航:', { page, assignmentId, mode, formatTemplate, essayId, forceRefresh, editable });
        
        isNavigating = true;
        
        try {
            if (page === 'essay-writer') {
                await showEssayEditor(assignmentId, mode, formatTemplate, essayId, editable !== undefined ? editable : true);
            } else if (page === 'assignment-list') {
                // ✅ 支持強制刷新參數（如從練筆模式返回）
                await showAssignmentList(forceRefresh || false);
            }
        } finally {
            isNavigating = false;
        }
    });
    
    navigationHandlerBound = true;
    console.log('✅ 學生端導航處理器已綁定');
}

/**
 * 顯示論文編輯器
 * @param {string} assignmentId - 任務 ID（可選，自主練筆時為 null）
 * @param {string} mode - 寫作模式：'assignment'（任務）或 'free-writing'（自主練筆）
 * @param {string} formatTemplate - 格式模板（如 'honglou'）
 * @param {string} essayId - 作業 ID（繼續編輯現有練筆時使用）
 */
async function showEssayEditor(assignmentId = null, mode = null, formatTemplate = null, essayId = null, editable = true) {
    // ✅ 根據參數自動判斷模式
    if (!mode) {
        mode = assignmentId ? 'assignment' : 'free-writing';
    }
    try {
        const container = document.getElementById('student-dashboard-content');
        if (!container) {
            console.error('❌ 找不到學生儀表板容器');
            return;
        }

        // 從 template 獲取編輯器 HTML
        const template = document.getElementById('essay-editor-template');
        if (!template) {
            console.error('❌ 找不到論文編輯器模板');
            return;
        }

        // 清空容器並插入編輯器 HTML
        container.innerHTML = '';
        const editorContent = template.content.cloneNode(true);
        container.appendChild(editorContent);

        console.log('📝 準備初始化論文編輯器', { assignmentId, mode, formatTemplate, essayId });

        // 保存當前任務 ID 到 AppState（用於區分任務寫作和練筆）
        if (assignmentId) {
            // 有 assignmentId 就是任務模式
            AppState.currentAssignmentId = assignmentId;
            AppState.currentPracticeEssayId = null;  // 清除練筆 ID
            console.log('📋 任務寫作模式，任務 ID:', assignmentId);
        } else if (mode === 'free-writing') {
            // 明確的練筆模式
            AppState.currentAssignmentId = null;  // 清除任務 ID
            console.log('✍️ 自主練筆模式');
            // essayId 會在 loadPracticeEssayContent 中設置
        } else {
            // 兜底：清除所有 ID
            AppState.currentAssignmentId = null;
            AppState.currentPracticeEssayId = null;
        }

        // 綁定返回按鈕
        const backBtn = container.querySelector('#back-to-list-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                console.log('🔙 返回任務列表');
                
                // ✅ 清除緩存並強制刷新（確保看到最新狀態）
                AppState.cache.assignmentsList = [];
                AppState.cache.practiceEssaysList = [];
                AppState.cache.lastRefreshTime = null;
                console.log('🗑️ 已清除任務列表緩存');
                
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { 
                        page: 'assignment-list',
                        forceRefresh: true // 總是強制刷新
                    }
                }));
            });
        }

        // 綁定展開/收起按鈕
        const toggleBtn = container.querySelector('#toggle-description-btn');
        const collapseBtn = container.querySelector('#collapse-description-btn');  // 底部收起按鈕
        const descArea = container.querySelector('#assignment-description-area');
        
        if (mode === 'free-writing') {
            // 自主練筆模式：顯示不同的提示
            const titleEl = container.querySelector('#assignment-title');
            if (titleEl) {
                titleEl.innerHTML = '<i class="fas fa-feather-alt mr-2"></i>自主練筆';
            }
            
            const descEl = container.querySelector('#assignment-description');
            if (descEl) {
                descEl.innerHTML = `
                    <div class="space-y-2">
                        <p>📝 這是您的自由創作空間</p>
                        <p>💡 當前使用格式：<strong>《紅樓夢》論文格式</strong></p>
                        <p>🎯 您可以選擇任何主題進行寫作練習</p>
                    </div>
                `;
            }
            
        }
        
        // 定義展開和收起的函數（需要在自主練筆模式之後定義，因為要用到 toggleBtn）
        const expandDescription = () => {
            descArea.classList.remove('hidden');
            const btnIcon = toggleBtn.querySelector('i');
            const btnText = toggleBtn.querySelector('span');
            if (btnIcon) {
                btnIcon.classList.remove('fa-chevron-down');
                btnIcon.classList.add('fa-chevron-up');
            }
            if (btnText) {
                btnText.textContent = '收起指引';
            }
        };
        
        const collapseDescription = () => {
            descArea.classList.add('hidden');
            const btnIcon = toggleBtn.querySelector('i');
            const btnText = toggleBtn.querySelector('span');
            if (btnIcon) {
                btnIcon.classList.remove('fa-chevron-up');
                btnIcon.classList.add('fa-chevron-down');
            }
            if (btnText) {
                btnText.textContent = '查看寫作指引';
            }
        };
        
        // 綁定頂部切換按鈕
        if (toggleBtn && descArea) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = descArea.classList.contains('hidden');
                if (isHidden) {
                    expandDescription();
                } else {
                    collapseDescription();
                }
            });
        }
        
        // 綁定底部收起按鈕
        if (collapseBtn && descArea) {
            collapseBtn.addEventListener('click', () => {
                collapseDescription();
                // 滾動到頂部，讓用戶看到已收起
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        // 自主練筆模式：默認展開指引
        if (mode === 'free-writing' && descArea && toggleBtn) {
            expandDescription();
        }

        // 加載任務數據或格式模板
        if (mode === 'free-writing') {
            // 自主練筆模式：加載格式模板
            await loadFormatTemplate(formatTemplate || 'honglou');
            
            // 如果是繼續編輯現有練筆，加載內容
            if (essayId) {
                await loadPracticeEssayContent(essayId);
            }
        } else if (assignmentId) {
            // 任務模式：加載任務數據和學生已有的作業（如果存在）
            console.log('📂 加載任務數據:', assignmentId);
            await loadAssignmentData(assignmentId);
            await loadStudentEssayForAssignment(assignmentId);
        }

        // 初始化論文編輯器（強制重新初始化）
        await initializeEssayEditor(true);

        // 等待編輯器完全準備好（DOM 渲染完成）
        await new Promise(resolve => setTimeout(resolve, 100));

        // ✅ 只在對應模式下恢復內容
        if (mode === 'assignment' && AppState.currentEssayContent) {
            console.log('📂 恢復任務作業內容...');
            await restoreEssayContent(AppState.currentEssayContent);
        } else if (mode === 'free-writing' && AppState.currentPracticeContent) {
            console.log('📂 恢復練筆內容...');
            await restoreEssayContent(AppState.currentPracticeContent);
        } else if (mode === 'free-writing' && !essayId) {
            console.log('✨ 新練筆模式，內容為空');
            // 新練筆，不恢復任何內容
        }
        
        // ✅ 嘗試錨定段落（若 DB 已有 paragraphs），讓編輯/檢視模式都具備精準容器
        try {
            const { StorageState } = await import('./student/essay-storage.js');
            const eid = StorageState.currentEssayId;
            if (eid) {
                const { data: paras } = await AppState.supabase
                    .from('paragraphs')
                    .select('id, order_index, paragraph_type')
                    .eq('essay_id', eid)
                    .order('order_index');
                if (Array.isArray(paras) && paras.length > 0) {
                    const { applyParagraphAnchors } = await import('./features/paragraph-anchors.js');
                    await applyParagraphAnchors(paras);
                }
            }
        } catch (anchorErr) {
            console.warn('⚠️ 還原後段落錨定失敗（可忽略）:', anchorErr?.message);
        }
        
        // ✅ 設置狀態顯示（只在任務模式）
        if (mode === 'assignment') {
            await setupEssayStatus(assignmentId, editable);
        }
        
        // ✅ 隱藏右側的提交區域（提交功能在列表卡片上）
        const submissionSection = document.getElementById('submission-section');
        if (submissionSection) {
            submissionSection.classList.add('hidden');
        }

        // ✅ 初始化學生端批注系統（如果是任務模式且已提交）
        if (mode === 'assignment' && !editable) {
            await initializeStudentAnnotationSystem(assignmentId);
        }
        
        // ✅ 初始化批注重新定位系統（如果是編輯模式）
        if (mode === 'assignment' && editable) {
            await initializeAnnotationRepositioningSystem(assignmentId);
        }

        console.log('✅ 論文編輯器顯示完成');
    } catch (error) {
        console.error('❌ 顯示論文編輯器失敗:', error);
        showError('無法加載論文編輯器: ' + error.message);
    }
}

/**
 * 初始化學生端批注系統
 */
async function initializeStudentAnnotationSystem(assignmentId) {
    try {
        console.log('🚀 初始化學生端批注系統:', assignmentId);
        
        // 動態導入學生端批注查看器（V2）
        const { default: StudentAnnotationViewer } = await import('./student/student-annotation-viewer.v2.js');
        
        // 獲取當前作業的段落信息
        const { data: essay, error: essayError } = await AppState.supabase
            .from('essays')
            .select(`
                id,
                paragraphs (
                    id,
                    order_index,
                    paragraph_type
                )
            `)
            .eq('assignment_id', assignmentId)
            .eq('student_id', AppState.currentUser.id)
            .single();
            
        if (essayError) {
            console.error('❌ 獲取作業信息失敗:', essayError);
            return;
        }
        
        if (!essay || !essay.paragraphs || essay.paragraphs.length === 0) {
            console.log('ℹ️ 沒有找到段落，跳過批注系統初始化');
            return;
        }
        
        // 在初始化批註前，先將段落 ID/順序錨定到 DOM
        try {
            await applyParagraphAnchors(essay.paragraphs || []);
        } catch (anchorErr) {
            console.warn('⚠️ 段落錨定失敗，將回退使用全篇容器對齊：', anchorErr?.message);
        }

        // 創建批注查看器（單一實例）
        const annotationViewer = new StudentAnnotationViewer(AppState.supabase);

        // 解析模式（submitted/view, draft/edit, graded/readonly）
        const mode = await resolveStudentAnnotationMode(essay.id);
        await annotationViewer.init(essay.id, essay.paragraphs, mode);
        
        // 將批注查看器保存到全局狀態
        window.studentAnnotationViewer = annotationViewer;
        
        console.log('✅ 學生端批注系統初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化學生端批注系統失敗:', error);
    }
}

/**
 * 解析學生端批註模式
 * - submitted 未評分：view
 * - draft：edit
 * - graded：readonly
 */
async function resolveStudentAnnotationMode(essayId) {
    try {
        const { data: essay, error } = await AppState.supabase
            .from('essays')
            .select('status')
            .eq('id', essayId)
            .single();
        if (error) throw error;
        const status = (essay?.status || 'draft').toLowerCase();
        if (status === 'graded') return 'readonly';
        if (status === 'draft') return 'edit';
        // submitted（未評分）
        return 'view';
    } catch (e) {
        console.warn('⚠️ 解析批註模式失敗，預設為 view:', e?.message);
        return 'view';
    }
}

// applyParagraphAnchors 已抽取至 features/paragraph-anchors.js

/**
 * 初始化批注重新定位系統
 */
async function initializeAnnotationRepositioningSystem(assignmentId) {
    try {
        console.log('🚀 初始化批注重新定位系統:', assignmentId);
        
        // 動態導入批注重新定位管理器
        const { default: AnnotationRepositioningManager } = await import('./features/annotation-repositioning.js');
        
        // 獲取當前作業信息
        const { data: essay, error: essayError } = await AppState.supabase
            .from('essays')
            .select('id')
            .eq('assignment_id', assignmentId)
            .eq('student_id', AppState.currentUser.id)
            .single();
            
        if (essayError) {
            console.error('❌ 獲取作業信息失敗:', essayError);
            return;
        }
        
        if (!essay) {
            console.log('ℹ️ 沒有找到作業，跳過批注重新定位系統初始化');
            return;
        }
        
        // 創建批注重新定位管理器
        const repositioningManager = new AnnotationRepositioningManager(AppState.supabase);
        await repositioningManager.init(essay.id);
        
        // 將管理器保存到全局狀態
        window.annotationRepositioningManager = repositioningManager;
        
        console.log('✅ 批注重新定位系統初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化批注重新定位系統失敗:', error);
    }
}

/**
 * 加載任務數據
 */
async function loadAssignmentData(assignmentId) {
    try {
        // 關聯查詢 format_specifications 表（引用模式）
        const { data: assignment, error } = await AppState.supabase
            .from('assignments')
            .select(`
                *,
                format_specifications (
                    id,
                    name,
                    human_input,
                    spec_json
                )
            `)
            .eq('id', assignmentId)
            .single();

        if (error) throw error;

        // 更新任務標題
        const titleEl = document.getElementById('assignment-title');
        if (titleEl) {
            titleEl.textContent = assignment.title || '未命名任務';
        }

        // 更新寫作指引（自然語言顯示）
        const descEl = document.getElementById('assignment-description');
        if (descEl && assignment.format_specifications) {
            // 顯示 human_input（AI 優化後的結構化文本）
            // ✅ 保留換行符：使用 white-space: pre-wrap 來保留所有空白和換行
            const humanInput = assignment.format_specifications.human_input || '老師未提供寫作指引。';
            descEl.textContent = humanInput;
            descEl.style.whiteSpace = 'pre-wrap';  // 保留換行和空白，但允許自動換行
            
            // 保存 spec_json 到 AppState（供 AI 反饋使用）
            if (assignment.format_specifications.spec_json) {
                AppState.currentFormatSpec = assignment.format_specifications.spec_json;
                console.log('✅ 格式規範已加載（供 AI 反饋使用）');
            }
        } else if (descEl) {
            descEl.textContent = '老師未提供寫作指引。';
        }

        console.log('✅ 任務數據加載完成:', assignment.title);
    } catch (error) {
        console.error('❌ 加載任務數據失敗:', error);
        // 不阻斷編輯器加載，只記錄錯誤
    }
}

/**
 * 加載格式模板（用於自主練筆）
 */
async function loadFormatTemplate(templateName) {
    try {
        console.log('📋 加載格式模板:', templateName);
        
        // ✅ 先檢查內存緩存
        if (AppState.cache.formatTemplates[templateName]) {
            console.log('📦 使用緩存的格式模板:', templateName);
            AppState.currentFormatSpec = AppState.cache.formatTemplates[templateName];
            return;
        }
        
        // ✅ 檢查 localStorage 緩存
        const cachedTemplate = localStorage.getItem(`format-template-${templateName}`);
        if (cachedTemplate) {
            try {
                const formatSpec = JSON.parse(cachedTemplate);
                console.log('📦 從 localStorage 恢復格式模板:', templateName);
                AppState.currentFormatSpec = formatSpec;
                AppState.cache.formatTemplates[templateName] = formatSpec;
                return;
            } catch (e) {
                console.warn('⚠️ localStorage 緩存解析失敗，重新加載');
            }
        }
        
        // 從網絡加載
        const formatTemplates = {
            'honglou': '/shiwen-baojian/assets/data/honglou-essay-format.json',
            // 預留：將來可以添加更多格式
            // 'classical': '...',
            // 'modern': '...'
        };
        
        const templatePath = formatTemplates[templateName];
        if (!templatePath) {
            console.warn('⚠️ 未知的格式模板:', templateName);
            return;
        }
        
        const response = await fetch(templatePath);
        if (response.ok) {
            const formatSpec = await response.json();
            
            // ✅ 三層緩存
            AppState.currentFormatSpec = formatSpec;                              // 當前使用
            AppState.cache.formatTemplates[templateName] = formatSpec;            // 內存緩存
            localStorage.setItem(`format-template-${templateName}`, JSON.stringify(formatSpec));  // 持久化緩存
            
            console.log('✅ 格式模板加載完成並已緩存:', formatSpec.title);
        }
    } catch (error) {
        console.error('❌ 加載格式模板失敗:', error);
        // 不阻斷編輯器，只記錄錯誤
    }
}

/**
 * 加載練筆作品內容（用於繼續編輯）
 */
async function loadPracticeEssayContent(essayId) {
    try {
        console.log('📂 加載練筆作品:', essayId);
        
        const { data: essay, error } = await AppState.supabase
            .from('essays')
            .select('*')
            .eq('id', essayId)
            .single();

        if (error) throw error;

        // 存儲當前練筆 ID 到 AppState
        AppState.currentPracticeEssayId = essayId;

        // 更新任務標題
        const titleEl = document.getElementById('assignment-title');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-feather-alt mr-2"></i>${essay.title || '未命名練筆'}`;
        }

        // TODO: 加載練筆內容到編輯器
        // 這需要在 essay-writer.js 中實現內容恢復功能
        AppState.currentPracticeContent = essay.content_json ? JSON.parse(essay.content_json) : null;

        console.log('✅ 練筆作品數據加載完成');
    } catch (error) {
        console.error('❌ 加載練筆作品失敗:', error);
        showError('無法加載練筆作品: ' + error.message);
    }
}

/**
 * 加載學生對某個任務的已有作業（用於繼續編輯任務）
 */
async function loadStudentEssayForAssignment(assignmentId) {
    try {
        console.log('📂 查找任務的已有作業:', assignmentId);
        
        const { data: { user } } = await AppState.supabase.auth.getUser();
        
        const { data: essay, error } = await AppState.supabase
            .from('essays')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('student_id', user.id)
            .maybeSingle();

        if (error) throw error;

        if (essay) {
            console.log('✅ 找到已有作業，將繼續編輯:', essay.id);
            // 保存 essay ID 供後續更新使用
            const { StorageState } = await import('./student/essay-storage.js');
            StorageState.currentEssayId = essay.id;
            
            // 解析並保存作業內容
            AppState.currentEssayContent = essay.content_json ? JSON.parse(essay.content_json) : null;
            console.log('📋 已加載作業內容，字數:', essay.total_word_count);
        } else {
            console.log('ℹ️ 這是新的任務作業，將創建新記錄');
            const { StorageState } = await import('./student/essay-storage.js');
            StorageState.currentEssayId = null;
            AppState.currentEssayContent = null;
        }
    } catch (error) {
        console.error('❌ 加載任務作業失敗:', error);
        // 不阻斷編輯器加載
    }
}

/**
 * 設置作業狀態顯示（只在任務模式）
 */
async function setupEssayStatus(assignmentId, editable = true) {
    try {
        const statusText = document.getElementById('essay-status-text');
        const statusDisplay = document.getElementById('essay-status-display');
        
        // 獲取當前作業狀態
        const { StorageState } = await import('./student/essay-storage.js');
        const essayId = StorageState.currentEssayId;
        
        if (!essayId) {
            // 新作業，顯示草稿狀態
            if (statusText) statusText.textContent = '草稿';
            return;
        }
        
        // 從數據庫獲取最新狀態
        const { data: essay } = await AppState.supabase
            .from('essays')
            .select('status, submitted_at')
            .eq('id', essayId)
            .single();
            
        if (!essay) {
            if (statusText) statusText.textContent = '草稿';
            return;
        }
        
        // 更新狀態顯示
        if (essay.status === 'submitted') {
            if (statusText) {
                statusText.textContent = '已提交（可修改）';
                statusText.classList.add('text-blue-600', 'font-semibold');
            }
            if (statusDisplay) {
                const icon = statusDisplay.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-edit text-blue-600 text-xs';
                }
            }
            
            // 檢查是否有批注並顯示提示
            const hasAnnotations = await checkHasAnnotations(essayId);
            if (hasAnnotations) {
                showAnnotationNotice();
            }
        } else if (essay.status === 'graded') {
            if (statusText) {
                statusText.textContent = '已批改（只讀）';
                statusText.classList.add('text-amber-700', 'font-semibold');
            }
            if (statusDisplay) {
                const icon = statusDisplay.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check-circle text-amber-700 text-xs';
                }
            }
            
            // ✅ 如果已批改，顯示老師的評分和評語（替換「賈雨村說」）
            await displayTeacherGrading(essayId);
            
            // 只讀模式：只有 graded 狀態才禁用編輯功能
            console.log('📖 已批改狀態：禁用編輯功能');
            disableEditing();
        } else {
            // 草稿狀態
            if (statusText) {
                statusText.textContent = '草稿';
                statusText.classList.remove('text-blue-600', 'text-amber-700', 'font-semibold');
            }
            if (statusDisplay) {
                const icon = statusDisplay.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-file-alt text-gray-600 text-xs';
                }
            }
        }
        
    } catch (error) {
        console.error('❌ 設置狀態顯示失敗:', error);
    }
}

/**
 * 檢查論文是否有老師批注
 */
async function checkHasAnnotations(essayId) {
    try {
        // 查詢該論文的所有段落
        const { data: paragraphs } = await AppState.supabase
            .from('paragraphs')
            .select('id')
            .eq('essay_id', essayId);
        
        if (!paragraphs || paragraphs.length === 0) return false;
        
        const paragraphIds = paragraphs.map(p => p.id);
        const { data: annotations } = await AppState.supabase
            .from('annotations')
            .select('id')
            .in('paragraph_id', paragraphIds)
            .limit(1);
        
        return annotations && annotations.length > 0;
    } catch (error) {
        console.error('❌ 檢查批注失敗:', error);
        return false;
    }
}

/**
 * 顯示批注提示
 */
function showAnnotationNotice() {
    const container = document.getElementById('student-dashboard-content');
    if (!container) return;
    
    // 檢查是否已存在
    if (container.querySelector('.annotation-notice')) {
        console.log('⏸️ 批注提示已存在，跳過創建');
        return;
    }
    
    const notice = document.createElement('div');
    notice.className = 'annotation-notice bg-blue-50 border-l-4 border-blue-500 p-4 mb-4';
    notice.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-comment-dots text-blue-700"></i>
            <span class="text-blue-800 font-medium">老師已添加批注，您可以根據批注修改論文後重新提交</span>
        </div>
    `;
    
    const assignmentInfo = container.querySelector('#assignment-info-panel');
    if (assignmentInfo) {
        assignmentInfo.after(notice);
    }
}

/**
 * 禁用編輯功能（只讀模式）
 */
function disableEditing() {
    // 禁用所有輸入和編輯器
    const inputs = document.querySelectorAll('#essay-title, #essay-subtitle, input[id*="-title"]');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.opacity = '0.6';
    });
    
    // 禁用所有按鈕（除了返回按鈕）
    const buttons = document.querySelectorAll('#student-dashboard-content button:not(#back-to-list-btn):not(#toggle-description-btn):not(#collapse-description-btn)');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Quill 編輯器設為只讀（需要在編輯器初始化後設置）
    setTimeout(() => {
        const quillEditors = document.querySelectorAll('.ql-editor');
        quillEditors.forEach(editor => {
            editor.setAttribute('contenteditable', 'false');
            editor.style.opacity = '0.8';
            editor.style.backgroundColor = '#f9f9f9';
        });
    }, 500);
    
    // 顯示只讀提示（避免重複創建）
    const container = document.getElementById('student-dashboard-content');
    if (container) {
        // 檢查是否已存在只讀提示
        const existingNotice = container.querySelector('.readonly-notice');
        if (existingNotice) {
            console.log('⏸️ 只讀提示已存在，跳過創建');
            return;
        }
        
        const notice = document.createElement('div');
        notice.className = 'readonly-notice bg-amber-50 border-l-4 border-amber-500 p-4 mb-4';
        notice.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-eye text-amber-700"></i>
                <span class="text-amber-800 font-medium">只讀模式：此作業已批改，無法編輯</span>
            </div>
        `;
        const assignmentInfo = container.querySelector('#assignment-info-panel');
        if (assignmentInfo) {
            assignmentInfo.after(notice);
        }
    }
}

/**
 * 恢復作業內容到編輯器
 */
async function restoreEssayContent(contentData) {
    try {
        if (!contentData) {
            console.log('ℹ️ 沒有內容需要恢復');
            return;
        }
        
        console.log('🔄 開始恢復內容到編輯器...', contentData);
        
        // 動態導入 essay-writer 模組獲取編輯器實例
        const { getEditorByParagraphId } = await import('./student/essay-writer.js');
        
        // 1. 恢復標題和副標題
        const titleInput = document.getElementById('essay-title');
        const subtitleInput = document.getElementById('essay-subtitle');
        
        if (titleInput && contentData.title) {
            titleInput.value = contentData.title;
            console.log('✅ 已恢復標題:', contentData.title);
        }
        if (subtitleInput && contentData.subtitle) {
            subtitleInput.value = contentData.subtitle;
            console.log('✅ 已恢復副標題:', contentData.subtitle);
        }
        
        // 2. 恢復引言
        if (contentData.introduction) {
            const introEditor = getEditorByParagraphId('intro');
            if (introEditor) {
                introEditor.setHTML(contentData.introduction);
                console.log('✅ 已恢復引言內容');
            } else {
                console.warn('⚠️ 找不到引言編輯器');
            }
        }
        
        // 3. 恢復結論
        if (contentData.conclusion) {
            const conclusionEditor = getEditorByParagraphId('conclusion');
            if (conclusionEditor) {
                conclusionEditor.setHTML(contentData.conclusion);
                console.log('✅ 已恢復結論內容');
            } else {
                console.warn('⚠️ 找不到結論編輯器');
            }
        }
        
        // 4. 恢復分論點
        if (contentData.arguments && contentData.arguments.length > 0) {
            console.log(`🔄 開始恢復 ${contentData.arguments.length} 個分論點...`);
            
            // 動態導入分論點管理函數
            const { addArgument, addParagraph, EditorState } = await import('./student/essay-writer.js');
            
            // 為每個分論點創建結構並填充內容
            for (let i = 0; i < contentData.arguments.length; i++) {
                const argData = contentData.arguments[i];
                
                // 1. 創建新的分論點
                addArgument();
                
                // 等待 DOM 更新
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 2. 獲取剛創建的分論點
                const currentArg = EditorState.arguments[EditorState.arguments.length - 1];
                
                if (!currentArg) {
                    console.error(`❌ 無法獲取第 ${i + 1} 個分論點`);
                    continue;
                }
                
                // 3. 填充分論點標題
                if (argData.title) {
                    const titleInput = document.getElementById(`${currentArg.id}-title`);
                    if (titleInput) {
                        titleInput.value = argData.title;
                        console.log(`✅ 已恢復分論點 ${i + 1} 標題:`, argData.title);
                    }
                }
                
                // 4. 恢復段落（第一個段落已經自動創建）
                if (argData.paragraphs && argData.paragraphs.length > 0) {
                    // 填充第一個段落
                    if (currentArg.paragraphs.length > 0) {
                        const firstPara = currentArg.paragraphs[0];
                        if (firstPara.editor && argData.paragraphs[0].content) {
                            firstPara.editor.setHTML(argData.paragraphs[0].content);
                            console.log(`✅ 已恢復分論點 ${i + 1} 的第 1 個段落`);
                        }
                    }
                    
                    // 創建並填充其他段落
                    for (let j = 1; j < argData.paragraphs.length; j++) {
                        const paraData = argData.paragraphs[j];
                        
                        // 添加新段落
                        addParagraph(currentArg.id);
                        
                        // 等待 DOM 更新
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // 填充段落內容
                        const para = currentArg.paragraphs[j];
                        if (para && para.editor && paraData.content) {
                            para.editor.setHTML(paraData.content);
                            console.log(`✅ 已恢復分論點 ${i + 1} 的第 ${j + 1} 個段落`);
                        }
                    }
                }
            }
            
            console.log(`✅ 已恢復 ${contentData.arguments.length} 個分論點`);
        }
        
        console.log('✅ 內容恢復完成');
    } catch (error) {
        console.error('❌ 恢復內容失敗:', error);
    }
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
    toast.error(message);
}

// ================================
// 應用啟動
// ================================

/**
 * 顯示老師的評分和評語（替換「賈雨村說」側邊欄）
 */
async function displayTeacherGrading(essayId) {
    try {
        console.log('📊 加載老師評分:', essayId);
        
        // 查詢老師的評分
        const { data: grade, error } = await AppState.supabase
            .from('grades')
            .select(`
                *,
                teacher:users!teacher_id(display_name)
            `)
            .eq('essay_id', essayId)
            .eq('status', 'final')
            .maybeSingle();
        
        if (error) {
            console.error('❌ 查詢評分失敗:', error);
            return;
        }
        
        if (!grade) {
            console.log('ℹ️ 還沒有評分記錄');
            return;
        }
        
        console.log('✅ 找到老師評分:', grade);
        
        // 獲取側邊欄容器
        const sidebar = document.getElementById('ai-feedback-sidebar');
        if (!sidebar) {
            console.warn('⚠️ 找不到側邊欄容器');
            return;
        }
        
        // 計算總分
        const scores = [];
        if (grade.criterion_a_score !== null) scores.push({ code: 'A', name: '分析', score: grade.criterion_a_score });
        if (grade.criterion_b_score !== null) scores.push({ code: 'B', name: '組織', score: grade.criterion_b_score });
        if (grade.criterion_c_score !== null) scores.push({ code: 'C', name: '創作', score: grade.criterion_c_score });
        if (grade.criterion_d_score !== null) scores.push({ code: 'D', name: '語言', score: grade.criterion_d_score });
        
        const totalScore = grade.total_score || scores.reduce((sum, s) => sum + s.score, 0);
        const maxScore = scores.length * 8;
        
        // 替換側邊欄內容為老師評分
        sidebar.innerHTML = `
            <!-- 側邊欄標題 -->
            <div class="premium-blue-gradient px-4 py-3">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-chalkboard-teacher text-xl text-amber-100"></i>
                    <h3 class="font-bold text-xl text-amber-50" style="letter-spacing: 0.1em;">老師評分</h3>
                </div>
            </div>
            
            <!-- 可滾動內容區域 -->
            <div class="max-h-[calc(100vh-200px)] overflow-y-auto">
                <!-- 總分顯示 -->
                <div class="bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-6 text-center text-white">
                    <div class="text-sm mb-2 opacity-90">總分</div>
                    <div class="text-5xl font-bold mb-1">${totalScore}</div>
                    <div class="text-sm opacity-90">/ ${maxScore} 分</div>
                </div>
                
                <!-- 各標準評分 -->
                <div class="p-4 space-y-3">
                    ${scores.map(s => `
                        <div class="bg-gradient-to-r from-stone-100 to-stone-200 rounded-lg p-3 border-l-4 border-stone-600">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-semibold text-gray-700">標準 ${s.code}：${s.name}</span>
                                <span class="text-2xl font-bold text-stone-600">${s.score}</span>
                            </div>
                            <div class="text-xs text-gray-500">/ 8 分</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 老師評語 -->
                ${grade.overall_comment ? `
                    <div class="border-t border-gray-200 p-4">
                        <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-comment-dots text-stone-600"></i>
                            老師評語
                        </h4>
                        <div class="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                            <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">${grade.overall_comment}</p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- 批改時間 -->
                <div class="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    <p class="text-xs text-gray-600 text-center">
                        <i class="fas fa-clock mr-1"></i>
                        批改時間：${new Date(grade.graded_at).toLocaleString('zh-Hant-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                    ${grade.teacher?.display_name ? `
                        <p class="text-xs text-gray-600 text-center mt-1">
                            <i class="fas fa-user-tie mr-1"></i>
                            批改老師：${grade.teacher.display_name}
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
        
        console.log('✅ 老師評分已顯示在側邊欄');
        
    } catch (error) {
        console.error('❌ 顯示老師評分失敗:', error);
    }
}

// 等待 DOM 加載完成後初始化應用
// 使用 { once: true } 確保只執行一次
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
    // 使用 setTimeout 確保在下一個事件循環執行，避免時序問題
    setTimeout(initializeApp, 0);
}

// 導出供其他模組使用
export { AppState };
