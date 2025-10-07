/**
 * 词汇管理模块
 * 处理词汇选择和显示
 */

import { gameState } from '../core/game-state.js';

/**
 * AI句子中标记词库中的词语（可点击查询）
 * @param {string} text - 原始文本
 * @param {Array} recommendedWords - 推荐词汇列表
 * @returns {string} 处理后的 HTML 文本
 */
export function makeAIWordsClickable(text, recommendedWords) {
    if (!text) return '';
    
    // 从推荐词库中提取所有词语
    const vocabularyWords = recommendedWords ? recommendedWords.map(w => w.word) : [];
    
    // 按长度降序排序，优先匹配长词
    vocabularyWords.sort((a, b) => b.length - a.length);
    
    let result = text;
    const replacements = [];
    
    // 找出所有词库中的词语位置
    vocabularyWords.forEach(word => {
        let index = 0;
        while ((index = result.indexOf(word, index)) !== -1) {
            // 检查是否与已有替换重叠
            const overlaps = replacements.some(r => 
                (index >= r.start && index < r.end) || 
                (index + word.length > r.start && index + word.length <= r.end)
            );
            
            if (!overlaps) {
                replacements.push({
                    start: index,
                    end: index + word.length,
                    word: word
                });
            }
            index += word.length;
        }
    });
    
    // 按位置排序
    replacements.sort((a, b) => a.start - b.start);
    
    // 构建结果字符串
    let finalResult = '';
    let lastIndex = 0;
    
    replacements.forEach(replacement => {
        finalResult += text.substring(lastIndex, replacement.start);
        finalResult += `<span class="clickable-word" onclick="showWordDetailFromVocab('${replacement.word}')">${replacement.word}</span>`;
        lastIndex = replacement.end;
    });
    
    finalResult += text.substring(lastIndex);
    
    return finalResult;
}

/**
 * 用户句子中标记选中的词语（可点击查询）
 * @param {string} text - 原始文本
 * @param {Object} selectedWord - 选中的词汇对象
 * @returns {string} 处理后的 HTML 文本
 */
export function makeUserSentenceClickable(text, selectedWord) {
    if (!text || !selectedWord) return text;
    
    // 找到用户选择的词语并高亮
    const word = selectedWord.word;
    let result = text;
    const index = result.indexOf(word);
    
    if (index !== -1) {
        result = result.substring(0, index) + 
                 `<span class="highlighted-word" onclick="showWordDetailFromVocab('${word}')">${word}</span>` + 
                 result.substring(index + word.length);
    }
    
    return result;
}

/**
 * 选择词汇
 * @param {Object} wordObj - 词汇对象
 */
export function selectWord(wordObj) {
    gameState.selectedWord = wordObj;
    
    // 更新按钮状态
    document.querySelectorAll('.word-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 找到被点击的按钮并标记为选中
    const clickedBtn = event?.target?.closest('.word-btn');
    if (clickedBtn) {
        clickedBtn.classList.add('selected');
    }
    
    // 更新显示
    const display = document.getElementById('selected-word-display');
    if (display) {
        display.innerHTML = `
            已選詞彙：<strong>${wordObj.word}</strong> (${wordObj.pinyin || ''})
        `;
    }
    
    // 启用输入
    const input = document.getElementById('user-input');
    const submitBtn = document.getElementById('submit-btn');
    if (input) {
        input.disabled = false;
        input.focus();
    }
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

