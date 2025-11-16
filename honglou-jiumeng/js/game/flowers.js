/**
 * 花魂系統模塊
 * 管理花魂的種植、澆灌和特殊互動
 */

import { gameData, actionCosts } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryDialog, showDialog, hideDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { updateResourceDisplay } from '../ui/display.js';
import { updateLists } from '../ui/lists.js';

/**
 * 顯示澆灌對話框
 * @param {number} cellId - 格子ID
 * @param {Object} flower - 花魂對象
 */
export function showWateringDialog(cellId, flower) {
  // 獲取可用淚水
  const availableTears = gameData.tears.filter(t => t.collected);
  
  if (availableTears.length === 0) {
    showMemoryDialog({
      title: '無可用淚水',
      content: '你需要先收集淚水才能澆灌花魂。'
    });
    return;
  }
  
  let dialogContent = '<h4 style="margin-bottom: 15px;">選擇淚水澆灌</h4>';
  dialogContent += '<div class="build-menu">';
  
  availableTears.forEach(tear => {
    // 檢查是否是偏好淚水
    const isPreferred = flower.tearPreference && flower.tearPreference.includes(tear.id);
    const efficiencyText = isPreferred ? '<span style="color: #4CAF50;">(效果加倍)</span>' : '';
    
    // 計算成長預測
    let growthPredict = tear.potency * 10;
    if (isPreferred) growthPredict *= 2;
    
    // 考慮季節修正
    const currentSeason = gameData.jieqi[gameData.jieqiIndex].season;
    const seasonMultiplier = flower.seasonalGrowth[currentSeason] || 1;
    growthPredict *= seasonMultiplier;
    
    // 顯示是否會升級
    let levelUpText = '';
    if (flower.growth + growthPredict >= 100 && flower.level < flower.maxLevel) {
      levelUpText = '<span style="color: #4CAF50; font-weight: bold;">將升級!</span>';
    }
    
    // 根據是否為推薦淚水，添加推薦標記
    const isRecommended = isPreferred && tear.potency >= 3;
    const recommendedClass = isRecommended ? 'recommended' : '';
    
    dialogContent += `
      <div class="build-item ${recommendedClass}" data-tear-id="${tear.id}" data-cell-id="${cellId}">
        <div class="build-icon">${tear.icon}</div>
        <div class="build-name">${tear.name} ${efficiencyText}</div>
        <div style="font-size: 11px; margin: 5px 0; color: #666;">
          預計成長: +${Math.floor(growthPredict)}% ${levelUpText}
        </div>
        <div class="build-cost">
          <span class="build-cost-icon">💧</span>效力: ${tear.potency}
        </div>
      </div>
    `;
  });
  
  dialogContent += '</div>';
  
  showDialog({
    title: '選擇淚水澆灌',
    content: dialogContent,
    hideButtons: true
  });
  
  // 添加淚水點擊事件
  document.querySelectorAll('.build-item[data-tear-id]').forEach(item => {
    item.addEventListener('click', () => {
      const tearId = item.dataset.tearId;
      const cellId = parseInt(item.dataset.cellId);
      const success = waterFlowerWithTear(cellId, tearId);
      if (success) {
        hideDialog();
      }
    });
  });
}

/**
 * 用淚水澆灌花魂
 * @param {number} cellId - 格子ID
 * @param {string} tearId - 淚水ID
 * @returns {boolean} 是否成功
 */
export function waterFlowerWithTear(cellId, tearId) {
  const elements = getElements();
  const cell = gameData.cells[cellId];
  if (!cell.flowerId) return false;
  
  const flower = gameData.flowers.find(f => f.id === cell.flowerId);
  const tear = gameData.tears.find(t => t.id === tearId);
  
  if (!flower || !tear) return false;
  
  // 動態導入避免循環依賴
  return import('../core/action-points.js').then(({ consumeActionPointsWithHint }) => {
    if (!consumeActionPointsWithHint(actionCosts.waterFlower, '澆灌花魂')) {
      return false;
    }
    
    // 更新最後操作時間
    gameData.lastActionTime = Date.now();
    
    // 顯示澆灌動畫
    const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
    if (cellElement) {
      cellElement.classList.add('watering-active');
      
      // 創建多個淚滴動畫，提升視覺效果
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const tearDrop = document.createElement('div');
          tearDrop.className = 'tear-drop';
          tearDrop.textContent = '💧';
          tearDrop.style.left = `${Math.random() * 70 + 15}%`;
          tearDrop.style.top = `${Math.random() * 40}%`;
          cellElement.appendChild(tearDrop);
          
          // 移除單個淚滴
          setTimeout(() => {
            if (tearDrop && tearDrop.parentNode) {
              tearDrop.remove();
            }
          }, 1500);
        }, i * 300);
      }
      
      // 移除澆灌特效
      setTimeout(() => {
        if (cellElement) {
          cellElement.classList.remove('watering-active');
        }
      }, 2000);
    }
    
    // 計算成長值
    let growthIncrease = tear.potency * 10;
    
    // 檢查是否為偏好淚水，如果是則效果加倍
    const isPreferred = flower.tearPreference && flower.tearPreference.includes(tear.id);
    if (isPreferred) {
      growthIncrease *= 2;
    }
    
    // 考慮季節影響
    const currentSeason = gameData.jieqi[gameData.jieqiIndex].season;
    const seasonMultiplier = flower.seasonalGrowth[currentSeason] || 1;
    growthIncrease *= seasonMultiplier;
    
    // 情境共鳴機制：建築加成
    let buildingMultiplier = 1;
    let buildingBonusMessage = '';
    const cellBuilding = gameData.buildings.find(b => b.position === cellId && b.built);
    if (cellBuilding && cellBuilding.relatedFlower === flower.id) {
      // 花魂在對應建築中，獲得額外加成
      buildingMultiplier = 1.5;
      buildingBonusMessage = `在${cellBuilding.name}中，這株花似乎格外精神！`;
    }
    growthIncrease *= buildingMultiplier;
    
    // 情境共鳴機制：節氣與淚水類型的特殊組合（例如：清明+葬花淚）
    let specialResonance = 1;
    let resonanceMessage = '';
    const currentJieqi = gameData.jieqi[gameData.jieqiIndex].name;
    
    // 黛玉花魂的特殊共鳴：清明+葬花淚
    if (flower.id === 'daiyu-flower' && 
        currentJieqi === '清明' && 
        tear.id === 'burial-tear') {
      specialResonance = 2;
      resonanceMessage = '春風裡，這株花似乎對「葬花時的淚」格外敏感。';
    }
    growthIncrease *= specialResonance;
    
    // 更新花魂成長
    const oldGrowth = flower.growth;
    flower.growth += growthIncrease;
    
    // 檢查是否升級
    let leveledUp = false;
    if (flower.growth >= 100 && flower.level < flower.maxLevel) {
      flower.level += 1;
      flower.growth = 0;
      leveledUp = true;
      
      // 解鎖相關鳥靈
      if (flower.level >= 3) {
        const relatedBirds = gameData.birds.filter(b => b.relatedFlower === flower.id && !b.unlocked);
        if (relatedBirds.length > 0) {
          relatedBirds[0].unlocked = true;
          showMemoryDialog({
            title: `${relatedBirds[0].name}鳥靈覺醒`,
            content: `${flower.character}的花魂喚醒了${relatedBirds[0].character}的鳥靈！`
          });
          
          // 提示鳥靈解鎖
          setTimeout(() => {
            showHint('鳥靈覺醒', `${relatedBirds[0].character}的鳥靈已被喚醒，將提供特殊能力！`, '🐦');
          }, 2000);
        }
      }
      
      // 解鎖記憶
      if (flower.level === flower.maxLevel) {
        showMemoryDialog({
          title: `${flower.character}記憶覺醒`,
          content: `<div class="poem">${flower.judgmentPoem}</div><p style="margin-top: 20px;">${flower.character}的花魂已完全覺醒，她的判詞揭示了命運的謎團。</p>`
        });
      }
    }
    
    // 特殊節氣互動
    checkSpecialInteractions(flower);
    
    // 消耗淚水（除非是永久保存的最後一滴淚）
    if (tear.id !== 'last-tear') {
      // 不實際刪除，而是標記為未收集
      const tearIndex = gameData.tears.findIndex(t => t.id === tear.id);
      if (tearIndex >= 0) {
        gameData.tears[tearIndex].collected = false;
      }
      
      // 也減少可用淚水數量
      gameData.resources.tear -= 1;
      
      // 顯示資源變化動畫
      const tearCountEl = elements.tearCount;
      if (tearCountEl) {
        tearCountEl.classList.add('resource-change');
        setTimeout(() => tearCountEl.classList.remove('resource-change'), 500);
      }
    }
    
    // 刷新UI（動態導入避免循環依賴）
    updateResourceDisplay();
    import('./garden.js').then(({ initGarden }) => {
      initGarden();
    });
    updateLists();
    
    // 顯示結果
    let resultMessage = '';
    if (leveledUp) {
      resultMessage = `<span style="color: #4CAF50; font-weight: bold;">${flower.name}升級了！</span><br>當前等級: ${flower.level}/${flower.maxLevel}`;
      
      // 展示等級提示
      showHint('花魂升級', `${flower.character}的花魂升至 ${flower.level} 級！`, '✨');
    } else {
      const growthBefore = Math.floor(oldGrowth);
      const growthAfter = Math.floor(flower.growth);
      resultMessage = `${flower.name}成長了！<br>生長進度: ${growthBefore}% → <span style="color: #4CAF50; font-weight: bold;">${growthAfter}%</span>`;
      
      // 展示成長提示
      showHint('花魂成長', `${flower.character}的花魂成長了 ${Math.floor(growthIncrease)}%！`, '🌱');
    }
    
    // 使用記憶對話框展示結果，更具沉浸感
    const bonusMessages = [];
    if (isPreferred) {
      bonusMessages.push('<p style="color: #4CAF50; margin-top: 10px;">這是她偏好的淚水，效果加倍！</p>');
    }
    if (seasonMultiplier > 1) {
      bonusMessages.push(`<p style="color: #4CAF50; margin-top: 10px;">當前季節 (${currentSeason}) 對此花魂成長有利！</p>`);
    }
    if (buildingMultiplier > 1) {
      bonusMessages.push(`<p style="color: #5D5CDE; margin-top: 10px; font-style: italic;">${buildingBonusMessage}</p>`);
    }
    if (specialResonance > 1) {
      bonusMessages.push(`<p style="color: #9C27B0; margin-top: 10px; font-style: italic;">${resonanceMessage}</p>`);
    }
    
    showMemoryDialog({
      title: '淚水澆灌',
      content: `<div style="text-align: center;">
        <p>你用<strong>${tear.name}</strong>澆灌了${flower.character}的花魂。</p>
        <p style="margin-top: 15px;">${resultMessage}</p>
        ${bonusMessages.join('')}
      </div>`
    });
    
    return true;
  }).catch(() => false);
}

/**
 * 種植花魂
 * @param {string} flowerId - 花魂ID
 * @param {number} cellId - 格子ID
 */
export function plantFlower(flowerId, cellId) {
  const flower = gameData.flowers.find(f => f.id === flowerId);
  if (!flower || flower.position !== -1) return;
  
  // 檢查對應建築是否已建造
  const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
  if (requiredBuilding && !requiredBuilding.built) {
    showMemoryDialog({
      title: '無法種植',
      content: `需要先建造${requiredBuilding.name}`
    });
    return;
  }
  
  // 動態導入避免循環依賴
  import('../core/action-points.js').then(({ consumeActionPointsWithHint }) => {
    if (!consumeActionPointsWithHint(actionCosts.plantFlower, '種植花魂')) {
      return;
    }
    
    // 更新花魂和單元格狀態
    flower.position = cellId;
    flower.status = "生長中";
    gameData.cells[cellId].flowerId = flowerId;
    gameData.cells[cellId].type = 'flower';
    
    // 刷新UI（動態導入避免循環依賴）
    import('./garden.js').then(({ initGarden }) => {
      initGarden();
    });
    updateLists();
    
    // 顯示種植成功動畫
    const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
    if (cellElement) {
      cellElement.classList.add('flashback');
      setTimeout(() => {
        cellElement.classList.remove('flashback');
      }, 3000);
    }
    
    // 顯示種植成功對話框
    showMemoryDialog({
      title: `${flower.name}已種植`,
      content: `
        <div style="text-align: center;">
          <p>${flower.icon} ${flower.character}的花魂已種下！</p>
          <p style="margin-top: 15px;">現在需要用淚水澆灌來喚醒她的記憶。</p>
          <p style="margin-top: 20px; color: #5D5CDE;">
            <strong>提示：</strong> ${flower.specialCare}
          </p>
          <p style="margin-top: 15px; font-style: italic; color: #666;">
            偏好淚水可使成長速度加倍！
          </p>
        </div>
      `
    });
    
    // 提示下一步澆灌
    setTimeout(() => {
      showHint('提示', `嘗試用絳珠澆灌${flower.character}的花魂`, '💧');
    }, 2000);
    
    // 更新推薦的下一步行動
    gameData.suggestedActions.nextFlowerId = null;
    
    // 如果還沒有建議的操作，建議收集淚水
    if (!gameData.suggestedActions.nextAction) {
      // 建議答題解鎖記憶獲得資源（不消耗行動力）
      const unlockedMemories = gameData.memories.filter(m => !m.unlocked && !m.collected && m.readingRequired);
      if (unlockedMemories.length > 0) {
        gameData.suggestedActions.nextAction = 'unlock-memory';
      } else {
        gameData.suggestedActions.nextAction = 'advance-jieqi';
      }
    }
  });
}

/**
 * 檢查特殊節氣互動
 * @param {Object} flower - 花魂對象
 */
export function checkSpecialInteractions(flower) {
  const elements = getElements();
  const currentJieqi = gameData.jieqi[gameData.jieqiIndex].name;
  
  // 黛玉花魂在清明互動
  if (flower.id === 'daiyu-flower' && currentJieqi === '清明' && flower.level >= 2) {
    const memory = gameData.memories.find(m => m.id === 'daiyu-burial');
    if (memory && !memory.collected) {
      memory.collected = true;
      gameData.resources.memory += 1;
      
      // 也獲得特殊淚水 - 葬花淚
      const tear = gameData.tears.find(t => t.id === 'burial-tear');
      if (tear && !tear.collected) {
        tear.collected = true;
        gameData.resources.tear += 1;
        
        // 顯示資源變化動畫
        if (elements.tearCount) {
          elements.tearCount.classList.add('resource-change');
          setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
        }
        
        showMemoryDialog({
          title: '葬花記憶與淚水',
          content: `<div class="poem">${memory.content}</div>
          <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
            你收集到了【葬花淚】，這是黛玉在葬花時流下的淚水。
          </p>`
        });
        
        // 提示獲得特殊淚水
        setTimeout(() => {
          showHint('特殊淚水', '獲得「葬花淚」，這是黛玉葬花時的淚水', '💧');
        }, 2000);
      }
    }
  }
  
  // 其他花魂與記憶、淚水的互動
  gameData.memories.forEach(memory => {
    if (memory.requiredJieqi === currentJieqi && !memory.collected && flower.level >= 2) {
      // 檢查是否有關聯的淚水
      if (memory.relatedTear) {
        const tear = gameData.tears.find(t => t.id === memory.relatedTear);
        if (tear && !tear.collected) {
          tear.collected = true;
          gameData.resources.tear += 1;
          memory.collected = true;
          gameData.resources.memory += 1;
          
          // 顯示資源變化動畫
          if (elements.tearCount) {
            elements.tearCount.classList.add('resource-change');
            setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
          }
          
          showMemoryDialog({
            title: `${memory.name}與淚水`,
            content: `<div class="poem">${memory.content}</div>
            <p style="margin-top: 20px; text-align: center; color: #5D5CDE;">
              你收集到了【${tear.name}】，這是黛玉在此場景中流下的淚水。
            </p>`
          });
          
          // 提示獲得特殊淚水
          setTimeout(() => {
            showHint('特殊淚水', `獲得「${tear.name}」，一種珍貴的淚水`, '💧');
          }, 2000);
        }
      }
    }
  });
}

