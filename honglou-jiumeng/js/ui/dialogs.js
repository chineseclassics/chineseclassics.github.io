/**
 * 對話框系統
 * 管理所有對話框的顯示和隱藏
 */

import { getElements } from '../core/elements.js';
import { showHint } from './hints.js';

/**
 * 顯示通用對話框
 * @param {Object} options - 對話框選項
 * @param {string} options.title - 標題
 * @param {string} options.content - 內容
 * @param {string} options.confirmText - 確認按鈕文字
 * @param {string} options.cancelText - 取消按鈕文字
 * @param {boolean} options.showCancel - 是否顯示取消按鈕
 * @param {boolean} options.hideButtons - 是否隱藏按鈕
 * @param {Function} options.onConfirm - 確認回調
 * @param {Function} options.onCancel - 取消回調
 */
export function showDialog(options) {
  const elements = getElements();
  
  try {
    if (!elements.dialogTitle || !elements.dialogContent || 
        !elements.dialogCancel || !elements.dialogConfirm || 
        !elements.dialogClose || !elements.dialogOverlay) {
      console.error("對話框元素未找到");
      return;
    }
    
    elements.dialogTitle.textContent = options.title || '對話';
    elements.dialogContent.innerHTML = options.content || '';
    
    if (options.hideButtons) {
      elements.dialogCancel.style.display = 'none';
      elements.dialogConfirm.style.display = 'none';
    } else {
      elements.dialogCancel.style.display = options.showCancel === false ? 'none' : 'block';
      elements.dialogConfirm.style.display = 'block';
      elements.dialogCancel.textContent = options.cancelText || '取消';
      elements.dialogConfirm.textContent = options.confirmText || '確認';
    }
    
    // 設置回調
    elements.dialogConfirm.onclick = options.onConfirm || hideDialog;
    elements.dialogCancel.onclick = options.onCancel || hideDialog;
    elements.dialogClose.onclick = hideDialog;
    
    // 打開對話框時的動畫效果
    elements.dialogOverlay.classList.add('active');
  } catch (error) {
    console.error("顯示對話框時出錯:", error);
    showHint('錯誤', '無法顯示對話框，請刷新頁面重試', '❌');
  }
}

/**
 * 隱藏通用對話框
 */
export function hideDialog() {
  const elements = getElements();
  
  try {
    if (elements.dialogOverlay) {
      elements.dialogOverlay.classList.remove('active');
    }
  } catch (error) {
    console.error("隱藏對話框時出錯:", error);
  }
}

/**
 * 顯示記憶閃回對話框
 * @param {Object} memory - 記憶對象
 * @param {string} memory.title - 標題
 * @param {string} memory.name - 名稱
 * @param {string} memory.content - 內容
 */
export function showMemoryDialog(memory) {
  if (!memory) return;
  
  const elements = getElements();
  
  try {
    // 安全檢查所有元素
    if (!elements.memoryDialogTitle || !elements.memoryDialogContent || 
        !elements.memoryDialogClose || !elements.memoryDialogOverlay) {
      console.error("記憶對話框元素未找到");
      return;
    }
    
    elements.memoryDialogTitle.textContent = memory.title || memory.name || '記憶閃回';
    elements.memoryDialogContent.innerHTML = memory.content || '';
    elements.memoryDialogClose.onclick = hideMemoryDialog;
    
    // 顯示對話框
    elements.memoryDialogOverlay.classList.add('active');
    
    // 安全地添加閃回動畫
    const gardenArea = document.querySelector('.garden-area');
    if (gardenArea) {
      gardenArea.classList.add('flashback');
      
      // 3秒後移除閃回動畫
      setTimeout(() => {
        if (gardenArea) {
          gardenArea.classList.remove('flashback');
        }
      }, 3000);
    }
  } catch (error) {
    console.error("顯示記憶對話框時出錯:", error);
    showHint('錯誤', '無法顯示記憶對話框', '❌');
  }
}

/**
 * 隱藏記憶閃回對話框
 */
export function hideMemoryDialog() {
  const elements = getElements();
  
  try {
    if (elements.memoryDialogOverlay) {
      elements.memoryDialogOverlay.classList.remove('active');
    }
  } catch (error) {
    console.error("隱藏記憶對話框時出錯:", error);
  }
}

/**
 * 顯示 RPG 風格對話框
 * @param {string[]} messages - 消息數組
 * @param {string} portrait - 頭像
 * @param {string} speaker - 說話者名稱
 * @param {Function} onComplete - 完成回調
 */
export function showRpgDialog(messages, portrait = "👸", speaker = "警幻仙子", onComplete = null) {
  const overlay = document.getElementById('rpg-dialog-overlay');
  const textElement = document.getElementById('rpg-text');
  const portraitElement = document.getElementById('rpg-portrait');
  const speakerElement = document.getElementById('rpg-speaker');
  
  if (!overlay || !textElement || !portraitElement || !speakerElement) {
    console.error("找不到RPG對話框必要元素");
    return;
  }
  
  // 設置角色頭像和名稱
  portraitElement.textContent = portrait;
  speakerElement.textContent = speaker;
  
  // 開始時清空文本
  textElement.textContent = '';
  
  // 顯示對話框
  overlay.classList.add('active');
  
  let currentMessageIndex = 0;
  let charIndex = 0;
  let currentMessage = messages[currentMessageIndex];
  let typing = true;
  
  // 打字機效果
  function typeWriter() {
    if (charIndex < currentMessage.length) {
      // 每次添加一個字符
      textElement.textContent += currentMessage.charAt(charIndex);
      charIndex++;
      setTimeout(typeWriter, 30); // 打字速度
    } else {
      typing = false; // 當前消息已打完
    }
  }
  
  // 開始第一條消息的打字效果
  typeWriter();
  
  // 處理點擊事件
  function handleClick() {
    if (typing) {
      // 如果正在打字，則立即顯示完整消息
      textElement.textContent = currentMessage;
      typing = false;
      charIndex = currentMessage.length;
    } else {
      // 已顯示完當前消息，進入下一條
      currentMessageIndex++;
      
      if (currentMessageIndex < messages.length) {
        // 還有下一條消息
        charIndex = 0;
        currentMessage = messages[currentMessageIndex];
        textElement.textContent = '';
        typing = true;
        typeWriter();
      } else {
        // 所有消息顯示完畢
        overlay.classList.remove('active');
        overlay.removeEventListener('click', handleClick);
        
        // 如果有回調函數，執行它
        if (typeof onComplete === 'function') {
          setTimeout(() => {
            onComplete();
          }, 300);
        }
      }
    }
  }
  
  // 添加點擊事件監聽器
  overlay.addEventListener('click', handleClick);
}

