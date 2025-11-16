// 遊戲狀態管理模組
// 負責遊戲狀態的結構、更新和持久化

/**
 * 遊戲狀態結構
 */
export const createInitialState = () => ({
    // 節氣系統
    seasonalCycle: 1,              // 當前節氣序號（1-24）
    seasonalCycleName: '立春',      // 當前節氣名稱
    actionPoints: 4,                // 當前行動力
    maxActionPoints: 4,             // 最大行動力（每節氣 4 點）
    
    // 資源系統
    pearls: 0,                      // 絳珠數量
    stones: 0,                     // 靈石數量
    
    // 記憶系統
    memories: [],                   // 記憶列表（從數據文件加載）
    
    // 園林建築系統
    buildings: [],                  // 建築列表
    
    // 花魂系統
    flowers: [],                    // 花魂列表
    
    // 答題狀態（臨時）
    currentMemory: null,            // 當前答題的記憶
    currentQuestionIndex: 0,        // 當前題目索引
    questionTimer: null,            // 答題計時器
    timeRemaining: 30,              // 剩餘時間
    errorCount: 0,                  // 答錯次數
    questionStartTime: null,        // 題目開始時間
    questionRewards: []             // 當前記憶的資源獎勵列表
});

/**
 * 狀態管理類
 */
export class GameState {
    constructor() {
        this.state = this.loadState() || createInitialState();
    }
    
    /**
     * 從 localStorage 加載狀態
     */
    loadState() {
        try {
            const saved = localStorage.getItem('honglou-jiumeng-state');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加載遊戲狀態失敗：', error);
        }
        return null;
    }
    
    /**
     * 保存狀態到 localStorage
     */
    saveState() {
        try {
            // 不保存臨時答題狀態
            const stateToSave = {
                ...this.state,
                currentMemory: null,
                currentQuestionIndex: 0,
                questionTimer: null,
                timeRemaining: 30,
                errorCount: 0,
                questionStartTime: null,
                questionRewards: []
            };
            localStorage.setItem('honglou-jiumeng-state', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('保存遊戲狀態失敗：', error);
        }
    }
    
    /**
     * 獲取狀態
     */
    getState() {
        return this.state;
    }
    
    /**
     * 更新狀態
     */
    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.saveState();
    }
    
    /**
     * 重置狀態（用於新遊戲）
     */
    resetState() {
        this.state = createInitialState();
        this.saveState();
    }
    
    /**
     * 添加絳珠
     * @param {number} amount - 絳珠數量
     */
    addPearls(amount) {
        const current = this.state.pearls || 0;
        this.updateState({ pearls: current + amount });
    }
    
    /**
     * 消耗絳珠
     * @param {number} amount - 絳珠數量
     * @returns {boolean} 是否成功消耗
     */
    consumePearls(amount) {
        const current = this.state.pearls || 0;
        if (current >= amount) {
            this.updateState({ pearls: current - amount });
            return true;
        }
        return false;
    }
    
    /**
     * 添加靈石
     * @param {number} amount - 靈石數量
     */
    addStones(amount) {
        const current = this.state.stones || 0;
        this.updateState({ stones: current + amount });
    }
    
    /**
     * 消耗靈石
     * @param {number} amount - 靈石數量
     * @returns {boolean} 是否成功消耗
     */
    consumeStones(amount) {
        const current = this.state.stones || 0;
        if (current >= amount) {
            this.updateState({ stones: current - amount });
            return true;
        }
        return false;
    }
}

