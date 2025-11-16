// 紅樓舊夢 v2 - 主入口文件
// 整合所有模組並初始化遊戲

import { GameState } from './state.js';
import { SeasonalCycle } from './seasons.js';
import { MemorySystem } from './memories.js';
import { GardenSystem } from './garden.js';
import { FlowerSystem } from './flowers.js';
import { UIManager } from './ui.js';

/**
 * 遊戲主類
 */
class Game {
    constructor() {
        // 初始化遊戲狀態
        this.gameState = new GameState();
        
        // 初始化各系統
        this.seasonalCycle = new SeasonalCycle(this.gameState);
        this.memorySystem = new MemorySystem(this.gameState);
        this.gardenSystem = new GardenSystem(this.gameState);
        this.flowerSystem = new FlowerSystem(this.gameState);
        this.uiManager = new UIManager(
            this.gameState,
            this.seasonalCycle,
            this.memorySystem,
            this.gardenSystem,
            this.flowerSystem,
            this
        );
    }
    
    /**
     * 初始化遊戲
     */
    async init() {
        // 初始化 UI 元素引用
        this.uiManager.initElements();
        
        // 加載數據文件
        await this.loadData();
        
        // 設置事件監聽器
        this.setupEventListeners();
        
        // 更新 UI
        this.uiManager.updateAll();
        
        // 添加初始日誌
        const state = this.gameState.getState();
        this.uiManager.addLog(`遊戲開始！當前節氣：${state.seasonalCycleName}`);
    }
    
    /**
     * 開始答題
     * @param {string} memoryId - 記憶 ID
     */
    startQuiz(memoryId) {
        const memory = this.memorySystem.startQuiz(memoryId);
        if (!memory) {
            this.uiManager.addLog('無法開始答題：記憶不存在或已解鎖');
            return;
        }
        
        // 顯示答題模態框
        this.uiManager.showQuestionModal(memory);
        
        // 顯示第一題
        this.showCurrentQuestion();
        
        // 開始計時器
        this.startQuestionTimer();
    }
    
    /**
     * 顯示當前題目
     */
    showCurrentQuestion() {
        const question = this.memorySystem.getCurrentQuestion();
        const progress = this.memorySystem.getQuizProgress();
        const state = this.gameState.getState();
        
        if (!question || !progress) {
            return;
        }
        
        // 更新 UI
        this.uiManager.updateQuestionUI(
            question,
            progress,
            state.timeRemaining,
            state.errorCount
        );
        
        // 設置選項點擊事件
        this.setupOptionClickHandlers();
    }
    
    /**
     * 設置選項點擊事件處理器
     */
    setupOptionClickHandlers() {
        const optionsContainer = this.uiManager.elements.questionOptions;
        if (!optionsContainer) {
            return;
        }
        
        // 移除舊的事件監聽器
        const oldButtons = optionsContainer.querySelectorAll('.option-btn');
        oldButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        // 添加新的事件監聽器
        const buttons = optionsContainer.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedIndex = parseInt(btn.dataset.index);
                this.handleAnswerSubmit(selectedIndex);
            });
        });
    }
    
    /**
     * 處理答案提交
     * @param {number} selectedIndex - 選中的選項索引
     */
    handleAnswerSubmit(selectedIndex) {
        // 停止計時器
        this.memorySystem.stopTimer();
        
        const state = this.gameState.getState();
        const timeUsed = 30 - state.timeRemaining;
        
        // 提交答案
        const result = this.memorySystem.submitAnswer(selectedIndex);
        
        if (result.success) {
            if (result.completed) {
                // 完成所有題目
                const memory = result.memory;
                const resourceType = memory.type;
                this.uiManager.showQuizComplete(memory, result.reward, resourceType);
                this.uiManager.addLog(`解鎖記憶：${memory.name}，獲得 ${result.reward} 顆${resourceType === 'pearl' ? '絳珠' : '靈石'}`, 'success');
                this.uiManager.updateAll();
                this.checkNextCycle();
            } else {
                // 進入下一題
                this.uiManager.showQuestionResult(
                    true,
                    `答對了！獲得 ${result.reward.finalReward} 資源`,
                    result.reward
                );
                
                // 1.5秒後顯示下一題
                setTimeout(() => {
                    this.showCurrentQuestion();
                    this.startQuestionTimer();
                }, 1500);
            }
        } else {
            // 答錯了
            const memory = state.currentMemory;
            const penalty = this.memorySystem.getErrorPenalty(result.errorCount);
            const message = `答錯了，建議重新閱讀第 ${memory.chapter} 回原文。當前可獲得 ${(penalty * 100).toFixed(0)}% 資源`;
            
            this.uiManager.showQuestionResult(false, message);
            
            // 重新開始計時器（重試）
            setTimeout(() => {
                this.gameState.updateState({ timeRemaining: 30 });
                this.startQuestionTimer();
            }, 1500);
        }
    }
    
    /**
     * 開始答題計時器
     */
    startQuestionTimer() {
        this.memorySystem.startTimer(
            (timeRemaining) => {
                // 每秒更新時間顯示和資源預覽
                const state = this.gameState.getState();
                if (this.uiManager.elements.timerDisplay) {
                    this.uiManager.elements.timerDisplay.textContent = timeRemaining;
                }
                
                // 實時更新資源預覽
                const question = this.memorySystem.getCurrentQuestion();
                const progress = this.memorySystem.getQuizProgress();
                if (question && progress && state.currentMemory) {
                    this.uiManager.updateResourcePreview(
                        state.currentMemory,
                        timeRemaining,
                        state.errorCount
                    );
                }
            },
            () => {
                // 超時處理
                const state = this.gameState.getState();
                const memory = state.currentMemory;
                this.uiManager.showQuestionResult(
                    false,
                    `時間到！該題目無法獲得資源。建議重新閱讀第 ${memory.chapter} 回原文`
                );
                
                // 超時後可以繼續下一題（但該題資源為0）
                setTimeout(() => {
                    // 強制進入下一題（資源為0）
                    const question = this.memorySystem.getCurrentQuestion();
                    if (question) {
                        // 還有題目，繼續
                        const progress = this.memorySystem.getQuizProgress();
                        if (progress.current < progress.total) {
                            // 記錄0資源獎勵
                            const rewards = [...state.questionRewards, {
                                baseReward: Math.floor(memory.baseReward / 3),
                                timeCoefficient: 0,
                                errorCoefficient: this.memorySystem.getErrorPenalty(state.errorCount),
                                finalReward: 0,
                                timeUsed: 30,
                                errorCount: state.errorCount
                            }];
                            
                            const newIndex = state.currentQuestionIndex + 1;
                            if (newIndex >= memory.questions.length) {
                                // 完成所有題目
                                this.memorySystem.completeQuiz(memory, rewards);
                                const totalReward = this.memorySystem.sumRewards(rewards);
                                this.uiManager.showQuizComplete(memory, totalReward, memory.type);
                                this.uiManager.addLog(`解鎖記憶：${memory.name}，獲得 ${totalReward} 顆${memory.type === 'pearl' ? '絳珠' : '靈石'}`, 'success');
                                this.uiManager.updateAll();
                                this.checkNextCycle();
                            } else {
                                // 進入下一題
                                this.gameState.updateState({
                                    currentQuestionIndex: newIndex,
                                    timeRemaining: 30,
                                    errorCount: 0,
                                    questionStartTime: Date.now(),
                                    questionRewards: rewards
                                });
                                this.showCurrentQuestion();
                                this.startQuestionTimer();
                            }
                        }
                    }
                }, 2000);
            }
        );
    }
    
    /**
     * 加載數據文件
     */
    async loadData() {
        try {
            // 加載記憶數據
            const memoriesResponse = await fetch('data/memories.json');
            const memoriesData = await memoriesResponse.json();
            this.memorySystem.loadMemories(memoriesData);
            
            // 加載建築數據
            const buildingsResponse = await fetch('data/buildings.json');
            const buildingsData = await buildingsResponse.json();
            this.gardenSystem.initializeBuildings(buildingsData);
            
            // 加載花魂數據
            const flowersResponse = await fetch('data/flowers.json');
            const flowersData = await flowersResponse.json();
            this.flowerSystem.initializeFlowers(flowersData);
        } catch (error) {
            console.error('加載數據失敗：', error);
            this.uiManager.addLog('加載數據失敗，請刷新頁面重試');
        }
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        const elements = this.uiManager.elements;
        
        // 解鎖建築按鈕
        if (elements.unlockBuilding) {
            elements.unlockBuilding.addEventListener('click', () => {
                this.handleUnlockBuilding();
            });
        }
        
        // 種植花魂按鈕
        if (elements.plantFlower) {
            elements.plantFlower.addEventListener('click', () => {
                this.handlePlantFlower();
            });
        }
        
        // 澆灌花魂按鈕
        if (elements.waterFlower) {
            elements.waterFlower.addEventListener('click', () => {
                this.handleWaterFlower();
            });
        }
        
        // 下一節氣按鈕
        if (elements.nextCycleBtn) {
            elements.nextCycleBtn.addEventListener('click', () => {
                this.handleNextCycle();
            });
        }
        
        // 答題模態框關閉按鈕
        if (elements.closeModal) {
            elements.closeModal.addEventListener('click', () => {
                this.cancelQuiz();
            });
        }
        
        // 監聽開始答題事件
        document.addEventListener('startQuiz', (event) => {
            this.startQuiz(event.detail.memoryId);
        });
    }
    
    /**
     * 取消答題
     */
    cancelQuiz() {
        this.memorySystem.cancelQuiz();
        this.uiManager.hideQuestionModal();
    }
    
    /**
     * 處理解鎖建築
     */
    handleUnlockBuilding() {
        const building = this.gardenSystem.getBuildingById('xiaoxiang_guan');
        if (!building) {
            return;
        }
        
        const success = this.gardenSystem.unlockBuilding(
            'xiaoxiang_guan',
            building.stoneCost
        );
        
        if (success) {
            this.uiManager.addLog(`解鎖建築：${building.name}，可以在這裡種植花魂`);
            this.uiManager.updateAll();
            this.checkNextCycle();
        } else {
            this.uiManager.addLog(`解鎖失敗：靈石不足（需要 20，當前：${this.gameState.getState().stones}）`);
        }
    }
    
    /**
     * 處理種植花魂
     */
    handlePlantFlower() {
        // 檢查行動力
        const actionPointsStatus = this.seasonalCycle.getActionPointsStatus();
        if (actionPointsStatus.current < 2) {
            this.uiManager.addLog('行動力不足，無法種植花魂');
            return;
        }
        
        // 檢查建築是否已解鎖
        const building = this.gardenSystem.getBuildingById('xiaoxiang_guan');
        if (!building || !building.unlocked) {
            this.uiManager.addLog('請先解鎖瀟湘館');
            return;
        }
        
        // 檢查是否已有花魂
        const existingFlower = this.flowerSystem.getFlowerByBuildingId('xiaoxiang_guan');
        if (existingFlower) {
            this.uiManager.addLog('該建築已有花魂');
            return;
        }
        
        // 消耗行動力並種植
        const success = this.seasonalCycle.consumeActionPoints(2);
        if (success) {
            const flowerPlanted = this.flowerSystem.plantFlower(
                'daiyu_flower',
                'xiaoxiang_guan'
            );
            
            if (flowerPlanted) {
                this.uiManager.addLog('種植花魂：黛玉芙蓉魂（Lv0），可以開始澆灌了');
                this.uiManager.updateAll();
                this.checkNextCycle();
            } else {
                this.uiManager.addLog('種植失敗：未知錯誤');
            }
        } else {
            this.uiManager.addLog('種植失敗：行動力不足');
        }
    }
    
    /**
     * 處理澆灌花魂
     */
    handleWaterFlower() {
        const state = this.gameState.getState();
        const actionPointsStatus = this.seasonalCycle.getActionPointsStatus();
        
        // 檢查行動力
        if (actionPointsStatus.current < 1) {
            this.uiManager.addLog('行動力不足，無法澆灌花魂');
            return;
        }
        
        // 檢查絳珠
        if (state.pearls < 5) {
            this.uiManager.addLog('絳珠不足，無法澆灌花魂');
            return;
        }
        
        // 查找花魂（目前只有瀟湘館的黛玉花魂）
        const flower = this.flowerSystem.getFlowerByBuildingId('xiaoxiang_guan');
        if (!flower) {
            this.uiManager.addLog('請先種植花魂');
            return;
        }
        
        // 檢查花魂是否已達到最高等級
        if (flower.level >= 5) {
            this.uiManager.addLog('花魂已達到最高等級（Lv5），無法繼續澆灌');
            return;
        }
        
        // 先消耗行動力（如果後續失敗，行動力已經消耗，這是合理的）
        const actionSuccess = this.seasonalCycle.consumeActionPoints(1);
        if (!actionSuccess) {
            this.uiManager.addLog('行動力不足，無法澆灌花魂');
            return;
        }
        
        // 執行澆灌（內部會檢查並消耗絳珠）
        const result = this.flowerSystem.waterFlower(flower.id, 5);
        
        if (result.success) {
            this.uiManager.addLog(result.message);
            this.uiManager.updateAll();
            this.checkNextCycle();
        } else {
            // 如果澆灌失敗（通常是絳珠不足），行動力已經消耗，這是合理的
            // 因為玩家已經嘗試了這個行動
            this.uiManager.addLog(`澆灌失敗：${result.message}`);
            this.uiManager.updateAll();
        }
    }
    
    /**
     * 處理進入下一節氣
     */
    handleNextCycle() {
        if (!this.seasonalCycle.canAdvanceCycle()) {
            return;
        }
        
        const result = this.seasonalCycle.advanceToNextCycle();
        this.uiManager.addLog(
            `進入節氣：${result.name}，行動力恢復到 ${this.seasonalCycle.getActionPointsStatus().max} 點`
        );
        this.uiManager.updateAll();
    }
    
    /**
     * 檢查是否可以進入下一節氣
     */
    checkNextCycle() {
        const canAdvance = this.seasonalCycle.canAdvanceCycle();
        const elements = this.uiManager.elements;
        
        if (canAdvance && elements.nextCycleBtn) {
            elements.nextCycleBtn.classList.remove('hidden');
        } else if (elements.nextCycleBtn) {
            elements.nextCycleBtn.classList.add('hidden');
        }
    }
}

// 啟動遊戲
const game = new Game();
game.init();
