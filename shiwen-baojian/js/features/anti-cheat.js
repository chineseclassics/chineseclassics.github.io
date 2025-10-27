/**
 * 時文寶鑑 - 防作弊系統（寫作誠信監測）
 * 
 * 功能：
 * - 粘貼行為監測和記錄
 * - 打字速度監測
 * - 停頓時間記錄
 * - 寫作模式分析
 * - 誠信報告生成
 */

// 使用全局 AppState，避免循環導入
const AppState = window.AppState;

// 防禦性檢查
if (!AppState) {
    console.error('❌ AppState 尚未初始化，請確保 app.js 已加載');
}

// ================================
// 防作弊狀態管理
// ================================

const AntiCheatState = {
    enabled: true,
    pasteEvents: [], // 粘貼事件記錄
    typingPatterns: [], // 打字模式記錄
    currentSession: null, // 當前寫作會話
    initialized: false
};

// ================================
// 初始化防作弊系統
// ================================

/**
 * 初始化防作弊監測
 */
export function initializeAntiCheat() {
    if (AntiCheatState.initialized) {
        console.log('⏸️ 防作弊系統已初始化');
        return;
    }
    
    console.log('🔒 初始化防作弊系統...');
    
    // 1. 開始新的寫作會話
    startWritingSession();
    
    // 2. 綁定粘貼事件監聽器
    bindPasteListeners();
    
    // 3. 綁定打字行為監聽器
    bindTypingListeners();
    
    // 4. 定期保存監測數據
    setInterval(saveMonitoringData, 60000); // 每分鐘保存一次
    
    AntiCheatState.initialized = true;
    console.log('✅ 防作弊系統初始化完成');
}

/**
 * 開始新的寫作會話
 */
function startWritingSession() {
    AntiCheatState.currentSession = {
        session_id: `session-${Date.now()}`,
        start_time: new Date().toISOString(),
        user_id: AppState.currentUser?.id,
        paste_count: 0,
        total_chars_typed: 0,
        total_chars_pasted: 0,
        typing_speed_samples: [],
        pause_durations: []
    };
    
    console.log('📝 新寫作會話開始:', AntiCheatState.currentSession.session_id);
}

// ================================
// 粘貼行為監測
// ================================

/**
 * 綁定粘貼事件監聽器
 */
function bindPasteListeners() {
    // 監聽所有編輯器的粘貼事件
    document.addEventListener('paste', handlePaste, true);
    console.log('✅ 粘貼事件監聽器已綁定');
}

/**
 * 處理粘貼事件
 */
function handlePaste(event) {
    if (!AntiCheatState.enabled) return;
    
    // 獲取粘貼的內容
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    
    if (!pastedText || pastedText.trim().length === 0) return;
    
    // 記錄粘貼事件
    const pasteEvent = {
        timestamp: new Date().toISOString(),
        content_length: pastedText.length,
        content_preview: pastedText.substring(0, 100), // 只保存前 100 個字符
        target_element: event.target.id || 'unknown',
        session_id: AntiCheatState.currentSession.session_id
    };
    
    AntiCheatState.pasteEvents.push(pasteEvent);
    AntiCheatState.currentSession.paste_count++;
    AntiCheatState.currentSession.total_chars_pasted += pastedText.length;
    
    console.log('📋 檢測到粘貼:', {
        length: pastedText.length,
        total_pastes: AntiCheatState.currentSession.paste_count
    });
    
    // 如果粘貼內容過長，發出警告
    if (pastedText.length > 200) {
        showPasteWarning(pastedText.length);
    }
    
    // 如果粘貼次數過多，發出警告
    if (AntiCheatState.currentSession.paste_count > 5) {
        showFrequentPasteWarning();
    }
}

/**
 * 顯示粘貼警告
 */
function showPasteWarning(length) {
    console.warn(`⚠️ 檢測到大量粘貼內容 (${length} 字符)`);
    
    // 創建臨時提示
    const warning = document.createElement('div');
    warning.className = 'fixed top-20 right-4 bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    warning.innerHTML = `
        <div class="flex items-start space-x-2">
            <i class="fas fa-exclamation-triangle mt-0.5"></i>
            <div>
                <p class="font-semibold text-sm">粘貼行為提醒</p>
                <p class="text-xs mt-1">檢測到大量粘貼內容（${length} 字）。請確保是您自己的寫作成果。</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(warning);
    
    // 3 秒後移除
    setTimeout(() => {
        warning.remove();
    }, 3000);
}

/**
 * 顯示頻繁粘貼警告
 */
function showFrequentPasteWarning() {
    console.warn('⚠️ 檢測到頻繁粘貼行為');
    
    // 只顯示一次
    if (document.getElementById('frequent-paste-warning')) return;
    
    const warning = document.createElement('div');
    warning.id = 'frequent-paste-warning';
    warning.className = 'fixed top-20 right-4 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    warning.innerHTML = `
        <div class="flex items-start space-x-2">
            <i class="fas fa-exclamation-circle mt-0.5"></i>
            <div>
                <p class="font-semibold text-sm">寫作誠信提醒</p>
                <p class="text-xs mt-1">您已粘貼內容多次。老師會查看粘貼記錄和寫作模式分析。</p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="text-xs text-orange-600 hover:text-orange-800 mt-2 font-medium">
                    我知道了
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(warning);
}

// ================================
// 打字行為監測
// ================================

let lastKeyTime = null;
let currentTypingBurst = {
    start_time: null,
    char_count: 0,
    duration: 0
};

/**
 * 綁定打字事件監聽器
 */
function bindTypingListeners() {
    document.addEventListener('keypress', handleKeyPress, true);
    document.addEventListener('keydown', handleKeyDown, true);
    console.log('✅ 打字事件監聽器已綁定');
}

/**
 * 處理按鍵事件
 */
function handleKeyPress(event) {
    if (!AntiCheatState.enabled) return;
    
    const now = Date.now();
    
    // 初始化當前打字爆發
    if (!currentTypingBurst.start_time) {
        currentTypingBurst.start_time = now;
        currentTypingBurst.char_count = 1;
    } else {
        currentTypingBurst.char_count++;
    }
    
    // 計算打字間隔
    if (lastKeyTime) {
        const interval = now - lastKeyTime;
        
        // 如果間隔超過 2 秒，視為一個打字爆發結束
        if (interval > 2000) {
            recordTypingBurst();
        }
    }
    
    lastKeyTime = now;
    AntiCheatState.currentSession.total_chars_typed++;
}

/**
 * 處理按鍵按下事件（用於檢測刪除等）
 */
function handleKeyDown(event) {
    if (!AntiCheatState.enabled) return;
    
    // 檢測 Backspace 和 Delete 鍵
    if (event.key === 'Backspace' || event.key === 'Delete') {
        // 可以記錄刪除行為（未來功能）
    }
}

/**
 * 記錄一個打字爆發
 */
function recordTypingBurst() {
    if (!currentTypingBurst.start_time) return;
    
    const duration = Date.now() - currentTypingBurst.start_time;
    // 避免除零或產生 NaN
    const speed = duration > 0 ? (currentTypingBurst.char_count / duration) * 60000 : 0;
    const speedCpm = Math.round(speed) || 0; // 確保不為 NaN 或 null
    
    const typingPattern = {
        timestamp: new Date(currentTypingBurst.start_time).toISOString(),
        char_count: currentTypingBurst.char_count || 0,
        duration_ms: duration || 0,
        speed_cpm: speedCpm, // 字符/分鐘
        session_id: AntiCheatState.currentSession.session_id
    };
    
    AntiCheatState.typingPatterns.push(typingPattern);
    AntiCheatState.currentSession.typing_speed_samples.push(speed);
    
    // 重置當前打字爆發
    currentTypingBurst = {
        start_time: null,
        char_count: 0,
        duration: 0
    };
}

// ================================
// 數據保存
// ================================

/**
 * 保存監測數據到數據庫
 */
async function saveMonitoringData() {
    if (!AppState.supabase || !AppState.currentUser) {
        console.log('⏸️ 跳過保存監測數據（未登錄）');
        return;
    }
    
    if (AntiCheatState.pasteEvents.length === 0 && AntiCheatState.typingPatterns.length === 0) {
        console.log('⏸️ 沒有監測數據需要保存');
        return;
    }
    
    console.log('💾 保存寫作行為監測數據...');
    
    try {
        // 1. 保存粘貼事件
        if (AntiCheatState.pasteEvents.length > 0) {
            const { error: pasteError } = await AppState.supabase
                .from('paste_events')
                .insert(
                    AntiCheatState.pasteEvents.map(event => ({
                        user_id: AppState.currentUser.id,
                        session_id: event.session_id,
                        timestamp: event.timestamp,
                        content_length: event.content_length,
                        content_preview: event.content_preview,
                        target_element: event.target_element
                    }))
                );
            
            if (pasteError) {
                console.error('❌ 保存粘貼事件失敗:', pasteError);
            } else {
                console.log(`✅ 保存了 ${AntiCheatState.pasteEvents.length} 個粘貼事件`);
                AntiCheatState.pasteEvents = []; // 清空已保存的數據
            }
        }
        
        // 2. 保存打字模式
        if (AntiCheatState.typingPatterns.length > 0) {
            const { error: typingError } = await AppState.supabase
                .from('typing_patterns')
                .insert(
                    AntiCheatState.typingPatterns
                        .filter(pattern => pattern.speed_cpm != null && !isNaN(pattern.speed_cpm)) // 過濾掉無效數據
                        .map(pattern => ({
                            user_id: AppState.currentUser.id,
                            session_id: pattern.session_id,
                            timestamp: pattern.timestamp,
                            char_count: pattern.char_count || 0,
                            duration_ms: pattern.duration_ms || 0,
                            speed_cpm: pattern.speed_cpm || 0
                        }))
                );
            
            if (typingError) {
                console.error('❌ 保存打字模式失敗:', typingError);
            } else {
                console.log(`✅ 保存了 ${AntiCheatState.typingPatterns.length} 個打字模式`);
                AntiCheatState.typingPatterns = []; // 清空已保存的數據
            }
        }
        
        // 3. 更新會話統計
        await updateSessionStats();
        
    } catch (error) {
        console.error('❌ 保存監測數據失敗:', error);
    }
}

/**
 * 更新會話統計
 */
async function updateSessionStats() {
    if (!AntiCheatState.currentSession) return;
    
    const avgTypingSpeed = AntiCheatState.currentSession.typing_speed_samples.length > 0
        ? Math.round(
            AntiCheatState.currentSession.typing_speed_samples.reduce((a, b) => a + b, 0) /
            AntiCheatState.currentSession.typing_speed_samples.length
        )
        : 0;
    
    const stats = {
        session_id: AntiCheatState.currentSession.session_id,
        user_id: AppState.currentUser.id,
        start_time: AntiCheatState.currentSession.start_time,
        paste_count: AntiCheatState.currentSession.paste_count,
        total_chars_typed: AntiCheatState.currentSession.total_chars_typed,
        total_chars_pasted: AntiCheatState.currentSession.total_chars_pasted,
        avg_typing_speed_cpm: avgTypingSpeed,
        pasted_ratio: calculatePastedRatio()
    };
    
    console.log('📊 會話統計:', stats);
    
    // 這裡可以保存到數據庫（需要創建 writing_sessions 表）
    // 當前暫時只記錄到控制台
}

/**
 * 計算粘貼內容佔比
 */
function calculatePastedRatio() {
    const total = AntiCheatState.currentSession.total_chars_typed + 
                  AntiCheatState.currentSession.total_chars_pasted;
    
    if (total === 0) return 0;
    
    return Math.round((AntiCheatState.currentSession.total_chars_pasted / total) * 100);
}

// ================================
// 誠信報告生成
// ================================

/**
 * 生成寫作誠信報告
 * @returns {object} 誠信報告對象
 */
export function generateIntegrityReport() {
    if (!AntiCheatState.currentSession) {
        return {
            status: 'no_data',
            message: '無寫作數據'
        };
    }
    
    const pastedRatio = calculatePastedRatio();
    const avgTypingSpeed = AntiCheatState.currentSession.typing_speed_samples.length > 0
        ? Math.round(
            AntiCheatState.currentSession.typing_speed_samples.reduce((a, b) => a + b, 0) /
            AntiCheatState.currentSession.typing_speed_samples.length
        )
        : 0;
    
    // 分析可疑行為
    const suspiciousFactors = [];
    
    if (pastedRatio > 50) {
        suspiciousFactors.push({
            type: 'high_paste_ratio',
            severity: 'high',
            message: `粘貼內容佔比過高：${pastedRatio}%`
        });
    } else if (pastedRatio > 30) {
        suspiciousFactors.push({
            type: 'moderate_paste_ratio',
            severity: 'medium',
            message: `粘貼內容佔比較高：${pastedRatio}%`
        });
    }
    
    if (AntiCheatState.currentSession.paste_count > 10) {
        suspiciousFactors.push({
            type: 'frequent_paste',
            severity: 'medium',
            message: `粘貼次數較多：${AntiCheatState.currentSession.paste_count} 次`
        });
    }
    
    if (avgTypingSpeed > 400) {
        suspiciousFactors.push({
            type: 'high_typing_speed',
            severity: 'low',
            message: `打字速度異常高：${avgTypingSpeed} 字符/分鐘`
        });
    }
    
    // 確定總體風險等級
    let riskLevel = 'low';
    if (suspiciousFactors.some(f => f.severity === 'high')) {
        riskLevel = 'high';
    } else if (suspiciousFactors.some(f => f.severity === 'medium')) {
        riskLevel = 'medium';
    }
    
    return {
        status: 'complete',
        session_id: AntiCheatState.currentSession.session_id,
        risk_level: riskLevel,
        statistics: {
            paste_count: AntiCheatState.currentSession.paste_count,
            total_chars_typed: AntiCheatState.currentSession.total_chars_typed,
            total_chars_pasted: AntiCheatState.currentSession.total_chars_pasted,
            pasted_ratio: pastedRatio,
            avg_typing_speed_cpm: avgTypingSpeed
        },
        suspicious_factors: suspiciousFactors,
        generated_at: new Date().toISOString()
    };
}

// ================================
// 導出
// ================================

export { AntiCheatState };

