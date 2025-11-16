/**
 * 記憶系統模塊
 * 管理記憶碎片的收集、生成和劇情線里程碑
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryDialog, showRpgDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { updateResourceDisplay } from '../ui/display.js';
import { updateLists } from '../ui/lists.js';
import { showMemoryQuiz } from '../memory-quiz.js';

/**
 * 解鎖記憶（新流程：答題驗證）
 * @param {string} memoryId - 記憶ID
 */
export function unlockMemory(memoryId) {
  const memory = gameData.memories.find(m => m.id === memoryId);
  if (!memory) return;
  
  // 如果已經解鎖，直接返回
  if (memory.unlocked) {
    showMemoryDialog({
      title: memory.name,
      content: `<div class="poem">${memory.content}</div>`
    });
    return;
  }
  
  // 檢查是否需要答題驗證
  if (memory.readingRequired && !memory.readingVerified) {
    // 顯示答題界面
    showMemoryQuiz(memory);
    return;
  }
  
  // 如果已經驗證但未解鎖，直接解鎖（向後兼容）
  if (memory.readingVerified && !memory.unlocked) {
    memory.unlocked = true;
    memory.collected = true;
    
    // 給予基礎資源獎勵
    if (memory.type === "tear") {
      gameData.resources.tear += memory.tearReward || memory.baseReward || 10;
    } else if (memory.type === "stone") {
      gameData.resources.stone += memory.stoneReward || memory.baseReward || 10;
    }
    
    updateResourceDisplay();
    updateLists();
    
    // 檢查劇情線里程碑
    if (memory.storyLineId) {
      checkStoryLineMilestones(memory.storyLineId);
    }
  }
}

/**
 * 收集記憶碎片（舊函數，保持向後兼容）
 * @param {string} memoryId - 記憶ID
 * @deprecated 使用 unlockMemory 代替
 */
export function collectMemory(memoryId) {
  // 重定向到新函數
  unlockMemory(memoryId);
}

/**
 * 生成記憶碎片
 * @param {string} preferredType - 優先類型（"stone" 或 "tear"）
 * @returns {boolean} 是否成功生成
 */
export function spawnMemory(preferredType) {
  // 找出未收集的記憶
  const uncollectedMemories = gameData.memories.filter(m => !m.collected);
  if (uncollectedMemories.length === 0) return false;
  
  // 區分兩種類型的記憶 - 絳珠(淚水)和靈石
  const tearsMemories = uncollectedMemories.filter(m => m.type === "tear");
  const stoneMemories = uncollectedMemories.filter(m => m.type === "stone");
  
  // 根據優先類型選擇記憶類型（記憶現在通過節氣自動發現，此函數主要用於向後兼容）
  let chosenMemory;
  
  // 根據優先類型和剩餘記憶選擇
  if (preferredType === "stone" && stoneMemories.length > 0) {
    chosenMemory = stoneMemories[Math.floor(Math.random() * stoneMemories.length)];
  } else if (preferredType === "tear" && tearsMemories.length > 0) {
    chosenMemory = tearsMemories[Math.floor(Math.random() * tearsMemories.length)];
  } else {
    // 隨機選擇任意類型的記憶
    chosenMemory = uncollectedMemories[Math.floor(Math.random() * uncollectedMemories.length)];
  }
  
  // 找出空閒且已解鎖的格子
  const availableCells = gameData.cells.filter(c => c.unlocked && !c.buildingId && !c.flowerId && !c.memoryId);
  if (availableCells.length === 0) return false;
  
  // 隨機選擇一個格子
  const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
  
  // 放置記憶碎片
  randomCell.memoryId = chosenMemory.id;
  randomCell.type = 'memory';
  
  // 刷新UI（動態導入避免循環依賴）
  import('./garden.js').then(({ initGarden }) => {
    initGarden();
  });
  
  // 標記成功生成記憶
  return true;
}

/**
 * 檢查劇情線里程碑
 * @param {string} storyLineId - 劇情線ID
 */
export function checkStoryLineMilestones(storyLineId) {
  const elements = getElements();
  if (!storyLineId || !gameData.storyLines[storyLineId]) return;
  
  const storyLine = gameData.storyLines[storyLineId];
  const collectedMemories = gameData.memories.filter(
    m => m.storyLineId === storyLineId && m.collected
  );
  
  // 按順序排序
  collectedMemories.sort((a, b) => a.orderIndex - b.orderIndex);
  
  // 檢查連續收集的段數（從 orderIndex 1 開始）
  let consecutiveCount = 0;
  for (let i = 0; i < collectedMemories.length; i++) {
    if (collectedMemories[i].orderIndex === consecutiveCount + 1) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  
  // 檢查是否達到里程碑（只觸發一次）
  if (!gameData.storyLineMilestones) {
    gameData.storyLineMilestones = {};
  }
  
  for (const milestone of storyLine.milestones) {
    const milestoneKey = `${storyLineId}_${milestone.segments}`;
    if (consecutiveCount >= milestone.segments && 
        !gameData.storyLineMilestones[milestoneKey]) {
      
      // 標記已觸發
      gameData.storyLineMilestones[milestoneKey] = true;
      
      // 發放獎勵
      if (milestone.reward.tear) {
        gameData.resources.tear += milestone.reward.tear;
        if (elements.tearCount) {
          elements.tearCount.classList.add('resource-change');
          setTimeout(() => elements.tearCount?.classList.remove('resource-change'), 500);
        }
      }
      if (milestone.reward.stone) {
        gameData.resources.stone += milestone.reward.stone;
        if (elements.stoneCount) {
          elements.stoneCount.classList.add('resource-change');
          setTimeout(() => elements.stoneCount?.classList.remove('resource-change'), 500);
        }
      }
      if (milestone.reward.flowerBoost) {
        // 花魂成長加成
        const flower = gameData.flowers.find(f => f.id === milestone.reward.flowerBoost);
        if (flower) {
          flower.growth += 30; // 一次性成長加成
          showHint('花魂成長', `${flower.name}獲得劇情線成長加成！`, '✨');
        }
      }
      
      // 顯示里程碑對話
      setTimeout(() => {
        showRpgDialog([milestone.message], "👸", "警幻仙子");
      }, 500);
      
      updateResourceDisplay();
      updateLists();
    }
  }
}

