/* ========================================
   Alice in Birthdayland - 拼圖遊戲核心邏輯
   ======================================== */

import { playSound } from '../utils/audio-manager.js';

/**
 * 拼圖遊戲狀態管理
 */
const PuzzleState = {
    selectedPhotos: [],           // 玩家選中的照片
    allPieces: [],                // 所有切割後的碎片
    completedPhotos: [],          // 已完成的照片 ID
    currentDragging: null,        // 當前拖拽的碎片
    startTime: null,              // 遊戲開始時間
    endTime: null,                // 遊戲結束時間
    grids: {},                    // 每張照片的拼圖網格狀態
    hintsUsed: 0,                 // 已使用的提示次數
    maxHints: 3                   // 最大提示次數
};

/**
 * 照片配置
 */
const PHOTO_CONFIG = {
    totalPhotos: 8,              // 總照片數量
    selectCount: 3,              // 需要選擇的照片數量
    pieceSize: 3,                // 每張照片切成 3x3
    pieceCount: 9                // 每張照片的碎片數量
};

/**
 * 初始化拼圖遊戲
 */
export function initPuzzleGame() {
    console.log('🧩 初始化拼圖遊戲...');
    
    // 載入照片數據
    loadPhotoData();
    
    // 綁定事件監聽器
    bindEventListeners();
    
    // 開始遊戲
    startGame();
}

/**
 * 載入照片數據
 */
async function loadPhotoData() {
    console.log('📸 載入照片數據...');
    
    try {
        // 載入所有照片
        const photos = [];
        for (let i = 1; i <= PHOTO_CONFIG.totalPhotos; i++) {
            const photo = await loadPhoto(`assets/images/photo-${i}.jpg`, `photo-${i}`);
            if (photo) {
                photos.push(photo);
            }
        }
        
        console.log(`載入了 ${photos.length} 張照片`);
        
        // 隨機選擇 3 張照片
        PuzzleState.selectedPhotos = selectRandomPhotos(photos, PHOTO_CONFIG.selectCount);
        
        // 切割照片為碎片
        await cutPhotosIntoPieces();
        
        // 渲染界面
        renderPhotoSelection();
        renderPuzzleGrids();
        renderPiecePool();
        
    } catch (error) {
        console.error('載入照片失敗:', error);
        showError('載入照片失敗，請刷新頁面重試');
    }
}

/**
 * 載入單張照片
 */
function loadPhoto(src, id) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            resolve({
                id,
                src,
                element: img,
                width: img.width,
                height: img.height
            });
        };
        img.onerror = () => {
            console.warn(`照片載入失敗: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * 隨機選擇照片
 */
function selectRandomPhotos(photos, count) {
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * 切割照片為碎片
 */
async function cutPhotosIntoPieces() {
    console.log('✂️ 切割照片為碎片...');
    
    PuzzleState.allPieces = [];
    
    for (const photo of PuzzleState.selectedPhotos) {
        const pieces = await cutPhotoIntoPieces(photo);
        PuzzleState.allPieces.push(...pieces);
        
        // 初始化網格狀態
        PuzzleState.grids[photo.id] = {
            pieces: new Array(PHOTO_CONFIG.pieceCount).fill(null),
            completed: false
        };
    }
    
    // 打亂所有碎片
    shufflePieces();
    
    console.log(`切割完成，共 ${PuzzleState.allPieces.length} 個碎片`);
}

/**
 * 切割單張照片為碎片
 */
function cutPhotoIntoPieces(photo) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const pieceWidth = photo.width / PHOTO_CONFIG.pieceSize;
        const pieceHeight = photo.height / PHOTO_CONFIG.pieceSize;
        
        const pieces = [];
        
        for (let row = 0; row < PHOTO_CONFIG.pieceSize; row++) {
            for (let col = 0; col < PHOTO_CONFIG.pieceSize; col++) {
                // 設置畫布大小
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;
                
                // 繪製碎片
                ctx.drawImage(
                    photo.element,
                    col * pieceWidth, row * pieceHeight,
                    pieceWidth, pieceHeight,
                    0, 0,
                    pieceWidth, pieceHeight
                );
                
                const piece = {
                    id: `${photo.id}-${row}-${col}`,
                    photoId: photo.id,
                    row,
                    col,
                    imageData: canvas.toDataURL('image/jpeg', 0.9),
                    isPlaced: false,
                    currentGrid: null
                };
                
                pieces.push(piece);
            }
        }
        
        resolve(pieces);
    });
}

/**
 * 打亂碎片順序
 */
function shufflePieces() {
    // 只打亂未放置的碎片
    const unplacedPieces = PuzzleState.allPieces.filter(p => !p.isPlaced);
    const placedPieces = PuzzleState.allPieces.filter(p => p.isPlaced);
    
    // 隨機排序未放置的碎片
    const shuffled = unplacedPieces.sort(() => Math.random() - 0.5);
    
    // 合併回所有碎片
    PuzzleState.allPieces = [...placedPieces, ...shuffled];
    
    // 重新渲染碎片池
    renderPiecePool();
    
    console.log('🔀 碎片已重新排列');
    playSound('place');
}

/**
 * 渲染照片選擇區域
 */
function renderPhotoSelection() {
    const container = document.getElementById('photo-thumbnails');
    if (!container) return;
    
    container.innerHTML = '';
    
    PuzzleState.selectedPhotos.forEach(photo => {
        const thumbnail = document.createElement('img');
        thumbnail.src = photo.src;
        thumbnail.className = 'photo-thumbnail';
        thumbnail.dataset.photoId = photo.id;
        thumbnail.alt = `照片 ${photo.id}`;
        
        // 點擊選擇照片
        thumbnail.addEventListener('click', () => {
            selectPhoto(photo.id);
        });
        
        container.appendChild(thumbnail);
    });
}

/**
 * 選擇照片
 */
function selectPhoto(photoId) {
    // 移除其他照片的選中狀態
    document.querySelectorAll('.photo-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    // 選中當前照片
    const thumbnail = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (thumbnail) {
        thumbnail.classList.add('selected');
    }
    
    // 激活對應的拼圖網格
    activateGrid(photoId);
}

/**
 * 激活拼圖網格
 */
function activateGrid(photoId) {
    // 移除其他網格的激活狀態
    document.querySelectorAll('.puzzle-grid').forEach(grid => {
        grid.classList.remove('active');
    });
    
    // 激活當前網格
    const grid = document.querySelector(`[data-grid-photo="${photoId}"]`);
    if (grid) {
        grid.classList.add('active');
    }
}

/**
 * 渲染拼圖網格
 */
function renderPuzzleGrids() {
    const container = document.getElementById('puzzle-grids');
    if (!container) return;
    
    container.innerHTML = '';
    
    PuzzleState.selectedPhotos.forEach(photo => {
        const gridElement = createPuzzleGrid(photo);
        container.appendChild(gridElement);
    });
}

/**
 * 創建拼圖網格元素
 */
function createPuzzleGrid(photo) {
    const gridDiv = document.createElement('div');
    gridDiv.className = 'puzzle-grid';
    gridDiv.dataset.gridPhoto = photo.id;
    
    gridDiv.innerHTML = `
        <div class="grid-header">
            <div class="grid-title">${photo.id}</div>
            <div class="grid-status waiting">等待中</div>
        </div>
        <div class="grid-container" data-photo-id="${photo.id}">
            ${Array.from({ length: PHOTO_CONFIG.pieceCount }, (_, i) => {
                const row = Math.floor(i / PHOTO_CONFIG.pieceSize);
                const col = i % PHOTO_CONFIG.pieceSize;
                return `<div class="grid-slot" data-row="${row}" data-col="${col}"></div>`;
            }).join('')}
        </div>
    `;
    
    // 綁定網格事件
    bindGridEvents(gridDiv, photo.id);
    
    return gridDiv;
}

/**
 * 綁定網格事件
 */
function bindGridEvents(gridElement, photoId) {
    const slots = gridElement.querySelectorAll('.grid-slot');
    
    slots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', (e) => handleDrop(e, photoId));
        slot.addEventListener('click', () => selectPhoto(photoId));
    });
}

/**
 * 渲染碎片池
 */
function renderPiecePool() {
    const container = document.getElementById('piece-pool');
    if (!container) return;
    
    container.innerHTML = '';
    
    PuzzleState.allPieces.forEach(piece => {
        const pieceElement = createPieceElement(piece);
        container.appendChild(pieceElement);
    });
}

/**
 * 創建碎片元素
 */
function createPieceElement(piece) {
    const pieceDiv = document.createElement('div');
    pieceDiv.className = 'puzzle-piece';
    pieceDiv.draggable = true;
    pieceDiv.dataset.pieceId = piece.id;
    pieceDiv.dataset.photoId = piece.photoId;
    
    const img = document.createElement('img');
    img.src = piece.imageData;
    img.alt = `拼圖碎片 ${piece.id}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '5px';
    
    pieceDiv.appendChild(img);
    
    // 綁定拖拽事件
    bindPieceEvents(pieceDiv, piece);
    
    return pieceDiv;
}

/**
 * 綁定碎片事件
 */
function bindPieceEvents(pieceElement, piece) {
    pieceElement.addEventListener('dragstart', (e) => handleDragStart(e, piece));
    pieceElement.addEventListener('dragend', handleDragEnd);
}

/**
 * 處理拖拽開始
 */
function handleDragStart(e, piece) {
    // 只有正確放置（已鎖定）的碎片不能拖動
    if (piece.isPlaced) {
        e.preventDefault();
        return;
    }
    
    // 如果碎片在網格中（但位置錯誤），從網格中移除
    if (piece.currentGrid) {
        const grid = PuzzleState.grids[piece.currentGrid];
        const slotIndex = piece.currentRow * PHOTO_CONFIG.pieceSize + piece.currentCol;
        if (grid.pieces[slotIndex] === piece) {
            grid.pieces[slotIndex] = null;
        }
    }
    
    PuzzleState.currentDragging = piece;
    e.target.closest('.puzzle-piece').classList.add('dragging');
    playSound('pickup');
    
    e.dataTransfer.setData('pieceId', piece.id);
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * 處理拖拽結束
 */
function handleDragEnd(e) {
    const pieceElement = e.target.closest('.puzzle-piece');
    if (pieceElement) {
        pieceElement.classList.remove('dragging');
    }
    PuzzleState.currentDragging = null;
}

/**
 * 處理拖拽懸停
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * 處理放置
 */
function handleDrop(e, photoId) {
    e.preventDefault();
    
    const pieceId = e.dataTransfer.getData('pieceId');
    const piece = PuzzleState.allPieces.find(p => p.id === pieceId);
    
    if (!piece || piece.isPlaced) return;
    
    // 確保獲取的是 grid-slot 元素
    const slot = e.target.closest('.grid-slot');
    if (!slot) return;
    
    const row = parseInt(slot.dataset.row);
    const col = parseInt(slot.dataset.col);
    
    if (isNaN(row) || isNaN(col)) return;
    
    if (isCorrectPosition(piece, row, col)) {
        placePiece(piece, photoId, row, col, slot);
        playSound('correct');
        checkPhotoCompletion(photoId);
    } else {
        // 允許放置但不鎖定
        placePiece(piece, photoId, row, col, slot, false);
        playSound('place');
    }
}

/**
 * 檢查是否為正確位置
 */
function isCorrectPosition(piece, row, col) {
    return piece.row === row && piece.col === col;
}

/**
 * 放置碎片
 */
function placePiece(piece, photoId, row, col, slot, isCorrect = true) {
    const grid = PuzzleState.grids[photoId];
    const slotIndex = row * PHOTO_CONFIG.pieceSize + col;
    
    // 如果槽位已有碎片，將舊碎片返回碎片池
    const oldPiece = grid.pieces[slotIndex];
    if (oldPiece) {
        returnPieceToPool(oldPiece);
    }
    
    // 更新網格狀態
    grid.pieces[slotIndex] = piece;
    piece.isPlaced = isCorrect; // 只有正確放置才標記為已放置
    piece.currentGrid = photoId;
    piece.currentRow = row;
    piece.currentCol = col;
    
    // 更新視覺效果
    if (slot) {
        const pieceElement = document.querySelector(`[data-piece-id="${piece.id}"]`);
        if (pieceElement) {
            // 清空槽位
            slot.innerHTML = '';
            
            // 將碎片移動到槽位
            slot.appendChild(pieceElement);
            
            // 設置碎片樣式
            pieceElement.style.width = '100%';
            pieceElement.style.height = '100%';
            pieceElement.style.margin = '0';
            
            if (isCorrect) {
                // 正確放置：鎖定，不可再拖動
                pieceElement.draggable = false;
                slot.classList.add('correct');
                pieceElement.classList.add('correct-piece');
                pieceElement.classList.remove('placed-piece');
            } else {
                // 錯誤放置：可以重新拖動
                pieceElement.draggable = true;
                slot.classList.add('placed');
                slot.classList.remove('correct');
                pieceElement.classList.add('placed-piece');
                pieceElement.classList.remove('correct-piece');
                
                // 重新綁定拖拽事件
                bindPieceEvents(pieceElement, piece);
            }
        }
    }
    
    console.log(`碎片 ${piece.id} 放置到 (${row}, ${col}), 正確: ${isCorrect}`);
}

/**
 * 將碎片返回碎片池
 */
function returnPieceToPool(piece) {
    piece.isPlaced = false;
    piece.currentGrid = null;
    piece.currentRow = null;
    piece.currentCol = null;
    
    const pieceElement = document.querySelector(`[data-piece-id="${piece.id}"]`);
    const piecePool = document.getElementById('piece-pool');
    
    if (pieceElement && piecePool) {
        pieceElement.draggable = true;
        pieceElement.classList.remove('correct-piece', 'placed-piece');
        pieceElement.style.width = '';
        pieceElement.style.height = '';
        pieceElement.style.margin = '';
        
        // 返回碎片池
        piecePool.appendChild(pieceElement);
    }
}

/**
 * 檢查照片完成狀態
 */
function checkPhotoCompletion(photoId) {
    const grid = PuzzleState.grids[photoId];
    const allCorrect = grid.pieces.every((piece, index) => {
        if (!piece) return false;
        const row = Math.floor(index / PHOTO_CONFIG.pieceSize);
        const col = index % PHOTO_CONFIG.pieceSize;
        return piece.row === row && piece.col === col;
    });
    
    if (allCorrect && !grid.completed) {
        grid.completed = true;
        PuzzleState.completedPhotos.push(photoId);
        
        // 更新視覺效果
        const gridElement = document.querySelector(`[data-grid-photo="${photoId}"]`);
        if (gridElement) {
            gridElement.classList.add('completed');
            gridElement.querySelector('.grid-status').textContent = '已完成';
            gridElement.querySelector('.grid-status').classList.remove('waiting', 'active');
            gridElement.querySelector('.grid-status').classList.add('completed');
        }
        
        // 更新照片縮圖
        const thumbnail = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (thumbnail) {
            thumbnail.classList.add('completed');
        }
        
        playSound('puzzle-complete');
        updatePuzzleProgress();
        checkGameCompletion();
    }
}

/**
 * 更新拼圖進度顯示
 */
function updatePuzzleProgress() {
    const completedCount = PuzzleState.completedPhotos.length;
    const progressPercent = (completedCount / PHOTO_CONFIG.selectCount) * 100;
    
    // 更新進度條
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progressPercent}%`;
    }
    
    // 更新進度文字
    const progressCount = document.getElementById('progress-count');
    if (progressCount) {
        progressCount.textContent = `${completedCount} / ${PHOTO_CONFIG.selectCount}`;
    }
}

/**
 * 檢查遊戲完成
 */
function checkGameCompletion() {
    if (PuzzleState.completedPhotos.length === PHOTO_CONFIG.selectCount) {
        PuzzleState.endTime = Date.now();
        showCompletionModal();
    }
}

/**
 * 顯示完成模態框
 */
function showCompletionModal() {
    const modal = document.getElementById('completion-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        
        // 更新完成時間
        const finalTime = document.getElementById('final-time');
        if (finalTime) {
            const duration = PuzzleState.endTime - PuzzleState.startTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            finalTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        playSound('final-celebration');
    }
}

/**
 * 綁定事件監聽器
 */
function bindEventListeners() {
    // 返回按鈕
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // 提示按鈕
    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) {
        hintBtn.addEventListener('click', useHint);
    }
    
    // 重新排列按鈕
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', shufflePieces);
    }
    
    // 模態框按鈕
    const videoBtn = document.getElementById('video-btn');
    if (videoBtn) {
        videoBtn.addEventListener('click', showVideoModal);
    }
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    const closeVideoBtn = document.getElementById('close-video');
    if (closeVideoBtn) {
        closeVideoBtn.addEventListener('click', closeVideoModal);
    }
}

/**
 * 使用提示
 */
function useHint() {
    if (PuzzleState.hintsUsed >= PuzzleState.maxHints) {
        showNotification('提示次數已用完！', 'warning');
        return;
    }
    
    // 找到當前激活的網格
    const activeGrid = document.querySelector('.puzzle-grid.active');
    if (!activeGrid) {
        showNotification('請先選擇一張照片！', 'warning');
        return;
    }
    
    const photoId = activeGrid.dataset.gridPhoto;
    const photo = PuzzleState.selectedPhotos.find(p => p.id === photoId);
    
    if (photo) {
        // 短暫顯示完整照片
        showPhotoHint(photo);
        PuzzleState.hintsUsed++;
        
        // 更新提示按鈕
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            const remaining = PuzzleState.maxHints - PuzzleState.hintsUsed;
            hintBtn.innerHTML = `<i class="fas fa-lightbulb"></i> 提示 (${remaining})`;
            if (remaining === 0) {
                hintBtn.disabled = true;
            }
        }
    }
}

/**
 * 顯示照片提示
 */
function showPhotoHint(photo) {
    const hintOverlay = document.createElement('div');
    hintOverlay.className = 'photo-hint-overlay';
    hintOverlay.innerHTML = `
        <div class="hint-content">
            <img src="${photo.src}" alt="提示照片" class="hint-image">
            <div class="hint-text">3 秒後消失...</div>
        </div>
    `;
    
    document.body.appendChild(hintOverlay);
    
    // 添加樣式
    addHintStyles();
    
    setTimeout(() => {
        hintOverlay.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        hintOverlay.classList.remove('show');
        setTimeout(() => {
            if (hintOverlay.parentNode) {
                hintOverlay.parentNode.removeChild(hintOverlay);
            }
        }, 300);
    }, 3000);
}

/**
 * 添加提示樣式
 */
function addHintStyles() {
    if (document.getElementById('hint-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'hint-styles';
    style.textContent = `
        .photo-hint-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .photo-hint-overlay.show {
            opacity: 1;
        }
        
        .hint-content {
            text-align: center;
        }
        
        .hint-image {
            max-width: 80vw;
            max-height: 60vh;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        
        .hint-text {
            color: white;
            font-family: 'Fredoka One', cursive;
            font-size: 1.5rem;
            margin-top: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * 開始遊戲
 */
function startGame() {
    PuzzleState.startTime = Date.now();
    console.log('🎮 拼圖遊戲開始！');
}

/**
 * 重新開始遊戲
 */
function restartGame() {
    // 重置狀態
    PuzzleState.completedPhotos = [];
    PuzzleState.hintsUsed = 0;
    PuzzleState.startTime = Date.now();
    PuzzleState.endTime = null;
    
    // 重置網格狀態
    Object.keys(PuzzleState.grids).forEach(photoId => {
        PuzzleState.grids[photoId] = {
            pieces: new Array(PHOTO_CONFIG.pieceCount).fill(null),
            completed: false
        };
    });
    
    // 重置碎片狀態
    PuzzleState.allPieces.forEach(piece => {
        piece.isPlaced = false;
        piece.currentGrid = null;
    });
    
    // 重新渲染界面
    renderPuzzleGrids();
    renderPiecePool();
    updatePuzzleProgress();
    
    // 關閉模態框
    const modal = document.getElementById('completion-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
    
    console.log('🔄 遊戲重新開始！');
}

/**
 * 顯示影片模態框
 */
function showVideoModal() {
    // 這裡需要用戶提供 YouTube 影片 ID
    const videoId = 'YOUR_VIDEO_ID'; // 需要替換為實際的影片 ID
    
    const videoModal = document.getElementById('video-modal');
    const iframe = document.getElementById('birthday-video');
    
    if (iframe && videoId !== 'YOUR_VIDEO_ID') {
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoModal.classList.remove('hidden');
        videoModal.classList.add('show');
    } else {
        showNotification('影片尚未準備好，敬請期待！', 'info');
    }
}

/**
 * 關閉影片模態框
 */
function closeVideoModal() {
    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
        videoModal.classList.add('hidden');
        videoModal.classList.remove('show');
        
        // 停止影片播放
        const iframe = document.getElementById('birthday-video');
        if (iframe) {
            iframe.src = '';
        }
    }
}

/**
 * 顯示錯誤信息
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff4757;
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-family: 'Fredoka One', cursive;
        font-size: 1.2rem;
        z-index: 3000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * 顯示通知
 */
function showNotification(message, type = 'info') {
    // 這裡可以調用核心應用模組的通知功能
    console.log(`通知: ${message} (${type})`);
}

/**
 * 當頁面載入完成時初始化遊戲
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initPuzzleGame();
    }, 500);
});

/**
 * 導出函數供其他模組使用
 * initPuzzleGame 已在函數定義時導出
 */
export { 
    PuzzleState
};

