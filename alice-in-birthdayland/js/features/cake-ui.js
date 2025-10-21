/* ========================================
   Alice in Birthdayland - 蛋糕遊戲 UI 控制
   ======================================== */

import { playSound } from '../utils/audio-manager.js';

/**
 * 蛋糕遊戲 UI 管理器
 */
class CakeUI {
    constructor() {
        this.isInitialized = false;
        this.currentTool = 'decoration';
        this.zoomLevel = 1;
    }

    /**
     * 初始化 UI
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🎨 初始化蛋糕 UI...');
        
        this.bindUIEvents();
        this.setupAnimations();
        this.setupTooltips();
        this.isInitialized = true;
        
        console.log('✨ 蛋糕 UI 初始化完成');
    }

    /**
     * 綁定 UI 事件
     */
    bindUIEvents() {
        // 返回按鈕
        this.bindBackButton();
        
        // 工具切換
        this.bindToolSwitching();
        
        // 畫布縮放
        this.bindCanvasZoom();
        
        // 快捷鍵
        this.bindKeyboardShortcuts();
        
        // 靈感畫廊
        this.bindInspirationGallery();
    }

    /**
     * 綁定返回按鈕
     */
    bindBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showExitConfirmation();
            });
        }
    }

    /**
     * 綁定工具切換
     */
    bindToolSwitching() {
        // 工具面板點擊
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tool-section')) {
                this.highlightActiveTool(e.target.closest('.tool-section'));
            }
        });
    }

    /**
     * 綁定畫布縮放
     */
    bindCanvasZoom() {
        const canvas = document.getElementById('cake-canvas');
        if (canvas) {
            // 滾輪縮放
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.handleCanvasZoom(e);
            });
            
            // 觸摸縮放（移動端）
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    this.handleTouchZoom(e);
                }
            });
        }
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
            
            // Ctrl+Z 撤銷
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undoLastAction();
            }
            
            // Delete 鍵刪除選中元素
            if (e.key === 'Delete') {
                this.deleteSelectedElement();
            }
            
            // 數字鍵快速選擇工具
            if (e.key >= '1' && e.key <= '4') {
                this.selectToolByNumber(parseInt(e.key));
            }
        });
    }

    /**
     * 綁定靈感畫廊
     */
    bindInspirationGallery() {
        const inspirationItems = document.querySelectorAll('.inspiration-item');
        inspirationItems.forEach(item => {
            item.addEventListener('click', () => {
                this.applyInspiration(item);
            });
        });
    }

    /**
     * 設置動畫效果
     */
    setupAnimations() {
        this.addCakeAnimations();
        this.addDecorationAnimations();
        this.addUIAnimations();
    }

    /**
     * 添加蛋糕動畫
     */
    addCakeAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .cake-base {
                animation: cakeGlow 3s ease-in-out infinite;
            }
            
            @keyframes cakeGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(255,182,193,0.3); }
                50% { box-shadow: 0 0 30px rgba(255,182,193,0.5); }
            }
            
            .decoration-item {
                animation: decorationFloat 4s ease-in-out infinite;
            }
            
            @keyframes decorationFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
            }
            
            .text-item {
                animation: textPulse 2s ease-in-out infinite;
            }
            
            @keyframes textPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加裝飾動畫
     */
    addDecorationAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .deco-item:hover {
                animation: decorationBounce 0.5s ease-out;
            }
            
            @keyframes decorationBounce {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1.1); }
            }
            
            .decoration-item:hover {
                animation: decorationHover 0.3s ease-out;
            }
            
            @keyframes decorationHover {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加 UI 動畫
     */
    addUIAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .tool-section {
                animation: toolSlideIn 0.5s ease-out;
            }
            
            @keyframes toolSlideIn {
                0% { transform: translateX(-20px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            
            .cake-option, .color-btn {
                animation: optionFadeIn 0.3s ease-out;
            }
            
            @keyframes optionFadeIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .deco-item {
                animation: decoSlideIn 0.4s ease-out;
            }
            
            @keyframes decoSlideIn {
                0% { transform: translateY(20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 設置工具提示
     */
    setupTooltips() {
        this.addTooltips();
    }

    /**
     * 添加工具提示
     */
    addTooltips() {
        const tooltips = {
            'cake-option': '選擇蛋糕形狀',
            'color-btn': '選擇糖霜顏色',
            'deco-item': '拖拽到蛋糕上',
            'add-text-btn': '添加文字到蛋糕',
            'undo-btn': '撤銷上一步操作',
            'clear-btn': '清空所有裝飾',
            'save-cake-btn': '完成並保存蛋糕'
        };

        Object.entries(tooltips).forEach(([selector, text]) => {
            const elements = document.querySelectorAll(`.${selector}`);
            elements.forEach(element => {
                this.addTooltip(element, text);
            });
        });
    }

    /**
     * 添加單個工具提示
     */
    addTooltip(element, text) {
        element.addEventListener('mouseenter', () => {
            this.showTooltip(element, text);
        });
        
        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    /**
     * 顯示工具提示
     */
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: 'Bubblegum Sans', cursive;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    }

    /**
     * 隱藏工具提示
     */
    hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 高亮活動工具
     */
    highlightActiveTool(toolSection) {
        // 移除其他工具的高亮
        document.querySelectorAll('.tool-section').forEach(section => {
            section.classList.remove('active-tool');
        });
        
        // 高亮當前工具
        toolSection.classList.add('active-tool');
        
        // 添加高亮樣式
        this.addActiveToolStyles();
    }

    /**
     * 添加活動工具樣式
     */
    addActiveToolStyles() {
        if (document.getElementById('active-tool-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'active-tool-styles';
        style.textContent = `
            .tool-section.active-tool {
                background: rgba(255,105,180,0.2);
                border: 2px solid #FF69B4;
                box-shadow: 0 0 15px rgba(255,105,180,0.3);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 處理畫布縮放
     */
    handleCanvasZoom(e) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.zoomLevel = Math.max(0.5, Math.min(2, this.zoomLevel + delta));
        
        const canvas = document.getElementById('cake-canvas');
        if (canvas) {
            canvas.style.transform = `scale(${this.zoomLevel})`;
        }
        
        playSound('cake-select');
    }

    /**
     * 處理觸摸縮放
     */
    handleTouchZoom(e) {
        // 觸摸縮放邏輯
        console.log('觸摸縮放');
    }

    /**
     * 顯示退出確認
     */
    showExitConfirmation() {
        const confirmed = confirm('確定要返回地圖嗎？\n蛋糕設計將會保存。');
        if (confirmed) {
            playSound('location-click');
            window.location.href = 'index.html';
        }
    }

    /**
     * 撤銷上一步操作
     */
    undoLastAction() {
        // 這個功能會在 cake-builder.js 中實現
        playSound('place');
    }

    /**
     * 刪除選中元素
     */
    deleteSelectedElement() {
        const selectedElement = document.querySelector('.selected');
        if (selectedElement) {
            selectedElement.remove();
            playSound('place');
        }
    }

    /**
     * 根據數字選擇工具
     */
    selectToolByNumber(number) {
        const tools = document.querySelectorAll('.tool-section');
        if (tools[number - 1]) {
            tools[number - 1].click();
        }
    }

    /**
     * 應用靈感
     */
    applyInspiration(item) {
        const inspirationType = item.dataset.type;
        
        // 根據靈感類型應用不同的設計
        switch (inspirationType) {
            case 'classic':
                this.applyClassicDesign();
                break;
            case 'layered':
                this.applyLayeredDesign();
                break;
            case 'cupcake':
                this.applyCupcakeDesign();
                break;
        }
        
        playSound('cake-select');
    }

    /**
     * 應用經典設計
     */
    applyClassicDesign() {
        // 設置經典蛋糕配置
        console.log('應用經典設計');
    }

    /**
     * 應用多層設計
     */
    applyLayeredDesign() {
        // 設置多層蛋糕配置
        console.log('應用多層設計');
    }

    /**
     * 應用杯子蛋糕設計
     */
    applyCupcakeDesign() {
        // 設置杯子蛋糕配置
        console.log('應用杯子蛋糕設計');
    }

    /**
     * 顯示通知
     */
    showNotification(message, type = 'info') {
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
     * 更新 UI 狀態
     */
    updateUIState() {
        // 更新工具狀態
        this.updateToolStates();
        
        // 更新按鈕狀態
        this.updateButtonStates();
    }

    /**
     * 更新工具狀態
     */
    updateToolStates() {
        // 根據當前狀態更新工具顯示
    }

    /**
     * 更新按鈕狀態
     */
    updateButtonStates() {
        // 根據當前狀態更新按鈕可用性
    }
}

/**
 * 創建全局 UI 實例
 */
const cakeUI = new CakeUI();

/**
 * 初始化蛋糕 UI
 */
export function initCakeUI() {
    cakeUI.init();
}

/**
 * 獲取 UI 實例
 */
export function getCakeUI() {
    return cakeUI;
}

/**
 * 當頁面載入完成時初始化 UI
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initCakeUI();
    }, 500);
});

/**
 * 導出 UI 相關函數
 * initCakeUI 和 getCakeUI 已在函數定義時導出
 */
export { 
    CakeUI
};
