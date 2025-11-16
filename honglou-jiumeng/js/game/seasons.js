/**
 * 節氣系統模塊
 * 管理節氣推進和相關效果
 */

import { gameData, config } from '../state.js';
import { getElements } from '../core/elements.js';
import { resetActionPoints } from '../core/action-points.js';
import { showMemoryDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { updateResourceDisplay, updateCycleProgress, getConditionText } from '../ui/display.js';
import { updateLists } from '../ui/lists.js';
import { spawnMemory } from './memories.js';

/**
 * 檢查記憶發現機制
 * 根據回目與節氣的對應關係，自動發現記憶
 */
async function checkMemoryDiscovery() {
  try {
    // 載入回目數據
    const response = await fetch('assets/data/chapters.json');
    const chapterData = await response.json();
    
    const currentJieqiIndex = gameData.jieqiIndex;
    const currentCycle = gameData.cycle;
    
    // 遍歷所有回目
    chapterData.chapters.forEach(chapter => {
      // 計算當前節氣是否在這個回目的範圍內
      const startJieqi = chapter.startJieqiIndex || 0;
      const endJieqi = startJieqi + chapter.seasonalCycles;
      
      // 檢查是否在當前回目的節氣範圍內
      let isInChapterRange = false;
      if (currentCycle === 1) {
        // 第一輪：直接檢查節氣索引
        isInChapterRange = currentJieqiIndex >= startJieqi && currentJieqiIndex < endJieqi;
      } else {
        // 後續輪迴：需要考慮跨輪迴的情況
        // 簡化處理：如果 startJieqi 接近 24，則可能在下一輪
        const adjustedStart = startJieqi + (currentCycle - 1) * 24;
        const adjustedEnd = adjustedStart + chapter.seasonalCycles;
        const adjustedCurrent = currentCycle * 24 + currentJieqiIndex;
        isInChapterRange = adjustedCurrent >= adjustedStart && adjustedCurrent < adjustedEnd;
      }
      
      if (isInChapterRange) {
        // 檢查該回目的所有未解鎖記憶（支持同一回中 stone 和 tear 類型並存）
        const newMemories = [];
        chapter.memories.forEach((memoryId, index) => {
          const memory = gameData.memories.find(m => m.id === memoryId);
          
          if (memory && !memory.unlocked && !memory.collected) {
            newMemories.push(memory);
          }
        });
        
        if (newMemories.length > 0) {
          // 記憶自動出現在 UI 中（不消耗行動力）
          // 記憶已經在記憶列表中顯示，這裡只需要確保它可見
          updateLists();
          
          // 顯示記憶發現提示
          const memoryTypes = newMemories.map(m => m.type === 'stone' ? '靈石' : '絳珠').join('、');
          showHint('記憶發現', `第 ${chapter.chapter} 回的記憶已出現（${memoryTypes}）`, '✨');
        }
      }
    });
  } catch (error) {
    console.error('載入回目數據失敗:', error);
  }
}

/**
 * 推進節氣
 */
export function advanceJieqi() {
  const elements = getElements();
  
  // 更新最後操作時間
  gameData.lastActionTime = Date.now();
  
  // 增加節氣指數
  const oldJieqi = gameData.jieqi[gameData.jieqiIndex];
  gameData.jieqiIndex = (gameData.jieqiIndex + 1) % 24;
  const newJieqi = gameData.jieqi[gameData.jieqiIndex];
  
  resetActionPoints(true);
  
  // 播放節氣變化動畫
  const jieqiIcon = document.querySelector('.jieqi-icon');
  const jieqiIndicator = elements.jieqiIndicator || document.querySelector('#jieqi-indicator');
  const jieqiLabel = elements.jieqiLabel || document.getElementById('jieqi-label');
  
  if (jieqiIcon) {
    jieqiIcon.textContent = newJieqi.icon;
    jieqiIcon.classList.add('jieqi-change');
    setTimeout(() => jieqiIcon.classList.remove('jieqi-change'), 1000);
  }
  
  if (jieqiLabel) {
    jieqiLabel.textContent = newJieqi.name;
    jieqiLabel.classList.add('jieqi-change');
    setTimeout(() => jieqiLabel.classList.remove('jieqi-change'), 1000);
  } else if (jieqiIndicator) {
    jieqiIndicator.textContent = newJieqi.name;
  }
  
  if (jieqiIndicator) {
    jieqiIndicator.classList.add('jieqi-change');
    setTimeout(() => jieqiIndicator.classList.remove('jieqi-change'), 1000);
  }
  
  // 檢查是否進入新輪迴
  if (gameData.jieqiIndex === 0) {
    gameData.cycle += 1;
    if (elements.cycleCount) {
      elements.cycleCount.textContent = gameData.cycle;
      elements.cycleCount.classList.add('resource-change');
      setTimeout(() => elements.cycleCount.classList.remove('resource-change'), 500);
    }
    
    // 輪迴開始提示
    showMemoryDialog({
      title: `第${gameData.cycle}輪輪迴開始`,
      content: `<div style="text-align: center;">
        <p>時光流轉，萬物歸零又復始。</p>
        <p style="margin-top: 15px;">新的輪迴已經開始，你仍在用淚水與無常賽跑...</p>
        ${gameData.cycle > 1 ? `<p style="margin-top: 20px; color: #5D5CDE;">
          你已完成 ${gameData.cycle - 1} 輪輪迴，繼續收集記憶與淚水，喚醒更多花魂。
        </p>` : ''}
      </div>`
    });
    
    // 第三輪後結束遊戲（動態導入避免循環依賴）
    if (gameData.cycle >= 3 && gameData.jieqiIndex === 23) {
      setTimeout(() => {
        import('./events.js').then(({ triggerWhiteFade }) => {
          triggerWhiteFade();
        }).catch(() => {
          // 如果模塊不存在，暫時跳過
        });
      }, 5000);
    }
  } else {
    // 一般節氣變化提示
    showHint('節氣變化', `${oldJieqi.name} ➝ ${newJieqi.name} (${newJieqi.season}季)`, newJieqi.icon);
    
    // 提示有新的記憶可用
    setTimeout(() => {
      import('./memory-discovery.js').then(({ getAvailableMemoriesForCurrentJieqi }) => {
        getAvailableMemoriesForCurrentJieqi().then(availableMemories => {
          if (availableMemories.length > 0) {
            const unlockedCount = availableMemories.filter(({ memory }) => !memory.unlocked && !memory.collected).length;
            if (unlockedCount > 0) {
              showHint('記憶發現', `點擊「尋找記憶」查看第 ${availableMemories[0].chapter.chapter} 回的記憶`, '🧠');
            }
          }
        });
      });
    }, 1000);
  }
  
  // 更新節氣顯示
  const currentJieqi = gameData.jieqi[gameData.jieqiIndex];
  if (elements.jieqiValue) {
    elements.jieqiValue.textContent = currentJieqi.name;
  }
  
  // 更新輪迴進度
  updateCycleProgress();
  
  // 記憶發現機制：檢查是否有記憶應該在這個節氣出現
  checkMemoryDiscovery();
  
  // 建築衰敗
  gameData.cells.forEach(cell => {
    if (cell.buildingId) {
      const building = gameData.buildings.find(b => b.id === cell.buildingId);
      if (building && building.id !== 'base-camp') {
        const oldDecayValue = cell.decayValue;
        cell.decayValue = Math.min(1, cell.decayValue + building.decayRate / 24);
        
        // 如果衰敗程度顯著增加，提示玩家
        if (cell.decayValue > 0.5 && oldDecayValue <= 0.5) {
          showHint('建築衰敗', `${building.name}開始明顯損壞，請考慮維修`, '🏚️');
        }
        
        // 更新建築狀態
        building.status = getConditionText(1 - cell.decayValue);
      }
    }
  });
  
  // 花魂生長（少量被動生長）
  gameData.flowers.forEach(flower => {
    if (flower.position !== -1) {
      const oldGrowth = flower.growth;
      const season = currentJieqi.season;
      const growthRate = flower.seasonalGrowth[season] || 0.5;
      const growthIncrease = growthRate * 2;
      flower.growth = Math.min(100, flower.growth + growthIncrease);
      
      // 季節特別適合時提示
      if (growthRate > 1 && flower.growth > oldGrowth + 1) {
        showHint('花魂成長', `${currentJieqi.season}季有利於${flower.character}的花魂生長`, '🌱');
      }
      
      // 檢查是否升級
      if (flower.growth >= 100 && flower.level < flower.maxLevel) {
        flower.level += 1;
        flower.growth = 0;
        
        showHint('花魂升級', `${flower.character}的花魂自然升級到 Lv${flower.level}！`, '✨');
        
        // 解鎖相關鳥靈
        if (flower.level >= 3) {
          const relatedBirds = gameData.birds.filter(b => b.relatedFlower === flower.id && !b.unlocked);
          if (relatedBirds.length > 0) {
            relatedBirds[0].unlocked = true;
            showMemoryDialog({
              title: `${relatedBirds[0].name}鳥靈覺醒`,
              content: `${flower.character}的花魂喚醒了${relatedBirds[0].character}的鳥靈！`
            });
          }
        }
      }
    }
  });
  
  // 鳥靈效果 - 自動收集淚水
  const activeCollectorBirds = gameData.birds.filter(b => b.unlocked && 
    (b.id === 'xiren-bird' || b.id === 'pinger-bird'));
  
  if (activeCollectorBirds.length > 0) {
    const tearGain = activeCollectorBirds.length;
    gameData.resources.tear += tearGain;
    
    // 顯示資源變化動畫
    if (elements.tearCount) {
      elements.tearCount.classList.add('resource-change');
      setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
    }
    
    showHint('鳥靈效果', `鳥靈自動收集了 ${tearGain} 滴絳珠`, '🐦');
  }
  
  // 隨機生成記憶碎片
  if (Math.random() < 0.3) {
    spawnMemory();
  }
  
  // 檢查是否觸發事件（動態導入避免循環依賴）
  import('./events.js').then(({ checkEvents }) => {
    checkEvents();
  }).catch(() => {
    // 如果模塊不存在，暫時跳過
  });
  
  // 刷新UI（動態導入避免循環依賴）
  import('./garden.js').then(({ initGarden }) => {
    initGarden();
  });
  updateLists();
  updateResourceDisplay();
  
  // 已禁用提示氣泡功能
  // import('../utils/suggestions.js').then(({ updateSuggestedActions }) => {
  //   updateSuggestedActions();
  // }).catch(() => {
  //   // 如果模塊不存在，暫時跳過
  // });
}

