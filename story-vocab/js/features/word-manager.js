/**
 * 词汇管理模块
 * 处理词汇选择和显示
 */

import { gameState } from '../core/game-state.js';
import { getWordBriefInfo } from './dictionary.js';
import { getBriefInfo } from '../utils/word-cache.js';

/**
 * AI句子中标记学习词（可点击查询）
 * @param {string} text - 原始文本
 * @param {Array} highlightWords - 需要標記的詞語列表（字符串數組或對象數組）
 * @returns {string} 处理后的 HTML 文本
 */
export function makeAIWordsClickable(text, highlightWords) {
    if (!text) return '';
    
    // 兼容處理：支持字符串數組和對象數組
    let vocabularyWords = [];
    if (highlightWords && highlightWords.length > 0) {
        if (typeof highlightWords[0] === 'string') {
            // 新格式：字符串數組（highlight）
            vocabularyWords = highlightWords;
        } else {
            // 舊格式：對象數組（recommendedWords）
            vocabularyWords = highlightWords.map(w => w.word);
        }
    }
    
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
 * 格式化简要信息为 HTML（不显示拼音，拼音已在卡片上）
 * @param {string} word - 词语
 * @param {Object} briefInfo - 简要信息
 * @param {string} fallbackPinyin - 备用拼音（不使用）
 * @returns {string} HTML 字符串
 */
function formatBriefInfoHTML(word, briefInfo, fallbackPinyin = '') {
    const parts = [];
    
    // 只显示词语，不显示拼音
    parts.push(`<span class="word-main"><strong>${word}</strong></span>`);
    
    // 英文翻译
    if (briefInfo.english) {
        parts.push(`<span class="word-separator">|</span>`);
        parts.push(`<span class="word-english">${briefInfo.english}</span>`);
    }
    
    // 中文释义
    if (briefInfo.definition) {
        parts.push(`<span class="word-separator">|</span>`);
        parts.push(`<span class="word-definition">${briefInfo.definition}</span>`);
    }
    
    return parts.join(' ');
}

/**
 * 选择词汇
 * @param {Object} wordObj - 词汇对象
 */
export async function selectWord(wordObj) {
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
    
    // 获取显示元素
    const display = document.getElementById('selected-word-display');
    if (!display) return;
    
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
    
    // 💾 先检查缓存
    const cachedBrief = getBriefInfo(wordObj.word);
    
    if (cachedBrief && (cachedBrief.english || cachedBrief.definition)) {
        // ✨ 缓存命中！立即显示，无加载延迟
        console.log(`✨ 缓存命中！即时显示: ${wordObj.word}`);
        display.innerHTML = formatBriefInfoHTML(wordObj.word, cachedBrief, wordObj.pinyin);
        return;
    }
    
    // 缓存未命中，显示加载状态并异步获取
    console.log(`⏳ 缓存未命中，查询中: ${wordObj.word}`);
    display.innerHTML = `
        <span class="word-main"><strong>${wordObj.word}</strong></span>
        <span class="loading-text">🔄 正在查詢釋義...</span>
    `;
    
    // 异步获取词汇简要信息
    try {
        const briefInfo = await getWordBriefInfo(wordObj.word);
        
        // 如果成功获取到释义信息，显示完整内容
        if (briefInfo.english || briefInfo.definition) {
            display.innerHTML = formatBriefInfoHTML(wordObj.word, briefInfo, wordObj.pinyin);
        } else {
            // 降级显示：只显示词语（拼音已在卡片上）
            display.innerHTML = `
                已選詞彙：<span class="word-main"><strong>${wordObj.word}</strong></span>
            `;
        }
    } catch (error) {
        console.error('獲取詞彙釋義失敗:', error);
        // 错误降级：显示简单格式（拼音已在卡片上）
        display.innerHTML = `
            已選詞彙：<span class="word-main"><strong>${wordObj.word}</strong></span>
        `;
    }
}

