/* ========================================
   Alice in Birthdayland - 地圖導航
   ======================================== */

/**
 * 處理地圖建築的點擊導航
 * 包含：可進入遊戲、鎖定提示、音效反饋
 */

import { playSound } from '../utils/audio-manager.js';

/**
 * 初始化地圖導航
 */
export function initMapNavigation() {
    console.log('🗺️ 初始化地圖導航...');
    
    // 綁定所有建築的點擊事件
    bindLocationEvents();
    
    // 添加建築懸停效果
    addHoverEffects();
}

/**
 * 綁定建築點擊事件
 */
function bindLocationEvents() {
    const locations = document.querySelectorAll('.location');
    
    locations.forEach(location => {
        location.addEventListener('click', handleLocationClick);
        location.addEventListener('touchstart', handleLocationTouch, { passive: true });
    });
}

/**
 * 處理建築點擊
 */
function handleLocationClick(event) {
    event.preventDefault();
    const location = event.currentTarget;
    const status = location.dataset.status;
    const url = location.dataset.url;
    const game = location.dataset.game;
    
    console.log(`點擊建築: ${game}, 狀態: ${status}`);
    
    if (status === 'coming-soon') {
        // 顯示"即將推出"提示
        showComingSoonModal(game);
        playSound('locked');
    } else if (status === 'active' && url) {
        // 跳轉到遊戲頁面
        playSound('location-click');
        navigateToGame(url, game);
    }
}

/**
 * 處理觸摸事件（移動端）
 */
function handleLocationTouch(event) {
    const location = event.currentTarget;
    location.classList.add('touched');
    
    // 移除觸摸效果
    setTimeout(() => {
        location.classList.remove('touched');
    }, 200);
}

/**
 * 顯示"即將推出"模態框
 */
function showComingSoonModal(gameName) {
    const messages = {
        'slime': {
            title: '🧪 史萊姆實驗室',
            message: '正在準備中，敬請期待！\n\n你將能夠：\n• 調配彩色史萊姆\n• 添加閃粉和珠子\n• 創造獨特質感',
            icon: '🧪'
        },
        'bathroom': {
            title: '🛁 夢幻廁所設計室',
            message: '正在建造中，敬請期待！\n\n你將能夠：\n• 設計個性化廁所\n• 選擇瓷磚和裝飾\n• 創造夢幻空間',
            icon: '🛁'
        }
    };
    
    const gameInfo = messages[gameName];
    if (!gameInfo) return;
    
    // 創建模態框
    const modal = createModal({
        title: gameInfo.title,
        content: gameInfo.message,
        icon: gameInfo.icon,
        buttons: [
            {
                text: '知道了',
                action: () => closeModal(modal)
            }
        ]
    });
    
    document.body.appendChild(modal);
    
    // 顯示動畫
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

/**
 * 導航到遊戲頁面
 */
function navigateToGame(url, gameName) {
    console.log(`導航到遊戲: ${gameName}, URL: ${url}`);
    
    // 添加導航動畫
    const location = document.querySelector(`[data-game="${gameName}"]`);
    if (location) {
        location.classList.add('navigating');
    }
    
    // 延遲跳轉，讓動畫完成
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

/**
 * 添加懸停效果
 */
function addHoverEffects() {
    const locations = document.querySelectorAll('.location');
    
    locations.forEach(location => {
        location.addEventListener('mouseenter', () => {
            if (location.dataset.status === 'active') {
                playSound('hover');
            }
        });
    });
}

/**
 * 創建模態框
 */
function createModal({ title, content, icon, buttons }) {
    const modal = document.createElement('div');
    modal.className = 'coming-soon-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-icon">${icon}</div>
                    <h2 class="modal-title">${title}</h2>
                </div>
                <div class="modal-body">
                    <p class="modal-message">${content.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="modal-btn ${btn.class || ''}" data-action="${btn.action.name}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // 添加樣式
    addModalStyles();
    
    // 綁定按鈕事件
    modal.querySelectorAll('.modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const actionName = e.target.dataset.action;
            const action = buttons.find(b => b.action.name === actionName);
            if (action) {
                action.action();
            }
        });
    });
    
    return modal;
}

/**
 * 關閉模態框
 */
function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

/**
 * 添加模態框樣式
 */
function addModalStyles() {
    if (document.getElementById('modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
        .coming-soon-modal {
            position: fixed;
            inset: 0;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .coming-soon-modal.show {
            opacity: 1;
        }
        
        .modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .modal-content {
            background: linear-gradient(135deg, #FFF8DC, #FFB6C1);
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .coming-soon-modal.show .modal-content {
            transform: scale(1);
        }
        
        .modal-header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .modal-icon {
            font-size: 48px;
            margin-bottom: 10px;
            animation: bounce 2s infinite;
        }
        
        .modal-title {
            font-family: 'Fredoka One', cursive;
            font-size: 24px;
            color: #333;
            margin: 0;
        }
        
        .modal-body {
            margin-bottom: 20px;
        }
        
        .modal-message {
            font-family: 'Bubblegum Sans', cursive;
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            text-align: center;
        }
        
        .modal-footer {
            display: flex;
            justify-content: center;
            gap: 10px;
        }
        
        .modal-btn {
            background: linear-gradient(135deg, #FF69B4, #FFB6C1);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-family: 'Fredoka One', cursive;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255,105,180,0.3);
        }
        
        .modal-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255,105,180,0.4);
        }
        
        .modal-btn:active {
            transform: translateY(0);
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-10px);
            }
            60% {
                transform: translateY(-5px);
            }
        }
        
        /* 建築導航動畫 */
        .location.navigating {
            animation: navigatePulse 0.3s ease-out;
        }
        
        @keyframes navigatePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .location.touched {
            transform: scale(0.95);
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * 當頁面載入完成時初始化導航
 */
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保所有元素都已載入
    setTimeout(() => {
        initMapNavigation();
    }, 500);
});

/**
 * 導出函數供其他模組使用
 */
export { showComingSoonModal, navigateToGame };
