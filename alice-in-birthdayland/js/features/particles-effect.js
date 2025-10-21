/* ========================================
   Alice in Birthdayland - 粒子效果
   ======================================== */

/**
 * 初始化甜品主題的粒子動畫
 * 包含：星星、愛心、杯子蛋糕、棒棒糖等甜點元素
 */

export function initCandyParticles() {
    console.log('🍭 初始化甜品粒子效果...');
    
    // 檢查 particles.js 是否已載入
    if (typeof particlesJS === 'undefined') {
        console.warn('Particles.js 未載入，跳過粒子效果');
        return;
    }

    // 配置粒子效果
    const config = {
        particles: {
            number: {
                value: 60,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: ['#FFB6C1', '#FFD700', '#98FF98', '#DDA0DD', '#87CEEB', '#FF69B4']
            },
            shape: {
                type: 'circle',
                stroke: {
                    width: 0,
                    color: '#000000'
                }
            },
            opacity: {
                value: 0.7,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.3,
                    sync: false
                }
            },
            size: {
                value: 12,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 5,
                    sync: false
                }
            },
            line_linked: {
                enable: false
            },
            move: {
                enable: true,
                speed: 1.5,
                direction: 'top',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false,
                attract: {
                    enable: false
                }
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'bubble'
                },
                onclick: {
                    enable: true,
                    mode: 'repulse'
                },
                resize: true
            },
            modes: {
                bubble: {
                    distance: 200,
                    size: 8,
                    duration: 2,
                    opacity: 0.8,
                    speed: 3
                },
                repulse: {
                    distance: 200,
                    duration: 0.4
                }
            }
        },
        retina_detect: true
    };

    // 初始化粒子效果
    particlesJS('particles-js', config);

    // 添加甜點圖標粒子（使用 CSS 偽元素）
    addSweetParticles();
}

/**
 * 添加甜點圖標粒子
 */
function addSweetParticles() {
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) return;

    // 甜點圖標列表
    const sweetIcons = ['⭐', '❤️', '🧁', '🍭', '🍩', '🍰', '🍪', '🍬'];
    
    // 創建甜點粒子
    for (let i = 0; i < 20; i++) {
        const sweetParticle = document.createElement('div');
        sweetParticle.className = 'sweet-particle';
        sweetParticle.textContent = sweetIcons[Math.floor(Math.random() * sweetIcons.length)];
        sweetParticle.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 20 + 15}px;
            color: ${getRandomSweetColor()};
            pointer-events: none;
            user-select: none;
            animation: sweetFloat ${Math.random() * 10 + 15}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            z-index: 1;
        `;
        
        particlesContainer.appendChild(sweetParticle);
    }

    // 添加甜點粒子動畫樣式
    addSweetParticleStyles();
}

/**
 * 添加甜點粒子動畫樣式
 */
function addSweetParticleStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes sweetFloat {
            0% {
                transform: translateY(100vh) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100px) rotate(360deg);
                opacity: 0;
            }
        }
        
        .sweet-particle {
            text-shadow: 0 0 10px rgba(255,255,255,0.8);
            filter: drop-shadow(0 0 5px rgba(0,0,0,0.3));
        }
    `;
    document.head.appendChild(style);
}

/**
 * 獲取隨機甜點顏色
 */
function getRandomSweetColor() {
    const colors = [
        '#FFB6C1', // 草莓粉
        '#FFD700', // 金黃
        '#98FF98', // 薄荷綠
        '#DDA0DD', // 藍莓紫
        '#87CEEB', // 天藍
        '#FF69B4', // 熱粉紅
        '#FFA500', // 橙色
        '#FFC0CB'  // 粉紅
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 創建特殊慶祝粒子效果
 */
export function createCelebrationParticles() {
    const container = document.getElementById('particles-js');
    if (!container) return;

    // 創建慶祝粒子
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'celebration-particle';
        particle.textContent = ['🎉', '✨', '🎊', '🌟', '💫'][Math.floor(Math.random() * 5)];
        particle.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 30 + 20}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: celebrationBurst 2s ease-out forwards;
            animation-delay: ${Math.random() * 0.5}s;
            pointer-events: none;
            z-index: 10;
        `;
        
        container.appendChild(particle);
        
        // 2秒後移除粒子
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }

    // 添加慶祝動畫樣式
    addCelebrationStyles();
}

/**
 * 添加慶祝動畫樣式
 */
function addCelebrationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes celebrationBurst {
            0% {
                transform: scale(0) rotate(0deg);
                opacity: 1;
            }
            50% {
                transform: scale(1.2) rotate(180deg);
                opacity: 1;
            }
            100% {
                transform: scale(0.5) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * 當頁面載入完成時初始化粒子效果
 */
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保頁面完全載入
    setTimeout(() => {
        initCandyParticles();
    }, 500);
});

/**
 * 導出函數供其他模組使用
 * createCelebrationParticles 已在函數定義時導出
 */
