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
import TeacherDashboard from './teacher/teacher-dashboard.js';

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
        // 清理所有編輯狀態（返回列表時重置）
        AppState.currentAssignmentId = null;  // ✅ 清除任務 ID
        AppState.currentPracticeEssayId = null;  // ✅ 清除練筆 ID
        AppState.currentFormatSpec = null;
        AppState.currentPracticeContent = null;
        
        // 同時清理 essay-storage 的狀態
        const { StorageState } = await import('./student/essay-storage.js');
        if (StorageState) {
            StorageState.currentEssayId = null;
        }
        
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

        // 設置學生端導航
        setupStudentNavigation();
        
        console.log('✅ 學生端功能初始化完成');
    } catch (error) {
        console.error('❌ 學生端功能初始化失敗:', error);
        showError('學生端功能初始化失敗: ' + error.message);
    }
}

/**
 * 設置學生端導航
 */
function setupStudentNavigation() {
    window.addEventListener('navigate', async (e) => {
        const { page, assignmentId, mode, formatTemplate, essayId } = e.detail;
        
        console.log('🧭 學生端導航:', { page, assignmentId, mode, formatTemplate, essayId });
        
        if (page === 'essay-writer') {
            await showEssayEditor(assignmentId, mode, formatTemplate, essayId);
        } else if (page === 'assignment-list') {
            await initializeStudentModules();
        }
    });
}

/**
 * 顯示論文編輯器
 * @param {string} assignmentId - 任務 ID（可選，自主練筆時為 null）
 * @param {string} mode - 寫作模式：'assignment'（任務）或 'free-writing'（自主練筆）
 * @param {string} formatTemplate - 格式模板（如 'honglou'）
 * @param {string} essayId - 作業 ID（繼續編輯現有練筆時使用）
 */
async function showEssayEditor(assignmentId = null, mode = null, formatTemplate = null, essayId = null) {
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
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { page: 'assignment-list' }
                }));
            });
        }

        // 綁定展開/收起按鈕
        const toggleBtn = container.querySelector('#toggle-description-btn');
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
            
            // 默認展開說明
            if (descArea) {
                descArea.classList.remove('hidden');
                if (toggleBtn) {
                    toggleBtn.querySelector('i')?.classList.remove('fa-chevron-down');
                    toggleBtn.querySelector('i')?.classList.add('fa-chevron-up');
                }
            }
        }
        
        if (toggleBtn && descArea) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = descArea.classList.contains('hidden');
                if (isHidden) {
                    descArea.classList.remove('hidden');
                    toggleBtn.querySelector('i').classList.remove('fa-chevron-down');
                    toggleBtn.querySelector('i').classList.add('fa-chevron-up');
                } else {
                    descArea.classList.add('hidden');
                    toggleBtn.querySelector('i').classList.remove('fa-chevron-up');
                    toggleBtn.querySelector('i').classList.add('fa-chevron-down');
                }
            });
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

        // 初始化論文編輯器
        await initializeEssayEditor();

        console.log('✅ 論文編輯器顯示完成');
    } catch (error) {
        console.error('❌ 顯示論文編輯器失敗:', error);
        showError('無法加載論文編輯器: ' + error.message);
    }
}

/**
 * 加載任務數據
 */
async function loadAssignmentData(assignmentId) {
    try {
        const { data: assignment, error } = await AppState.supabase
            .from('assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (error) throw error;

        // 更新任務標題
        const titleEl = document.getElementById('assignment-title');
        if (titleEl) {
            titleEl.textContent = assignment.title || '未命名任務';
        }

        // 更新任務描述
        const descEl = document.getElementById('assignment-description');
        if (descEl && assignment.description) {
            descEl.textContent = assignment.description;
        } else if (descEl) {
            descEl.textContent = '老師未提供詳細說明。';
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
        
        // TODO: 將來擴展為可選擇的模板系統
        // 當前只有紅樓夢格式，預留接口
        const formatTemplates = {
            'honglou': 'shiwen-baojian/assets/data/honglou-essay-format.json',
            // 預留：將來可以添加更多格式
            // 'classical': '...',
            // 'modern': '...'
        };
        
        const templatePath = formatTemplates[templateName];
        if (!templatePath) {
            console.warn('⚠️ 未知的格式模板:', templateName);
            return;
        }
        
        // 預載格式規範（供 AI 反饋使用）
        const response = await fetch(templatePath);
        if (response.ok) {
            const formatSpec = await response.json();
            // 將格式規範存儲到 AppState 供後續使用
            AppState.currentFormatSpec = formatSpec;
            console.log('✅ 格式模板加載完成:', formatSpec.title);
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
            
            // TODO: 加載作業內容到編輯器
            AppState.currentEssayContent = essay.content_json ? JSON.parse(essay.content_json) : null;
        } else {
            console.log('ℹ️ 這是新的任務作業，將創建新記錄');
            const { StorageState } = await import('./student/essay-storage.js');
            StorageState.currentEssayId = null;
        }
    } catch (error) {
        console.error('❌ 加載任務作業失敗:', error);
        // 不阻斷編輯器加載
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

