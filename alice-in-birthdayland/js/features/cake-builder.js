/* ========================================
   Alice in Birthdayland - 蛋糕製作遊戲核心邏輯
   ======================================== */

import { playSound } from '../utils/audio-manager.js';

/**
 * 蛋糕製作遊戲狀態管理
 */
const CakeState = {
    currentCake: {
        base: { shape: 'round', color: 'pink' },
        decorations: [],
        texts: []
    },
    history: [],
    isInitialized: false
};

/**
 * 蛋糕配置
 */
const CAKE_CONFIG = {
    baseShapes: ['round', 'heart', 'star', 'flower'],
    frostingColors: ['pink', 'yellow', 'green', 'purple', 'blue', 'white'],
    decorations: {
        fruits: ['strawberry', 'cherry', 'peach', 'kiwi'],
        candies: ['candy', 'lollipop', 'donut', 'cupcake'],
        flowers: ['cherry-blossom', 'rose', 'sunflower', 'bouquet'],
        special: ['star', 'heart', 'unicorn', 'palette'],
        goji: ['goji', 'family']
    }
};

/**
 * 初始化蛋糕製作遊戲
 */
export function initCakeBuilder() {
    console.log('🍰 初始化蛋糕製作遊戲...');
    
    if (CakeState.isInitialized) return;
    
    // 綁定事件監聽器
    bindEventListeners();
    
    // 初始化蛋糕
    initializeCake();
    
    CakeState.isInitialized = true;
    console.log('✨ 蛋糕製作遊戲初始化完成');
}

/**
 * 綁定事件監聽器
 */
function bindEventListeners() {
    // 返回按鈕
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            playSound('location-click');
            window.location.href = 'index.html';
        });
    }
    
    // 蛋糕底座選擇
    bindBaseSelection();
    
    // 糖霜顏色選擇
    bindFrostingSelection();
    
    // 裝飾元素拖拽
    bindDecorationDrag();
    
    // 文字添加
    bindTextAddition();
    
    // 畫布操作
    bindCanvasActions();
    
    // 模態框操作
    bindModalActions();
}

/**
 * 綁定底座選擇
 */
function bindBaseSelection() {
    const baseOptions = document.querySelectorAll('.cake-option');
    baseOptions.forEach(option => {
        option.addEventListener('click', () => {
            const shape = option.dataset.shape;
            selectBaseShape(shape);
            playSound('cake-select');
        });
    });
}

/**
 * 綁定糖霜顏色選擇
 */
function bindFrostingSelection() {
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const color = button.dataset.color;
            selectFrostingColor(color);
            playSound('cake-select');
        });
    });
}

/**
 * 綁定裝飾元素拖拽
 */
function bindDecorationDrag() {
    const decorationItems = document.querySelectorAll('.deco-item');
    decorationItems.forEach(item => {
        item.addEventListener('dragstart', handleDecorationDragStart);
    });
    
    const canvas = document.getElementById('cake-canvas');
    if (canvas) {
        canvas.addEventListener('dragover', handleCanvasDragOver);
        canvas.addEventListener('drop', handleCanvasDrop);
    }
}

/**
 * 綁定文字添加
 */
function bindTextAddition() {
    const addTextBtn = document.getElementById('add-text-btn');
    const presetSelect = document.getElementById('preset-text');
    const customInput = document.getElementById('custom-text');
    
    if (addTextBtn) {
        addTextBtn.addEventListener('click', () => {
            const text = presetSelect.value || customInput.value;
            if (text.trim()) {
                addTextToCake(text.trim());
                customInput.value = '';
                playSound('deco-place');
            }
        });
    }
    
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            customInput.value = '';
        });
    }
}

/**
 * 綁定畫布操作
 */
function bindCanvasActions() {
    // 撤銷按鈕
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undoLastAction);
    }
    
    // 清空按鈕
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCake);
    }
    
    // 保存按鈕
    const saveBtn = document.getElementById('save-cake-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCake);
    }
}

/**
 * 綁定模態框操作
 */
function bindModalActions() {
    // 下載蛋糕
    const downloadBtn = document.getElementById('download-cake');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCake);
    }
    
    // 重新製作
    const remakeBtn = document.getElementById('remake-cake');
    if (remakeBtn) {
        remakeBtn.addEventListener('click', remakeCake);
    }
    
    // 返回地圖
    const backToMapBtn = document.getElementById('back-to-map');
    if (backToMapBtn) {
        backToMapBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

/**
 * 初始化蛋糕
 */
function initializeCake() {
    renderCake();
    saveToHistory();
}

/**
 * 選擇底座形狀
 */
function selectBaseShape(shape) {
    CakeState.currentCake.base.shape = shape;
    
    // 更新 UI
    document.querySelectorAll('.cake-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[data-shape="${shape}"]`).classList.add('active');
    
    // 重新渲染蛋糕
    renderCake();
    saveToHistory();
}

/**
 * 選擇糖霜顏色
 */
function selectFrostingColor(color) {
    CakeState.currentCake.base.color = color;
    
    // 更新 UI
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-color="${color}"]`).classList.add('active');
    
    // 重新渲染蛋糕
    renderCake();
    saveToHistory();
}

/**
 * 處理裝飾拖拽開始
 */
function handleDecorationDragStart(e) {
    const decorationType = e.target.dataset.type;
    const decorationIcon = e.target.textContent;
    
    e.dataTransfer.setData('decorationType', decorationType);
    e.dataTransfer.setData('decorationIcon', decorationIcon);
    e.dataTransfer.effectAllowed = 'copy';
    
    playSound('pickup');
}

/**
 * 處理畫布拖拽懸停
 */
function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

/**
 * 處理畫布放置
 */
function handleCanvasDrop(e) {
    e.preventDefault();
    
    const decorationType = e.dataTransfer.getData('decorationType');
    const decorationIcon = e.dataTransfer.getData('decorationIcon');
    
    if (decorationType && decorationIcon) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        addDecorationToCake(decorationType, decorationIcon, x, y);
        playSound('deco-place');
    }
}

/**
 * 添加裝飾到蛋糕
 */
function addDecorationToCake(type, icon, x, y) {
    const decoration = {
        id: Date.now(),
        type,
        icon,
        x: x - 25, // 調整到中心
        y: y - 25,
        rotation: 0,
        scale: 1
    };
    
    CakeState.currentCake.decorations.push(decoration);
    renderDecorations();
    saveToHistory();
}

/**
 * 添加文字到蛋糕
 */
function addTextToCake(text) {
    const textElement = {
        id: Date.now(),
        content: text,
        x: 200, // 默認位置
        y: 100,
        fontSize: 20,
        color: '#333',
        rotation: 0
    };
    
    CakeState.currentCake.texts.push(textElement);
    renderTexts();
    saveToHistory();
}

/**
 * 渲染蛋糕
 */
function renderCake() {
    const cakeBase = document.getElementById('cake-base');
    if (!cakeBase) return;
    
    const { shape, color } = CakeState.currentCake.base;
    
    // 更新類名
    cakeBase.className = `cake-base ${shape} ${color}`;
    
    // 根據形狀調整大小
    if (shape === 'heart' || shape === 'flower') {
        cakeBase.style.width = '180px';
        cakeBase.style.height = shape === 'heart' ? '160px' : '180px';
    } else {
        cakeBase.style.width = '200px';
        cakeBase.style.height = '200px';
    }
}

/**
 * 渲染裝飾
 */
function renderDecorations() {
    const decorationsLayer = document.getElementById('decorations-layer');
    if (!decorationsLayer) return;
    
    decorationsLayer.innerHTML = '';
    
    CakeState.currentCake.decorations.forEach(decoration => {
        const decorationElement = createDecorationElement(decoration);
        decorationsLayer.appendChild(decorationElement);
    });
}

/**
 * 創建裝飾元素
 */
function createDecorationElement(decoration) {
    const element = document.createElement('div');
    element.className = 'decoration-item';
    element.dataset.decorationId = decoration.id;
    element.style.cssText = `
        position: absolute;
        left: ${decoration.x}px;
        top: ${decoration.y}px;
        font-size: 2rem;
        cursor: move;
        user-select: none;
        transform: rotate(${decoration.rotation}deg) scale(${decoration.scale});
        transition: all 0.3s ease;
    `;
    element.textContent = decoration.icon;
    
    // 綁定事件
    bindDecorationEvents(element, decoration);
    
    return element;
}

/**
 * 綁定裝飾事件
 */
function bindDecorationEvents(element, decoration) {
    let isDragging = false;
    let startX, startY;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - decoration.x;
        startY = e.clientY - decoration.y;
        element.style.zIndex = '10';
        playSound('pickup');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            decoration.x = e.clientX - startX;
            decoration.y = e.clientY - startY;
            element.style.left = `${decoration.x}px`;
            element.style.top = `${decoration.y}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '1';
            playSound('place');
            saveToHistory();
        }
    });
    
    // 雙擊刪除
    element.addEventListener('dblclick', () => {
        removeDecoration(decoration.id);
        playSound('place');
    });
    
    // 右鍵旋轉
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        decoration.rotation += 45;
        element.style.transform = `rotate(${decoration.rotation}deg) scale(${decoration.scale})`;
        playSound('cake-select');
    });
}

/**
 * 渲染文字
 */
function renderTexts() {
    const textLayer = document.getElementById('text-layer');
    if (!textLayer) return;
    
    textLayer.innerHTML = '';
    
    CakeState.currentCake.texts.forEach(textElement => {
        const element = createTextElement(textElement);
        textLayer.appendChild(element);
    });
}

/**
 * 創建文字元素
 */
function createTextElement(textElement) {
    const element = document.createElement('div');
    element.className = 'text-item';
    element.dataset.textId = textElement.id;
    element.style.cssText = `
        position: absolute;
        left: ${textElement.x}px;
        top: ${textElement.y}px;
        font-size: ${textElement.fontSize}px;
        color: ${textElement.color};
        cursor: move;
        user-select: none;
        transform: rotate(${textElement.rotation}deg);
        transition: all 0.3s ease;
    `;
    element.textContent = textElement.content;
    
    // 綁定事件
    bindTextEvents(element, textElement);
    
    return element;
}

/**
 * 綁定文字事件
 */
function bindTextEvents(element, textElement) {
    let isDragging = false;
    let startX, startY;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - textElement.x;
        startY = e.clientY - textElement.y;
        element.style.zIndex = '10';
        playSound('pickup');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            textElement.x = e.clientX - startX;
            textElement.y = e.clientY - startY;
            element.style.left = `${textElement.x}px`;
            element.style.top = `${textElement.y}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '1';
            playSound('place');
            saveToHistory();
        }
    });
    
    // 雙擊刪除
    element.addEventListener('dblclick', () => {
        removeText(textElement.id);
        playSound('place');
    });
}

/**
 * 移除裝飾
 */
function removeDecoration(decorationId) {
    CakeState.currentCake.decorations = CakeState.currentCake.decorations.filter(
        d => d.id !== decorationId
    );
    renderDecorations();
    saveToHistory();
}

/**
 * 移除文字
 */
function removeText(textId) {
    CakeState.currentCake.texts = CakeState.currentCake.texts.filter(
        t => t.id !== textId
    );
    renderTexts();
    saveToHistory();
}

/**
 * 撤銷上一步操作
 */
function undoLastAction() {
    if (CakeState.history.length > 1) {
        CakeState.history.pop();
        const previousState = CakeState.history[CakeState.history.length - 1];
        CakeState.currentCake = JSON.parse(JSON.stringify(previousState));
        
        renderCake();
        renderDecorations();
        renderTexts();
        
        playSound('place');
    }
}

/**
 * 清空蛋糕
 */
function clearCake() {
    const confirmed = confirm('確定要清空蛋糕嗎？');
    if (confirmed) {
        CakeState.currentCake = {
            base: { shape: 'round', color: 'pink' },
            decorations: [],
            texts: []
        };
        
        renderCake();
        renderDecorations();
        renderTexts();
        saveToHistory();
        
        playSound('place');
    }
}

/**
 * 保存到歷史記錄
 */
function saveToHistory() {
    const currentState = JSON.parse(JSON.stringify(CakeState.currentCake));
    CakeState.history.push(currentState);
    
    // 限制歷史記錄數量
    if (CakeState.history.length > 20) {
        CakeState.history.shift();
    }
}

/**
 * 保存蛋糕
 */
function saveCake() {
    console.log('🎂 保存蛋糕...');
    
    // 創建蛋糕預覽
    createCakePreview();
    
    // 顯示完成模態框
    showCompletionModal();
    
    playSound('cake-complete');
}

/**
 * 創建蛋糕預覽
 */
function createCakePreview() {
    const previewElement = document.getElementById('cake-preview-image');
    if (previewElement) {
        // 這裡可以將蛋糕轉換為圖片
        // 暫時使用 CSS 模擬
        previewElement.style.background = getFrostingColor(CakeState.currentCake.base.color);
        previewElement.style.borderRadius = getBaseShape(CakeState.currentCake.base.shape);
    }
}

/**
 * 獲取糖霜顏色
 */
function getFrostingColor(color) {
    const colors = {
        pink: '#FFB6C1',
        yellow: '#FFD700',
        green: '#98FF98',
        purple: '#DDA0DD',
        blue: '#87CEEB',
        white: '#FFF'
    };
    return colors[color] || colors.pink;
}

/**
 * 獲取底座形狀
 */
function getBaseShape(shape) {
    const shapes = {
        round: '50%',
        heart: '50%',
        star: '50%',
        flower: '50%'
    };
    return shapes[shape] || shapes.round;
}

/**
 * 顯示完成模態框
 */
function showCompletionModal() {
    const modal = document.getElementById('completion-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
}

/**
 * 下載蛋糕
 */
function downloadCake() {
    // 這裡可以實現蛋糕圖片下載功能
    console.log('📥 下載蛋糕...');
    playSound('location-click');
    
    // 暫時顯示提示
    alert('蛋糕下載功能即將推出！');
}

/**
 * 重新製作蛋糕
 */
function remakeCake() {
    const confirmed = confirm('確定要重新製作蛋糕嗎？');
    if (confirmed) {
        // 重置蛋糕狀態
        CakeState.currentCake = {
            base: { shape: 'round', color: 'pink' },
            decorations: [],
            texts: []
        };
        
        CakeState.history = [];
        
        // 重新渲染
        renderCake();
        renderDecorations();
        renderTexts();
        saveToHistory();
        
        // 關閉模態框
        const modal = document.getElementById('completion-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
        
        playSound('place');
    }
}

/**
 * 當頁面載入完成時初始化遊戲
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initCakeBuilder();
    }, 500);
});

/**
 * 導出函數供其他模組使用
 * initCakeBuilder 已在函數定義時導出
 */
export { 
    CakeState, 
    saveCake, 
    showCompletionModal 
};
