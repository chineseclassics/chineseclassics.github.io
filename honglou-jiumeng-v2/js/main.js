// 紅樓舊夢 - 主入口文件

import { GameState } from './state.js';
import { Garden } from './garden.js';
import { FlowerSystem } from './flowers.js';
import { TearSystem } from './tears.js';
import { MemorySystem } from './memories.js';
import { EventSystem } from './events.js';
import { UI } from './ui.js';

// 初始化遊戲
class Game {
    constructor() {
        this.state = new GameState();
        this.garden = new Garden(this.state);
        this.flowers = new FlowerSystem(this.state);
        this.tears = new TearSystem(this.state);
        this.memories = new MemorySystem(this.state);
        this.events = new EventSystem(this.state);
        this.ui = new UI(this.state, this);
        
        this.init();
    }

    init() {
        console.log('紅樓舊夢 - 遊戲初始化');
        
        // 初始化各系統
        this.garden.init();
        this.flowers.init();
        this.tears.init();
        this.memories.init();
        this.events.init();
        this.ui.init();
        
        // 綁定事件
        this.bindEvents();
        
        // 開始遊戲
        this.startGame();
    }

    bindEvents() {
        // 行動按鈕
        document.getElementById('btn-water-flower')?.addEventListener('click', () => {
            this.waterFlower();
        });
        
        document.getElementById('btn-plant-flower')?.addEventListener('click', () => {
            this.plantFlower();
        });
        
        document.getElementById('btn-search-memory')?.addEventListener('click', () => {
            this.searchMemory();
        });
        
        document.getElementById('btn-next-season')?.addEventListener('click', () => {
            this.nextSeason();
        });
        
        // 重新開始
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.restart();
        });
    }

    startGame() {
        // 初始化遊戲狀態
        this.state.reset();
        
        // 給予初始資源（少量絳珠淚）
        this.state.addTears('孤弱之淚', 10);
        
        // 更新 UI
        this.ui.update();
        
        console.log('遊戲開始');
    }

    waterFlower() {
        if (this.state.actionPoints < 1) {
            alert('行動力不足！');
            return;
        }
        
        const flower = this.flowers.getCurrentFlower();
        if (!flower) {
            alert('請先種植花魂！');
            return;
        }
        
        // 檢查是否有淚水
        const availableTears = this.tears.getAvailableTears();
        if (availableTears.length === 0) {
            alert('沒有可用的絳珠淚！');
            return;
        }
        
        // 簡化：使用第一種可用淚水
        const tearType = availableTears[0];
        if (this.state.getTearCount(tearType) < 1) {
            alert(`沒有足夠的${tearType}！`);
            return;
        }
        
        // 消耗行動力和淚水
        this.state.consumeActionPoints(1);
        this.state.consumeTears(tearType, 1);
        
        // 澆灌花魂
        this.flowers.waterFlower(flower.id, tearType);
        
        // 更新 UI
        this.ui.update();
        
        console.log(`使用${tearType}澆灌花魂`);
    }

    plantFlower() {
        if (this.state.actionPoints < 2) {
            alert('行動力不足！');
            return;
        }
        
        // 檢查是否已解鎖瀟湘館
        if (!this.garden.isBuildingUnlocked('xiaoxiang_guan')) {
            alert('請先解鎖瀟湘館！');
            return;
        }
        
        // 檢查是否已種植
        if (this.flowers.hasFlower('daiyu')) {
            alert('已種植黛玉花魂！');
            return;
        }
        
        // 消耗行動力
        this.state.consumeActionPoints(2);
        
        // 種植花魂
        this.flowers.plantFlower('daiyu', 'xiaoxiang_guan');
        
        // 在地圖上標記花魂位置
        this.garden.setFlowerInCell('xiaoxiang_guan', 'daiyu');
        
        // 更新 UI
        this.ui.update();
        
        alert('黛玉花魂已種植在瀟湘館！');
        console.log('種植黛玉花魂');
    }

    searchMemory() {
        const cost = Math.random() < 0.5 ? 1 : 2;
        
        if (this.state.actionPoints < cost) {
            alert('行動力不足！');
            return;
        }
        
        // 消耗行動力
        this.state.consumeActionPoints(cost);
        
        // 搜尋記憶
        const memory = this.memories.searchMemory();
        if (memory) {
            // 解鎖記憶
            this.memories.unlockMemory(memory.id);
            
            // 解鎖對應的淚水類型
            if (memory.reward?.tearType) {
                this.tears.unlockTearType(memory.reward.tearType);
            }
            
            // 顯示獎勵信息
            let rewardMsg = `發現記憶：${memory.name}\n`;
            if (memory.reward?.tearType) {
                rewardMsg += `獲得 ${memory.reward.tearAmount} 滴${memory.reward.tearType}`;
            }
            if (memory.reward?.spiritStones) {
                rewardMsg += `\n獲得 ${memory.reward.spiritStones} 靈石`;
            }
            alert(rewardMsg);
        } else {
            // 即使沒找到記憶，也給予少量靈石作為安慰獎
            const consolationReward = Math.floor(Math.random() * 3) + 1; // 1-3 靈石
            this.state.addSpiritStones(consolationReward);
            alert(`沒有找到新的記憶...\n但獲得了 ${consolationReward} 靈石作為安慰`);
        }
        
        // 更新 UI
        this.ui.update();
    }

    nextSeason() {
        // 檢查是否有未完成的行動
        if (this.state.actionPoints > 0) {
            const confirm = window.confirm('還有行動力未使用，確定要進入下一節氣嗎？');
            if (!confirm) return;
        }
        
        // 進入下一節氣
        this.state.nextSeason();
        
        // 觸發節氣事件
        this.events.checkSeasonalEvents();
        
        // 檢查終局條件
        this.checkEnding();
        
        // 更新 UI
        this.ui.update();
        
        console.log(`進入節氣：${this.state.currentSeason}`);
    }

    checkEnding() {
        // 簡化終局條件：黛玉花魂達到 5 級
        const flower = this.flowers.getFlower('daiyu');
        if (flower && flower.level >= 5) {
            this.showEnding();
        }
    }

    showEnding() {
        const summary = this.generateEndingSummary();
        document.getElementById('ending-summary').innerHTML = summary;
        document.getElementById('ending-modal').classList.remove('hidden');
    }

    generateEndingSummary() {
        const flower = this.flowers.getFlower('daiyu');
        const memories = this.memories.getUnlockedMemories();
        
        let html = '<p>你的《石頭記》已經鐫刻完成。</p>';
        
        if (flower) {
            html += `<p>瀟湘館的竹影最為清晰，<br>`;
            html += `黛玉芙蓉魂達到 ${flower.level} 級。</p>`;
        }
        
        if (memories.length > 0) {
            html += `<p>你收集了 ${memories.length} 段記憶：</p><ul>`;
            memories.forEach(m => {
                html += `<li>${m.name}</li>`;
            });
            html += '</ul>';
        }
        
        return html;
    }

    restart() {
        document.getElementById('ending-modal').classList.add('hidden');
        this.startGame();
    }
}

// 啟動遊戲
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

