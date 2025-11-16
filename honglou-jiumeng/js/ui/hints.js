/**
 * 提示系統
 * 管理遊戲中的提示消息顯示
 */

import { getElements } from '../core/elements.js';

/**
 * 顯示提示
 * @param {string} title - 提示標題
 * @param {string} message - 提示內容
 * @param {string} icon - 圖標
 */
export function showHint(title, message, icon = '💡') {
  const elements = getElements();
  if (!elements.hintContainer) return;
  
  const hintId = Date.now();
  const hintElement = document.createElement('div');
  hintElement.className = 'hint';
  hintElement.id = `hint-${hintId}`;
  hintElement.innerHTML = `
    <span class="hint-close">&times;</span>
    <div class="hint-title">
      <span class="hint-icon">${icon}</span>
      ${title}
    </div>
    <div class="hint-content">${message}</div>
    <div class="hint-progress"></div>
  `;
  
  elements.hintContainer.appendChild(hintElement);
  
  // 為提示添加關閉事件
  const closeBtn = hintElement.querySelector('.hint-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeHint(hintId);
    });
  }
  
  // 延遲顯示，添加動畫效果
  setTimeout(() => {
    hintElement.classList.add('show');
  }, 100);
  
  // 6秒後自動消失
  setTimeout(() => {
    removeHint(hintId);
  }, 6000);
}

/**
 * 移除提示
 * @param {number} hintId - 提示 ID
 */
export function removeHint(hintId) {
  const hintElement = document.getElementById(`hint-${hintId}`);
  if (hintElement) {
    hintElement.classList.remove('show');
    setTimeout(() => {
      if (hintElement.parentNode) {
        hintElement.parentNode.removeChild(hintElement);
      }
    }, 500);
  }
}

