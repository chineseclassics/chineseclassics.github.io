/* ========================================
   Alice in Birthdayland - 核心應用邏輯
   ======================================== */

import { initCandyParticles, createCelebrationParticles } from '../features/particles-effect.js';
import { initMapNavigation } from '../features/map-navigation.js';
import { initAudioSystem, playSound, soundInstances } from '../utils/audio-manager.js';
import { initGiftBoxIntro } from '../features/gift-box-intro.js';

/**
 * 應用狀態管理
 */
const AppState = {
    currentScreen: 'map',
    isAudioEnabled: true,
    progress: {
        puzzle: false,
        cake: false
    },
    user: {
        name: '張思味',
        nickname: '枸杞',
        englishName: 'Goji',
        age: 7,
        brother: 'Amos (毛豆)'
    }
};

/**
 * DOM 元素引用
 */
const Elements = {
    birthdaylandMap: null,
    particlesContainer: null
};

/**
 * 初始化應用
 */
function initApp() {
    console.log('🎂 Alice in Birthdayland 初始化中...');
    console.log(`歡迎 ${AppState.user.name}（${AppState.user.nickname}）來到生日樂園！`);
    
    // 獲取 DOM 元素
    Elements.birthdaylandMap = document.getElementById('birthdayland-map');
    Elements.particlesContainer = document.getElementById('particles-js');
    
    // 初始化各個模組
    initializeModules();
    
    // 綁定全局事件
    bindGlobalEvents();
    
    console.log('✨ 應用初始化完成！');
}

/**
 * 初始化各個模組
 */
function initializeModules() {
    // 初始化音效系統
    initAudioSystem();
    
    // 初始化禮物盒開場
    initGiftBoxIntro();
    
    // 初始化粒子效果
    initCandyParticles();
    
    // 初始化地圖導航
    initMapNavigation();
    
    // 播放背景音樂（延遲更長，等禮物盒打開後播放）
    setTimeout(() => {
        playBackgroundMusic();
    }, 3000);
}

/**
 * 播放背景音樂
 */
function playBackgroundMusic() {
    // 等待音效系統完全初始化
    setTimeout(() => {
        const bgmAudio = soundInstances['map-bgm'];
        if (bgmAudio) {
            bgmAudio.loop = true;
            bgmAudio.volume = 0.25; // 背景音樂音量較低
            
            console.log('🎵 準備播放背景音樂...');
            
            // 綁定音樂控制按鈕
            const musicToggle = document.getElementById('music-toggle');
            if (musicToggle) {
                musicToggle.addEventListener('click', () => {
                    if (bgmAudio.paused) {
                        bgmAudio.play().then(() => {
                            musicToggle.classList.remove('muted');
                            console.log('🎵 背景音樂開始播放');
                        });
                    } else {
                        bgmAudio.pause();
                        musicToggle.classList.add('muted');
                        console.log('🔇 背景音樂已暫停');
                    }
                });
            }
            
            // 用戶第一次交互後自動播放（瀏覽器限制）
            const playBGM = () => {
                bgmAudio.play()
                    .then(() => {
                        console.log('🎵 背景音樂自動播放');
                        if (musicToggle) {
                            musicToggle.classList.remove('muted');
                        }
                    })
                    .catch(err => {
                        console.log('背景音樂需要用戶交互才能播放');
                    });
            };
            
            // 監聽多種交互事件
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, playBGM, { once: true });
            });
        }
    }, 2000);
}

/**
 * 綁定全局事件
 */
function bindGlobalEvents() {
    // 處理頁面可見性變化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 處理窗口大小變化
    window.addEventListener('resize', handleWindowResize);
    
    // 處理鍵盤事件
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * 處理頁面可見性變化
 */
function handleVisibilityChange() {
    if (document.hidden) {
        console.log('頁面隱藏，暫停動畫');
        // 可以暫停一些動畫或音效
    } else {
        console.log('頁面顯示，恢復動畫');
        // 恢復動畫和音效
    }
}

/**
 * 處理窗口大小變化
 */
function handleWindowResize() {
    console.log('窗口大小變化，重新調整佈局');
    // 可以重新計算粒子效果或其他響應式元素
}

/**
 * 處理鍵盤事件
 */
function handleKeyDown(event) {
    // ESC 鍵返回主頁
    if (event.key === 'Escape') {
        if (AppState.currentScreen !== 'map') {
            returnToMap();
        }
    }
    
    // 數字鍵快速導航
    if (event.key >= '1' && event.key <= '4') {
        const locationIndex = parseInt(event.key) - 1;
        const locations = document.querySelectorAll('.location');
        if (locations[locationIndex]) {
            locations[locationIndex].click();
        }
    }
}

/**
 * 返回地圖
 */
function returnToMap() {
    AppState.currentScreen = 'map';
    window.location.href = 'index.html';
}

/**
 * 顯示通知
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${getNotificationIcon(type)}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 添加樣式
    addNotificationStyles();
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

/**
 * 獲取通知圖標
 */
function getNotificationIcon(type) {
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
function addNotificationStyles() {
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
 * 創建慶祝效果
 */
export function createCelebration() {
    console.log('🎉 創建慶祝效果！');
    
    // 播放慶祝音效
    playSound('final-celebration');
    
    // 創建粒子慶祝效果
    createCelebrationParticles();
    
    // 顯示慶祝通知
    showNotification('恭喜完成！', 'celebration', 5000);
}

/**
 * 更新進度
 */
export function updateProgress(game, completed) {
    AppState.progress[game] = completed;
    console.log(`遊戲進度更新: ${game} = ${completed}`);
    
    // 檢查是否完成所有遊戲
    const allCompleted = Object.values(AppState.progress).every(p => p);
    if (allCompleted) {
        createCelebration();
    }
}

/**
 * 獲取用戶信息
 */
export function getUserInfo() {
    return AppState.user;
}

/**
 * 當 DOM 載入完成時初始化
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/**
 * 導出給其他模組使用
 * 注意：showNotification, createCelebration, updateProgress, getUserInfo 已在函數定義時導出
 */
export { 
    AppState, 
    Elements
};

