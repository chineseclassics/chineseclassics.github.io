/**
 * 界面显示控制模块
 * 处理各个界面的初始化和更新
 */

import { gameState } from '../core/game-state.js';
import { getThemeName } from '../core/story-engine.js';
import { showLoading } from '../utils/dom.js';
import { typewriterEffect } from '../utils/typewriter.js';
import { makeAIWordsClickable, makeUserSentenceClickable, selectWord } from '../features/word-manager.js';
import { loadSettings } from './modals.js';

/**
 * 初始化启动界面
 */
export function initStartScreen() {
    // 级别选择交互
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
    
    // 主题选择交互
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

/**
 * 初始化游戏界面
 * @param {string} level - 级别
 * @param {string} theme - 主题
 */
export function initGameScreen(level, theme) {
    // 更新游戏界面信息
    const currentLevel = document.getElementById('current-level');
    const currentTheme = document.getElementById('current-theme');
    const turnCount = document.getElementById('turn-count');
    const maxTurns = document.getElementById('max-turns');
    
    if (currentLevel) currentLevel.textContent = level;
    if (currentTheme) currentTheme.textContent = getThemeName(theme);
    if (turnCount) turnCount.textContent = '1';
    if (maxTurns) maxTurns.textContent = gameState.maxTurns;
    
    // 清空故事显示区域
    const storyDisplay = document.getElementById('story-display');
    if (storyDisplay) {
        storyDisplay.innerHTML = '';
    }
}

/**
 * 显示 AI 响应
 * @param {Object} data - AI 响应数据
 */
export async function displayAIResponse(data) {
    console.log('🎨 displayAIResponse 被调用，数据:', data);
    showLoading(false);
    
    // 添加 AI 消息到故事显示区域
    const storyDisplay = document.getElementById('story-display');
    if (!storyDisplay) return;
    
    // 创建 AI 消息容器
    const aiMessage = document.createElement('div');
    aiMessage.className = 'message ai';
    aiMessage.innerHTML = `
        <div class="message-label ai">🤖 AI 故事家</div>
        <div class="message-content">
            <div class="inline-loading">
                <div class="inline-loading-spinner"></div>
                <span class="inline-loading-text">正在創作中...</span>
            </div>
        </div>
    `;
    storyDisplay.appendChild(aiMessage);
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    const messageContent = aiMessage.querySelector('.message-content');
    
    // 等待一小段时间，让用户看到加载动画
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空加载动画，开始打字机效果
    messageContent.innerHTML = '';
    
    // 用打字机效果显示纯文本（速度减慢到 60ms）
    await typewriterEffect(messageContent, data.aiSentence, 60);
    
    // 然后替换为可点击的词语版本
    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.recommendedWords);
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    // 显示词汇选项（过滤掉已使用的词汇）
    const wordsContainer = document.getElementById('word-choices');
    if (!wordsContainer) return;
    
    wordsContainer.innerHTML = '';
    
    if (data.recommendedWords && data.recommendedWords.length > 0) {
        // 获取已使用词汇的列表
        const usedWordsList = gameState.usedWords.map(w => w.word);
        
        // 过滤掉已使用的词汇
        const availableWords = data.recommendedWords.filter(wordObj => 
            !usedWordsList.includes(wordObj.word)
        );
        
        // 显示可用的词汇
        availableWords.forEach(wordObj => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn';
            wordBtn.innerHTML = `
                <div>${wordObj.word}</div>
                <div class="word-meta">${wordObj.pinyin || ''}</div>
            `;
            wordBtn.onclick = () => selectWord(wordObj);
            wordsContainer.appendChild(wordBtn);
        });
        
        // 如果所有词汇都已使用，显示提示
        if (availableWords.length === 0) {
            wordsContainer.innerHTML = '<div style="color: var(--text-light); padding: 20px; text-align: center;">所有推薦詞彙都已使用，請等待AI提供新詞彙...</div>';
        }
    }
    
    // 重置输入
    gameState.selectedWord = null;
    const selectedWordDisplay = document.getElementById('selected-word-display');
    const userInput = document.getElementById('user-input');
    const submitBtn = document.getElementById('submit-btn');
    
    if (selectedWordDisplay) selectedWordDisplay.textContent = '請先選擇一個詞彙...';
    if (userInput) {
        userInput.value = '';
        userInput.disabled = true;
    }
    if (submitBtn) submitBtn.disabled = true;
}

/**
 * 显示用户消息
 * @param {string} sentence - 用户句子
 * @param {Object} usedWord - 使用的词汇
 */
export function displayUserMessage(sentence, usedWord) {
    const storyDisplay = document.getElementById('story-display');
    if (!storyDisplay) return;
    
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.innerHTML = `
        <div class="message-label user">👤 你</div>
        <div class="message-content">${makeUserSentenceClickable(sentence, usedWord)}</div>
    `;
    storyDisplay.appendChild(userMessage);
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
}

/**
 * 更新轮次显示
 * @param {number} turn - 当前轮次
 */
export function updateTurnDisplay(turn) {
    const turnCount = document.getElementById('turn-count');
    if (turnCount) {
        turnCount.textContent = turn;
    }
}

/**
 * 初始化完成界面
 * @param {Object} stats - 统计数据
 */
export function initFinishScreen(stats) {
    const totalTurns = document.getElementById('total-turns');
    const vocabUsed = document.getElementById('vocab-used');
    const storyLength = document.getElementById('story-length');
    
    if (totalTurns) totalTurns.textContent = stats.totalTurns;
    if (vocabUsed) vocabUsed.textContent = stats.vocabUsed;
    if (storyLength) storyLength.textContent = stats.storyLength;
    
    // 显示完整故事
    const fullStoryText = document.getElementById('full-story-text');
    if (!fullStoryText) return;
    
    fullStoryText.innerHTML = '';
    
    gameState.storyHistory.forEach((item, index) => {
        const p = document.createElement('p');
        p.style.marginBottom = '15px';
        p.style.lineHeight = '2';
        p.style.fontSize = '1.2em';
        
        if (item.role === 'ai') {
            // AI句子：标记当时推荐的词汇（使用allRecommendedWords）
            const aiIndex = Math.floor(index / 2);
            const recommendedWords = aiIndex < gameState.allRecommendedWords.length ? 
                gameState.allRecommendedWords[aiIndex] : [];
            p.innerHTML = `🤖 ${makeAIWordsClickable(item.sentence, recommendedWords)}`;
        } else {
            // 用户句子：高亮用户使用的词汇
            const userIndex = Math.floor((index - 1) / 2);
            const usedWord = userIndex < gameState.usedWords.length ? 
                gameState.usedWords[userIndex] : null;
            p.innerHTML = `👤 ${makeUserSentenceClickable(item.sentence, usedWord)}`;
        }
        fullStoryText.appendChild(p);
    });
}

/**
 * 初始化设置界面
 */
export function initSettingsScreen() {
    loadSettings();
}

