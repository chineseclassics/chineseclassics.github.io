// =====================================
// 碧城・煉夢錄 - 遊戲核心邏輯
// =====================================

class DreamAlchemist {
    constructor() {
        this.discoveredPoems = new Set(); // 已發現的詩歌 ID
        this.unlockedImagery = new Set(); // 已解鎖的意象
        this.currentStage = 'beginning';
        this.draggedItem = null;
        this.furnaceItems = [null, null]; // 靈犀爐中的兩個位置
        
        this.init();
    }
    
    init() {
        // 初始化解鎖的基礎意象（開始時解鎖一部分）
        this.unlockBaseImagery(['bashan', 'yeyu', 'chuncan', 'laju', 'zhuangsheng', 'hudie']);
        
        // 綁定事件
        this.bindEvents();
        
        // 渲染界面
        this.renderImageryPool();
        this.updateStage();
    }
    
    // 解鎖基礎意象
    unlockBaseImagery(imageryIds) {
        imageryIds.forEach(id => this.unlockedImagery.add(id));
    }
    
    // 綁定事件
    bindEvents() {
        // 拖拽事件
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('imagery-item')) {
                this.draggedItem = e.target.dataset.imageryId;
                e.target.style.opacity = '0.5';
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('imagery-item')) {
                e.target.style.opacity = '1';
            }
        });
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('furnace-slot')) {
                const slotIndex = parseInt(e.target.dataset.slotIndex);
                if (this.draggedItem) {
                    this.placeInFurnace(slotIndex, this.draggedItem);
                    this.draggedItem = null;
                }
            }
        });
        
        // 觸摸事件（移動端支持）
        this.bindTouchEvents();
        
        // 煉化按鈕
        const refineBtn = document.getElementById('refine-btn');
        if (refineBtn) {
            refineBtn.addEventListener('click', () => this.attemptRefinement());
        }
        
        // 清空按鈕
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFurnace());
        }
        
        // 圖鑑按鈕
        const collectionBtn = document.getElementById('collection-btn');
        if (collectionBtn) {
            collectionBtn.addEventListener('click', () => this.showCollection());
        }
    }
    
    // 綁定觸摸事件（移動端）
    bindTouchEvents() {
        let touchStartElement = null;
        
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('imagery-item')) {
                touchStartElement = e.target;
                touchStartElement.style.opacity = '0.5';
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (touchStartElement) {
                touchStartElement.style.opacity = '1';
                
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (elementBelow && elementBelow.classList.contains('furnace-slot')) {
                    const slotIndex = parseInt(elementBelow.dataset.slotIndex);
                    const imageryId = touchStartElement.dataset.imageryId;
                    this.placeInFurnace(slotIndex, imageryId);
                }
                
                touchStartElement = null;
            }
        });
    }
    
    // 將意象放入靈犀爐
    placeInFurnace(slotIndex, imageryId) {
        if (!this.unlockedImagery.has(imageryId)) {
            this.showMessage('這個意象碎片尚未解鎖...', 'warning');
            return;
        }
        
        this.furnaceItems[slotIndex] = imageryId;
        this.renderFurnace();
        
        // 檢查是否可以煉化
        if (this.furnaceItems[0] && this.furnaceItems[1]) {
            document.getElementById('refine-btn').classList.add('ready');
        }
    }
    
    // 清空靈犀爐
    clearFurnace() {
        this.furnaceItems = [null, null];
        this.renderFurnace();
        document.getElementById('refine-btn').classList.remove('ready');
    }
    
    // 渲染靈犀爐
    renderFurnace() {
        const slots = document.querySelectorAll('.furnace-slot');
        slots.forEach((slot, index) => {
            const imageryId = this.furnaceItems[index];
            if (imageryId) {
                const imagery = BASE_IMAGERY.find(img => img.id === imageryId);
                if (imagery) {
                    slot.innerHTML = `
                        <div class="furnace-item" data-imagery-id="${imageryId}">
                            <span class="imagery-emoji">${imagery.emoji}</span>
                            <span class="imagery-name">${imagery.name}</span>
                        </div>
                    `;
                    slot.classList.add('filled');
                } else {
                    // 如果找不到對應的意象，清空該位置
                    slot.innerHTML = '<span class="slot-placeholder">放入意象</span>';
                    slot.classList.remove('filled');
                    this.furnaceItems[index] = null;
                }
            } else {
                slot.innerHTML = '<span class="slot-placeholder">放入意象</span>';
                slot.classList.remove('filled');
            }
        });
    }
    
    // 嘗試煉化
    attemptRefinement() {
        if (!this.furnaceItems[0] || !this.furnaceItems[1]) {
            this.showMessage('請在靈犀爐中放入兩個意象碎片...', 'warning');
            return;
        }
        
        const [item1, item2] = this.furnaceItems;
        const recipe = this.findRecipe(item1, item2);
        
        if (recipe) {
            this.successfulRefinement(recipe);
        } else {
            this.failedRefinement();
        }
    }
    
    // 查找配方
    findRecipe(item1, item2) {
        return RECIPES.find(recipe => {
            const [ing1, ing2] = recipe.ingredients;
            return (ing1 === item1 && ing2 === item2) || (ing1 === item2 && ing2 === item1);
        });
    }
    
    // 煉化成功
    successfulRefinement(recipe) {
        // 記錄已發現的詩歌
        this.discoveredPoems.add(recipe.id);
        
        // 解鎖新意象
        if (recipe.unlockItems) {
            recipe.unlockItems.forEach(id => this.unlockedImagery.add(id));
        }
        
        // 顯示記憶閃回
        this.showMemoryFlashback(recipe);
        
        // 清空靈犀爐
        this.clearFurnace();
        
        // 更新進度
        this.updateStage();
        this.renderImageryPool();
        
        // 檢查是否完成
        if (this.discoveredPoems.size >= RECIPES.length) {
            setTimeout(() => this.showEnding(), 2000);
        }
    }
    
    // 煉化失敗
    failedRefinement() {
        this.showMessage('這兩個意象碎片無法融合...它們之間沒有共鳴。', 'error');
        
        // 視覺反饋：震動效果
        const furnace = document.querySelector('.furnace');
        if (furnace) {
            furnace.classList.add('shake');
            setTimeout(() => {
                if (furnace) {
                    furnace.classList.remove('shake');
                }
            }, 500);
        }
    }
    
    // 顯示記憶閃回（敘事模態框）
    showMemoryFlashback(recipe) {
        const modal = document.getElementById('memory-modal');
        const modalContent = document.getElementById('memory-content');
        
        modalContent.innerHTML = `
            <div class="memory-header">
                <h2 class="memory-title">${recipe.title}</h2>
                <div class="memory-poem">
                    ${recipe.poem.map(line => `<p>${line}</p>`).join('')}
                </div>
            </div>
            <div class="memory-narrative">
                <p class="narrative-text">${recipe.narrative}</p>
                <p class="imagery-label">意象：${recipe.imagery}</p>
            </div>
            <button class="close-memory-btn" onclick="game.closeMemoryModal()">收入無題卷</button>
        `;
        
        modal.classList.add('active');
        
        // 添加特效
        document.body.classList.add('memory-flashback');
        setTimeout(() => {
            document.body.classList.remove('memory-flashback');
        }, 1000);
    }
    
    // 關閉記憶模態框
    closeMemoryModal() {
        const modal = document.getElementById('memory-modal');
        modal.classList.remove('active');
    }
    
    // 顯示消息
    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.classList.add('show');
        
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }
    
    // 渲染意象池
    renderImageryPool() {
        const pool = document.getElementById('imagery-pool');
        if (!pool) return;
        
        const unlockedItems = BASE_IMAGERY.filter(img => this.unlockedImagery.has(img.id));
        
        pool.innerHTML = unlockedItems.map(img => `
            <div class="imagery-item" 
                 draggable="true" 
                 data-imagery-id="${img.id}"
                 title="${img.name}：${img.description}">
                <span class="imagery-emoji">${img.emoji}</span>
                <span class="imagery-name">${img.name}</span>
            </div>
        `).join('');
    }
    
    // 更新階段
    updateStage() {
        const poemCount = this.discoveredPoems.size;
        const newStage = GAME_STAGES.find(stage => poemCount >= stage.requiredPoems) || GAME_STAGES[0];
        
        if (newStage.id !== this.currentStage) {
            this.currentStage = newStage.id;
            this.showStageTransition(newStage);
        }
        
        // 更新進度顯示
        const progressEl = document.getElementById('stage-progress');
        if (progressEl) {
            progressEl.textContent = `${newStage.name} (${poemCount}/${RECIPES.length})`;
        }
    }
    
    // 顯示階段過渡
    showStageTransition(stage) {
        this.showMessage(`你進入了新的階段：${stage.name}`, 'info');
    }
    
    // 顯示圖鑑
    showCollection() {
        const modal = document.getElementById('collection-modal');
        const content = document.getElementById('collection-content');
        
        const discovered = RECIPES.filter(r => this.discoveredPoems.has(r.id));
        const undiscovered = RECIPES.filter(r => !this.discoveredPoems.has(r.id));
        
        content.innerHTML = `
            <h2>無題卷</h2>
            <div class="collection-section">
                <h3>已修復的記憶 (${discovered.length})</h3>
                <div class="poem-list">
                    ${discovered.map(recipe => `
                        <div class="poem-card discovered">
                            <h4>${recipe.title}</h4>
                            <div class="poem-lines">
                                ${recipe.poem.slice(0, 2).map(line => `<p>${line}</p>`).join('')}
                            </div>
                            <p class="imagery-tag">${recipe.imagery}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="collection-section">
                <h3>未發現的記憶 (${undiscovered.length})</h3>
                <div class="poem-list">
                    ${undiscovered.map(recipe => `
                        <div class="poem-card undiscovered">
                            <h4>？？？</h4>
                            <p class="hint">繼續探索，尋找記憶碎片...</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="close-collection-btn" onclick="game.closeCollection()">關閉</button>
        `;
        
        modal.classList.add('active');
    }
    
    // 關閉圖鑑
    closeCollection() {
        const modal = document.getElementById('collection-modal');
        modal.classList.remove('active');
    }
    
    // 顯示結局
    showEnding() {
        const modal = document.getElementById('ending-modal');
        const content = document.getElementById('ending-content');
        
        content.innerHTML = `
            <div class="ending-content">
                <h2>錦瑟無端</h2>
                <p class="ending-text">
                    你已經修復了所有破碎的記憶。無題詩人的靈魂在碧城中重新完整，那些關於愛、思念、遺憾的情感，如同錦瑟的五十根弦，每一根都訴說著不同的故事。
                </p>
                <p class="ending-text">
                    此情可待成追憶，只是當時已惘然。
                </p>
                <button class="restart-btn" onclick="location.reload()">重新開始</button>
            </div>
        `;
        
        modal.classList.add('active');
    }
}

// 初始化遊戲
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new DreamAlchemist();
});

