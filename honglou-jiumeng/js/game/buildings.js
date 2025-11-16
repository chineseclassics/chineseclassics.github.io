/**
 * 建築系統模塊
 * 管理建築的建造、修復和相關邏輯
 */

import { gameData, actionCosts } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryDialog, showDialog, hideDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { updateResourceDisplay } from '../ui/display.js';
import { updateLists } from '../ui/lists.js';

/**
 * 顯示建造對話框
 * @param {number} cellId - 格子ID
 */
export function showBuildDialog(cellId) {
  const elements = getElements();
  
  // 更新最後操作時間
  gameData.lastActionTime = Date.now();
  
  const availableBuildings = gameData.buildings.filter(b => !b.built && b.unlocked);
  const availableFlowers = gameData.flowers.filter(f => f.unlocked && f.position === -1);
  
  let dialogContent = '<h4 style="margin-bottom: 15px;">建造建築</h4>';
  
  if (availableBuildings.length > 0) {
    dialogContent += '<div class="build-menu">';
    availableBuildings.forEach(building => {
      const canAfford = gameData.resources.tear >= building.cost.tear && 
                      gameData.resources.stone >= building.cost.stone;
      
      // 判斷是否為推薦建築
      const isRecommended = building.id === gameData.suggestedActions.nextBuildingId;
      
      dialogContent += `
        <div class="build-item ${!canAfford ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}" 
             data-building-id="${building.id}" 
             data-cell-id="${cellId}">
          <div class="build-icon">${building.icon}</div>
          <div class="build-name">${building.name}</div>
          <div style="font-size: 11px; margin: 5px 0; color: #666; text-align: center;">
            ${building.description}
          </div>
          <div class="build-cost">
            <span class="build-cost-icon">💧</span>${building.cost.tear} 絳珠, 
            <span class="build-cost-icon">🪨</span>${building.cost.stone} 靈石
          </div>
        </div>
      `;
    });
    dialogContent += '</div>';
  } else {
    dialogContent += '<p style="text-align: center; color: #666; margin-bottom: 20px;">暫無可建造的建築</p>';
  }
  
  dialogContent += '<h4 style="margin: 20px 0 15px 0;">種植花魂</h4>';
  
  if (availableFlowers.length > 0) {
    dialogContent += '<div class="build-menu">';
    availableFlowers.forEach(flower => {
      const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
      const buildingBuilt = requiredBuilding && requiredBuilding.built;
      
      // 判斷是否為推薦花魂
      const isRecommended = flower.id === gameData.suggestedActions.nextFlowerId;
      
      dialogContent += `
        <div class="build-item ${!buildingBuilt ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}" 
             data-flower-id="${flower.id}" 
             data-cell-id="${cellId}">
          <div class="build-icon">${flower.icon}</div>
          <div class="build-name">${flower.name} (${flower.character})</div>
          <div style="font-size: 11px; margin: 5px 0; color: #666; text-align: center;">
            ${flower.description}
          </div>
          <div class="build-cost">
            需要: ${requiredBuilding ? requiredBuilding.name : '未知'} 已建造
          </div>
        </div>
      `;
    });
    dialogContent += '</div>';
  } else {
    dialogContent += '<p style="text-align: center; color: #666;">暫無可種植的花魂</p>';
  }
  
  showDialog({
    title: '建造選項',
    content: dialogContent,
    hideButtons: true
  });
  
  // 添加建築點擊事件
  document.querySelectorAll('.build-item[data-building-id]').forEach(item => {
    if (!item.classList.contains('disabled')) {
      item.addEventListener('click', () => {
        const buildingId = item.dataset.buildingId;
        const cellId = parseInt(item.dataset.cellId);
        buildStructure(buildingId, cellId);
        hideDialog();
      });
    } else {
      // 為禁用項目添加提示點擊
      item.addEventListener('click', () => {
        const buildingId = item.dataset.buildingId;
        const building = gameData.buildings.find(b => b.id === buildingId);
        
        if (building) {
          const needsTear = gameData.resources.tear < building.cost.tear;
          const needsStone = gameData.resources.stone < building.cost.stone;
          
          let resourceNeeded = '';
          if (needsTear && needsStone) {
            resourceNeeded = '絳珠與靈石';
          } else if (needsTear) {
            resourceNeeded = '絳珠';
          } else if (needsStone) {
            resourceNeeded = '靈石';
          }
          
          showHint('資源不足', `建造 ${building.name} 需要更多${resourceNeeded}`, '⚠️');
        }
      });
    }
  });
  
  // 添加花魂點擊事件（動態導入避免循環依賴）
  document.querySelectorAll('.build-item[data-flower-id]').forEach(item => {
    if (!item.classList.contains('disabled')) {
      item.addEventListener('click', () => {
        const flowerId = item.dataset.flowerId;
        const cellId = parseInt(item.dataset.cellId);
        import('./flowers.js').then(({ plantFlower }) => {
          plantFlower(flowerId, cellId);
          hideDialog();
        });
      });
    } else {
      // 為禁用項目添加提示點擊
      item.addEventListener('click', () => {
        const flowerId = item.dataset.flowerId;
        const flower = gameData.flowers.find(f => f.id === flowerId);
        
        if (flower) {
          const requiredBuilding = gameData.buildings.find(b => b.id === flower.needsBuilding);
          showHint('無法種植', `需要先建造 ${requiredBuilding?.name || '相關建築'}`, '⚠️');
        }
      });
    }
  });
}

/**
 * 建造建築
 * @param {string} buildingId - 建築ID
 * @param {number} cellId - 格子ID
 */
export function buildStructure(buildingId, cellId) {
  const elements = getElements();
  const building = gameData.buildings.find(b => b.id === buildingId);
  if (!building || building.built) return;
  
  // 檢查資源
  if (gameData.resources.tear < building.cost.tear || gameData.resources.stone < building.cost.stone) {
    showMemoryDialog({
      title: '資源不足',
      content: '淚水或靈石不足，無法建造'
    });
    return;
  }
  
  // 扣除資源
  gameData.resources.tear -= building.cost.tear;
  gameData.resources.stone -= building.cost.stone;
  
  // 顯示資源變化動畫
  if (building.cost.tear > 0 && elements.tearCount) {
    elements.tearCount.classList.add('resource-change');
    setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
  }
  
  if (building.cost.stone > 0 && elements.stoneCount) {
    elements.stoneCount.classList.add('resource-change');
    setTimeout(() => elements.stoneCount.classList.remove('resource-change'), 500);
  }
  
  // 更新建築和單元格狀態
  building.built = true;
  building.position = cellId;
  building.status = "完好";
  gameData.cells[cellId].buildingId = buildingId;
  gameData.cells[cellId].type = 'building';
  
  // 檢查是否解鎖相關花魂
  const relatedFlowers = [];
  gameData.flowers.forEach(flower => {
    if (flower.needsBuilding === buildingId && !flower.unlocked) {
      flower.unlocked = true;
      flower.status = "待種植";
      relatedFlowers.push(flower);
      
      // 更新建議
      if (!gameData.suggestedActions.nextFlowerId) {
        gameData.suggestedActions.nextFlowerId = flower.id;
      }
    }
  });
  
  // 刷新UI（動態導入避免循環依賴）
  updateResourceDisplay();
  import('./garden.js').then(({ initGarden }) => {
    initGarden();
  });
  updateLists();
  
  // 顯示建造成功消息
  showMemoryDialog({
    title: `${building.name}建造完成`,
    content: `
      <div style="text-align: center;">
        <p>${building.icon} ${building.name} 已成功建造！</p>
        <p style="margin-top: 15px;">${building.description}</p>
        ${relatedFlowers.length > 0 ? 
          `<p style="margin-top: 20px; color: #4CAF50;">
            <strong>解鎖花魂：</strong> ${relatedFlowers.map(f => `${f.name} (${f.character})`).join('、')}
          </p>` : 
          ''}
      </div>
    `
  });
  
  // 如果解鎖了花魂，顯示提示
  if (relatedFlowers.length > 0) {
    setTimeout(() => {
      showHint('花魂解鎖', `${relatedFlowers.map(f => f.character).join('、')}的花魂已解鎖！`, '🌺');
    }, 2000);
  }
  
  // 已禁用提示氣泡功能
  // import('../utils/suggestions.js').then(({ updateSuggestedActions }) => {
  //   updateSuggestedActions();
  // }).catch(() => {
  //   // 如果模塊不存在，暫時跳過
  // });
}

/**
 * 修復建築
 * @param {number} cellId - 格子ID
 */
export function repairBuilding(cellId) {
  const elements = getElements();
  const cell = gameData.cells[cellId];
  if (!cell.buildingId) return;
  
  // 計算修復成本
  const decayValue = cell.decayValue;
  const repairCost = Math.ceil(decayValue * 5);
  
  // 檢查資源
  if (gameData.resources.tear < repairCost) {
    showMemoryDialog({
      title: '淚水不足',
      content: `<div style="text-align: center;">
        <p>修復需要 ${repairCost} 絳珠，但你只有 ${gameData.resources.tear} 絳珠</p>
        <p style="margin-top: 15px; color: #5D5CDE;">
          提示: 使用「尋找絳珠」按鈕收集更多淚水
        </p>
      </div>`
    });
    return;
  }
  
  const repairApCost = Math.min(
    actionCosts.repairBuildingMax, 
    Math.max(actionCosts.repairBuildingMin, Math.ceil(decayValue * 3))
  );
  
  // 動態導入避免循環依賴
  import('../core/action-points.js').then(({ consumeActionPointsWithHint }) => {
    if (!consumeActionPointsWithHint(repairApCost, '修復建築')) {
      return;
    }
    
    // 扣除資源
    gameData.resources.tear -= repairCost;
    
    // 顯示資源變化動畫
    if (elements.tearCount) {
      elements.tearCount.classList.add('resource-change');
      setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
    }
    
    // 修復建築
    cell.decayValue = 0;
    
    // 更新建築狀態
    const building = gameData.buildings.find(b => b.id === cell.buildingId);
    if (building) {
      building.status = "完好";
    }
    
    // 刷新UI
    updateResourceDisplay();
    import('./garden.js').then(({ initGarden }) => {
      initGarden();
    });
    
    // 顯示成功動畫
    const cellElement = document.querySelector(`.garden-cell[data-id="${cellId}"]`);
    if (cellElement) {
      cellElement.classList.add('flashback');
      setTimeout(() => {
        cellElement.classList.remove('flashback');
      }, 2000);
    }
    
    showMemoryDialog({
      title: '修復完成',
      content: `<div style="text-align: center;">
        <p>建築已恢復往日光彩！</p>
        <p style="margin-top: 15px; color: #4CAF50;">
          消耗: ${repairCost} 絳珠
        </p>
      </div>`
    });
    
    // 提示修復成功
    showHint('建築修復', `${building?.name || '建築'}已恢復完好狀態`, '🔨');
  });
}

