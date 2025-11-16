/**
 * 列表更新模塊
 * 負責更新遊戲中的各種列表顯示（花魂、淚水、鳥靈、記憶）
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showDialog, showMemoryDialog } from './dialogs.js';

/**
 * 更新所有列表
 */
export function updateLists() {
  try {
    updateFlowersList();
    updateTearsList();
    updateBirdsList();
    updateMemoriesList();
  } catch (error) {
    console.error("更新列表時出錯:", error);
  }
}

/**
 * 更新花魂列表
 */
function updateFlowersList() {
  const elements = getElements();
  if (!elements.flowersList) return;
  
  elements.flowersList.innerHTML = '';
  
  // 過濾並排序花魂：已解鎖的，再按等級排序
  const sortedFlowers = gameData.flowers
    .filter(f => f.unlocked)
    .sort((a, b) => b.level - a.level);
  
  if (sortedFlowers.length === 0) {
    elements.flowersList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">未發現花魂，建造建築解鎖</div>';
  } else {
    sortedFlowers.forEach(flower => {
      const isNewlyUnlocked = flower.status === "待種植";
      
      // 計算成長條寬度
      const growthWidth = flower.growth / 100 * 100;
      
      // 決定花魂狀態顯示
      let statusHTML = '';
      
      if (flower.position === -1) {
        statusHTML = '<span style="color: #FFC107;">待種植</span>';
      } else if (flower.level === 0) {
        statusHTML = '<span style="color: #4CAF50;">幼苗期</span>';
      } else if (flower.level === flower.maxLevel) {
        statusHTML = '<span style="color: #9C27B0;">完全覺醒</span>';
      } else {
        statusHTML = `<span style="color: #5D5CDE;">等級 ${flower.level}</span>`;
      }
      
      const flowerItem = document.createElement('div');
      flowerItem.className = `flower-item ${isNewlyUnlocked ? 'new-item' : ''}`;
      flowerItem.innerHTML = `
        <div class="flower-item-icon">${flower.icon}</div>
        <div class="flower-item-details">
          <div class="item-name">${flower.name} (${flower.character})</div>
          <div class="item-level">
            ${statusHTML}
            ${flower.position !== -1 ? `
              <div class="progress-container" style="height: 6px; margin-top: 5px;">
                <div class="progress-bar" style="width: ${growthWidth}%"></div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      // 添加點擊事件顯示詳情
      flowerItem.addEventListener('click', () => {
        // 如果花魂已種植，顯示其位置
        if (flower.position !== -1) {
          // 閃爍對應格子
          const cellElement = document.querySelector(`.garden-cell[data-id="${flower.position}"]`);
          if (cellElement) {
            cellElement.classList.add('flashback');
            setTimeout(() => {
              cellElement.classList.remove('flashback');
            }, 2000);
          }
        }
        
        // 顯示詳細信息
        showDialog({
          title: `${flower.name} (${flower.character})`,
          content: `
            <p>${flower.description}</p>
            <div style="margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>等級: ${flower.level}/${flower.maxLevel}</span>
                <span>${Math.floor(flower.growth)}%</span>
              </div>
              <div class="progress-container">
                <div class="progress-bar" style="width: ${(flower.growth / 100) * 100}%"></div>
              </div>
            </div>
            <p><strong>當前狀態:</strong> ${flower.position === -1 ? '待種植' : '已種植'}</p>
            <p style="margin-top: 10px;"><strong>特殊照料:</strong> ${flower.specialCare}</p>
            <p style="margin-top: 10px;"><strong>季節生長速度:</strong> 
              春 ${flower.seasonalGrowth.春}x · 
              夏 ${flower.seasonalGrowth.夏}x · 
              秋 ${flower.seasonalGrowth.秋}x · 
              冬 ${flower.seasonalGrowth.冬}x
            </p>
            <p style="margin-top: 15px;"><strong>判詞:</strong> <em>${flower.judgmentPoem}</em></p>
          `,
          confirmText: '關閉',
          showCancel: false
        });
      });
      
      elements.flowersList.appendChild(flowerItem);
    });
  }
}

/**
 * 更新淚水列表
 */
function updateTearsList() {
  const elements = getElements();
  if (!elements.tearsList) return;
  
  elements.tearsList.innerHTML = '';
  
  const collectedTears = gameData.tears.filter(t => t.collected);
  
  if (collectedTears.length === 0) {
    elements.tearsList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未收集特殊淚水</div>';
  } else {
    collectedTears.forEach(tear => {
      const tearItem = document.createElement('div');
      tearItem.className = 'tear-item';
      
      // 添加淚水偏好信息
      const preferredFlowers = gameData.flowers.filter(f => 
        f.tearPreference && f.tearPreference.includes(tear.id));
      
      let preferredText = '';
      if (preferredFlowers.length > 0) {
        preferredText = `<div style="font-size: 11px; margin-top: 3px; color: #4CAF50;">
          對 ${preferredFlowers.map(f => f.character).join('、')} 特效
        </div>`;
      }
      
      tearItem.innerHTML = `
        <div class="tear-item-icon">${tear.icon}</div>
        <div class="tear-item-details">
          <div class="item-name">${tear.name}</div>
          <div class="item-description">${tear.description}</div>
          ${preferredText}
        </div>
      `;
      
      tearItem.addEventListener('click', () => {
        showMemoryDialog({
          title: tear.name,
          content: `<div style="text-align: center;">
            <p>${tear.description}</p>
            <div class="poem" style="margin: 15px 0;">
              ${tear.scene}
            </div>
            <p><strong>效力:</strong> ${tear.potency}</p>
            ${preferredFlowers.length > 0 ? 
              `<p style="margin-top: 15px; color: #4CAF50;">
                <strong>對以下花魂有加倍效果:</strong><br>
                ${preferredFlowers.map(f => `${f.name} (${f.character})`).join('<br>')}
              </p>` : 
              ''}
          </div>`
        });
      });
      
      elements.tearsList.appendChild(tearItem);
    });
  }
}

/**
 * 更新鳥靈列表
 */
function updateBirdsList() {
  const elements = getElements();
  if (!elements.birdsList) return;
  
  elements.birdsList.innerHTML = '';
  
  const activeBirds = gameData.birds.filter(b => b.unlocked);
  
  if (activeBirds.length === 0) {
    elements.birdsList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未喚醒鳥靈，提升花魂等級解鎖</div>';
  } else {
    activeBirds.forEach(bird => {
      const birdItem = document.createElement('div');
      birdItem.className = 'bird-item';
      birdItem.innerHTML = `
        <div class="bird-item-icon">${bird.icon}</div>
        <div class="bird-item-details">
          <div class="item-name">${bird.name} (${bird.character})</div>
          <div class="item-description">${bird.description}</div>
        </div>
      `;
      
      birdItem.addEventListener('click', () => {
        // 查找關聯花魂
        const relatedFlower = gameData.flowers.find(f => f.id === bird.relatedFlower);
        
        showDialog({
          title: `${bird.name} (${bird.character})`,
          content: `
            <p>${bird.description}</p>
            <p style="margin-top: 15px;"><strong>特殊能力:</strong></p>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${bird.abilities.map(ability => `<li style="margin-bottom: 5px;">${ability}</li>`).join('')}
            </ul>
            ${relatedFlower ? 
              `<p style="margin-top: 15px;"><strong>關聯花魂:</strong> ${relatedFlower.name} (${relatedFlower.character})</p>` : 
              ''}
          `,
          confirmText: '關閉',
          showCancel: false
        });
      });
      
      elements.birdsList.appendChild(birdItem);
    });
  }
}

/**
 * 更新記憶列表（支持劇情線分組）
 */
function updateMemoriesList() {
  const elements = getElements();
  if (!elements.memoriesList) return;
  
  elements.memoriesList.innerHTML = '';
  
  // 只顯示已解鎖的記憶（未解鎖的記憶通過"尋找記憶"按鈕查看）
  const unlockedMemories = gameData.memories.filter(m => m.unlocked || m.collected);
  
  if (unlockedMemories.length === 0) {
    elements.memoriesList.innerHTML = '<div style="text-align: center; padding: 15px; color: #999;">尚未解鎖記憶<br/><span style="font-size: 12px; color: #666;">點擊「尋找記憶」按鈕開始答題解鎖</span></div>';
  } else {
    // 按劇情線分組（只包含已解鎖的記憶）
    const memoriesByStoryLine = {};
    const standaloneMemories = [];
    
    unlockedMemories.forEach(memory => {
      if (memory.storyLineId && gameData.storyLines[memory.storyLineId]) {
        if (!memoriesByStoryLine[memory.storyLineId]) {
          memoriesByStoryLine[memory.storyLineId] = [];
        }
        memoriesByStoryLine[memory.storyLineId].push(memory);
      } else {
        standaloneMemories.push(memory);
      }
    });
    
    // 顯示劇情線記憶（按劇情線分組）
    Object.keys(memoriesByStoryLine).forEach(storyLineId => {
      const storyLine = gameData.storyLines[storyLineId];
      const lineMemories = memoriesByStoryLine[storyLineId].sort((a, b) => a.orderIndex - b.orderIndex);
      
      // 計算劇情線進度（只計算已解鎖的）
      const totalSegments = gameData.memories.filter(m => m.storyLineId === storyLineId).length;
      const unlockedSegments = lineMemories.length; // lineMemories 已經只包含已解鎖的記憶
      const progressPercent = Math.floor((unlockedSegments / totalSegments) * 100);
      
      // 劇情線標題
      const storyLineHeader = document.createElement('div');
      storyLineHeader.className = 'storyline-header';
      storyLineHeader.innerHTML = `
        <div style="padding: 8px 12px; margin: 8px 0; background: rgba(93, 92, 222, 0.15); border-radius: 6px; border-left: 3px solid #5D5CDE;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: bold; color: #5D5CDE;">${storyLine.name}</span>
            <span style="font-size: 12px; color: #666;">${unlockedSegments}/${totalSegments}</span>
          </div>
          <div style="background: rgba(0,0,0,0.1); height: 4px; border-radius: 2px; margin-top: 4px; overflow: hidden;">
            <div style="background: #5D5CDE; height: 100%; width: ${progressPercent}%; transition: width 0.3s;"></div>
          </div>
        </div>
      `;
      elements.memoriesList.appendChild(storyLineHeader);
      
      // 顯示該劇情線的記憶
      lineMemories.forEach(memory => {
        createMemoryItem(memory, storyLineId);
      });
    });
    
    // 顯示獨立記憶（無劇情線）
    if (standaloneMemories.length > 0) {
      const typeHeader = document.createElement('div');
      typeHeader.className = 'memory-type-header';
      typeHeader.innerHTML = `<div style="padding: 5px 10px; margin: 8px 0; background: rgba(139, 69, 19, 0.1); border-radius: 5px;">
        <span style="font-weight: bold; color: #8B4513;">其他記憶 (${standaloneMemories.length})</span>
      </div>`;
      elements.memoriesList.appendChild(typeHeader);
      
      standaloneMemories.forEach(memory => {
        createMemoryItem(memory);
      });
    }
  }
  
  /**
   * 創建記憶項目的函數（只顯示已解鎖的記憶）
   */
  function createMemoryItem(memory, storyLineId = null) {
    const elements = getElements();
    const memoryItem = document.createElement('div');
    
    // 因為只顯示已解鎖的記憶，所以總是使用 unlocked 樣式
    memoryItem.className = 'memory-item memory-unlocked';
    
    // 根據記憶類型顯示不同內容
    let typeInfo = '';
    if (memory.type === 'stone') {
      const reward = memory.stoneReward || memory.baseReward || 0;
      typeInfo = `<span style="color: #5D5CDE;">獲得 ${reward} 靈石</span>`;
    } else if (memory.type === 'tear') {
      const reward = memory.tearReward || memory.baseReward || 0;
      typeInfo = `<span style="color: #8B4513;">獲得 ${reward} 絳珠</span>`;
    }
    
    // 劇情線標記和回目標註
    let storylineBadge = '';
    if (storyLineId && memory.orderIndex) {
      storylineBadge = `<div style="font-size: 10px; color: #5D5CDE; margin-top: 2px;">
        <span style="background: rgba(93, 92, 222, 0.2); padding: 2px 6px; border-radius: 3px;">第${memory.orderIndex}段</span>
      </div>`;
    }
    
    // 回目標註（隱性化設計）
    let chapterBadge = '';
    if (memory.relatedChapter) {
      chapterBadge = `<div style="font-size: 9px; color: #999; margin-top: 2px; opacity: 0.6;">
        第 ${memory.relatedChapter} 回
      </div>`;
    }
    
    // 狀態標記（因為只顯示已解鎖的記憶，所以總是顯示"已解鎖"）
    const statusBadge = `<div style="font-size: 10px; color: #4CAF50; margin-top: 3px;">
      <span style="background: rgba(76, 175, 80, 0.1); padding: 2px 6px; border-radius: 3px;">已解鎖</span>
    </div>`;
    
    memoryItem.innerHTML = `
      <div class="memory-item-icon">${memory.icon}</div>
      <div class="memory-item-details">
        <div class="item-name">${memory.name}</div>
        <div class="item-description">${memory.description}</div>
        ${typeInfo ? `<div style="font-size: 11px; margin-top: 3px;">${typeInfo}</div>` : ''}
        ${storylineBadge}
        ${chapterBadge}
        ${statusBadge}
      </div>
    `;
    
    memoryItem.addEventListener('click', () => {
      // 已解鎖的記憶，點擊後顯示記憶內容
      // 動態導入避免循環依賴
      import('../ui/dialogs.js').then(({ showMemoryDialog }) => {
        showMemoryDialog({
          title: memory.name,
          content: `<div class="poem">${memory.content}</div>`
        });
      });
    });
    
    elements.memoriesList.appendChild(memoryItem);
  }
}

