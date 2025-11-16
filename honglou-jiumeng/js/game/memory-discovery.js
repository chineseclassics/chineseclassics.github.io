/**
 * 記憶發現系統
 * 根據節氣顯示可用的記憶列表
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryQuiz } from '../memory-quiz.js';

let chapterDataCache = null;

/**
 * 載入回目數據
 */
async function loadChapterData() {
    if (chapterDataCache) {
        return chapterDataCache;
    }
    
    try {
        const response = await fetch('assets/data/chapters.json');
        chapterDataCache = await response.json();
        return chapterDataCache;
    } catch (error) {
        console.error('載入回目數據失敗:', error);
        return null;
    }
}

/**
 * 獲取當前節氣可用的記憶列表
 * @returns {Promise<Array>} 可用記憶列表，每個元素包含 { memory, chapter }
 */
export async function getAvailableMemoriesForCurrentJieqi() {
    const chapterData = await loadChapterData();
    if (!chapterData) return [];
    
    const currentJieqiIndex = gameData.jieqiIndex;
    const currentCycle = gameData.cycle;
    const availableMemories = [];
    
    // 遍歷所有回目
    chapterData.chapters.forEach(chapter => {
        const startJieqi = chapter.startJieqiIndex || 0;
        const endJieqi = startJieqi + chapter.seasonalCycles;
        
        // 檢查是否在當前回目的節氣範圍內
        let isInChapterRange = false;
        if (currentCycle === 1) {
            isInChapterRange = currentJieqiIndex >= startJieqi && currentJieqiIndex < endJieqi;
        } else {
            const adjustedStart = startJieqi + (currentCycle - 1) * 24;
            const adjustedEnd = adjustedStart + chapter.seasonalCycles;
            const adjustedCurrent = currentCycle * 24 + currentJieqiIndex;
            isInChapterRange = adjustedCurrent >= adjustedStart && adjustedCurrent < adjustedEnd;
        }
        
        if (isInChapterRange) {
            // 計算當前節氣對應的回憶索引
            const relativeJieqiIndex = currentJieqiIndex - startJieqi;
            console.log(`回目 ${chapter.chapter}: relativeJieqiIndex=${relativeJieqiIndex}, memories.length=${chapter.memories.length}`);
            
            if (relativeJieqiIndex >= 0 && relativeJieqiIndex < chapter.memories.length) {
                const memoryId = chapter.memories[relativeJieqiIndex];
                const memory = gameData.memories.find(m => m.id === memoryId);
                
                if (memory) {
                    availableMemories.push({
                        memory: memory,
                        chapter: chapter
                    });
                    console.log(`找到記憶: ${memory.name} (${memoryId})`);
                } else {
                    console.warn(`記憶不存在: ${memoryId}`);
                }
            }
        }
    });
    
    return availableMemories;
}

/**
 * 顯示記憶選擇對話框
 */
export async function showMemorySelectionDialog() {
    console.log('showMemorySelectionDialog 被調用');
    
    const availableMemories = await getAvailableMemoriesForCurrentJieqi();
    console.log('可用記憶:', availableMemories);
    
    const dialogOverlay = document.getElementById('memory-select-dialog-overlay');
    const dialog = document.getElementById('memory-select-dialog');
    const dialogTitle = document.getElementById('memory-select-dialog-title');
    const dialogContent = document.getElementById('memory-select-content');
    const cancelBtn = document.getElementById('memory-select-cancel');
    
    if (!dialogOverlay) {
        console.error('記憶選擇對話框 overlay 不存在');
        return;
    }
    if (!dialog) {
        console.error('記憶選擇對話框 dialog 不存在');
        return;
    }
    if (!dialogTitle) {
        console.error('記憶選擇對話框 title 不存在');
        return;
    }
    if (!dialogContent) {
        console.error('記憶選擇對話框 content 不存在');
        return;
    }
    
    const currentJieqi = gameData.jieqi[gameData.jieqiIndex];
    dialogTitle.textContent = `${currentJieqi.name} - 可用的記憶`;
    
    // 清空內容
    dialogContent.innerHTML = '';
    
    if (availableMemories.length === 0) {
        dialogContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <p style="font-size: 18px; margin-bottom: 10px;">暫無可用記憶</p>
                <p style="font-size: 14px;">推進節氣後會出現新的記憶</p>
            </div>
        `;
    } else {
        // 按回目分組顯示
        const memoriesByChapter = {};
        availableMemories.forEach(({ memory, chapter }) => {
            if (!memoriesByChapter[chapter.chapter]) {
                memoriesByChapter[chapter.chapter] = {
                    chapter: chapter,
                    memories: []
                };
            }
            memoriesByChapter[chapter.chapter].memories.push(memory);
        });
        
        // 顯示每個回目的記憶
        Object.keys(memoriesByChapter).sort((a, b) => a - b).forEach(chapterNum => {
            const chapterGroup = memoriesByChapter[chapterNum];
            const chapter = chapterGroup.chapter;
            
            // 回目標題
            const chapterHeader = document.createElement('div');
            chapterHeader.style.cssText = 'padding: 10px; margin: 10px 0; background: rgba(93, 92, 222, 0.1); border-radius: 6px; border-left: 3px solid #5D5CDE;';
            chapterHeader.innerHTML = `
                <div style="font-weight: bold; color: #5D5CDE; margin-bottom: 5px;">
                    第 ${chapter.chapter} 回：${chapter.title}
                </div>
            `;
            dialogContent.appendChild(chapterHeader);
            
            // 記憶列表
            chapterGroup.memories.forEach(memory => {
                const memoryItem = document.createElement('div');
                const isUnlocked = memory.unlocked || memory.collected;
                
                memoryItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    margin: 8px 0;
                    border: 2px solid ${isUnlocked ? '#4CAF50' : '#ddd'};
                    border-radius: 8px;
                    background: ${isUnlocked ? 'rgba(76, 175, 80, 0.05)' : 'white'};
                    cursor: ${isUnlocked ? 'default' : 'pointer'};
                    transition: all 0.3s ease;
                `;
                
                if (!isUnlocked) {
                    memoryItem.addEventListener('mouseenter', () => {
                        memoryItem.style.background = '#f0f0ff';
                        memoryItem.style.borderColor = '#5D5CDE';
                        memoryItem.style.transform = 'translateX(5px)';
                    });
                    memoryItem.addEventListener('mouseleave', () => {
                        memoryItem.style.background = 'white';
                        memoryItem.style.borderColor = '#ddd';
                        memoryItem.style.transform = 'translateX(0)';
                    });
                }
                
                const reward = memory.type === 'tear' 
                    ? (memory.tearReward || memory.baseReward || 0)
                    : (memory.stoneReward || memory.baseReward || 0);
                const rewardType = memory.type === 'tear' ? '絳珠' : '靈石';
                
                memoryItem.innerHTML = `
                    <div style="font-size: 24px; margin-right: 12px;">${memory.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
                            ${memory.name}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                            ${memory.description}
                        </div>
                        <div style="font-size: 11px; color: #888;">
                            獎勵：${reward} ${rewardType}
                        </div>
                    </div>
                    <div style="margin-left: 12px;">
                        ${isUnlocked 
                            ? '<span style="color: #4CAF50; font-weight: bold;">✓ 已解鎖</span>'
                            : '<span style="color: #5D5CDE; font-weight: bold;">點擊答題</span>'
                        }
                    </div>
                `;
                
                if (!isUnlocked) {
                    memoryItem.addEventListener('click', () => {
                        console.log('記憶被點擊:', memory);
                        console.log('記憶 ID:', memory.id);
                        console.log('記憶名稱:', memory.name);
                        console.log('記憶回目:', memory.relatedChapter);
                        
                        // 關閉選擇對話框
                        hideMemorySelectionDialog();
                        
                        // 顯示答題界面
                        console.log('準備調用 showMemoryQuiz');
                        try {
                            showMemoryQuiz(memory);
                        } catch (error) {
                            console.error('調用 showMemoryQuiz 失敗:', error);
                            alert('顯示答題界面失敗：' + error.message);
                        }
                    });
                }
                
                dialogContent.appendChild(memoryItem);
            });
        });
    }
    
    // 顯示對話框（需要添加 active 類和設置樣式）
    dialogOverlay.style.display = 'flex';
    dialogOverlay.classList.add('active');
    // 確保可見性
    dialogOverlay.style.opacity = '1';
    dialogOverlay.style.pointerEvents = 'auto';
    
    console.log('記憶選擇對話框樣式設置完成:', {
        display: dialogOverlay.style.display,
        opacity: dialogOverlay.style.opacity,
        hasActiveClass: dialogOverlay.classList.contains('active'),
        computedDisplay: window.getComputedStyle(dialogOverlay).display,
        computedOpacity: window.getComputedStyle(dialogOverlay).opacity
    });
    
    // 添加取消按鈕事件
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            hideMemorySelectionDialog();
        };
    }
    
    // 點擊外部關閉（移除舊的監聽器，避免重複添加）
    const existingClickHandler = dialogOverlay._clickHandler;
    if (existingClickHandler) {
        dialogOverlay.removeEventListener('click', existingClickHandler);
    }
    
    const clickHandler = (e) => {
        if (e.target === dialogOverlay) {
            hideMemorySelectionDialog();
        }
    };
    dialogOverlay._clickHandler = clickHandler;
    dialogOverlay.addEventListener('click', clickHandler);
    
    console.log('記憶選擇對話框已顯示，可用記憶數量:', availableMemories.length);
}

/**
 * 隱藏記憶選擇對話框
 */
export function hideMemorySelectionDialog() {
    const dialogOverlay = document.getElementById('memory-select-dialog-overlay');
    if (dialogOverlay) {
        dialogOverlay.style.display = 'none';
        dialogOverlay.classList.remove('active');
        dialogOverlay.style.opacity = '0';
        dialogOverlay.style.pointerEvents = 'none';
        console.log('記憶選擇對話框已隱藏');
    }
}

