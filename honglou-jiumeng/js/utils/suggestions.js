/**
 * 建議系統模塊
 * 管理遊戲中的建議操作和提示顯示
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';

/**
 * 更新建議的下一步操作
 * @returns {Object} 建議的操作對象
 */
export function updateSuggestedActions() {
  // 根據當前進度分析下一步最佳操作
  const nextAction = {
    nextBuildingId: null,
    nextFlowerId: null,
    nextAction: null
  };
  
  // 如果沒有淚水，建議答題解鎖記憶獲得資源（不消耗行動力）
  if (gameData.resources.tear === 0) {
    // 檢查是否有未解鎖的記憶可以答題
    const unlockedMemories = gameData.memories.filter(m => !m.unlocked && !m.collected && m.readingRequired);
    if (unlockedMemories.length > 0) {
      nextAction.nextAction = 'unlock-memory'; // 新的建議操作
    } else {
      nextAction.nextAction = 'advance-jieqi'; // 推進節氣解鎖新記憶
    }
  }
  // 如果有未建造的建築且有足夠資源，建議建造
  else if (gameData.buildings.some(b => !b.built && b.unlocked && 
    gameData.resources.tear >= b.cost.tear && 
    gameData.resources.stone >= b.cost.stone)) {
    
    const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked && 
      gameData.resources.tear >= b.cost.tear && 
      gameData.resources.stone >= b.cost.stone);
    
    if (nextBuilding) {
      nextAction.nextBuildingId = nextBuilding.id;
    }
  }
  // 如果有未種植的花魂，建議種植
  else if (gameData.flowers.some(f => f.unlocked && f.position === -1)) {
    const nextFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
    if (nextFlower) {
      nextAction.nextFlowerId = nextFlower.id;
    }
  }
  // 如果有已種植但未滿級的花魂且有淚水，建議澆灌
  else if (gameData.flowers.some(f => f.position !== -1 && f.level < f.maxLevel) && 
    gameData.resources.tear > 0) {
    
    // 不直接指定操作，而是依賴UI突出顯示花魂格子
  }
  // 如果靈石不足，建議答題解鎖記憶獲得靈石（不消耗行動力）
  else if (gameData.resources.stone < 10) {
    // 檢查是否有未解鎖的 stone 類型記憶可以答題
    const unlockedStoneMemories = gameData.memories.filter(m => 
      !m.unlocked && !m.collected && m.readingRequired && m.type === 'stone'
    );
    if (unlockedStoneMemories.length > 0) {
      nextAction.nextAction = 'unlock-memory';
    } else {
      nextAction.nextAction = 'advance-jieqi';
    }
  }
  // 其他情況，推進節氣
  else {
    nextAction.nextAction = 'advance-jieqi';
  }
  
  // 更新全局推薦操作
  gameData.suggestedActions = nextAction;
  
  return nextAction;
}

/**
 * 顯示建議操作
 */
export function showSuggestion() {
  const elements = getElements();
  if (!elements.actionSuggestion) return;
  
  // 準備建議文本和位置
  let suggestionText = '';
  let targetElement = null;
  let bubbleIcon = '💡';
  
  if (gameData.suggestedActions.nextBuildingId) {
    // 建議建造建築
    const building = gameData.buildings.find(b => b.id === gameData.suggestedActions.nextBuildingId);
    suggestionText = `建議建造 ${building?.name || '建築'}，點擊空白格子開始建造`;
    targetElement = document.querySelector(`.garden-cell:not(.has-building):not(.has-flower):not(.has-memory):not(.unlock-required)`);
    bubbleIcon = '🏠';
  } else if (gameData.suggestedActions.nextFlowerId) {
    // 建議種植花魂
    const flower = gameData.flowers.find(f => f.id === gameData.suggestedActions.nextFlowerId);
    suggestionText = `建議種植 ${flower?.character || '花魂'}，點擊空白格子放置花魂`;
    targetElement = document.querySelector(`.garden-cell:not(.has-building):not(.has-flower):not(.has-memory):not(.unlock-required)`);
    bubbleIcon = '🌺';
  } else if (gameData.suggestedActions.nextAction) {
    // 建議執行行動
    switch (gameData.suggestedActions.nextAction) {
      case 'unlock-memory':
        suggestionText = `建議答題解鎖記憶，獲得資源（不消耗行動力）`;
        targetElement = elements.memoriesList; // 指向記憶列表
        bubbleIcon = '🧠';
        break;
      case 'advance-jieqi':
        suggestionText = `建議推進節氣，前進到下一個時間點`;
        targetElement = elements.advanceJieqiBtn;
        bubbleIcon = '🌱';
        break;
    }
  }
  
  // 如果找到目標元素，定位和顯示建議
  if (targetElement && suggestionText) {
    const rect = targetElement.getBoundingClientRect();
    
    // 設置氣泡位置，盡量不遮擋元素
    const bubbleElement = elements.actionSuggestion;
    bubbleElement.style.top = `${rect.top - 70}px`;
    bubbleElement.style.left = `${rect.left + rect.width / 2 - 125}px`;
    
    // 更新氣泡內容
    const bubbleTextElement = bubbleElement.querySelector('.bubble-text');
    const bubbleIconElement = bubbleElement.querySelector('.bubble-icon');
    
    if (bubbleTextElement) bubbleTextElement.textContent = suggestionText;
    if (bubbleIconElement) bubbleIconElement.textContent = bubbleIcon;
    
    // 顯示氣泡
    bubbleElement.style.display = 'flex';
    
    // 高亮目標元素
    if (gameData.suggestedActions.nextAction) {
      const actionBtn = document.getElementById(`${gameData.suggestedActions.nextAction}`);
      if (actionBtn) {
        actionBtn.classList.add('recommended');
        
        // 3秒後移除高亮
        setTimeout(() => {
          actionBtn.classList.remove('recommended');
        }, 3000);
      }
    }
  }
}

/**
 * 執行推薦的操作
 */
export function executeRecommendedAction() {
  const elements = getElements();
  
  if (gameData.suggestedActions.nextAction) {
    // 動態導入避免循環依賴
    import('../game/seasons.js').then(({ advanceJieqi }) => {
      switch (gameData.suggestedActions.nextAction) {
        case 'unlock-memory':
          // 答題解鎖記憶：提示玩家點擊記憶列表中的未解鎖記憶
          if (elements.memoriesList) {
            elements.memoriesList.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 高亮記憶列表
            elements.memoriesList.style.border = '2px solid #5D5CDE';
            setTimeout(() => {
              if (elements.memoriesList) {
                elements.memoriesList.style.border = '';
              }
            }, 2000);
          }
          break;
        case 'advance-jieqi':
          advanceJieqi();
          break;
      }
    });
  }
  
  // 隱藏建議氣泡
  if (elements.actionSuggestion) {
    elements.actionSuggestion.style.display = 'none';
  }
}

