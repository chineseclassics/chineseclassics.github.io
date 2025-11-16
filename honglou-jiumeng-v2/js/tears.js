// 絳珠淚系統

export class TearSystem {
    constructor(state) {
        this.state = state;
        this.tearTypes = this.initTearTypes();
    }

    init() {
        // 初始化淚水類型
    }

    initTearTypes() {
        return {
            '孤弱之淚': {
                id: '孤弱之淚',
                name: '初到賈府的孤弱淚',
                description: '初入榮府、寄人籬下的孤弱與不安',
                scene: '第 3 回',
                unlocked: true // MVP 初始解鎖
            },
            '葬花之淚': {
                id: '葬花之淚',
                name: '葬花身世之淚',
                description: '葬花吟、春殘花落的感傷',
                scene: '第 27 回',
                unlocked: false
            },
            '醋意之淚': {
                id: '醋意之淚',
                name: '醋意與誤會之淚',
                description: '寶黛爭吵、小性兒的醋意',
                scene: '第 20 回',
                unlocked: false
            }
        };
    }

    getTearType(typeId) {
        return this.tearTypes[typeId] || null;
    }

    getAllTearTypes() {
        return Object.values(this.tearTypes);
    }

    getAvailableTears() {
        // 返回玩家已解鎖且有庫存的淚水類型
        return Object.values(this.tearTypes)
            .filter(type => type.unlocked && this.state.getTearCount(type.id) > 0)
            .map(type => type.id);
    }

    unlockTearType(typeId) {
        if (this.tearTypes[typeId]) {
            this.tearTypes[typeId].unlocked = true;
            return true;
        }
        return false;
    }

    isTearTypeUnlocked(typeId) {
        return this.tearTypes[typeId]?.unlocked || false;
    }
}

