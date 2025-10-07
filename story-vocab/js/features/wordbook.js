/**
 * 生词本功能模块
 * 管理用户收藏的词汇
 */

import { getWordbook, saveWordbook, updateSidebarStats } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';

/**
 * 添加到生词本
 */
export function addToWordbook() {
    const modal = document.getElementById('word-modal');
    if (!modal) return;
    
    const word = modal.dataset.currentWord;
    const pinyin = document.getElementById('modal-pinyin')?.textContent || '';
    const translation = document.getElementById('modal-translation')?.textContent || '';
    const definition = document.getElementById('modal-definition')?.textContent || '';
    
    if (!word) return;
    
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
 * 打开生词本
 */
export function openWordbook() {
    const wordbook = getWordbook();
    
    if (wordbook.length === 0) {
        showToast('生詞本還是空的，快去收藏一些詞彙吧！');
        return;
    }
    
    let wordbookHTML = '<h2 style="margin-bottom: 20px;">📚 我的生詞本</h2>';
    wordbook.forEach((item, index) => {
        wordbookHTML += `
            <div style="background: var(--light-blue); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <div style="font-size: 1.5em; font-weight: bold; color: var(--primary-purple);">${item.word}</div>
                <div style="color: var(--text-light); margin: 5px 0;">${item.pinyin}</div>
                ${item.translation ? `<div style="color: var(--primary-blue); margin: 5px 0; font-style: italic;">🌍 ${item.translation}</div>` : ''}
                <div style="color: var(--text-dark); line-height: 1.6;">${item.definition}</div>
            </div>
        `;
    });
    
    const modal = document.getElementById('word-modal');
    const modalContent = modal?.querySelector('.modal-content');
    
    if (modalContent) {
        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeWordModal()">×</button>
            ${wordbookHTML}
            <button class="btn-secondary" onclick="closeWordModal()" style="width: 100%; margin-top: 20px;">關閉</button>
        `;
        modal.classList.add('active');
    }
}

