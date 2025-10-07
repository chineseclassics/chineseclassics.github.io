/**
 * 故事生成引擎模块
 * 处理游戏流程和 AI 交互
 */

import { gameState, addStoryEntry, addUsedWord, incrementTurn } from './game-state.js';
import { createSession } from './session-manager.js';
import { showLoading } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';
import { saveCompletedStory, updateSidebarStats } from '../utils/storage.js';
import { SUPABASE_CONFIG } from '../config.js';

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
    gameState.sessionId = null;
    
    try {
        // 创建数据库会话记录
        showLoading(true);
        
        const session = await createSession(gameState.userId, {
            theme: themeMapping[theme] || theme,
            choice: '開始故事',
            variant: 1,
            maxRounds: gameState.maxTurns
        });
        
        gameState.sessionId = session.id;
        console.log('✅ 會話創建成功:', gameState.sessionId);
        
        // 调用成功回调
        if (onSuccess) {
            await onSuccess();
        }
    } catch (error) {
        console.error('❌ 創建會話失敗:', error);
        showToast('啟動遊戲失敗，請重試');
        showLoading(false);
    }
}

/**
 * 调用 AI Agent 获取响应
 * @param {string} userSentence - 用户句子
 * @param {string} selectedWord - 选中的词汇
 * @returns {Promise<Object>} AI 响应数据
 */
export async function getAIResponse(userSentence = '', selectedWord = '') {
    showLoading(true);
    
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
        
        // 发送请求到 Edge Function
        const requestBody = {
            userSentence: userSentence || '開始故事',
            selectedWord: selectedWord,
            sessionId: gameState.sessionId,
            conversationHistory: conversationHistory,
            userLevel: userLevel,
            storyTheme: storyTheme,
            currentRound: gameState.turn - 1,
            usedWords: gameState.usedWords.map(w => w.word)
        };
        
        console.log('📤 發送請求:', requestBody);
        
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
        console.log('📥 AI 響應:', result);
        
        // 检查是否成功
        if (!result.success) {
            throw new Error(result.error || 'AI 調用失敗');
        }
        
        const data = result.data;
        
        // 添加到历史
        addStoryEntry('ai', data.aiSentence);
        
        // 保存推荐词汇
        gameState.currentWords = data.recommendedWords || [];
        gameState.allRecommendedWords.push(data.recommendedWords || []);
        
        return data;
        
    } catch (error) {
        console.error('AI 調用失敗:', error);
        showToast('❌ AI 調用失敗：' + error.message);
        showLoading(false);
        throw error;
    }
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
    
    return { gameOver: false, aiData }; // 游戏继续，返回 AI 数据
}

/**
 * 完成故事
 * @returns {Object} 统计数据
 */
export function finishStory() {
    // 保存完成的故事到 localStorage
    const storyData = {
        id: gameState.sessionId || Date.now(),
        level: gameState.level,
        theme: gameState.theme,
        history: gameState.storyHistory,
        usedWords: gameState.usedWords,
        completedAt: new Date().toISOString()
    };
    saveCompletedStory(storyData);
    
    // 计算统计数据
    const totalTurns = gameState.storyHistory.filter(h => h.role === 'user').length;
    const vocabUsed = gameState.usedWords.length;
    const fullStory = gameState.storyHistory.map(h => h.sentence).join('');
    const storyLength = fullStory.length;
    
    // 更新侧边栏统计
    updateSidebarStats();
    
    return {
        totalTurns,
        vocabUsed,
        storyLength
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

