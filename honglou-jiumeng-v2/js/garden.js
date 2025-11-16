// 園林地圖系統

export class Garden {
    constructor(state) {
        this.state = state;
        this.gridSize = 5;
        this.cells = [];
    }

    init() {
        this.createGrid();
    }

    createGrid() {
        const gridElement = document.getElementById('garden-grid');
        if (!gridElement) return;

        gridElement.innerHTML = '';
        this.cells = [];

        // 創建 5×5 格子
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.createCell(x, y);
                gridElement.appendChild(cell.element);
                this.cells.push(cell);
            }
        }

        // 設置瀟湘館位置（中心偏左）
        const xiaoxiangIndex = 2 * this.gridSize + 1; // (1, 2)
        if (this.cells[xiaoxiangIndex]) {
            this.cells[xiaoxiangIndex].buildingId = 'xiaoxiang_guan';
            this.cells[xiaoxiangIndex].element.dataset.buildingId = 'xiaoxiang_guan';
        }
    }

    createCell(x, y) {
        const element = document.createElement('div');
        element.className = 'garden-cell';
        element.dataset.x = x;
        element.dataset.y = y;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'garden-cell-name garden-cell-locked';
        nameSpan.textContent = '空白';
        element.appendChild(nameSpan);

        // 點擊事件：解鎖建築
        element.addEventListener('click', () => {
            this.handleCellClick(x, y);
        });

        // 懸停提示
        element.addEventListener('mouseenter', () => {
            if (this.cells.find(c => c.x === x && c.y === y)?.buildingId) {
                const buildingId = this.cells.find(c => c.x === x && c.y === y).buildingId;
                if (!this.state.isBuildingUnlocked(buildingId)) {
                    const cost = this.state.getBuildingCost(buildingId);
                    element.title = `點擊解鎖 ${this.getBuildingName(buildingId)}（需要 ${cost} 靈石）`;
                }
            }
        });

        return {
            element,
            x,
            y,
            buildingId: null,
            flowerId: null
        };
    }

    handleCellClick(x, y) {
        const cell = this.getCell(x, y);
        if (!cell) return;

        // 如果已有建築但未解鎖，嘗試解鎖
        if (cell.buildingId && !this.state.isBuildingUnlocked(cell.buildingId)) {
            this.tryUnlockBuilding(cell.buildingId);
            // 觸發 UI 更新（因為解鎖建築後可能需要更新按鈕狀態）
            if (window.game && window.game.ui) {
                window.game.ui.update();
            }
        } else if (cell.buildingId && this.state.isBuildingUnlocked(cell.buildingId)) {
            // 已解鎖的建築，顯示信息
            alert(`${this.getBuildingName(cell.buildingId)}已解鎖\n${cell.flowerId ? '已有花魂' : '可以種植花魂'}`);
        } else {
            // 空白格子
            alert('這是一個空白區域');
        }
    }

    tryUnlockBuilding(buildingId) {
        const cost = this.state.getBuildingCost(buildingId);
        
        if (this.state.getSpiritStones() < cost) {
            alert(`需要 ${cost} 靈石才能解鎖！`);
            return false;
        }

        if (this.state.consumeSpiritStones(cost)) {
            this.state.unlockBuilding(buildingId);
            this.updateCellDisplay(buildingId);
            alert(`${this.getBuildingName(buildingId)}已解鎖！`);
            return true;
        }

        return false;
    }

    updateCellDisplay(buildingId) {
        const cell = this.cells.find(c => c.buildingId === buildingId);
        if (!cell) return;

        const element = cell.element;
        element.classList.add('unlocked');
        
        const nameSpan = element.querySelector('.garden-cell-name');
        if (nameSpan) {
            nameSpan.textContent = this.getBuildingName(buildingId);
            nameSpan.classList.remove('garden-cell-locked');
            nameSpan.style.color = '#5a4a3a';
            nameSpan.style.fontWeight = '600';
        }
    }

    getBuildingName(buildingId) {
        const names = {
            'xiaoxiang_guan': '瀟湘館'
        };
        return names[buildingId] || buildingId;
    }

    getCell(x, y) {
        return this.cells.find(c => c.x === x && c.y === y);
    }

    getCellByBuildingId(buildingId) {
        return this.cells.find(c => c.buildingId === buildingId);
    }

    setFlowerInCell(buildingId, flowerId) {
        const cell = this.getCellByBuildingId(buildingId);
        if (cell) {
            cell.flowerId = flowerId;
            cell.element.classList.add('has-flower');
            
            // 更新顯示文字
            const nameSpan = cell.element.querySelector('.garden-cell-name');
            if (nameSpan) {
                const buildingName = this.getBuildingName(buildingId);
                nameSpan.textContent = `${buildingName}（有花魂）`;
            }
        }
    }

    isBuildingUnlocked(buildingId) {
        return this.state.isBuildingUnlocked(buildingId);
    }
}

