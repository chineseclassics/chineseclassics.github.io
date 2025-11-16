/**
 * DOM 元素管理器
 * 統一管理所有 DOM 元素引用，避免重複查詢
 */

let elementsCache = null;

/**
 * 初始化並獲取所有 DOM 元素引用
 * @returns {Object} 包含所有 DOM 元素的對象
 */
export function initElements() {
  if (elementsCache) {
    return elementsCache;
  }

  elementsCache = {
    // 基本狀態顯示
    gardenGrid: document.getElementById('garden-grid'),
    cycleCount: document.getElementById('cycle-count'),
    jieqiValue: document.getElementById('jieqi-value'),
    tearCount: document.getElementById('tear-count'),
    stoneCount: document.getElementById('stone-count'),
    memoryCount: document.getElementById('memory-count'),
    actionPointsCount: document.getElementById('action-points-count'),
    cycleProgressBar: document.getElementById('cycle-progress-bar'),
    
    // 計數器
    flowerCount: document.getElementById('flower-count'),
    birdCount: document.getElementById('bird-count'),
    collectedMemoryCount: document.getElementById('collected-memory-count'),
    collectedTearCount: document.getElementById('collected-tear-count'),
    
    // 列表容器
    flowersList: document.getElementById('flowers-list'),
    birdsList: document.getElementById('birds-list'),
    memoriesList: document.getElementById('memories-list'),
    tearsList: document.getElementById('tears-list'),
    
    // 指示器和按鈕
    jieqiIndicator: document.getElementById('jieqi-indicator'),
    jieqiLabel: document.getElementById('jieqi-label'),
    advanceJieqiBtn: document.getElementById('advance-jieqi'),
    searchMemoriesBtn: document.getElementById('search-memories'), // 尋找記憶按鈕
    actionsPanel: document.getElementById('actions-panel'),
    
    // 面板幫助按鈕
    actionsHelp: document.getElementById('actions-help'),
    flowersHelp: document.getElementById('flowers-help'),
    tearsHelp: document.getElementById('tears-help'),
    birdsHelp: document.getElementById('birds-help'),
    memoriesHelp: document.getElementById('memories-help'),
    
    // 對話框元素
    dialogOverlay: document.getElementById('dialog-overlay'),
    dialog: document.getElementById('dialog'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogContent: document.getElementById('dialog-content'),
    dialogClose: document.getElementById('dialog-close'),
    dialogCancel: document.getElementById('dialog-cancel'),
    dialogConfirm: document.getElementById('dialog-confirm'),
    
    // 記憶閃回對話框
    memoryDialogOverlay: document.getElementById('memory-dialog-overlay'),
    memoryDialog: document.getElementById('memory-dialog'),
    memoryDialogTitle: document.getElementById('memory-dialog-title'),
    memoryDialogContent: document.getElementById('memory-dialog-content'),
    memoryDialogClose: document.getElementById('memory-dialog-close'),
    
    // 白茫茫效果
    whiteFade: document.getElementById('white-fade'),
    
    // 教學系統
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialHighlight: document.getElementById('tutorial-highlight'),
    tutorialTooltip: document.getElementById('tutorial-tooltip'),
    tutorialTitle: document.getElementById('tutorial-title-text'),
    tutorialContent: document.getElementById('tutorial-tooltip-content'),
    tutorialProgress: document.getElementById('tutorial-progress'),
    tutorialNext: document.getElementById('tutorial-next'),
    tutorialSkip: document.getElementById('tutorial-skip'),
    
    // 提示系統
    hintContainer: document.getElementById('hint-container'),
    
    // 主選單
    mainMenu: document.getElementById('main-menu'),
    menuToggle: document.getElementById('menu-toggle'),
    menuTutorial: document.getElementById('menu-tutorial'),
    menuTargets: document.getElementById('menu-targets'),
    menuRestart: document.getElementById('menu-restart'),
    
    // 推薦行動氣泡
    actionSuggestion: document.getElementById('action-suggestion'),
    bubbleClose: document.getElementById('bubble-close')
  };

  return elementsCache;
}

/**
 * 獲取已初始化的元素對象
 * @returns {Object} 元素對象
 */
export function getElements() {
  if (!elementsCache) {
    return initElements();
  }
  return elementsCache;
}

/**
 * 重置元素緩存（用於測試或重新初始化）
 */
export function resetElements() {
  elementsCache = null;
}

