// 遊戲狀態管理

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        // 節氣系統
        this.seasons = [
            '立春', '雨水', '驚蟄', '春分', '清明', '穀雨',
            '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
            '立秋', '處暑', '白露', '秋分', '寒露', '霜降',
            '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
        ];
        this.currentSeasonIndex = 0;
        this.currentSeason = this.seasons[0];
        
        // 行動力
        this.maxActionPoints = 4;
        this.actionPoints = 4;
        
        // 資源
        this.spiritStones = 0;
        this.tears = {}; // { '孤弱之淚': 10, '葬花之淚': 0, ... }
        
        // 建築解鎖狀態
        this.buildings = {
            xiaoxiang_guan: { unlocked: false, cost: 50 }
        };
        
        // 已解鎖的記憶
        this.unlockedMemories = [];
    }

    // 節氣相關
    getCurrentSeason() {
        return this.currentSeason;
    }

    nextSeason() {
        this.currentSeasonIndex = (this.currentSeasonIndex + 1) % this.seasons.length;
        this.currentSeason = this.seasons[this.currentSeasonIndex];
        this.actionPoints = this.maxActionPoints; // 恢復行動力
    }

    // 行動力相關
    getActionPoints() {
        return this.actionPoints;
    }

    getMaxActionPoints() {
        return this.maxActionPoints;
    }

    consumeActionPoints(amount) {
        this.actionPoints = Math.max(0, this.actionPoints - amount);
    }

    hasActionPoints(amount) {
        return this.actionPoints >= amount;
    }

    // 靈石相關
    getSpiritStones() {
        return this.spiritStones;
    }

    addSpiritStones(amount) {
        this.spiritStones += amount;
    }

    consumeSpiritStones(amount) {
        if (this.spiritStones >= amount) {
            this.spiritStones -= amount;
            return true;
        }
        return false;
    }

    // 絳珠淚相關
    addTears(type, amount) {
        if (!this.tears[type]) {
            this.tears[type] = 0;
        }
        this.tears[type] += amount;
    }

    consumeTears(type, amount) {
        if (this.getTearCount(type) >= amount) {
            this.tears[type] -= amount;
            return true;
        }
        return false;
    }

    getTearCount(type) {
        return this.tears[type] || 0;
    }

    getAllTears() {
        return this.tears;
    }

    getTotalTears() {
        return Object.values(this.tears).reduce((sum, count) => sum + count, 0);
    }

    // 建築相關
    isBuildingUnlocked(buildingId) {
        return this.buildings[buildingId]?.unlocked || false;
    }

    unlockBuilding(buildingId) {
        if (this.buildings[buildingId]) {
            this.buildings[buildingId].unlocked = true;
            return true;
        }
        return false;
    }

    getBuildingCost(buildingId) {
        return this.buildings[buildingId]?.cost || 0;
    }

    // 記憶相關
    unlockMemory(memoryId) {
        if (!this.unlockedMemories.includes(memoryId)) {
            this.unlockedMemories.push(memoryId);
        }
    }

    isMemoryUnlocked(memoryId) {
        return this.unlockedMemories.includes(memoryId);
    }

    getUnlockedMemories() {
        return this.unlockedMemories;
    }
}

