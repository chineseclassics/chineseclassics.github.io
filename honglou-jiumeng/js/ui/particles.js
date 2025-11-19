/**
 * 粒子系統模塊
 * 用於顯示季節性氛圍效果（花瓣、螢火蟲、落葉、雪花）
 */

import { gameData } from '../state.js';

class ParticleSystem {
    constructor() {
        this.container = null;
        this.activeParticles = [];
        this.maxParticles = 30; // 最大粒子數，避免性能問題
        this.intervalId = null;
        this.currentSeason = '';
    }

    /**
     * 初始化粒子系統
     * @param {string} containerId - 容器元素 ID
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Particle container #${containerId} not found!`);
            return;
        }
        // 啟動循環
        this.startLoop();
    }

    /**
     * 啟動生成循環
     */
    startLoop() {
        if (this.intervalId) clearInterval(this.intervalId);
        
        // 每 800ms 嘗試生成一個粒子
        this.intervalId = setInterval(() => {
            if (document.hidden) return; // 頁面不可見時暫停
            this.spawnParticle();
        }, 800);

        // 動畫循環用於更新粒子位置（使用 CSS 動畫，這裡主要用於清理）
        this.cleanupLoop();
    }

    /**
     * 清理循環
     */
    cleanupLoop() {
        setInterval(() => {
            const now = Date.now();
            this.activeParticles = this.activeParticles.filter(p => {
                if (now - p.createdAt > p.lifeTime) {
                    if (p.element && p.element.parentNode) {
                        p.element.parentNode.removeChild(p.element);
                    }
                    return false;
                }
                return true;
            });
        }, 1000);
    }

    /**
     * 根據當前節氣更新粒子效果
     */
    updateSeason() {
        if (!gameData || !gameData.jieqi || !gameData.jieqi[gameData.jieqiIndex]) return;
        
        const jieqiName = gameData.jieqi[gameData.jieqiIndex].name;
        let newSeason = 'none';

        // 簡單的季節判斷
        const springJieqi = ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨'];
        const summerJieqi = ['立夏', '小滿', '芒種', '夏至', '小暑', '大暑'];
        const autumnJieqi = ['立秋', '處暑', '白露', '秋分', '寒露', '霜降'];
        const winterJieqi = ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

        if (springJieqi.includes(jieqiName)) newSeason = 'spring';
        else if (summerJieqi.includes(jieqiName)) newSeason = 'summer';
        else if (autumnJieqi.includes(jieqiName)) newSeason = 'autumn';
        else if (winterJieqi.includes(jieqiName)) newSeason = 'winter';

        if (this.currentSeason !== newSeason) {
            this.currentSeason = newSeason;
            this.clearParticles();
            console.log(`Particle system switched to: ${newSeason}`);
        }
    }

    /**
     * 生成單個粒子
     */
    spawnParticle() {
        if (!this.container || this.currentSeason === 'none') return;
        if (this.activeParticles.length >= this.maxParticles) return;

        const particle = document.createElement('div');
        const config = this.getSeasonConfig(this.currentSeason);
        
        if (!config) return;

        // 設置樣式
        particle.className = `particle ${config.className}`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${config.minDuration + Math.random() * (config.maxDuration - config.minDuration)}s`;
        particle.style.animationDelay = `-${Math.random() * 2}s`; // 隨機延遲，讓粒子看起來更自然
        
        // 隨機大小
        const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // 某些粒子需要內容（如文字）
        if (config.content) {
            particle.textContent = config.content;
        }

        this.container.appendChild(particle);

        this.activeParticles.push({
            element: particle,
            createdAt: Date.now(),
            lifeTime: config.maxDuration * 1000
        });
    }

    /**
     * 獲取季節配置
     */
    getSeasonConfig(season) {
        switch (season) {
            case 'spring':
                return {
                    className: 'particle-petal',
                    minDuration: 8,
                    maxDuration: 15,
                    minSize: 8,
                    maxSize: 14,
                    content: '🌸' // 或使用純 CSS 形狀
                };
            case 'summer':
                return {
                    className: 'particle-firefly',
                    minDuration: 10,
                    maxDuration: 20,
                    minSize: 4,
                    maxSize: 8
                };
            case 'autumn':
                return {
                    className: 'particle-leaf',
                    minDuration: 8,
                    maxDuration: 12,
                    minSize: 10,
                    maxSize: 18,
                    content: '🍁'
                };
            case 'winter':
                return {
                    className: 'particle-snow',
                    minDuration: 10,
                    maxDuration: 20,
                    minSize: 4,
                    maxSize: 8,
                    content: '❄️'
                };
            default:
                return null;
        }
    }

    /**
     * 清除所有粒子
     */
    clearParticles() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.activeParticles = [];
    }
}

// 單例導出
export const particleSystem = new ParticleSystem();

