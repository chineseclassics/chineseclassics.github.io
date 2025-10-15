/**
 * 应用入口文件
 * 整合所有模块，初始化应用
 */

// 导入 Supabase 相关
import { initSupabase, getSupabase } from './supabase-client.js';
import { SUPABASE_CONFIG } from './config.js';

// 导入认证模块
import { createAuthService } from './auth/auth-service.js';
import { getRunMode } from './auth/run-mode-detector.js';

// 导入核心模块
import { gameState } from './core/game-state.js';
import { startGame, getAIResponse, submitSentence, finishStory, shareStory } from './core/story-engine.js';

// 导入功能模块
import { selectWord } from './features/word-manager.js';
import { showWordDetailFromVocab, closeWordModal, getWordBriefInfo } from './features/dictionary.js';
import { addToWordbook, openWordbook, removeFromWordbook, loadWordbookScreen } from './features/wordbook.js';

// 导入 UI 模块
import { showScreen, toggleMobileSidebar, closeMobileSidebar, navigateTo, handleLogout, initSidebarSwipe } from './ui/navigation.js';
import { showVocabModeSelector, closeVocabModeModal, selectVocabMode, saveSettings, initModalClickOutside } from './ui/modals.js';
import { initStartScreen, initGameScreen, displayAIResponse, displayUserMessage, updateTurnDisplay, initFinishScreen, initSettingsScreen, showFeedbackLoading, displayFeedback, hideFeedbackSection } from './ui/screens.js';
import { loadMyStoriesScreen } from './ui/story-card.js';

// 导入工具
import { showToast } from './utils/toast.js';
import { updateSidebarStats } from './utils/storage.js';
import { preloadWords } from './utils/word-cache.js';

// 导入故事存储模块
import { updateStory, getStory } from './core/story-storage.js';

// 全局认证服务实例
let authService = null;

/**
 * 获取AI反馈设置
 */
function isAIFeedbackEnabled() {
    const saved = localStorage.getItem('ai-feedback-enabled');
    return saved !== 'false';  // 默认true（开启）
}

/**
 * 初始化toggle状态
 */
function initFeedbackToggle() {
    const toggle = document.getElementById('feedback-toggle');
    if (toggle) {
        const enabled = isAIFeedbackEnabled();
        toggle.checked = enabled;
    }
}

/**
 * 隱藏加載屏幕（已移除加載屏幕元素，保留函數以避免錯誤）
 */
function hideLoadingScreen() {
    // 加載屏幕已從 HTML 中移除，此函數保留以避免調用錯誤
}

/**
 * 初始化应用
 */
async function initializeApp() {
    try {
        console.log(`🎮 詞遊記啟動（${getRunMode()}模式）`);
        
        // 1. 初始化 Supabase
        const supabase = await initSupabase();
        console.log('✅ Supabase 客戶端初始化成功');
        
        // 2. 初始化認證系統（雙模式支持）
        authService = await createAuthService();
        // 暴露調試對象到全域（僅供開發測試使用）
        window.authService = authService;
        window.supabase = supabase;
        const user = await authService.getCurrentUser();
        
        // 3. 根據真實用戶狀態更新 UI（不依賴 localStorage，避免閃動）
        hideLoadingScreen(); // 確保隱藏加載屏幕
        
        let initialLoginHandled = false; // 標記初始登入狀態是否已處理
        
        if (user && user.user_type === 'registered') {
            // Google 用戶：進入主界面
            console.log('✅ Google 用戶已登入:', user.display_name);
            gameState.userId = user.id;
            gameState.user = user;
            updateUIForLoggedInUser(user);
            showMainInterface();
            initialLoginHandled = true; // 標記已處理
        } else {
            // 匿名用戶或未登入：顯示登入界面
            console.log('ℹ️ 顯示登入界面');
            showLoginScreen();
        }
        
        // 4. 設置認證監聽器（避免重複處理初始登入）
        authService.onAuthStateChange((event, user) => {
            if (event === 'SIGNED_IN' && user) {
                // 如果初始化時已經處理過登入狀態，跳過第一次 SIGNED_IN 事件
                if (initialLoginHandled) {
                    console.log('🔄 跳過重複的 SIGNED_IN 事件（初始化已處理）');
                    initialLoginHandled = false; // 重置標記，後續登入需要處理
                    return;
                }
                
                gameState.userId = user.id;
                gameState.user = user;
                updateUIForLoggedInUser(user);
                showMainInterface();
                showToast(`✅ 歡迎，${user.display_name}！`);
            } else if (event === 'SIGNED_OUT') {
                gameState.userId = null;
                gameState.user = null;
                showLoginScreen();
            }
        });
        
        // 5. 初始化AI反馈toggle状态
        initFeedbackToggle();
        
        console.log('✅ 應用初始化完成');
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        hideLoadingScreen(); // 確保隱藏加載屏幕
        showLoginScreen(); // 顯示登入界面
        showToast('初始化失敗，請刷新頁面重試');
    }
}

/**
 * 顯示登入界面
 */
function showLoginScreen() {
    // 如果是 OAuth 回調過程，不要顯示登入界面（避免閃動）
    const isOAuthCallback = sessionStorage.getItem('oauth_callback') === 'true';
    if (isOAuthCallback) {
        console.log('⏳ OAuth 回調中，等待登入完成...');
        sessionStorage.removeItem('oauth_callback'); // 清除標記
        return;
    }
    
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.classList.add('active');
    }
    
    // 隱藏側邊欄、主內容和移動端導航欄
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const mobileHeader = document.querySelector('.mobile-header');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (mobileHeader) mobileHeader.style.display = 'none';
}

/**
 * 顯示主界面
 */
function showMainInterface() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.classList.remove('active');
    }
    
    // 顯示側邊欄、主內容和移動端導航欄
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const mobileHeader = document.querySelector('.mobile-header');
    if (sidebar) sidebar.style.display = '';
    if (mainContent) mainContent.style.display = '';
    if (mobileHeader) mobileHeader.style.display = '';
    
    // 顯示開始界面
    showScreen('start-screen');
}

/**
 * Google 登入
 */
async function loginWithGoogle() {
    if (!authService) {
        showToast('❌ 認證服務未初始化');
        return;
    }
    
    try {
        showToast('正在跳轉到 Google 登入...');
        
        const result = await authService.loginWithGoogle();
        
        if (result.error) {
            console.error('❌ 登入失敗:', result.error);
            showToast('❌ 登入失敗，請重試');
        }
        // OAuth 會跳轉，成功不會執行到這裡
    } catch (error) {
        console.error('❌ 登入異常:', error);
        showToast('❌ 登入異常，請重試');
    }
}

/**
 * 訪客試用（匿名登入）
 */
async function continueAsGuest() {
    if (!authService) {
        showToast('❌ 認證服務未初始化');
        return;
    }
    
    try {
        showToast('正在創建訪客賬號...');
        
        const user = await authService.loginAnonymously();
        
        if (user) {
            gameState.userId = user.id;
            gameState.user = user;
            updateUIForLoggedInUser(user);
            showToast(`✅ 歡迎，${user.display_name}！`);
        } else {
            showToast('❌ 訪客登入失敗');
        }
    } catch (error) {
        console.error('❌ 訪客登入異常:', error);
        showToast('❌ 訪客登入失敗，請重試');
    }
}

/**
 * 登出
 */
async function logout() {
    if (!authService) {
        showToast('❌ 認證服務未初始化');
        return;
    }
    
    try {
        await authService.logout();
        
        // 清除 gameState
        gameState.userId = null;
        gameState.user = null;
        
        // 顯示登入界面
        showLoginScreen();
        
        showToast('✅ 已登出');
    } catch (error) {
        console.error('❌ 登出失敗:', error);
        showToast('❌ 登出失敗，請重試');
    }
}

/**
 * 更新 UI（已登入用戶）
 */
function updateUIForLoggedInUser(user) {
    const displayName = user.display_name || '用戶';
    const userType = user.user_type || 'registered';
    
    // 更新側邊欄用戶名
    const userDisplayNameEl = document.getElementById('user-display-name');
    if (userDisplayNameEl) {
        userDisplayNameEl.textContent = displayName;
    }
    
    // 更新頭像（桌面版和移動版）
    const avatarHTML = user.avatar_url
        ? `<img src="${user.avatar_url}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : '👤';
    
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl) {
        if (user.avatar_url) {
            userAvatarEl.innerHTML = `<img src="${user.avatar_url}" 
                                            alt="${displayName}" 
                                            style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">`;
        } else {
            userAvatarEl.innerHTML = avatarHTML;
            if (userType === 'anonymous') {
                userAvatarEl.title = '訪客模式';
            }
        }
    }
    
    // 更新移動端頭像
    const mobileAvatarEl = document.querySelector('.mobile-user-avatar');
    if (mobileAvatarEl) {
        mobileAvatarEl.innerHTML = avatarHTML;
    }
    
    // 隱藏登入提示
    const guestPrompt = document.getElementById('guest-login-prompt');
    if (guestPrompt) {
        guestPrompt.style.display = 'none';
    }
    
    // 顯示用戶類型標識（如果是匿名用戶）
    // 已移除等級顯示功能
    // const userLevelDisplay = document.getElementById('user-level-display');
    // if (userLevelDisplay && userType === 'anonymous') {
    //     const currentText = userLevelDisplay.textContent;
    //     if (!currentText.includes('試用')) {
    //         userLevelDisplay.textContent = currentText + ' · ⚡試用';
    //     }
    // }
    
    // 🎓 初始化年級徽章
    import('./ui/screens.js').then(({ initGradeBadge }) => {
        initGradeBadge().catch(err => {
            console.error('❌ 初始化年級徽章失敗:', err);
        });
    });
}

/**
 * 更新 UI（訪客模式）
 */
function updateUIForGuestUser() {
    const userDisplayNameEl = document.getElementById('user-display-name');
    if (userDisplayNameEl) {
        userDisplayNameEl.textContent = '訪客';
    }
    
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl) {
        userAvatarEl.innerHTML = '👤';
    }
    
    // 顯示登入提示
    const guestPrompt = document.getElementById('guest-login-prompt');
    if (guestPrompt) {
        guestPrompt.style.display = 'block';
    }
    
    // 重置用戶等級顯示（已移除）
    // const userLevelDisplay = document.getElementById('user-level-display');
    // if (userLevelDisplay) {
    //     userLevelDisplay.textContent = '等級 L2 · 初級';
    // }
}

/**
 * 绑定全局函数（供 HTML onclick 使用）
 */
function mountGlobalFunctions() {
    // 导航和侧边栏
    window.showScreen = showScreen;
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.closeMobileSidebar = closeMobileSidebar;
    window.navigateTo = navigateTo;
    window.handleLogout = logout;  // 使用新的 logout 函數
    
    // 词汇相关
    window.selectWord = selectWord;
    window.showWordDetailFromVocab = showWordDetailFromVocab;
    window.closeWordModal = closeWordModal;
    window.addToWordbook = addToWordbook;
    window.openWordbook = openWordbook;
    window.removeFromWordbook = removeFromWordbook;
    window.loadWordbookScreen = loadWordbookScreen;
    
    // 认证相关
    window.loginWithGoogle = loginWithGoogle;
    window.continueAsGuest = continueAsGuest;
    window.logout = logout;
    window.showLoginScreen = showLoginScreen;
    window.showMainInterface = showMainInterface;
    
    // 弹窗管理
    window.showVocabModeSelector = showVocabModeSelector;
    window.closeVocabModeModal = closeVocabModeModal;
    window.selectVocabMode = selectVocabMode;
    window.saveSettings = saveSettings;
    
    // 游戏流程
    window.restartGame = () => showScreen('start-screen');
    window.shareStory = shareStory;
    window.updateSidebarStats = updateSidebarStats;
    
    // 故事管理
    window.confirmStoryTitle = confirmStoryTitle;
    window.continueStory = continueStoryFromId;
    window.loadMyStoriesScreen = loadMyStoriesScreen;
    
    // 提交句子（完全重构）
    window.submitSentence = async function() {
        const input = document.getElementById('user-input');
        const sentence = input.value.trim();
        
        if (!sentence || !gameState.selectedWord) {
            return;
        }
        
        const usedWord = gameState.selectedWord;
        
        // 检查是否是再次提交（已显示过反馈）
        if (window._feedbackShown) {
            // 直接提交，不再生成反饋（已經看過了）
            // ✅ 先驗證句子是否使用了選中的詞
            if (!sentence.includes(usedWord.word)) {
                showToast(`請在句子中使用詞彙：${usedWord.word}`);
                return;  // 阻止提交
            }
            // 🚀 第二次提交也跳過反饋生成（因為已經顯示過了）
            await confirmAndSubmit(sentence, usedWord);
            return;
        }
        
        // 🆕 检查AI反馈开关状态
        const feedbackEnabled = isAIFeedbackEnabled();
        
        if (feedbackEnabled) {
            // 学习模式：显示反馈
            showFeedbackLoading();
            
            // 禁用输入
            input.disabled = true;
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                // 只获取反馈
                const feedback = await getFeedbackOnly(sentence, usedWord);
                
                // 显示反馈
                displayFeedback(feedback, sentence, usedWord);
                
                // 标记已显示反馈
                window._feedbackShown = true;
                
                // 启用输入框和提交按钮，让用户可以修改
                input.disabled = false;
                if (submitBtn) submitBtn.disabled = false;
                
            } catch (error) {
                console.error('获取反馈失败:', error);
                showToast('❌ 獲取反饋失敗，請重試');
                hideFeedbackSection();
                input.disabled = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        } else {
            // 快速模式：直接提交，不显示反馈
            // ✅ 先驗證句子是否使用了選中的詞
            if (!sentence.includes(usedWord.word)) {
                showToast(`請在句子中使用詞彙：${usedWord.word}`);
                return;  // 阻止提交
            }
            await confirmAndSubmit(sentence, usedWord);
        }
    };
    
    // 反饋按鈕處理函數
    window.useOptimizedSentence = useOptimizedSentence;
    
    // AI反饋Toggle切換處理
    window.handleFeedbackToggle = function() {
        const toggle = document.getElementById('feedback-toggle');
        const isEnabled = toggle.checked;
        
        // 保存设置到localStorage
        localStorage.setItem('ai-feedback-enabled', isEnabled ? 'true' : 'false');
        
        // Toast提示
        if (isEnabled) {
            showToast('📚 已開啟AI反饋 - 提交後將顯示評分和建議');
        } else {
            showToast('💨 已關閉AI反饋 - 快速創作模式');
        }
    };
}

/**
 * 只获取反馈（不生成故事）
 * 調用專門的 sentence-feedback Edge Function
 */
async function getFeedbackOnly(sentence, word) {
    // 构建对话历史（故事上下文）
    const conversationHistory = gameState.storyHistory.map(entry => entry.sentence);
    
    // 转换主题格式
    const themeMapping = {
        'nature': 'natural_exploration',
        'campus': 'school_life',
        'fantasy': 'fantasy_adventure',
        'scifi': 'sci_fi'
    };
    const storyTheme = themeMapping[gameState.theme] || gameState.theme;
    
    // 調用新的 sentence-feedback Edge Function
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/functions/v1/sentence-feedback`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
            },
            body: JSON.stringify({
                userSentence: sentence,
                selectedWord: word.word,
                conversationHistory: conversationHistory,
                storyTheme: storyTheme,
                userGrade: gameState.user?.grade || 6,      // 🎓 傳入年級
                currentRound: gameState.turn - 1            // 🎬 傳入當前輪次
            })
        }
    );
    
    if (!response.ok) {
        throw new Error('API 請求失敗');
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'AI 調用失敗');
    }
    
    // 直接返回反饋數據 { score, comment, optimizedSentence }
    return result.data;
}

/**
 * 确认提交并生成故事
 */
async function confirmAndSubmit(sentence, word) {
    // 🔒 禁用词汇按钮（但不觸發視覺變化，等待新詞卡顯示時自然翻轉）
    document.querySelectorAll('.word-btn').forEach(btn => {
        btn.disabled = true;
        // 不添加 'disabled' class，避免觸發提前的視覺變化
    });
    
    // 显示用户消息到故事区
    displayUserMessage(sentence, word);
    
    // 显示AI加载动画
    const storyDisplay = document.getElementById('story-display');
    if (storyDisplay) {
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'message ai';
        loadingMessage.innerHTML = `
            <div class="message-label ai">
                <span class="emoji">🤖</span>
                <span class="name">AI故事家</span>
            </div>
            <div class="message-content">
                <div class="inline-loading">
                    <div class="inline-loading-spinner"></div>
                    <span class="inline-loading-text">正在創作中...</span>
                </div>
            </div>
        `;
        storyDisplay.appendChild(loadingMessage);
        storyDisplay.scrollTop = storyDisplay.scrollHeight;
    }
    
    // 隐藏反馈区
    hideFeedbackSection();
    
    // 禁用输入
    const input = document.getElementById('user-input');
    const submitBtn = document.getElementById('submit-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    
    // 调用正常的提交流程（生成故事）
    // 🚀 傳遞 skipFeedback=true 來跳過後端反饋生成（節省 1-1.5 秒）
    const result = await submitSentence(sentence, word, true);
    
    // ✅ 檢查是否驗證失敗（沒有 aiData 但也沒結束遊戲）
    if (!result.gameOver && !result.aiData) {
        // 驗證失敗，恢復 UI 狀態
        console.log('❌ 驗證失敗，恢復 UI');
        
        // 移除加載動畫
        const storyDisplay = document.getElementById('story-display');
        if (storyDisplay) {
            const loadingMessages = storyDisplay.querySelectorAll('.message.ai .inline-loading');
            loadingMessages.forEach(msg => msg.closest('.message')?.remove());
        }
        
        // 啟用輸入
        const input = document.getElementById('user-input');
        const submitBtn = document.getElementById('submit-btn');
        if (input) input.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        
        // 啟用詞卡
        document.querySelectorAll('.word-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
        
        return;
    }
    
    // 更新轮次显示
    updateTurnDisplay(gameState.turn);
    
    // 清除反馈标记
    delete window._feedbackShown;
    delete window._currentFeedback;
    
    // 检查游戏是否结束
    if (result.gameOver) {
        setTimeout(async () => {
            const stats = await finishStory();
            showScreen('finish-screen');
            initFinishScreen(stats);
        }, 1000);
    } else if (result.aiData) {
        console.log('📝 显示 AI 响应...');
        
        // 🚀 立即预加载词汇信息（在打字机效果前）
        if (result.aiData.recommendedWords && result.aiData.recommendedWords.length > 0) {
            const wordsToPreload = result.aiData.recommendedWords
                .filter(w => !gameState.usedWords.map(u => u.word).includes(w.word))
                .map(w => w.word);
            
            if (wordsToPreload.length > 0) {
                console.log(`🚀 提前预加载 ${wordsToPreload.length} 个词汇...`);
                preloadWords(wordsToPreload, getWordBriefInfo).catch(err => {
                    console.log('⚠️ 预加载失败（不影响使用）:', err);
                });
            }
        }
        
        await displayAIResponse(result.aiData);
    }
}

/**
 * 1. 使用優化版句子
 */
function useOptimizedSentence() {
    if (!window._currentFeedback) return;
    
    const { feedback } = window._currentFeedback;
    const input = document.getElementById('user-input');
    
    // 填入优化版（反馈保持可见）
    if (input) {
        input.value = feedback.optimizedSentence;
        input.disabled = false;
        input.focus();
    }
    
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.disabled = false;
    
    showToast('✨ 已填入優化版，可繼續修改');
}

/**
 * 确保 Supabase session 已就绪（只在必要时等待）
 * 解决首次登入后立即开始游戏时的竞态条件
 */
async function ensureSessionReady() {
    const supabase = getSupabase();
    
    // 快速检查：如果已经有 session，立即返回
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        return true;
    }
    
    // 如果没有 session，等待最多 2 秒
    console.log('⏳ 等待 session 就绪...');
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 10; // 10 次 x 200ms = 2 秒
        
        const checkInterval = setInterval(async () => {
            attempts++;
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                clearInterval(checkInterval);
                console.log('✅ Session 已就绪');
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn('⚠️ Session 等待超时（但继续尝试）');
                resolve(false);
            }
        }, 200);
    });
}

/**
 * 开始游戏（从启动界面）
 */
async function handleStartGame() {
    try {
        console.log('🎮 handleStartGame 被調用');
        
        const themeBtn = document.querySelector('.theme-btn.selected');
        
        if (!themeBtn) {
            showToast('請選擇故事主題');
            return;
        }
        
        // 🔍 驗證 gameState 狀態
        console.log('🔍 當前 gameState 狀態:', {
            wordlistMode: gameState.wordlistMode,
            wordlistId: gameState.wordlistId,
            level2Tag: gameState.level2Tag,
            level3Tag: gameState.level3Tag,
            userId: gameState.userId
        });
        
        // 🔒 確保詞表模式值有效
        if (!gameState.wordlistMode || (gameState.wordlistMode !== 'ai' && gameState.wordlistMode !== 'wordlist')) {
            console.warn('⚠️ 詞表模式值無效，重置為 AI 模式');
            gameState.wordlistMode = 'ai';
            gameState.wordlistId = null;
            gameState.level2Tag = null;
            gameState.level3Tag = null;
        }
        
        // 词表选择已经在 initStartScreen() 中设置到 gameState
        // 如果是词表模式且有层级，验证是否选择了层级
        if (gameState.wordlistMode === 'wordlist' && gameState.wordlistId) {
            const level2Container = document.getElementById('level-2-cards');
            if (level2Container && level2Container.children.length > 0) {
                // 有第二层级卡片，检查是否选中
                if (!gameState.level2Tag) {
                    console.warn('⚠️ 詞表有層級但未選擇');
                    showToast('請選擇詞語範圍');
                    return;
                }
            }
        }
        
        console.log('📚 开始游戏 - 词表模式:', gameState.wordlistMode);
        console.log('📚 词表ID:', gameState.wordlistId);
        console.log('📚 层级2:', gameState.level2Tag);
        console.log('📚 层级3:', gameState.level3Tag);
        
        // 🔒 确保 session 已就绪（防止竞态条件）
        const sessionReady = await ensureSessionReady();
        if (!sessionReady) {
            console.error('❌ Session 未就緒');
            showToast('❌ 初始化失敗，請重新登入');
            return;
        }
        
        // 设置级别和主题
        const level = 'L2';  // 仅用于兼容性，实际词汇推荐由 vocab-recommender 根据用户水平和词表设置决定
        const theme = themeBtn.dataset.theme;
        
        console.log('🎬 準備初始化遊戲界面...');
        
        // 初始化游戏界面
        initGameScreen(level, theme);
        showScreen('game-screen');
        
        console.log('🎮 準備啟動遊戲...');
        
        // 开始游戏
        await startGame(level, theme, async () => {
            // 成功创建会话后的回调
            try {
                console.log('🎮 开始调用 getAIResponse...');
                const data = await getAIResponse();
                console.log('✅ getAIResponse 完成，准备显示...');
                
                // 🚀 立即预加载词汇信息（在打字机效果前）
                if (data.recommendedWords && data.recommendedWords.length > 0) {
                    const wordsToPreload = data.recommendedWords
                        .filter(w => !gameState.usedWords.map(u => u.word).includes(w.word))
                        .map(w => w.word);
                    
                    if (wordsToPreload.length > 0) {
                        console.log(`🚀 提前预加载 ${wordsToPreload.length} 个词汇...`);
                        preloadWords(wordsToPreload, getWordBriefInfo).catch(err => {
                            console.log('⚠️ 预加载失败（不影响使用）:', err);
                        });
                    }
                }
                
                await displayAIResponse(data);
                console.log('✅ displayAIResponse 完成');
            } catch (error) {
                console.error('❌ AI 創作失敗:', error);
                
                // 移除加载动画
                const storyDisplay = document.getElementById('story-display');
                if (storyDisplay) {
                    const loadingMessages = storyDisplay.querySelectorAll('.message.ai .inline-loading');
                    loadingMessages.forEach(msg => msg.closest('.message')?.remove());
                }
                
                // 显示错误提示
                showToast('❌ AI 創作失敗，請重試');
                
                // 返回开始界面让用户重试
                setTimeout(() => {
                    showScreen('start-screen');
                }, 1500);
            }
        });
        
        console.log('✅ handleStartGame 執行完成');
        
    } catch (error) {
        console.error('❌ handleStartGame 執行失敗:', error);
        console.error('   錯誤詳情:', error.message);
        console.error('   錯誤堆棧:', error.stack);
        showToast('❌ 啟動失敗，請重試');
        
        // 返回开始界面
        showScreen('start-screen');
    }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 开始游戏按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', handleStartGame);
    }
    
    // 输入框回车提交
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !this.disabled) {
                window.submitSentence();
            }
        });
    }
    
    // 初始化侧边栏触摸滑动
    initSidebarSwipe();
    
    // 初始化弹窗背景点击关闭
    initModalClickOutside();
    
    // 點擊外部關閉詞表下拉菜單
    document.addEventListener('click', function(e) {
        const selector = document.getElementById('custom-wordlist-selector');
        if (selector && !selector.contains(e.target)) {
            selector.classList.remove('active');
        }
    });
}

/**
 * 确认并保存故事标题
 */
function confirmStoryTitle() {
    const titleInput = document.getElementById('story-title-input');
    if (!titleInput) return;
    
    const newTitle = titleInput.value.trim();
    if (!newTitle) {
        showToast('請輸入故事標題');
        return;
    }
    
    // 更新故事标题
    if (gameState.currentStoryId) {
        updateStory(gameState.currentStoryId, { title: newTitle });
        showToast('✓ 故事標題已保存');
        
        // 可选：添加视觉反馈
        titleInput.classList.add('saved');
        setTimeout(() => titleInput.classList.remove('saved'), 1000);
    }
}

/**
 * 继续创作未完成的故事
 * @param {string} storyId - 故事ID
 */
async function continueStoryFromId(storyId) {
    const story = getStory(storyId);
    if (!story) {
        showToast('❌ 找不到故事');
        return;
    }
    
    if (story.status === 'completed') {
        showToast('這個故事已經完成了');
        return;
    }
    
    try {
        // 恢复游戏状态
        gameState.level = story.level;
        gameState.theme = story.theme;
        gameState.turn = story.currentTurn + 1;
        gameState.maxTurns = story.maxTurns;
        gameState.storyHistory = story.storyHistory || [];
        gameState.usedWords = story.usedWords || [];
        gameState.currentWords = story.currentWords || [];
        gameState.allRecommendedWords = story.allRecommendedWords || [];
        gameState.sessionId = story.sessionId;
        gameState.currentStoryId = storyId;
        
        // 切换到游戏界面
        showScreen('game-screen');
        closeMobileSidebar();
        
        // 初始化游戏界面
        initGameScreen(story.level, story.theme);
        
        // 恢复故事显示区的内容
        const storyDisplay = document.getElementById('story-display');
        if (storyDisplay) {
            // 清空并重新显示所有历史消息
            const messages = storyDisplay.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            for (const entry of gameState.storyHistory) {
                if (entry.role === 'ai') {
                    await displayAIResponse({ 
                        aiSentence: entry.sentence,
                        recommendedWords: []
                    });
                } else {
                    displayUserMessage(entry.sentence);
                }
            }
        }
        
        // 更新轮次显示
        updateTurnDisplay();
        
        // 如果有当前词汇，显示它们
        if (gameState.currentWords && gameState.currentWords.length > 0) {
            const wordChoicesSection = document.getElementById('word-choices-section');
            const wordChoices = document.getElementById('word-choices');
            
            if (wordChoicesSection && wordChoices) {
                wordChoicesSection.style.display = 'block';
                wordChoices.innerHTML = gameState.currentWords.map(word => `
                    <button class="word-btn" onclick="selectWord('${word.word}')">
                        <div class="word-text">${word.word}</div>
                        <div class="word-meta">難度 ${word.difficulty_level || 'N/A'}</div>
                    </button>
                `).join('');
            }
        } else {
            // 如果没有词汇，需要获取新的推荐
            showToast('正在獲取詞彙推薦...');
            try {
                const aiData = await getAIResponse(
                    gameState.storyHistory[gameState.storyHistory.length - 1]?.sentence || '',
                    ''
                );
                await displayAIResponse(aiData);
            } catch (error) {
                console.error('獲取詞彙失敗:', error);
                showToast('❌ 獲取詞彙失敗，請重試');
            }
        }
        
        showToast('✍️ 繼續創作故事！');
    } catch (error) {
        console.error('恢復故事失敗:', error);
        showToast('❌ 恢復故事失敗，請重試');
    }
}

/**
 * 错误处理
 */
function setupErrorHandling() {
    // 防止第三方脚本错误影响应用
    window.addEventListener('error', function(e) {
        // 如果错误来自第三方脚本，静默处理
        if (e.filename && (e.filename.includes('extension') || e.filename.includes('content-script'))) {
            e.preventDefault();
            return true;
        }
    }, true);
    
    // 捕获 Promise 错误
    window.addEventListener('unhandledrejection', function(e) {
        // 记录但不中断应用
        console.warn('Promise rejection:', e.reason);
    });
}

/**
 * 页面加载完成时初始化
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎮 故事詞彙接龍遊戲已載入！');
    
    // 设置错误处理
    setupErrorHandling();
    
    // 挂载全局函数
    mountGlobalFunctions();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化词汇模式（默认为 AI 智能模式）
    if (!localStorage.getItem('vocab_mode')) {
        localStorage.setItem('vocab_mode', 'ai');
    }
    
    // 初始化应用（登录等）- 必须先完成 Supabase 初始化
    await initializeApp();
    
    // 初始化启动界面（在 Supabase 初始化之后）
    console.log('⏳ 開始初始化啟動界面...');
    try {
        await initStartScreen();
        console.log('✅ 啟動界面初始化完成');
    } catch (error) {
        console.error('❌ 啟動界面初始化失敗:', error);
        // 即使失敗也繼續，因為已經設置了默認狀態
    }
    
    // 检查是否有保存的用户信息
    const savedUsername = localStorage.getItem('user_display_name');
    if (savedUsername) {
        const userDisplayName = document.getElementById('user-display-name');
        if (userDisplayName) userDisplayName.textContent = savedUsername;
    }
    
    // 已移除等級顯示功能
    // const savedLevel = localStorage.getItem('user_level');
    // if (savedLevel) {
    //     const userLevelDisplay = document.getElementById('user-level-display');
    //     if (userLevelDisplay) userLevelDisplay.textContent = savedLevel;
    // }
    
    // 同步移动端头像显示
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        const avatarText = userAvatar.textContent;
        const mobileAvatars = document.querySelectorAll('.mobile-user-avatar');
        mobileAvatars.forEach(avatar => {
            avatar.textContent = avatarText;
        });
    }
    
    // 更新侧边栏统计
    updateSidebarStats();
});

