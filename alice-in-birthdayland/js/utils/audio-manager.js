/* ========================================
   Alice in Birthdayland - 音效管理
   ======================================== */

/**
 * 音效管理系統
 * 處理所有遊戲音效的載入、播放和管理
 */

// 音效文件映射
const soundFiles = {
    // 拼圖遊戲音效
    'pickup': 'assets/audio/pickup.mp3',
    'place': 'assets/audio/place.mp3', 
    'correct': 'assets/audio/correct.mp3',
    'puzzle-complete': 'assets/audio/puzzle-complete.mp3',
    'final-celebration': 'assets/audio/final-celebration.mp3',
    
    // 蛋糕遊戲音效
    'cake-select': 'assets/audio/cake-select.mp3',
    'deco-place': 'assets/audio/deco-place.mp3',
    'cake-complete': 'assets/audio/cake-complete.mp3',
    
    // 導航音效
    'location-click': 'assets/audio/location-click.mp3',
    'hover': 'assets/audio/hover.mp3',
    'locked': 'assets/audio/locked.mp3',
    
    // 背景音樂
    'map-bgm': 'assets/audio/map-bgm.mp3'
};

// 音效實例存儲
const soundInstances = {};
let audioEnabled = true;
let masterVolume = 0.7;

/**
 * 初始化音效系統
 */
export function initAudioSystem() {
    console.log('🔊 初始化音效系統...');
    
    // 檢查瀏覽器音效支持
    if (!checkAudioSupport()) {
        console.warn('瀏覽器不支持音效，將禁用音效功能');
        audioEnabled = false;
        return;
    }
    
    // 預載入音效文件
    preloadSounds();
    
    // 設置用戶互動後啟用音效
    enableAudioOnUserInteraction();
}

/**
 * 檢查音效支持
 */
function checkAudioSupport() {
    try {
        const audio = new Audio();
        return !!(audio.canPlayType && audio.canPlayType('audio/mpeg'));
    } catch (e) {
        return false;
    }
}

/**
 * 預載入音效文件
 */
function preloadSounds() {
    Object.entries(soundFiles).forEach(([name, url]) => {
        try {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = masterVolume;
            audio.src = url;
            
            // 處理載入錯誤
            audio.addEventListener('error', () => {
                console.warn(`音效載入失敗: ${name} (${url})`);
            });
            
            soundInstances[name] = audio;
        } catch (e) {
            console.warn(`創建音效實例失敗: ${name}`, e);
        }
    });
}

/**
 * 用戶互動後啟用音效
 */
function enableAudioOnUserInteraction() {
    const enableAudio = () => {
        if (!audioEnabled) return;
        
        // 播放一個靜音音效來啟用音頻上下文
        try {
            const audio = new Audio();
            audio.volume = 0;
            audio.play();
        } catch (e) {
            console.warn('無法啟用音頻上下文');
        }
        
        // 移除事件監聽器
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
    };
    
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
}

/**
 * 播放音效
 */
export function playSound(soundName, options = {}) {
    if (!audioEnabled) return;
    
    const audio = soundInstances[soundName];
    if (!audio) {
        console.warn(`音效不存在: ${soundName}`);
        return;
    }
    
    try {
        // 重置音頻到開始位置
        audio.currentTime = 0;
        
        // 設置音量
        audio.volume = (options.volume || 1) * masterVolume;
        
        // 播放音效
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`音效播放失敗: ${soundName}`, error);
            });
        }
    } catch (e) {
        console.warn(`播放音效時發生錯誤: ${soundName}`, e);
    }
}

/**
 * 停止音效
 */
export function stopSound(soundName) {
    const audio = soundInstances[soundName];
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

/**
 * 停止所有音效
 */
export function stopAllSounds() {
    Object.values(soundInstances).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
}

/**
 * 設置主音量
 */
export function setMasterVolume(volume) {
    masterVolume = Math.max(0, Math.min(1, volume));
    
    // 更新所有音效實例的音量
    Object.values(soundInstances).forEach(audio => {
        audio.volume = masterVolume;
    });
}

/**
 * 獲取主音量
 */
export function getMasterVolume() {
    return masterVolume;
}

/**
 * 啟用/禁用音效
 */
export function setAudioEnabled(enabled) {
    audioEnabled = enabled;
    
    if (!enabled) {
        stopAllSounds();
    }
}

/**
 * 檢查音效是否啟用
 */
export function isAudioEnabled() {
    return audioEnabled;
}

/**
 * 播放背景音樂
 */
export function playBackgroundMusic(musicName, loop = true) {
    if (!audioEnabled) return;
    
    const audio = soundInstances[musicName];
    if (!audio) {
        console.warn(`背景音樂不存在: ${musicName}`);
        return;
    }
    
    try {
        audio.loop = loop;
        audio.volume = masterVolume * 0.3; // 背景音樂音量較低
        audio.play();
    } catch (e) {
        console.warn(`播放背景音樂失敗: ${musicName}`, e);
    }
}

/**
 * 停止背景音樂
 */
export function stopBackgroundMusic(musicName) {
    const audio = soundInstances[musicName];
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

/**
 * 創建音效序列（連續播放多個音效）
 */
export function playSoundSequence(sounds, delay = 200) {
    if (!audioEnabled) return;
    
    sounds.forEach((soundName, index) => {
        setTimeout(() => {
            playSound(soundName);
        }, index * delay);
    });
}

/**
 * 創建音效淡入效果
 */
export function fadeInSound(soundName, duration = 1000) {
    const audio = soundInstances[soundName];
    if (!audio) return;
    
    audio.volume = 0;
    audio.play();
    
    const fadeIn = setInterval(() => {
        audio.volume = Math.min(masterVolume, audio.volume + 0.1);
        
        if (audio.volume >= masterVolume) {
            clearInterval(fadeIn);
        }
    }, duration / 10);
}

/**
 * 創建音效淡出效果
 */
export function fadeOutSound(soundName, duration = 1000) {
    const audio = soundInstances[soundName];
    if (!audio) return;
    
    const fadeOut = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - 0.1);
        
        if (audio.volume <= 0) {
            audio.pause();
            clearInterval(fadeOut);
        }
    }, duration / 10);
}

/**
 * 當頁面載入完成時初始化音效系統
 */
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保頁面完全載入
    setTimeout(() => {
        initAudioSystem();
    }, 1000);
});

/**
 * 導出音效管理函數
 * initAudioSystem 和 checkAudioSupport 已在函數定義時導出
 */
export {
    soundFiles,
    soundInstances
};
