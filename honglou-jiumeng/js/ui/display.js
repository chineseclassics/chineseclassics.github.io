/**
 * UI 顯示更新
 * 管理資源顯示、進度條等 UI 更新
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';

/**
 * 更新資源顯示
 */
export function updateResourceDisplay() {
  const elements = getElements();
  
  try {
    // 更新基本資源
    if (elements.cycleCount) elements.cycleCount.textContent = gameData.cycle;
    if (elements.jieqiValue) elements.jieqiValue.textContent = gameData.jieqi[gameData.jieqiIndex].name;
    
    // 更新絳珠和靈石，根據足夠與否添加不同樣式
    if (elements.tearCount) {
      elements.tearCount.textContent = gameData.resources.tear;
      
      // 對搜尋記憶來說，需要2滴絳珠
      if (gameData.resources.tear >= 2) {
        elements.tearCount.classList.add('sufficient');
        elements.tearCount.classList.remove('insufficient');
      } else {
        elements.tearCount.classList.remove('sufficient');
        
        // 只在絳珠完全不足時才顯示不足
        if (gameData.resources.tear < 1) {
          elements.tearCount.classList.add('insufficient');
        } else {
          elements.tearCount.classList.remove('insufficient');
        }
      }
    }
    
    if (elements.stoneCount) {
      elements.stoneCount.textContent = gameData.resources.stone;
      
      // 對建築來說，通常需要10塊靈石
      if (gameData.resources.stone >= 10) {
        elements.stoneCount.classList.add('sufficient');
        elements.stoneCount.classList.remove('insufficient');
      } else {
        elements.stoneCount.classList.remove('sufficient');
        elements.stoneCount.classList.remove('insufficient');
      }
    }
    
    if (elements.memoryCount) elements.memoryCount.textContent = gameData.resources.memory;
    
    // 更新計數器
    if (elements.flowerCount) 
      elements.flowerCount.textContent = `${gameData.flowers.filter(f => f.level > 0).length}/12`;
    if (elements.birdCount) 
      elements.birdCount.textContent = `${gameData.birds.filter(b => b.unlocked).length}/12`;
    if (elements.collectedMemoryCount) 
      elements.collectedMemoryCount.textContent = `${gameData.memories.filter(m => m.collected).length}/24`;
    if (elements.collectedTearCount) 
      elements.collectedTearCount.textContent = `${gameData.tears.filter(t => t.collected).length}/12`;
  } catch (error) {
    console.error("更新資源顯示時出錯:", error);
  }
}

/**
 * 更新輪迴進度條
 */
export function updateCycleProgress() {
  const elements = getElements();
  
  // 計算進度百分比：(當前節氣 / 總節氣數量) * 100
  const progressPercent = (gameData.jieqiIndex / 24) * 100;
  
  // 更新進度條寬度
  if (elements.cycleProgressBar) {
    elements.cycleProgressBar.style.width = `${progressPercent}%`;
  }
}

/**
 * 獲取建築狀態文本
 * @param {number} condition - 建築狀態值（0-1）
 * @returns {string} 狀態文本
 */
export function getConditionText(condition) {
  if (condition > 0.8) return '完好';
  if (condition > 0.5) return '略有破損';
  if (condition > 0.2) return '明顯破損';
  return '幾近坍塌';
}

