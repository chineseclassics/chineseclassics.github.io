// UI 更新系統

export class UI {
    constructor(state, game) {
        this.state = state;
        this.game = game;
    }

    init() {
        this.update();
    }

    update() {
        this.updateStatusBar();
        this.updateGarden();
        this.updateFlowerDetails();
        this.updateMemoryList();
        this.updateTearsDetails();
        this.updateActionButtons();
    }

    updateStatusBar() {
        // 節氣
        const seasonEl = document.getElementById('current-season');
        if (seasonEl) {
            seasonEl.textContent = this.state.getCurrentSeason();
        }

        // 行動力
        const actionPointsEl = document.getElementById('action-points');
        if (actionPointsEl) {
            const current = this.state.getActionPoints();
            const max = this.state.getMaxActionPoints();
            actionPointsEl.textContent = `${current} / ${max}`;
        }

        // 靈石
        const stonesEl = document.getElementById('spirit-stones');
        if (stonesEl) {
            stonesEl.textContent = this.state.getSpiritStones();
        }

        // 絳珠淚總量
        const tearsEl = document.getElementById('tears-total');
        if (tearsEl) {
            tearsEl.textContent = this.state.getTotalTears();
        }
    }

    updateTearsDetails() {
        const container = document.getElementById('tears-details');
        if (!container) return;

        const allTearTypes = this.game.tears.getAllTearTypes();
        const allTears = this.state.getAllTears();
        
        if (allTearTypes.length === 0) {
            container.innerHTML = '<p class="empty-message">尚未獲得淚水</p>';
            return;
        }

        let html = '';
        allTearTypes.forEach(tearType => {
            const count = allTears[tearType.id] || 0;
            const isUnlocked = tearType.unlocked;
            const className = isUnlocked ? 'unlocked' : 'locked';
            
            html += `
                <div class="tear-item ${className}">
                    <div>
                        <div class="tear-name">${tearType.name}</div>
                        ${isUnlocked && tearType.description ? `<div class="tear-description">${tearType.description}</div>` : ''}
                    </div>
                    <div class="tear-count">${isUnlocked ? count : '?'}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateGarden() {
        // 園林地圖的更新由 Garden 類處理
        // 這裡可以添加額外的 UI 更新邏輯
    }

    updateFlowerDetails() {
        const container = document.getElementById('flower-details');
        if (!container) return;

        const flower = this.game.flowers.getCurrentFlower();
        
        if (!flower) {
            container.innerHTML = '<p class="empty-message">尚未種植花魂</p>';
            return;
        }

        const growthProgress = this.game.flowers.getFlowerGrowthProgress(flower);
        
        container.innerHTML = `
            <div class="flower-card">
                <div class="flower-name">${flower.name}</div>
                <div class="flower-level">等級：${flower.level} / ${flower.maxLevel}</div>
                <div class="flower-growth">
                    <div class="flower-growth-bar" style="width: ${growthProgress}%"></div>
                </div>
                <div style="font-size: 0.85rem; color: #6b5d47;">
                    成長值：${flower.growth} / ${flower.growthToNext}
                </div>
            </div>
        `;
    }

    updateMemoryList() {
        const container = document.getElementById('memory-list');
        if (!container) return;

        const memories = this.game.memories.getAllMemories();
        
        if (memories.length === 0) {
            container.innerHTML = '<p class="empty-message">尚未收集記憶</p>';
            return;
        }

        let html = '';
        memories.forEach(memory => {
            const statusClass = memory.unlocked ? 'unlocked' : '';
            const statusText = memory.unlocked ? '已解鎖' : '未解鎖';
            
            html += `
                <div class="memory-item ${statusClass}">
                    <div class="memory-name">${memory.name}</div>
                    <div class="memory-status">${memory.scene} - ${statusText}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateActionButtons() {
        const actionPoints = this.state.getActionPoints();
        const hasFlower = this.game.flowers.getCurrentFlower() !== null;
        const hasBuilding = this.game.garden.isBuildingUnlocked('xiaoxiang_guan');
        const hasTears = this.state.getTotalTears() > 0;

        // 澆灌花魂
        const btnWater = document.getElementById('btn-water-flower');
        if (btnWater) {
            btnWater.disabled = !(actionPoints >= 1 && hasFlower && hasTears);
        }

        // 種植花魂
        const btnPlant = document.getElementById('btn-plant-flower');
        if (btnPlant) {
            btnPlant.disabled = !(actionPoints >= 2 && hasBuilding && !hasFlower);
        }

        // 搜尋記憶
        const btnSearch = document.getElementById('btn-search-memory');
        if (btnSearch) {
            btnSearch.disabled = actionPoints < 1;
        }

        // 進入下一節氣
        const btnNext = document.getElementById('btn-next-season');
        if (btnNext) {
            btnNext.disabled = false; // 隨時可以進入下一節氣
        }
    }
}

