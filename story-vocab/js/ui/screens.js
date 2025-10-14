/**
 * 界面显示控制模块
 * 处理各个界面的初始化和更新
 */

import { gameState } from '../core/game-state.js';
import { getThemeName } from '../core/story-engine.js';
import { typewriterEffect } from '../utils/typewriter.js';
import { makeAIWordsClickable, makeUserSentenceClickable, selectWord } from '../features/word-manager.js';
import { loadSettings } from './modals.js';
import { getBriefInfo } from '../utils/word-cache.js';
import { renderLevel2Cards, clearHierarchyCards } from './hierarchy-cards.js';
import { getSupabase } from '../supabase-client.js';
import { showToast } from '../utils/toast.js';

/**
 * 初始化启动界面
 */
export async function initStartScreen() {
    // 主题选择交互（先绑定，确保始终可用）
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    const supabase = getSupabase();

    // 默认状态：AI模式
    gameState.wordlistMode = 'ai';
    gameState.wordlistId = null;
    gameState.level2Tag = null;
    gameState.level3Tag = null;

    try {
        // 使用 gameState 中的用戶 ID（已經是正確的 users.id）
        const userId = gameState.userId;
        if (!userId) {
            console.log('ℹ️ 用户未登录，使用默认AI模式');
            return; // AI模式已经是默认显示的
        }

        // 加载用户词表偏好
        const { data: prefs } = await supabase
            .from('user_wordlist_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        console.log('📊 用户词表偏好:', prefs);

        // 如果没有偏好或选择了AI模式
        if (!prefs || !prefs.default_wordlist_id || prefs.default_mode === 'ai') {
            console.log('✅ 使用AI智能推荐模式');
            return; // AI模式已经是默认显示的
        }

        // 用户选择了特定词表，加载词表信息
        const { data: wordlist } = await supabase
            .from('wordlists')
            .select('*')
            .eq('id', prefs.default_wordlist_id)
            .maybeSingle();

        if (!wordlist) {
            console.warn('⚠️ 词表不存在，使用AI模式');
            updateWordlistNameDisplay('AI智能推薦');
            return;
        }

        // 加载词表的标签
        const { data: tags } = await supabase
            .from('wordlist_tags')
            .select('*')
            .eq('wordlist_id', wordlist.id)
            .order('tag_level')
            .order('sort_order');

        console.log('📋 词表:', wordlist.name);
        console.log('📋 词表标签:', tags);

        // 设置gameState
        gameState.wordlistMode = 'wordlist';
        gameState.wordlistId = wordlist.id;

        const level2Tags = tags?.filter(t => t.tag_level === 2) || [];

        // 如果有层级标签，显示层级卡片
        if (level2Tags.length > 0) {
            console.log('📚 显示词表层级卡片');
            showWordlistHierarchy();
            renderLevel2Cards(wordlist, tags);
            updateWordlistNameDisplay(wordlist.name);
        } else {
            // 没有层级，使用整个词表但保持AI模式的UI显示
            console.log('📚 词表无层级，保持AI模式UI');
            updateWordlistNameDisplay(wordlist.name);
        }

    } catch (error) {
        console.error('❌ 初始化启动界面失败:', error);
        updateWordlistNameDisplay('AI智能推薦');
    }
}

/**
 * 显示AI模式
 */
function showAIMode() {
    const aiSection = document.getElementById('ai-mode-section');
    const hierarchySection = document.getElementById('wordlist-hierarchy-section');

    if (aiSection) aiSection.style.display = 'block';
    if (hierarchySection) hierarchySection.style.display = 'none';

    clearHierarchyCards();
}

/**
 * 显示词表层级选择
 */
function showWordlistHierarchy() {
    const aiSection = document.getElementById('ai-mode-section');
    const hierarchySection = document.getElementById('wordlist-hierarchy-section');

    if (aiSection) aiSection.style.display = 'none';
    if (hierarchySection) hierarchySection.style.display = 'block';
}

/**
 * 更新底部词表名称显示
 * @param {string} name - 词表名称
 */
function updateWordlistNameDisplay(name) {
    const nameElement = document.getElementById('current-wordlist-name-inline');
    if (nameElement) {
        nameElement.textContent = name;
    }
}

/**
 * 初始化游戏界面
 * @param {string} level - 级别
 * @param {string} theme - 主题
 */
export function initGameScreen(level, theme) {
    // 更新進度顯示
    const currentTurn = document.getElementById('current-turn');
    const maxTurn = document.getElementById('max-turn');
    const progressBar = document.getElementById('progress-bar');
    
    if (currentTurn) currentTurn.textContent = '1';
    if (maxTurn) maxTurn.textContent = gameState.maxTurns;
    if (progressBar) {
        progressBar.style.strokeDashoffset = '220';
    }
    
    // 清空故事显示区域并显示内联加载动画（保留進度圓圈）
    const storyDisplay = document.getElementById('story-display');
    if (storyDisplay) {
        // 移除所有消息，但保留進度圓圈
        const messages = storyDisplay.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // 添加初始加載消息
        const initialMessage = document.createElement('div');
        initialMessage.className = 'message ai';
        initialMessage.innerHTML = `
            <div class="message-label ai">
                <span class="emoji">🤖</span>
                <span class="name">AI故事家</span>
            </div>
            <div class="message-content">
                <div class="inline-loading">
                    <div class="inline-loading-spinner"></div>
                    <span class="inline-loading-text">正在準備故事...</span>
                </div>
            </div>
        `;
        storyDisplay.appendChild(initialMessage);
    }
}

/**
 * 显示 AI 响应
 * @param {Object} data - AI 响应数据
 */
export async function displayAIResponse(data) {
    console.log('🎨 displayAIResponse 被调用，数据:', data);
    
    const storyDisplay = document.getElementById('story-display');
    if (!storyDisplay) return;
    
    // 查找最后一个 AI 消息（应该是刚添加的加载动画）
    const aiMessages = storyDisplay.querySelectorAll('.message.ai');
    let aiMessage = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null;
    
    if (!aiMessage) {
        // 如果没有（不应该发生），创建新的 AI 消息容器
        aiMessage = document.createElement('div');
        aiMessage.className = 'message ai';
        aiMessage.innerHTML = `
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
        storyDisplay.appendChild(aiMessage);
    }
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    const messageContent = aiMessage.querySelector('.message-content');
    
    // 等待一小段时间，让用户看到加载动画
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空加载动画，开始打字机效果
    messageContent.innerHTML = '';
    
    // 用打字机效果显示纯文本（速度调整为 90ms，提供更好的閱讀體驗）
    await typewriterEffect(messageContent, data.aiSentence, 90);
    
    // 然后替换为可点击的词语版本（此時詞彙可能還沒到，先用空陣列）
    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.recommendedWords);
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    // 🎯 打字機結束後，等待 1 秒讓用戶閱讀完整句子，然後顯示詞卡
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 檢查是否有待顯示的詞彙（背景加載完成）
    // 🔧 修復：增加重試機制，確保即使用戶打開/關閉模態窗口也能顯示詞卡
    let wordsContainer = document.getElementById('word-choices');
    let retryCount = 0;
    while (!wordsContainer && retryCount < 5) {
        console.log(`⚠️ word-choices 容器不存在，重試 ${retryCount + 1}/5...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        wordsContainer = document.getElementById('word-choices');
        retryCount++;
    }
    
    if (!wordsContainer) {
        console.error('❌ word-choices 容器始終不存在，無法顯示詞卡');
        return;
    }
    
    let wordsToDisplay = data.recommendedWords;
    
    // 如果傳入的詞彙是空的，檢查 gameState.pendingWords
    if (!wordsToDisplay || wordsToDisplay.length === 0) {
        if (gameState.pendingWords && gameState.pendingWords.length > 0) {
            console.log('📦 使用背景加載的詞彙');
            wordsToDisplay = gameState.pendingWords;
            gameState.pendingWords = null; // 清除標記
        }
    }
    
    if (wordsToDisplay && wordsToDisplay.length > 0) {
        // 更新可點擊的詞語版本（現在有詞彙了）
        messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, wordsToDisplay);
        
        // 有詞彙數據，顯示詞卡
        const usedWordsList = gameState.usedWords.map(w => w.word);
        
        // 过滤掉已使用的词汇
        const availableWords = wordsToDisplay.filter(wordObj => 
            !usedWordsList.includes(wordObj.word)
        );
        
        // 如果所有词汇都已使用，显示提示
        if (availableWords.length === 0) {
            wordsContainer.innerHTML = '<div style="color: var(--text-light); padding: 20px; text-align: center;">所有推薦詞彙都已使用，請等待AI提供新詞彙...</div>';
        } else {
            // 🎴 使用翻转动画更新词汇卡片（动画完成后自动启用）
            await updateWordCardsWithFlipAnimation(availableWords);
        }
    } else {
        // 詞彙還在加載中，繼續等待
        console.log('⏳ 詞彙還在加載中，設置回調等待...');
        // 設置一個檢查，每 500ms 檢查一次是否有新詞彙
        const checkPendingWords = setInterval(async () => {
            if (gameState.pendingWords && gameState.pendingWords.length > 0) {
                clearInterval(checkPendingWords);
                const pendingWords = gameState.pendingWords;
                gameState.pendingWords = null;
                
                // 更新可點擊的詞語版本（如果 messageContent 還存在）
                if (messageContent && messageContent.parentElement) {
                    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, pendingWords);
                }
                
                // 🔧 修復：確保容器存在後再顯示詞卡
                let container = document.getElementById('word-choices');
                let retry = 0;
                while (!container && retry < 3) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    container = document.getElementById('word-choices');
                    retry++;
                }
                
                if (!container) {
                    console.error('❌ 詞彙加載完成但 word-choices 容器不存在');
                    return;
                }
                
                // 顯示詞卡
                const usedWordsList = gameState.usedWords.map(w => w.word);
                const availableWords = pendingWords.filter(wordObj => 
                    !usedWordsList.includes(wordObj.word)
                );
                
                if (availableWords.length > 0) {
                    console.log('✅ 延遲加載的詞彙現在顯示');
                    updateWordCardsWithFlipAnimation(availableWords);
                } else {
                    console.log('⚠️ 所有詞彙都已使用');
                }
            }
        }, 500);
        
        // 最多等待 10 秒
        setTimeout(() => {
            clearInterval(checkPendingWords);
            console.log('⏱️ 詞彙加載超時（10秒）');
        }, 10000);
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
 * 使用翻转动画更新词汇卡片
 * @param {Array} newWords - 新的词汇列表
 */
async function updateWordCardsWithFlipAnimation(newWords) {
    // 🔧 修復：增加重試機制，確保容器存在
    let wordsContainer = document.getElementById('word-choices');
    let retryCount = 0;
    while (!wordsContainer && retryCount < 3) {
        console.log(`⚠️ updateWordCards: word-choices 容器不存在，重試 ${retryCount + 1}/3...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        wordsContainer = document.getElementById('word-choices');
        retryCount++;
    }
    
    if (!wordsContainer) {
        console.error('❌ updateWordCards: word-choices 容器始終不存在');
        return;
    }
    
    const existingCards = wordsContainer.querySelectorAll('.word-btn');
    
    if (existingCards.length === 0) {
        // 第一次显示，等待预加载完成再显示（确保有拼音）
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 创建卡片（使用入場動畫）
        newWords.forEach((wordObj, index) => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn first-appear';
            // 尝试从缓存获取拼音
            const cached = getBriefInfo(wordObj.word);
            const pinyin = cached?.pinyin || wordObj.pinyin || '';
            wordBtn.innerHTML = `
                <div class="word-meta">${pinyin}</div>
                <div class="word-main-text">${wordObj.word}</div>
            `;
            wordBtn.onclick = () => selectWord(wordObj);
            // 設置延遲動畫，讓卡片依次飛入
            wordBtn.style.animationDelay = `${index * 0.08}s`;
            wordsContainer.appendChild(wordBtn);
        });
        
        // 動畫完成後移除 class（避免影響後續樣式）
        await new Promise(resolve => setTimeout(resolve, 500 + (newWords.length * 80)));
        wordsContainer.querySelectorAll('.word-btn').forEach(btn => {
            btn.classList.remove('first-appear');
            btn.style.animationDelay = '';
        });
    } else {
        // 有旧卡片，执行翻转动画
        // 1. 翻转隐藏旧卡片（已经是disabled状态）
        existingCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('flipping-out');
            }, index * 80);
        });
        
        // 2. 等待翻转完成（这期间预加载也在进行）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 再稍等一下，确保预加载的拼音数据已经缓存
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 4. 清空并创建新卡片（初始为禁用状态）
        wordsContainer.innerHTML = '';
        newWords.forEach(wordObj => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn flipping-in';
            wordBtn.disabled = true; // 🔒 初始禁用
            wordBtn.classList.add('disabled');
            // 尝试从缓存获取拼音
            const cached = getBriefInfo(wordObj.word);
            const pinyin = cached?.pinyin || wordObj.pinyin || '';
            wordBtn.innerHTML = `
                <div class="word-meta">${pinyin}</div>
                <div class="word-main-text">${wordObj.word}</div>
            `;
            wordBtn.onclick = () => selectWord(wordObj);
            wordsContainer.appendChild(wordBtn);
        });
        
        // 5. 触发翻入动画
        setTimeout(() => {
            wordsContainer.querySelectorAll('.word-btn').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.remove('flipping-in');
                    card.classList.add('flipped-in');
                }, index * 80);
            });
        }, 50);
        
        // 6. 动画完成后清理动画类并启用按钮
        await new Promise(resolve => setTimeout(resolve, 600));
        wordsContainer.querySelectorAll('.word-btn').forEach(card => {
            card.classList.remove('flipped-in');
            // 🔓 动画完成后启用按钮
            card.disabled = false;
            card.classList.remove('disabled');
        });
    }
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
        <div class="message-label user">
            <span class="emoji">👤</span>
            <span class="name">你</span>
        </div>
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
    const currentTurn = document.getElementById('current-turn');
    const progressBar = document.getElementById('progress-bar');
    const progressCircle = document.getElementById('progress-circle');
    const maxTurn = document.getElementById('max-turn');
    
    if (currentTurn) {
        currentTurn.textContent = turn;
    }
    
    // 更新 SVG 圓形進度條
    if (progressBar && maxTurn) {
        const maxTurns = parseInt(maxTurn.textContent) || 10;
        const progress = turn / maxTurns;
        const circumference = 220; // 2 * PI * r (r=35)
        const offset = circumference - (progress * circumference);
        progressBar.style.strokeDashoffset = offset;
        
        // 添加脈衝動畫
        if (progressCircle) {
            progressCircle.classList.add('updating');
            setTimeout(() => {
                progressCircle.classList.remove('updating');
            }, 500);
        }
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
    
    // 设置默认标题
    const titleInput = document.getElementById('story-title-input');
    if (titleInput && stats.defaultTitle) {
        titleInput.value = stats.defaultTitle;
    }
    
    // 如果是第一次遊戲（校準完成），顯示特殊消息
    if (stats.isFirstGame && stats.assessment) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'calibration-complete-message';
        messageDiv.style.cssText = 'margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; text-align: center;';
        messageDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">🎉 ${stats.message}</h3>
            <p style="margin: 0; opacity: 0.9;">下次我將為你推薦更合適的詞彙！</p>
        `;
        
        const finishScreen = document.getElementById('finish-screen');
        if (finishScreen) {
            const contentDiv = finishScreen.querySelector('.content');
            if (contentDiv && contentDiv.firstChild) {
                contentDiv.insertBefore(messageDiv, contentDiv.firstChild);
            }
        }
    }
    
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
export async function initSettingsScreen() {
    loadSettings();
    
    // 加载词表选择器
    await loadWordlistSelectorSetting();
}

/**
 * 顯示反饋加載動畫
 */
export function showFeedbackLoading() {
    const feedbackSection = document.getElementById('feedback-section');
    const wordChoicesSection = document.getElementById('word-choices-section');
    
    if (!feedbackSection) return;
    
    // 隱藏詞彙選擇區域
    if (wordChoicesSection) {
        wordChoicesSection.style.display = 'none';
    }
    
    // 顯示反饋區域並顯示加載動畫
    feedbackSection.style.display = 'block';
    feedbackSection.innerHTML = `
        <div class="feedback-message">
            <div class="inline-loading">
                <div class="inline-loading-spinner"></div>
                <span class="inline-loading-text">AI老師正在評價中...</span>
            </div>
        </div>
    `;
}

/**
 * 顯示反饋內容（轻量化版本）
 * @param {Object} feedback - 反饋數據
 * @param {string} originalSentence - 用戶原句
 * @param {Object} selectedWord - 選中的詞彙
 */
export function displayFeedback(feedback, originalSentence, selectedWord) {
    const feedbackSection = document.getElementById('feedback-section');
    if (!feedbackSection) return;
    
    feedbackSection.innerHTML = `
        <div class="feedback-message">
            <div class="feedback-score">
                <div class="score-header">
                    <div class="score-title">句子評分</div>
                    <div class="score-number">${feedback.score}</div>
                    <div class="score-label">/10</div>
                </div>
                <div class="score-comment">${feedback.comment}</div>
            </div>
            
            <div class="optimized-sentence-container">
                <div class="optimized-sentence-text">${feedback.optimizedSentence}</div>
                <button class="use-optimized-btn" onclick="useOptimizedSentence()">使用</button>
            </div>
        </div>
    `;
    
    // 保存到全局，供按鈕調用
    window._currentFeedback = { feedback, originalSentence, selectedWord };
}

/**
 * 隱藏反饋區域，顯示詞彙選擇區域
 */
export function hideFeedbackSection() {
    const feedbackSection = document.getElementById('feedback-section');
    const wordChoicesSection = document.getElementById('word-choices-section');
    
    if (feedbackSection) feedbackSection.style.display = 'none';
    if (wordChoicesSection) wordChoicesSection.style.display = 'block';
}

// ==================== 词表选择和上传功能 ====================

let uploadedFile = null;
let selectedWordlistIdInSetting = null;

/**
 * 加载设置界面的词表选择器
 */
async function loadWordlistSelectorSetting() {
    const supabase = getSupabase();
    
    try {
        // 使用 gameState 中的用戶 ID（已經是正確的 users.id）
        const userId = gameState.userId;
        if (!userId) return;

        // 加载用户偏好
        const { data: prefs } = await supabase
            .from('user_wordlist_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        // 加载所有可用词表
        const { data: wordlists } = await supabase
            .from('wordlists')
            .select('*')
            .or(`type.eq.system,owner_id.eq.${userId}`)
            .order('type', { ascending: false })
            .order('name');

        const systemWordlists = wordlists?.filter(w => w.type === 'system') || [];
        const customWordlists = wordlists?.filter(w => w.owner_id === userId) || [];

        // 填充系统词表到自定义下拉菜单
        const systemDropdown = document.getElementById('system-wordlists-dropdown');
        if (systemDropdown) {
            if (systemWordlists.length > 0) {
                systemDropdown.innerHTML = systemWordlists.map(wl => `
                    <div class="wordlist-option" data-value="${wl.id}" onclick="selectWordlist('${wl.id}', '📖 ${wl.name}', '${wl.total_words || 0}')">
                        <span class="wordlist-icon">📖</span>
                        <div class="wordlist-info">
                            <div class="wordlist-name-text">${wl.name}</div>
                            <div class="wordlist-count">${wl.total_words || 0} 個詞彙</div>
                        </div>
                    </div>
                `).join('');
            } else {
                systemDropdown.innerHTML = '<div class="wordlist-option" style="opacity: 0.5; cursor: default;">暫無系統詞表</div>';
            }
        }

        // 填充自定义词表到自定义下拉菜单（带删除按钮）
        const customDropdown = document.getElementById('custom-wordlists-dropdown');
        if (customDropdown) {
            if (customWordlists.length > 0) {
                customDropdown.innerHTML = customWordlists.map(wl => `
                    <div class="wordlist-option" data-value="${wl.id}">
                        <span class="wordlist-icon" onclick="selectWordlist('${wl.id}', '✨ ${wl.name}', '${wl.total_words || 0}')">✨</span>
                        <div class="wordlist-info" onclick="selectWordlist('${wl.id}', '✨ ${wl.name}', '${wl.total_words || 0}')">
                            <div class="wordlist-name-text">${wl.name}</div>
                            <div class="wordlist-count">${wl.total_words || 0} 個詞彙</div>
                        </div>
                        <button class="wordlist-delete-btn" onclick="event.stopPropagation(); deleteCustomWordlist('${wl.id}', '${wl.name}')">
                            🗑️ 刪除
                        </button>
                    </div>
                `).join('');
            } else {
                customDropdown.innerHTML = '<div class="wordlist-option" style="opacity: 0.5; cursor: default;">暫無自定義詞表</div>';
            }
        }

        // 设置当前选中并更新显示
        let selectedId = prefs?.default_wordlist_id || 'ai';
        selectedWordlistIdInSetting = selectedId === 'ai' ? null : selectedId;
        
        // 更新选择器头部显示
        const headerIcon = document.querySelector('.wordlist-selector-header .wordlist-icon');
        const selectedNameElement = document.getElementById('selected-wordlist-name');
        
        if (headerIcon && selectedNameElement) {
            if (selectedId === 'ai') {
                headerIcon.textContent = '🤖';
                selectedNameElement.textContent = 'AI智能推薦（默認）';
            } else {
                const selectedWordlist = wordlists.find(w => w.id === selectedId);
                if (selectedWordlist) {
                    const icon = selectedWordlist.type === 'system' ? '📖' : '✨';
                    headerIcon.textContent = icon;
                    selectedNameElement.textContent = selectedWordlist.name;
                }
            }
        }

        // 标记当前选中项
        document.querySelectorAll('.wordlist-option').forEach(opt => {
            if (opt.dataset.value === selectedId) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

    } catch (error) {
        console.error('❌ 加载词表选择器失败:', error);
    }
    
    // 初始化文件上传交互（在函数最后调用，确保DOM已就绪）
    setTimeout(() => initFileUploadInteraction(), 100);
}

/**
 * 切換詞表下拉菜單
 */
window.toggleWordlistDropdown = function() {
    const selector = document.getElementById('custom-wordlist-selector');
    const dropdown = document.getElementById('wordlist-dropdown');
    
    if (selector && dropdown) {
        selector.classList.toggle('active');
    }
};

/**
 * 選擇詞表
 */
window.selectWordlist = async function(value, displayName, wordCount) {
    selectedWordlistIdInSetting = value === 'ai' ? null : value;
    
    // 更新顯示（保留 icon）
    const selectedNameElement = document.getElementById('selected-wordlist-name');
    if (selectedNameElement) {
        // 提取圖標和名稱
        const iconMatch = displayName.match(/^(🤖|📖|✨)\s*/);
        const icon = iconMatch ? iconMatch[1] : '📚';
        const name = displayName.replace(/^(🤖|📖|✨)\s*/, '');
        
        if (wordCount !== null && wordCount !== undefined) {
            selectedNameElement.textContent = `${name} (${wordCount}詞)`;
        } else {
            selectedNameElement.textContent = name;
        }
        
        // 更新頭部圖標
        const headerIcon = selectedNameElement.previousElementSibling;
        if (headerIcon && headerIcon.classList.contains('wordlist-icon')) {
            headerIcon.textContent = icon;
        }
    }
    
    // 更新選中狀態
    document.querySelectorAll('.wordlist-option').forEach(opt => {
        if (opt.dataset.value === value) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
    
    // 關閉下拉菜單
    const selector = document.getElementById('custom-wordlist-selector');
    if (selector) {
        selector.classList.remove('active');
    }
    
    // 🆕 自動保存到數據庫
    try {
        const supabase = getSupabase();
        const userId = gameState.userId;
        
        if (userId) {
            const { error } = await supabase
                .from('user_wordlist_preferences')
                .upsert({
                    user_id: userId,
                    default_mode: value === 'ai' ? 'ai' : 'wordlist',
                    default_wordlist_id: value === 'ai' ? null : value,
                    default_level_2_tag: null,
                    default_level_3_tag: null,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            console.log('✅ 詞表偏好已自動保存:', value);
            
            // 重新加載開始界面
            await initStartScreen();
            showToast('✅ 詞表已切換');
        }
    } catch (error) {
        console.error('保存詞表設置失敗:', error);
        showToast('❌ 保存失敗，請重試');
    }
};

/**
 * 刪除自定義詞表
 */
window.deleteCustomWordlist = async function(wordlistId, wordlistName) {
    // 確認刪除
    const confirmed = confirm(`確定要刪除詞表「${wordlistName}」嗎？\n\n此操作無法撤銷。`);
    if (!confirmed) return;
    
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('wordlists')
            .delete()
            .eq('id', wordlistId);
        
        if (error) throw error;
        
        console.log('✅ 詞表已刪除:', wordlistName);
        
        // 如果刪除的是當前選中的詞表，切換回 AI 模式
        if (selectedWordlistIdInSetting === wordlistId) {
            selectedWordlistIdInSetting = null;
            const headerIcon = document.querySelector('.wordlist-selector-header .wordlist-icon');
            const selectedNameElement = document.getElementById('selected-wordlist-name');
            if (headerIcon) headerIcon.textContent = '🤖';
            if (selectedNameElement) selectedNameElement.textContent = 'AI智能推薦（默認）';
        }
        
        // 重新加載詞表列表
        await loadWordlistSelectorSetting();
        
        // 顯示成功提示
        showToast('詞表已刪除', 'success');
        
    } catch (error) {
        console.error('❌ 刪除詞表失敗:', error);
        showToast('刪除失敗，請稍後再試', 'error');
    }
};

/**
 * 打開上傳詞表模態框
 */
window.openUploadWordlistModal = function() {
    // 關閉下拉菜單
    const selector = document.getElementById('custom-wordlist-selector');
    if (selector) {
        selector.classList.remove('active');
    }
    
    // 打開上傳模態框
    const modal = document.getElementById('upload-wordlist-modal');
    if (modal) {
        modal.classList.add('active');
    }
};

/**
 * 初始化文件上传交互（只初始化一次）
 */
let fileUploadInitialized = false;

function initFileUploadInteraction() {
    if (fileUploadInitialized) return;
    
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('csv-file-upload');

    if (!uploadZone || !fileInput) return;

    // 点击上传区域
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadedFile = file;
            const fileNameEl = document.getElementById('upload-file-name');
            if (fileNameEl) fileNameEl.textContent = `已選擇: ${file.name}`;
        }
    });

    // 拖拽
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.background = '#d4d8ff';
        uploadZone.style.borderColor = '#4a5bc5';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.background = '#f8f9ff';
        uploadZone.style.borderColor = '#667eea';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.background = '#f8f9ff';
        uploadZone.style.borderColor = '#667eea';
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            uploadedFile = file;
            const fileNameEl = document.getElementById('upload-file-name');
            if (fileNameEl) fileNameEl.textContent = `已選擇: ${file.name}`;
        } else {
            alert('請上傳 CSV 格式文件');
        }
    });
    
    fileUploadInitialized = true;
}

/**
 * 关闭上传模态窗口
 */
window.closeUploadWordlistModal = function() {
    const modal = document.getElementById('upload-wordlist-modal');
    if (modal) modal.classList.remove('active');
    
    // 重置表单
    const nameInput = document.getElementById('upload-wordlist-name');
    const descInput = document.getElementById('upload-wordlist-desc');
    const fileInput = document.getElementById('csv-file-upload');
    const fileName = document.getElementById('upload-file-name');
    const progressSection = document.getElementById('upload-progress-section');
    
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = '';
    if (progressSection) progressSection.style.display = 'none';
    
    uploadedFile = null;
};

/**
 * 下载CSV模板
 */
window.downloadWordlistTemplate = function() {
    // 優化的 CSV 模板：至少 10 個詞語（已包含 12 個示例）
    const template = `詞語（必填）,分類標籤（可留空）,細分類（可留空）
高興,, 
朋友,, 
勇敢,進階詞彙,情感類
探險,進階詞彙,動作類
寧靜,高級詞彙,形容詞類
太陽,一年級,第一單元
月亮,一年級,第一單元
星星,一年級,第二單元
堅持,, 
努力,, 
自信,, 
智慧,高級詞彙,抽象概念`;

    // 添加 UTF-8 BOM 解決 Excel 亂碼問題
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '詞表導入模板.csv';
    a.click();
};

/**
 * 上传词表
 */
window.uploadWordlistFromModal = async function() {
    const supabase = getSupabase();
    const name = document.getElementById('upload-wordlist-name').value.trim();
    const desc = document.getElementById('upload-wordlist-desc').value.trim();

    if (!name) {
        alert('請輸入詞表名稱');
        return;
    }

    if (!uploadedFile) {
        alert('請選擇CSV文件');
        return;
    }

    // 显示进度
    const progressSection = document.getElementById('upload-progress-section');
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');
    const uploadBtn = document.getElementById('upload-wordlist-btn');

    progressSection.style.display = 'block';
    uploadBtn.disabled = true;

    try {
        // 使用 gameState 中的用戶 ID（已經是正確的 users.id）
        const userId = gameState.userId;
        if (!userId) throw new Error('用户未登录');

        // 读取CSV
        progressText.textContent = '讀取文件中...';
        progressFill.style.width = '10%';
        progressFill.textContent = '10%';

        const text = await uploadedFile.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        if (rows.length < 2) {
            throw new Error('CSV文件內容為空或格式錯誤');
        }

        // 解析CSV
        const data = rows.slice(1).map(row => {
            const cols = row.split(',');
            return {
                word: cols[0]?.trim(),
                level2: cols[1]?.trim() || '',
                level3: cols[2]?.trim() || ''
            };
        }).filter(d => d.word);

        console.log(`📊 解析了 ${data.length} 個詞語`);

        // 验证词数：至少需要 10 个词
        if (data.length < 10) {
            throw new Error(
                `詞數不足：至少需要 10 個詞語才能創建詞表。\n\n` +
                `當前只有 ${data.length} 個詞語，請添加更多詞語後重新上傳。\n\n` +
                `💡 提示：10 個詞語可以保證 8 輪遊戲的良好體驗，前期不會重複詞語。`
            );
        }

        // 创建词表
        progressText.textContent = '創建詞表中...';
        progressFill.style.width = '30%';
        progressFill.textContent = '30%';
        
        console.log('🔍 開始創建詞表，用戶ID:', userId);

        // 生成唯一的词表代码
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const code = `custom_${userId.substring(0, 8)}_${timestamp}_${randomStr}`;
        
        const wordlistData = {
            name,
            code,  // 添加唯一代码
            description: desc || null,
            type: 'custom',
            owner_id: userId,
            total_words: data.length,
            hierarchy_config: {
                level_2_label: '第二層級',
                level_3_label: '第三層級'
            }
        };
        
        console.log('🔍 準備插入詞表數據:', wordlistData);
        
        const { data: wordlist, error: wlError } = await supabase
            .from('wordlists')
            .insert(wordlistData)
            .select()
            .single();

        if (wlError) {
            console.error('❌ 創建詞表失敗:', wlError);
            throw wlError;
        }

        console.log('✅ 詞表已創建:', wordlist.id);

        // 提取唯一的标签
        const level2Tags = [...new Set(data.map(d => d.level2).filter(t => t))];
        const level3Tags = [...new Set(data.map(d => d.level3).filter(t => t))];

        // 插入标签
        progressText.textContent = '創建標籤中...';
        progressFill.style.width = '40%';
        progressFill.textContent = '40%';

        const tagsToInsert = [
            ...level2Tags.map((tag, idx) => ({
                wordlist_id: wordlist.id,
                tag_level: 2,
                tag_code: tag,
                tag_display_name: tag,
                sort_order: idx
            })),
            ...level3Tags.map((tag, idx) => ({
                wordlist_id: wordlist.id,
                tag_level: 3,
                tag_code: tag,
                tag_display_name: tag,
                sort_order: idx
            }))
        ];

        if (tagsToInsert.length > 0) {
            const { error: tagError } = await supabase
                .from('wordlist_tags')
                .insert(tagsToInsert);

            if (tagError) throw tagError;
            console.log(`✅ 已創建 ${tagsToInsert.length} 個標籤`);
        }

        // 插入词汇并关联
        progressText.textContent = `導入詞彙中... (0/${data.length})`;
        progressFill.style.width = '50%';
        progressFill.textContent = '50%';

        let imported = 0;
        const batchSize = 50;
        
        console.log('🔍 開始導入詞彙，詞表ID:', wordlist.id);

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const item of batch) {
                // 直接插入到統一詞彙表
                const vocabData = {
                    wordlist_id: wordlist.id,
                    word: item.word,
                    level_2_tag: item.level2 || null,
                    level_3_tag: item.level3 || null
                };
                
                console.log('🔍 準備插入詞彙:', vocabData);
                
                const { error: insertError } = await supabase
                    .from('wordlist_vocabulary')
                    .insert(vocabData);

                if (insertError) {
                    console.error('❌ 插入詞彙失敗:', insertError, '數據:', vocabData);
                    throw insertError;
                }
                imported++;
            }

            const progress = 50 + Math.floor((imported / data.length) * 40);
            progressFill.style.width = `${progress}%`;
            progressFill.textContent = `${progress}%`;
            progressText.textContent = `導入詞彙中... (${imported}/${data.length})`;
            
            console.log(`📊 已導入 ${imported}/${data.length} 個詞彙`);
        }

        // 完成
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        progressText.textContent = `✅ 成功導入 ${imported} 個詞語！`;

        setTimeout(() => {
            closeUploadWordlistModal();
            alert(`✅ 詞表"${name}"已成功上傳！`);
            loadWordlistSelectorSetting();
        }, 1500);

    } catch (error) {
        console.error('❌ 上傳失敗:', error);
        alert('上傳失敗: ' + error.message);
        progressSection.style.display = 'none';
        uploadBtn.disabled = false;
    }
};

