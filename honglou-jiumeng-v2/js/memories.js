// 記憶系統

export class MemorySystem {
    constructor(state) {
        this.state = state;
        this.memories = this.initMemories();
    }

    init() {
        // 初始化記憶數據
    }

    initMemories() {
        return [
            {
                id: 'memory_daiyu_001',
                storyLineId: 'daiyu_main',
                orderIndex: 1,
                name: '初入榮府',
                scene: '第 3 回',
                type: 'tear',
                relatedCharacter: '林黛玉',
                unlocked: false,
                text: '且說黛玉自那日棄舟登岸時，便有榮國府打發了轎子並拉行李的車輛久候了...',
                reward: {
                    tearType: '孤弱之淚',
                    tearAmount: 5,
                    spiritStones: 5
                }
            },
            {
                id: 'memory_daiyu_002',
                storyLineId: 'daiyu_main',
                orderIndex: 2,
                name: '被拒門外',
                scene: '第 5 回',
                type: 'tear',
                relatedCharacter: '林黛玉',
                unlocked: false,
                unlockCondition: 'memory_daiyu_001', // 需要先解鎖記憶 1
                text: '...',
                reward: {
                    tearType: '孤弱之淚',
                    tearAmount: 10,
                    spiritStones: 8
                }
            },
            {
                id: 'memory_daiyu_003',
                storyLineId: 'daiyu_main',
                orderIndex: 3,
                name: '葬花吟',
                scene: '第 27 回',
                type: 'tear',
                relatedCharacter: '林黛玉',
                unlocked: false,
                unlockCondition: 'memory_daiyu_002',
                text: '花謝花飛花滿天，紅消香斷有誰憐？...',
                reward: {
                    tearType: '葬花之淚',
                    tearAmount: 15,
                    spiritStones: 15
                }
            }
        ];
    }

    searchMemory() {
        // 隨機搜尋記憶（簡化：返回第一個未解鎖的記憶）
        const availableMemories = this.memories.filter(m => {
            if (m.unlocked) return false;
            if (m.unlockCondition && !this.state.isMemoryUnlocked(m.unlockCondition)) {
                return false;
            }
            return true;
        });

        if (availableMemories.length === 0) {
            return null;
        }

        // 簡化：返回第一個可用記憶
        return availableMemories[0];
    }

    unlockMemory(memoryId) {
        const memory = this.memories.find(m => m.id === memoryId);
        if (!memory) {
            console.warn(`記憶 ${memoryId} 不存在`);
            return false;
        }

        if (memory.unlocked) {
            console.warn(`記憶 ${memoryId} 已解鎖`);
            return false;
        }

        // 檢查解鎖條件
        if (memory.unlockCondition && !this.state.isMemoryUnlocked(memory.unlockCondition)) {
            console.warn(`記憶 ${memoryId} 的解鎖條件未滿足`);
            return false;
        }

        // 解鎖記憶
        memory.unlocked = true;
        this.state.unlockMemory(memoryId);

        // 給予獎勵
        if (memory.reward) {
            if (memory.reward.tearType) {
                this.state.addTears(memory.reward.tearType, memory.reward.tearAmount);
            }
            if (memory.reward.spiritStones) {
                this.state.addSpiritStones(memory.reward.spiritStones);
            }
        }

        return true;
    }

    getMemory(memoryId) {
        return this.memories.find(m => m.id === memoryId) || null;
    }

    getUnlockedMemories() {
        return this.memories.filter(m => m.unlocked);
    }

    getAllMemories() {
        return this.memories;
    }

    getMemoriesByStoryLine(storyLineId) {
        return this.memories.filter(m => m.storyLineId === storyLineId);
    }
}

