/**
 * 生词本功能模块
 * 管理用户收藏的词汇
 */

import { getWordbook, saveWordbook, updateSidebarStats } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { showScreen } from '../ui/navigation.js';

/**
 * 添加到生词本
 */
export function addToWordbook() {
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
    wordbook.push({
        word: word,
        pinyin: pinyin,
        translation: translation,
        definition: definition,
        addedAt: new Date().toISOString()
    });
    
    // 保存到 localStorage
    saveWordbook(wordbook);
    updateSidebarStats();
    
    showToast(`✅ "${word}" 已添加到生詞本！`);
}

/**
 * 打开生词本（导航到生词本屏幕）
 */
export function openWordbook() {
    loadWordbookScreen();
    showScreen('wordbook-screen');
}

/**
 * 加载生词本屏幕内容
 */
export function loadWordbookScreen() {
    const wordbook = getWordbook();
    const wordbookList = document.getElementById('wordbook-words-list');
    const emptyState = document.getElementById('wordbook-empty');
    const totalCount = document.getElementById('wordbook-total-count');
    
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
}

/**
 * 从生词本移除词汇
 * @param {string} word - 要移除的词汇
 */
export function removeFromWordbook(word) {
    let wordbook = getWordbook();
    const originalLength = wordbook.length;
    
    wordbook = wordbook.filter(item => item.word !== word);
    
    if (wordbook.length < originalLength) {
        saveWordbook(wordbook);
        updateSidebarStats();
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

