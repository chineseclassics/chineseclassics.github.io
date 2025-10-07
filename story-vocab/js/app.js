/**
 * 应用入口文件
 * 整合所有模块，初始化应用
 */

// 导入 Supabase 相关
import { initSupabase, signInAnonymously } from './supabase-client.js';

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
import { initStartScreen, initGameScreen, displayAIResponse, displayUserMessage, updateTurnDisplay, initFinishScreen, initSettingsScreen } from './ui/screens.js';

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
    
    // 提交句子（需要特殊处理）
    window.submitSentence = async function() {
        const input = document.getElementById('user-input');
        const sentence = input.value.trim();
        
        if (!sentence || !gameState.selectedWord) {
            return;
        }
        
        const usedWord = gameState.selectedWord;
        
        // 显示用户消息
        displayUserMessage(sentence, usedWord);
        
        // 禁用输入
        input.disabled = true;
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        
        // 提交句子并获取结果
        const result = await submitSentence(sentence, usedWord);
        
        // 更新轮次显示
        updateTurnDisplay(gameState.turn);
        
        if (result.gameOver) {
            // 游戏结束，显示完成界面
            setTimeout(() => {
                const stats = finishStory();
                showScreen('finish-screen');
                initFinishScreen(stats);
            }, 1000);
        } else if (result.aiData) {
            // 游戏继续，显示 AI 响应
            console.log('📝 显示第二次 AI 响应...');
            await displayAIResponse(result.aiData);
        }
    };
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

