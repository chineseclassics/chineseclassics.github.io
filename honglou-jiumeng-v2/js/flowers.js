// 花魂系統模組
// 負責花魂種植、等級、成長值和澆灌系統

/**
 * 計算升級所需成長值
 * @param {number} level - 當前等級
 * @returns {number} - 升級所需成長值
 */
function calculateGrowthToNext(level) {
    // Lv0→Lv1: 100, Lv1→Lv2: 150, Lv2→Lv3: 200, Lv3→Lv4: 250, Lv4→Lv5: 300
    return 100 + (level * 50);
}

/**
 * 每次澆灌增加的成長值
 */
export const GROWTH_PER_WATERING = 20;

/**
 * 澆灌消耗的絳珠數量
 */
export const PEARLS_PER_WATERING = 5;

/**
 * 花魂管理類
 */
export class FlowerSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * 初始化花魂數據
     * @param {Array} flowersData - 從 JSON 文件加載的花魂模板數據
     */
    initializeFlowers(flowersData) {
        const currentState = this.gameState.getState();
        const existingFlowers = currentState.flowers || [];
        const existingMap = new Map(existingFlowers.map(f => [f.id, f]));
        
        // 保存模板數據（用於後續種植時獲取 name、character）
        this.flowerTemplates = new Map(flowersData.map(f => [f.id, f]));
        
        // 合併新數據和現有狀態
        // 如果花魂已種植，保留實例數據（level、growth），但確保 name、character 來自模板
        const mergedFlowers = flowersData.map(flower => {
            const existing = existingMap.get(flower.id);
            if (existing) {
                // 已種植：保留實例數據，但確保基本信息來自模板
                return {
                    ...existing,
                    name: flower.name,
                    character: flower.character,
                    buildingId: existing.buildingId || flower.buildingId
                };
            }
            // 未種植：使用模板數據
            return flower;
        });
        
        this.gameState.updateState({ flowers: mergedFlowers });
    }
    
    /**
     * 獲取所有花魂
     */
    getAllFlowers() {
        return this.gameState.getState().flowers || [];
    }
    
    /**
     * 根據 ID 獲取花魂
     */
    getFlowerById(id) {
        const flowers = this.getAllFlowers();
        return flowers.find(f => f.id === id);
    }
    
    /**
     * 根據建築 ID 獲取花魂
     */
    getFlowerByBuildingId(buildingId) {
        const flowers = this.getAllFlowers();
        return flowers.find(f => f.buildingId === buildingId);
    }
    
    /**
     * 種植花魂
     * @param {string} flowerId - 花魂 ID
     * @param {string} buildingId - 建築 ID
     * @returns {boolean} - 是否成功種植
     */
    plantFlower(flowerId, buildingId) {
        const state = this.gameState.getState();
        
        // 檢查建築是否已解鎖
        const buildings = state.buildings || [];
        const building = buildings.find(b => b.id === buildingId);
        if (!building || !building.unlocked) {
            return false;
        }
        
        // 檢查該建築是否已有花魂
        const existingFlower = this.getFlowerByBuildingId(buildingId);
        if (existingFlower) {
            return false;
        }
        
        // 從模板數據中獲取花魂基本信息
        const template = this.flowerTemplates?.get(flowerId);
        
        // 更新現有花魂數據，添加種植信息
        const flowers = this.getAllFlowers();
        const updatedFlowers = flowers.map(f => {
            if (f.id === flowerId) {
                // 更新為已種植狀態
                return {
                    ...f,
                    name: template?.name || f.name || '',
                    character: template?.character || f.character || '',
                    buildingId: buildingId,
                    level: 0,
                    growth: 0,
                    growthToNext: calculateGrowthToNext(0)  // 初始升級所需成長值（100）
                };
            }
            return f;
        });
        
        this.gameState.updateState({
            flowers: updatedFlowers
        });
        
        return true;
    }
    
    /**
     * 獲取花魂等級信息
     */
    getFlowerLevelInfo(flowerId) {
        const flower = this.getFlowerById(flowerId);
        if (!flower) {
            return null;
        }
        
        return {
            level: flower.level,
            growth: flower.growth,
            growthToNext: flower.growthToNext,
            progress: `${flower.growth} / ${flower.growthToNext}`
        };
    }
    
    /**
     * 澆灌花魂
     * @param {string} flowerId - 花魂 ID
     * @param {number} pearlCost - 消耗的絳珠數量
     * @returns {Object} - {success: boolean, leveledUp: boolean, message: string}
     */
    waterFlower(flowerId, pearlCost = PEARLS_PER_WATERING) {
        const flower = this.getFlowerById(flowerId);
        if (!flower) {
            return {
                success: false,
                leveledUp: false,
                message: '花魂不存在'
            };
        }
        
        // 檢查絳珠是否足夠
        if (!this.gameState.consumePearls(pearlCost)) {
            return {
                success: false,
                leveledUp: false,
                message: '絳珠不足'
            };
        }
        
        // 增加成長值
        const newGrowth = flower.growth + GROWTH_PER_WATERING;
        const flowers = this.getAllFlowers();
        const updatedFlowers = flowers.map(f => {
            if (f.id === flowerId) {
                return {
                    ...f,
                    growth: newGrowth
                };
            }
            return f;
        });
        
        this.gameState.updateState({ flowers: updatedFlowers });
        
        // 檢查是否達到升級條件
        const updatedFlower = updatedFlowers.find(f => f.id === flowerId);
        const leveledUp = this.checkAndLevelUp(flowerId);
        
        return {
            success: true,
            leveledUp: leveledUp,
            message: leveledUp 
                ? `澆灌成功！成長值 +${GROWTH_PER_WATERING}，等級提升到 Lv${updatedFlower.level + 1}！`
                : `澆灌成功！成長值 +${GROWTH_PER_WATERING}（${updatedFlower.growth} / ${updatedFlower.growthToNext}）`
        };
    }
    
    /**
     * 檢查並升級花魂
     * @param {string} flowerId - 花魂 ID
     * @returns {boolean} - 是否升級成功
     */
    checkAndLevelUp(flowerId) {
        const flower = this.getFlowerById(flowerId);
        if (!flower) {
            return false;
        }
        
        // 檢查是否達到升級條件
        if (flower.growth >= flower.growthToNext && flower.level < 5) {
            const newLevel = flower.level + 1;
            const newGrowthToNext = calculateGrowthToNext(newLevel);
            
            // 升級：等級+1，成長值重置為超出部分（如果有）
            const remainingGrowth = flower.growth - flower.growthToNext;
            const flowers = this.getAllFlowers();
            const updatedFlowers = flowers.map(f => {
                if (f.id === flowerId) {
                    return {
                        ...f,
                        level: newLevel,
                        growth: Math.max(0, remainingGrowth),  // 重置為超出部分，但不為負
                        growthToNext: newGrowthToNext
                    };
                }
                return f;
            });
            
            this.gameState.updateState({ flowers: updatedFlowers });
            return true;
        }
        
        return false;
    }
    
    /**
     * 獲取花魂完整信息（用於 UI 顯示）
     * @param {string} flowerId - 花魂 ID
     * @returns {Object|null} - 花魂完整信息
     */
    getFlowerInfo(flowerId) {
        const flower = this.getFlowerById(flowerId);
        if (!flower) {
            return null;
        }
        
        return {
            id: flower.id,
            name: flower.name || '',
            character: flower.character || '',
            buildingId: flower.buildingId,
            level: flower.level,
            growth: flower.growth,
            growthToNext: flower.growthToNext,
            progress: `${flower.growth} / ${flower.growthToNext}`,
            progressPercent: Math.min(100, Math.floor((flower.growth / flower.growthToNext) * 100))
        };
    }
}

