/**
 * 行動力系統
 * 管理遊戲中的行動力消耗和恢復
 */

import { gameData, featureFlags, config, actionCosts } from '../state.js';
import { getElements } from './elements.js';

/**
 * 初始化行動消耗標籤
 */
export function initializeActionCostLabels() {
  const elements = getElements();
  if (!elements.actionsPanel) return;
  
  const advanceCost = document.querySelector('#advance-jieqi .action-cost');
  if (advanceCost) {
    advanceCost.innerHTML = '<span class="cost-icon">⏱️</span>推進後重置行動力';
  }
  
  // 移除「尋找絳珠」和「尋找寶玉領悟」按鈕的成本標籤更新 - 記憶通過答題解鎖
}

/**
 * 更新行動力 UI 顯示
 * @param {Object} options - 選項
 * @param {boolean} options.animate - 是否顯示動畫
 */
export function updateActionPointsUI(options = {}) {
  if (!featureFlags.actionPoints) return;
  
  const elements = getElements();
  
  if (elements.actionPointsCount) {
    elements.actionPointsCount.textContent = `${gameData.currentActionPoints}/${gameData.actionPointsPerJieqi}`;
    elements.actionPointsCount.classList.toggle('ap-warning', gameData.currentActionPoints <= config.actionPointWarningThreshold);
    
    if (options.animate) {
      elements.actionPointsCount.classList.add('resource-change');
      setTimeout(() => elements.actionPointsCount?.classList.remove('resource-change'), 500);
    }
  }
  
  updateActionButtonsState();
}

/**
 * 更新行動按鈕狀態
 */
function updateActionButtonsState() {
  if (!featureFlags.actionPoints) return;
  
  const elements = getElements();
  
  // 移除「尋找絳珠」和「尋找寶玉領悟」按鈕的狀態更新 - 記憶通過答題解鎖
}

/**
 * 消耗行動力
 * @param {number} cost - 消耗的行動力點數
 * @param {string} contextLabel - 上下文標籤（用於錯誤提示）
 * @returns {boolean} 是否成功消耗
 */
export function consumeActionPoints(cost = 0, contextLabel) {
  if (!featureFlags.actionPoints || cost <= 0) {
    return true;
  }
  
  if (gameData.currentActionPoints < cost) {
    handleActionPointDepletion(contextLabel);
    return false;
  }
  
  gameData.currentActionPoints -= cost;
  updateActionPointsUI();
  
  return true;
}

/**
 * 消耗行動力（帶低行動力提示）
 * @param {number} cost - 消耗的行動力點數
 * @param {string} contextLabel - 上下文標籤（用於錯誤提示）
 * @returns {boolean} 是否成功消耗
 */
export function consumeActionPointsWithHint(cost = 0, contextLabel) {
  const result = consumeActionPoints(cost, contextLabel);
  
  if (result && gameData.currentActionPoints <= config.actionPointWarningThreshold) {
    // 動態導入提示系統（避免循環依賴）
    import('../ui/hints.js').then(({ showHint }) => {
      showHint('行動力將盡', '行動力即將耗盡，可先安排收尾或推進節氣', '⚠️');
    });
  }
  
  return result;
}

/**
 * 處理行動力耗盡
 * @param {string} contextLabel - 上下文標籤
 */
function handleActionPointDepletion(contextLabel) {
  if (!featureFlags.actionPoints) return;
  
  const elements = getElements();
  
  // 動態導入提示系統（避免循環依賴）
  import('../ui/hints.js').then(({ showHint }) => {
    const message = contextLabel ? `${contextLabel}需要行動力，請推進節氣恢復。` : '行動力不足，推進節氣可恢復。';
    showHint('行動力不足', message, '⏳');
  });
  
  if (elements.advanceJieqiBtn) {
    elements.advanceJieqiBtn.classList.add('recommended');
    setTimeout(() => elements.advanceJieqiBtn?.classList.remove('recommended'), 2000);
  }
}

/**
 * 重置行動力
 * @param {boolean} showToast - 是否顯示提示
 */
export function resetActionPoints(showToast = false) {
  if (!featureFlags.actionPoints) return;
  
  gameData.actionPointsPerJieqi = config.actionPointsPerJieqi;
  gameData.currentActionPoints = config.actionPointsPerJieqi;
  updateActionPointsUI({ animate: true });
  
  if (showToast) {
    // 動態導入提示系統（避免循環依賴）
    import('../ui/hints.js').then(({ showHint }) => {
      showHint('行動力恢復', '新節氣開始，行動力已回滿。', '✨');
    });
  }
}

