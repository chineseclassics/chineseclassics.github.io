/**
 * 應用全域狀態容器
 * 
 * 與角色、任務、緩存相關的資料集中於此，避免多個模組各自維護副本。
 */

export const AppState = {
    supabase: null,
    currentUser: null,
    userRole: null, // 'teacher' | 'student' | 'anonymous'
    currentScreen: null,
    initialized: false,
    
    // ✅ 數據緩存
    cache: {
        // 靜態數據
        formatTemplates: {},           // { templateName: templateData }
        
        // 半靜態數據（可刷新）
        assignmentsList: [],           // 任務列表
        practiceEssaysList: [],        // 練筆列表
        classList: [],                 // 班級列表
        lastRefreshTime: null,         // 上次刷新時間
        
        // AI 反饋緩存（智能緩存）
        aiFeedbackCache: {},           // { paragraphId: { contentHash: xxx, feedback: {...} } }
    },
    
    // 當前編輯狀態
    currentAssignmentId: null,
    currentPracticeEssayId: null,
    currentEssayContent: null,
    currentPracticeContent: null,
    currentFormatSpec: null
};
