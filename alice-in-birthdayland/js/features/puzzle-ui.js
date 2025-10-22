/* ========================================
   Alice in Birthdayland - 拼圖遊戲 UI 控制
   ======================================== */

import { playSound } from '../utils/audio-manager.js';
import { getTimer } from '../utils/timer.js';

/**
 * 拼圖遊戲 UI 管理器
 */
class PuzzleUI {
    constructor() {
        this.isInitialized = false;
        this.currentHintPhoto = null;
        this.hintTimeout = null;
    }

    /**
     * 初始化 UI
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🎨 初始化拼圖 UI...');
        
        this.bindUIEvents();
        this.setupAnimations();
        this.isInitialized = true;
        
        console.log('✨ 拼圖 UI 初始化完成');
    }

    /**
     * 綁定 UI 事件
     */
    bindUIEvents() {
        // 返回按鈕
        this.bindBackButton();
        
        // 提示按鈕
        this.bindHintButton();
        
        // 重新排列按鈕
        this.bindShuffleButton();
        
        // 模態框按鈕
        this.bindModalButtons();
        
        // 照片選擇
        this.bindPhotoSelection();
        
        // 鍵盤快捷鍵
        this.bindKeyboardShortcuts();
    }

    /**
     * 綁定返回按鈕
     */
    bindBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                playSound('location-click');
                this.showExitConfirmation();
            });
        }
    }

    /**
     * 綁定提示按鈕
     */
    bindHintButton() {
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                this.useHint();
            });
        }
    }

    /**
     * 綁定重新排列按鈕
     */
    bindShuffleButton() {
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                this.shufflePieces();
            });
        }
    }

    /**
     * 綁定模態框按鈕
     */
    bindModalButtons() {
        // 影片按鈕
        const videoBtn = document.getElementById('video-btn');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => {
                this.showVideoModal();
            });
        }

        // 重新開始按鈕
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }

        // 關閉影片按鈕
        const closeVideoBtn = document.getElementById('close-video');
        if (closeVideoBtn) {
            closeVideoBtn.addEventListener('click', () => {
                this.closeVideoModal();
            });
        }
    }

    /**
     * 綁定照片選擇
     */
    bindPhotoSelection() {
        // 照片縮圖點擊事件會在 puzzle-engine.js 中處理
        // 這裡只處理 UI 反饋
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('photo-thumbnail')) {
                this.onPhotoSelected(e.target.dataset.photoId);
            }
        });
    }

    /**
     * 綁定鍵盤快捷鍵
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC 鍵返回地圖
            if (e.key === 'Escape') {
                this.showExitConfirmation();
            }
            
            // H 鍵使用提示
            if (e.key === 'h' || e.key === 'H') {
                this.useHint();
            }
            
            // R 鍵重新排列
            if (e.key === 'r' || e.key === 'R') {
                this.shufflePieces();
            }
            
            // 數字鍵選擇照片
            if (e.key >= '1' && e.key <= '3') {
                const photoIndex = parseInt(e.key) - 1;
                this.selectPhotoByIndex(photoIndex);
            }
        });
    }

    /**
     * 設置動畫效果
     */
    setupAnimations() {
        // 添加碎片進入動畫
        this.addPieceEnterAnimation();
        
        // 添加完成動畫
        this.addCompletionAnimation();
        
        // 添加提示動畫
        this.addHintAnimation();
    }

    /**
     * 添加碎片進入動畫
     */
    addPieceEnterAnimation() {
        const style = document.createElement('style');
        style.textContent = `
            .puzzle-piece {
                animation: pieceEnter 0.5s ease-out;
            }
            
            @keyframes pieceEnter {
                0% {
                    opacity: 0;
                    transform: scale(0.8) rotate(-10deg);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) rotate(0deg);
                }
            }
            
            .puzzle-piece.dragging {
                animation: pieceDrag 0.3s ease-out;
            }
            
            @keyframes pieceDrag {
                0% { transform: scale(1); }
                100% { transform: scale(1.1) rotate(5deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加完成動畫
     */
    addCompletionAnimation() {
        const style = document.createElement('style');
        style.textContent = `
            .puzzle-grid.completed {
                animation: gridComplete 1s ease-out;
            }
            
            @keyframes gridComplete {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .grid-slot.correct {
                animation: slotCorrect 0.6s ease-out;
            }
            
            @keyframes slotCorrect {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加提示動畫
     */
    addHintAnimation() {
        const style = document.createElement('style');
        style.textContent = `
            .photo-hint-overlay {
                animation: hintFadeIn 0.3s ease-out;
            }
            
            @keyframes hintFadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            
            .hint-image {
                animation: hintPulse 2s ease-in-out infinite;
            }
            
            @keyframes hintPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 照片被選中時的回調
     */
    onPhotoSelected(photoId) {
        console.log(`照片被選中: ${photoId}`);
        
        // 播放選擇音效
        playSound('cake-select');
        
        // 更新 UI 狀態
        this.updatePhotoSelection(photoId);
    }

    /**
     * 更新照片選擇狀態
     */
    updatePhotoSelection(selectedPhotoId) {
        // 移除所有選中狀態
        document.querySelectorAll('.photo-thumbnail').forEach(thumb => {
            thumb.classList.remove('selected');
        });
        
        // 選中當前照片
        const selectedThumb = document.querySelector(`[data-photo-id="${selectedPhotoId}"]`);
        if (selectedThumb) {
            selectedThumb.classList.add('selected');
        }
        
        // 激活對應的拼圖網格
        this.activateGrid(selectedPhotoId);
    }

    /**
     * 激活拼圖網格
     */
    activateGrid(photoId) {
        // 移除其他網格的激活狀態
        document.querySelectorAll('.puzzle-grid').forEach(grid => {
            grid.classList.remove('active');
            const status = grid.querySelector('.grid-status');
            if (status && !grid.classList.contains('completed')) {
                status.textContent = '等待中';
                status.className = 'grid-status waiting';
            }
        });
        
        // 激活當前網格
        const grid = document.querySelector(`[data-grid-photo="${photoId}"]`);
        if (grid && !grid.classList.contains('completed')) {
            grid.classList.add('active');
            const status = grid.querySelector('.grid-status');
            if (status) {
                status.textContent = '進行中';
                status.className = 'grid-status active';
            }
        }
    }

    /**
     * 使用提示
     */
    useHint() {
        // 這個功能會在 puzzle-engine.js 中實現
        // 這裡只處理 UI 反饋
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn && !hintBtn.disabled) {
            playSound('cake-select');
            
            // 添加按鈕動畫
            hintBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                hintBtn.style.transform = '';
            }, 150);
        }
    }

    /**
     * 重新排列碎片
     */
    shufflePieces() {
        playSound('place');
        
        // 添加重新排列動畫
        const pool = document.getElementById('piece-pool');
        if (pool) {
            pool.style.animation = 'shuffle 0.5s ease-in-out';
            setTimeout(() => {
                pool.style.animation = '';
            }, 500);
        }
        
        // 添加重新排列動畫樣式
        this.addShuffleAnimation();
    }

    /**
     * 添加重新排列動畫
     */
    addShuffleAnimation() {
        if (document.getElementById('shuffle-animation')) return;
        
        const style = document.createElement('style');
        style.id = 'shuffle-animation';
        style.textContent = `
            @keyframes shuffle {
                0% { transform: scale(1); }
                50% { transform: scale(1.02) rotate(1deg); }
                100% { transform: scale(1) rotate(0deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 顯示退出確認
     */
    showExitConfirmation() {
        const confirmed = confirm('確定要返回地圖嗎？\n遊戲進度將會保存。');
        if (confirmed) {
            window.location.href = 'index.html';
        }
    }

    /**
     * 顯示影片模態框
     */
    showVideoModal() {
        // 生日祝福影片 ID
        const videoId = 'MwrbNGJi-oQ';
        
        const videoModal = document.getElementById('video-modal');
        const iframe = document.getElementById('birthday-video');
        
        if (videoModal && iframe) {
            // 顯示載入提示
            this.showNotification('正在載入生日祝福影片...', 'info');
            
            // 設置 YouTube 嵌入鏈接，支持 Shorts 格式
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
            videoModal.classList.remove('hidden');
            videoModal.classList.add('show');
            
            playSound('location-click');
            
            // 監聽視頻載入完成
            iframe.onload = () => {
                console.log('🎬 生日祝福影片載入完成:', videoId);
                this.showNotification('影片載入完成！', 'success');
            };
            
            console.log('🎬 播放生日祝福影片:', videoId);
        }
    }

    /**
     * 關閉影片模態框
     */
    closeVideoModal() {
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
     * 重新開始遊戲
     */
    restartGame() {
        const confirmed = confirm('確定要重新開始遊戲嗎？\n當前進度將會丟失。');
        if (confirmed) {
            // 重新載入頁面
            window.location.reload();
        }
    }

    /**
     * 根據索引選擇照片
     */
    selectPhotoByIndex(index) {
        const thumbnails = document.querySelectorAll('.photo-thumbnail');
        if (thumbnails[index]) {
            thumbnails[index].click();
        }
    }

    /**
     * 顯示通知
     */
    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 添加通知樣式
        this.addNotificationStyles();
        
        // 顯示動畫
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自動隱藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 獲取通知圖標
     */
    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'celebration': '🎉'
        };
        return icons[type] || icons['info'];
    }

    /**
     * 添加通知樣式
     */
    addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 300px;
            }
            
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 16px;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 20px;
            }
            
            .notification-message {
                font-family: 'Bubblegum Sans', cursive;
                font-size: 14px;
                color: #333;
            }
            
            .notification-success {
                border-left: 4px solid #4CAF50;
            }
            
            .notification-warning {
                border-left: 4px solid #FF9800;
            }
            
            .notification-error {
                border-left: 4px solid #F44336;
            }
            
            .notification-celebration {
                border-left: 4px solid #FF69B4;
                background: linear-gradient(135deg, #FFB6C1, #FFF8DC);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 更新進度顯示
     */
    updateProgress(completed, total) {
        const progressFill = document.getElementById('progress-fill');
        const progressCount = document.getElementById('progress-count');
        
        if (progressFill) {
            const percent = (completed / total) * 100;
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressCount) {
            progressCount.textContent = `${completed} / ${total}`;
        }
    }

    /**
     * 顯示完成慶祝
     */
    showCompletionCelebration() {
        // 創建慶祝效果
        this.createCelebrationEffect();
        
        // 顯示完成模態框
        const modal = document.getElementById('completion-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
        
        // 播放慶祝音效
        playSound('final-celebration');
    }

    /**
     * 創建慶祝效果
     */
    createCelebrationEffect() {
        // 創建彩帶效果
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 50);
        }
    }

    /**
     * 創建彩帶
     */
    createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${this.getRandomColor()};
            left: ${Math.random() * 100}vw;
            top: -10px;
            z-index: 2000;
            animation: confettiFall 3s linear forwards;
            pointer-events: none;
        `;
        
        document.body.appendChild(confetti);
        
        // 添加彩帶動畫樣式
        this.addConfettiStyles();
        
        // 3秒後移除
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 3000);
    }

    /**
     * 添加彩帶動畫樣式
     */
    addConfettiStyles() {
        if (document.getElementById('confetti-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 獲取隨機顏色
     */
    getRandomColor() {
        const colors = ['#FF69B4', '#FFD700', '#87CEEB', '#98FF98', '#DDA0DD', '#FFA500'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

/**
 * 創建全局 UI 實例
 */
const puzzleUI = new PuzzleUI();

/**
 * 初始化拼圖 UI
 */
export function initPuzzleUI() {
    puzzleUI.init();
}

/**
 * 獲取 UI 實例
 */
export function getPuzzleUI() {
    return puzzleUI;
}

/**
 * 當頁面載入完成時初始化 UI
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initPuzzleUI();
    }, 500);
});

/**
 * 導出 UI 相關函數
 * initPuzzleUI 和 getPuzzleUI 已在函數定義時導出
 */
export { 
    PuzzleUI
};
