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
import { SUPABASE_CONFIG } from '../config.js';

/**
 * 初始化启动界面
 */
export async function initStartScreen() {
    console.log('🎬 開始初始化啟動界面...');
    
    // 🎓 根據用戶年級動態加載主題（內部已經綁定事件，無需重複綁定）
    await loadThemesByGrade();

    const supabase = getSupabase();

    // 🔒 確保默認狀態始終正確（防止未定義狀態）
    gameState.wordlistMode = 'ai';
    gameState.wordlistId = null;
    gameState.level2Tag = null;
    gameState.level3Tag = null;
    
    // 默认显示 AI 模式（可能会被后续逻辑覆盖）
    showAIMode();
    console.log('✅ 默認狀態已設置: AI 模式');

    try {
        // 使用 gameState 中的用戶 ID（已經是正確的 users.id）
        const userId = gameState.userId;
        if (!userId) {
            console.log('ℹ️ 用户未登录，使用默认AI模式');
            showAIMode();
            updateWordlistNameDisplay('AI智能推薦');
            return;
        }

        // ✅ 從緩存讀取詞表偏好（不查數據庫）
        const prefs = gameState.user?.wordlist_preference;
        
        if (!prefs) {
            console.log('⚠️ 用戶資料未加載完成，使用默認AI模式');
            showAIMode();
            updateWordlistNameDisplay('AI智能推薦');
            return;
        }

        console.log('📊 詞表偏好（從緩存）:', prefs.default_mode);

        // 如果没有偏好或选择了AI模式
        if (!prefs.default_wordlist_id || prefs.default_mode === 'ai') {
            console.log('✅ 使用AI智能推荐模式');
            gameState.wordlistMode = 'ai';
            gameState.wordlistId = null;
            showAIMode();
            updateWordlistNameDisplay('AI智能推薦');
            return;
        }

        // 用户选择了特定词表，優先使用緩存，如果沒有則查詢
        let wordlistInfo = prefs.wordlist_info;
        
        if (!wordlistInfo || !wordlistInfo.tags || wordlistInfo.tags.length === 0) {
            console.log('📥 詞表信息未緩存或無標籤，重新查詢...');
            
            // 查詢詞表信息
            const { data: wordlist, error: wlError } = await supabase
                .from('wordlists')
                .select('*')
                .eq('id', prefs.default_wordlist_id)
                .maybeSingle();
            
            if (wlError || !wordlist) {
                console.warn('⚠️ 查詢詞表失敗，使用AI模式');
                gameState.wordlistMode = 'ai';
                gameState.wordlistId = null;
                showAIMode();
                updateWordlistNameDisplay('AI智能推薦');
                return;
            }
            
            // 查詢標籤
            const { data: tags, error: tagError } = await supabase
                .from('wordlist_tags')
                .select('*')
                .eq('wordlist_id', wordlist.id)
                .order('tag_level')
                .order('sort_order');
            
            if (tagError) {
                console.error('⚠️ 查詢標籤失敗:', tagError);
            }
            
            wordlistInfo = {
                id: wordlist.id,
                name: wordlist.name,
                tags: tags || []
            };
            
            console.log('✅ 詞表信息已查詢:', wordlist.name, '標籤數:', tags?.length || 0);
        } else {
            console.log('📚 詞表信息（從緩存）:', wordlistInfo.name);
        }

        // 设置gameState
        gameState.wordlistMode = 'wordlist';
        gameState.wordlistId = wordlistInfo.id;
        console.log('✅ gameState 已更新: wordlist 模式');

        const level2Tags = wordlistInfo.tags?.filter(t => t.tag_level === 2) || [];

        // 如果有层级标签，显示层级卡片
        if (level2Tags.length > 0) {
            console.log('📚 显示词表层级卡片，共', level2Tags.length, '個');
            showWordlistHierarchy();
            renderLevel2Cards(wordlistInfo, wordlistInfo.tags);
            updateWordlistNameDisplay(wordlistInfo.name);
        } else {
            // 没有层级，使用整个词表但保持AI模式的UI显示
            console.log('📚 词表无层级，保持AI模式UI');
            showAIMode();
            updateWordlistNameDisplay(wordlistInfo.name);
        }

        console.log('✅ 啟動界面初始化完成');

    } catch (error) {
        console.error('❌ 初始化启动界面失败（未預期錯誤）:', error);
        console.error('   錯誤詳情:', error.message);
        console.error('   錯誤堆棧:', error.stack);
        // 🔒 確保回退到安全的默認狀態
        gameState.wordlistMode = 'ai';
        gameState.wordlistId = null;
        gameState.level2Tag = null;
        gameState.level3Tag = null;
        showAIMode();
        updateWordlistNameDisplay('AI智能推薦');
    }
}

/**
 * 显示AI模式
 */
function showAIMode() {
    console.log('🎨 showAIMode() 被调用');
    const aiSection = document.getElementById('ai-mode-section');
    const hierarchySection = document.getElementById('wordlist-hierarchy-section');

    console.log('  ai-mode-section 存在:', !!aiSection);
    console.log('  wordlist-hierarchy-section 存在:', !!hierarchySection);

    if (aiSection) {
        aiSection.style.display = 'block';
        console.log('  ✅ 已显示 ai-mode-section');
    }
    if (hierarchySection) {
        hierarchySection.style.display = 'none';
        console.log('  ✅ 已隐藏 wordlist-hierarchy-section');
    }

    clearHierarchyCards();
}

/**
 * 显示词表层级选择
 */
function showWordlistHierarchy() {
    console.log('📚 showWordlistHierarchy() 被调用');
    const aiSection = document.getElementById('ai-mode-section');
    const hierarchySection = document.getElementById('wordlist-hierarchy-section');

    console.log('  ai-mode-section 存在:', !!aiSection);
    console.log('  wordlist-hierarchy-section 存在:', !!hierarchySection);

    if (aiSection) {
        aiSection.style.display = 'none';
        console.log('  ✅ 已隐藏 ai-mode-section');
    }
    if (hierarchySection) {
        hierarchySection.style.display = 'block';
        console.log('  ✅ 已显示 wordlist-hierarchy-section');
    }
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
    
    // 用打字机效果显示纯文本（速度调整为 130ms，給詞彙推薦更多時間）
    await typewriterEffect(messageContent, data.aiSentence, 130);
    
    // 然后替换为可点击的词语版本（使用 highlight 數組標記學習詞）
    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.highlight || []);
    
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
        // 更新可點擊的詞語版本（使用 highlight 數組，不用推薦詞）
        messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.highlight || []);
        
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
                
                // 更新可點擊的詞語版本（如果 messageContent 還存在，使用 highlight）
                if (messageContent && messageContent.parentElement) {
                    messageContent.innerHTML = makeAIWordsClickable(data.aiSentence, data.highlight || []);
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
 * @param {number} turn - 当前轮次（可選，默認使用 gameState.turn）
 */
export function updateTurnDisplay(turn) {
    // 🔧 如果沒有傳入 turn，使用 gameState.turn，但不超過 maxTurns
    const actualTurn = turn !== undefined ? turn : gameState.turn;
    const displayTurn = Math.min(actualTurn, gameState.maxTurns);
    
    const currentTurn = document.getElementById('current-turn');
    const progressBar = document.getElementById('progress-bar');
    const progressCircle = document.getElementById('progress-circle');
    const maxTurn = document.getElementById('max-turn');
    
    if (currentTurn) {
        currentTurn.textContent = displayTurn;
    }
    
    // 更新 SVG 圓形進度條
    if (progressBar && maxTurn) {
        // 使用 gameState.maxTurns（支持自定義輪數，不硬編碼）
        const maxTurns = gameState.maxTurns;
        const progress = displayTurn / maxTurns;
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
    
    // 🎬 顯示階段提醒（根據自定義輪數動態調整）
    showStageHint(displayTurn, gameState.maxTurns);
}

/**
 * 顯示故事階段提醒
 * @param {number} turn - 當前輪次
 * @param {number} maxTurns - 最大輪次
 */
function showStageHint(turn, maxTurns) {
    // 獲取或創建提示容器
    let hintContainer = document.getElementById('stage-hint-container');
    if (!hintContainer) {
        hintContainer = document.createElement('div');
        hintContainer.id = 'stage-hint-container';
        hintContainer.className = 'stage-hint-container';
        
        // 插入到故事顯示區域上方
        const storyDisplay = document.getElementById('story-display');
        if (storyDisplay) {
            storyDisplay.parentElement.insertBefore(hintContainer, storyDisplay);
        }
    }
    
    // 清除之前的提醒
    hintContainer.innerHTML = '';
    hintContainer.className = 'stage-hint-container';
    
    // 🔧 動態計算提醒時機（支持自定義輪數）
    let hintText = '';
    let hintClass = '';
    
    // 倒數第三轮（但至少是第3轮以后）
    const thirdLastTurn = Math.max(3, maxTurns - 2);
    const secondLastTurn = maxTurns - 1;
    const lastTurn = maxTurns;
    
    if (turn === thirdLastTurn && maxTurns >= 5) {
        // 倒數第三輪：進入收尾階段提醒（只在總輪數>=5時顯示）
        hintText = `📖 故事進入後段 (${turn}/${maxTurns})`;
        hintClass = 'hint-info';
    } else if (turn === secondLastTurn) {
        // 倒數第二輪：重要提醒
        hintText = `⚠️ 倒數第二輪 (${turn}/${maxTurns}) - 故事快收尾了`;
        hintClass = 'hint-warning';
    } else if (turn === lastTurn) {
        // 最後一輪：最終提醒
        hintText = `🎬 最後一輪，寫下你的結局 (${turn}/${maxTurns})`;
        hintClass = 'hint-final';
    }
    
    // 如果有提醒，顯示它
    if (hintText) {
        hintContainer.className = `stage-hint-container ${hintClass} show`;
        hintContainer.innerHTML = `
            <div class="stage-hint-text">${hintText}</div>
        `;
        
        // 3 秒後淡出（除非是最後一輪，保持顯示）
        if (turn !== lastTurn) {
            setTimeout(() => {
                hintContainer.classList.remove('show');
                setTimeout(() => {
                    hintContainer.innerHTML = '';
                }, 500);
            }, 3000);
        }
    }
}

/**
 * 初始化完成界面（分阶段动画展示）
 * @param {Object} stats - 统计数据
 */
export async function initFinishScreen(stats) {
    await initFinishScreenAnimated(stats);
}

/**
 * 分阶段动画展示总结页面
 */
export async function initFinishScreenAnimated(stats) {
    // 立即设置所有数据（但元素初始隐藏）
    setFinishScreenData(stats);
    
    // 阶段1: 统计卡片飞入（0-2秒）
    await animateStatsCards();
    
    // 阶段2: 用时分析显示（2-3秒）
    await animateTimingAnalysis();
    
    // 阶段3: 词语时间线展开（3-5秒）
    await animateWordsTimeline();
    
    // 阶段4: 故事全文逐行显示（5-7秒）+ 自动滚动
    await animateFullStoryByLine();
    
    // 阶段5: AI评价（异步，可能已就绪）
    await loadAISummaryWithFallback();
}

/**
 * 设置所有数据到页面元素
 */
function setFinishScreenData(stats) {
    // 基础统计
    const totalDuration = document.getElementById('total-duration');
    const avgLevel = document.getElementById('avg-level');
    const userLevel = document.getElementById('user-level-final');
    
    if (totalDuration) totalDuration.textContent = formatDuration(stats.totalDuration);
    if (avgLevel) avgLevel.textContent = `L${stats.avgSelectedLevel.toFixed(1)}`;
    if (userLevel) userLevel.textContent = `L${stats.userCurrentLevel.toFixed(1)}`;
    
    // 用时分析
    if (stats.longestTiming) {
        const slowestWord = document.getElementById('slowest-word');
        const slowestTime = document.getElementById('slowest-time');
        if (slowestWord) slowestWord.textContent = stats.longestTiming.word;
        if (slowestTime) slowestTime.textContent = formatDuration(stats.longestTiming.duration);
    }
    
    if (stats.shortestTiming) {
        const fastestWord = document.getElementById('fastest-word');
        const fastestTime = document.getElementById('fastest-time');
        if (fastestWord) fastestWord.textContent = stats.shortestTiming.word;
        if (fastestTime) fastestTime.textContent = formatDuration(stats.shortestTiming.duration);
    }
    
    // 设置故事标题显示
    const titleDisplay = document.getElementById('story-title-display');
    if (titleDisplay && stats.defaultTitle) {
        titleDisplay.textContent = stats.defaultTitle;
    }
    
    // 渲染词语时间线
    renderWordsTimeline(stats.wordTimings || []);
    
    // 渲染完整故事
    prepareFullStory();
}

/**
 * 格式化时长
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}分${remainSeconds}秒`;
    }
    return `${seconds}秒`;
}

/**
 * 阶段1: 统计卡片飞入动画
 */
async function animateStatsCards() {
    const cards = document.querySelectorAll('.stats-grid .stat-card');
    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.add('fly-in');
        await new Promise(r => setTimeout(r, 150));
    }
    await new Promise(r => setTimeout(r, 300));
}

/**
 * 阶段2: 用时分析显示
 */
async function animateTimingAnalysis() {
    const items = document.querySelectorAll('.timing-analysis .timing-item');
    items.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('slide-in');
        }, index * 200);
    });
    await new Promise(r => setTimeout(r, 800));
}

/**
 * 阶段3: 词语时间线展开动画
 */
async function animateWordsTimeline() {
    const bars = document.querySelectorAll('.word-timing-bar');
    for (let i = 0; i < bars.length; i++) {
        bars[i].classList.add('expand');
        // 滚动到当前元素
        bars[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 300));
}

/**
 * 阶段4: 故事全文逐行显示
 */
async function animateFullStoryByLine() {
    const container = document.getElementById('full-story-text');
    if (!container) return;
    
    const paragraphs = container.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
        paragraphs[i].classList.add('fade-in-line');
        // 每3行滚动一次
        if (i % 3 === 0) {
            paragraphs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        await new Promise(r => setTimeout(r, 80));  // 快速逐行显示
    }
    await new Promise(r => setTimeout(r, 500));
}

/**
 * 渲染词语时间线
 */
function renderWordsTimeline(wordTimings) {
    const container = document.getElementById('words-timeline');
    if (!container) return;
    
    if (!wordTimings || wordTimings.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">暂无数据</p>';
        return;
    }
    
    // 找出最大用时（用于计算条形宽度）
    const maxDuration = Math.max(...wordTimings.map(t => t.duration));
    
    container.innerHTML = wordTimings.map(t => {
        const widthPercent = (t.duration / maxDuration) * 100;
        return `
            <div class="word-timing-bar">
                <span class="word-text">${t.word}</span>
                <div class="timing-bar-container">
                    <div class="timing-bar" style="width: ${widthPercent}%">
                        <span class="duration-text">${formatDuration(t.duration)}</span>
                    </div>
                </div>
                <span class="level-badge">L${t.level || 2}</span>
            </div>
        `;
    }).join('');
}

/**
 * 准备完整故事内容
 */
function prepareFullStory() {
    const fullStoryText = document.getElementById('full-story-text');
    if (!fullStoryText) return;
    
    fullStoryText.innerHTML = '';
    
    gameState.storyHistory.forEach((item, index) => {
        const p = document.createElement('p');
        p.style.marginBottom = '15px';
        p.style.lineHeight = '2';
        p.style.fontSize = '1.1em';
        p.classList.add('story-line');  // 用于动画
        
        if (item.role === 'ai') {
            const aiIndex = Math.floor(index / 2);
            const highlightWords = aiIndex < gameState.allHighlightWords.length ? 
                gameState.allHighlightWords[aiIndex] : [];
            p.innerHTML = `🤖 ${makeAIWordsClickable(item.sentence, highlightWords)}`;
        } else {
            const userIndex = Math.floor((index - 1) / 2);
            const usedWord = userIndex < gameState.usedWords.length ? 
                gameState.usedWords[userIndex] : null;
            p.innerHTML = `👤 ${makeUserSentenceClickable(item.sentence, usedWord)}`;
        }
        fullStoryText.appendChild(p);
    });
}

/**
 * 阶段5: 加载 AI 评价（带回退处理）
 */
async function loadAISummaryWithFallback() {
    const container = document.getElementById('story-summary-container');
    if (!container) return;
    
    // 滚动到 AI 评价区域
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // 检查预加载的Promise
        if (window.aiSummaryPromise) {
            const result = await Promise.race([
                window.aiSummaryPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), 15000)
                )
            ]);
            
            if (result && result.success) {
                // 成功：移除骨架屏，显示内容
                container.classList.remove('skeleton-loading');
                displayStorySummary(result.data);
                return;
            }
        }
        
        // 如果没有预加载或失败，显示友好提示
        throw new Error('AI 评价未能预加载');
        
    } catch (error) {
        // 超时或失败：显示友好提示
        container.classList.remove('skeleton-loading');
        container.innerHTML = `
            <div class="ai-summary-delayed">
                <p>💭 AI老师还在思考中...</p>
                <button class="btn-secondary" onclick="retryLoadSummary()">
                    🔄 重新加载
                </button>
            </div>
        `;
    }
}

/**
 * 重试加载 AI 评价
 */
window.retryLoadSummary = async function() {
    const container = document.getElementById('story-summary-container');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = `
        <div class="story-summary-loading">
            <div class="inline-loading">
                <div class="inline-loading-spinner"></div>
                <span class="inline-loading-text">AI老师正在撰写整体点评...</span>
            </div>
        </div>
    `;
    
    try {
        await loadStorySummary();
    } catch (error) {
        container.innerHTML = `
            <div class="ai-summary-error">
                <p>⚠️ 加载失败，请稍后重试</p>
            </div>
        `;
    }
};


/**
 * 加載並顯示故事整體點評
 */
async function loadStorySummary() {
    try {
        // 創建點評容器（如果不存在）
        let summaryContainer = document.getElementById('story-summary-container');
        if (!summaryContainer) {
            summaryContainer = document.createElement('div');
            summaryContainer.id = 'story-summary-container';
            summaryContainer.className = 'story-summary-container';
            
            // 插入到完整故事後
            const fullStoryText = document.getElementById('full-story-text');
            if (fullStoryText && fullStoryText.parentElement) {
                fullStoryText.parentElement.appendChild(summaryContainer);
            }
        }
        
        // 顯示加載狀態
        summaryContainer.innerHTML = `
            <div class="story-summary-loading">
                <div class="inline-loading">
                    <div class="inline-loading-spinner"></div>
                    <span class="inline-loading-text">AI老師正在撰寫整體點評...</span>
                </div>
            </div>
        `;
        
        // 調用 story-summary Edge Function
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/functions/v1/story-summary`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                },
                body: JSON.stringify({
                    storyHistory: gameState.storyHistory,
                    usedWords: gameState.usedWords.map(w => w.word),
                    storyTheme: gameState.theme,
                    userGrade: gameState.user?.grade || 6,
                    userLevel: gameState.user?.current_level || 2.0
                })
            }
        );
        
        if (!response.ok) {
            throw new Error('獲取點評失敗');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '生成點評失敗');
        }
        
        // 顯示點評內容
        displayStorySummary(result.data);
        
    } catch (error) {
        console.error('❌ 加載故事點評失敗:', error);
        
        // 顯示錯誤提示（不影響其他功能）
        const summaryContainer = document.getElementById('story-summary-container');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="story-summary-error">
                    <p>⚠️ 點評生成失敗，但不影響故事保存</p>
                </div>
            `;
        }
    }
}

/**
 * 顯示故事整體點評
 */
function displayStorySummary(summary) {
    const summaryContainer = document.getElementById('story-summary-container');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = `
        <div class="story-summary-content">
            ${summary.evaluation ? `
                <div class="summary-section summary-evaluation">
                    <h4>📖 故事評價</h4>
                    <p>${summary.evaluation}</p>
                </div>
            ` : ''}
            
            ${summary.highlights && summary.highlights.length > 0 ? `
                <div class="summary-section summary-highlights">
                    <h4>✨ 創作亮點</h4>
                    <ul class="highlights-list">
                        ${summary.highlights.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${summary.suggestions ? `
                <div class="summary-section summary-suggestions">
                    <h4>💡 成長建議</h4>
                    <p>${summary.suggestions}</p>
                </div>
            ` : ''}
            
            ${!summary.evaluation && !summary.highlights && !summary.suggestions && summary.fullText ? `
                <div class="summary-section summary-fulltext">
                    ${summary.fullText.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // 添加淡入動畫
    setTimeout(() => summaryContainer.classList.add('show'), 100);
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

        // 加载所有可用词表（分開查詢系統和自定義）
        console.log('📥 加載詞表列表...');
        
        // 查詢系統詞表
        const { data: systemWordlists, error: sysError } = await supabase
            .from('wordlists')
            .select('*')
            .eq('type', 'system')
            .order('name');
        
        if (sysError) {
            console.error('❌ 查詢系統詞表失敗:', sysError);
        }
        
        // 查詢自定義詞表
        const { data: customWordlists, error: customError } = await supabase
            .from('wordlists')
            .select('*')
            .eq('owner_id', userId)
            .order('name');
        
        if (customError) {
            console.error('❌ 查詢自定義詞表失敗:', customError);
        }
        
        console.log('✅ 系統詞表數量:', systemWordlists?.length || 0);
        console.log('✅ 自定義詞表數量:', customWordlists?.length || 0);
        
        // 合併所有詞表
        const wordlists = [...(systemWordlists || []), ...(customWordlists || [])];

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
        // ✅ 優先使用 default_mode，確保與實際狀態一致
        const defaultMode = prefs?.default_mode || 'ai';
        const defaultWordlistId = prefs?.default_wordlist_id;
        
        let selectedId = 'ai';  // 默認 AI 模式
        
        if (defaultMode === 'wordlist' && defaultWordlistId) {
            selectedId = defaultWordlistId;
        }
        
        selectedWordlistIdInSetting = selectedId === 'ai' ? null : selectedId;
        
        console.log('📊 設置界面當前選中:', selectedId === 'ai' ? 'AI模式' : selectedId);
        
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
                    console.log('📖 顯示詞表:', selectedWordlist.name);
                } else {
                    console.warn('⚠️ 找不到詞表:', selectedId);
                }
            }
        }

        // 标记当前选中项
        document.querySelectorAll('.wordlist-option').forEach(opt => {
            if (opt.dataset.value === selectedId) {
                opt.classList.add('active');
                console.log('✅ 標記選中:', opt.querySelector('.wordlist-name-text')?.textContent);
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
            
            // ✅ 方案2：不重新初始化整個界面，只更新詞表狀態
            // 更新 gameState
            if (value === 'ai') {
                gameState.wordlistMode = 'ai';
                gameState.wordlistId = null;
                gameState.level2Tag = null;
                gameState.level3Tag = null;
            } else {
                gameState.wordlistMode = 'wordlist';
                gameState.wordlistId = value;
                gameState.level2Tag = null;
                gameState.level3Tag = null;
            }
            
            // 清除層級卡片（如果有）
            clearHierarchyCards();
            
            // 如果是詞表模式，查詢並渲染層級卡片
            if (value !== 'ai') {
                // 查詢詞表信息和標籤
                const { data: wordlist, error: wlError } = await supabase
                    .from('wordlists')
                    .select('*')
                    .eq('id', value)
                    .maybeSingle();
                
                if (wlError) {
                    console.error('查詢詞表失敗:', wlError);
                    throw wlError;
                }
                
                if (!wordlist) {
                    console.warn('詞表不存在:', value);
                    updateWordlistNameDisplay('AI智能推薦');
                    showToast('⚠️ 詞表不存在，已切換到AI模式');
                    return;
                }
                
                // 查詢標籤
                const { data: tags, error: tagError } = await supabase
                    .from('wordlist_tags')
                    .select('*')
                    .eq('wordlist_id', value)
                    .order('tag_level')
                    .order('sort_order');
                
                if (tagError) {
                    console.error('查詢標籤失敗:', tagError);
                    throw tagError;
                }
                
                // 更新顯示
                updateWordlistNameDisplay(wordlist.name);
                
                // 显示词表层级区域
                showWordlistHierarchy();
                
                // 渲染層級卡片
                await renderLevel2Cards(wordlist, tags || []);
                
                // ✅ 更新緩存的詞表信息（用於下次頁面加載）
                if (gameState.user && gameState.user.wordlist_preference) {
                    gameState.user.wordlist_preference.wordlist_info = {
                        id: wordlist.id,
                        name: wordlist.name,
                        tags: tags || []
                    };
                    console.log('✅ 詞表信息已緩存');
                }
            } else {
                // AI 模式
                showAIMode();
                updateWordlistNameDisplay('AI智能推薦');
                
                // 清除緩存的詞表信息
                if (gameState.user && gameState.user.wordlist_preference) {
                    gameState.user.wordlist_preference.wordlist_info = null;
                }
            }
            
            showToast('✅ 詞表已切換');
            console.log('✅ 詞表切換完成，gameState已更新');
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

// =====================================================
// 年級選擇器（Grade Selector）
// =====================================================

/**
 * 顯示年級選擇器
 * @param {Object} options - 配置選項
 * @param {Function} options.onSelect - 選擇後的回調函數
 * @param {boolean} options.required - 是否必選（首次登入為 true）
 * @param {number} options.currentGrade - 當前年級（用於編輯時）
 */
export async function showGradeSelector(options = {}) {
    const {
        onSelect = null,
        required = false,
        currentGrade = null
    } = options;
    
    // 動態導入年級配置
    const { GRADE_OPTIONS } = await import('../utils/grade-manager.js');
    
    // 創建模態框
    const modal = document.createElement('div');
    modal.className = 'grade-selector-modal';
    modal.innerHTML = `
        <div class="grade-selector-overlay ${required ? 'required' : ''}"></div>
        <div class="grade-selector-container">
            <div class="grade-selector-header">
                <h2>📚 選擇你的年級</h2>
                <p class="grade-selector-hint">
                    ${required 
                        ? '請選擇正確的年級以獲得最佳學習體驗' 
                        : '你可以隨時調整年級'}
                </p>
            </div>
            
            <div class="grade-selector-info">
                <p>💡 年級影響：</p>
                <ul>
                    <li>AI 故事風格和語言複雜度</li>
                    <li>可選擇的故事主題類型</li>
                    <li>詞彙推薦的初始難度範圍</li>
                </ul>
            </div>
            
            <div class="grade-selector-body">
                <div class="grade-options-grid">
                    ${GRADE_OPTIONS.map(opt => `
                        <button class="grade-option-btn ${currentGrade === opt.value ? 'selected' : ''}" 
                                data-grade="${opt.value}">
                            <span class="grade-label">${opt.label}</span>
                            <span class="grade-age">${opt.ageLabel}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="grade-selector-footer">
                ${!required ? `<button class="btn-secondary grade-cancel-btn">取消</button>` : ''}
                <button class="btn-primary grade-confirm-btn" disabled>確認</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 選中狀態管理
    let selectedGrade = currentGrade;
    
    // 年級選項點擊
    const optionBtns = modal.querySelectorAll('.grade-option-btn');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            optionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedGrade = parseInt(btn.dataset.grade);
            
            // 啟用確認按鈕
            modal.querySelector('.grade-confirm-btn').disabled = false;
        });
    });
    
    // 確認按鈕
    const confirmBtn = modal.querySelector('.grade-confirm-btn');
    confirmBtn.addEventListener('click', async () => {
        if (!selectedGrade) {
            showToast('請選擇年級');
            return;
        }
        
        console.log(`🎓 開始更新年級: ${selectedGrade}`);
        
        // 更新用戶年級到數據庫
        if (gameState.userId) {
            const { updateUserGrade } = await import('../utils/grade-manager.js');
            const success = await updateUserGrade(gameState.userId, selectedGrade);
            
            if (success) {
                console.log(`✅ 數據庫更新成功`);
                
                // 更新 gameState（確保對象存在）
                if (!gameState.user) {
                    gameState.user = {};
                }
                gameState.user.grade = selectedGrade;
                console.log(`✅ gameState.user.grade 已更新為: ${gameState.user.grade}`);
                
                // 更新 localStorage
                localStorage.setItem('user_grade', selectedGrade);
                
                // 更新 UI 顯示
                updateGradeBadge(selectedGrade);
                
                // 關閉模態框
                modal.classList.add('closing');
                setTimeout(() => modal.remove(), 300);
                
                showToast(`✅ 年級已設定為 ${selectedGrade} 年級`);
                
                // 調用回調（重新加載主題）
                if (onSelect) {
                    console.log(`🔄 調用 onSelect 回調，重新加載主題`);
                    await onSelect(selectedGrade);
                    console.log(`✅ 主題已更新`);
                }
            } else {
                showToast('設定年級失敗，請重試');
                // 失敗時也關閉模態框
                modal.classList.add('closing');
                setTimeout(() => modal.remove(), 300);
            }
        } else {
            console.warn('⚠️ 用戶未登入，無法更新年級');
            showToast('請先登入');
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        }
    });
    
    // 取消按鈕（非必選時）
    if (!required) {
        const cancelBtn = modal.querySelector('.grade-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        });
        
        // 點擊遮罩關閉
        const overlay = modal.querySelector('.grade-selector-overlay');
        overlay.addEventListener('click', () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        });
    }
    
    // 顯示動畫
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * 更新頂部狀態欄的年級徽章
 * @param {number} grade - 年級
 */
export function updateGradeBadge(grade) {
    const badge = document.getElementById('user-grade-badge');
    if (!badge) {
        console.warn('⚠️ 找不到年級徽章元素');
        return;
    }
    
    // 顯示徽章
    badge.style.display = 'inline-flex';
    
    // 動態導入年級管理工具
    import('../utils/grade-manager.js').then(({ getGradeLabel }) => {
        badge.textContent = getGradeLabel(grade);
        badge.dataset.grade = grade;
    });
}

/**
 * 初始化年級徽章（在登入後調用）
 */
export async function initGradeBadge() {
    const user = gameState.user;
    if (!user || !user.grade) {
        console.log('ℹ️ 用戶未設定年級');
        
        // 首次登入，顯示年級選擇器
        if (user && !user.grade) {
            showGradeSelector({
                required: true,
                onSelect: async (grade) => {
                    console.log(`✅ 用戶首次選擇年級: ${grade}`);
                    // 重新加載主題
                    await loadThemesByGrade();
                    console.log(`✅ 首次年級設定完成，主題已加載`);
                }
            });
        }
        return;
    }
    
    // 更新徽章顯示
    updateGradeBadge(user.grade);
    
    // 綁定點擊事件（點擊徽章可以修改年級）
    const badge = document.getElementById('user-grade-badge');
    if (badge) {
        badge.addEventListener('click', () => {
            // 使用最新的 gameState.user.grade（避免閉包問題）
            const currentGrade = gameState.user?.grade || 6;
            console.log(`📝 點擊年級徽章，當前年級: ${currentGrade}`);
            
            showGradeSelector({
                required: false,
                currentGrade: currentGrade,
                onSelect: async (grade) => {
                    console.log(`✅ 年級已更新為: ${grade}`);
                    // 重新加載主題
                    await loadThemesByGrade();
                    console.log(`✅ 主題重新加載完成`);
                }
            });
        });
        
        // 添加提示（滑鼠懸停）
        badge.title = '點擊修改年級';
        badge.style.cursor = 'pointer';
    }
}

/**
 * 根據用戶年級加載對應的主題選項
 */
export async function loadThemesByGrade() {
    try {
        const user = gameState.user;
        const grade = user?.grade || 6; // 默認6年級
        
        console.log(`📚 開始加載主題，當前年級: ${grade}`);
        console.log(`📊 gameState.user:`, user);
        
        // 動態導入配置
        const { getThemesForGrade } = await import('../config.js');
        const themeConfig = getThemesForGrade(grade);
        
        console.log(`📖 主題配置:`, themeConfig.name, themeConfig.themes.length, '個主題');
        
        // 獲取主題按鈕容器
        const themeContainer = document.querySelector('.theme-buttons');
        if (!themeContainer) {
            console.warn('⚠️ 找不到主題按鈕容器');
            return;
        }
        
        // 清空現有主題
        themeContainer.innerHTML = '';
        console.log(`🧹 已清空舊主題`);
        
        // 生成主題按鈕
        themeConfig.themes.forEach((theme, index) => {
            const button = document.createElement('button');
            button.className = `theme-btn ${index === 0 ? 'selected' : ''}`;
            button.dataset.theme = theme.id;
            button.innerHTML = `
                <span class="emoji">${theme.icon}</span>
                <span class="theme-name">${theme.name}</span>
            `;
            button.title = theme.description;
            
            // 綁定點擊事件
            button.addEventListener('click', function() {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
            
            themeContainer.appendChild(button);
        });
        
        console.log(`✅ 已加載 ${themeConfig.name}（${themeConfig.ageRange}）的 ${themeConfig.themes.length} 個主題`);
        
        // 顯示成功提示
        showToast(`🎨 主題已更新為 ${themeConfig.name}`);
        
    } catch (error) {
        console.error('❌ 加載主題失敗:', error);
        showToast('❌ 主題加載失敗');
        // 如果失敗，保留現有的主題按鈕
    }
}

