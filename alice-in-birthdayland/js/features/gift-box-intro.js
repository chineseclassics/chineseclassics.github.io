/**
 * 神秘禮物盒開場動畫
 */

import { playSound, soundInstances } from '../utils/audio-manager.js';

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
    
    if (!giftBoxWrapper || !giftBox || !giftIntro) {
        console.error('禮物盒元素未找到');
        return;
    }
    
    // 點擊禮物盒打開
    giftBoxWrapper.addEventListener('click', (e) => {
        e.preventDefault();
        openGiftBox(giftBox, giftIntro, birthdaylandMap);
    });
    
    // 添加觸摸反饋
    giftBoxWrapper.addEventListener('touchstart', (e) => {
        e.preventDefault();
        giftBoxWrapper.style.transform = 'scale(0.95)';
    });
    
    giftBoxWrapper.addEventListener('touchend', (e) => {
        e.preventDefault();
        giftBoxWrapper.style.transform = 'scale(1)';
    });
    
    // 添加鍵盤支持（無障礙訪問）
    giftBoxWrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openGiftBox(giftBox, giftIntro, birthdaylandMap);
        }
    });
    
    // 設置可聚焦
    giftBoxWrapper.setAttribute('tabindex', '0');
    giftBoxWrapper.setAttribute('role', 'button');
    giftBoxWrapper.setAttribute('aria-label', '點擊打開生日驚喜禮物盒');
    
    // 也為整個開場容器添加點擊事件，讓用戶可以點擊任何地方打開禮物盒
    giftIntro.addEventListener('click', (e) => {
        // 如果點擊的不是禮物盒本身，也觸發打開
        if (!giftBoxWrapper.contains(e.target)) {
            e.preventDefault();
            openGiftBox(giftBox, giftIntro, birthdaylandMap);
        }
    });
}

/**
 * 打開禮物盒動畫
 */
function openGiftBox(giftBox, giftIntro, birthdaylandMap) {
    console.log('🎉 打開禮物盒！');
    
    // 移除點擊事件，防止重複點擊
    const wrapper = document.querySelector('.gift-box-wrapper');
    if (wrapper) {
        wrapper.style.pointerEvents = 'none';
    }
    
    // 添加打開動畫類
    giftBox.classList.add('opening');
    
    // 播放音效（延遲一點，讓動畫開始）
    setTimeout(() => {
        try {
            playSound('final-celebration');
        } catch (error) {
            console.warn('音效播放失敗，繼續動畫:', error);
        }
    }, 200);
    
    // 立即嘗試播放背景音樂（利用音效播放作為用戶交互）
    setTimeout(() => {
        try {
            const bgmAudio = soundInstances['map-bgm'];
            if (bgmAudio) {
                bgmAudio.loop = true;
                bgmAudio.volume = 0.25;
                bgmAudio.play()
                    .then(() => {
                        console.log('🎵 背景音樂在禮物盒打開時開始播放');
                        const musicToggle = document.getElementById('music-toggle');
                        if (musicToggle) {
                            musicToggle.classList.remove('muted');
                        }
                    })
                    .catch(err => {
                        console.log('🎵 背景音樂需要更多用戶交互');
                    });
            }
        } catch (error) {
            console.warn('背景音樂播放失敗:', error);
        }
    }, 500);
    
    // 慶祝動畫序列
    setTimeout(() => {
        // 1.8 秒後開始淡出禮物盒場景
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
                
                // 觸發背景音樂播放
                triggerBackgroundMusic();
                
                // 顯示音樂控制提示
                showMusicControlHint();
                
                // 2.5 秒後完全移除禮物盒 DOM
                setTimeout(() => {
                    try {
                        giftIntro.remove();
                        console.log('✨ 禮物盒場景已移除');
                        
                        // 清理動畫相關的樣式
                        document.querySelectorAll('.gift-box, .gift-lid, .gift-body').forEach(el => {
                            el.style.animation = 'none';
                            el.style.transition = 'none';
                        });
                    } catch (error) {
                        console.warn('移除禮物盒場景時發生錯誤:', error);
                    }
                }, 1000);
            }, 100);
        }
    }, 1800);
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
 * 觸發背景音樂播放
 */
function triggerBackgroundMusic() {
    // 延遲一點播放，讓地圖完全顯示
    setTimeout(() => {
        try {
            // 模擬用戶交互來觸發背景音樂
            const bgmAudio = soundInstances['map-bgm'];
            if (bgmAudio) {
                bgmAudio.loop = true;
                bgmAudio.volume = 0.25;
                
                // 嘗試播放背景音樂
                bgmAudio.play()
                    .then(() => {
                        console.log('🎵 背景音樂自動播放成功');
                        
                        // 更新音樂控制按鈕狀態
                        const musicToggle = document.getElementById('music-toggle');
                        if (musicToggle) {
                            musicToggle.classList.remove('muted');
                        }
                    })
                    .catch(err => {
                        console.log('🎵 背景音樂需要用戶交互，等待中...');
                        
                        // 如果自動播放失敗，設置用戶交互監聽
                        const enableBGM = () => {
                            bgmAudio.play()
                                .then(() => {
                                    console.log('🎵 背景音樂開始播放');
                                    const musicToggle = document.getElementById('music-toggle');
                                    if (musicToggle) {
                                        musicToggle.classList.remove('muted');
                                    }
                                })
                                .catch(e => console.warn('背景音樂播放失敗:', e));
                        };
                        
                        // 監聽用戶交互
                        ['click', 'touchstart', 'keydown'].forEach(event => {
                            document.addEventListener(event, enableBGM, { once: true });
                        });
                    });
            }
        } catch (error) {
            console.warn('觸發背景音樂時發生錯誤:', error);
        }
    }, 1000);
}

/**
 * 顯示音樂控制提示
 */
function showMusicControlHint() {
    setTimeout(() => {
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            // 添加脈衝動畫提示
            musicToggle.style.animation = 'musicPulse 2s ease-in-out infinite';
            
            // 添加提示樣式
            addMusicHintStyles();
            
            // 3秒後移除動畫
            setTimeout(() => {
                musicToggle.style.animation = '';
            }, 3000);
        }
    }, 2000);
}

/**
 * 添加音樂提示樣式
 */
function addMusicHintStyles() {
    if (document.getElementById('music-hint-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'music-hint-styles';
    style.textContent = `
        @keyframes musicPulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(255, 105, 180, 0.7);
            }
            50% { 
                transform: scale(1.1);
                box-shadow: 0 0 0 10px rgba(255, 105, 180, 0);
            }
        }
    `;
    document.head.appendChild(style);
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


