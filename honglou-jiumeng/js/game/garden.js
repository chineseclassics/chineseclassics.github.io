/**
 * 園林系統模塊
 * 管理大觀園格子的初始化和點擊處理
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { getConditionText } from '../ui/display.js';
import { showDialog, showMemoryDialog, hideDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { collectMemory } from './memories.js';

/**
 * 初始化園林格子
 */
export function initGarden() {
  const elements = getElements();
  if (!elements.gardenGrid) {
    console.error("找不到園林格子元素");
    return;
  }
  
  elements.gardenGrid.innerHTML = '';
  
  // 判斷是否有建議的下一步操作
  const suggestedBuildingId = gameData.suggestedActions.nextBuildingId;
  const suggestedFlowerId = gameData.suggestedActions.nextFlowerId;
  
  gameData.cells.forEach(cell => {
    const cellElement = document.createElement('div');
    // 基礎類名
    let cellClass = `garden-cell ${!cell.unlocked ? 'unlock-required' : ''}`;
    
    // 是否為推薦操作的格子
    const isSuggestedBuildingCell = suggestedBuildingId && 
      gameData.buildings.find(b => b.id === suggestedBuildingId)?.position === cell.id;
    
    if (isSuggestedBuildingCell && !cell.buildingId) {
      cellClass += ' suggested-action';
    }
    
    // 設置格子類型類名
    if (cell.buildingId) {
      cellClass += ' has-building';
    } else if (cell.flowerId) {
      cellClass += ' has-flower';
    } else if (cell.memoryId) {
      cellClass += ' has-memory interactive';
    } else if (cell.unlocked && (gameData.resources.stone >= 10 || gameData.flowers.some(f => f.unlocked && f.position === -1))) {
      // 如果有足夠資源建造或有花魂可種植，標記為可交互
      cellClass += ' interactive';
    }
    
    cellElement.className = cellClass;
    cellElement.dataset.id = cell.id;
    
    // 根據格子內容設置HTML
    let cellHTML = '';
    let statusText = '';
    
    if (cell.buildingId) {
      const building = gameData.buildings.find(b => b.id === cell.buildingId);
      if (building) {
        const condition = 1 - cell.decayValue;
        let conditionText = getConditionText(condition);
        let statusIcon = '✅';
        
        if (condition < 0.5) {
          statusIcon = '⚠️';
        }
        
        // 只有非警幻仙閣建築才顯示狀態文本
        statusText = building.id !== 'base-camp' ? 
          `<div class="cell-status"><span>${statusIcon}</span> ${conditionText}</div>` : '';
        
        cellHTML = `
          <div class="building">
            <div class="building-icon">${building.icon}</div>
            <div class="building-name">${building.name}</div>
          </div>
          <div class="decay-overlay" style="opacity: ${cell.decayValue}">
            <div class="decay-icon">🕸️</div>
          </div>
          <div class="watering-effect"></div>
          ${statusText}
        `;
      }
    } else if (cell.flowerId) {
      const flower = gameData.flowers.find(f => f.id === cell.flowerId);
      if (flower) {
        const growthPercent = Math.floor(flower.growth);
        statusText = `<div class="cell-status"><span>${flower.level > 0 ? '✨' : '🌱'}</span> Lv${flower.level} (${growthPercent}%)</div>`;
        
        cellHTML = `
          <div class="flower">
            <div class="flower-icon">${flower.icon}</div>
            <div class="flower-name">${flower.name}</div>
          </div>
          <div class="watering-effect"></div>
          ${statusText}
        `;
      }
    } else if (cell.memoryId) {
      const memory = gameData.memories.find(m => m.id === cell.memoryId);
      if (memory) {
        statusText = `<div class="cell-status"><span>💫</span> 點擊收集</div>`;
        
        cellHTML = `
          <div class="memory">
            <div class="memory-icon">${memory.icon}</div>
            <div class="memory-name">${memory.name}</div>
          </div>
          ${statusText}
        `;
      }
    }
    
    cellElement.innerHTML = cellHTML || '';
    
    // 添加點擊事件
    cellElement.addEventListener('click', () => {
      if (cell.unlocked) {
        gameData.lastActionTime = Date.now(); // 更新最後操作時間
        handleCellClick(cell);
      } else {
        showHint('格子未解鎖', '完成目前任務以解鎖更多園區', '🔒');
      }
    });
    
    elements.gardenGrid.appendChild(cellElement);
  });
}

/**
 * 處理格子點擊
 * @param {Object} cell - 格子對象
 */
export function handleCellClick(cell) {
  if (cell.buildingId) {
    // 點擊已有建築 - 由 buildings.js 處理
    const building = gameData.buildings.find(b => b.id === cell.buildingId);
    
    // 計算維修成本
    const decayValue = cell.decayValue;
    const repairCost = Math.ceil(decayValue * 5);
    const needsRepair = decayValue > 0.2;
    
    // 判斷是否有足夠資源維修
    const canRepair = gameData.resources.tear >= repairCost;
    
    showDialog({
      title: building.name,
      content: `
        <p>${building.description}</p>
        <div class="progress-container">
          <div class="progress-label">建築狀態</div>
          <div class="progress-bar" style="width: ${(1 - cell.decayValue) * 100}%"></div>
        </div>
        <p style="margin-top: 15px;">狀態: ${getConditionText(1 - cell.decayValue)}</p>
        ${needsRepair ? `<p style="margin-top: 10px; color: ${canRepair ? '#4CAF50' : '#F44336'};">維修需要: ${repairCost} 絳珠</p>` : ''}
        ${building.relatedFlower ? 
          `<p style="margin-top: 10px;">相關花魂: <strong>${gameData.flowers.find(f => f.id === building.relatedFlower)?.name || '未知'}</strong> (${gameData.flowers.find(f => f.id === building.relatedFlower)?.character || ''})</p>` : 
          ''}
      `,
      confirmText: needsRepair ? '維修' : '關閉',
      cancelText: '關閉',
      showCancel: needsRepair,
      onConfirm: () => {
        if (needsRepair) {
          // 動態導入避免循環依賴
          import('./buildings.js').then(({ repairBuilding }) => {
            repairBuilding(cell.id);
            hideDialog();
          });
        } else {
          hideDialog();
        }
      }
    });
  } else if (cell.flowerId) {
    // 點擊已有花魂 - 由 flowers.js 處理
    const flower = gameData.flowers.find(f => f.id === cell.flowerId);
    
    // 檢查是否有淚水可用
    const availableTears = gameData.tears.filter(t => t.collected);
    const canWater = availableTears.length > 0;
    
    // 顯示適合的淚水類型
    let tearsHtml = '';
    if (flower.tearPreference && flower.tearPreference.length > 0) {
      tearsHtml = '<p style="margin-top: 10px;"><strong>偏好淚水:</strong> ';
      flower.tearPreference.forEach((tearId, index) => {
        const tear = gameData.tears.find(t => t.id === tearId);
        if (tear) {
          const isTearCollected = tear.collected;
          tearsHtml += `<span style="color: ${isTearCollected ? '#4CAF50' : '#999'};">${tear.name}</span>${index < flower.tearPreference.length - 1 ? '、' : ''}`;
        }
      });
      tearsHtml += '</p>';
    }
    
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
        <p><strong>特殊照料:</strong> ${flower.specialCare}</p>
        <p style="margin-top: 10px;"><strong>季節生長速度:</strong> 
          春 ${flower.seasonalGrowth.春}x · 
          夏 ${flower.seasonalGrowth.夏}x · 
          秋 ${flower.seasonalGrowth.秋}x · 
          冬 ${flower.seasonalGrowth.冬}x
        </p>
        ${tearsHtml}
        <p style="margin-top: 15px;"><strong>判詞:</strong> <em>${flower.judgmentPoem}</em></p>
      `,
      confirmText: canWater ? '澆灌' : '無可用淚水',
      cancelText: '關閉',
      onConfirm: () => {
        if (canWater) {
          // 動態導入避免循環依賴
          import('./flowers.js').then(({ showWateringDialog }) => {
            showWateringDialog(cell.id, flower);
          });
        } else {
          hideDialog();
          showHint('提示', '請先收集淚水，再澆灌花魂', '💧');
        }
      }
    });
  } else if (cell.memoryId) {
    // 點擊記憶碎片
    const memory = gameData.memories.find(m => m.id === cell.memoryId);
    showMemoryDialog(memory);
    collectMemory(memory.id);
    
    // 更新最後操作
    gameData.lastActionTime = Date.now();
    
    // 顯示一個提示，具體內容根據記憶類型
    if (memory.type === "tear") {
      showHint('收集淚水', `你獲得了一滴絳珠: ${gameData.tears.find(t => t.id === memory.relatedTear)?.name || '未知淚水'}`, '💧');
    } else if (memory.type === "stone") {
      showHint('獲得靈石', `從寶玉的領悟中獲得了${memory.stoneValue}塊靈石`, '🪨');
    }
  } else {
    // 點擊空格 - 顯示建造對話框（動態導入避免循環依賴）
    import('./buildings.js').then(({ showBuildDialog }) => {
      showBuildDialog(cell.id);
    });
  }
}

