/**
 * 弹窗管理模块
 * 处理各种弹窗的显示和关闭
 */

import { showToast } from '../utils/toast.js';
import { getSetting, saveSetting } from '../utils/storage.js';
import { gameState } from '../core/game-state.js';

/**
 * 显示词汇模式选择弹窗
 */
export function showVocabModeSelector() {
    const modal = document.getElementById('vocab-mode-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // 高亮当前选择的模式
    const currentMode = getSetting('vocab_mode', 'ai');
    document.querySelectorAll('.vocab-mode-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.mode === currentMode) {
            card.classList.add('selected');
        }
    });
}

/**
 * 关闭词汇模式选择弹窗
 */
export function closeVocabModeModal() {
    const modal = document.getElementById('vocab-mode-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * 选择词汇模式
 * @param {string} mode - 模式标识
 */
export function selectVocabMode(mode) {
    // 检查是否为开发中的功能
    if (mode === 'system' || mode === 'custom' || mode === 'mixed') {
        showToast('該功能正在開發中，敬請期待！目前請使用「AI 幫我選」模式。');
        return;
    }
    
    // 移除所有选中状态
    document.querySelectorAll('.vocab-mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 添加选中状态
    const clickedCard = event?.target?.closest('.vocab-mode-card');
    if (clickedCard) {
        clickedCard.classList.add('selected');
    }
    
    // 保存选择
    saveSetting('vocab_mode', mode);
    
    // 关闭弹窗并更新显示
    setTimeout(() => {
        closeVocabModeModal();
        updateVocabModeDisplay(mode);
        showToast('✅ 已切換到「AI 幫我選」模式');
    }, 300);
}

/**
 * 更新词汇模式显示
 * @param {string} mode - 模式标识
 */
export function updateVocabModeDisplay(mode) {
    const modeConfig = {
        'ai': {
            icon: '🤖',
            name: 'AI 幫我選詞',
            description: 'AI 會根據你的水平自動選擇合適的詞彙，難度剛剛好。'
        },
        'system': {
            icon: '📚',
            name: '跟著課本學',
            description: '根據你選擇的年級或教材來學習詞彙。'
        },
        'custom': {
            icon: '✏️',
            name: '老師的詞表',
            description: '使用老師或家長上傳的特定詞彙表。'
        },
        'mixed': {
            icon: '🎯',
            name: '自己搭配',
            description: '混合使用多種詞彙來源。'
        }
    };
    
    const config = modeConfig[mode] || modeConfig['ai'];
    
    const modeIcon = document.querySelector('.mode-icon');
    const modeName = document.querySelector('.mode-name');
    const modeDescription = document.querySelector('.mode-description');
    
    if (modeIcon) modeIcon.textContent = config.icon;
    if (modeName) modeName.textContent = config.name;
    if (modeDescription) modeDescription.textContent = config.description;
}

/**
 * 保存设置
 */
export async function saveSettings() {
    try {
        // 保存学习目标
        const dailyVocabGoal = document.getElementById('daily-vocab-goal')?.value;
        const dailyStoryGoal = document.getElementById('daily-story-goal')?.value;
        if (dailyVocabGoal) saveSetting('daily_vocab_goal', dailyVocabGoal);
        if (dailyStoryGoal) saveSetting('daily_story_goal', dailyStoryGoal);
        
        // 保存游戏设置
        const soundEffects = document.getElementById('sound-effects')?.checked;
        const typingEffect = document.getElementById('typing-effect')?.checked;
        const storyLength = document.getElementById('story-length')?.value;
        if (soundEffects !== undefined) saveSetting('sound_effects', soundEffects);
        if (typingEffect !== undefined) saveSetting('typing_effect', typingEffect);
        if (storyLength) saveSetting('story_length', storyLength);
        
        // ℹ️ 词表选择已改为自动保存（在 selectWordlist() 函数中）
        // 不再需要在这里保存词表设置
        
        showToast('✅ 設置已保存！');
    } catch (error) {
        console.error('保存設置失敗:', error);
        showToast('❌ 保存設置失敗，請重試');
    }
}

/**
 * 根据年级获取默认轮数
 * @param {number} grade - 用户年级
 * @returns {string} 默认轮数
 */
function getDefaultStoryLength(grade) {
    // 1-6 年级默认 6 轮，其他年级默认 8 轮
    return (grade >= 1 && grade <= 6) ? '6' : '8';
}

/**
 * 加载设置
 */
export function loadSettings() {
    try {
        // 加载词汇模式
        const vocabMode = getSetting('vocab_mode', 'ai');
        updateVocabModeDisplay(vocabMode);
        
        // 加载学习目标
        const dailyVocabGoal = getSetting('daily_vocab_goal', '10');
        const dailyStoryGoal = getSetting('daily_story_goal', '1');
        const dailyVocabGoalElem = document.getElementById('daily-vocab-goal');
        const dailyStoryGoalElem = document.getElementById('daily-story-goal');
        if (dailyVocabGoalElem) dailyVocabGoalElem.value = dailyVocabGoal;
        if (dailyStoryGoalElem) dailyStoryGoalElem.value = dailyStoryGoal;
        
        // 加载游戏设置
        const soundEffects = getSetting('sound_effects', 'true') !== 'false';
        const typingEffect = getSetting('typing_effect', 'true') !== 'false';
        
        // 🎮 根据年级动态设置默认轮数
        const userGrade = gameState.user?.grade || 6;
        const defaultLength = getDefaultStoryLength(userGrade);
        const storyLength = getSetting('story_length', defaultLength);
        
        const soundEffectsElem = document.getElementById('sound-effects');
        const typingEffectElem = document.getElementById('typing-effect');
        const storyLengthElem = document.getElementById('story-length');
        if (soundEffectsElem) soundEffectsElem.checked = soundEffects;
        if (typingEffectElem) typingEffectElem.checked = typingEffect;
        if (storyLengthElem) storyLengthElem.value = storyLength;
    } catch (error) {
        console.error('加載設置失敗:', error);
    }
}

/**
 * 初始化弹窗背景点击关闭
 */
export function initModalClickOutside() {
    // 词汇详情弹窗
    const wordModal = document.getElementById('word-modal');
    if (wordModal) {
        wordModal.addEventListener('click', function(e) {
            if (e.target === this) {
                const closeWordModal = window.closeWordModal;
                if (closeWordModal) closeWordModal();
            }
        });
    }
    
    // 词汇模式选择弹窗
    const vocabModeModal = document.getElementById('vocab-mode-modal');
    if (vocabModeModal) {
        vocabModeModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeVocabModeModal();
            }
        });
    }
    
    // 上传词表弹窗
    const uploadWordlistModal = document.getElementById('upload-wordlist-modal');
    if (uploadWordlistModal) {
        uploadWordlistModal.addEventListener('click', function(e) {
            if (e.target === this) {
                const closeUploadWordlistModal = window.closeUploadWordlistModal;
                if (closeUploadWordlistModal) closeUploadWordlistModal();
            }
        });
    }
}

