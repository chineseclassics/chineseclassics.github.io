/**
 * 教學系統模塊
 * 管理遊戲教學流程和步驟顯示
 */

import { gameData } from '../state.js';
import { getElements } from '../core/elements.js';
import { showHint } from './hints.js';

/**
 * 教學步驟配置
 */
const tutorialSteps = [
  // 步驟1: 歡迎
  {
    title: "歡迎來到紅樓舊夢",
    content: "你是神瑛侍者，回到大觀園尋找黛玉的淚水與記憶。讓我為你介紹遊戲的基本操作。",
    highlight: ".header",
    position: { top: "100px", left: "50%", transform: "translateX(-50%)" }
  },
  // 步驟2: 資源
  {
    title: "遊戲資源",
    content: "遊戲中有三種主要資源：<strong>絳珠</strong>(淚水)、<strong>靈石</strong>和<strong>記憶碎片</strong>。它們用於建造建築和培養花魂。",
    highlight: ".game-status",
    position: { top: "150px", left: "50%", transform: "translateX(-50%)" }
  },
  // 步驟3: 園林格子
  {
    title: "大觀園",
    content: "這是大觀園的主要區域。點擊空白格子可以建造建築或種植花魂。帶有🔒符號的格子需要解鎖。",
    highlight: ".garden-area",
    position: { top: "250px", right: "350px" }
  },
  // 步驟4: 行動面板
  {
    title: "行動面板",
    content: "<strong>推進節氣</strong>: 時間前進一步。<br><strong>尋找絳珠</strong>: 收集淚水資源。<br><strong>尋找寶玉領悟</strong>: 獲取靈石用於建造。",
    highlight: "#actions-panel",
    position: { top: "450px", left: "60%", width: "280px" }
  },
  // 步驟5: 建築和花魂
  {
    title: "建築與花魂",
    content: "首先需要建造建築，然後才能種植對應的花魂。花魂需要用淚水澆灌才能成長。",
    highlight: "#flowers-panel",
    position: { top: "350px", left: "75%" }
  },
  // 步驟6: 絳珠收集
  {
    title: "記憶解鎖",
    content: "點擊記憶列表中的未解鎖記憶，通過答題驗證解鎖記憶並獲得資源。答題不消耗行動力。",
    highlight: "#memories-panel",
    position: { top: "280px", left: "75%" }
  },
  // 步驟7: 節氣系統
  {
    title: "節氣與輪迴",
    content: "每24個節氣完成一個輪迴。不同季節對花魂生長有不同影響。特定節氣會觸發特殊事件。",
    highlight: ".jieqi-indicator",
    position: { top: "120px", right: "150px" }
  },
  // 步驟8: 開始遊戲
  {
    title: "開始您的還淚之旅",
    content: "現在，請先答題解鎖記憶獲得資源，然後建造一座建築，開始您的紅樓還淚之旅！",
    highlight: "#memories-panel",
    position: { top: "280px", left: "75%" }
  }
];

/**
 * 開始教學
 */
export function startTutorial() {
  // 如果已完成教學且沒有明確要求重新開始，直接返回
  if (gameData.tutorialCompleted && !gameData.tutorialRestart) {
    return;
  }
  
  // 重置教學步驟
  gameData.tutorialStep = 0;
  showTutorialStep(0);
}

/**
 * 下一步教學
 */
export function nextTutorialStep() {
  gameData.tutorialStep++;
  showTutorialStep(gameData.tutorialStep);
}

/**
 * 跳過教學
 */
export function skipTutorial() {
  gameData.tutorialCompleted = true;
  const elements = getElements();
  if (elements.tutorialOverlay) {
    elements.tutorialOverlay.classList.remove('active');
  }
  showHint('教學已跳過', '您可以通過左下角選單重新開始教學', '📚');
}

/**
 * 顯示教學步驟
 * @param {number} step - 步驟索引
 */
export function showTutorialStep(step) {
  const elements = getElements();
  
  // 檢查是否已完成教學
  if (step >= tutorialSteps.length) {
    gameData.tutorialCompleted = true;
    if (elements.tutorialOverlay) {
      elements.tutorialOverlay.classList.remove('active');
    }
    
    // 顯示第一個提示
    showHint('準備開始', '點擊記憶列表中的未解鎖記憶，通過答題獲得資源', '🧠');
    
    // 高亮記憶列表
    if (elements.memoriesList) {
      elements.memoriesList.style.border = '2px solid #5D5CDE';
      setTimeout(() => {
        if (elements.memoriesList) {
          elements.memoriesList.style.border = '';
        }
      }, 3000);
    }
    
    return;
  }
  
  const currentStep = tutorialSteps[step];
  
  // 激活教學覆蓋層
  if (elements.tutorialOverlay) {
    elements.tutorialOverlay.classList.add('active');
  }
  
  // 高亮目標元素
  if (elements.tutorialHighlight) {
    const targetElement = document.querySelector(currentStep.highlight);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      
      elements.tutorialHighlight.style.width = `${rect.width + 10}px`;
      elements.tutorialHighlight.style.height = `${rect.height + 10}px`;
      elements.tutorialHighlight.style.top = `${rect.top - 5}px`;
      elements.tutorialHighlight.style.left = `${rect.left - 5}px`;
    }
  }
  
  // 設置提示框位置和內容
  if (elements.tutorialTooltip) {
    for (const [key, value] of Object.entries(currentStep.position)) {
      elements.tutorialTooltip.style[key] = value;
    }
    
    if (elements.tutorialTitle) {
      elements.tutorialTitle.textContent = currentStep.title;
    }
    
    if (elements.tutorialContent) {
      elements.tutorialContent.innerHTML = currentStep.content;
    }
    
    if (elements.tutorialProgress) {
      elements.tutorialProgress.textContent = `${step + 1}/${tutorialSteps.length}`;
    }
    
    if (elements.tutorialNext) {
      elements.tutorialNext.textContent = step === tutorialSteps.length - 1 ? '完成' : '下一步';
    }
  }
}

