/**
 * 行動系統模塊
 * 管理遊戲中的主要行動（收集淚水、尋找記憶）
 */

import { gameData, actionCosts } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryDialog } from '../ui/dialogs.js';
import { showHint } from '../ui/hints.js';
import { updateResourceDisplay } from '../ui/display.js';
import { updateLists } from '../ui/lists.js';
import { spawnMemory } from './memories.js';

/**
 * 收集絳珠
 */
export function collectTears() {
  const elements = getElements();
  
  // 動態導入避免循環依賴
  return import('../core/action-points.js').then(({ consumeActionPointsWithHint }) => {
    if (!consumeActionPointsWithHint(actionCosts.collectTears, '尋找絳珠')) {
      return;
    }
    
    // 更新最後操作時間
    gameData.lastActionTime = Date.now();
    
    // 記錄按鈕點擊類型，用於引導生成相應類型的記憶碎片
    try {
      localStorage.setItem('lastButtonClicked', 'collect-tears');
    } catch (e) {
      console.log("無法存儲按鈕點擊信息:", e);
    }
    
    // 計算基礎獲取量
    let tearGain = 1;
    
    // 根據當前節氣判斷額外效果
    const currentJieqi = gameData.jieqi[gameData.jieqiIndex];
    let seasonalBonus = false;
    
    // 在雨水、穀雨、梅雨等節氣有額外絳珠
    if (['雨水', '穀雨', '白露', '小雪', '大雪'].includes(currentJieqi.name)) {
      tearGain += 1;
      seasonalBonus = true;
    }
    
    // 鳥靈加成
    const activeBirds = gameData.birds.filter(bird => bird.unlocked);
    let birdBonus = false;
    if (activeBirds.length > 0) {
      tearGain += activeBirds.length;
      birdBonus = true;
    }
    
    // 增加資源
    gameData.resources.tear += tearGain;
    
    // 顯示資源變化動畫
    if (elements.tearCount) {
      elements.tearCount.classList.add('resource-change');
      setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
    }
    
    // 查找未收集的淚水
    const uncollectedTears = gameData.tears.filter(t => !t.collected);
    let foundSpecialTear = false;
    
    if (uncollectedTears.length > 0 && Math.random() < 0.3) {
      // 隨機選擇一種淚水收集
      const randomTear = uncollectedTears[Math.floor(Math.random() * uncollectedTears.length)];
      randomTear.collected = true;
      foundSpecialTear = true;
      
      // 顯示特殊提示
      showMemoryDialog({
        title: '特殊絳珠收集',
        content: `<div style="text-align: center;">
          <p>你在大觀園中尋找到了一種特殊的淚水：</p>
          <p style="margin: 15px 0; font-size: 20px; color: #5D5CDE;">
            <strong>${randomTear.icon} ${randomTear.name}</strong>
          </p>
          <div class="poem">
            ${randomTear.scene}
          </div>
          <p style="margin-top: 15px; font-style: italic; color: #666;">
            這種淚水對特定花魂有加倍效果
          </p>
        </div>`
      });
      
      // 提示特殊淚水收集
      setTimeout(() => {
        showHint('特殊淚水', `收集到「${randomTear.name}」，查看淚水列表了解詳情`, '✨');
      }, 2000);
    } else {
      // 顯示普通收集提示
      showMemoryDialog({
        title: '絳珠收集',
        content: `<div style="text-align: center;">
          <p>你在大觀園中收集了 ${tearGain} 滴絳珠</p>
          ${seasonalBonus ? `<p style="margin-top: 10px; color: #4CAF50;">當前節氣 (${currentJieqi.name}) 使淚水更容易收集</p>` : ''}
          ${birdBonus ? `<p style="margin-top: 10px; color: #4CAF50;">鳥靈幫助收集了額外的淚水</p>` : ''}
        </div>`
      });
      
      // 提示一般淚水收集
      showHint('絳珠收集', `獲得了 ${tearGain} 滴絳珠，可用於澆灌花魂或建造建築`, '💧');
    }
    
    // 刷新UI
    updateResourceDisplay();
    updateLists();
    
    // 更新建議行動
    gameData.suggestedActions.nextAction = null;
    
    // 如果有花魂可以澆灌且有足夠淚水，建議澆灌花魂
    const plantedFlowers = gameData.flowers.filter(f => f.position !== -1);
    if (plantedFlowers.length > 0 && gameData.resources.tear > 0) {
      // 標記建議澆灌的花魂
      const flowerCells = gameData.cells.filter(c => c.flowerId);
      if (flowerCells.length > 0) {
        const targetCell = flowerCells[0];
        const cellElement = document.querySelector(`.garden-cell[data-id="${targetCell.id}"]`);
        if (cellElement) {
          setTimeout(() => {
            cellElement.classList.add('suggested-action');
          }, 1000);
        }
      }
    }
    
    // 如果沒有種植花魂但有解鎖的花魂，建議種植花魂
    else if (gameData.flowers.filter(f => f.unlocked && f.position === -1).length > 0) {
      if (!gameData.suggestedActions.nextFlowerId) {
        const nextFlower = gameData.flowers.find(f => f.unlocked && f.position === -1);
        if (nextFlower) {
          gameData.suggestedActions.nextFlowerId = nextFlower.id;
        }
      }
    }
    
    // 如果剛開始遊戲，建議建造建築
    else if (!gameData.suggestedActions.nextBuildingId && gameData.resources.stone >= 10) {
      const nextBuilding = gameData.buildings.find(b => !b.built && b.unlocked);
      if (nextBuilding) {
        gameData.suggestedActions.nextBuildingId = nextBuilding.id;
      }
    }
  });
}

/**
 * 尋找寶玉領悟
 */
export function searchMemories() {
  const elements = getElements();
  
  if (gameData.resources.tear < 2) {
    showMemoryDialog({
      title: '絳珠不足',
      content: `<div style="text-align: center;">
        <p>需要2滴絳珠才能尋找寶玉的領悟記憶</p>
        <p style="margin-top: 15px; color: #5D5CDE;">
          先使用「尋找絳珠」按鈕收集更多淚水
        </p>
      </div>`
    });
    return;
  }
  
  // 動態導入避免循環依賴
  return import('../core/action-points.js').then(({ consumeActionPointsWithHint }) => {
    if (!consumeActionPointsWithHint(actionCosts.searchMemories, '尋找寶玉領悟')) {
      return;
    }
    
    // 更新最後操作時間
    gameData.lastActionTime = Date.now();
    
    // 記錄按鈕點擊類型，用於引導生成寶玉領悟類型的記憶
    try {
      localStorage.setItem('lastButtonClicked', 'search-memories');
    } catch (e) {
      console.log("無法存儲按鈕點擊信息:", e);
    }
    
    // 扣除資源
    gameData.resources.tear -= 2;
    
    // 顯示資源變化動畫
    if (elements.tearCount) {
      elements.tearCount.classList.add('resource-change');
      setTimeout(() => elements.tearCount.classList.remove('resource-change'), 500);
    }
    
    // 增加成功率 - 基於當前輪迴和已收集的花魂
    const baseProbability = 0.7;
    const cycleBonus = (gameData.cycle - 1) * 0.1;
    const flowerBonus = gameData.flowers.filter(f => f.level > 0).length * 0.05;
    const successRate = Math.min(0.9, baseProbability + cycleBonus + flowerBonus);
    
    // 嘗試生成記憶碎片
    if (Math.random() < successRate) {
      const memorySpawned = spawnMemory("stone");
      
      if (memorySpawned) {
        showMemoryDialog({
          title: '發現寶玉領悟',
          content: `<div style="text-align: center;">
            <p>你感受到一絲寶玉的心境，園中某處浮現了他對人世的思考。</p>
            <p style="margin-top: 15px; color: #5D5CDE;">
              尋找記憶碎片 🧠 並點擊它以獲得靈石。
            </p>
            <p style="margin-top: 15px; font-style: italic; color: #666;">
              靈石可用於重建大觀園建築，恢復昔日繁華。
            </p>
          </div>`
        });
        
        // 提示找到記憶
        showHint('尋找記憶', '園林中出現了寶玉的領悟，點擊記憶碎片獲取靈石', '🧠');
      } else {
        // 雖然想要生成記憶，但沒有合適的位置
        showMemoryDialog({
          title: '尋找受阻',
          content: `<div style="text-align: center;">
            <p>你感受到寶玉的領悟就在附近，但似乎找不到合適的地方顯現。</p>
            <p style="margin-top: 15px; color: #5D5CDE;">
              嘗試清理一些園林格子，為記憶碎片騰出空間。
            </p>
          </div>`
        });
      }
    } else {
      showMemoryDialog({
        title: '一無所獲',
        content: `<div style="text-align: center;">
          <p>紅塵茫茫，寶玉的領悟也已四散飄零...</p>
          <p style="margin-top: 15px; font-style: italic; color: #666;">
            ${getRandomSearchFailMessage()}
          </p>
        </div>`
      });
      
      // 提示未找到記憶
      showHint('未發現領悟', '嘗試在不同節氣搜尋，或在推進節氣後再試', '⏳');
    }
    
    // 刷新UI
    updateResourceDisplay();
    
    // 更新建議操作 - 如果尋找失敗，建議推進節氣
    if (Math.random() < 0.5) {
      gameData.suggestedActions.nextAction = 'advance-jieqi';
    }
  });
}

/**
 * 隨機生成未找到記憶的提示信息
 * @returns {string} 提示信息
 */
export function getRandomSearchFailMessage() {
  const messages = [
    "寶玉今日的念頭紛亂，難以捕捉。",
    "試著在不同的節氣尋找，或許會有不同收穫。",
    "有時不尋覓，反倒能有意外發現。",
    "夙世因緣，需待機緣成熟時顯現。",
    "寶玉的領悟與當前的節氣可能不相契合。"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

