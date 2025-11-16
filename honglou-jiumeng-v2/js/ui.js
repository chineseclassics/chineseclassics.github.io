// UI 管理模組
// 負責狀態列、記憶列表、行動按鈕等 UI 更新

/**
 * UI 管理類
 */
export class UIManager {
    constructor(gameState, seasonalCycle, memorySystem, gardenSystem, flowerSystem, game) {
        this.gameState = gameState;
        this.seasonalCycle = seasonalCycle;
        this.memorySystem = memorySystem;
        this.gardenSystem = gardenSystem;
        this.flowerSystem = flowerSystem;
        this.game = game;
        
        // DOM 元素引用（在 init 中初始化）
        this.elements = {};
    }
    
    /**
     * 初始化 DOM 元素引用
     */
    initElements() {
        this.elements = {
            seasonalCycle: document.getElementById('seasonal-cycle'),
            actionPoints: document.getElementById('action-points'),
            pearlCount: document.getElementById('pearl-count'),
            stoneCount: document.getElementById('stone-count'),
            memoryList: document.getElementById('memory-list'),
            unlockBuilding: document.getElementById('unlock-building'),
            plantFlower: document.getElementById('plant-flower'),
            waterFlower: document.getElementById('water-flower'),
            nextCycleBtn: document.getElementById('next-cycle-btn'),
            gameLog: document.getElementById('game-log'),
            // 答題模態框元素
            questionModal: document.getElementById('question-modal'),
            questionTitle: document.getElementById('question-title'),
            closeModal: document.getElementById('close-modal'),
            timerDisplay: document.getElementById('timer-display'),
            errorCountDisplay: document.getElementById('error-count-display'),
            questionProgress: document.getElementById('question-progress'),
            currentQuestion: document.getElementById('current-question'),
            questionText: document.getElementById('question-text'),
            questionOptions: document.getElementById('question-options'),
            questionResult: document.getElementById('question-result'),
            resourcePreview: document.getElementById('resource-preview'),
            // 花魂和地圖元素
            flowerList: document.getElementById('flower-list'),
            gardenMap: document.getElementById('garden-map')
        };
    }
    
    /**
     * 更新狀態列
     */
    updateStatusBar() {
        const state = this.gameState.getState();
        const actionPointsStatus = this.seasonalCycle.getActionPointsStatus();
        
        if (this.elements.seasonalCycle) {
            this.elements.seasonalCycle.textContent = state.seasonalCycleName;
        }
        
        if (this.elements.actionPoints) {
            this.elements.actionPoints.textContent = actionPointsStatus.display;
        }
        
        if (this.elements.pearlCount) {
            this.elements.pearlCount.textContent = state.pearls;
        }
        
        if (this.elements.stoneCount) {
            this.elements.stoneCount.textContent = state.stones;
        }
    }
    
    /**
     * 更新記憶列表
     */
    updateMemoryList() {
        if (!this.elements.memoryList) {
            return;
        }
        
        const memories = this.memorySystem.getAllMemories();
        this.elements.memoryList.innerHTML = '';
        
        // 按回數排序
        const sortedMemories = [...memories].sort((a, b) => a.chapter - b.chapter);
        
        sortedMemories.forEach(memory => {
            const memoryItem = document.createElement('div');
            memoryItem.className = `memory-item ${memory.unlocked ? 'unlocked' : 'locked'}`;
            
            // 顯示資源類型標籤
            const resourceType = memory.type === 'pearl' ? '絳珠' : '靈石';
            const resourceBadge = `<span class="resource-badge ${memory.type}">${resourceType}</span>`;
            
            memoryItem.innerHTML = `
                <div class="memory-info">
                    <div class="memory-header">
                        <span class="memory-name">${memory.name}</span>
                        ${memory.unlocked ? '<span class="unlocked-badge">已解鎖</span>' : resourceBadge}
                    </div>
                    <span class="memory-chapter">第 ${memory.chapter} 回的記憶</span>
                    ${memory.unlocked ? '' : `<span class="memory-hint">基礎資源：${memory.baseReward} 顆${resourceType}</span>`}
                </div>
                <button class="memory-btn ${memory.unlocked ? 'disabled' : ''}" 
                        data-memory-id="${memory.id}" 
                        ${memory.unlocked ? 'disabled' : ''}>
                    ${memory.unlocked ? '已解鎖' : '答題解鎖'}
                </button>
            `;
            
            // 為未解鎖記憶添加點擊事件
            if (!memory.unlocked) {
                const btn = memoryItem.querySelector('.memory-btn');
                btn.addEventListener('click', () => {
                    // 觸發答題事件（由 main.js 處理）
                    const event = new CustomEvent('startQuiz', { detail: { memoryId: memory.id } });
                    document.dispatchEvent(event);
                });
            }
            
            this.elements.memoryList.appendChild(memoryItem);
        });
    }
    
    /**
     * 更新行動按鈕狀態
     */
    updateActionButtons() {
        const state = this.gameState.getState();
        const actionPointsStatus = this.seasonalCycle.getActionPointsStatus();
        
        // 檢查建築解鎖狀態
        const building = this.gardenSystem.getBuildingById('xiaoxiang_guan');
        const buildingUnlocked = building && building.unlocked;
        const flowerPlanted = this.flowerSystem.getFlowerByBuildingId('xiaoxiang_guan');
        
        // 解鎖建築按鈕（需要 20 靈石）
        if (this.elements.unlockBuilding) {
            const canUnlock = !buildingUnlocked && state.stones >= 20;
            this.elements.unlockBuilding.disabled = !canUnlock;
            this.elements.unlockBuilding.textContent = buildingUnlocked 
                ? '瀟湘館已解鎖' 
                : `解鎖建築（需要 20 靈石，當前：${state.stones}）`;
        }
        
        // 種植花魂按鈕（需要 2 點行動力，建築已解鎖，且未種植）
        if (this.elements.plantFlower) {
            const canPlant = buildingUnlocked && !flowerPlanted && actionPointsStatus.current >= 2;
            this.elements.plantFlower.disabled = !canPlant;
            if (buildingUnlocked && flowerPlanted) {
                this.elements.plantFlower.textContent = '已種植花魂';
            } else if (!buildingUnlocked) {
                this.elements.plantFlower.textContent = '請先解鎖建築';
            } else {
                this.elements.plantFlower.textContent = `種植花魂（消耗 2 行動力，當前：${actionPointsStatus.current}）`;
            }
        }
        
        // 澆灌花魂按鈕（需要 1 點行動力和 5 絳珠，且已種植）
        if (this.elements.waterFlower) {
            const canWater = flowerPlanted && 
                           actionPointsStatus.current >= 1 && 
                           state.pearls >= 5 &&
                           flowerPlanted.level < 5;
            this.elements.waterFlower.disabled = !canWater;
            
            if (!flowerPlanted) {
                this.elements.waterFlower.textContent = '請先種植花魂';
            } else if (flowerPlanted.level >= 5) {
                this.elements.waterFlower.textContent = '花魂已達最高等級';
            } else if (actionPointsStatus.current < 1) {
                this.elements.waterFlower.textContent = `澆灌花魂（行動力不足，需要 1，當前：${actionPointsStatus.current}）`;
            } else if (state.pearls < 5) {
                this.elements.waterFlower.textContent = `澆灌花魂（絳珠不足，需要 5，當前：${state.pearls}）`;
            } else {
                this.elements.waterFlower.textContent = `澆灌花魂（消耗 1 行動力，5 絳珠）`;
            }
        }
        
        // 下一節氣按鈕
        if (this.elements.nextCycleBtn) {
            const canAdvance = this.seasonalCycle.canAdvanceCycle();
            if (canAdvance) {
                this.elements.nextCycleBtn.classList.remove('hidden');
                this.elements.nextCycleBtn.textContent = '進入下一節氣';
            } else {
                this.elements.nextCycleBtn.classList.add('hidden');
            }
        }
    }
    
    /**
     * 更新花魂列表
     */
    updateFlowerList() {
        if (!this.elements.flowerList) {
            return;
        }
        
        const flowers = this.flowerSystem.getAllFlowers();
        // 已種植的花魂必須有 buildingId 和 level 屬性
        const plantedFlowers = flowers.filter(f => f.buildingId && typeof f.level === 'number');
        
        this.elements.flowerList.innerHTML = '';
        
        if (plantedFlowers.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = '尚未種植任何花魂';
            this.elements.flowerList.appendChild(emptyMsg);
            return;
        }
        
        plantedFlowers.forEach(flower => {
            const flowerInfo = this.flowerSystem.getFlowerInfo(flower.id);
            if (!flowerInfo) {
                return;
            }
            
            const flowerItem = document.createElement('div');
            flowerItem.className = 'flower-item';
            flowerItem.innerHTML = `
                <div class="flower-info">
                    <div class="flower-header">
                        <span class="flower-name">${flowerInfo.name || '未知花魂'}</span>
                        <span class="flower-level">Lv${flowerInfo.level}</span>
                    </div>
                    <div class="flower-character">${flowerInfo.character || ''}</div>
                    <div class="flower-growth">
                        <div class="growth-label">成長值：</div>
                        <div class="growth-progress">
                            <div class="growth-bar" style="width: ${flowerInfo.progressPercent}%"></div>
                            <span class="growth-text">${flowerInfo.progress}</span>
                        </div>
                    </div>
                </div>
            `;
            
            this.elements.flowerList.appendChild(flowerItem);
        });
    }
    
    /**
     * 更新地圖顯示
     */
    updateGardenMap() {
        if (!this.elements.gardenMap) {
            return;
        }
        
        const buildings = this.gardenSystem.getAllBuildings();
        const flowers = this.flowerSystem.getAllFlowers();
        // 已種植的花魂必須有 buildingId 和 level 屬性
        const plantedFlowers = flowers.filter(f => f.buildingId && typeof f.level === 'number');
        
        // 創建 5×5 格子
        this.elements.gardenMap.innerHTML = '';
        
        for (let y = 0; y < 5; y++) {
            const row = document.createElement('div');
            row.className = 'map-row';
            
            for (let x = 0; x < 5; x++) {
                const cell = document.createElement('div');
                cell.className = 'map-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // 查找該位置的建築
                const building = buildings.find(b => 
                    b.position && b.position.x === x && b.position.y === y
                );
                
                if (building) {
                    if (building.unlocked) {
                        cell.classList.add('building-unlocked');
                        cell.innerHTML = `<div class="building-name">${building.name}</div>`;
                        
                        // 查找該建築的花魂
                        const flower = plantedFlowers.find(f => f.buildingId === building.id);
                        if (flower) {
                            const flowerInfo = this.flowerSystem.getFlowerInfo(flower.id);
                            if (flowerInfo) {
                                cell.innerHTML += `<div class="flower-badge">${flowerInfo.name} Lv${flowerInfo.level}</div>`;
                            }
                        }
                    } else {
                        cell.classList.add('building-locked');
                        cell.innerHTML = `<div class="building-name locked">${building.name}（未解鎖）</div>`;
                    }
                }
                
                row.appendChild(cell);
            }
            
            this.elements.gardenMap.appendChild(row);
        }
    }
    
    /**
     * 更新所有 UI
     */
    updateAll() {
        this.updateStatusBar();
        this.updateMemoryList();
        this.updateActionButtons();
        this.updateFlowerList();
        this.updateGardenMap();
    }
    
    /**
     * 添加遊戲日誌
     * @param {string} message - 日誌消息
     * @param {string} type - 日誌類型（'info', 'success', 'warning', 'error'）
     */
    addLog(message, type = 'info') {
        if (!this.elements.gameLog) {
            return;
        }
        
        const state = this.gameState.getState();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        // 添加時間戳（可選）
        const timestamp = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-cycle">[${state.seasonalCycleName}]</span>
            <span class="log-message">${message}</span>
        `;
        
        this.elements.gameLog.appendChild(logEntry);
        this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
        
        // 限制日誌條目數量（保留最近 50 條）
        const logEntries = this.elements.gameLog.querySelectorAll('.log-entry');
        if (logEntries.length > 50) {
            logEntries[0].remove();
        }
    }
    
    /**
     * 顯示答題模態框
     * @param {Object} memory - 記憶對象
     */
    showQuestionModal(memory) {
        if (!this.elements.questionModal) {
            return;
        }
        
        this.elements.questionModal.classList.remove('hidden');
        
        // 更新標題
        if (this.elements.questionTitle) {
            this.elements.questionTitle.textContent = `第 ${memory.chapter} 回的記憶 - ${memory.name}`;
        }
    }
    
    /**
     * 隱藏答題模態框
     */
    hideQuestionModal() {
        if (this.elements.questionModal) {
            this.elements.questionModal.classList.add('hidden');
        }
        if (this.elements.questionResult) {
            this.elements.questionResult.classList.add('hidden');
        }
    }
    
    /**
     * 更新答題界面
     * @param {Object} question - 題目對象
     * @param {Object} progress - 進度對象 {current, total, memory}
     * @param {number} timeRemaining - 剩餘時間
     * @param {number} errorCount - 答錯次數
     */
    updateQuestionUI(question, progress, timeRemaining, errorCount) {
        // 更新進度
        if (this.elements.currentQuestion && this.elements.questionProgress) {
            this.elements.currentQuestion.textContent = progress.current;
            this.elements.questionProgress.querySelector('span').textContent = 
                `題目 ${progress.current} / ${progress.total}`;
        }
        
        // 更新時間
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = timeRemaining;
        }
        
        // 更新答錯次數
        if (this.elements.errorCountDisplay) {
            this.elements.errorCountDisplay.textContent = errorCount;
        }
        
        // 更新題目文字
        if (this.elements.questionText && question) {
            this.elements.questionText.textContent = question.question;
        }
        
        // 更新選項
        if (this.elements.questionOptions && question) {
            this.elements.questionOptions.innerHTML = '';
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('button');
                optionBtn.className = 'option-btn';
                optionBtn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
                optionBtn.dataset.index = index;
                this.elements.questionOptions.appendChild(optionBtn);
            });
        }
        
        // 更新資源預覽（實時計算）
        this.updateResourcePreview(progress.memory, timeRemaining, errorCount);
        
        // 隱藏結果
        if (this.elements.questionResult) {
            this.elements.questionResult.classList.add('hidden');
        }
    }
    
    /**
     * 更新資源預覽
     * @param {Object} memory - 記憶對象
     * @param {number} timeRemaining - 剩餘時間
     * @param {number} errorCount - 答錯次數
     */
    updateResourcePreview(memory, timeRemaining, errorCount) {
        if (!this.elements.resourcePreview || !memory) {
            return;
        }
        
        const timeUsed = 30 - timeRemaining;
        
        // 計算時間係數
        let timeCoefficient = 1.0;
        let timeStatus = '';
        if (timeUsed <= 10) {
            timeCoefficient = 1.1;
            timeStatus = '快速答對（+10%）';
        } else if (timeUsed <= 25) {
            timeCoefficient = 1.0;
            timeStatus = '正常速度（100%）';
        } else if (timeUsed <= 30) {
            timeCoefficient = 0.9;
            timeStatus = '較慢（-10%）';
        } else {
            timeCoefficient = 0;
            timeStatus = '超時（0%）';
        }
        
        // 計算答錯係數
        const errorCoefficient = this.memorySystem.getErrorPenalty(errorCount);
        const errorStatus = errorCount === 0 ? '無答錯（100%）' : 
                          `答錯 ${errorCount} 次（${(errorCoefficient * 100).toFixed(0)}%）`;
        
        // 計算當前題目的資源獎勵
        const baseReward = Math.floor(memory.baseReward / 3);
        const currentReward = Math.round(baseReward * timeCoefficient * errorCoefficient);
        
        // 計算已完成的題目資源總和
        const state = this.gameState.getState();
        const completedRewards = state.questionRewards || [];
        const completedTotal = completedRewards.reduce((sum, r) => sum + r.finalReward, 0);
        
        // 計算預估總資源
        const estimatedTotal = completedTotal + currentReward;
        const resourceName = memory.type === 'pearl' ? '絳珠' : '靈石';
        
        // 更新顯示
        this.elements.resourcePreview.innerHTML = `
            <div class="resource-preview-title">資源預覽</div>
            <div class="resource-preview-item">
                <span class="preview-label">當前題目：</span>
                <span class="preview-value">${currentReward} 顆${resourceName}</span>
            </div>
            <div class="resource-preview-item">
                <span class="preview-label">時間狀態：</span>
                <span class="preview-value">${timeStatus}</span>
            </div>
            <div class="resource-preview-item">
                <span class="preview-label">答錯狀態：</span>
                <span class="preview-value">${errorStatus}</span>
            </div>
            <div class="resource-preview-item">
                <span class="preview-label">已完成題目：</span>
                <span class="preview-value">${completedTotal} 顆${resourceName}</span>
            </div>
            <div class="resource-preview-total">
                <span class="preview-label">預估總資源：</span>
                <span class="preview-value highlight">${estimatedTotal} 顆${resourceName}</span>
            </div>
        `;
    }
    
    /**
     * 顯示答題結果
     * @param {boolean} isCorrect - 是否答對
     * @param {string} message - 結果消息
     * @param {Object} reward - 獎勵信息（可選）
     */
    showQuestionResult(isCorrect, message, reward = null) {
        if (!this.elements.questionResult) {
            return;
        }
        
        this.elements.questionResult.classList.remove('hidden');
        this.elements.questionResult.className = `question-result ${isCorrect ? 'correct' : 'error'}`;
        
        let resultHTML = `<div class="result-message">${message}</div>`;
        
        if (reward) {
            resultHTML += `<div class="reward-info">
                獲得資源：${reward.finalReward} 
                (時間係數：${(reward.timeCoefficient * 100).toFixed(0)}%, 
                 答錯係數：${(reward.errorCoefficient * 100).toFixed(0)}%)
            </div>`;
        }
        
        this.elements.questionResult.innerHTML = resultHTML;
    }
    
    /**
     * 顯示完成答題結果
     * @param {Object} memory - 記憶對象
     * @param {number} totalReward - 總資源獎勵
     * @param {string} resourceType - 資源類型（'pearl' 或 'stone'）
     */
    showQuizComplete(memory, totalReward, resourceType) {
        const resourceName = resourceType === 'pearl' ? '絳珠' : '靈石';
        const message = `記憶解鎖成功！獲得 ${totalReward} 顆${resourceName}`;
        
        if (this.elements.questionResult) {
            this.elements.questionResult.classList.remove('hidden');
            this.elements.questionResult.className = 'question-result complete';
            this.elements.questionResult.innerHTML = `
                <div class="result-message">${message}</div>
                <div class="complete-info">記憶「${memory.name}」已解鎖</div>
            `;
        }
        
        // 3秒後自動關閉
        setTimeout(() => {
            this.hideQuestionModal();
            this.updateAll();
        }, 3000);
    }
}

