// 花魂系統

export class FlowerSystem {
    constructor(state) {
        this.state = state;
        this.flowers = {}; // { 'daiyu': { id, name, level, growth, ... } }
    }

    init() {
        // 初始化花魂數據結構
        this.flowers = {};
    }

    plantFlower(flowerId, buildingId) {
        if (this.flowers[flowerId]) {
            console.warn(`花魂 ${flowerId} 已存在`);
            return false;
        }

        const flowerData = this.getFlowerTemplate(flowerId);
        this.flowers[flowerId] = {
            ...flowerData,
            level: 0,
            growth: 0,
            growthToNext: 100,
            buildingId
        };

        return true;
    }

    getFlowerTemplate(flowerId) {
        const templates = {
            'daiyu': {
                id: 'daiyu',
                name: '黛玉芙蓉魂',
                character: '林黛玉',
                maxLevel: 5
            }
        };
        return templates[flowerId] || null;
    }

    waterFlower(flowerId, tearType) {
        const flower = this.flowers[flowerId];
        if (!flower) {
            console.warn(`花魂 ${flowerId} 不存在`);
            return false;
        }

        // 計算成長值（簡化：每滴淚 +20 成長值）
        const growthAmount = 20;
        flower.growth += growthAmount;

        // 檢查升級
        while (flower.growth >= flower.growthToNext && flower.level < flower.maxLevel) {
            flower.growth -= flower.growthToNext;
            flower.level++;
            flower.growthToNext = this.calculateGrowthToNext(flower.level);
            
            console.log(`${flower.name} 升級到 ${flower.level} 級！`);
        }

        return true;
    }

    calculateGrowthToNext(level) {
        // 升級所需成長值遞增：100, 150, 200, 250, 300
        return 100 + (level * 50);
    }

    getFlower(flowerId) {
        return this.flowers[flowerId] || null;
    }

    getCurrentFlower() {
        // 返回第一個花魂（MVP 簡化）
        const flowerIds = Object.keys(this.flowers);
        if (flowerIds.length > 0) {
            return this.flowers[flowerIds[0]];
        }
        return null;
    }

    hasFlower(flowerId) {
        return !!this.flowers[flowerId];
    }

    getAllFlowers() {
        return Object.values(this.flowers);
    }

    getFlowerGrowthProgress(flower) {
        if (!flower) return 0;
        return (flower.growth / flower.growthToNext) * 100;
    }
}

