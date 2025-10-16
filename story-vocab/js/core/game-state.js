/**
 * 游戏状态管理模块
 * 管理游戏的核心状态数据
 */

// 游戏状态对象
export const gameState = {
    level: 'L2',              // 当前级别
    theme: 'nature',          // 当前主题
    turn: 1,                  // 当前轮次
    maxTurns: 8,              // 最大轮次
    storyHistory: [],         // 故事历史记录
    sessionId: null,          // 会话 ID
    userId: null,             // 用户 ID
    selectedWord: null,       // 当前选中的词汇
    currentWords: [],         // 当前可选词汇列表
    usedWords: [],            // 已使用的词汇列表
    allRecommendedWords: [],  // 所有轮次的推荐词汇
    allHighlightWords: [],    // 🆕 所有轮次的学习词标记
    currentStoryId: null,     // 当前故事在 localStorage 中的 ID
    
    // 词表模式相关（新增）
    wordlistMode: 'ai',       // 'ai' | 'wordlist'
    wordlistId: null,         // 指定词表ID
    level2Tag: null,          // 第二层级标签
    level3Tag: null           // 第三层级标签
};

/**
 * 重置游戏状态
 */
export function resetGameState() {
    gameState.turn = 1;
    gameState.storyHistory = [];
    gameState.usedWords = [];
    gameState.allRecommendedWords = [];
    gameState.allHighlightWords = [];
    gameState.sessionId = null;
    gameState.selectedWord = null;
    gameState.currentWords = [];
    gameState.currentStoryId = null;
    // 词表状态在新游戏开始时会重新设置，这里不重置
}

/**
 * 更新游戏状态
 * @param {Object} updates - 要更新的状态字段
 */
export function updateGameState(updates) {
    Object.assign(gameState, updates);
}

/**
 * 添加故事历史记录
 * @param {string} role - 角色（'ai' 或 'user'）
 * @param {string} sentence - 句子内容
 * @param {string} wordUsed - 使用的词汇（用户句子）
 */
export function addStoryEntry(role, sentence, wordUsed = null) {
    const entry = {
        role,
        sentence
    };
    
    if (wordUsed) {
        entry.word_used = wordUsed;
    }
    
    gameState.storyHistory.push(entry);
}

/**
 * 添加已使用的词汇
 * @param {Object} word - 词汇对象
 */
export function addUsedWord(word) {
    if (!gameState.usedWords.some(w => w.word === word.word)) {
        gameState.usedWords.push(word);
    }
}

/**
 * 增加轮次
 */
export function incrementTurn() {
    gameState.turn++;
}

/**
 * 检查游戏是否结束
 * @returns {boolean}
 */
export function isGameOver() {
    return gameState.turn > gameState.maxTurns;
}

/**
 * 获取完整故事文本
 * @returns {string}
 */
export function getFullStory() {
    return gameState.storyHistory.map(h => h.sentence).join('');
}

