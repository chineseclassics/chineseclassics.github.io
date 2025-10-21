/* ========================================
   Alice in Birthdayland - 計時器工具
   ======================================== */

/**
 * 遊戲計時器管理
 * 提供計時、暫停、重置等功能
 */

class GameTimer {
    constructor() {
        this.startTime = null;
        this.pausedTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.callbacks = [];
    }

    /**
     * 開始計時
     */
    start() {
        if (this.isRunning) return;
        
        this.startTime = Date.now() - this.pausedTime;
        this.isRunning = true;
        this.isPaused = false;
        
        this.intervalId = setInterval(() => {
            this.updateDisplay();
            this.notifyCallbacks();
        }, 1000);
        
        console.log('⏰ 計時器開始');
    }

    /**
     * 暫停計時
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.pausedTime = Date.now() - this.startTime;
        this.isPaused = true;
        clearInterval(this.intervalId);
        
        console.log('⏸️ 計時器暫停');
    }

    /**
     * 恢復計時
     */
    resume() {
        if (!this.isPaused) return;
        
        this.startTime = Date.now() - this.pausedTime;
        this.isPaused = false;
        
        this.intervalId = setInterval(() => {
            this.updateDisplay();
            this.notifyCallbacks();
        }, 1000);
        
        console.log('▶️ 計時器恢復');
    }

    /**
     * 停止計時
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.intervalId);
        
        console.log('⏹️ 計時器停止');
    }

    /**
     * 重置計時器
     */
    reset() {
        this.stop();
        this.startTime = null;
        this.pausedTime = 0;
        this.updateDisplay();
        
        console.log('🔄 計時器重置');
    }

    /**
     * 獲取經過時間（毫秒）
     */
    getElapsedTime() {
        if (!this.isRunning) return this.pausedTime;
        
        if (this.isPaused) {
            return this.pausedTime;
        } else {
            return Date.now() - this.startTime;
        }
    }

    /**
     * 獲取格式化的時間字符串
     */
    getFormattedTime() {
        const elapsed = this.getElapsedTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * 更新顯示
     */
    updateDisplay() {
        const display = document.getElementById('timer-display');
        if (display) {
            display.textContent = this.getFormattedTime();
        }
    }

    /**
     * 添加回調函數
     */
    addCallback(callback) {
        this.callbacks.push(callback);
    }

    /**
     * 移除回調函數
     */
    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    /**
     * 通知所有回調函數
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.getElapsedTime(), this.getFormattedTime());
            } catch (error) {
                console.warn('計時器回調函數執行失敗:', error);
            }
        });
    }

    /**
     * 獲取計時器狀態
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            elapsedTime: this.getElapsedTime(),
            formattedTime: this.getFormattedTime()
        };
    }
}

/**
 * 創建全局計時器實例
 */
const gameTimer = new GameTimer();

/**
 * 初始化計時器
 */
export function initTimer() {
    console.log('⏰ 初始化計時器...');
    
    // 綁定計時器控制按鈕（如果存在）
    bindTimerControls();
    
    // 開始計時
    gameTimer.start();
}

/**
 * 綁定計時器控制按鈕
 */
function bindTimerControls() {
    // 暫停/恢復按鈕
    const pauseBtn = document.getElementById('pause-timer');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (gameTimer.isPaused) {
                gameTimer.resume();
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暫停';
            } else {
                gameTimer.pause();
                pauseBtn.innerHTML = '<i class="fas fa-play"></i> 繼續';
            }
        });
    }
    
    // 重置按鈕
    const resetBtn = document.getElementById('reset-timer');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            gameTimer.reset();
        });
    }
}

/**
 * 獲取計時器實例
 */
export function getTimer() {
    return gameTimer;
}

/**
 * 格式化時間（靜態方法）
 */
export function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return {
        minutes,
        seconds,
        milliseconds: ms,
        formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        formattedWithMs: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
    };
}

/**
 * 創建倒數計時器
 */
export class CountdownTimer {
    constructor(duration, onComplete, onTick) {
        this.duration = duration; // 毫秒
        this.remaining = duration;
        this.onComplete = onComplete || (() => {});
        this.onTick = onTick || (() => {});
        this.isRunning = false;
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.remaining -= 1000;
            this.onTick(this.remaining, this.getFormattedTime());
            
            if (this.remaining <= 0) {
                this.stop();
                this.onComplete();
            }
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.intervalId);
    }

    pause() {
        this.stop();
    }

    resume() {
        this.start();
    }

    reset() {
        this.stop();
        this.remaining = this.duration;
    }

    getFormattedTime() {
        const minutes = Math.floor(this.remaining / 60000);
        const seconds = Math.floor((this.remaining % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

/**
 * 創建時間統計器
 */
export class TimeTracker {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
    }

    startSession(name) {
        this.currentSession = {
            name,
            startTime: Date.now(),
            endTime: null,
            duration: 0
        };
    }

    endSession() {
        if (!this.currentSession) return;
        
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        this.sessions.push(this.currentSession);
        
        const session = this.currentSession;
        this.currentSession = null;
        
        return session;
    }

    getTotalTime() {
        return this.sessions.reduce((total, session) => total + session.duration, 0);
    }

    getSessionStats() {
        return {
            totalSessions: this.sessions.length,
            totalTime: this.getTotalTime(),
            averageTime: this.sessions.length > 0 ? this.getTotalTime() / this.sessions.length : 0,
            sessions: this.sessions
        };
    }
}

/**
 * 當頁面載入完成時初始化計時器
 */
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保頁面完全載入
    setTimeout(() => {
        initTimer();
    }, 1000);
});

/**
 * 導出計時器相關函數
 * initTimer, formatTime, CountdownTimer 和 TimeTracker 已在定義時導出
 */
export { 
    GameTimer
};
