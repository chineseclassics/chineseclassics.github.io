// 記憶系統模組
// 負責記憶數據結構、答題系統和資源獎勵計算

/**
 * 記憶管理類
 */
export class MemorySystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentTimer = null; // 當前答題計時器
    }
    
    /**
     * 加載記憶數據
     * @param {Array} memoriesData - 記憶數據數組
     */
    loadMemories(memoriesData) {
        // 如果狀態中已有記憶，保留解鎖狀態
        const currentState = this.gameState.getState();
        const existingMemories = currentState.memories || [];
        const existingMap = new Map(existingMemories.map(m => [m.id, m]));
        
        // 合併新數據和現有狀態
        const mergedMemories = memoriesData.map(memory => {
            const existing = existingMap.get(memory.id);
            if (existing) {
                // 保留解鎖狀態
                return { ...memory, unlocked: existing.unlocked };
            }
            return { ...memory, unlocked: false };
        });
        
        this.gameState.updateState({ memories: mergedMemories });
    }
    
    /**
     * 獲取所有記憶
     */
    getAllMemories() {
        return this.gameState.getState().memories;
    }
    
    /**
     * 根據 ID 獲取記憶
     */
    getMemoryById(id) {
        const memories = this.getAllMemories();
        return memories.find(m => m.id === id);
    }
    
    /**
     * 解鎖記憶
     */
    unlockMemory(id) {
        const memories = this.getAllMemories();
        const updatedMemories = memories.map(m => 
            m.id === id ? { ...m, unlocked: true } : m
        );
        this.gameState.updateState({ memories: updatedMemories });
    }
    
    /**
     * 獲取未解鎖的記憶
     */
    getUnlockedMemories() {
        return this.getAllMemories().filter(m => m.unlocked);
    }
    
    /**
     * 獲取已解鎖的記憶
     */
    getLockedMemories() {
        return this.getAllMemories().filter(m => !m.unlocked);
    }
    
    /**
     * 開始答題（不消耗行動力）
     * @param {string} memoryId - 記憶 ID
     * @returns {Object|null} 記憶對象或 null
     */
    startQuiz(memoryId) {
        const memory = this.getMemoryById(memoryId);
        if (!memory || memory.unlocked) {
            return null;
        }
        
        // 初始化答題狀態
        this.gameState.updateState({
            currentMemory: memory,
            currentQuestionIndex: 0,
            timeRemaining: 30,
            errorCount: 0,
            questionStartTime: Date.now(),
            questionRewards: []
        });
        
        return memory;
    }
    
    /**
     * 獲取當前題目
     */
    getCurrentQuestion() {
        const state = this.gameState.getState();
        if (!state.currentMemory || !state.currentMemory.questions) {
            return null;
        }
        
        const questions = state.currentMemory.questions;
        const index = state.currentQuestionIndex;
        
        if (index >= questions.length) {
            return null;
        }
        
        return questions[index];
    }
    
    /**
     * 獲取答題進度
     */
    getQuizProgress() {
        const state = this.gameState.getState();
        if (!state.currentMemory) {
            return null;
        }
        
        return {
            current: state.currentQuestionIndex + 1,
            total: state.currentMemory.questions.length,
            memory: state.currentMemory
        };
    }
    
    /**
     * 開始計時器
     * @param {Function} onTick - 每秒回調
     * @param {Function} onTimeout - 超時回調
     */
    startTimer(onTick, onTimeout) {
        this.stopTimer();
        
        const state = this.gameState.getState();
        let timeRemaining = state.timeRemaining;
        
        this.currentTimer = setInterval(() => {
            timeRemaining--;
            this.gameState.updateState({ timeRemaining });
            
            if (onTick) {
                onTick(timeRemaining);
            }
            
            if (timeRemaining <= 0) {
                this.stopTimer();
                if (onTimeout) {
                    onTimeout();
                }
            }
        }, 1000);
    }
    
    /**
     * 停止計時器
     */
    stopTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
    }
    
    /**
     * 提交答案
     * @param {number} selectedIndex - 選中的選項索引
     * @returns {Object} 答題結果
     */
    submitAnswer(selectedIndex) {
        const state = this.gameState.getState();
        const question = this.getCurrentQuestion();
        
        if (!question) {
            return { success: false, message: '沒有當前題目' };
        }
        
        const isCorrect = selectedIndex === question.correct;
        const timeUsed = 30 - state.timeRemaining;
        
        if (isCorrect) {
            // 答對了，計算資源獎勵
            const reward = this.calculateReward(state.currentMemory, timeUsed, state.errorCount);
            
            // 記錄獎勵
            const rewards = [...state.questionRewards, reward];
            const newIndex = state.currentQuestionIndex + 1;
            
            // 檢查是否完成所有題目
            const memory = state.currentMemory;
            if (newIndex >= memory.questions.length) {
                // 完成所有題目，解鎖記憶並獲得資源
                const totalReward = this.completeQuiz(memory, rewards);
                return {
                    success: true,
                    completed: true,
                    reward: totalReward,
                    memory: memory
                };
            } else {
                // 進入下一題
                this.gameState.updateState({
                    currentQuestionIndex: newIndex,
                    timeRemaining: 30,
                    errorCount: 0,
                    questionStartTime: Date.now(),
                    questionRewards: rewards
                });
                
                return {
                    success: true,
                    completed: false,
                    reward: reward,
                    nextQuestion: true
                };
            }
        } else {
            // 答錯了，增加答錯次數
            const newErrorCount = state.errorCount + 1;
            this.gameState.updateState({ errorCount: newErrorCount });
            
            return {
                success: false,
                errorCount: newErrorCount,
                penalty: this.getErrorPenalty(newErrorCount)
            };
        }
    }
    
    /**
     * 計算資源獎勵
     * @param {Object} memory - 記憶對象
     * @param {number} timeUsed - 使用的時間（秒）
     * @param {number} errorCount - 答錯次數
     * @returns {Object} 資源獎勵對象
     */
    calculateReward(memory, timeUsed, errorCount) {
        // 基礎資源 = 記憶基礎資源 / 3（每個題目）
        const baseReward = Math.floor(memory.baseReward / 3);
        
        // 時間係數
        let timeCoefficient = 1.0;
        if (timeUsed <= 10) {
            timeCoefficient = 1.1; // +10% 獎勵
        } else if (timeUsed <= 25) {
            timeCoefficient = 1.0; // 100% 資源
        } else if (timeUsed <= 30) {
            timeCoefficient = 0.9; // -10% 懲罰
        } else {
            timeCoefficient = 0; // 超時，無法獲得資源
        }
        
        // 答錯係數
        const errorCoefficient = this.getErrorPenalty(errorCount);
        
        // 最終資源 = 基礎資源 × 時間係數 × 答錯係數
        const finalReward = Math.round(baseReward * timeCoefficient * errorCoefficient);
        
        return {
            baseReward,
            timeCoefficient,
            errorCoefficient,
            finalReward,
            timeUsed,
            errorCount
        };
    }
    
    /**
     * 獲取答錯懲罰係數
     * @param {number} errorCount - 答錯次數
     * @returns {number} 懲罰係數
     */
    getErrorPenalty(errorCount) {
        if (errorCount === 0) return 1.0;      // 100%
        if (errorCount === 1) return 0.8;      // 80%
        if (errorCount === 2) return 0.6;      // 60%
        if (errorCount === 3) return 0.4;      // 40%
        return 0.2;                             // 20%（最低）
    }
    
    /**
     * 完成答題，解鎖記憶並獲得資源
     * @param {Object} memory - 記憶對象
     * @param {Array} rewards - 所有題目的獎勵列表
     */
    completeQuiz(memory, rewards) {
        // 解鎖記憶
        this.unlockMemory(memory.id);
        
        // 計算總資源
        const totalReward = this.sumRewards(rewards);
        
        // 根據記憶類型添加資源
        if (memory.type === 'pearl') {
            this.gameState.addPearls(totalReward);
        } else if (memory.type === 'stone') {
            this.gameState.addStones(totalReward);
        }
        
        // 清除答題狀態
        this.gameState.updateState({
            currentMemory: null,
            currentQuestionIndex: 0,
            timeRemaining: 30,
            errorCount: 0,
            questionStartTime: null,
            questionRewards: []
        });
        
        this.stopTimer();
        
        return totalReward;
    }
    
    /**
     * 計算總資源獎勵
     * @param {Array} rewards - 獎勵列表
     * @returns {number} 總資源
     */
    sumRewards(rewards) {
        return rewards.reduce((sum, reward) => sum + reward.finalReward, 0);
    }
    
    /**
     * 取消答題
     */
    cancelQuiz() {
        this.stopTimer();
        this.gameState.updateState({
            currentMemory: null,
            currentQuestionIndex: 0,
            timeRemaining: 30,
            errorCount: 0,
            questionStartTime: null,
            questionRewards: []
        });
    }
    
    /**
     * 獲取當前答題狀態
     */
    getQuizState() {
        return this.gameState.getState();
    }
}
