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
import { showWordDetailFromVocab, closeWordModal, getWordBriefInfo } from './features/dictionary.js';
import { addToWordbook, openWordbook } from './features/wordbook.js';

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
        
        // 初始化AI反馈toggle状态
        initFeedbackToggle();
        
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
            // 直接提交，不再显示反馈
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
    // 🔒 立即禁用词汇按钮（用户一点击提交就禁用）
    document.querySelectorAll('.word-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
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
    const result = await submitSentence(sentence, word);
    
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
 * 开始游戏（从启动界面）
 */
async function handleStartGame() {
    const themeBtn = document.querySelector('.theme-btn.selected');
    
    if (!themeBtn) {
        showToast('請選擇故事主題');
        return;
    }
    
    // 词表选择已经在 initStartScreen() 中设置到 gameState
    // 如果是词表模式且有层级，验证是否选择了层级
    if (gameState.wordlistMode === 'wordlist' && gameState.wordlistId) {
        const level2Container = document.getElementById('level-2-cards');
        if (level2Container && level2Container.children.length > 0) {
            // 有第二层级卡片，检查是否选中
            if (!gameState.level2Tag) {
                showToast('請選擇層級');
                return;
            }
        }
    }
    
    console.log('📚 开始游戏 - 词表模式:', gameState.wordlistMode);
    console.log('📚 词表ID:', gameState.wordlistId);
    console.log('📚 层级2:', gameState.level2Tag);
    console.log('📚 层级3:', gameState.level3Tag);
    
    // 设置级别和主题
    const level = 'L2';  // 仅用于兼容性，实际词汇推荐由 vocab-recommender 根据用户水平和词表设置决定
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
    await initStartScreen();
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
});

