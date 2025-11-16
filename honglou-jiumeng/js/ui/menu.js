/**
 * 菜單系統模塊
 * 管理主選單的顯示、隱藏和目標顯示
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showDialog } from './dialogs.js';

/**
 * 切換選單顯示狀態
 */
export function toggleMenu() {
  const elements = getElements();
  if (elements.mainMenu) {
    elements.mainMenu.classList.toggle('menu-open');
  }
}

/**
 * 關閉選單
 */
export function closeMenu() {
  const elements = getElements();
  if (elements.mainMenu) {
    elements.mainMenu.classList.remove('menu-open');
  }
}

/**
 * 顯示當前目標
 */
export function showCurrentGoals() {
  // 獲取當前進度
  const builtBuildings = gameData.buildings.filter(b => b.built).length;
  const totalBuildings = gameData.buildings.filter(b => b.unlocked).length;
  
  const plantedFlowers = gameData.flowers.filter(f => f.position !== -1).length;
  const unlockedFlowers = gameData.flowers.filter(f => f.unlocked).length;
  
  const awakenedBirds = gameData.birds.filter(b => b.unlocked).length;
  
  // 生成下一步目標列表
  let goalsHTML = '';
  
  // 建築目標
  if (builtBuildings < totalBuildings) {
    const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked);
    if (nextBuilding) {
      goalsHTML += `<li style="margin-bottom: 8px;">建造 ${nextBuilding.name} (需要 ${nextBuilding.cost.stone} 靈石)</li>`;
    }
  }
  
  // 花魂目標
  if (plantedFlowers < unlockedFlowers) {
    const unplantedFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
    if (unplantedFlower) {
      goalsHTML += `<li style="margin-bottom: 8px;">種植 ${unplantedFlower.character} 的花魂</li>`;
    }
  }
  
  // 澆灌目標
  const lowLevelFlowers = gameData.flowers.filter(f => f.position !== -1 && f.level < 3);
  if (lowLevelFlowers.length > 0) {
    goalsHTML += `<li style="margin-bottom: 8px;">澆灌花魂至少到 Lv3 以解鎖鳥靈</li>`;
  }
  
  // 收集記憶目標
  const memoryCount = gameData.memories.filter(m => m.collected).length;
  if (memoryCount < 10) {
    goalsHTML += `<li style="margin-bottom: 8px;">繼續收集記憶碎片 (${memoryCount}/24)</li>`;
  }
  
  // 輪迴目標
  if (gameData.cycle < 3) {
    goalsHTML += `<li style="margin-bottom: 8px;">完成 ${3 - gameData.cycle} 輪輪迴以達成結局</li>`;
  }
  
  // 特殊節氣目標
  const currentJieqi = gameData.jieqi[gameData.jieqiIndex].name;
  const upcomingMemories = gameData.memories.filter(m => 
    !m.collected && ['清明', '立夏', '夏至', '白露', '冬至'].includes(m.requiredJieqi));
  
  if (upcomingMemories.length > 0) {
    const nextMemoryJieqi = upcomingMemories[0].requiredJieqi;
    goalsHTML += `<li style="margin-bottom: 8px;">推進節氣至 ${nextMemoryJieqi} 可觸發特殊記憶</li>`;
  }
  
  // 顯示目標對話框
  showDialog({
    title: '當前目標',
    content: `<div style="text-align: left;">
      <p>大觀園重建進度：</p>
      <div style="margin: 15px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <span>建築</span>
          <span>${builtBuildings}/${totalBuildings}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${(builtBuildings / Math.max(1, totalBuildings)) * 100}%"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 5px 0;">
          <span>花魂</span>
          <span>${gameData.flowers.filter(f => f.level > 0).length}/12</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${(gameData.flowers.filter(f => f.level > 0).length / 12) * 100}%"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 5px 0;">
          <span>鳥靈</span>
          <span>${awakenedBirds}/12</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${(awakenedBirds / 12) * 100}%"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0 5px 0;">
          <span>記憶</span>
          <span>${memoryCount}/24</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${(memoryCount / 24) * 100}%"></div>
        </div>
      </div>
      
      ${goalsHTML ? `
        <p style="margin-top: 20px;"><strong>下一步建議：</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          ${goalsHTML}
        </ul>
      ` : '<p style="margin-top: 20px; color: #4CAF50;">恭喜！您已完成所有主要目標！</p>'}
    </div>`,
    confirmText: '關閉',
    showCancel: false
  });
}

