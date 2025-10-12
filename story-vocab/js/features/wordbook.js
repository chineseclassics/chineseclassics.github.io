/**
 * 生词本功能模块
 * 管理用户收藏的词汇
 */

import { getWordbook, saveWordbook, updateSidebarStats } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { showScreen } from '../ui/navigation.js';
import { gameState } from '../core/game-state.js';
import { getSupabase } from '../supabase-client.js';

// 🚦 請求隊列：避免並發過多導致超時
let syncQueue = Promise.resolve();
let queuedCount = 0;

/**
 * 添加到生词本
 */
export async function addToWordbook() {
    const modal = document.getElementById('word-modal');
    if (!modal) return;
    
    const word = modal.dataset.currentWord;
    if (!word) {
        showToast('❌ 無法識別詞語，請重試');
        return;
    }
    
    // 獲取詞彙詳情（避免提取"載入中..."等臨時文字）
    const pinyinEl = document.getElementById('modal-pinyin');
    const translationEl = document.getElementById('modal-translation');
    const definitionEl = document.getElementById('modal-definition');
    
    // 提取純文本內容，並過濾掉無效內容
    let pinyin = pinyinEl?.textContent?.trim() || '';
    let translation = translationEl?.textContent?.trim() || '';
    let definition = definitionEl?.textContent?.trim() || '';
    
    // 過濾掉"載入中..."、"查詢中..."、"暫無"等臨時文字
    if (pinyin.includes('查詢中') || pinyin.includes('載入中') || pinyin.includes('❌')) {
        pinyin = '';
    }
    if (translation.includes('載入中') || translation.includes('暫無') || translation.includes('獲取')) {
        translation = '';
    }
    if (definition.includes('載入中') || definition.includes('暫無') || definition.includes('獲取')) {
        definition = '';
    }
    
    // 截取定義的前200字（避免過長）
    if (definition.length > 200) {
        definition = definition.substring(0, 200) + '...';
    }
    
    // 获取当前生词本
    const wordbook = getWordbook();
    
    // 检查是否已存在
    if (wordbook.some(w => w.word === word)) {
        showToast('該詞已在生詞本中！');
        return;
    }
    
    // 添加到生词本
    const newEntry = {
        word: word,
        pinyin: pinyin,
        translation: translation,
        definition: definition,
        addedAt: new Date().toISOString()
    };
    
    wordbook.push(newEntry);
    
    // 1. 保存到 localStorage（快速響應）
    saveWordbook(wordbook);
    updateSidebarStats();
    
    // 2. 🔥 同步到 Supabase（雲端持久化）- 使用隊列避免並發
    console.log('💾 準備同步到 Supabase...');
    console.log('👤 當前用戶 ID:', gameState.userId);
    
    if (gameState.userId) {
        // 🚦 將同步任務加入隊列
        queuedCount++;
        const currentPosition = queuedCount;
        
        if (currentPosition > 1) {
            console.log(`⏳ 排隊中... 前面還有 ${currentPosition - 1} 個請求`);
        }
        
        // 將新的同步任務加入隊列
        syncQueue = syncQueue.then(async () => {
            try {
                const supabase = getSupabase();
                
                // 🚀 優化：先快速插入，不查詢 vocabulary 表（避免卡頓）
                console.log(`📤 [隊列 ${currentPosition}] 快速插入 "${word}" 到 user_wordbook...`);
                
                const insertData = {
                    user_id: gameState.userId,
                    vocabulary_id: null, // 先不關聯，後台補充
                    word: word,
                    pinyin: pinyin || null,
                    translation: translation || null,
                    definition: definition || null,
                    word_difficulty: null, // 後台補充
                    source: 'manual' // 手動添加
                };
                
                // 插入數據（設置 10 秒超時，給排隊留出時間）
                const { data: insertResult, error } = await Promise.race([
                    supabase
                        .from('user_wordbook')
                        .insert(insertData)
                        .select(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('插入超時')), 10000)
                    )
                ]);
                
                if (error) {
                    console.error('❌ 插入失敗:', error);
                    throw error;
                }
                
                console.log(`✅ [隊列 ${currentPosition}] 生詞本已快速同步到雲端`);
                
                // 🔧 後台異步：查詢 vocabulary 表並更新關聯（不阻塞隊列）
                setTimeout(async () => {
                    try {
                        const { data: vocabData } = await supabase
                            .from('vocabulary')
                            .select('id, difficulty_level, category')
                            .eq('word', word)
                            .maybeSingle();
                        
                        if (vocabData && insertResult && insertResult[0]) {
                            // 更新關聯
                            await supabase
                                .from('user_wordbook')
                                .update({
                                    vocabulary_id: vocabData.id,
                                    word_difficulty: vocabData.difficulty_level,
                                    source: 'vocabulary'
                                })
                                .eq('id', insertResult[0].id);
                            
                            console.log(`✅ 後台更新關聯完成: "${word}"`);
                        }
                    } catch (bgError) {
                        console.log('⚠️ 後台查詢失敗（不影響使用）');
                    }
                }, 500); // 稍微延遲，讓隊列優先完成
                
                // 完成後減少計數
                queuedCount--;
                
            } catch (error) {
                queuedCount--;
                console.error(`⚠️ [隊列 ${currentPosition}] 同步到雲端失敗（已保存到本地）:`, error);
                // 不影響用戶體驗，數據已保存在本地
            }
        }).catch(err => {
            // 捕獲隊列中的錯誤，避免中斷後續任務
            console.error('隊列執行錯誤:', err);
        });
    } else {
        console.log('⚠️ 用戶未登入，跳過雲端同步');
    }
    
    showToast(`✅ "${word}" 已添加到生詞本！`);
}

/**
 * 打开生词本（导航到生词本屏幕）
 */
export async function openWordbook() {
    showScreen('wordbook-screen');
    
    // 🔝 立即滾動到頂部
    const wordbookScreen = document.getElementById('wordbook-screen');
    if (wordbookScreen) {
        const contentDiv = wordbookScreen.querySelector('.content');
        if (contentDiv) {
            contentDiv.scrollTop = 0;
        }
    }
    
    // 🚀 立即加載並顯示本地數據（不等待雲端同步）
    await loadWordbookScreen();
}

/**
 * 加载生词本屏幕内容
 */
export async function loadWordbookScreen() {
    const wordbookList = document.getElementById('wordbook-words-list');
    const emptyState = document.getElementById('wordbook-empty');
    const totalCount = document.getElementById('wordbook-total-count');
    
    console.log('🔍 開始加載生詞本...');
    
    // 🚀 優先使用本地數據（快速顯示）
    let wordbook = getWordbook();
    console.log(`📂 從 localStorage 加載 ${wordbook.length} 個生詞`);
    
    // 先顯示本地數據，讓用戶立即看到內容
    displayWordbook(wordbook, wordbookList, emptyState, totalCount);
    
    // 🔄 後台同步雲端數據（不阻塞顯示）
    if (gameState.userId) {
        syncWordbookFromCloud().then(cloudWordbook => {
            if (cloudWordbook && cloudWordbook.length > 0) {
                // 只有當雲端數據與本地不同時才更新顯示
                if (cloudWordbook.length !== wordbook.length) {
                    console.log(`🔄 雲端數據不同，更新顯示 (${cloudWordbook.length} 個生詞)`);
                    displayWordbook(cloudWordbook, wordbookList, emptyState, totalCount);
                    saveWordbook(cloudWordbook); // 更新本地緩存
                }
            }
        }).catch(err => {
            console.log('⚠️ 雲端同步失敗（不影響使用）:', err.message);
        });
    }
}

/**
 * 從雲端同步生詞本數據
 */
async function syncWordbookFromCloud() {
    try {
        const supabase = getSupabase();
        console.log('📡 後台同步：查詢 Supabase...');
        
        const { data, error } = await supabase
            .from('user_wordbook')
            .select('*')
            .eq('user_id', gameState.userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 轉換為本地格式
        const wordbook = (data || []).map(item => ({
            word: item.word,
            pinyin: item.pinyin || '',
            translation: item.translation || '',
            definition: item.definition || '',
            addedAt: item.created_at
        }));
        
        console.log(`✅ 後台同步完成：${wordbook.length} 個生詞`);
        return wordbook;
    } catch (error) {
        console.error('❌ 後台同步失敗:', error);
        return null;
    }
}

/**
 * 顯示生詞本內容
 */
function displayWordbook(wordbook, wordbookList, emptyState, totalCount) {
    
    // 更新统计
    if (totalCount) {
        totalCount.textContent = wordbook.length;
    }
    
    // 如果生词本为空，显示空状态
    if (wordbook.length === 0) {
        if (wordbookList) wordbookList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    // 隐藏空状态，显示列表
    if (wordbookList) wordbookList.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // 构建生词本列表 HTML
    let wordbookHTML = '';
    wordbook.forEach((item, index) => {
        // 转义单引号
        const escapedWord = item.word.replace(/'/g, "\\'");
        
        wordbookHTML += `
            <div class="wordbook-card" onclick="showWordDetailFromVocab('${escapedWord}')">
                <div class="wordbook-card-header">
                    <div class="wordbook-card-word">${item.word}</div>
                    <button class="wordbook-card-remove" onclick="event.stopPropagation(); removeFromWordbook('${escapedWord}')" title="移除">×</button>
                </div>
                <div class="wordbook-card-pinyin">${item.pinyin || ''}</div>
                ${item.translation ? `<div class="wordbook-card-translation">🌍 ${item.translation}</div>` : ''}
                <div class="wordbook-card-definition">${item.definition || ''}</div>
                <div class="wordbook-card-footer">
                    <span class="wordbook-card-date">${formatDate(item.addedAt)}</span>
                    <span class="wordbook-card-hint">點擊查看詳情 →</span>
                </div>
            </div>
        `;
    });
    
    if (wordbookList) {
        wordbookList.innerHTML = wordbookHTML;
    }
    
    // 🔝 滾動到頂部，確保用戶看到標題和統計信息
    const wordbookScreen = document.getElementById('wordbook-screen');
    if (wordbookScreen) {
        const contentDiv = wordbookScreen.querySelector('.content');
        if (contentDiv) {
            contentDiv.scrollTop = 0;
            console.log('📜 已滾動到生詞本頂部');
        }
    }
}

/**
 * 从生词本移除词汇
 * @param {string} word - 要移除的词汇
 */
export async function removeFromWordbook(word) {
    let wordbook = getWordbook();
    const originalLength = wordbook.length;
    
    wordbook = wordbook.filter(item => item.word !== word);
    
    if (wordbook.length < originalLength) {
        // 1. 從本地移除
        saveWordbook(wordbook);
        updateSidebarStats();
        
        // 2. 🔥 從雲端移除
        if (gameState.userId) {
            try {
                const supabase = getSupabase();
                await supabase
                    .from('user_wordbook')
                    .delete()
                    .eq('user_id', gameState.userId)
                    .eq('word', word);
                console.log('✅ 已從雲端移除');
            } catch (error) {
                console.error('⚠️ 從雲端移除失敗（已從本地移除）:', error);
            }
        }
        
        loadWordbookScreen();
        showToast(`✅ "${word}" 已從生詞本移除`);
    }
}

/**
 * 格式化日期
 * @param {string} dateString - ISO 日期字符串
 * @returns {string} 格式化的日期
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天';
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays} 天前`;
    } else {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    }
}

