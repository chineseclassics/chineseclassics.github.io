/**
 * 应用入口文件
 * 整合所有模块，初始化应用
 */

// 导入 Supabase 相关
import { initSupabase, signInAnonymously } from './supabase-client.js';
import { SUPABASE_CONFIG } from './config.js';

// 导入核心模块
import { gameState } from './core/game-state.js';
import { startGame, getAIResponse, submitSentence, finishStory, shareStory } from './core/story-engine.js';

// 导入功能模块
import { selectWord } from './features/word-manager.js';
import { showWordDetailFromVocab, closeWordModal } from './features/dictionary.js';
import { addToWordbook, openWordbook } from './features/wordbook.js';

// 导入 UI 模块
import { showScreen, toggleMobileSidebar, closeMobileSidebar, navigateTo, handleLogout, initSidebarSwipe } from './ui/navigation.js';
import { showVocabModeSelector, closeVocabModeModal, selectVocabMode, saveSettings, initModalClickOutside } from './ui/modals.js';
import { initStartScreen, initGameScreen, displayAIResponse, displayUserMessage, updateTurnDisplay, initFinishScreen, initSettingsScreen, showFeedbackLoading, displayFeedback, hideFeedbackSection } from './ui/screens.js';

// 导入工具
import { showToast } from './utils/toast.js';
import { updateSidebarStats } from './utils/storage.js';

/**
 * 初始化应用
 */
async function initializeApp() {
    try {
        // 初始化 Supabase
        const supabase = await initSupabase();
        console.log('✅ Supabase 客戶端初始化成功');
        
        // 匿名登录
        const user = await signInAnonymously();
        gameState.userId = user.id;
        console.log('✅ 用戶登錄成功:', gameState.userId);
        
        console.log('✅ 應用初始化完成');
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        showToast('初始化失敗，請刷新頁面重試');
    }
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
    window.handleLogout = handleLogout;
    
    // 词汇相关
    window.selectWord = selectWord;
    window.showWordDetailFromVocab = showWordDetailFromVocab;
    window.closeWordModal = closeWordModal;
    window.addToWordbook = addToWordbook;
    window.openWordbook = openWordbook;
    
    // 弹窗管理
    window.showVocabModeSelector = showVocabModeSelector;
    window.closeVocabModeModal = closeVocabModeModal;
    window.selectVocabMode = selectVocabMode;
    window.saveSettings = saveSettings;
    
    // 游戏流程
    window.restartGame = () => showScreen('start-screen');
    window.shareStory = shareStory;
    window.updateSidebarStats = updateSidebarStats;
    
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
            // 直接提交，不再显示反馈
            await confirmAndSubmit(sentence, usedWord);
            return;
        }
        
        // 首次提交：显示反馈加载（不显示用户句子到故事区）
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
    };
    
    // 反饋按鈕處理函數
    window.useOptimizedSentence = useOptimizedSentence;
}

/**
 * 只获取反馈（不生成故事）
 */
async function getFeedbackOnly(sentence, word) {
    // 转换级别格式
    const userLevel = parseFloat(gameState.level.replace('L', ''));
    
    // 转换主题格式
    const themeMapping = {
        'nature': 'natural_exploration',
        'campus': 'school_life',
        'fantasy': 'fantasy_adventure',
        'scifi': 'sci_fi'
    };
    const storyTheme = themeMapping[gameState.theme] || gameState.theme;
    
    // 构建对话历史
    const conversationHistory = gameState.storyHistory.map(entry => entry.sentence);
    
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/functions/v1/story-agent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
            },
            body: JSON.stringify({
                userSentence: sentence,
                selectedWord: word.word,
                sessionId: gameState.sessionId,
                conversationHistory: conversationHistory,
                userLevel: userLevel,
                storyTheme: storyTheme,
                currentRound: gameState.turn - 1,
                usedWords: gameState.usedWords.map(w => w.word),
                requestFeedbackOnly: true  // 关键：只请求反馈
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
    
    return result.data.feedback;
}

/**
 * 确认提交并生成故事
 */
async function confirmAndSubmit(sentence, word) {
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
    const result = await submitSentence(sentence, word);
    
    // 更新轮次显示
    updateTurnDisplay(gameState.turn);
    
    // 清除反馈标记
    delete window._feedbackShown;
    delete window._currentFeedback;
    
    // 检查游戏是否结束
    if (result.gameOver) {
        setTimeout(() => {
            const stats = finishStory();
            showScreen('finish-screen');
            initFinishScreen(stats);
        }, 1000);
    } else if (result.aiData) {
        console.log('📝 显示 AI 响应...');
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
 * 开始游戏（从启动界面）
 */
async function handleStartGame() {
    const levelInput = document.querySelector('input[name="level"]:checked');
    const themeBtn = document.querySelector('.theme-btn.selected');
    
    if (!levelInput || !themeBtn) {
        showToast('請選擇級別和主題');
        return;
    }
    
    const level = levelInput.value;
    const theme = themeBtn.dataset.theme;
    
    // 初始化游戏界面
    initGameScreen(level, theme);
    showScreen('game-screen');
    
    // 开始游戏
    await startGame(level, theme, async () => {
        // 成功创建会话后的回调
        console.log('🎮 开始调用 getAIResponse...');
        const data = await getAIResponse();
        console.log('✅ getAIResponse 完成，准备显示...');
        await displayAIResponse(data);
        console.log('✅ displayAIResponse 完成');
    });
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 故事詞彙接龍遊戲已載入！');
    
    // 设置错误处理
    setupErrorHandling();
    
    // 挂载全局函数
    mountGlobalFunctions();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化启动界面
    initStartScreen();
    
    // 初始化词汇模式（默认为 AI 智能模式）
    if (!localStorage.getItem('vocab_mode')) {
        localStorage.setItem('vocab_mode', 'ai');
    }
    
    // 检查是否有保存的用户信息
    const savedUsername = localStorage.getItem('user_display_name');
    if (savedUsername) {
        const userDisplayName = document.getElementById('user-display-name');
        if (userDisplayName) userDisplayName.textContent = savedUsername;
    }
    
    const savedLevel = localStorage.getItem('user_level');
    if (savedLevel) {
        const userLevelDisplay = document.getElementById('user-level-display');
        if (userLevelDisplay) userLevelDisplay.textContent = savedLevel;
    }
    
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
    
    // 异步初始化 Supabase
    initializeApp();
});

