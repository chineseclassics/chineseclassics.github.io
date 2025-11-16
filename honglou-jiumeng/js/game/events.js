/**
 * 事件系統模塊
 * 管理遊戲中的特殊事件觸發
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showMemoryDialog } from '../ui/dialogs.js';

/**
 * 檢查事件觸發
 */
export function checkEvents() {
  gameData.events.forEach(event => {
    if (!event.triggered && gameData.cycle === event.requiredCycle && gameData.jieqi[gameData.jieqiIndex].name === event.requiredJieqi) {
      event.triggered = true;
      
      // 警幻入夢事件
      if (event.id === 'warning-dream') {
        showMemoryDialog({
          title: event.title,
          content: `<div class="warning-dream">${event.content}</div>`
        });
      }
      
      // 白茫茫結局
      if (event.id === 'white-ground') {
        triggerWhiteFade();
      }
    }
  });
}

/**
 * 觸發白茫茫結局
 */
export function triggerWhiteFade() {
  const elements = getElements();
  if (!elements.whiteFade) return;
  
  elements.whiteFade.classList.add('active');
  
  // 5秒後顯示結束文字
  setTimeout(() => {
    // 計算最終成績
    const flowerCount = gameData.flowers.filter(f => f.level > 0).length;
    const maxFlowerLevel = Math.max(...gameData.flowers.map(f => f.level), 0);
    const memoryCount = gameData.memories.filter(m => m.collected).length;
    const tearCount = gameData.tears.filter(t => t.collected).length;
    const buildingCount = gameData.buildings.filter(b => b.built).length;
    
    // 根據成績決定結局
    let conclusionText = '';
    let titleText = '遊戲結束';
    
    if (flowerCount >= 3 && maxFlowerLevel >= 4 && memoryCount >= 15) {
      // 完美結局
      titleText = '圓滿結局';
      conclusionText = '你成功恢復了大觀園的風華，花魂們完全覺醒。神瑛與絳珠的前緣終得償還，世間情緣，緣來緣去，如是而已。';
    } else if (flowerCount >= 2 && maxFlowerLevel >= 3 && memoryCount >= 10) {
      // 良好結局
      titleText = '沉睡結局';
      conclusionText = '你喚醒了部分花魂，收集了許多記憶。雖未能完全恢復大觀園昔日榮光，但前世情債，已然清償大半。';
    } else {
      // 普通結局
      titleText = '散落結局';
      conclusionText = '時光流轉，終究難敵無常。花魂渺渺，記憶散落。紅塵一夢，終將醒來。';
    }
    
    showMemoryDialog({
      title: titleText,
      content: `<div style="text-align: center;">
        <p>${conclusionText}</p>
        <div class="poem" style="margin: 20px 0;">
          白茫茫大地一片真乾淨！
        </div>
        <p>你已經歷了 ${gameData.cycle} 輪輪迴，成就如下：</p>
        <div style="margin: 15px 0; text-align: left; display: inline-block;">
          <p>★ 喚醒花魂: ${flowerCount} 位 (最高等級: ${maxFlowerLevel})</p>
          <p>★ 收集記憶: ${memoryCount} 段</p>
          <p>★ 收集淚水: ${tearCount} 種</p>
          <p>★ 重建建築: ${buildingCount} 座</p>
        </div>
        <p style="margin-top: 20px; font-style: italic; color: #5D5CDE;">
          滿紙荒唐言，一把辛酸淚。都雲作者痴，誰解其中味？
        </p>
      </div>`
    });
    
    // 允許再次開始（動態導入避免循環依賴）
    import('../main.js').then((module) => {
      // 這裡需要訪問 resetGame 函數，但它是 main.js 的內部函數
      // 暫時通過全局或事件處理
      if (elements.memoryDialogClose) {
        elements.memoryDialogClose.textContent = '再次開始';
        elements.memoryDialogClose.onclick = () => {
          import('../ui/dialogs.js').then(({ hideMemoryDialog }) => {
            hideMemoryDialog();
            // 觸發重置事件或直接調用重置函數
            window.location.reload(); // 暫時使用刷新頁面
          });
        };
      }
    }).catch(() => {
      // 如果無法導入，使用刷新頁面
      if (elements.memoryDialogClose) {
        elements.memoryDialogClose.textContent = '再次開始';
        elements.memoryDialogClose.onclick = () => {
          window.location.reload();
        };
      }
    });
  }, 5000);
}

