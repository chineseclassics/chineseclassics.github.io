/**
 * 故事生成引擎模块
 * 处理游戏流程和 AI 交互
 */

import { gameState, addStoryEntry, addUsedWord, incrementTurn } from './game-state.js';
import { createSession } from './session-manager.js';
import { showToast } from '../utils/toast.js';
import { saveCompletedStory, updateSidebarStats } from '../utils/storage.js';
import { SUPABASE_CONFIG } from '../config.js';
import { getSupabase } from '../supabase-client.js';
import { getRecommendedWords, recordRoundData, handleGameCompletion } from './vocab-integration.js';
import { saveStory, generateDefaultTitle } from './story-storage.js';

/**
 * 获取主题的中文名称
 * @param {string} theme - 主题标识
 * @returns {string} 中文名称
 */
export function getThemeName(theme) {
    const names = {
        nature: '自然探索',
        campus: '校園生活',
        fantasy: '奇幻冒險',
        scifi: '科幻未來'
    };
    return names[theme] || theme;
}

/**
 * 主题映射表（英文到数据库格式）
 */
const themeMapping = {
    'nature': 'natural_exploration',
    'campus': 'school_life',
    'fantasy': 'fantasy_adventure',
    'scifi': 'sci_fi'
};

/**
 * 开始游戏
 * @param {string} level - 级别
 * @param {string} theme - 主题
 * @param {Function} onSuccess - 成功回调
 */
export async function startGame(level, theme, onSuccess) {
    // 确保用户已登录
    if (!gameState.userId) {
        showToast('正在初始化，請稍候...');
        return;
    }
    
    // 更新游戏状态
    gameState.level = level;
    gameState.theme = theme;
    gameState.turn = 1;
    gameState.storyHistory = [];
    gameState.usedWords = [];
    gameState.allRecommendedWords = [];
    gameState.allHighlightWords = [];
    gameState.sessionId = null;
    
    try {
        // 创建数据库会话记录（不显示底部动画，内联动画已在游戏界面显示）
        const session = await createSession(gameState.userId, {
            theme: themeMapping[theme] || theme,
            choice: '開始故事',
            variant: 1,
            maxRounds: gameState.maxTurns
        });
        
        gameState.sessionId = session.id;
        console.log('✅ 會話創建成功:', gameState.sessionId);
        
        // 调用成功回调（获取 AI 响应）
        if (onSuccess) {
            await onSuccess();
        }
    } catch (error) {
        console.error('❌ 創建會話失敗:', error);
        showToast('啟動遊戲失敗，請重試');
    }
}

/**
 * 调用 AI Agent 获取响应
 * @param {string} userSentence - 用户句子
 * @param {string} selectedWord - 选中的词汇
 * @returns {Promise<Object>} AI 响应数据
 */
export async function getAIResponse(userSentence = '', selectedWord = '') {
    try {
        // 确保会话 ID 存在
        if (!gameState.sessionId) {
            throw new Error('會話未初始化');
        }
        
        // 转换级别格式 (L2 -> 2)
        const userLevel = parseFloat(gameState.level.replace('L', ''));
        
        // 转换主题格式
        const storyTheme = themeMapping[gameState.theme] || gameState.theme;
        
        // 构建对话历史（只包含文本）
        const conversationHistory = gameState.storyHistory.map(entry => entry.sentence);
        
        // 檢查是否為探索期
        const totalGames = gameState.user?.total_games || 0;
        const explorationMode = totalGames < 3;
        
        // 🚀 優先嘗試使用統一 API（同時獲取句子和詞語）
        const useUnifiedAPI = true; // 可設為 feature flag
        
        if (useUnifiedAPI) {
            try {
                console.log('🚀 調用統一 API（unified-story-agent）...');
                const unifiedResult = await callUnifiedAPI({
                    userSentence: userSentence || '開始故事',
                    selectedWord: selectedWord,
                    sessionId: gameState.sessionId,
                    conversationHistory: conversationHistory,
                    userLevel: userLevel,
                    storyTheme: storyTheme,
                    currentRound: gameState.turn - 1,
                    usedWords: gameState.usedWords.map(w => w.word),
                    userGrade: gameState.user?.grade || 6,
                    cachedUserProfile: {
                        baseline_level: gameState.user?.baseline_level || 2,
                        current_level: gameState.user?.current_level || 2,
                        total_games: gameState.user?.total_games || 0,
                        confidence: gameState.user?.confidence || 'medium'
                    },
                    explorationMode: explorationMode
                });
                
                // 統一 API 成功，直接返回（包含詞語）
                addStoryEntry('ai', unifiedResult.aiSentence);
                
                // 更新詞彙狀態
                gameState.currentWords = unifiedResult.recommendedWords || [];
                gameState.allRecommendedWords.push(unifiedResult.recommendedWords || []);
                gameState.allHighlightWords.push(unifiedResult.highlight || []);  // 🆕 保存學習詞標記
                
                // 🚀 預加載拼音（在背景進行）
                if (unifiedResult.recommendedWords && unifiedResult.recommendedWords.length > 0) {
                    const wordsToPreload = unifiedResult.recommendedWords
                        .filter(w => !gameState.usedWords.map(u => u.word).includes(w.word))
                        .map(w => w.word);
                    
                    if (wordsToPreload.length > 0) {
                        const { preloadWords } = await import('../utils/word-cache.js');
                        const { getWordBriefInfo } = await import('../features/dictionary.js');
                        
                        console.log(`🚀 後台預加載 ${wordsToPreload.length} 個詞彙拼音...`);
                        preloadWords(wordsToPreload, getWordBriefInfo).catch(err => {
                            console.log('⚠️ 預加載拼音失敗（不影響使用）:', err);
                        });
                    }
                }
                
                return unifiedResult;
                
            } catch (unifiedError) {
                console.warn('⚠️ 統一 API 失敗，降級到分離調用:', unifiedError);
                // 降級到舊的分離調用模式
            }
        }
        
        // 降級方案：使用舊的分離調用（story-agent + vocab-recommender）
        console.log('📤 使用分離 API（story-agent + vocab-recommender）...');
        
        const requestBody = {
            userSentence: userSentence || '開始故事',
            selectedWord: selectedWord,
            sessionId: gameState.sessionId,
            conversationHistory: conversationHistory,
            userLevel: userLevel,
            storyTheme: storyTheme,
            currentRound: gameState.turn - 1,
            usedWords: gameState.usedWords.map(w => w.word),
            userGrade: gameState.user?.grade || 6
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/functions/v1/story-agent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                },
                body: JSON.stringify(requestBody)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 錯誤響應:', errorText);
            throw new Error(`API 請求失敗: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'AI 調用失敗');
        }
        
        const data = result.data;
        addStoryEntry('ai', data.aiSentence);
        
        // 背景獲取詞彙（分離模式）
        const aiResult = { ...data, recommendedWords: [] };
        
        const wordlistOptions = {
          mode: gameState.wordlistMode,
          wordlistId: gameState.wordlistId,
          level2Tag: gameState.level2Tag,
          level3Tag: gameState.level3Tag
        };
        
        getRecommendedWords(gameState.turn, wordlistOptions).then(async recommendedWords => {
            gameState.currentWords = recommendedWords || [];
            gameState.allRecommendedWords.push(recommendedWords || []);
            gameState.pendingWords = recommendedWords;
            
            if (recommendedWords && recommendedWords.length > 0) {
                const wordsToPreload = recommendedWords
                    .filter(w => !gameState.usedWords.map(u => u.word).includes(w.word))
                    .map(w => w.word);
                
                if (wordsToPreload.length > 0) {
                    const { preloadWords } = await import('../utils/word-cache.js');
                    const { getWordBriefInfo } = await import('../features/dictionary.js');
                    preloadWords(wordsToPreload, getWordBriefInfo).catch(() => {});
                }
            }
        }).catch(err => {
            console.error('❌ 獲取推薦詞彙失敗:', err);
            gameState.pendingWords = [];
            gameState.currentWords = [];
        });
        
        return aiResult;
        
    } catch (error) {
        console.error('AI 調用失敗:', error);
        showToast('❌ AI 調用失敗：' + error.message);
        throw error;
    }
}

/**
 * 調用統一 API（同時獲取句子和詞語）
 * @param {Object} params - 請求參數
 * @returns {Promise<Object>} 包含句子和詞語的結果
 */
async function callUnifiedAPI(params) {
    // 獲取用戶的 session token（需要用戶認證）
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        throw new Error('用戶未登入');
    }
    
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/functions/v1/unified-story-agent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`  // ✅ 使用用戶 token
            },
            body: JSON.stringify(params)
        }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`統一 API 失敗: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || '統一 API 調用失敗');
    }
    
    console.log('✅ 統一 API 成功（句子 + 詞語）');
    return result.data;
}

/**
 * 提交用户句子
 * @param {string} sentence - 用户输入的句子
 * @param {Object} selectedWord - 选中的词汇对象
 * @returns {Promise<Object>} { gameOver: boolean, aiData?: Object }
 */
export async function submitSentence(sentence, selectedWord) {
    if (!sentence) {
        showToast('請輸入句子！');
        return { gameOver: false };
    }
    
    if (!selectedWord) {
        showToast('請先選擇一個詞彙！');
        return { gameOver: false };
    }
    
    // 检查是否使用了选中的词
    if (!sentence.includes(selectedWord.word)) {
        showToast(`請在句子中使用詞彙：${selectedWord.word}`);
        return { gameOver: false };
    }
    
    // 记录使用的词汇
    addUsedWord(selectedWord);
    
    // 添加到历史
    addStoryEntry('user', sentence, selectedWord.word);
    
    // 增加轮次
    incrementTurn();
    
    // 检查是否完成
    if (gameState.turn > gameState.maxTurns) {
        return { gameOver: true }; // 游戏结束
    }
    
    // 继续获取 AI 响应
    const aiData = await getAIResponse(sentence, selectedWord.word);
    
    // 記錄本輪數據到數據庫（非阻塞，不影響遊戲流程）
    recordRoundData({
        roundNumber: gameState.turn - 1,
        recommendedWords: gameState.currentWords,
        selectedWord: selectedWord.word,
        selectedDifficulty: selectedWord.difficulty_level || 2,
        userSentence: sentence,
        aiScore: aiData.score || null,
        aiFeedback: aiData.feedback || null
    }).catch(err => {
        console.error('⚠️ 數據記錄失敗（不影響遊戲）:', err);
    });
    
    // 自动保存进度到localStorage
    autoSaveProgress();
    
    return { gameOver: false, aiData }; // 游戏继续，返回 AI 数据
}

/**
 * 完成故事
 * @returns {Promise<Object>} 统计数据
 */
export async function finishStory() {
    // 生成默认标题
    const defaultTitle = generateDefaultTitle();
    
    // 保存完成的故事到新的 localStorage 结构
    const storyData = {
        title: defaultTitle,
        status: 'completed',
        level: gameState.level,
        theme: gameState.theme,
        maxTurns: gameState.maxTurns,
        currentTurn: gameState.turn - 1,
        storyHistory: gameState.storyHistory,
        usedWords: gameState.usedWords,
        sessionId: gameState.sessionId
    };
    
    const savedStory = saveStory(storyData);
    
    // 将故事ID保存到gameState，以便在完成页面使用
    gameState.currentStoryId = savedStory.id;
    
    // 保存完成的故事到旧的 localStorage（保持兼容性）
    const oldStoryData = {
        id: gameState.sessionId || Date.now(),
        level: gameState.level,
        theme: gameState.theme,
        history: gameState.storyHistory,
        usedWords: gameState.usedWords,
        completedAt: new Date().toISOString()
    };
    saveCompletedStory(oldStoryData);
    
    // 计算统计数据
    const totalTurns = gameState.storyHistory.filter(h => h.role === 'user').length;
    const vocabUsed = gameState.usedWords.length;
    const fullStory = gameState.storyHistory.map(h => h.sentence).join('');
    const storyLength = fullStory.length;
    
    // 更新侧边栏统计
    updateSidebarStats();
    
    // 處理遊戲完成（校準評估或會話彙總）
    const completionData = await handleGameCompletion();
    
    return {
        totalTurns,
        vocabUsed,
        storyLength,
        defaultTitle,
        storyId: savedStory.id,
        ...completionData
    };
}

/**
 * 重新开始游戏
 */
export function restartGame() {
    // 由 UI 层处理页面切换
}

/**
 * 分享故事
 */
export function shareStory() {
    const fullStory = gameState.storyHistory.map(h => h.sentence).join('');
    
    if (navigator.share) {
        navigator.share({
            title: '我和AI創作的故事',
            text: fullStory
        }).catch(err => console.log('分享失敗:', err));
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(fullStory).then(() => {
            showToast('✅ 故事已複製到剪貼板！');
        }).catch(() => {
            showToast('❌ 複製失敗，請手動複製');
        });
    }
}

/**
 * 自动保存进度
 * 在创作过程中自动保存未完成的故事
 */
export function autoSaveProgress() {
    if (!gameState.currentStoryId) {
        // 第一次保存，创建新故事
        const defaultTitle = generateDefaultTitle();
        const storyData = {
            title: defaultTitle,
            status: 'in_progress',
            level: gameState.level,
            theme: gameState.theme,
            maxTurns: gameState.maxTurns,
            currentTurn: gameState.turn - 1,
            storyHistory: gameState.storyHistory,
            usedWords: gameState.usedWords,
            currentWords: gameState.currentWords,
            allRecommendedWords: gameState.allRecommendedWords,
            allHighlightWords: gameState.allHighlightWords,  // 🆕 保存學習詞標記
            sessionId: gameState.sessionId
        };
        const savedStory = saveStory(storyData);
        gameState.currentStoryId = savedStory.id;
        console.log('✅ 首次自動保存進度:', savedStory.id);
    } else {
        // 更新现有故事
        const updates = {
            currentTurn: gameState.turn - 1,
            storyHistory: gameState.storyHistory,
            usedWords: gameState.usedWords,
            currentWords: gameState.currentWords,
            allRecommendedWords: gameState.allRecommendedWords,
            allHighlightWords: gameState.allHighlightWords  // 🆕 保存學習詞標記
        };
        saveStory({ id: gameState.currentStoryId, ...updates });
        console.log('✅ 更新進度:', gameState.currentStoryId);
    }
}

