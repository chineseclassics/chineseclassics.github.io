// 節氣循環系統模組
// 負責 24 節氣序列、行動力系統和節氣推進機制

/**
 * 24 節氣序列
 */
export const SEASONAL_CYCLES = [
    '立春', '雨水', '驚蟄', '春分', '清明', '穀雨',
    '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
    '立秋', '處暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];

/**
 * 每節氣的行動力點數
 */
export const ACTION_POINTS_PER_JIEQI = 4;

/**
 * 節氣系統類
 */
export class SeasonalCycle {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * 獲取當前節氣名稱
     */
    getCurrentSeasonalCycleName() {
        const cycleIndex = this.gameState.getState().seasonalCycle - 1;
        return SEASONAL_CYCLES[cycleIndex] || SEASONAL_CYCLES[0];
    }
    
    /**
     * 推進到下一個節氣
     */
    advanceToNextCycle() {
        const state = this.gameState.getState();
        let nextCycle = state.seasonalCycle + 1;
        
        // 如果超過 24，循環回到第 1 個
        if (nextCycle > SEASONAL_CYCLES.length) {
            nextCycle = 1;
        }
        
        const nextCycleName = SEASONAL_CYCLES[nextCycle - 1];
        
        this.gameState.updateState({
            seasonalCycle: nextCycle,
            seasonalCycleName: nextCycleName,
            actionPoints: ACTION_POINTS_PER_JIEQI  // 重置行動力
        });
        
        return {
            cycle: nextCycle,
            name: nextCycleName
        };
    }
    
    /**
     * 消耗行動力
     * @param {number} points - 要消耗的行動力點數
     * @returns {boolean} - 是否成功消耗
     */
    consumeActionPoints(points) {
        const state = this.gameState.getState();
        
        if (state.actionPoints < points) {
            return false;
        }
        
        this.gameState.updateState({
            actionPoints: state.actionPoints - points
        });
        
        return true;
    }
    
    /**
     * 檢查是否可以推進節氣
     * @param {boolean} requireAllMemoriesUnlocked - 是否需要所有記憶解鎖（可選）
     */
    canAdvanceCycle(requireAllMemoriesUnlocked = false) {
        const state = this.gameState.getState();
        
        // 行動力必須耗盡
        if (state.actionPoints > 0) {
            return false;
        }
        
        // 可選：檢查所有記憶是否解鎖
        if (requireAllMemoriesUnlocked) {
            const allUnlocked = state.memories.every(m => m.unlocked);
            if (!allUnlocked) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 獲取行動力狀態
     */
    getActionPointsStatus() {
        const state = this.gameState.getState();
        return {
            current: state.actionPoints,
            max: state.maxActionPoints,
            display: `${state.actionPoints} / ${state.maxActionPoints}`
        };
    }
}

