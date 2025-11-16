// 園林建築系統模組
// 負責 5×5 格子地圖和建築解鎖邏輯

/**
 * 建築管理類
 */
export class GardenSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.GRID_SIZE = 5;  // 5×5 格子
    }
    
    /**
     * 初始化建築數據
     */
    initializeBuildings(buildingsData) {
        const currentState = this.gameState.getState();
        const existingBuildings = currentState.buildings || [];
        const existingMap = new Map(existingBuildings.map(b => [b.id, b]));
        
        // 合併新數據和現有狀態
        const mergedBuildings = buildingsData.map(building => {
            const existing = existingMap.get(building.id);
            if (existing) {
                return { ...building, unlocked: existing.unlocked };
            }
            return { ...building, unlocked: false };
        });
        
        this.gameState.updateState({ buildings: mergedBuildings });
    }
    
    /**
     * 獲取所有建築
     */
    getAllBuildings() {
        return this.gameState.getState().buildings || [];
    }
    
    /**
     * 根據 ID 獲取建築
     */
    getBuildingById(id) {
        const buildings = this.getAllBuildings();
        return buildings.find(b => b.id === id);
    }
    
    /**
     * 解鎖建築
     * @param {string} id - 建築 ID
     * @param {number} stoneCost - 所需靈石數量
     * @returns {boolean} - 是否成功解鎖
     */
    unlockBuilding(id, stoneCost) {
        // 檢查建築是否已解鎖
        const building = this.getBuildingById(id);
        if (building && building.unlocked) {
            return false;
        }
        
        // 嘗試消耗靈石
        if (!this.gameState.consumeStones(stoneCost)) {
            return false;
        }
        
        // 解鎖建築
        const buildings = this.getAllBuildings();
        const updatedBuildings = buildings.map(b => 
            b.id === id ? { ...b, unlocked: true } : b
        );
        
        this.gameState.updateState({ buildings: updatedBuildings });
        
        return true;
    }
    
    /**
     * 獲取地圖格子座標
     */
    getGridPosition(x, y) {
        if (x < 0 || x >= this.GRID_SIZE || y < 0 || y >= this.GRID_SIZE) {
            return null;
        }
        return { x, y };
    }
}


