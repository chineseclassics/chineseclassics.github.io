/**
 * 神秘禮物盒開場動畫
 */

import { playSound } from '../utils/audio-manager.js';

/**
 * 初始化禮物盒開場
 */
export function initGiftBoxIntro() {
    console.log('🎁 初始化禮物盒開場動畫...');
    
    createStarryBackground();
    createMagicParticles();
    bindGiftBoxEvents();
}

/**
 * 創建星空背景
 */
function createStarryBackground() {
    const starsContainer = document.querySelector('.stars-background');
    if (!starsContainer) return;
    
    // 創建 100 顆星星
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        starsContainer.appendChild(star);
    }
}

/**
 * 創建魔法粒子
 */
function createMagicParticles() {
    const particlesContainer = document.querySelector('.magic-particles');
    if (!particlesContainer) return;
    
    // 創建 20 個粒子，向四周擴散
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'magic-particle';
        
        // 計算粒子飛出的方向
        const angle = (Math.PI * 2 * i) / 20;
        const distance = 150 + Math.random() * 100;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.animationDelay = `${Math.random() * 0.2}s`;
        
        particlesContainer.appendChild(particle);
    }
}

/**
 * 綁定禮物盒點擊事件
 */
function bindGiftBoxEvents() {
    const giftBoxWrapper = document.querySelector('.gift-box-wrapper');
    const giftBox = document.querySelector('.gift-box');
    const giftIntro = document.getElementById('gift-intro');
    const birthdaylandMap = document.getElementById('birthdayland-map');
    
    if (!giftBoxWrapper || !giftBox || !giftIntro) return;
    
    // 點擊禮物盒打開
    giftBoxWrapper.addEventListener('click', () => {
        openGiftBox(giftBox, giftIntro, birthdaylandMap);
    });
    
    // 添加觸摸反饋
    giftBoxWrapper.addEventListener('touchstart', () => {
        giftBoxWrapper.style.transform = 'scale(0.95)';
    });
    
    giftBoxWrapper.addEventListener('touchend', () => {
        giftBoxWrapper.style.transform = 'scale(1)';
    });
}

/**
 * 打開禮物盒動畫
 */
function openGiftBox(giftBox, giftIntro, birthdaylandMap) {
    console.log('🎉 打開禮物盒！');
    
    // 播放音效
    playSound('final-celebration');
    
    // 添加打開動畫類
    giftBox.classList.add('opening');
    
    // 移除點擊事件，防止重複點擊
    const wrapper = document.querySelector('.gift-box-wrapper');
    if (wrapper) {
        wrapper.style.pointerEvents = 'none';
    }
    
    // 慶祝動畫序列
    setTimeout(() => {
        // 1.5 秒後開始淡出禮物盒場景
        giftIntro.classList.add('hidden');
        
        // 顯示地圖
        if (birthdaylandMap) {
            birthdaylandMap.style.opacity = '0';
            birthdaylandMap.style.display = 'block';
            
            setTimeout(() => {
                birthdaylandMap.style.transition = 'opacity 1s ease';
                birthdaylandMap.style.opacity = '1';
                
                // 觸發地圖入場動畫
                triggerMapEntranceAnimation();
                
                // 2.5 秒後完全移除禮物盒 DOM
                setTimeout(() => {
                    giftIntro.remove();
                    console.log('✨ 禮物盒場景已移除');
                }, 1000);
            }, 100);
        }
    }, 1500);
}

/**
 * 觸發地圖入場動畫
 */
function triggerMapEntranceAnimation() {
    const locations = document.querySelectorAll('.location');
    const banner = document.querySelector('.birthday-banner');
    
    // 橫幅從上方滑入
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-50px)';
        banner.style.transition = 'all 1s ease 0.3s';
        
        setTimeout(() => {
            banner.style.opacity = '1';
            banner.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // 建築物依次彈出
    locations.forEach((location, index) => {
        location.style.opacity = '0';
        location.style.transform = 'scale(0.5) translateY(50px)';
        location.style.transition = `all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${0.5 + index * 0.2}s`;
        
        setTimeout(() => {
            location.style.opacity = '1';
            location.style.transform = 'scale(1) translateY(0)';
            
            // 播放彈出音效
            if (index < 2) { // 只為前兩個活動建築播放音效
                setTimeout(() => {
                    playSound('location-click');
                }, 50);
            }
        }, 100);
    });
    
    console.log('🏰 地圖入場動畫已觸發');
}

/**
 * 創建閃光粒子效果
 */
function createSparkleEffect(container) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-effect';
    sparkle.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, white, transparent);
        border-radius: 50%;
        pointer-events: none;
        animation: sparkle-pop 0.6s ease-out;
    `;
    
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 100}%`;
    
    container.appendChild(sparkle);
    
    setTimeout(() => sparkle.remove(), 600);
}

// 添加閃光動畫 CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes sparkle-pop {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1.5); opacity: 1; }
        100% { transform: scale(0.5); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✨ 禮物盒開場模組已加載');

