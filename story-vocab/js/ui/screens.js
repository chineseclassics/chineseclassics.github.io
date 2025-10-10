/**
 * 界面显示控制模块
 * 处理各个界面的初始化和更新
 */

import { gameState } from '../core/game-state.js';
import { getThemeName } from '../core/story-engine.js';
import { typewriterEffect } from '../utils/typewriter.js';
import { makeAIWordsClickable, makeUserSentenceClickable, selectWord } from '../features/word-manager.js';
import { loadSettings } from './modals.js';
import { preloadWords, getBriefInfo } from '../utils/word-cache.js';
import { getWordBriefInfo } from '../features/dictionary.js';
import { renderLevel2Cards, clearHierarchyCards } from './hierarchy-cards.js';
import { getSupabase } from '../supabase-client.js';

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
        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('ℹ️ 用户未登录，使用默认AI模式');
            return; // AI模式已经是默认显示的
        }

        // 加载用户词表偏好
        const { data: prefs } = await supabase
            .from('user_wordlist_preferences')
            .select('*')
            .eq('user_id', user.id)
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
    const nameElement = document.getElementById('current-wordlist-name');
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
    
    // 用打字机效果显示纯文本（速度减慢到 60ms）
    await typewriterEffect(messageContent, data.aiSentence, 60);
    
    // 然后替换为可点击的词语版本
    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.recommendedWords);
    
    storyDisplay.scrollTop = storyDisplay.scrollHeight;
    
    // 显示词汇选项（过滤掉已使用的词汇）
    const wordsContainer = document.getElementById('word-choices');
    if (!wordsContainer) return;
    
    if (data.recommendedWords && data.recommendedWords.length > 0) {
        // 获取已使用词汇的列表
        const usedWordsList = gameState.usedWords.map(w => w.word);
        
        // 过滤掉已使用的词汇
        const availableWords = data.recommendedWords.filter(wordObj => 
            !usedWordsList.includes(wordObj.word)
        );
        
        // 如果所有词汇都已使用，显示提示
        if (availableWords.length === 0) {
            wordsContainer.innerHTML = '<div style="color: var(--text-light); padding: 20px; text-align: center;">所有推薦詞彙都已使用，請等待AI提供新詞彙...</div>';
        } else {
            // 🎴 使用翻转动画更新词汇卡片（动画完成后自动启用）
            await updateWordCardsWithFlipAnimation(availableWords);
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
 * 使用翻转动画更新词汇卡片
 * @param {Array} newWords - 新的词汇列表
 */
async function updateWordCardsWithFlipAnimation(newWords) {
    const wordsContainer = document.getElementById('word-choices');
    if (!wordsContainer) return;
    
    const existingCards = wordsContainer.querySelectorAll('.word-btn');
    
    if (existingCards.length === 0) {
        // 第一次显示，等待预加载完成再显示（确保有拼音）
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 创建卡片（无翻转动画）
        newWords.forEach(wordObj => {
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn';
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
        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 加载用户偏好
        const { data: prefs } = await supabase
            .from('user_wordlist_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        // 加载所有可用词表
        const { data: wordlists } = await supabase
            .from('wordlists')
            .select('*')
            .or(`type.eq.system,owner_id.eq.${user.id}`)
            .order('type', { ascending: false })
            .order('name');

        const systemWordlists = wordlists?.filter(w => w.type === 'system') || [];
        const customWordlists = wordlists?.filter(w => w.owner_id === user.id) || [];

        // 填充系统词表
        const systemGroup = document.getElementById('system-wordlists-group-setting');
        if (systemGroup) {
            systemGroup.innerHTML = systemWordlists.map(wl => `
                <option value="${wl.id}">${wl.name} (${wl.total_words || 0}詞)</option>
            `).join('') || '<option disabled>暫無系統詞表</option>';
        }

        // 填充自定义词表
        const customGroup = document.getElementById('custom-wordlists-group-setting');
        if (customGroup) {
            customGroup.innerHTML = customWordlists.map(wl => `
                <option value="${wl.id}">${wl.name} (${wl.total_words || 0}詞)</option>
            `).join('') || '<option disabled>暫無自定義詞表</option>';
        }

        // 设置当前选中
        const selector = document.getElementById('wordlist-selector-setting');
        if (selector) {
            if (prefs?.default_wordlist_id) {
                selector.value = prefs.default_wordlist_id;
                selectedWordlistIdInSetting = prefs.default_wordlist_id;
            } else {
                selector.value = 'ai';
                selectedWordlistIdInSetting = null;
            }
        }

    } catch (error) {
        console.error('❌ 加载词表选择器失败:', error);
    }
    
    // 初始化文件上传交互（在函数最后调用，确保DOM已就绪）
    setTimeout(() => initFileUploadInteraction(), 100);
}

/**
 * 词表选择变化处理
 */
window.onWordlistSelectSetting = function() {
    const selector = document.getElementById('wordlist-selector-setting');
    const value = selector.value;

    if (value === '__add_custom__') {
        // 打开上传模态窗口
        const modal = document.getElementById('upload-wordlist-modal');
        if (modal) modal.classList.add('active');
        // 重置选择器到之前的值
        selector.value = selectedWordlistIdInSetting || 'ai';
    } else if (value === 'ai') {
        selectedWordlistIdInSetting = null;
    } else {
        selectedWordlistIdInSetting = value;
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
    const template = '詞語,第二層級,第三層級\n生字,第一單元,課文一\n詞彙,第一單元,課文一\n句子,第二單元,課文二';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
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
        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

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

        // 创建词表
        progressText.textContent = '創建詞表中...';
        progressFill.style.width = '30%';
        progressFill.textContent = '30%';

        const { data: wordlist, error: wlError } = await supabase
            .from('wordlists')
            .insert({
                name,
                description: desc || null,
                type: 'custom',
                owner_id: user.id,
                total_words: data.length,
                hierarchy_config: {
                    level_2_label: '第二層級',
                    level_3_label: '第三層級'
                }
            })
            .select()
            .single();

        if (wlError) throw wlError;

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

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const item of batch) {
                // 检查词汇是否存在
                let { data: existingWord } = await supabase
                    .from('vocabulary')
                    .select('id')
                    .eq('word', item.word)
                    .maybeSingle();

                let vocabId;
                if (existingWord) {
                    vocabId = existingWord.id;
                } else {
                    // 创建新词汇
                    const { data: newWord, error: vocabError } = await supabase
                        .from('vocabulary')
                        .insert({
                            word: item.word,
                            difficulty_level: 3
                        })
                        .select('id')
                        .single();

                    if (vocabError) throw vocabError;
                    vocabId = newWord.id;
                }

                // 关联到词表
                const { error: mappingError } = await supabase
                    .from('vocabulary_wordlist_mapping')
                    .insert({
                        wordlist_id: wordlist.id,
                        vocabulary_id: vocabId,
                        level_2_tag: item.level2 || null,
                        level_3_tag: item.level3 || null
                    });

                if (mappingError) throw mappingError;
                imported++;
            }

            const progress = 50 + Math.floor((imported / data.length) * 40);
            progressFill.style.width = `${progress}%`;
            progressFill.textContent = `${progress}%`;
            progressText.textContent = `導入詞彙中... (${imported}/${data.length})`;
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

